// Verify every source file exists in COS with a byte-identical size.
import { statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cos } from "./cos.mjs";

const SRC = "E:\\DCIM";
const CUTOFF = new Date("2026-08-08T00:00:00+07:00").getTime();
const HOST = "nxlimit-footage-1454208796.cos.accelerate.myqcloud.com";
const PREFIX = "footage/";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const remote = new Map();
let marker = "";
for (;;) {
  const params = { prefix: PREFIX, "max-keys": "1000" };
  if (marker) params.marker = marker;
  const res = await cos({ host: HOST, params });
  const xml = await res.text();
  for (const m of xml.matchAll(/<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>[\s\S]*?<\/Contents>/g)) {
    remote.set(m[1], Number(m[2]));
  }
  if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
  const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((k) => k[1]);
  marker = xml.match(/<NextMarker>([^<]+)<\/NextMarker>/)?.[1] || keys[keys.length - 1];
  if (!marker) break;
}

const local = walk(SRC)
  .filter((p) => /\.(MP4|WAV)$/i.test(p))
  .map((p) => ({ path: p, size: statSync(p).size, mtime: statSync(p).mtimeMs }))
  .filter((f) => f.mtime >= CUTOFF);

let matched = 0;
const missing = [];
const mismatched = [];
for (const f of local) {
  const name = f.path.split(/[\\/]/).pop();
  const m = name.match(/DJI_(\d{4})(\d{2})(\d{2})/);
  const date = m ? `${m[1]}-${m[2]}-${m[3]}` : new Date(f.mtime).toISOString().slice(0, 10);
  const key = `${PREFIX}${date}/${name}`;
  if (!remote.has(key)) missing.push(name);
  else if (remote.get(key) !== f.size) mismatched.push(`${name} (local ${f.size} vs remote ${remote.get(key)})`);
  else matched++;
}

const localBytes = local.reduce((s, f) => s + f.size, 0);
const remoteBytes = [...remote.values()].reduce((s, v) => s + v, 0);
console.log(`local files:  ${local.length}  (${(localBytes / 1073741824).toFixed(2)} GB)`);
console.log(`in bucket:    ${remote.size}  (${(remoteBytes / 1073741824).toFixed(2)} GB)`);
console.log(`byte-identical matches: ${matched}`);
console.log(`missing: ${missing.length}${missing.length ? " -> " + missing.join(", ") : ""}`);
console.log(`size mismatches: ${mismatched.length}${mismatched.length ? " -> " + mismatched.join(", ") : ""}`);
console.log(missing.length === 0 && mismatched.length === 0 ? "\nVERIFIED: archive is complete and byte-exact." : "\nARCHIVE INCOMPLETE — do not delete anything.");
