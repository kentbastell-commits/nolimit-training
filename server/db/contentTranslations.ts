// One coverage map for write-time translation and the audit/backfill command.
// Translate after commit, preserve explicit Chinese copy, and apply only while
// the source still matches. The existing cache bus reaches every API worker.
import { and, eq, getTableColumns, inArray, isNull, or, sql } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { db } from "./client.ts";
import * as schema from "./schema.ts";
import { translateText, translationsConfigured } from "./translate.ts";
import { invalidateCache } from "../../api/_cache.ts";

type Field = { source: string; mirror: string; target: "zh" | "en"; kind?: "notes" | "options" | "answers" };
type Area = { table: AnyPgTable; id: string; fields: Field[]; caches: string[] };
const zh = (source: string, mirror = `${source}Cn`, kind?: Field["kind"]): Field => ({ source, mirror, target: "zh", kind });
const en = (source: string, mirror = `${source}En`): Field => ({ source, mirror, target: "en" });

export const translationAreas = {
  exercises: { table: schema.exercises, id: "exerciseId", caches: ["exercises", "workoutDetails", "workoutHistory"], fields: [
    zh("name"), zh("category"), zh("primaryMuscles"), zh("equipment"), zh("movementPattern"),
    zh("coachingCues", "coachingCuesCn", "notes"), zh("technicalCues", "technicalCuesCn", "notes"), zh("commonErrors"),
  ] },
  programs: { table: schema.programs, id: "programId", caches: ["programs"], fields: [
    zh("name"), zh("goal"), zh("phase"), zh("description"), zh("storeCategory"), zh("storeDescription"), zh("salesDescription"),
  ] },
  workoutTemplates: { table: schema.workoutTemplates, id: "templateId", caches: ["workoutTemplates", "programTemplates", "workoutDetails"], fields: [
    zh("sessionName"), zh("sessionGoal"), zh("sessionNotes"), zh("coachingNotes", "coachingNotesCn", "notes"),
  ] },
  assignedWorkouts: { table: schema.assignedWorkouts, id: "assignedWorkoutId", caches: ["workouts"], fields: [
    zh("sessionName"), zh("sessionGoal"), zh("coachNotes"),
  ] },
  formTemplates: { table: schema.formTemplates, id: "formId", caches: ["contentAssignments"], fields: [zh("name"), zh("description")] },
  formQuestions: { table: schema.formQuestions, id: "questionId", caches: [], fields: [zh("label"), zh("helpText"), zh("options", "optionsCn", "options")] },
  testTemplates: { table: schema.testTemplates, id: "testTemplateId", caches: ["contentAssignments", "testTemplates"], fields: [zh("name"), zh("description")] },
  testItems: { table: schema.testItems, id: "testItemId", caches: ["testTemplates"], fields: [zh("testName"), zh("instructions"), zh("unit")] },
  testLibrary: { table: schema.testLibrary, id: "testId", caches: ["testLibrary"], fields: [zh("name"), zh("protocol")] },
  clientMessages: { table: schema.clientMessages, id: "messageId", caches: ["clientMessages"], fields: [en("body"), zh("coachReply")] },
  checkIns: { table: schema.checkIns, id: "checkinId", caches: ["checkIns", "checkins"], fields: [
    zh("coachNotes"), en("nutritionNotes"), en("trainingNotes"), en("wins"), en("problemsPain"), en("clientNotes"),
  ] },
  formVideos: { table: schema.formVideos, id: "videoId", caches: ["formVideos"], fields: [en("clientNote"), zh("coachReply")] },
  clients: { table: schema.clients, id: "clientId", caches: ["clients"], fields: [en("notes")] },
  workoutLogs: { table: schema.workoutLogs, id: "logId", caches: ["workoutComments", "workoutHistory"], fields: [en("athleteNotes")] },
  formResponses: { table: schema.formResponses, id: "responseId", caches: ["contentResponses"], fields: [en("clientComment"), { ...en("answers"), kind: "answers" }] },
  testResults: { table: schema.testResults, id: "resultId", caches: ["contentResponses"], fields: [en("notes")] },
  coaches: { table: schema.coaches, id: "coachId", caches: ["coaches"], fields: [zh("bio")] },
  reviews: { table: schema.reviews, id: "reviewId", caches: ["reviews"], fields: [zh("quote"), en("quote")] },
  enquiries: { table: schema.enquiries, id: "enquiryId", caches: ["enquiries"], fields: [en("notes")] },
} satisfies Record<string, Area>;
export type TranslationArea = keyof typeof translationAreas;

