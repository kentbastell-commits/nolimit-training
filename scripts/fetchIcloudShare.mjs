// Download the video(s) behind an iCloud "Shared Link" (share.icloud.com/photos/…)
// the way the iCloud web app does: load the page headless, capture the
// CloudKit record responses it fetches (they carry signed icloud-content
// download URLs), and save the original files.
//
//   node scripts/fetchIcloudShare.mjs "https://share.icloud.com/photos/<id>" [--out <dir>]
//
// Why not the public CloudKit API directly: records/query needs the web app's
// publicAccessAuth handshake (401 "no auth method found" without it), and the
// page does that for us. Playwright comes from this repo's node_modules.
//
// Typical use (2026-09-20): Kent shares a clip from his phone while abroad,
// this pulls the 4K original, then `scripts/relayUploadViaCos.mjs` (after an
// ffmpeg 720p compress) puts it on the server without the throttled link.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const link = process.argv[2];
if (!/share\.icloud\.com\/photos\//.test(link || "")) {
  console.error('usage: node scripts/fetchIcloudShare.mjs "https://share.icloud.com/photos/<id>" [--out <dir>]');
  process.exit(1);
}
const outIdx = process.argv.indexOf("--out");
const outDir = outIdx > 0 ? process.argv[outIdx + 1] : join(process.env.TEMP || ".", "icloud-share");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const records = [];
page.on("response", async (r) => {
  if (/records\/(query|lookup)/.test(r.url())) {
    try {
      const j = await r.json();
      for (const rec of j.records || []) records.push(rec);
    } catch {
      /* not JSON */
    }
  }
});
await page.goto(link, { waitUntil: "domcontentloaded" });
// The web app resolves the share, queries the zone, then looks up assets.
await page.waitForTimeout(15000);
await browser.close();

// CPLMaster carries the original (resOriginalRes); videos are QuickTime/MPEG-4.
const masters = records.filter((r) => r.recordType === "CPLMaster");
if (!masters.length) {
  console.error(`No assets found (records seen: ${[...new Set(records.map((r) => r.recordType))].join(",") || "none"}). Is the link still shared?`);
  process.exit(1);
}
let n = 0;
for (const m of masters) {
  const f = m.fields || {};
  const res = f.resOriginalRes?.value;
  if (!res?.downloadURL) continue;
  const type = String(f.resOriginalFileType?.value || "");
  const isVideo = /quicktime|mpeg-4|video/i.test(type);
  const ext = /quicktime/i.test(type) ? ".mov" : isVideo ? ".mp4" : /heic/i.test(type) ? ".heic" : ".jpg";
  const nameEnc = f.filenameEnc?.value;
  const name = (nameEnc ? Buffer.from(nameEnc, "base64").toString("utf8").replace(/\.[^.]+$/, "") : `asset-${++n}`) + ext;
  const url = res.downloadURL.replace("${f}", encodeURIComponent(name));
  const r = await fetch(url);
  if (r.status !== 200) {
    console.error(`  ${name}: download failed ${r.status}`);
    continue;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  const path = join(outDir, name);
  writeFileSync(path, buf);
  console.log(`${isVideo ? "video" : "photo"}  ${(buf.length / 1048576).toFixed(1)} MB  ${path}`);
}
