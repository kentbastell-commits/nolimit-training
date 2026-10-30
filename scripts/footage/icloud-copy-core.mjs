import { closeSync, existsSync, fsyncSync, openSync, readSync, renameSync, statSync, writeSync } from "node:fs";
import { execFileSync } from "node:child_process";

export function validateMedia(filePath, expectedSeconds = 0, fullScan = false) {
  const probe = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", filePath,
  ], { encoding: "utf8", windowsHide: true }));
  if (!(probe.streams || []).some(s => s.codec_type === "video")) throw new Error("no video stream");
  const duration = Number(probe.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("invalid duration");
  if (expectedSeconds && Math.abs(duration - expectedSeconds) > Math.max(2, expectedSeconds * 0.01)) {
    throw new Error(`duration mismatch: manifest ${expectedSeconds}s, file ${duration.toFixed(3)}s`);
  }
  if (fullScan) {
    // Stream-copy only demuxes packets and can succeed on corrupt video.
    // Decode the complete video/audio before promoting or releasing a source.
    execFileSync("ffmpeg", [
      "-nostdin", "-v", "error", "-xerror", "-err_detect", "explode", "-i", filePath,
      "-map", "0:v:0", "-map", "0:a?", "-f", "null",
      process.platform === "win32" ? "NUL" : "/dev/null",
    ], { stdio: "ignore", windowsHide: true });
  }
  return { duration, size: statSync(filePath).size };
}

export function quarantineFile(filePath) {
  let target = `${filePath}.invalid`, suffix = 1;
  while (existsSync(target)) target = `${filePath}.invalid-${suffix++}`;
  renameSync(filePath, target);
  return target;
}

export function copyResumable(p, { shouldStop = () => false, chunkBytes = 4 * 1024 * 1024, onProgress = () => {} } = {}) {
  if (existsSync(p.dst)) quarantineFile(p.dst);
  let position = existsSync(p.partial) ? statSync(p.partial).size : 0;
  const resumedAt = position;
  const srcFd = openSync(p.src, "r");
  let dstFd;
  try {
    dstFd = openSync(p.partial, position ? "r+" : "w");
    const buffer = Buffer.allocUnsafe(chunkBytes);
    let nextReport = position + 64 * 1024 * 1024;
    for (;;) {
      if (shouldStop()) return { stopped: true, position, resumedAt };
      const got = readSync(srcFd, buffer, 0, buffer.length, position);
      if (!got) break;
      let written = 0;
      while (written < got) written += writeSync(dstFd, buffer, written, got - written, position + written);
      position += got;
      if (position >= nextReport) {
        onProgress(position);
        nextReport = position + 64 * 1024 * 1024;
      }
    }
    fsyncSync(dstFd);
  } finally {
    if (dstFd !== undefined) closeSync(dstFd);
    closeSync(srcFd);
  }
  let verified;
  try {
    verified = validateMedia(p.partial, p.seconds, true);
  } catch (error) {
    // Retaining a known-bad full partial would resume at EOF forever.
    // Preserve it for inspection; the next invocation starts a fresh copy.
    const quarantined = quarantineFile(p.partial);
    throw new Error(`media verification failed; quarantined ${quarantined}; retry starts fresh`, { cause: error });
  }
  renameSync(p.partial, p.dst);
  return { stopped: false, position, resumedAt, verified };
}
