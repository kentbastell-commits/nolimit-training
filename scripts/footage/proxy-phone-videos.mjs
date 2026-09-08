// Phone-video routine, one command:
//   1. archive each original to COS   (phone-archive/YYYY-MM/<name>, cheap master storage)
//   2. make a small 720p proxy        (<src>/proxies/<name>.mp4, ~5-10% of original size)
//   3. upload the proxy to Feishu Drive ("Footage Previews 视频素材预览" under the
//      company shared-assets folder — native preview for the team)
//
//   node --env-file=.env.local scripts/footage/proxy-phone-videos.mjs [srcDir] [--dry] [--accelerate]
//
// Defaults to C:\Users\kentb\Videos\phone-inbox (created if missing — drop
// phone dumps there). Idempotent: a manifest in the source dir records what
// finished, so re-runs only do the missing steps. Per-file failures don't
// sink the batch. --accelerate opts into COS global acceleration (~¥1.25/GB,
// only worth it outside China) — never the default, same rule as the other
// COS scripts.
import {
  closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync,
  readdirSync, statSync, writeFileSync,
} from "node:fs";
import { basename, extname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { cos } from "./cos.mjs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const DRY = process.argv.includes("--dry");
const ACCELERATE = process.argv.includes("--accelerate");
const SRC = args[0] || "C:\\Users\\kentb\\Videos\\phone-inbox";
const PROXY_DIR = join(SRC, "proxies");
const MANIFEST = join(SRC, "proxy-manifest.json");

const BUCKET = "nxlimit-footage-1454208796";
const HOST = ACCELERATE
  ? `${BUCKET}.cos.accelerate.myqcloud.com`
  : `${BUCKET}.cos.ap-guangzhou.myqcloud.com`;
const PART_SIZE = 4 * 1024 * 1024;
const FOLDER_NAME = "Footage Previews 视频素材预览";

const APP_ID = process.env.FEISHU_ADMIN_APP_ID;
const APP_SECRET = process.env.FEISHU_ADMIN_APP_SECRET;
const PARENT_FOLDER = process.env.FEISHU_ADMIN_SHARED_ASSETS_FOLDER_TOKEN;
if (!APP_ID || !APP_SECRET || !PARENT_FOLDER) {
  console.log("Missing FEISHU_ADMIN_APP_ID / _APP_SECRET / _SHARED_ASSETS_FOLDER_TOKEN in env");
  process.exit(1);
}

mkdirSync(SRC, { recursive: true });
mkdirSync(PROXY_DIR, { recursive: true });

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
const saveManifest = () => writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

const fmtMB = (b) => `${(b / 1048576).toFixed(1)}MB`;

/* ------------------------------- Feishu ---------------------------------- */

let tenantToken = "";
async function feishuToken() {
  if (tenantToken) return tenantToken;
  const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const body = await res.json();
  if (body.code !== 0) throw new Error(`Feishu token failed: ${body.code} ${body.msg}`);
  tenantToken = body.tenant_access_token;
  return tenantToken;
}

async function feishuJson(path, init = {}) {
  const token = await feishuToken();
  const res = await fetch(`https://open.feishu.cn${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json();
  if (body.code !== 0) throw new Error(`Feishu ${path} failed: ${body.code} ${body.msg}`);
  return body.data || {};
}

async function feishuForm(path, form) {
  const token = await feishuToken();
  const res = await fetch(`https://open.feishu.cn${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await res.json();
  if (body.code !== 0) throw new Error(`Feishu ${path} failed: ${body.code} ${body.msg}`);
  return body.data || {};
}

// Find or create the previews folder under the shared-assets folder — the
// parent is already shared with the team, so the subfolder inherits access.
async function ensurePreviewFolder() {
  let pageToken = "";
  for (;;) {
    const query = new URLSearchParams({ folder_token: PARENT_FOLDER, page_size: "200" });
    if (pageToken) query.set("page_token", pageToken);
    const data = await feishuJson(`/open-apis/drive/v1/files?${query}`);
    for (const f of data.files || []) {
      if (f.type === "folder" && f.name === FOLDER_NAME) return f.token;
    }
    if (!data.has_more || !data.next_page_token) break;
    pageToken = data.next_page_token;
  }
  if (DRY) return "(would create)";
  const created = await feishuJson("/open-apis/drive/v1/files/create_folder", {
    method: "POST",
    body: JSON.stringify({ name: FOLDER_NAME, folder_token: PARENT_FOLDER }),
  });
  return created.token;
}

async function uploadProxyToFeishu(filePath, folderToken) {
  const size = statSync(filePath).size;
  const name = basename(filePath);
  if (size <= 18 * 1024 * 1024) {
    const form = new FormData();
    form.set("file_name", name);
    form.set("parent_type", "explorer");
    form.set("parent_node", folderToken);
    form.set("size", String(size));
    form.set("file", new Blob([readFileSync(filePath)], { type: "video/mp4" }), name);
    const data = await feishuForm("/open-apis/drive/v1/files/upload_all", form);
    return data.file_token;
  }
  // multipart: prepare -> parts (Feishu dictates block size) -> finish
  const plan = await feishuJson("/open-apis/drive/v1/files/upload_prepare", {
    method: "POST",
    body: JSON.stringify({
      file_name: name, parent_type: "explorer", parent_node: folderToken, size,
    }),
  });
  const fd = openSync(filePath, "r");
  try {
    for (let seq = 0; seq < plan.block_num; seq += 1) {
      const offset = seq * plan.block_size;
      const bytes = Math.min(plan.block_size, size - offset);
      const buffer = Buffer.allocUnsafe(bytes);
      readSync(fd, buffer, 0, bytes, offset);
      const form = new FormData();
      form.set("upload_id", plan.upload_id);
      form.set("seq", String(seq));
      form.set("size", String(bytes));
      form.set("file", new Blob([new Uint8Array(buffer)], { type: "video/mp4" }), `part-${seq}`);
      await feishuForm("/open-apis/drive/v1/files/upload_part", form);
    }
  } finally {
    closeSync(fd);
  }
  const done = await feishuJson("/open-apis/drive/v1/files/upload_finish", {
    method: "POST",
    body: JSON.stringify({ upload_id: plan.upload_id, block_num: plan.block_num }),
  });
  return done.file_token;
}

/* --------------------------------- COS ----------------------------------- */

async function cosObjectSize(key) {
  const res = await cos({ method: "HEAD", host: HOST, pathname: `/${key}` });
  return res.status === 200 ? Number(res.headers.get("content-length")) : -1;
}

async function archiveToCos(filePath, key) {
  const size = statSync(filePath).size;
  if ((await cosObjectSize(key)) === size) return "already-archived";
  const init = await cos({ method: "POST", host: HOST, pathname: `/${key}`, params: { uploads: "" } });
  const initXml = await init.text();
  const uploadId = initXml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
  if (!uploadId) throw new Error(`COS multipart init failed ${init.status}`);
  const partCount = Math.ceil(size / PART_SIZE);
  const etags = [];
  const fd = openSync(filePath, "r");
  try {
    for (let part = 1; part <= partCount; part += 1) {
      const offset = (part - 1) * PART_SIZE;
      const bytes = Math.min(PART_SIZE, size - offset);
      const buffer = Buffer.allocUnsafe(bytes);
      readSync(fd, buffer, 0, bytes, offset);
      let lastError;
      for (let attempt = 1; attempt <= 6; attempt += 1) {
        try {
          const res = await cos({
            method: "PUT", host: HOST, pathname: `/${key}`,
            params: { partNumber: String(part), uploadId },
            body: buffer, signal: AbortSignal.timeout(10 * 60 * 1000),
          });
          if (res.status !== 200) throw new Error(`part ${part} status ${res.status}`);
          etags[part] = res.headers.get("etag");
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          await new Promise((r) => setTimeout(r, 4000 * attempt));
        }
      }
      if (lastError) throw lastError;
      if (part % 25 === 0 || part === partCount) {
        console.log(`    cos: part ${part}/${partCount}`);
      }
    }
  } finally {
    closeSync(fd);
  }
  const completeBody =
    "<CompleteMultipartUpload>" +
    etags.map((etag, i) => (etag ? `<Part><PartNumber>${i}</PartNumber><ETag>${etag}</ETag></Part>` : ""))
      .join("") +
    "</CompleteMultipartUpload>";
  const fin = await cos({
    method: "POST", host: HOST, pathname: `/${key}`, params: { uploadId },
    body: completeBody, extraHeaders: { "content-type": "application/xml" },
  });
  if (fin.status !== 200) throw new Error(`COS completion failed ${fin.status}`);
  if ((await cosObjectSize(key)) !== size) throw new Error("COS post-upload size mismatch");
  return "archived";
}

/* -------------------------------- proxy ---------------------------------- */

function makeProxy(filePath, outPath) {
  if (existsSync(outPath) && statSync(outPath).size > 100_000) return "exists";
  // 720p cap either orientation, never upscale; 30fps cap; small but watchable.
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-i", filePath,
    "-vf", "scale=ceil(iw*min(1\\,min(1280/iw\\,720/ih))/2)*2:ceil(ih*min(1\\,min(1280/iw\\,720/ih))/2)*2,fps=30",
    "-c:v", "libx264", "-crf", "28", "-preset", "veryfast", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart",
    outPath,
  ]);
  return "made";
}

