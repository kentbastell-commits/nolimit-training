// Backfill Chinese mirror columns for existing content, now that the LLM
// translation path is live (Tencent TokenHub DeepSeek-V4-Flash).
//
// Targets (fills EMPTY CN columns only, unless the CN text carries known
// TMT-era garble markers, in which case it re-translates):
//   - exercises: name_cn, coaching_cues_cn, technical_cues_cn, common_errors_cn
//   - workout_templates: coaching_notes_cn (human lines only), session_name_cn
//   - programs: name_cn, goal_cn, description_cn
//
// Usage (run on the server, repo root):
//   npx tsx scripts/backfillTranslations.ts            # dry run, prints plan + samples
//   npx tsx scripts/backfillTranslations.ts --apply    # translate + write
//   npx tsx scripts/backfillTranslations.ts --apply --limit 50
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../server/db/client.ts";
import { exercises, programs, workoutTemplates } from "../server/db/schema.ts";
import { translateText } from "../server/db/translate.ts";

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

// Unambiguous TMT-era junk in a fitness context ("track" → 赛道, "calves" →
// 小牛, "band" → 乐队, "Finisher" → 卷发器). Presence = re-translate.
const GARBLE = /小牛|乐队|卷发器|赛道|冲出洞/;
const hasCjk = (t: string) => /[一-鿿]/.test(t);
const NOTE_META_LINE =
  /^(Section|Label|Superset|Circuit|Circuit Mode|Circuit Minutes|Tracking|Fields|Unilateral|Accessory|Accessory Parent|Accessory Color|Set Prescriptions|Alternate Exercises|Target[^:：]*)\s*[:：]/i;
const humanNoteText = (notes: string) =>
  String(notes || "")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !NOTE_META_LINE.test(l.trim()))
    .join("\n")
    .trim();

type Job = {
  label: string;
  source: string;
  current: string;
  apply: (zh: string) => Promise<unknown>;
};
const jobs: Job[] = [];
const needs = (en: unknown, cn: unknown) => {
  const e = String(en || "").trim();
  const c = String(cn || "").trim();
  if (!e || hasCjk(e)) return false; // nothing to translate / already bilingual
  return !c || GARBLE.test(c);
};

// ---- exercises
const exRows = await db.select().from(exercises).where(ne(exercises.status, "Archived"));
for (const r of exRows) {
  const fields: Array<[string, string | null, string | null, keyof typeof r]> = [
    ["name", r.name, r.nameCn, "nameCn"],
    ["coachingCues", r.coachingCues, r.coachingCuesCn, "coachingCuesCn"],
    ["technicalCues", r.technicalCues, r.technicalCuesCn, "technicalCuesCn"],
    ["commonErrors", r.commonErrors, r.commonErrorsCn, "commonErrorsCn"],
  ];
  for (const [f, en, cn, col] of fields) {
    if (!needs(en, cn)) continue;
    jobs.push({
      label: `exercise ${r.exerciseId} ${f}`,
      source: String(en),
      current: String(cn || ""),
      apply: (zh) => db.update(exercises).set({ [col]: zh } as any).where(eq(exercises.exerciseId, r.exerciseId)),
    });
  }
}

// ---- workout templates (coach cues + session names)
const wtRows = await db
  .select({
    templateId: workoutTemplates.templateId,
    coachingNotes: workoutTemplates.coachingNotes,
    coachingNotesCn: workoutTemplates.coachingNotesCn,
    sessionName: workoutTemplates.sessionName,
    sessionNameCn: workoutTemplates.sessionNameCn,
  })
  .from(workoutTemplates)
  .where(
    or(
      and(sql`coalesce(${workoutTemplates.coachingNotes}, '') <> ''`, or(isNull(workoutTemplates.coachingNotesCn), eq(workoutTemplates.coachingNotesCn, ""))),
      and(sql`coalesce(${workoutTemplates.sessionName}, '') <> ''`, or(isNull(workoutTemplates.sessionNameCn), eq(workoutTemplates.sessionNameCn, "")))
    )
  );
for (const r of wtRows) {
  const human = humanNoteText(String(r.coachingNotes || ""));
  if (human && needs(human, r.coachingNotesCn)) {
    jobs.push({
      label: `template ${r.templateId} notes`,
      source: human,
      current: String(r.coachingNotesCn || ""),
      apply: (zh) =>
        db.update(workoutTemplates).set({ coachingNotesCn: zh }).where(eq(workoutTemplates.templateId, r.templateId)),
    });
  }
  if (needs(r.sessionName, r.sessionNameCn)) {
    jobs.push({
      label: `template ${r.templateId} sessionName`,
      source: String(r.sessionName),
      current: "",
      apply: (zh) =>
        db.update(workoutTemplates).set({ sessionNameCn: zh }).where(eq(workoutTemplates.templateId, r.templateId)),
    });
  }
}

// ---- programs
const prRows = await db.select().from(programs);
for (const r of prRows) {
  const fields: Array<[string, string | null, string | null, string]> = [
    ["name", r.name, r.nameCn, "nameCn"],
    ["goal", r.goal, r.goalCn, "goalCn"],
    ["description", r.description, r.descriptionCn, "descriptionCn"],
  ];
  for (const [f, en, cn, col] of fields) {
    if (!needs(en, cn)) continue;
    jobs.push({
      label: `program ${r.programId} ${f}`,
      source: String(en),
      current: String(cn || ""),
      apply: (zh) => db.update(programs).set({ [col]: zh } as any).where(eq(programs.programId, r.programId)),
    });
  }
}

const todo = jobs.slice(0, LIMIT === Infinity ? jobs.length : LIMIT);
console.log(`plan: ${jobs.length} translations needed${Number.isFinite(LIMIT) ? `, running ${todo.length}` : ""} (${APPLY ? "APPLY" : "DRY RUN"})`);
const byKind = new Map<string, number>();
for (const j of jobs) {
  const k = j.label.split(" ")[0] + " " + j.label.split(" ").slice(2).join(" ");
  byKind.set(k, (byKind.get(k) || 0) + 1);
}
for (const [k, n] of byKind) console.log(`  ${k}: ${n}`);

if (!APPLY) {
  // dry run: translate a small sample so quality can be judged before applying
  for (const j of todo.slice(0, 5)) {
    const zh = await translateText(j.source, "zh");
    console.log(`\n--- ${j.label}${j.current ? " (garbled, will overwrite)" : ""}`);
    console.log(`EN: ${j.source.slice(0, 200)}`);
    console.log(`ZH: ${zh ? zh.slice(0, 200) : "(translation unavailable)"}`);
  }
  console.log("\nDry run only. Re-run with --apply to write.");
  process.exit(0);
}

let ok = 0, fail = 0, done = 0;
const worker = async () => {
  while (todo.length) {
    const j = todo.shift()!;
    try {
      const zh = await translateText(j.source, "zh");
      if (zh) {
        await j.apply(zh);
        ok++;
      } else fail++;
    } catch {
      fail++;
    }
    done++;
    if (done % 25 === 0) console.log(`  ${done} done (${ok} ok, ${fail} failed)`);
  }
};
await Promise.all([worker(), worker(), worker()]);
console.log(`\nDONE: ${ok} translated, ${fail} failed/skipped`);
process.exit(0);
