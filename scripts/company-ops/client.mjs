import { randomUUID } from "node:crypto";

const API_ORIGIN = "https://open.feishu.cn/open-apis";
const RETRYABLE_CODES = new Set([
  1254290, // too many requests
  1254291, // Base write conflict
  1254607, // Base data not ready / transient internal state
  1254608, // repeated/recommitted Base request
  1066001, // Drive internal error
  1066002, // Drive concurrency error
]);

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function firstEnv(...names) {
  return names.map((name) => process.env[name]).find(Boolean);
}

function envList(...names) {
  return [...new Set(names
    .flatMap((name) => (process.env[name] || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean))];
}

export function loadCompanyOpsConfig() {
  const required = {
    appId: process.env.FEISHU_ADMIN_APP_ID,
    appSecret: process.env.FEISHU_ADMIN_APP_SECRET,
    confidential: process.env.FEISHU_ADMIN_BASE_APP_TOKEN,
    teamOps: firstEnv(
      "FEISHU_TEAMOPS_BASE_APP_TOKEN",
      "FEISHU_ADMIN_TEAMOPS_BASE_APP_TOKEN",
    ),
    growth: firstEnv(
      "FEISHU_GROWTH_BASE_APP_TOKEN",
      "FEISHU_ADMIN_GROWTH_BASE_APP_TOKEN",
    ),
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(
      `Missing company-ops environment values: ${missing.join(", ")}. ` +
        "Load the git-ignored .env.local; never place secrets in source files.",
    );
  }

  return {
    appId: required.appId,
    appSecret: required.appSecret,
    bases: {
      confidential: required.confidential,
      teamOps: required.teamOps,
      growth: required.growth,
    },
    founderOpenIds: envList(
      "FEISHU_FOUNDER_OPEN_IDS",
      "FEISHU_ADMIN_FOUNDER_OPEN_IDS",
    ),
    growthEditorOpenIds: envList("FEISHU_GROWTH_EDITOR_OPEN_IDS"),
    tenantDomain:
      firstEnv("FEISHU_TENANT_DOMAIN", "FEISHU_ADMIN_TENANT_DOMAIN") ||
      "acn3vin1oszp.feishu.cn",
  };
}

function safeApiLabel(path, secretValues) {
  let safe = path;
  for (const value of secretValues) {
    if (value) safe = safe.split(value).join("<redacted>");
  }
  return safe.replace(/(Authorization|app_secret)=?[^&\s]*/gi, "$1=<redacted>");
}

export class FeishuApiError extends Error {
  constructor(message, { status, code, apiPath, logId } = {}) {
    super(message);
    this.name = "FeishuApiError";
    this.status = status;
    this.code = code;
    this.apiPath = apiPath;
    this.logId = logId;
  }
}

export class FeishuClient {
  constructor(config, { maxAttempts = 6, writeDelayMs = 350 } = {}) {
    this.config = config;
    this.maxAttempts = maxAttempts;
    this.writeDelayMs = writeDelayMs;
    this.tenantAccessToken = null;
    this.tokenExpiresAt = 0;
    this.secretValues = [
      config.appSecret,
      ...Object.values(config.bases),
    ];
  }

  async authenticate() {
    if (
      this.tenantAccessToken &&
      Date.now() < this.tokenExpiresAt - 60_000
    ) {
      return this.tenantAccessToken;
    }

    const response = await fetch(
      `${API_ORIGIN}/auth/v3/tenant_access_token/internal`,
      {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          app_id: this.config.appId,
          app_secret: this.config.appSecret,
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.code !== 0 || !payload.tenant_access_token) {
      throw new FeishuApiError(
        `Feishu authentication failed (${response.status}, code ${payload.code ?? "unknown"}): ${payload.msg || "unknown error"}`,
        { status: response.status, code: payload.code, apiPath: "/auth" },
      );
    }

    this.tenantAccessToken = payload.tenant_access_token;
    this.tokenExpiresAt = Date.now() + Number(payload.expire || 7200) * 1000;
    return this.tenantAccessToken;
  }

  async request(
    method,
    path,
    { query, body, idempotent = false, retry } = {},
  ) {
    const retryEnabled =
      retry ??
      (method === "GET" ||
        method === "HEAD" ||
        method === "PUT" ||
        method === "PATCH" ||
        idempotent);
    const token = await this.authenticate();
    const url = new URL(`${API_ORIGIN}${path}`);
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    if (idempotent && method !== "GET" && !url.searchParams.has("client_token")) {
      url.searchParams.set("client_token", randomUUID());
    }

    const safePath = safeApiLabel(`${path}${url.search}`, this.secretValues);
    let lastError;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let response;
      let payload;
      try {
        response = await fetch(url, {
          method,
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json; charset=utf-8",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        payload = await response.json().catch(() => ({}));
      } catch (error) {
        lastError = new FeishuApiError(
          `Network error calling ${safePath}: ${error.message}`,
          { apiPath: safePath },
        );
        if (!retryEnabled || attempt === this.maxAttempts) throw lastError;
        await sleep(Math.min(8_000, 350 * 2 ** (attempt - 1)));
        continue;
      }

      const code = Number(payload.code ?? 0);
      if (response.ok && code === 0) {
        if (method !== "GET" && method !== "HEAD") {
          await sleep(this.writeDelayMs);
        }
        return payload;
      }

      const logId =
        response.headers.get("x-tt-logid") ||
        response.headers.get("x-request-id") ||
        undefined;
      lastError = new FeishuApiError(
        `Feishu API failed at ${safePath} (${response.status}, code ${code || "unknown"}): ${payload.msg || "unknown error"}`,
        {
          status: response.status,
          code,
          apiPath: safePath,
          logId,
        },
      );

      const shouldRetry =
        retryEnabled &&
        attempt < this.maxAttempts &&
        (response.status === 429 ||
          response.status >= 500 ||
          RETRYABLE_CODES.has(code));
      if (!shouldRetry) throw lastError;

      const retryAfterSeconds = Number(response.headers.get("retry-after") || 0);
      const delay = retryAfterSeconds
        ? retryAfterSeconds * 1000
        : Math.min(10_000, 450 * 2 ** (attempt - 1) + Math.random() * 250);
      await sleep(delay);
    }
    throw lastError;
  }

  get(path, options) {
    return this.request("GET", path, options);
  }

  post(path, body, options = {}) {
    return this.request("POST", path, { ...options, body });
  }

  patch(path, body, options = {}) {
    return this.request("PATCH", path, { ...options, body });
  }

  put(path, body, options = {}) {
    return this.request("PUT", path, { ...options, body });
  }

  async paginate(path, { query, pick = "items", pageSize = 100 } = {}) {
    const items = [];
    let pageToken;
    do {
      const response = await this.get(path, {
        query: { ...query, page_size: pageSize, page_token: pageToken },
      });
      const data = response.data || {};
      items.push(...(data[pick] || []));
      pageToken = data.has_more ? data.page_token : undefined;
    } while (pageToken);
    return items;
  }
}

export function parseMode(argv) {
  const apply = argv.includes("--apply");
  const dry = argv.includes("--dry");
  if (apply === dry) {
    throw new Error("Choose exactly one mode: --dry or --apply");
  }
  return { apply, dry };
}

export function formatApiError(error) {
  if (!(error instanceof FeishuApiError)) return error.stack || error.message;
  const log = error.logId ? `; log_id=${error.logId}` : "";
  return `${error.message}${log}`;
}
