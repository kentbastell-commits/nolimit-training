// Pure answer rules shared by the web client and API. The miniprogram carries
// the same module; its contract test checks parity between the two copies.
export type AnswerQuestion = { questionType?: string; required?: boolean; options?: unknown; optionsCn?: unknown };
export function answerOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map(v => v.trim()).filter(Boolean);
  if (typeof raw !== "string") return [];
  try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return answerOptions(parsed); } catch { /* legacy delimited options */ }
  return raw.split(/[,，|\n]/).map(v => v.trim()).filter(Boolean);
}
export function validQuestionAnswer(question: AnswerQuestion, raw: unknown): boolean {
  const value = String(raw ?? "").trim();
  const options = answerOptions(question.options);
  const translated = answerOptions(question.optionsCn);
  const allowed = (v: string) => options.includes(v) || (options.length === translated.length && translated.includes(v));
  if (/multi|checkbox/i.test(question.questionType || "")) {
    if (!value) return !question.required;
    try {
      const selected: unknown = JSON.parse(value);
      return Array.isArray(selected) && (!question.required || selected.length > 0) &&
        selected.every(v => typeof v === "string" && v.trim() && (!options.length || allowed(v)));
    } catch { return false; }
  }
  if (!value) return !question.required;
  if (/scale/i.test(question.questionType || "")) return /^[1-5]$/.test(value);
  return !options.length || allowed(value);
}

export type AssessmentItem = { testItemId: string; testName?: string; metricType?: string; unit?: string; inputUnit?: string; calculationMethod?: string; metricName?: string; metricUnit?: string };
export function testInputMode(item: AssessmentItem): "weightReps" | "distanceTime" | "single" {
  const description = [item.testName, item.metricType, item.unit, item.inputUnit, item.calculationMethod, item.metricName, item.metricUnit].join(" ").toLowerCase();
  if (/epley|brzycki|[135]rm|weight x reps|weight\/reps/.test(description)) return "weightReps";
  if (/2km|2000|min\/500|aerobic|\bmas\b|threshold|time|duration|minute|second|distance|meter|metre/.test(description)) return "distanceTime";
  return "single";
}
export const isTwoKm = (item: AssessmentItem) => /2km|2000/i.test([item.testName, item.metricType, item.inputUnit, item.calculationMethod].join(" "));
export function buildTestAnswer(item: AssessmentItem, answers: Record<string, string>): string {
  const read = (key: string) => String(answers[`${item.testItemId}__${key}`] ?? "").trim();
  const number = (v: string) => v !== "" && Number.isFinite(Number(v));
  if (testInputMode(item) === "weightReps") {
    const weight = read("weight"), reps = read("reps");
    return number(weight) && Number(weight) >= 0 && number(reps) && Number(reps) > 0 && Number.isInteger(Number(reps))
      ? `${weight} ${item.inputUnit || item.unit || "kg"} x ${reps} reps` : "";
  }
  if (testInputMode(item) === "distanceTime") {
    const distance = read("distance") || (isTwoKm(item) ? "2000" : "");
    const minutes = read("minutes") || "0", seconds = read("seconds") || "0";
    return number(distance) && Number(distance) > 0 && number(minutes) && Number(minutes) >= 0 && Number.isInteger(Number(minutes)) &&
      number(seconds) && Number(seconds) >= 0 && Number(seconds) < 60 && Number(minutes) * 60 + Number(seconds) > 0
      ? `${distance} m in ${minutes}:${seconds.padStart(2, "0")}` : "";
  }
  const value = String(answers[item.testItemId] ?? "").trim();
  return number(value) ? value : "";
}

export function validTestAnswer(item: AssessmentItem, value: string): boolean {
  if (testInputMode(item) === "single") return value.trim() !== "" && Number.isFinite(Number(value));
  const match = testInputMode(item) === "weightReps"
    ? value.match(/^([\d.]+)\s+\S+\s+x\s+(\d+)(?:\s+reps)?$/i)
    : value.match(/^([\d.]+)\s+m\s+in\s+(\d+):([\d.]+)$/i);
  if (!match) return false;
  const id = item.testItemId;
  const answers = testInputMode(item) === "weightReps"
    ? { [`${id}__weight`]: match[1], [`${id}__reps`]: match[2] }
    : { [`${id}__distance`]: match[1], [`${id}__minutes`]: match[2], [`${id}__seconds`]: match[3] };
  return Boolean(buildTestAnswer(item, answers));
}

export function displayAnswer(raw: string): string {
  try { const value = JSON.parse(raw); if (Array.isArray(value)) return value.join(", "); } catch { /* plain answer */ }
  return raw;
}
