import type { CompanyOpsConfig } from "./config.ts";

export type FeishuFields = Record<string, unknown>;

export interface FeishuRecord {
  record_id: string;
  fields: FeishuFields;
  created_time?: number | string;
  last_modified_time?: number | string;
}

export interface FeishuTable {
  table_id: string;
  name: string;
}

export interface FeishuField {
  field_id: string;
  field_name: string;
  type: number;
  is_primary?: boolean;
  property?: Record<string, unknown>;
}

export interface FeishuOAuthUser {
  openId: string;
  userId?: string;
  unionId?: string;
  tenantKey?: string;
  name: string;
  englishName?: string;
  avatarUrl?: string;
}

export interface FeishuAppAdminIds {
  openIds: ReadonlySet<string>;
  userIds: ReadonlySet<string>;
}

export interface FeishuDriveUpload {
  fileToken: string;
}

export interface FeishuDriveUploadPreparation {
  uploadId: string;
  blockSize: number;
  blockCount: number;
}

export class FeishuApiError extends Error {
  readonly status: number;
  readonly code?: number | string;
  readonly requestId?: string;

  constructor(
    message: string,
    options: { status?: number; code?: number | string; requestId?: string } = {}
  ) {
    super(message);
    this.name = "FeishuApiError";
    this.status = options.status || 502;
    this.code = options.code;
    this.requestId = options.requestId;
  }
}

type FetchLike = typeof fetch;
type JsonMap = Record<string, unknown>;

interface TokenCacheEntry {
  token: string;
  expiresAt: number;
  inflight?: Promise<string>;
}

const tenantTokenCache = new Map<string, TokenCacheEntry>();

const jsonObject = (value: unknown): JsonMap =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonMap)
    : {};

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const asNumber = (value: unknown): number | undefined => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

async function parseJson(response: Response): Promise<JsonMap> {
  try {
    return jsonObject(await response.json());
  } catch {
    throw new FeishuApiError("Feishu returned an invalid response", {
      status: response.status >= 400 ? response.status : 502,
      requestId: response.headers.get("x-tt-logid") || undefined,
    });
  }
}

function assertFeishuSuccess(response: Response, body: JsonMap): JsonMap {
  const apiCode = body.code;
  const hasErrorCode =
    apiCode !== undefined && apiCode !== null && Number(apiCode) !== 0;
  if (!response.ok || hasErrorCode || body.error) {
    throw new FeishuApiError("Feishu API request failed", {
      status: response.status === 401 || response.status === 403
        ? response.status
        : 502,
      code: (apiCode ?? body.error) as number | string | undefined,
      requestId: response.headers.get("x-tt-logid") || undefined,
    });
  }
  return body;
}

export class FeishuClient {
  readonly config: CompanyOpsConfig;
  private readonly fetcher: FetchLike;

