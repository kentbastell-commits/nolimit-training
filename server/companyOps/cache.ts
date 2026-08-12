// Read caching for Company Operations.
//
// Every company-ops read is a Feishu Bitable round trip, and Bitable is slow
// by nature — measured on the Shanghai box 2026-08-12: ~1.3s per table read,
// 3.6s to create one record, 6.3s to delete one. The dashboard reads ~16
// tables, so an uncached load costs 2-3s of pure waiting, and the client
// reloads the whole dashboard after every save (write 3.6s + reload 2-3s).
//
// This reuses api/_cache.ts, so invalidation already rides the Postgres
// LISTEN/NOTIFY bus (server/db/cacheBus.ts) and reaches BOTH pm2 forks —
// without that, the sibling fork would keep serving a stale dashboard for the
// whole TTL (named mistake #5).
//
// Staleness budget: a write through the app invalidates immediately, so the
// only staleness is an edit made DIRECTLY in the Feishu Base (Kent does this
// occasionally) — visible within one TTL. That tradeoff is why the dashboard
// TTL is short.
import { getCached, setCached, invalidateCache } from "../../api/_cache.ts";

const PREFIX = "companyOps:";
export const DASHBOARD_TTL_MS = 60_000;
// Role/staff-row changes are rare and a stale role only delays a permission
// change by minutes — but it saves a full staff-table read on every request.
export const PRINCIPAL_TTL_MS = 5 * 60_000;

export const dashboardCacheKey = (openId: string, role: string) =>
  `${PREFIX}dashboard:${openId}:${role}`;

export const principalCacheKey = (openId: string) => `${PREFIX}principal:${openId}`;

// Off under vitest: handler tests truncate and rebuild state between cases,
// and a cached dashboard from the previous case would make a test pass
// against data the current case never wrote (same reasoning as the
// repository's sharedTargetCache guard).
const enabled = !process.env.VITEST;

export function readCache<T>(key: string): T | null {
  return enabled ? getCached<T>(key) : null;
}

export function writeCache(key: string, value: unknown, ttlMs: number): void {
  if (enabled) setCached(key, value, ttlMs);
}

/** Called after every successful mutation — clears every user's dashboard. */
export function invalidateCompanyOpsDashboards(): void {
  invalidateCache(`${PREFIX}dashboard:`);
}

/** Role/staff changes: drop cached principals too. */
export function invalidateCompanyOpsPrincipals(): void {
  invalidateCache(`${PREFIX}principal:`);
}
