import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/programTemplates.ts";
import type { TemplateSummaryDTO } from "../dto.ts";

function normalizeLookupText(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/gi, " ")
    .trim();
}

function lookupTextMatches(source?: string, target?: string) {
  const s = normalizeLookupText(source);
  const t = normalizeLookupText(target);
  return Boolean(s && t && (s === t || s.includes(t) || t.includes(s)));
}

export async function listProgramTemplates(
  programId = "",
  programRecordId = ""
): Promise<TemplateSummaryDTO[]> {
  const all =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/programTemplates.ts")).listAllTemplateRows()
      : await feishu.listAllTemplateRows();

  const programSearch = String(programId || "");
  const recordIdTarget = String(programRecordId || "");

  return all
    .filter(
      (row) =>
        (programSearch && lookupTextMatches(row.programId, programSearch)) ||
        (recordIdTarget &&
          (row.programRecordIds.includes(recordIdTarget) ||
            lookupTextMatches(row.programId, recordIdTarget)))
    )
    .map(
      (row): TemplateSummaryDTO => ({
        recordId: row.recordId,
        week: row.week,
        day: row.day,
        sessionName: row.sessionName,
        sessionNameCn: row.sessionNameCn,
        sessionType: row.sessionType,
        sessionGoal: row.sessionGoal,
        estimatedDuration: row.estimatedDuration,
        intensity: row.intensity,
        isSingleWorkout: row.isSingleWorkout,
        exerciseName: row.exerciseName,
        exerciseId: row.exerciseId,
        order: row.order,
      })
    )
    .sort((a, b) =>
      a.week !== b.week ? a.week - b.week : a.day !== b.day ? a.day - b.day : a.order - b.order
    );
}
