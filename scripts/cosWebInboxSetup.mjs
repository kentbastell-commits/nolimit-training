// One-time (re-runnable) bucket setup for the in-app fast upload path
// (api/cosUploadTicket + api/cosUploadFinish): the browser PUTs straight to
// COS's acceleration host, so the bucket needs a CORS rule for our web
// origins, and a lifecycle rule that expires anything left under web-inbox/
// after a day (the server deletes each object after pulling it; this is the
// backstop for abandoned uploads).
//
//   node --env-file=.env.local scripts/cosWebInboxSetup.mjs          # dry: prints current + intended
//   node --env-file=.env.local scripts/cosWebInboxSetup.mjs --apply  # writes both configs
//
// Needs COS_SECRET_ID / COS_SECRET_KEY (the footage archive creds). Uses the
// accelerate host only for these tiny control requests.
import { createHash } from "node:crypto";
import { cos } from "./footage/cos.mjs";

const BUCKET = process.env.COS_BUCKET || "nxlimit-footage-1454208796";
const HOST = `${BUCKET}.cos.accelerate.myqcloud.com`;
const APPLY = process.argv.includes("--apply");

const ORIGINS = [
  "https://trainnolimit.cn",
  "https://trainnolimit.com",
  "https://www.trainnolimit.cn",
  "https://www.trainnolimit.com",
  "http://localhost:5173",
  "http://localhost:5199",
];

const corsXml = `<CORSConfiguration>
  <CORSRule>
    <ID>web-upload-relay</ID>
${ORIGINS.map((o) => `    <AllowedOrigin>${o}</AllowedOrigin>`).join("\n")}
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

const lifecycleXml = `<LifecycleConfiguration>
  <Rule>
    <ID>expire-web-inbox</ID>
    <Filter><Prefix>web-inbox/</Prefix></Filter>
    <Status>Enabled</Status>
    <Expiration><Days>1</Days></Expiration>
    <AbortIncompleteMultipartUpload><DaysAfterInitiation>1</DaysAfterInitiation></AbortIncompleteMultipartUpload>
  </Rule>
</LifecycleConfiguration>`;

async function show(label, params) {
  const r = await cos({ method: "GET", host: HOST, pathname: "/", params });
  const text = await r.text();
  console.log(`--- current ${label}: HTTP ${r.status}`);
  console.log(text.replace(/<RequestId>.*?<\/RequestId>|<TraceId>.*?<\/TraceId>/gs, "").trim().slice(0, 1200));
}

async function put(label, params, body) {
  const r = await cos({
    method: "PUT",
    host: HOST,
    pathname: "/",
    params,
    body,
    extraHeaders: {
      "Content-Type": "application/xml",
      "Content-MD5": createHash("md5").update(body).digest("base64"),
    },
  });
  const text = await r.text();
  console.log(`--- PUT ${label}: HTTP ${r.status} ${text.replace(/\s+/g, " ").slice(0, 400)}`);
  if (r.status !== 200) process.exitCode = 1;
}

await show("CORS", { cors: "" });
await show("lifecycle", { lifecycle: "" });
if (!APPLY) {
  console.log("\nDry run. Intended CORS:\n" + corsXml + "\n\nIntended lifecycle:\n" + lifecycleXml);
  console.log("\nRe-run with --apply to write both.");
} else {
  await put("CORS", { cors: "" }, corsXml);
  await put("lifecycle", { lifecycle: "" }, lifecycleXml);
  await show("CORS", { cors: "" });
  await show("lifecycle", { lifecycle: "" });
}
