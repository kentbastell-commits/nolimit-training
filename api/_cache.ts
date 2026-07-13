// Tiny in-process cache for read-heavy, rarely-written Feishu tables. The
// server is a single long-lived process, so a Map persists across requests.
// Entries are invalidated explicitly by the matching write endpoints (and also
// expire on a TTL as a safety net), so a save is reflected immediately.
type Entry = { data: any; expiry: number };
const store = new Map<string, Entry>();

export function getCached<T = any>(key: string): T | null {
  const entry = store.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  if (entry) store.delete(key);
  return null;
}

export function setCached(key: string, data: any, ttlMs: number) {
  // Never cache an empty list. The Feishu fetch helpers return [] on a
  // transient failure (token blip, rate limit, a dropped page) just as they do
  // for a genuinely empty table, and caching that [] would serve "no data" to
  // every reader for the whole TTL — which looks exactly like total data loss.
  // Skipping the write just means the next request re-fetches (cheap, safe).
  if (Array.isArray(data) && data.length === 0) return;
  store.set(key, { data, expiry: Date.now() + ttlMs });
}

// Drop every cache entry whose key starts with the prefix (e.g. "exercises").
export function invalidateCache(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

// When the entry for `key` expires (ms epoch), or null if absent. Used by the
// warm-cache endpoint to evict entries that would go cold between cron passes.
export function cacheExpiry(key: string): number | null {
  return store.get(key)?.expiry ?? null;
}
