// Relay a local video into the production /uploads folder WITHOUT pushing it
// over the throttled cross-border link (from abroad the direct upload runs
// ~40 KB/s and stalls; CLAUDE.md #67).
//
//   node --env-file=.env.local scripts/relayUploadViaCos.mjs "C:\path\to\clip.mp4" [--kind=exercise]
//
// 1. PUT the file to the footage bucket's `relay/` prefix over COS global
//    acceleration (fast from abroad; ~¥1.25/GB — a 25 MB clip is ~¥0.03).
// 2. Sign a 1-hour GET URL on the REGIONAL endpoint and have the Shanghai box
//    curl it straight into /opt/nolimit-training/uploads/<prefix>-<hex>.<ext>
//    — the same naming the live upload handler uses, so the optimize cron and
//    the thumbnail step treat it like any other upload.
// 3. Print the public URL to paste into the exercise editor's link box.
//
// Needs COS_SECRET_ID / COS_SECRET_KEY in .env.local and the `nolimit-cn` ssh
// alias. Secrets never leave env; the signed URL expires in an hour.
import { readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { authorization, cos } from "./footage/cos.mjs";

const BUCKET = "nxlimit-footage-1454208796";
const ACCEL_HOST = `${BUCKET}.cos.accelerate.myqcloud.com`;
const REGION_HOST = `${BUCKET}.cos.ap-guangzhou.myqcloud.com`;
const SSH_HOST = "nolimit-cn";
const UPLOAD_DIR = "/opt/nolimit-training/uploads";
const LIVE = "https://trainnolimit.cn";

const file = process.argv[2];
if (!file) {
  console.error('usage: node --env-file=.env.local scripts/relayUploadViaCos.mjs "<file>" [--kind=exercise]');
  process.exit(1);
}
const kind = (process.argv.find((a) => a.startsWith("--kind=")) || "--kind=exercise").slice(7);
const prefix = kind === "exercise" ? "ex" : "fv";
const ext = extname(file).toLowerCase();
if (![".mp4", ".mov", ".webm", ".m4v"].includes(ext)) {
  console.error(`Unsupported extension ${ext} (mp4/mov/webm/m4v).`);
  process.exit(1);
}
const size = statSync(file).size;
const key = `relay/${Date.now()}-${basename(file).replace(/[^\w.-]+/g, "_")}`;
const target = `${prefix}-${randomBytes(12).toString("hex")}${ext}`;
const contentType = ext === ".mov" ? "video/quicktime" : ext === ".webm" ? "video/webm" : "video/mp4";

console.log(`1/3 uploading ${(size / 1048576).toFixed(1)} MB to COS (accelerated)…`);
const t0 = Date.now();
const body = readFileSync(file);
const put = await cos({
  method: "PUT",
  host: ACCEL_HOST,
  pathname: `/${key}`,
  body,
  extraHeaders: { "Content-Type": contentType },
});
if (put.status !== 200) {
  console.error(`COS PUT failed ${put.status}: ${(await put.text()).slice(0, 300)}`);
  process.exit(1);
}
console.log(`    done in ${((Date.now() - t0) / 1000).toFixed(0)}s (${(size / 1048576 / ((Date.now() - t0) / 1000)).toFixed(1)} MB/s)`);

console.log(`2/3 pulling it onto the server as ${target}…`);
const signed = `https://${REGION_HOST}/${key}?${authorization({ method: "GET", pathname: `/${key}` })}`;
const remote = [
  `set -e`,
  `IFS= read -r U`,
  `curl -sS -f -o ${UPLOAD_DIR}/${target}.part "$U"`,
  `mv ${UPLOAD_DIR}/${target}.part ${UPLOAD_DIR}/${target}`,
  `stat -c %s ${UPLOAD_DIR}/${target}`,
].join(" && ");
const pull = spawnSync("ssh", [SSH_HOST, remote], { input: `${signed}\n`, encoding: "utf8" });
if (pull.status !== 0) {
  console.error(`server pull failed: ${pull.stderr}`);
  process.exit(1);
}
const remoteSize = Number(pull.stdout.trim());
if (remoteSize !== size) {
  console.error(`size mismatch: local ${size}, server ${remoteSize}`);
  process.exit(1);
}

console.log(`3/3 checking it serves…`);
const head = await fetch(`${LIVE}/uploads/${target}`, { method: "HEAD" });
console.log(`    ${head.status} ${head.headers.get("content-type")} ${head.headers.get("content-length")} bytes`);
if (head.status !== 200 || !/video/.test(head.headers.get("content-type") || "")) {
  console.error("The file is on the server but does not serve as video — check nginx/uploads.");
  process.exit(1);
}

// Tidy the relay copy; the bucket is an archive, not a queue.
await cos({ method: "DELETE", host: ACCEL_HOST, pathname: `/${key}` }).catch(() => {});

console.log("");
console.log("Paste this into the exercise editor's video link box, then Save:");
console.log(`  ${LIVE}/uploads/${target}`);
