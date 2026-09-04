// Full exercise-library video audit. Runs ON THE SERVER (needs uploads dir +
// DATABASE_URL). Read-only. Prints one JSON line per exercise-with-video plus
// a summary. Checks: URL class, file-on-disk, optimized tag, thumb, origin
// HEAD, CDN HEAD consistency.
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const UP = "/opt/nolimit-training/uploads";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

const head = async (url) => {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    return {
      status: res.status,
      len: Number(res.headers.get("content-length") || 0),
      type: res.headers.get("content-type") || "",
      lm: res.headers.get("last-modified") || "",
    };
  } catch (e) {
    return { status: 0, error: String(e.message || e).slice(0, 80) };
  }
};

const classify = (url) => {
  if (!url) return "none";
  if (/youtu\.?be/i.test(url)) return "youtube";
  if (/trainnolimit\.(cn|com)\/uploads\//i.test(url)) return "upload";
  if (/^https?:\/\//i.test(url)) return "external";
  return "malformed";
};

const uploadName = (url) => {
  const m = String(url).match(/\/uploads\/([^/?#]+)/i);
  return m ? m[1] : "";
};

const rows = (
  await client.query(
    "select exercise_id, name, short_video_url, long_video_url, thumbnail_url, status from exercises order by exercise_id"
  )
).rows;
client.release();
await pool.end();

const issues = [];
const stats = {
  total: rows.length,
  active: 0,
  noVideo: 0,
  youtube: 0,
  upload: 0,
  external: 0,
  malformed: 0,
  longVideos: 0,
};

for (const r of rows) {
  if (r.status === "Active") stats.active += 1;
  const fields = [
    ["short", r.short_video_url],
    ["long", r.long_video_url],
  ];
  let hasAny = false;
  for (const [which, url] of fields) {
    const cls = classify(url);
    if (cls === "none") continue;
    hasAny = true;
    if (which === "long") stats.longVideos += 1;
    stats[cls] = (stats[cls] || 0) + (which === "short" ? 1 : 0);
    const rec = { id: r.exercise_id, name: r.name, which, cls, url: String(url).slice(0, 120) };

    if (cls === "youtube") {
      issues.push({ ...rec, issue: "youtube-blocked-in-mainland" });
      continue;
    }
    if (cls === "malformed") {
      issues.push({ ...rec, issue: "malformed-url" });
      continue;
    }
    if (cls === "external") {
      const h = await head(url);
      if (h.status !== 200 && h.status !== 206 && !(h.status >= 300 && h.status < 400)) {
        issues.push({ ...rec, issue: `external-dead-${h.status}` });
      }
      continue;
    }
    // uploads
    const fname = uploadName(url);
    const fpath = path.join(UP, fname);
    if (!fs.existsSync(fpath)) {
      issues.push({ ...rec, issue: "file-missing-on-disk" });
      continue;
    }
    const st = fs.statSync(fpath);
    const isVideo = /\.(mp4|mov|m4v|webm)$/i.test(fname);
    if (isVideo) {
      let tag = "";
      try {
        tag = execFileSync(
          "ffprobe",
          ["-v", "error", "-show_entries", "format_tags=comment", "-of", "default=nw=1:nk=1", fpath],
          { encoding: "utf8" }
        ).trim();
      } catch {}
      const optimized = tag.includes("nx-opt");
      const thumb = path.join(UP, "thumbs", fname.replace(/\.[^.]+$/, ".jpg"));
      const hasThumb = fs.existsSync(thumb);
      if (!optimized) issues.push({ ...rec, issue: "not-optimized", mb: +(st.size / 1048576).toFixed(1) });
      if (!hasThumb) issues.push({ ...rec, issue: "thumb-missing" });
      if (st.size > 30 * 1048576) issues.push({ ...rec, issue: "still-heavy", mb: +(st.size / 1048576).toFixed(1) });

      // CDN vs origin consistency
      const cdnUrl = `https://media.trainnolimit.cn/uploads/${fname}`;
      const cdn = await head(cdnUrl);
      if (cdn.status !== 200) {
        issues.push({ ...rec, issue: `cdn-status-${cdn.status}`, err: cdn.error });
      } else if (cdn.len && cdn.len !== st.size) {
        issues.push({ ...rec, issue: "cdn-stale-mismatch", disk: st.size, cdn: cdn.len });
      } else if (cdn.type && !/video|octet/i.test(cdn.type)) {
        issues.push({ ...rec, issue: `cdn-wrong-type-${cdn.type}` });
      }
    }
  }
  if (!hasAny) {
    stats.noVideo += 1;
    if (r.status === "Active") issues.push({ id: r.exercise_id, name: r.name, issue: "no-video-active" });
  }
}

console.log("=== SUMMARY ===");
console.log(JSON.stringify(stats));
console.log("=== ISSUES ===");
const byIssue = {};
for (const i of issues) {
  byIssue[i.issue] = (byIssue[i.issue] || 0) + 1;
}
console.log(JSON.stringify(byIssue));
for (const i of issues) console.log(JSON.stringify(i));