export function humanTranslationText(raw: unknown, kind?: Field["kind"]): string {
  const text = Array.isArray(raw) ? raw.map(String).join(", ") : String(raw ?? "");
  if (kind !== "notes") return text.trim();
  return text.split(/\r?\n/).filter((line) => !/^(Section|Section Color|Label|Label Mode|Superset|Circuit|Circuit Mode|Circuit Minutes|Tracking|Fields|Unilateral|Accessory|Accessory Parent|Accessory Color|Set Prescriptions|Alternate Exercises|Target[^:：]*)\s*[:：]/i.test(line.trim())).join("\n").trim();
}

// Existing translations remain when the source is unchanged. A changed source
// retires its old mirror atomically; a Chinese value explicitly supplied by the
// editor takes precedence. No separate read/clear race between concurrent edits.
export function translationPatch<T extends Record<string, any>>(area: TranslationArea, values: T): T {
  const config = translationAreas[area];
  const columns = getTableColumns(config.table);
  const patch: Record<string, any> = { ...values };
  for (const field of config.fields) {
    if (values[field.source] === undefined || values[field.mirror] !== undefined) continue;
    const same = values[field.source] === null ? isNull(columns[field.source]) : eq(columns[field.source], values[field.source]);
    patch[field.mirror] = sql`case when ${same} then ${columns[field.mirror]} else null end`;
  }
  return patch as T;
}

const jobs = new Set<Promise<unknown>>();
export function queueTranslations(area: TranslationArea, ids: string[]) {
  if (!ids.length || !translationsConfigured() || jobs.size >= 128) return;
  // Duplicated content is coalesced by translateText. Bulk saves read at most 200 rows at a time.
  const job = (async () => {
    for (let offset = 0; offset < ids.length; offset += 200) {
      await fillRowTranslations(area, ids.slice(offset, offset + 200));
    }
  })().catch(() => {
    console.warn(`[translation] ${area}: deferred; retry with translationCoverage.ts --apply`);
  }).finally(() => jobs.delete(job));
  jobs.add(job);
}

/** Also used to drain outstanding work in integration tests and maintenance. */
export async function drainTranslations() {
  while (jobs.size) await Promise.all([...jobs]);
}

export async function fillRowTranslations(area: TranslationArea, ids: string[]) {
  const config: Area = translationAreas[area];
  const columns = getTableColumns(config.table);
  const rows = await db.select().from(config.table).where(inArray(columns[config.id], ids));
  let filled = 0, unavailable = 0;
  let nextRow = 0;
  const worker = async () => {
    while (nextRow < rows.length) {
      const row = rows[nextRow++];
      for (const field of config.fields) {
        if (String(row[field.mirror] ?? "").trim()) continue;
        const source = humanTranslationText(row[field.source], field.kind);
        if (!source) continue;
        let translated: string | null;
        if (field.kind === "answers") {
          const answers = row[field.source];
          if (!Array.isArray(answers)) continue;
          const output: Record<string, unknown>[] = [];
          let complete = true;
          for (const answer of answers) {
            if (!answer || typeof answer !== "object" || Array.isArray(answer)) { complete = false; break; }
            const copy = { ...answer };
            // Only human text; never translate question IDs, units or numbers.
            for (const key of ["label", "value", "answer", "notes"]) {
              if (typeof copy[key] !== "string" || !/[一-鿿]/.test(copy[key])) continue;
              const text = await translateText(copy[key], "en");
              if (!text) { complete = false; break; }
              copy[key] = text;
            }
            if (!complete) break;
            output.push(copy);
          }
          translated = complete ? JSON.stringify(output) : null;
        } else if (field.kind === "options") {
          const options = parseTranslationOptions(row[field.source]);
          const labels: string[] = [];
          for (const option of options) {
            const label = await translateText(option, field.target);
            if (!label) break;
            labels.push(label);
          }
          translated = labels.length && labels.length === options.length ? JSON.stringify(labels) : null;
        } else {
          // Already in the requested language: don't spend a provider request.
          const alreadyTranslated = field.target === "en" ? !/[一-鿿]/.test(source) : !/[a-z]/i.test(source);
          translated = alreadyTranslated ? source : await translateText(source, field.target);
        }
        if (!translated) { unavailable++; continue; }
        const updated = await db.update(config.table).set({ [field.mirror]: translated }).where(and(
          eq(columns[config.id], row[config.id]),
          eq(columns[field.source], row[field.source]),
          or(isNull(columns[field.mirror]), eq(columns[field.mirror], "")),
        )).returning({ id: columns[config.id] });
        if (updated.length) {
          filled++;
          for (const prefix of config.caches) invalidateCache(prefix);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, rows.length) }, worker));
  return { filled, unavailable };
}

export function parseTranslationOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  const text = String(raw ?? "").trim();
  try { const parsed = JSON.parse(text); if (Array.isArray(parsed)) return parseTranslationOptions(parsed); } catch { /* legacy comma/newline list */ }
  return text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}
