// Pull every original from the COS footage archive to a local working dir so
// crops/re-edits are free after the one-time accelerate download. Resumable:
// re-running skips files whose local size matches the archive. Keeps the
// archive's "<Name>__<clipId>.MP4" names so every edit stays traceable.
//
//   node --env-file=.env.local scripts/footage/download-originals.mjs [destDir]
import { createWriteStream, existsSync, mkdirSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { join, dirname } from "node:path";
import { authorization, cos } from "./cos.mjs";

const HOST = "nxlimit-footage-1454208796.cos.accelerate.myqcloud.com";
const DEST = process.argv[2] || "C:\\Users\\kentb\\Videos\\nolimit-footage";
const CONCURRENCY = 4;

const listing = await cos({ host: HOST, params: { prefix: "footage/", "max-keys": "1000" } });
const xml = await listing.text();
const entries = [...xml.matchAll(/<Key>([^<]+\.MP4)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>/gi)].map(
  (m) => ({ key: m[1], size: Number(m[2]) })
);
const totalGb = entries.reduce((s, e) => s + e.size, 0) / 1073741824;
console.log(`${entries.length} clips, ${totalGb.toFixed(1)} GB total`);

let done = 0, skipped = 0, failed = 0;
const failures = [];

async function download(entry) {
  const rel = entry.key.replace(/^footage\//, "");
  const dest = join(DEST, rel);
  mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest) && statSync(dest).size === entry.size) {
    skipped++;
    return;
  }
  const pathname = `/${entry.key}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const auth = authorization({ method: "GET", pathname, params: {}, headers: {} });
      const url = `https://${HOST}${encodeURI(pathname)}?${auth}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
      if (statSync(dest).size !== entry.size) throw new Error("size mismatch after download");
      done++;
      console.log(`ok [${done + skipped}/${entries.length}]: ${rel} (${(entry.size / 1048576).toFixed(0)} MB)`);
      return;
    } catch (error) {
      if (attempt === 3) {
        failed++;
        failures.push(rel);
        console.log(`FAIL: ${rel}: ${error.message}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
}

let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < entries.length) {
      const entry = entries[next++];
      await download(entry);
    }
  })
);
console.log(`\nDONE: ${done} downloaded, ${skipped} already local, ${failed} failed`);
if (failures.length) console.log("failed:", failures.join(", "));