  constructor(config: CompanyOpsConfig, fetcher: FetchLike = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  buildAuthorizationUrl(state: string): string {
    const url = new URL(
      "https://accounts.feishu.cn/open-apis/authen/v1/authorize"
    );
    url.searchParams.set("client_id", this.config.appId);
    url.searchParams.set("redirect_uri", this.config.oauthRedirectUri);
    url.searchParams.set("state", state);
    if (this.config.oauthScopes.length) {
      url.searchParams.set("scope", this.config.oauthScopes.join(" "));
    }
    return url.toString();
  }

  async exchangeAuthorizationCode(code: string): Promise<string> {
    const response = await this.fetcher(
      "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: this.config.appId,
          client_secret: this.config.appSecret,
          code,
          redirect_uri: this.config.oauthRedirectUri,
        }),
      }
    );
    const body = assertFeishuSuccess(response, await parseJson(response));
    const token = asString(body.access_token);
    if (!token) {
      throw new FeishuApiError("Feishu OAuth did not return an access token");
    }
    return token;
  }

  async getOAuthUser(userAccessToken: string): Promise<FeishuOAuthUser> {
    const response = await this.fetcher(
      "https://open.feishu.cn/open-apis/authen/v1/user_info",
      {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
    const body = assertFeishuSuccess(response, await parseJson(response));
    const data = jsonObject(body.data);
    const openId = asString(data.open_id);
    if (!openId) {
      throw new FeishuApiError("Feishu OAuth did not return a user identity");
    }
    return {
      openId,
      userId: asString(data.user_id) || undefined,
      unionId: asString(data.union_id) || undefined,
      tenantKey: asString(data.tenant_key) || undefined,
      name: asString(data.name) || asString(data.en_name) || "Feishu user",
      englishName: asString(data.en_name) || undefined,
      avatarUrl: asString(data.avatar_url) || undefined,
    };
  }

  async getTenantAccessToken(): Promise<string> {
    const cacheKey = this.config.appId;
    const now = Date.now();
    let cached = tenantTokenCache.get(cacheKey);
    if (cached?.token && cached.expiresAt > now + 60_000) {
      return cached.token;
    }
    if (cached?.inflight) return cached.inflight;

    const inflight = (async () => {
      const response = await this.fetcher(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            app_id: this.config.appId,
            app_secret: this.config.appSecret,
          }),
        }
      );
      const body = assertFeishuSuccess(response, await parseJson(response));
      const token = asString(body.tenant_access_token);
      if (!token) {
        throw new FeishuApiError("Feishu did not return a tenant access token");
      }
      const expiresIn = asNumber(body.expire) || 7_200;
      tenantTokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1_000,
      });
      return token;
    })();

    cached = cached || { token: "", expiresAt: 0 };
    cached.inflight = inflight;
    tenantTokenCache.set(cacheKey, cached);
    try {
      return await inflight;
    } finally {
      const current = tenantTokenCache.get(cacheKey);
      if (current?.inflight === inflight) delete current.inflight;
    }
  }

  private async tenantRequest(path: string, init: RequestInit = {}): Promise<JsonMap> {
    const token = await this.getTenantAccessToken();
    const response = await this.fetcher(
      `https://open.feishu.cn${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
          ...(init.headers || {}),
        },
      }
    );
    return assertFeishuSuccess(response, await parseJson(response));
  }

  async listApplicationAdminIds(): Promise<FeishuAppAdminIds> {
    const body = await this.tenantRequest(
      "/open-apis/user/v4/app_admin_user/list"
    );
    const data = jsonObject(body.data);
    const users = Array.isArray(data.user_list) ? data.user_list : [];
    return {
      openIds: new Set(
        users
          .map((user) => asString(jsonObject(user).open_id))
          .filter(Boolean)
      ),
      userIds: new Set(
        users
          .map((user) => asString(jsonObject(user).user_id))
          .filter(Boolean)
      ),
    };
  }

  async listApplicationAdminOpenIds(): Promise<ReadonlySet<string>> {
    return (await this.listApplicationAdminIds()).openIds;
  }

  async addDriveMember(
    fileToken: string,
    fileType: "folder" | "bitable" | "docx",
    openId: string,
    permission: "view" | "edit" | "full_access"
  ): Promise<void> {
    const query = new URLSearchParams({
      type: fileType,
      need_notification: "true",
    });
    await this.tenantRequest(
      `/open-apis/drive/v1/permissions/${encodeURIComponent(fileToken)}` +
        `/members?${query}`,
      {
        method: "POST",
        body: JSON.stringify({
          member_type: "openid",
          member_id: openId,
          perm: permission,
        }),
      }
    );
  }

  async uploadDriveFile(options: {
    fileName: string;
    parentNode: string;
    bytes: Uint8Array;
    mimeType: string;
    signal?: AbortSignal;
  }): Promise<FeishuDriveUpload> {
    const token = await this.getTenantAccessToken();
    const form = new FormData();
    form.set("file_name", options.fileName);
    form.set("parent_type", "explorer");
    form.set("parent_node", options.parentNode);
    form.set("size", String(options.bytes.byteLength));
    // Copy into an ArrayBuffer-backed view so this remains a valid BlobPart
    // even when the caller supplied a Node Buffer backed by pooled memory.
    const fileBytes = new Uint8Array(options.bytes);
    form.set(
      "file",
      new Blob([fileBytes], { type: options.mimeType }),
      options.fileName
    );

    const response = await this.fetcher(
      "https://open.feishu.cn/open-apis/drive/v1/files/upload_all",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: options.signal,
      }
    );
    const body = assertFeishuSuccess(response, await parseJson(response));
    const fileToken = asString(jsonObject(body.data).file_token);
    if (!fileToken) {
      throw new FeishuApiError("Feishu did not return an uploaded file token", {
        requestId: response.headers.get("x-tt-logid") || undefined,
      });
    }
    return { fileToken };
  }

  async prepareDriveFileUpload(options: {
    fileName: string;
    parentNode: string;
    size: number;
    signal?: AbortSignal;
  }): Promise<FeishuDriveUploadPreparation> {
    const body = await this.tenantRequest(
      "/open-apis/drive/v1/files/upload_prepare",
      {
        method: "POST",
        body: JSON.stringify({
          file_name: options.fileName,
          parent_type: "explorer",
          parent_node: options.parentNode,
          size: options.size,
        }),
        signal: options.signal,
      }
    );
    const data = jsonObject(body.data);
    const uploadId = asString(data.upload_id);
    const blockSize = asNumber(data.block_size);
    const blockCount = asNumber(data.block_num);
    if (
      !uploadId ||
      !Number.isSafeInteger(blockSize) ||
      !Number.isSafeInteger(blockCount) ||
      !blockSize ||
      !blockCount
    ) {
      throw new FeishuApiError("Feishu returned an invalid multipart upload plan");
    }
    return { uploadId, blockSize, blockCount };
  }

  async uploadDriveFilePart(options: {
    uploadId: string;
    sequence: number;
    bytes: Uint8Array;
    mimeType: string;
    signal?: AbortSignal;
  }): Promise<void> {
    const token = await this.getTenantAccessToken();
    const form = new FormData();
    form.set("upload_id", options.uploadId);
    form.set("seq", String(options.sequence));
    form.set("size", String(options.bytes.byteLength));
    const partBytes = new Uint8Array(options.bytes);
    form.set(
      "file",
      new Blob([partBytes], { type: options.mimeType }),
      `part-${options.sequence}`
    );
    const response = await this.fetcher(
      "https://open.feishu.cn/open-apis/drive/v1/files/upload_part",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: options.signal,
      }
    );
    assertFeishuSuccess(response, await parseJson(response));
  }

  async finishDriveFileUpload(options: {
    uploadId: string;
    blockCount: number;
    signal?: AbortSignal;
  }): Promise<FeishuDriveUpload> {
    const body = await this.tenantRequest(
      "/open-apis/drive/v1/files/upload_finish",
      {
        method: "POST",
        body: JSON.stringify({
          upload_id: options.uploadId,
          block_num: options.blockCount,
        }),
        signal: options.signal,
      }
    );
    const fileToken = asString(jsonObject(body.data).file_token);
    if (!fileToken) {
      throw new FeishuApiError("Feishu did not return an uploaded file token");
    }
    return { fileToken };
  }

  // Bot DM to one user. Requires the app to hold the im:message send
  // scope and the recipient to be inside the app's availability range —
  // callers treat any failure as non-fatal.
  async sendTextMessage(openId: string, text: string): Promise<void> {
    await this.tenantRequest("/open-apis/im/v1/messages?receive_id_type=open_id", {
      method: "POST",
      body: JSON.stringify({
        receive_id: openId,
        msg_type: "text",
        content: JSON.stringify({ text: text.slice(0, 2000) }),
      }),
    });
  }

  async listTables(appToken: string): Promise<FeishuTable[]> {
    const items: FeishuTable[] = [];
    let pageToken = "";
    do {
      const query = new URLSearchParams({ page_size: "100" });
      if (pageToken) query.set("page_token", pageToken);
      const body = await this.tenantRequest(
        `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables?${query}`
      );
      const data = jsonObject(body.data);
      const pageItems = Array.isArray(data.items) ? data.items : [];
      for (const item of pageItems) {
        const table = jsonObject(item);
        const tableId = asString(table.table_id);
        if (tableId) items.push({ table_id: tableId, name: asString(table.name) });
      }
      pageToken = asString(data.page_token);
      if (!data.has_more) pageToken = "";
    } while (pageToken && items.length < 500);
    return items;
  }

  async listFields(appToken: string, tableId: string): Promise<FeishuField[]> {
    const items: FeishuField[] = [];
    let pageToken = "";
    do {
      const query = new URLSearchParams({ page_size: "100" });
      if (pageToken) query.set("page_token", pageToken);
      const body = await this.tenantRequest(
        `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}` +
          `/tables/${encodeURIComponent(tableId)}/fields?${query}`
      );
      const data = jsonObject(body.data);
      const pageItems = Array.isArray(data.items) ? data.items : [];
      for (const item of pageItems) {
        const field = jsonObject(item);
        const fieldId = asString(field.field_id);
        const fieldName = asString(field.field_name);
        if (!fieldId || !fieldName) continue;
        items.push({
          field_id: fieldId,
          field_name: fieldName,
          type: asNumber(field.type) || 0,
          is_primary: Boolean(field.is_primary),
          property: jsonObject(field.property),
        });
      }
      pageToken = asString(data.page_token);
      if (!data.has_more) pageToken = "";
    } while (pageToken && items.length < 500);
    return items;
  }

  async createField(
    appToken: string,
    tableId: string,
    options: {
      fieldName: string;
      type: number;
      property?: Record<string, unknown>;
    }
  ): Promise<FeishuField> {
    const body = await this.tenantRequest(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}` +
        `/tables/${encodeURIComponent(tableId)}/fields`,
      {
        method: "POST",
        body: JSON.stringify({
          field_name: options.fieldName,
          type: options.type,
          ...(options.property ? { property: options.property } : {}),
        }),
      }
    );
    const data = jsonObject(body.data);
    const field = jsonObject(data.field ?? data);
    const fieldId = asString(field.field_id);
    const fieldName = asString(field.field_name);
    if (!fieldId || !fieldName) {
      throw new FeishuApiError("Feishu did not return the created field");
    }
    return {
      field_id: fieldId,
      field_name: fieldName,
      type: asNumber(field.type) || options.type,
      is_primary: Boolean(field.is_primary),
      property: jsonObject(field.property),
    };
  }

  async listRecords(
    appToken: string,
    tableId: string,
    options: { viewId?: string; maxRecords?: number } = {}
  ): Promise<FeishuRecord[]> {
    const items: FeishuRecord[] = [];
    const maximum = Math.min(Math.max(options.maxRecords || 200, 1), 1_000);
    let pageToken = "";
    do {
      const query = new URLSearchParams({ page_size: "100" });
      if (pageToken) query.set("page_token", pageToken);
      if (options.viewId) query.set("view_id", options.viewId);
      const body = await this.tenantRequest(
        `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}` +
          `/tables/${encodeURIComponent(tableId)}/records?${query}`
      );
      const data = jsonObject(body.data);
      const pageItems = Array.isArray(data.items) ? data.items : [];
      for (const item of pageItems) {
        const record = jsonObject(item);
        const recordId = asString(record.record_id);
        if (!recordId) continue;
        items.push({
          record_id: recordId,
          fields: jsonObject(record.fields),
          created_time: record.created_time as number | string | undefined,
          last_modified_time: record.last_modified_time as
            | number
            | string
            | undefined,
        });
        if (items.length >= maximum) return items;
      }
      pageToken = asString(data.page_token);
      if (!data.has_more) pageToken = "";
    } while (pageToken);
    return items;
  }

  async getRecord(
    appToken: string,
    tableId: string,
    recordId: string
  ): Promise<FeishuRecord> {
    const body = await this.tenantRequest(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}` +
        `/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`
    );
    const record = jsonObject(jsonObject(body.data).record);
    const returnedId = asString(record.record_id) || recordId;
    return {
      record_id: returnedId,
      fields: jsonObject(record.fields),
      created_time: record.created_time as number | string | undefined,
      last_modified_time: record.last_modified_time as
        | number
        | string
        | undefined,
    };
  }

  async createRecord(
    appToken: string,
    tableId: string,
    fields: FeishuFields
  ): Promise<FeishuRecord> {
    const body = await this.tenantRequest(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}` +
        `/tables/${encodeURIComponent(tableId)}/records`,
      { method: "POST", body: JSON.stringify({ fields }) }
    );
    const record = jsonObject(jsonObject(body.data).record);
    return {
      record_id: asString(record.record_id),
      fields: jsonObject(record.fields),
      created_time: record.created_time as number | string | undefined,
      last_modified_time: record.last_modified_time as
        | number
        | string
        | undefined,
    };
  }

  async deleteRecord(
    appToken: string,
    tableId: string,
    recordId: string
  ): Promise<void> {
    await this.tenantRequest(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}` +
        `/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
      { method: "DELETE" }
    );
  }

  async updateRecord(
    appToken: string,
    tableId: string,
    recordId: string,
    fields: FeishuFields
  ): Promise<FeishuRecord> {
    const body = await this.tenantRequest(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}` +
        `/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(recordId)}`,
      { method: "PUT", body: JSON.stringify({ fields }) }
    );
    const record = jsonObject(jsonObject(body.data).record);
    return {
      record_id: asString(record.record_id) || recordId,
      fields: jsonObject(record.fields),
      created_time: record.created_time as number | string | undefined,
      last_modified_time: record.last_modified_time as
        | number
        | string
        | undefined,
    };
  }
}

export function resetCompanyOpsFeishuTokenCacheForTests(): void {
  tenantTokenCache.clear();
}
