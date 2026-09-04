// Purge Tencent CDN cache for media.trainnolimit.cn.
//
//   node --env-file=.env.local scripts/purgeCdn.mjs --path "https://media.trainnolimit.cn/uploads/"
//   node --env-file=.env.local scripts/purgeCdn.mjs https://media.trainnolimit.cn/uploads/ex-abc.mov [...]
//
// Always pass FULL URLs from Git Bash on Windows: a bare "/uploads/" gets
// MSYS-converted to "C:/Program Files/Git/uploads/" before Node sees it,
// which produced a purge request for the domain "media.trainnolimit.cnC".
//
// --path issues a directory purge (PurgePathCache, flush type "delete" so
// edges re-pull from origin); bare URLs issue PurgeUrlsCache. Uses the same
// account credentials as the COS footage scripts (COS_SECRET_ID/KEY).
// Exits 0 with a notice when creds are absent, so cron callers can invoke it
// unconditionally (best-effort purge, never a pipeline failure).
import crypto from "node:crypto";

const ID = process.env.COS_SECRET_ID;
const KEY = process.env.COS_SECRET_KEY;
if (!ID || !KEY) {
  console.log("purgeCdn: COS_SECRET_ID / COS_SECRET_KEY not in env — skipping purge");
  process.exit(0);
}

const args = process.argv.slice(2);
let action;
let payload;
if (args[0] === "--path") {
  const p = args[1] || "/uploads/";
  action = "PurgePathCache";
  payload = JSON.stringify({
    Paths: [p.startsWith("http") ? p : `https://media.trainnolimit.cn${p}`],
    FlushType: "delete",
  });
} else if (args.length) {
  action = "PurgeUrlsCache";
  payload = JSON.stringify({ Urls: args });
} else {
  console.log("usage: purgeCdn.mjs --path /uploads/  |  purgeCdn.mjs <url> [...]");
  process.exit(1);
}

// TC3-HMAC-SHA256 request signing (Tencent Cloud API 3.0)
const host = "cdn.tencentcloudapi.com";
const service = "cdn";
const version = "2018-06-06";
const timestamp = Math.floor(Date.now() / 1000);
const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

const sha256hex = (msg) => crypto.createHash("sha256").update(msg).digest("hex");
const hmac = (key, msg) => crypto.createHmac("sha256", key).update(msg).digest();

const canonicalRequest = [
  "POST",
  "/",
  "",
  `content-type:application/json; charset=utf-8\nhost:${host}\n`,
  "content-type;host",
  sha256hex(payload),
].join("\n");
const stringToSign = [
  "TC3-HMAC-SHA256",
  timestamp,
  `${date}/${service}/tc3_request`,
  sha256hex(canonicalRequest),
].join("\n");
const kDate = hmac(`TC3${KEY}`, date);
const kService = hmac(kDate, service);
const kSigning = hmac(kService, "tc3_request");
const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

const res = await fetch(`https://${host}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    Host: host,
    "X-TC-Action": action,
    "X-TC-Version": version,
    "X-TC-Timestamp": String(timestamp),
    Authorization: `TC3-HMAC-SHA256 Credential=${ID}/${date}/${service}/tc3_request, SignedHeaders=content-type;host, Signature=${signature}`,
  },
  body: payload,
});
const body = await res.json();
if (body.Response?.Error) {
  console.error(`purgeCdn: ${action} FAILED —`, JSON.stringify(body.Response.Error));
  process.exit(1);
}
console.log(`purgeCdn: ${action} ok`, JSON.stringify(body.Response));
