import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { CompanyOpsConfig, CompanyOpsRole } from "./config.ts";

export interface CompanyOpsSession {
  version: 1;
  openId: string;
  userId?: string;
  name: string;
  avatarUrl?: string;
  tenantKey?: string;
  role: CompanyOpsRole;
  csrfToken: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export interface CompanyOpsOAuthState {
  version: 1;
  nonce: string;
  returnTo: string;
  issuedAt: number;
  expiresAt: number;
}

export type CompanyOpsActionName =
  | "content.create"
  | "lead.create"
  | "partner.create"
  | "campaign.create"
  | "campaign.update"
  | "campaign.review"
  | "campaign.activate"
  | "campaign.results.submit"
  | "campaign.reconcile"
  | "experiment.create"
  | "weeklyReport.submit"
  | "metrics.submit"
  | "expense.submit"
  | "content.update"
  | "update_content"
  | "content.delete"
  | "delete_content"
  | "content.duplicate"
  | "duplicate_content"
  | "idea.create"
  | "create_idea"
  | "idea.respond"
  | "respond_idea"
  | "idea.vote"
  | "vote_idea"
  | "idea.status"
  | "update_idea_status"
  | "idea.create"
  | "create_idea"
  | "idea.respond"
  | "respond_idea"
  | "idea.vote"
  | "vote_idea"
  | "idea.status"
  | "update_idea_status"
  | "record.update"
  | "update_record"
  | "record.delete"
  | "delete_record"
  | "article.create"
  | "create_article"
  | "article.update"
  | "update_article"
  | "article.delete"
  | "delete_article"
  | "goal.create"
  | "goal.update"
  | "goal.respond"
  | "create_goal"
  | "update_goal"
  | "respond_goal"
  | "internalRequest.submit"
  | "onboarding.generate"
  | "access.request"
  | "access.approve"
  | "record.status.update"
  | "create_content_idea"
  | "create_lead"
  | "create_partner"
  | "create_campaign"
  | "create_experiment"
  | "submit_weekly_report"
  | "submit_metrics"
  | "submit_expense"
  | "submit_internal_request"
  | "request_founder_decision"
  | "generate_onboarding"
  | "request_access"
  | "approve_access"
  | "update_status"
  | "complete_onboarding_task"
  | "acknowledge_policy"
  | "approve_decision"
  | "request_decision_changes"
  | "submit_platform_metrics"
  | "create_support_issue"
  | "acknowledge_commission"
  | "raise_commission_dispute"
  | "acknowledge_compensation"
  | "dispute_compensation"
  | "performance.goals.set"
  | "performance.report.submit"
  | "performance.review.request_changes"
  | "performance.review.score"
  | "performance.review.respond"
  | "performance.finalize"
  | "set_performance_goals"
  | "submit_performance_report"
  | "request_performance_changes"
  | "score_performance_review"
  | "respond_performance_review"
  | "finalize_performance";

const ACTIONS_BY_ROLE: Record<CompanyOpsRole, ReadonlySet<CompanyOpsActionName>> = {
  founder: new Set<CompanyOpsActionName>([
    "content.create",
    "lead.create",
    "partner.create",
    "campaign.create",
    "campaign.review",
    "campaign.activate",
    "campaign.results.submit",
    "campaign.reconcile",
    "experiment.create",
    "weeklyReport.submit",
    "metrics.submit",
    "expense.submit",
    "internalRequest.submit",
    "onboarding.generate",
    "access.request",
    "access.approve",
    "record.status.update",
    "create_content_idea",
    "content.update",
    "update_content",
    "content.delete",
    "delete_content",
    "content.duplicate",
    "duplicate_content",
    "idea.create",
    "create_idea",
    "idea.respond",
    "respond_idea",
    "idea.vote",
    "vote_idea",
    "idea.status",
    "update_idea_status",
    "idea.create",
    "create_idea",
    "idea.respond",
    "respond_idea",
    "idea.vote",
    "vote_idea",
    "idea.status",
    "update_idea_status",
    "record.update",
    "update_record",
    "record.delete",
    "delete_record",
    "article.create",
    "create_article",
    "article.update",
    "update_article",
    "article.delete",
    "delete_article",
    "create_lead",
    "create_partner",
    "create_campaign",
    "create_experiment",
    "submit_weekly_report",
    "submit_metrics",
    "submit_expense",
    "submit_internal_request",
    "request_founder_decision",
    "goal.create",
    "goal.update",
    "goal.respond",
    "create_goal",
    "update_goal",
    "respond_goal",
    "generate_onboarding",
    "request_access",
    "approve_access",
    "update_status",
    "complete_onboarding_task",
    "acknowledge_policy",
    "approve_decision",
    "request_decision_changes",
    "submit_platform_metrics",
    "create_support_issue",
    "acknowledge_commission",
    "raise_commission_dispute",
    "acknowledge_compensation",
    "dispute_compensation",
    "performance.goals.set",
    "performance.report.submit",
    "performance.review.request_changes",
    "performance.review.score",
    "performance.review.respond",
    "performance.finalize",
    "set_performance_goals",
    "submit_performance_report",
    "request_performance_changes",
    "score_performance_review",
    "respond_performance_review",
    "finalize_performance",
  ]),
  finance: new Set<CompanyOpsActionName>([
    "expense.submit",
    "internalRequest.submit",
    "submit_expense",
    "submit_internal_request",
    "request_founder_decision",
    "complete_onboarding_task",
    "acknowledge_policy",
    "goal.respond",
    "respond_goal",
    "create_support_issue",
    "acknowledge_commission",
    "raise_commission_dispute",
    "acknowledge_compensation",
    "dispute_compensation",
    "performance.report.submit",
    "performance.review.respond",
    "submit_performance_report",
    "respond_performance_review",
  ]),
  growth: new Set<CompanyOpsActionName>([
    "content.create",
    "content.update",
    "update_content",
    "content.delete",
    "delete_content",
    "content.duplicate",
    "duplicate_content",
    "idea.create",
    "create_idea",
    "idea.respond",
    "respond_idea",
    "idea.vote",
    "vote_idea",
    "idea.status",
    "update_idea_status",
    "idea.create",
    "create_idea",
    "idea.respond",
    "respond_idea",
    "idea.vote",
    "vote_idea",
    "idea.status",
    "update_idea_status",
    "record.update",
    "update_record",
    "record.delete",
    "delete_record",
    "article.create",
    "create_article",
    "article.update",
    "update_article",
    "article.delete",
    "delete_article",
    "lead.create",
    "partner.create",
    "campaign.create",
    "campaign.update",
    "campaign.activate",
    "campaign.results.submit",
    "experiment.create",
    "weeklyReport.submit",
    "metrics.submit",
    "expense.submit",
    "internalRequest.submit",
    "create_content_idea",
    "create_lead",
    "create_partner",
    "create_campaign",
    "create_experiment",
    "submit_weekly_report",
    "submit_metrics",
    "submit_expense",
    "submit_internal_request",
    "request_founder_decision",
    "complete_onboarding_task",
    "acknowledge_policy",
    "goal.respond",
    "respond_goal",
    "submit_platform_metrics",
    "create_support_issue",
    "acknowledge_commission",
    "raise_commission_dispute",
    "acknowledge_compensation",
    "dispute_compensation",
    "performance.report.submit",
    "performance.review.respond",
    "submit_performance_report",
    "respond_performance_review",
  ]),
  staff: new Set<CompanyOpsActionName>([
    "expense.submit",
    "internalRequest.submit",
    "submit_expense",
    "submit_internal_request",
    "request_founder_decision",
    "complete_onboarding_task",
    "acknowledge_policy",
    "goal.respond",
    "respond_goal",
    "create_support_issue",
    "acknowledge_commission",
    "raise_commission_dispute",
    "acknowledge_compensation",
    "dispute_compensation",
    "performance.report.submit",
    "performance.review.respond",
    "submit_performance_report",
    "respond_performance_review",
  ]),
  pending: new Set<CompanyOpsActionName>(["access.request", "request_access"]),
};

export class CompanyOpsHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CompanyOpsHttpError";
    this.status = status;
  }
}

