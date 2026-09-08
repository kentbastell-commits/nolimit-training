// Upload the approved 9:16 and 16:9 exercise-library masters to Tencent COS.
// Defaults to the ap-guangzhou regional endpoint (no per-GB fee, fast from
// inside China, ~unusable from outside it). Pass --accelerate to opt into
// the global-acceleration endpoint instead (~¥1.25/GB, billed on every byte
// transferred) when uploading from outside China — same tradeoff as
// archive-to-cos.mjs. Acceleration is never the default; it must be asked
// for explicitly, on every run.
//
// Completed objects are skipped by exact byte size. In-progress multipart
// uploads are recorded locally and resumed part-by-part after an interruption
// (state is keyed to the endpoint used, so switching --accelerate mid-run
// is refused rather than silently mixed).
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { cos } from "./cos.mjs";

const BUCKET = "nxlimit-footage-1454208796";
const ACCELERATE = process.argv.includes("--accelerate");
const HOST = ACCELERATE
  ? `${BUCKET}.cos.accelerate.myqcloud.com`
  : `${BUCKET}.cos.ap-guangzhou.myqcloud.com`;
const PREFIX = "deliverables/2026-08-08";
const FOOTAGE_ROOT = "C:\\Users\\kentb\\Videos\\nolimit-footage";
const LIBRARIES = ["9x16", "16x9"];
const PART_SIZE = 1 * 1024 * 1024;
const PART_CONCURRENCY = 4;
const PART_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_PART_ATTEMPTS = 12;
const DRY_RUN = process.argv.includes("--dry-run");
const LOG_ROOT = resolve("logs");
const STATE_PATH = join(LOG_ROOT, "cos-deliverables-regional-state.json");

mkdirSync(LOG_ROOT, { recursive: true });

const decodeXml = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const formatBytes = (bytes) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MiB`;
  return `${(bytes / 1024).toFixed(1)} KiB`;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
  const total = Math.round(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { version: 1, host: HOST, prefix: PREFIX, uploads: {} };
  }
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    if (parsed.host !== HOST || parsed.prefix !== PREFIX) {
      throw new Error("state endpoint or prefix does not match this uploader");
    }
    parsed.uploads ||= {};
    return parsed;
  } catch (error) {
    throw new Error(`Cannot read resumable state ${STATE_PATH}: ${error.message}`);
  }
}

const state = loadState();

function saveState() {
  const temporary = `${STATE_PATH}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  // Called after every part (PART_CONCURRENCY writers can land back-to-back
  // within the same tick), and on Windows an external file-locker (AV,
  // indexer, cloud sync) can transiently hold the destination path open at
  // that exact moment — renameSync then throws EPERM even though nothing
  // about the upload itself failed. Observed: 8 of 188 files falsely
  // reported FAILED this way in one run, each still fully uploaded to COS.
  // Short synchronous retry clears it without slowing the common case.
  for (let attempt = 1; ; attempt += 1) {
    try {
      renameSync(temporary, STATE_PATH);
      return;
    } catch (error) {
      if (error?.code !== "EPERM" || attempt >= 5) throw error;
      const until = Date.now() + 50 * attempt;
      while (Date.now() < until) {
        /* brief synchronous busy-wait; fs has no sync sleep */
      }
    }
  }
}

function collectFiles() {
  const files = [];
  for (const format of LIBRARIES) {
    const directory = join(FOOTAGE_ROOT, format);
    for (const name of readdirSync(directory)) {
      if (!name.toLowerCase().endsWith(".mp4")) continue;
      const path = join(directory, name);
      const stats = statSync(path);
      files.push({
        format,
        name,
        path,
        key: `${PREFIX}/${format}/${name}`,
        size: stats.size,
        mtimeMs: stats.mtimeMs,
      });
    }
  }
  return files.sort((a, b) => {
    const formatOrder = LIBRARIES.indexOf(a.format) - LIBRARIES.indexOf(b.format);
    return formatOrder || a.name.localeCompare(b.name);
  });
}

async function listExisting() {
  const found = new Map();
  let marker = "";
  for (;;) {
    const params = { prefix: `${PREFIX}/`, "max-keys": "1000" };
    if (marker) params.marker = marker;
    const res = await cos({ host: HOST, params });
    const xml = await res.text();
    if (res.status !== 200) {
      throw new Error(`COS listing failed ${res.status}: ${xml.slice(0, 200)}`);
    }
    for (const match of xml.matchAll(
      /<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Contents>/g,
    )) {
      found.set(decodeXml(match[1]), Number(match[2]));
    }
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
    const next = xml.match(/<NextMarker>([^<]+)<\/NextMarker>/);
    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((match) => decodeXml(match[1]));
    marker = next ? decodeXml(next[1]) : keys.at(-1);
    if (!marker) break;
  }
  return found;
}

