import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildTestAnswer, validQuestionAnswer, validTestAnswer } from "../../../src/contentAnswers";

describe("assessment answer contract", () => {
  it("rejects cleared required multiple choices and whitespace", () => {
    const q = { required: true, questionType: "Multi Choice", options: ["Recovery", "Technique"] };
    expect(validQuestionAnswer(q, "[]")).toBe(false);
    expect(validQuestionAnswer(q, '["Unknown"]')).toBe(false);
    expect(validQuestionAnswer(q, '["Recovery"]')).toBe(true);
    expect(validQuestionAnswer({ required: true, questionType: "Text" }, " \n ")).toBe(false);
  });
  it("preserves structured values and rejects impossible or incomplete entries", () => {
    const squat = { testItemId: "T", calculationMethod: "Epley", unit: "kg" };
    expect(buildTestAnswer(squat, { T__weight: "80", T__reps: "5" })).toBe("80 kg x 5 reps");
    expect(validTestAnswer(squat, "80 kg x 5 reps")).toBe(true);
    expect(buildTestAnswer(squat, { T__weight: "80", T__reps: "0" })).toBe("");
    const run = { testItemId: "T", testName: "2km run" };
    expect(buildTestAnswer(run, { T__minutes: "8", T__seconds: "5" })).toBe("2000 m in 8:05");
    expect(buildTestAnswer(run, { T__minutes: "8", T__seconds: "75" })).toBe("");
    expect(validTestAnswer({ testItemId: "T", testName: "Jump height", unit: "cm" }, "0")).toBe(true);
  });
  it("keeps the miniprogram and web/API answer rules identical", () => {
    expect(readFileSync("../nolimit-miniprogram/src/services/contentAnswers.ts", "utf8").replace(/\r\n/g, "\n")).toBe(readFileSync("src/contentAnswers.ts", "utf8").replace(/\r\n/g, "\n"));
  });
});
