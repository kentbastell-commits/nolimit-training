// Shared, in-memory cached Feishu tenant_access_token.
//
// Every endpoint used to POST for a fresh tenant_access_token on *every*
// request — an extra Feishu round-trip before any read/write. Felt most on
// submits (the "Finish Workout" tap fetched a new token before saving).
//
// The token is valid ~2h. On the long-lived Node server (HK / mainland) this
// module-level cache is shared across all requests, so the token is fetched at
// most once per ~2h window instead of once per call. On Vercel's serverless it
// still caches within a warm instance. No behaviour change — just fewer calls.

let cachedToken: string | null = null;
let expiresAt = 0; // epoch ms when the cached token stops being usable
let inFlight: Promise<string> | null = null;

const TOKEN_URL =
  "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";

// Refresh a few minutes early so we never hand out a token that's about to die.
const EARLY_REFRESH_MS = 5 * 60 * 1000;

async function fetchToken(): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });

  const data = await response.json();

  if (!data.tenant_access_token) {
    throw new Error(`Could not get tenant token: ${JSON.stringify(data)}`);
  }

  // Feishu returns `expire` in seconds (typically 7200).
  const ttlMs = (Number(data.expire) || 7200) * 1000;
  cachedToken = data.tenant_access_token as string;
  expiresAt = Date.now() + ttlMs;
  return cachedToken;
}

export async function getTenantToken(): Promise<string> {
  // Serve from cache until we enter the early-refresh window.
  if (cachedToken && Date.now() < expiresAt - EARLY_REFRESH_MS) {
    return cachedToken;
  }

  // Dedupe concurrent refreshes so a burst of requests shares one fetch
  // instead of each firing its own token request.
  if (!inFlight) {
    inFlight = fetchToken().finally(() => {
      inFlight = null;
    });
  }

  return inFlight;
}
