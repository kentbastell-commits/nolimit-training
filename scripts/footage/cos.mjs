// Minimal Tencent COS v5 signing + request helper (no SDK dependency).
// Secrets come from env only; nothing is ever printed.
import { createHmac, createHash } from "node:crypto";

const ID = process.env.COS_SECRET_ID;
const KEY = process.env.COS_SECRET_KEY;
if (!ID || !KEY) {
  console.log("COS_SECRET_ID / COS_SECRET_KEY missing from env");
  process.exit(1);
}

const sha1 = (s) => createHash("sha1").update(s).digest("hex");
const hmac = (key, s) => createHmac("sha1", key).update(s).digest("hex");

export function authorization({ method, pathname, params = {}, headers = {} }) {
  const now = Math.floor(Date.now() / 1000);
  const keyTime = `${now - 60};${now + 3600}`;
  const signKey = hmac(KEY, keyTime);

  const norm = (obj) =>
    Object.entries(obj)
      .map(([k, v]) => [k.toLowerCase(), v])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const paramPairs = norm(params);
  const headerPairs = norm(headers);
  const paramList = paramPairs.map(([k]) => k).join(";");
  const headerList = headerPairs.map(([k]) => k).join(";");
  const paramString = paramPairs
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const headerString = headerPairs
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const httpString = `${method.toLowerCase()}\n${pathname}\n${paramString}\n${headerString}\n`;
  const stringToSign = `sha1\n${keyTime}\n${sha1(httpString)}\n`;
  const signature = hmac(signKey, stringToSign);

  return [
    "q-sign-algorithm=sha1",
    `q-ak=${ID}`,
    `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`,
    `q-header-list=${headerList}`,
    `q-url-param-list=${paramList}`,
    `q-signature=${signature}`,
  ].join("&");
}

export async function cos({ method = "GET", host, pathname = "/", params = {}, body, extraHeaders = {} }) {
  const headers = { host, ...extraHeaders };
  const auth = authorization({ method, pathname, params, headers });
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const url = `https://${host}${pathname}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: auth, ...extraHeaders },
    body,
  });
  return res;
}

export const APPID_FROM_OWNER = (xml) => {
  const m = xml.match(/<ID>[^<]*?(\d{5,})<\/ID>/);
  return m ? m[1] : null;
};