const nowSeconds = (): number => Math.floor(Date.now() / 1_000);
const randomToken = (bytes = 24): string => randomBytes(bytes).toString("base64url");

const DEFAULT_RETURN_TO = "/company-ops";
const RETURN_TO_BASE = new URL("https://company-ops.invalid");
const hasUnsafeReturnToCharacters = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.codePointAt(0) || 0;
    return code <= 0x1f || code === 0x7f || character === "\\";
  });

const isSafeInternalReturnTo = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 4_096) return false;
  if (hasUnsafeReturnToCharacters(value)) return false;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;

  // Inspect multiple encoding layers. This rejects `%2f`, `%5c`, encoded
  // control characters, and double-encoded variants before a browser or proxy
  // gets an opportunity to reinterpret them as URL separators.
  let decoded = trimmed;
  let stable = false;
  for (let depth = 0; depth < 8; depth += 1) {
    if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(decoded)) return false;
    if (hasUnsafeReturnToCharacters(decoded)) return false;
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return false;
    }
    if (next === decoded) {
      stable = true;
      break;
    }
    decoded = next;
  }
  if (!stable) return false;

  try {
    const parsed = new URL(trimmed, RETURN_TO_BASE);
    return parsed.origin === RETURN_TO_BASE.origin;
  } catch {
    return false;
  }
};

