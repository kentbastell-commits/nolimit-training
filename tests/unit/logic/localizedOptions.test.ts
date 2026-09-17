import { describe, expect, it } from "vitest";
import { localizedOptions } from "../../../src/localizedOptions";

describe("bilingual form choices", () => {
  it("keeps answer values stable across language changes", () => {
    const en = localizedOptions("Yes, No", '["是","否"]', "en");
    const zh = localizedOptions("Yes, No", '["是","否"]', "zh");
    expect(en.map((o) => o.value)).toEqual(zh.map((o) => o.value));
    expect(zh.map((o) => o.label)).toEqual(["是", "否"]);
    expect(zh[0].matches("Yes")).toBe(true);
    expect(zh[0].matches("是")).toBe(true);
  });
  it("uses original labels if the translated list is incomplete", () => {
    expect(localizedOptions("Yes\nNo", '["是"]', "zh").map((o) => o.label)).toEqual(["Yes", "No"]);
  });
});
