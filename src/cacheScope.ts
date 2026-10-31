export const PERSISTENT_CACHE_PREFIX = "nolimit-training:data:v2:";
export function persistentCacheScope(search: string) {
  const query = new URLSearchParams(search);
  if (query.get("portal") === "client") {
    const code = (query.get("client") || query.get("clientCode") || "").trim();
    return `${query.get("preview") === "coach" ? "preview" : "athlete"}:${code}`;
  }
  return query.get("view") === "coach" ? "coach" : "public";
}
export function persistentCacheStorageKey(key: string, search = window.location.search) {
  return `${PERSISTENT_CACHE_PREFIX}${persistentCacheScope(search)}:${key}`;
}
export function clearAthleteCachedReads(code: string) {
  const prefix = `${PERSISTENT_CACHE_PREFIX}athlete:${code}:`;
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(prefix)) localStorage.removeItem(key);
  } catch { /* private mode; authentication still revokes server access */ }
}