async function initializeMultipart(file) {
  const res = await cos({
    method: "POST",
    host: HOST,
    pathname: `/${file.key}`,
    params: { uploads: "" },
  });
  const xml = await res.text();
  const uploadId = xml.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
  if (res.status !== 200 || !uploadId) {
    throw new Error(`multipart initialization failed ${res.status}: ${xml.slice(0, 200)}`);
  }
  return uploadId;
}

async function abortMultipart(key, uploadId) {
  await cos({
    method: "DELETE",
    host: HOST,
    pathname: `/${key}`,
    params: { uploadId },
  }).catch(() => {});
}

async function listRemoteParts(key, uploadId) {
  const res = await cos({
    host: HOST,
    pathname: `/${key}`,
    params: { uploadId, "max-parts": "1000" },
  });
  const xml = await res.text();
  if (res.status === 404 || /<Code>NoSuchUpload<\/Code>/.test(xml)) return null;
  if (res.status !== 200) {
    throw new Error(`part listing failed ${res.status}: ${xml.slice(0, 200)}`);
  }
  const parts = {};
  for (const match of xml.matchAll(
    /<Part>[\s\S]*?<PartNumber>(\d+)<\/PartNumber>[\s\S]*?<ETag>([^<]+)<\/ETag>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Part>/g,
  )) {
    parts[Number(match[1])] = { etag: decodeXml(match[2]), size: Number(match[3]) };
  }
  return parts;
}

async function prepareMultipart(file) {
  let record = state.uploads[file.key];
  if (record && (record.size !== file.size || Math.abs(record.mtimeMs - file.mtimeMs) > 1)) {
    await abortMultipart(file.key, record.uploadId);
    delete state.uploads[file.key];
    saveState();
    record = null;
  }

  if (record) {
    const remoteParts = await listRemoteParts(file.key, record.uploadId);
    if (remoteParts) {
      record.parts = remoteParts;
      saveState();
      return record;
    }
    delete state.uploads[file.key];
    saveState();
  }

  record = {
    uploadId: await initializeMultipart(file),
    path: file.path,
    size: file.size,
    mtimeMs: file.mtimeMs,
    parts: {},
  };
  state.uploads[file.key] = record;
  saveState();
  return record;
}

async function putPart(file, record, partNumber, buffer) {
  for (let attempt = 1; attempt <= MAX_PART_ATTEMPTS; attempt += 1) {
    const started = Date.now();
    try {
      const res = await cos({
        method: "PUT",
        host: HOST,
        pathname: `/${file.key}`,
        params: { partNumber: String(partNumber), uploadId: record.uploadId },
        body: buffer,
        signal: AbortSignal.timeout(PART_TIMEOUT_MS),
      });
      if (res.status !== 200) {
        throw new Error(`status ${res.status}: ${(await res.text()).slice(0, 160)}`);
      }
      const etag = res.headers.get("etag");
      if (!etag) throw new Error("COS did not return an ETag");
      return { etag, seconds: (Date.now() - started) / 1000 };
    } catch (error) {
      if (attempt === MAX_PART_ATTEMPTS) throw error;
      const delay = Math.min(60_000, 5_000 * attempt);
      console.log(
        `retry: ${file.format}/${file.name} part ${partNumber}, attempt ${attempt + 1}/${MAX_PART_ATTEMPTS} ` +
          `after ${Math.round(delay / 1000)}s (${error.message})`,
      );
      await sleep(delay);
    }
  }
  throw new Error("unreachable part retry state");
}

async function completeMultipart(file, record, partCount) {
  const body =
    "<CompleteMultipartUpload>" +
    Array.from({ length: partCount }, (_, index) => {
      const etag = record.parts[index + 1]?.etag;
      if (!etag) throw new Error(`missing ETag for part ${index + 1}`);
      return `<Part><PartNumber>${index + 1}</PartNumber><ETag>${escapeXml(etag)}</ETag></Part>`;
    }).join("") +
    "</CompleteMultipartUpload>";
  const res = await cos({
    method: "POST",
    host: HOST,
    pathname: `/${file.key}`,
    params: { uploadId: record.uploadId },
    body,
    extraHeaders: { "content-type": "application/xml" },
  });
  const xml = await res.text();
  if (res.status !== 200 || /<Error>/.test(xml)) {
    throw new Error(`multipart completion failed ${res.status}: ${xml.slice(0, 200)}`);
  }

  const head = await cos({ method: "HEAD", host: HOST, pathname: `/${file.key}` });
  const remoteSize = Number(head.headers.get("content-length"));
  if (head.status !== 200 || remoteSize !== file.size) {
    throw new Error(`post-upload size verification failed: status=${head.status}, size=${remoteSize}`);
  }
}

