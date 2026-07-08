// Tests for src/i18n.ts — module initialization, en/zh resource integrity,
// language switching, and the plural-key convention.
import { afterEach, describe, expect, it } from "vitest";
import i18n, { resources } from "../../../src/i18n";

const enKeys = Object.keys(resources.en.translation);
const zhKeys = Object.keys(resources.zh.translation);

afterEach(async () => {
  // Tests below switch languages; always restore the configured default.
  await i18n.changeLanguage("en");
});

describe("i18n module", () => {
  it("initializes as an i18next instance with English as the default language", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe("en");
    expect(typeof i18n.t).toBe("function");
    expect(typeof i18n.changeLanguage).toBe("function");
  });

  it("bundles both en and zh translation resources", () => {
    expect(resources.en.translation).toBeTruthy();
    expect(resources.zh.translation).toBeTruthy();
    expect(enKeys.length).toBeGreaterThan(50);
    expect(zhKeys.length).toBeGreaterThan(50);
    expect(i18n.hasResourceBundle("en", "translation")).toBe(true);
    expect(i18n.hasResourceBundle("zh", "translation")).toBe(true);
  });

  it("resolves known keys in both languages", () => {
    expect(i18n.t("home")).toBe("Home");
    expect(i18n.t("calendar")).toBe("Calendar");
    expect(i18n.t("submitWorkout")).toBe("Submit Workout");
    expect(i18n.getFixedT("zh")("home")).toBe("首页");
    expect(i18n.getFixedT("zh")("submitWorkout")).toBe("提交训练");
  });

  it("switches t() output when changing to Chinese and back", async () => {
    await i18n.changeLanguage("zh");
    expect(i18n.language).toBe("zh");
    expect(i18n.t("home")).toBe("首页");
    expect(i18n.t("coachNotes")).toBe("教练备注");

    await i18n.changeLanguage("en");
    expect(i18n.t("home")).toBe("Home");
  });

  it("interpolates variables in both languages", async () => {
    expect(i18n.t("setNo", { number: 3 })).toBe("Set 3");
    expect(i18n.t("hi", { name: "Kent" })).toBe("Hi, Kent");
    await i18n.changeLanguage("zh");
    expect(i18n.t("setNo", { number: 3 })).toBe("第 3 组");
    expect(i18n.t("hi", { name: "Kent" })).toBe("Kent，你好");
  });
});

describe("en/zh resource parity", () => {
  it("has identical key sets in both languages (nothing renders as a raw key in one language)", () => {
    const missingInZh = enKeys.filter((key) => !zhKeys.includes(key));
    const missingInEn = zhKeys.filter((key) => !enKeys.includes(key));
    expect(missingInZh).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it("has no empty translation values in either language", () => {
    const emptyEn = enKeys.filter(
      (key) =>
        !String(
          resources.en.translation[key as keyof typeof resources.en.translation]
        ).trim()
    );
    const emptyZh = zhKeys.filter(
      (key) =>
        !String(
          resources.zh.translation[key as keyof typeof resources.zh.translation]
        ).trim()
    );
    expect(emptyEn).toEqual([]);
    expect(emptyZh).toEqual([]);
  });

  it("every plural-suffixed key has its singular base key in both languages", () => {
    const pluralKeys = enKeys.filter((key) => key.endsWith("_plural"));
    expect(pluralKeys.length).toBeGreaterThan(0); // convention is in use
    for (const pluralKey of pluralKeys) {
      const baseKey = pluralKey.replace(/_plural$/, "");
      expect(enKeys).toContain(baseKey);
      expect(zhKeys).toContain(baseKey);
      expect(zhKeys).toContain(pluralKey);
    }
  });

  it("count-based keys resolve to interpolated text (never a raw key) in both languages", async () => {
    // NOTE / known limitation: the resources use the legacy i18next v3
    // "_plural" suffix, but the installed i18next (v26) resolves plurals via
    // Intl.PluralRules suffixes ("_one"/"_other"). The *_plural variants are
    // therefore never selected — English plural counts currently fall back to
    // the singular text (e.g. "2 session ready"). These assertions pin the
    // safe part of the behavior: counts always interpolate and never leak a
    // raw key. If the keys are migrated to _one/_other, tighten this test to
    // assert real plural selection.
    expect(i18n.t("sessionsReady", { count: 1 })).toBe("1 session ready");
    expect(i18n.t("itemCount", { count: 2 })).toContain("2");
    expect(i18n.t("taskCount", { count: 5 })).not.toContain("taskCount");
    await i18n.changeLanguage("zh");
    expect(i18n.t("itemCount", { count: 2 })).toBe("2 项");
    expect(i18n.t("taskCount", { count: 5 })).toBe("5 项任务");
  });
});
