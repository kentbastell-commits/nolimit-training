import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { detectFlight } from "../../../src/jumpAutoMark.ts";

// Fixtures are real pose trajectories from Kent's 120fps slo-mo clips
// (2026-07-19). Ground truth for the static clip was hand-labeled frame by
// frame: takeoff 6.93s, landing ~9.55s, flight ≈ 2.62 timeline seconds.
const load = (name: string) =>
  JSON.parse(readFileSync(`tests/fixtures/${name}.json`, "utf8"));

describe("jumpAutoMark.detectFlight", () => {
  it("matches the hand-labeled flight time on a static-camera CMJ", () => {
    const result = detectFlight(load("pose-cmj-static"));
    expect(result).not.toBeNull();
    expect(result!.flight).toBeGreaterThan(2.45);
    expect(result!.flight).toBeLessThan(2.8);
    expect(result!.takeoff).toBeGreaterThan(6.4);
    expect(result!.landing).toBeLessThan(9.7);
  });

  it("detects a clean flight on the second static clip", () => {
    const result = detectFlight(load("pose-cmj-static2"));
    expect(result).not.toBeNull();
    expect(result!.flight).toBeGreaterThan(2.4);
    expect(result!.flight).toBeLessThan(3.1);
  });

  it("refuses (null) rather than mis-measuring a zooming-camera clip", () => {
    const result = detectFlight(load("pose-cmj-zooming"), { minFlightS: 0.6 });
    expect(result).toBeNull();
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
