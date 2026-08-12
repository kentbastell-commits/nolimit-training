// Batch-import Osmo Pocket 3 footage (MP4s modified >= 2026-08-08) from the
// SD card into Feishu "02 Content", organized by shooting date. Resumable:
// re-running skips files that already exist in the target folder. Every part
// upload retries on transient failures (including HTML error pages).
import { statSync, openSync, readSync, closeSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "E:\\DCIM";
const CUTOFF = new Date("2026-08-08T00:00:00+07:00").getTime();
const CONTENT_FOLDER = "HWoxfxqWElOIurdZNqhcwEDsnpv".length ? "HWoxfVNuKlI6jldOiLNccKzCnye" : "";
const BATCH_FOLDER_NAME = "拍摄预览 Proxy Preview 2026-08";

const appId = process.env.FEISHU_ADMIN_APP_ID;
const secret = process.env.FEISHU_ADMIN_APP_SECRET;

let tenantToken = "";
let tokenExpiry = 0;
async function token() {
  if (tenantToken && Date.now() < tokenExpiry) return tenantToken;
  const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: secret }),
  });
  const body = await res.json();
  tenantToken = body.tenant_access_token;
  tokenExpiry = Date.now() + 90 * 60_000;
  if (!tenantToken) throw new Error("token fetch failed: " + JSON.stringify(body));
  return tenantToken;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// JSON fetch with retries; survives HTML gateway pages and 1254607 throttles.
async function api(path, init = {}, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(`https://open.feishu.cn${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${await token()}`, ...(init.headers || {}) },
      });
      const text = await res.text();
      let body;
      try { body = JSON.parse(text); } catch {
        throw new Error(`non-JSON response (${res.status}): ${text.slice(0, 80)}`);
      }
      if (body.code === 1254607 || body.code === 99991400) {
        throw new Error(`throttled code ${body.code}`);
      }
      return body;
    } catch (error) {
      if (attempt === tries) throw error;
      await sleep(3000 * attempt);
    }
  }
}

async function listFolder(folderToken) {
  const out = new Map();
  let pageToken = "";
  do {
    const body = await api(`/open-apis/drive/v1/files?page_size=200&folder_token=${folderToken}${pageToken ? `&page_token=${pageToken}` : ""}`);
    if (body.code !== 0) throw new Error(`list failed: ${body.code} ${body.msg}`);
    for (const f of body.data?.files || []) out.set(f.name, f);
    pageToken = body.data?.has_more ? body.data?.next_page_token : "";
  } while (pageToken);
  return out;
}

async function ensureFolder(parent, name) {
  const existing = await listFolder(parent);
  const hit = existing.get(name);
  if (hit && hit.type === "folder") return hit.token;
  const body = await api("/open-apis/drive/v1/files/create_folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, folder_token: parent }),
  });
  if (body.code !== 0) throw new Error(`create_folder ${name}: ${body.code} ${body.msg}`);
  return body.data.token;
}

async function uploadFile(path, name, folderToken) {
  const size = statSync(path).size;
  const prep = await api("/open-apis/drive/v1/files/upload_prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_name: name, parent_type: "explorer", parent_node: folderToken, size }),
  });
  if (prep.code !== 0) throw new Error(`prepare: ${prep.code} ${prep.msg}`);
  const { upload_id, block_size, block_num } = prep.data;
  const CONCURRENCY = 6; // parallel parts hide the Thailand->China round trip
  const fd = openSync(path, "r");
  try {
    const uploadPart = async (seq) => {
      const buffer = Buffer.alloc(block_size);
      const bytes = readSync(fd, buffer, 0, block_size, seq * block_size);
      const chunk = Buffer.from(buffer.subarray(0, bytes));
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const form = new FormData();
          form.append("upload_id", upload_id);
          form.append("seq", String(seq));
          form.append("size", String(bytes));
          form.append("file", new Blob([chunk]));
          const res = await fetch("https://open.feishu.cn/open-apis/drive/v1/files/upload_part", {
            method: "POST",
            headers: { Authorization: `Bearer ${await token()}` },
            body: form,
          });
          const text = await res.text();
          const body = JSON.parse(text);
          if (body.code !== 0) throw new Error(`part ${seq}: ${body.code} ${body.msg}`);
          return;
        } catch (error) {
          if (attempt === 4) throw error;
          await sleep(4000 * attempt);
        }
      }
    };
    let next = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, block_num) }, async () => {
      while (true) {
        const seq = next++;
        if (seq >= block_num) return;
        await uploadPart(seq);
      }
    });
    await Promise.all(workers);
  } finally {
    closeSync(fd);
  }
  const fin = await api("/open-apis/drive/v1/files/upload_finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upload_id, block_num }),
  });
  if (fin.code !== 0) throw new Error(`finish: ${fin.code} ${fin.msg}`);
  return fin.data?.file_token;
}

// gather files
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(SRC)
  .filter((p) => p.toUpperCase().endsWith(".LRF"))
  .map((p) => ({ path: p, stat: statSync(p) }))
  .filter((f) => f.stat.mtimeMs >= CUTOFF)
  .sort((a, b) => a.path.localeCompare(b.path));

const totalGb = files.reduce((s, f) => s + f.stat.size, 0) / 1073741824;
console.log(`${files.length} MP4s, ${totalGb.toFixed(1)} GB to import`);

const batchRoot = await ensureFolder(CONTENT_FOLDER, BATCH_FOLDER_NAME);
console.log("batch folder:", batchRoot);

// group by date from DJI filename (DJI_YYYYMMDDHHMMSS_...)
const byDate = new Map();
for (const f of files) {
  const m = f.path.match(/DJI_(\d{4})(\d{2})(\d{2})/);
  const date = m ? `${m[1]}-${m[2]}-${m[3]}` : new Date(f.stat.mtimeMs).toISOString().slice(0, 10);
  if (!byDate.has(date)) byDate.set(date, []);
  byDate.get(date).push(f);
}

let ok = 0, skipped = 0, failed = 0;
const failures = [];
for (const [date, group] of [...byDate.entries()].sort()) {
  const dateFolder = await ensureFolder(batchRoot, date);
  const existing = await listFolder(dateFolder);
  console.log(`\n=== ${date}: ${group.length} files -> ${dateFolder}`);
  for (const f of group) {
    const name = f.path.split(/[\\/]/).pop().replace(/\.LRF$/i, "_preview.mp4");
    if (existing.has(name)) { skipped++; console.log(`skip (exists): ${name}`); continue; }
    const mb = (f.stat.size / 1048576).toFixed(0);
    const started = Date.now();
    try {
      await uploadFile(f.path, name, dateFolder);
      ok++;
      console.log(`ok: ${name} (${mb} MB, ${((Date.now() - started) / 1000).toFixed(0)}s) [${ok + skipped}/${files.length}]`);
    } catch (error) {
      failed++;
      failures.push(name);
      console.log(`FAIL: ${name} (${mb} MB): ${error.message}`);
      if (/quota|capacity|storage|1061043|1062506/i.test(error.message)) {
        console.log("STORAGE-QUOTA-LIKE ERROR — stopping the batch.");
        break;
      }
    }
  }
}
console.log(`\nDONE: ${ok} uploaded, ${skipped} skipped (already there), ${failed} failed`);
if (failures.length) console.log("failed files:", failures.join(", "));
