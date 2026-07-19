import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { detectFlight, detectFlights, pickDropJump } from "../../../src/jumpAutoMark.ts";

// Fixtures are real pose trajectories from Kent's 120fps slo-mo clips
// (2026-07-19). Ground truth for the static clip was hand-labeled frame by
// frame: takeoff 6.93s, landing ~9.55s, flight ≈ 2.62 timeline seconds.
const load = (name: string) =>
  JSON.parse(readFileSync(`tests/fixtures/${name}.json`, "utf8"));

describe("jumpAutoMark.detectFlight", () => {
  // The two slo-mo fixtures are BAKED exports (speed-ramped timelines), which
  // the product refuses to measure absolutely — these tests pin detection
  // STABILITY (marks land in the visually-verified windows), not exact cm.
  // Absolute accuracy is pinned by the real-time 60fps clip vs MyJump below.
  it("finds the flight window on a static-camera slo-mo CMJ", () => {
    const result = detectFlight(load("pose-cmj-static"));
    expect(result).not.toBeNull();
    expect(result!.takeoff).toBeGreaterThan(6.3);
    expect(result!.takeoff).toBeLessThan(7.1);
    expect(result!.landing).toBeGreaterThan(9.2);
    expect(result!.landing).toBeLessThan(9.8);
  });

  it("detects a clean flight on the second static clip", () => {
    const result = detectFlight(load("pose-cmj-static2"));
    expect(result).not.toBeNull();
    expect(result!.flight).toBeGreaterThan(2.5);
    expect(result!.flight).toBeLessThan(3.2);
  });

  it("refuses (null) rather than mis-measuring a zooming-camera clip", () => {
    const result = detectFlight(load("pose-cmj-zooming"), { minFlightS: 0.6 });
    expect(result).toBeNull();
  });

  it("finds all three jumps in a real-time 60fps multi-jump clip, best within MyJump's error band", () => {
    // Ground truth: MyJump measured this athlete at 49.19cm (633ms flight).
    const flights = detectFlights(load("pose-3jumps-60fps"), { minFlightS: 0.3 });
    expect(flights.length).toBe(3);
    const best = detectFlight(load("pose-3jumps-60fps"), { minFlightS: 0.3 })!;
    expect(best.flight).toBeGreaterThan(0.6);
    expect(best.flight).toBeLessThan(0.66);
  });

  it("pairs a drop flight with its rebound for RSI marks", () => {
    const flights = [
      { takeoff: 1.0, landing: 1.4, flight: 0.4, confidence: 1 }, // drop off box
      { takeoff: 1.62, landing: 2.25, flight: 0.63, confidence: 1 }, // rebound
      { takeoff: 6.0, landing: 6.5, flight: 0.5, confidence: 1 }, // unrelated hop
    ];
    const dj = pickDropJump(flights)!;
    expect(dj.contact).toBe(1.4);
    expect(dj.takeoff).toBe(1.62);
    expect(dj.landing).toBe(2.25);
  });

  it("returns null for drop-jump pairing when no plausible contact gap exists", () => {
    expect(
      pickDropJump([{ takeoff: 1, landing: 1.5, flight: 0.5, confidence: 1 }])
    ).toBeNull();
    expect(
      pickDropJump([
        { takeoff: 1, landing: 1.5, flight: 0.5, confidence: 1 },
        { takeoff: 8, landing: 8.6, flight: 0.6, confidence: 1 }, // 6.5s gap
      ])
    ).toBeNull();
  });

  it("returns null on insufficient data", () => {
    expect(detectFlight([])).toBeNull();
    expect(
      detectFlight(
        Array.from({ length: 40 }, (_, i) => ({ t: i / 30, foot: null, vis: 0 }))
      )
    ).toBeNull();
  });
});
