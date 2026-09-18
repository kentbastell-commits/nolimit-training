// Switch media.trainnolimit.cn's CDN acceleration region.
//   node --env-file=.env.local scripts/cdnSetArea.mjs           → show current config
//   node --env-file=.env.local scripts/cdnSetArea.mjs global    → set Area=global (mainland + overseas)
//   node --env-file=.env.local scripts/cdnSetArea.mjs mainland  → back to mainland only
// Same TC3 signing + COS_SECRET_ID/KEY as purgeCdn.mjs. Overseas traffic bills
// per region (North America ≈ ¥0.31/GB vs mainland ¥0.21/GB, 2026-09).
import crypto from "node:crypto";

const ID = process.env.COS_SECRET_ID;
const KEY = process.env.COS_SECRET_KEY;
if (!ID || !KEY) { console.log("COS_SECRET_ID / COS_SECRET_KEY missing"); process.exit(1); }
const DOMAIN = "media.trainnolimit.cn";
const want = process.argv[2];

async function call(action, payloadObj) {
  const payload = JSON.stringify(payloadObj);
  const host = "cdn.tencentcloudapi.com", service = "cdn", version = "2018-06-06";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const sha256hex = (m) => crypto.createHash("sha256").update(m).digest("hex");
  const hmac = (k, m) => crypto.createHmac("sha256", k).update(m).digest();
  const canonical = ["POST", "/", "", `content-type:application/json; charset=utf-8\nhost:${host}\n`, "content-type;host", sha256hex(payload)].join("\n");
  const toSign = ["TC3-HMAC-SHA256", timestamp, `${date}/${service}/tc3_request`, sha256hex(canonical)].join("\n");
  const kSigning = hmac(hmac(hmac(`TC3${KEY}`, date), service), "tc3_request");
  const signature = crypto.createHmac("sha256", kSigning).update(toSign).digest("hex");
  const res = await fetch(`https://${host}`, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8", Host: host, "X-TC-Action": action, "X-TC-Version": version, "X-TC-Timestamp": String(timestamp), Authorization: `TC3-HMAC-SHA256 Credential=${ID}/${date}/${service}/tc3_request, SignedHeaders=content-type;host, Signature=${signature}` }, body: payload });
  const body = await res.json();
  if (body.Response?.Error) throw new Error(`${action}: ${JSON.stringify(body.Response.Error)}`);
  return body.Response;
}

const describe = async () => {
  const r = await call("DescribeDomainsConfig", { Filters: [{ Name: "domain", Value: [DOMAIN] }] });
  const d = r.Domains?.[0];
  if (!d) throw new Error("domain not found in CDN");
  return { Area: d.Area, Status: d.Status, Https: d.Https?.Switch, Cname: d.Cname, Origin: d.Origin?.Origins };
};

console.log("before:", JSON.stringify(await describe()));
if (want === "global" || want === "mainland") {
  await call("UpdateDomainConfig", { Domain: DOMAIN, Area: want === "global" ? "global" : "mainland" });
  console.log("update requested:", want);
  await new Promise((r) => setTimeout(r, 4000));
  console.log("after:", JSON.stringify(await describe()));
}