const safeReturnTo = (value: unknown, fallback: string): string => {
  const safeFallback = isSafeInternalReturnTo(fallback)
    ? fallback.trim()
    : DEFAULT_RETURN_TO;
  return isSafeInternalReturnTo(value) ? value.trim() : safeFallback;
};

const hmac = (value: string, secret: string): Buffer =>
  createHmac("sha256", secret).update(value).digest();

const safeEqualText = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const signPayload = (payload: object, secret: string): string => {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body, secret).toString("base64url")}`;
};

const verifyPayload = <T extends object>(
  token: string,
  secret: string
): T | undefined => {
  if (!token || token.length > 8_192) return undefined;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return undefined;
  const body = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  const expectedSignature = hmac(body, secret).toString("base64url");
  if (!safeEqualText(suppliedSignature, expectedSignature)) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" ? (parsed as T) : undefined;
  } catch {
    return undefined;
  }
};

export function createOAuthState(
  config: CompanyOpsConfig,
  requestedReturnTo?: unknown
): { token: string; state: CompanyOpsOAuthState } {
  const issuedAt = nowSeconds();
  const state: CompanyOpsOAuthState = {
    version: 1,
    nonce: randomToken(),
    returnTo: safeReturnTo(requestedReturnTo, config.afterLoginPath),
    issuedAt,
    expiresAt: issuedAt + config.stateTtlSeconds,
  };
  return { token: signPayload(state, config.sessionSecret), state };
}

export function verifyOAuthState(
  token: string,
  cookieToken: string,
  config: CompanyOpsConfig
): CompanyOpsOAuthState {
  if (!safeEqualText(token, cookieToken)) {
    throw new CompanyOpsHttpError(400, "The sign-in request could not be verified");
  }
  const state = verifyPayload<CompanyOpsOAuthState>(token, config.sessionSecret);
  const now = nowSeconds();
  if (
    !state ||
    state.version !== 1 ||
    typeof state.nonce !== "string" ||
    state.nonce.length < 20 ||
    !Number.isInteger(state.issuedAt) ||
    !Number.isInteger(state.expiresAt) ||
    state.issuedAt > now + 30 ||
    state.expiresAt < now ||
    state.expiresAt - state.issuedAt > config.stateTtlSeconds + 5
  ) {
    throw new CompanyOpsHttpError(400, "The sign-in request has expired");
  }
  return {
    ...state,
    returnTo: safeReturnTo(state.returnTo, config.afterLoginPath),
  };
}

export function createSession(
  config: CompanyOpsConfig,
  user: {
    openId: string;
    userId?: string;
    name: string;
    avatarUrl?: string;
    tenantKey?: string;
    role: CompanyOpsRole;
  }
): { token: string; session: CompanyOpsSession } {
  const issuedAt = nowSeconds();
  const session: CompanyOpsSession = {
    version: 1,
    openId: user.openId,
    userId: user.userId,
    name: user.name,
    avatarUrl: user.avatarUrl,
    tenantKey: user.tenantKey,
    role: user.role,
    csrfToken: randomToken(),
    issuedAt,
    expiresAt: issuedAt + config.sessionTtlSeconds,
    nonce: randomToken(16),
  };
  return { token: signPayload(session, config.sessionSecret), session };
}

export function verifySessionToken(
  token: string,
  config: CompanyOpsConfig
): CompanyOpsSession | undefined {
  const session = verifyPayload<CompanyOpsSession>(token, config.sessionSecret);
  const now = nowSeconds();
  if (
    !session ||
    session.version !== 1 ||
    typeof session.openId !== "string" ||
    !session.openId.startsWith("ou_") ||
    typeof session.name !== "string" ||
    !ACTIONS_BY_ROLE[session.role] ||
    typeof session.csrfToken !== "string" ||
    session.csrfToken.length < 20 ||
    !Number.isInteger(session.issuedAt) ||
    !Number.isInteger(session.expiresAt) ||
    session.issuedAt > now + 30 ||
    session.expiresAt <= now ||
    session.expiresAt - session.issuedAt > config.sessionTtlSeconds + 5
  ) {
    return undefined;
  }
  if (
    config.allowedTenantKey &&
    session.tenantKey !== config.allowedTenantKey
  ) {
    return undefined;
  }
  return session;
}

const parseCookies = (header: string | undefined): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const part of (header || "").split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name || result[name] !== undefined) continue;
    try {
      result[name] = decodeURIComponent(value);
    } catch {
      result[name] = value;
    }
  }
  return result;
};

const cookieHeader = (
  name: string,
  value: string,
  options: { maxAge: number; secure: boolean }
): string => {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(options.maxAge))}`,
  ];
  if (options.secure) parts.push("Secure");
  if (options.maxAge === 0) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  return parts.join("; ");
};

