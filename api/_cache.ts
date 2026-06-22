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
  store.set(key, { data, expiry: Date.now() + ttlMs });
}

// Drop every cache entry whose key starts with the prefix (e.g. "exercises").
export function invalidateCache(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
