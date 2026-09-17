// Tiny in-process cache for read-heavy, rarely-written Feishu tables. The
// server is a single long-lived process, so a Map persists across requests.
// Entries are invalidated explicitly by the matching write endpoints (and also
// expire on a TTL as a safety net), so a save is reflected immediately.
type Entry = { data: any; expiry: number };
const store = new Map<string, Entry>();
const pending = new Map<string, Promise<any>>();
const MAX_ENTRIES = 1000;

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
  const now = Date.now();
  for (const [entryKey, entry] of store) {
    if (entry.expiry <= now) store.delete(entryKey);
  }
  if (!store.has(key) && store.size >= MAX_ENTRIES) {
    store.delete(store.keys().next().value!);
  }
  store.set(key, { data, expiry: Date.now() + ttlMs });
}

/** Share one cold read; invalidation prevents an older read caching stale data. */
export async function getCachedOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = Promise.resolve().then(load).then((data) => {
    if (pending.get(key) === request) setCached(key, data, ttlMs);
    return data;
  }).finally(() => {
    if (pending.get(key) === request) pending.delete(key);
  });
  pending.set(key, request);
  return request;
}

// Since the 2-fork setup, a second process serves the same traffic with its
// OWN Map — a local invalidation alone leaves the sibling stale for the full
// TTL (named mistake #5). server/index.ts wires this broadcaster to a
// Postgres NOTIFY bus at boot so every invalidation reaches both processes;
// in tests and one-off scripts it stays unset and everything is local-only.
let broadcaster: ((prefix: string) => void) | null = null;

export function setCacheBroadcaster(fn: (prefix: string) => void) {
  broadcaster = fn;
}

// Local-only invalidation — used when applying a REMOTE notification, so a
// received invalidation can never re-broadcast and loop.
export function invalidateCacheLocal(prefix: string) {
  for (const key of pending.keys()) {
    if (key.startsWith(prefix)) pending.delete(key);
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

// Drop every cache entry whose key starts with the prefix (e.g. "exercises"),
// here and (via the bus) in the sibling process.
export function invalidateCache(prefix: string) {
  invalidateCacheLocal(prefix);
  try {
    broadcaster?.(prefix);
  } catch {
    // Broadcast is best-effort: a bus failure degrades to the old
    // TTL-staleness behavior, never to a failed write.
  }
}

// When the entry for `key` expires (ms epoch), or null if absent. Used by the
// warm-cache endpoint to evict entries that would go cold between cron passes.
export function cacheExpiry(key: string): number | null {
  return store.get(key)?.expiry ?? null;
}
