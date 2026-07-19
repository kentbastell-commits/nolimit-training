import { describe, expect, it } from "vitest";
import { fpsFromMoov } from "../../../src/videoMeta.ts";

// Build a minimal synthetic moov: moov > trak > mdia > (hdlr vide, mdhd
// timescale, minf > stbl > stts). Box = [u32 size][4cc type][payload].
function box(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.length);
  new DataView(out.buffer).setUint32(0, out.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function u32(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4);
  const view = new DataView(out.buffer);
  values.forEach((value, i) => view.setUint32(i * 4, value));
  return out;
}

function makeMoov(timescale: number, sampleDelta: number, handler = "vide") {
  const hdlrPayload = new Uint8Array(24);
  for (let i = 0; i < 4; i++) hdlrPayload[8 + i] = handler.charCodeAt(i);
  const hdlr = box("hdlr", hdlrPayload);
  // mdhd v0: ver/flags, creation, modification, timescale, duration
  const mdhd = box("mdhd", u32(0, 0, 0, timescale, timescale * 10));
  // stts: ver/flags, entryCount=1, [count=300, delta]
  const stts = box("stts", u32(0, 1, 300, sampleDelta));
  const stbl = box("stbl", stts);
  const minf = box("minf", stbl);
  const mdia = box("mdia", concat(hdlr, mdhd, minf));
  const trak = box("trak", mdia);
  const moov = box("moov", trak);
  return moov.buffer as ArrayBuffer;
}

describe("videoMeta.fpsFromMoov", () => {
  it("reads 240fps from timescale 240 / delta 1", () => {
    expect(fpsFromMoov(makeMoov(240, 1))).toBe(240);
  });

  it("reads 30fps from timescale 600 / delta 20 (classic QuickTime)", () => {
    expect(fpsFromMoov(makeMoov(600, 20))).toBe(30);
  });

  it("reads 120fps from timescale 12000 / delta 100", () => {
    expect(fpsFromMoov(makeMoov(12000, 100))).toBe(120);
  });

  it("ignores non-video tracks", () => {
    expect(fpsFromMoov(makeMoov(44100, 1024, "soun"))).toBe(null);
  });

  it("returns null for garbage", () => {
    expect(fpsFromMoov(new Uint8Array([1, 2, 3, 4]).buffer as ArrayBuffer)).toBe(null);
  });
});