const files = collectFiles();
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
console.log("COS deliverables uploader");
console.log(`endpoint: ${HOST}`);
console.log(
  ACCELERATE
    ? "acceleration: ENABLED (~¥1.25/GB, billed on every byte transferred)"
    : "acceleration: disabled (regional endpoint — no per-GB fee)",
);
console.log(`destination: ${PREFIX}/{9x16,16x9}/`);
console.log(`local: ${files.length} MP4 files, ${formatBytes(totalBytes)}`);
console.log(`multipart: ${formatBytes(PART_SIZE)} parts, concurrency ${PART_CONCURRENCY}`);

const existing = await listExisting();
const pending = files.filter((file) => existing.get(file.key) !== file.size);
const skipped = files.length - pending.length;
const pendingBytes = pending.reduce((sum, file) => sum + file.size, 0);
console.log(`remote: ${existing.size} objects under destination, ${skipped} exact-size files already complete`);
console.log(`pending: ${pending.length} files, ${formatBytes(pendingBytes)}`);

if (DRY_RUN) {
  console.log("dry-run: no objects uploaded");
  process.exit(0);
}

const runStarted = Date.now();
let uploadedThisRun = 0;
let completedFiles = skipped;
let failedFiles = 0;
let didRegionalProbe = false;

function logProgress(file, partNumber, partBytes, partSeconds, label = "part") {
  uploadedThisRun += partBytes;
  const elapsed = Math.max(0.001, (Date.now() - runStarted) / 1000);
  const averageBytesPerSecond = uploadedThisRun / elapsed;
  const remainingBytes = Math.max(0, pendingBytes - uploadedThisRun);
  const partRate = partBytes / Math.max(0.001, partSeconds);
  console.log(
    `${label}: ${file.format}/${file.name} part ${partNumber} ` +
      `(${formatBytes(partBytes)} in ${partSeconds.toFixed(1)}s, ${(partRate / 1024).toFixed(1)} KiB/s); ` +
      `run ${(averageBytesPerSecond / 1024).toFixed(1)} KiB/s, ` +
      `${formatBytes(uploadedThisRun)}/${formatBytes(pendingBytes)}, ` +
      `ETA ${formatDuration(remainingBytes / averageBytesPerSecond)}`,
  );
}

for (const file of pending) {
  console.log(`start: ${file.format}/${file.name} (${formatBytes(file.size)})`);
  try {
    const record = await prepareMultipart(file);
    const partCount = Math.ceil(file.size / PART_SIZE);
    const missing = [];
    for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
      if (!record.parts[partNumber]) missing.push(partNumber);
    }

    const fd = openSync(file.path, "r");
    try {
      const uploadOne = async (partNumber, label = "part") => {
        const offset = (partNumber - 1) * PART_SIZE;
        const bytes = Math.min(PART_SIZE, file.size - offset);
        const buffer = Buffer.allocUnsafe(bytes);
        const read = readSync(fd, buffer, 0, bytes, offset);
        if (read !== bytes) throw new Error(`short local read for part ${partNumber}: ${read}/${bytes}`);
        const result = await putPart(file, record, partNumber, buffer);
        record.parts[partNumber] = { etag: result.etag, size: bytes };
        saveState();
        logProgress(file, partNumber, bytes, result.seconds, label);
      };

      if (!didRegionalProbe && missing.length) {
        const probePart = missing.shift();
        await uploadOne(probePart, ACCELERATE ? "accelerate-probe" : "regional-probe");
        didRegionalProbe = true;
      }

      let next = 0;
      const workers = Array.from(
        { length: Math.min(PART_CONCURRENCY, missing.length) },
        async () => {
          for (;;) {
            const index = next;
            next += 1;
            if (index >= missing.length) return;
            await uploadOne(missing[index]);
          }
        },
      );
      await Promise.all(workers);
    } finally {
      closeSync(fd);
    }

    await completeMultipart(file, record, partCount);
    delete state.uploads[file.key];
    saveState();
    completedFiles += 1;
    console.log(`complete: ${file.key} [${completedFiles}/${files.length}]`);
  } catch (error) {
    failedFiles += 1;
    console.log(`FAIL: ${file.key}: ${error.message}`);
  }
}

console.log(
  `DONE: ${completedFiles}/${files.length} complete, ${failedFiles} failed; ` +
    `state=${basename(STATE_PATH)}`,
);
if (failedFiles) process.exitCode = 1;
