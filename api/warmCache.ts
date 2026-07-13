import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cacheExpiry, invalidateCache } from "./_cache.ts";

// Keys the server-side cron keeps hot — must match the endpoint list the cron
// curls right after calling this (see the crontab "nolimit cache warmer").
const WARM_KEYS = [
  "workouts",
  "programs",
  "exercises",
  "clients",
  "productOrders",
  "checkIns",
  "coaches",
  "teams",
  "notifications",
  "reviews",
];

// A plain GET is answered straight from a still-valid cache and never
// refreshes it, so entries with a TTL shorter than the warm interval would
// still go cold BETWEEN cron passes and hand a human the ~12s Feishu fetch.
// This endpoint evicts entries that will expire before the next pass; the
// warm GETs that follow refetch them while nobody is waiting.
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Only the on-box cron (direct to the app port) may force evictions —
  // nginx-proxied traffic carries X-Forwarded-For.
  if (req.headers["x-forwarded-for"]) {
    res.status(403).json({ message: "warmCache is internal." });
    return;
  }

  const horizonMs = Math.min(
    10 * 60 * 1000,
    Number(req.query?.horizonMs) || 150 * 1000
  );
  const dropped: string[] = [];
  for (const key of WARM_KEYS) {
    const expiry = cacheExpiry(key);
    if (expiry !== null && expiry - Date.now() < horizonMs) {
      invalidateCache(key);
      dropped.push(key);
    }
  }
  res.status(200).json({ success: true, dropped });
}