/* --------------------------------- run ------------------------------------ */

const VIDEO_EXT = /\.(mp4|mov|m4v)$/i;
const files = readdirSync(SRC)
  .filter((f) => VIDEO_EXT.test(f))
  .map((f) => ({ name: f, path: join(SRC, f), size: statSync(join(SRC, f)).size }))
  .sort((a, b) => a.name.localeCompare(b.name));

console.log(`source: ${SRC} — ${files.length} videos, ${fmtMB(files.reduce((s, f) => s + f.size, 0))}`);
console.log(`cos endpoint: ${HOST}${ACCELERATE ? " (ACCELERATED — costs per GB)" : " (regional, free)"}`);
if (!files.length) {
  console.log("Nothing to do — drop phone videos into the source folder and re-run.");
  process.exit(0);
}

const month = new Date().toISOString().slice(0, 7);
const folderToken = await ensurePreviewFolder();
console.log(`feishu folder: ${FOLDER_NAME} (${folderToken})`);

let ok = 0, failed = 0;
for (const file of files) {
  const entry = (manifest[file.name] ||= {});
  const key = `phone-archive/${month}/${file.name}`;
  const proxyPath = join(PROXY_DIR, `${basename(file.name, extname(file.name))}_720p.mp4`);
  console.log(`\n${file.name} (${fmtMB(file.size)})`);
  if (DRY) {
    console.log(`  would archive -> cos:${key}${entry.cosDone ? " (done)" : ""}`);
    console.log(`  would proxy   -> ${basename(proxyPath)}${entry.proxyDone ? " (done)" : ""}`);
    console.log(`  would upload  -> Feishu/${FOLDER_NAME}${entry.feishuToken ? " (done)" : ""}`);
    continue;
  }
  try {
    if (!entry.cosDone) {
      const result = await archiveToCos(file.path, key);
      entry.cosDone = key;
      saveManifest();
      console.log(`  cos: ${result}`);
    } else console.log("  cos: done (manifest)");

    if (!entry.proxyDone || !existsSync(proxyPath)) {
      const result = makeProxy(file.path, proxyPath);
      entry.proxyDone = basename(proxyPath);
      saveManifest();
      console.log(`  proxy: ${result} (${fmtMB(statSync(proxyPath).size)})`);
    } else console.log("  proxy: done (manifest)");

    if (!entry.feishuToken) {
      entry.feishuToken = await uploadProxyToFeishu(proxyPath, folderToken);
      saveManifest();
      console.log(`  feishu: uploaded (${entry.feishuToken})`);
    } else console.log("  feishu: done (manifest)");
    ok += 1;
  } catch (error) {
    failed += 1;
    console.log(`  FAIL: ${error.message}`);
  }
}

console.log(`\nDONE: ${ok} complete, ${failed} failed${DRY ? " (dry run)" : ""}`);
if (failed) process.exitCode = 1;
