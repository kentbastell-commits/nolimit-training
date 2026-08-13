// Archive Osmo Pocket 3 originals (MP4 + WAV audio) from the SD card into
// Tencent COS, organized footage/<date>/<filename>. Resumable: re-running
// skips anything already in the bucket (verified by size). Parallel parts
// keep the Thailand->China link saturated.
import { statSync, openSync, readSync, closeSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cos } from "./cos.mjs";

const SRC = "E:\\DCIM";
const CUTOFF = new Date("2026-08-08T00:00:00+07:00").getTime();
// ENDPOINT CHOICE = A REAL BILL. Acceleration is charged per GB (~¥1.25/GB
// measured: the first 52 GB archive cost ¥65, essentially all of it
// acceleration — storage itself was covered by the free 1 TB package).
//
//   inside mainland China -> regional, fast AND free of the per-GB fee
//   outside China         -> regional is 0.03 MB/s (unusable), so pay for
//                            acceleration with --accelerate
//
// Enabling acceleration on the bucket costs nothing; only USING the
// accelerate hostname bills. Default is therefore regional.
const BUCKET = "nxlimit-footage-1454208796";
const ACCELERATE = process.argv.includes("--accelerate");
const HOST = ACCELERATE
  ? `${BUCKET}.cos.accelerate.myqcloud.com`
  : `${BUCKET}.cos.ap-guangzhou.myqcloud.com`;
console.log(
  ACCELERATE
    ? "endpoint: GLOBAL ACCELERATION (~¥1.25/GB — use only from outside China)"
    : "endpoint: ap-guangzhou direct (no per-GB fee; near-unusable from outside China — add --accelerate there)"
);
const PREFIX = "footage/";
const PART_SIZE = 8 * 1024 * 1024;
const PART_CONCURRENCY = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listExisting() {
  const found = new Map();
  let marker = "";
  for (;;) {
    const params = { prefix: PREFIX, "max-keys": "1000" };
    if (marker) params.marker = marker;
    const res = await cos({ host: HOST, params });
    const xml = await res.text();
    if (res.status !== 200) throw new Error(`list failed ${res.status}: ${xml.slice(0, 200)}`);
    for (const m of xml.matchAll(/<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Contents>/g)) {
      found.set(m[1], Number(m[2]));
    }
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
    const next = xml.match(/<NextMarker>([^<]+)<\/NextMarker>/);
    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
    marker = next ? next[1] : keys[keys.length - 1];
    if (!marker) break;
  }
  return found;
}

async function uploadPart(key, uploadId, partNumber, chunk) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await cos({
        method: "PUT",
        host: HOST,
        pathname: `/${key}`,
        params: { partNumber: String(partNumber), uploadId },
        body: chunk,
      });
      if (res.status !== 200) {
        throw new Error(`part ${partNumber} status ${res.status}: ${(await res.text()).slice(0, 120)}`);
      }
      const etag = res.headers.get("etag");
      if (!etag) throw new Error(`part ${partNumber}: no ETag`);
      return etag;
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(3000 * attempt);
    }
  }
}

async function uploadFile(path, key, size) {
  // small files: single PUT
  if (size <= PART_SIZE) {
    const fd = openSync(path, "r");
    const buffer = Buffer.alloc(size);
    readSync(fd, buffer, 0, size, 0);
    closeSync(fd);
    const res = await cos({ method: "PUT", host: HOST, pathname: `/${key}`, body: buffer });
    if (res.status !== 200) throw new Error(`put ${res.status}: ${(await res.text()).slice(0, 150)}`);
    return;
  }

  const initRes = await cos({ method: "POST", host: HOST, pathname: `/${key}`, params: { uploads: "" } });
  const initXml = await initRes.text();
  const uploadId = initXml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
  if (!uploadId) throw new Error(`init failed ${initRes.status}: ${initXml.slice(0, 200)}`);

  const partCount = Math.ceil(size / PART_SIZE);
  const etags = new Array(partCount);
  const fd = openSync(path, "r");
  try {
    let next = 0;
    const workers = Array.from({ length: Math.min(PART_CONCURRENCY, partCount) }, async () => {
      for (;;) {
        const index = next++;
        if (index >= partCount) return;
        const offset = index * PART_SIZE;
        const bytes = Math.min(PART_SIZE, size - offset);
        const buffer = Buffer.alloc(bytes);
        readSync(fd, buffer, 0, bytes, offset);
        etags[index] = await uploadPart(key, uploadId, index + 1, buffer);
      }
    });
    await Promise.all(workers);
  } catch (error) {
    await cos({ method: "DELETE", host: HOST, pathname: `/${key}`, params: { uploadId } }).catch(() => {});
    throw error;
  } finally {
    closeSync(fd);
  }

  const body =
    "<CompleteMultipartUpload>" +
    etags.map((etag, i) => `<Part><PartNumber>${i + 1}</PartNumber><ETag>${etag}</ETag></Part>`).join("") +
    "</CompleteMultipartUpload>";
  const done = await cos({
    method: "POST",
    host: HOST,
    pathname: `/${key}`,
    params: { uploadId },
    body,
    extraHeaders: { "content-type": "application/xml" },
  });
  const doneXml = await done.text();
  if (done.status !== 200 || /<Error>/.test(doneXml)) {
    throw new Error(`complete failed ${done.status}: ${doneXml.slice(0, 200)}`);
  }
}

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
  .filter((p) => /\.(MP4|WAV)$/i.test(p))
  .map((p) => ({ path: p, stat: statSync(p) }))
  .filter((f) => f.stat.mtimeMs >= CUTOFF)
  .sort((a, b) => a.path.localeCompare(b.path));

const totalGb = files.reduce((s, f) => s + f.stat.size, 0) / 1073741824;
console.log(`${files.length} files, ${totalGb.toFixed(1)} GB to archive`);

const existing = await listExisting();
console.log(`${existing.size} objects already in the bucket`);

let ok = 0, skipped = 0, failed = 0;
const failures = [];
const started = Date.now();
let bytesDone = 0;

for (const f of files) {
  const name = f.path.split(/[\\/]/).pop();
  const m = name.match(/DJI_(\d{4})(\d{2})(\d{2})/);
  const date = m ? `${m[1]}-${m[2]}-${m[3]}` : new Date(f.stat.mtimeMs).toISOString().slice(0, 10);
  const key = `${PREFIX}${date}/${name}`;

  if (existing.get(key) === f.stat.size) {
    skipped++;
    continue;
  }

  const mb = (f.stat.size / 1048576).toFixed(0);
  const t0 = Date.now();
  try {
    await uploadFile(f.path, key, f.stat.size);
    ok++;
    bytesDone += f.stat.size;
    const secs = (Date.now() - t0) / 1000;
    const rate = f.stat.size / 1048576 / secs;
    const elapsed = (Date.now() - started) / 1000;
    const remaining = files.length - ok - skipped - failed;
    console.log(
      `ok: ${key} (${mb} MB, ${secs.toFixed(0)}s, ${rate.toFixed(1)} MB/s) ` +
      `[${ok + skipped}/${files.length}] ~${((elapsed / Math.max(ok, 1)) * remaining / 60).toFixed(0)} min left`
    );
  } catch (error) {
    failed++;
    failures.push(name);
    console.log(`FAIL: ${key} (${mb} MB): ${error.message}`);
  }
}

console.log(`\nDONE: ${ok} archived, ${skipped} already there, ${failed} failed`);
if (failures.length) console.log("failed:", failures.join(", "));
