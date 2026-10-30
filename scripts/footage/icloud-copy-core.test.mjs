import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyResumable, validateMedia } from "./icloud-copy-core.mjs";

const dir = mkdtempSync(join(tmpdir(), "nolimit-icloud-copy-"));
const source = join(dir, "source.mp4");
let clean, corrupt;
before(() => {
  execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=128x128:rate=30", "-t", "1", "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", source], { windowsHide: true });
  clean = readFileSync(source);
  const packets = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_packets", "-show_entries", "packet=pos,size", "-of", "json", source], { encoding: "utf8", windowsHide: true })).packets;
  corrupt = Buffer.from(clean);
  corrupt.fill(255, Number(packets[0].pos) + 100, Number(packets[0].pos) + Number(packets[0].size) - 5);
});
after(() => {
  for (const file of readdirSync(dir)) unlinkSync(join(dir, file));
  rmdirSync(dir);
});
const plan = name => ({ src: source, dst: join(dir, `${name}.mp4`), partial: join(dir, `${name}.icloud-partial`), seconds: 1 });

test("full verification rejects corrupt frames even when the container and duration are readable", () => {
  const bad = join(dir, "corrupt.mp4"); writeFileSync(bad, corrupt);
  assert.equal(validateMedia(bad).duration, 1);
  assert.throws(() => validateMedia(bad, 1, true));
  assert.equal(validateMedia(source, 1, true).duration, 1);
});
test("an interrupted valid prefix resumes without changing source or output bytes", () => {
  const p = plan("resumed"); let polls = 0;
  const first = copyResumable(p, { chunkBytes: 1024, shouldStop: () => ++polls > 2 });
  assert.equal(first.stopped, true); assert.equal(first.position, 2048); assert.equal(existsSync(p.dst), false);
  const second = copyResumable(p);
  assert.equal(second.resumedAt, 2048); assert.equal(second.stopped, false);
  assert.deepEqual(readFileSync(p.dst), clean); assert.deepEqual(readFileSync(source), clean);
});
test("failed complete partial is quarantined so the next retry copies fresh bytes", () => {
  const p = plan("poisoned"); writeFileSync(p.partial, corrupt);
  assert.throws(() => copyResumable(p), /quarantined.*retry starts fresh/);
  assert.equal(existsSync(p.dst), false); assert.equal(existsSync(p.partial), false);
  assert.deepEqual(readFileSync(`${p.partial}.invalid`), corrupt);
  assert.equal(copyResumable(p).resumedAt, 0);
  assert.deepEqual(readFileSync(p.dst), clean); assert.deepEqual(readFileSync(source), clean);
});
