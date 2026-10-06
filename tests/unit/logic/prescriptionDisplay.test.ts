import { describe, expect, it } from "vitest";
import { localizePrescriptionValue } from "../../../src/prescriptionDisplay";

describe("prescription display translation", () => {
  it("uses the field's meaning in Chinese labels and input placeholders", () => {
    expect(localizePrescriptionValue("Max", true, "reps")).toBe("最多次数");
    expect(localizePrescriptionValue("maximum", true, "time")).toBe("最长时间");
    expect(localizePrescriptionValue("MAX", true, "rpe")).toBe("最大");
    expect(localizePrescriptionValue("max", false, "time")).toBe("max");
    expect(localizePrescriptionValue(undefined, true)).toBe("");
  });
  it("translates rest and duration units without interpreting arbitrary coach text", () => {
    expect(localizePrescriptionValue("180 sec", true)).toBe("180 秒");
    expect(localizePrescriptionValue("3 min", true)).toBe("3 分钟");
    expect(localizePrescriptionValue("7 s / side", true, "time")).toBe("7 秒 ／侧");
    expect(localizePrescriptionValue("2-1-3", true)).toBe("2-1-3");
    expect(localizePrescriptionValue("Maxwell", true)).toBe("Maxwell");
  });
});