export function appendSetCookie(res: VercelResponse, value: string): void {
  const current = res.getHeader("Set-Cookie");
  const values = Array.isArray(current)
    ? current.map(String)
    : current
      ? [String(current)]
      : [];
  res.setHeader("Set-Cookie", [...values, value]);
}

export function setOAuthStateCookie(
  res: VercelResponse,
  token: string,
  config: CompanyOpsConfig
): void {
  appendSetCookie(
    res,
    cookieHeader(config.stateCookieName, token, {
      maxAge: config.stateTtlSeconds,
      secure: config.cookieSecure,
    })
  );
}

export function clearOAuthStateCookie(
  res: VercelResponse,
  config: CompanyOpsConfig
): void {
  appendSetCookie(
    res,
    cookieHeader(config.stateCookieName, "", {
      maxAge: 0,
      secure: config.cookieSecure,
    })
  );
}

export function setSessionCookie(
  res: VercelResponse,
  token: string,
  config: CompanyOpsConfig
): void {
  appendSetCookie(
    res,
    cookieHeader(config.cookieName, token, {
      maxAge: config.sessionTtlSeconds,
      secure: config.cookieSecure,
    })
  );
}

export function clearSessionCookie(
  res: VercelResponse,
  config: CompanyOpsConfig
): void {
  appendSetCookie(
    res,
    cookieHeader(config.cookieName, "", {
      maxAge: 0,
      secure: config.cookieSecure,
    })
  );
}

export function getCookie(req: VercelRequest, name: string): string {
  const header = req.headers.cookie;
  return parseCookies(Array.isArray(header) ? header[0] : header)[name] || "";
}

export function getRequestSession(
  req: VercelRequest,
  config: CompanyOpsConfig
): CompanyOpsSession | undefined {
  return verifySessionToken(getCookie(req, config.cookieName), config);
}

export function requireRequestSession(
  req: VercelRequest,
  config: CompanyOpsConfig
): CompanyOpsSession {
  const session = getRequestSession(req, config);
  if (!session) throw new CompanyOpsHttpError(401, "Sign in with Feishu to continue");
  return session;
}

const headerText = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] || "" : value || "";

export function requireMutationCsrf(
  req: VercelRequest,
  session: CompanyOpsSession,
  config: CompanyOpsConfig
): void {
  const contentType = headerText(req.headers["content-type"]);
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new CompanyOpsHttpError(415, "JSON request required");
  }
  const csrf = headerText(req.headers["x-csrf-token"]);
  if (!csrf || !safeEqualText(csrf, session.csrfToken)) {
    throw new CompanyOpsHttpError(403, "The request could not be verified");
  }
  const origin = headerText(req.headers.origin);
  if (origin) {
    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(config.oauthRedirectUri).origin;
    } catch {
      throw new CompanyOpsHttpError(503, "Company Operations is not configured");
    }
    if (origin !== expectedOrigin) {
      throw new CompanyOpsHttpError(403, "This request came from an invalid origin");
    }
  }
}

export function canPerformAction(
  role: CompanyOpsRole,
  action: CompanyOpsActionName
): boolean {
  return ACTIONS_BY_ROLE[role].has(action);
}

export function requireActionPermission(
  role: CompanyOpsRole,
  action: CompanyOpsActionName
): void {
  if (!canPerformAction(role, action)) {
    throw new CompanyOpsHttpError(403, "You do not have permission for this action");
  }
}

export function noStore(res: VercelResponse): void {
  res.setHeader("Cache-Control", "no-store, private, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

export function queryText(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export function safeApiError(error: unknown): { status: number; message: string } {
  if (error instanceof CompanyOpsHttpError) {
    return { status: error.status, message: error.message };
  }
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number" &&
    (error as { status: number }).status === 503
  ) {
    return { status: 503, message: "Company Operations is not configured" };
  }
  return { status: 500, message: "Company Operations request failed" };
}
