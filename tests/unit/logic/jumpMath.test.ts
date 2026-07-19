import { describe, expect, it } from "vitest";
import { jumpHeightCm, rsi, sayersPeakPowerW, round } from "../../../src/jumpMath.ts";

describe("jumpMath", () => {
  it("computes jump height from flight time (h = g*t^2/8)", () => {
    // 0.5 s flight → 9.80665*0.25/8 m = 30.6 cm (textbook value)
    expect(round(jumpHeightCm(0.5))).toBe(30.6);
    // 0.6 s → 44.1 cm
    expect(round(jumpHeightCm(0.6))).toBe(44.1);
    expect(jumpHeightCm(0)).toBe(0);
    expect(jumpHeightCm(NaN)).toBe(0);
    expect(jumpHeightCm(-1)).toBe(0);
  });

  it("computes RSI as flight/contact", () => {
    expect(round(rsi(0.6, 0.2), 2)).toBe(3);
    expect(round(rsi(0.5, 0.25), 2)).toBe(2);
    expect(rsi(0.5, 0)).toBe(0);
    expect(rsi(0, 0.2)).toBe(0);
  });

  it("computes Sayers peak power", () => {
    // 40 cm, 75 kg → 60.7*40 + 45.3*75 - 2055 = 3770.5 W
    expect(round(sayersPeakPowerW(40, 75))).toBe(3770.5);
    expect(sayersPeakPowerW(0, 75)).toBe(0);
    expect(sayersPeakPowerW(40, 0)).toBe(0);
  });
});
