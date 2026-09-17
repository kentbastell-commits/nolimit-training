import * as pg from "../pg/contentResponses.ts";
import type { ResponseDTO } from "../dto.ts";
import { getCachedOrLoad, invalidateCache } from "../../../api/_cache.ts";

export type SubmitContentResponseInput = {
  assignmentType: string;
  assignmentId?: string;
  // Feishu record_id of the assignment row; the AF-/AT- code on Postgres.
  assignmentRecordId?: string;
  templateId: string;
  // Feishu: client record_id or code (stored as text); Postgres: CL-… code.
  clientId: string;
  clientName?: string;
  responses: any[];
};

// HTTP-shaped ({status, body}) — the old handler produced many distinct
// error bodies, so the impls build the exact response and the handler
// forwards it verbatim.
export type SubmitContentResponseResult = {
  status: number;
  body: Record<string, any>;
};

// Each client scope is filtered in SQL before caching. Expand questionnaire
// answers for both clients and coaches; form/test writes invalidate all scopes.
export async function getContentResponses(clientId = "", clientName = ""): Promise<ResponseDTO[]> {
  const all = await getCachedOrLoad<ResponseDTO[]>(`contentResponses:${JSON.stringify([clientId, clientName])}`, 5 * 60 * 1000,
    () => pg.listAllResponses(clientId, clientName));

  return all
    .flatMap((item) => {
      if (item.responseType !== "Questionnaire" || !item.answersJson) return [item];
      try {
        const answers = JSON.parse(item.answersJson);
        if (!Array.isArray(answers)) return [item];
        let translated: any[] = [];
        try { const parsed = JSON.parse(item.answersJsonEn || "[]"); if (Array.isArray(parsed)) translated = parsed; } catch { /* original remains readable */ }
        return answers.map((answer: any, index: number) => ({
          ...item,
          recordId: `${item.recordId}-${answer.questionId || index}`,
          itemId: String(answer.questionId || answer.itemId || index + 1),
          label: String(answer.label || item.label || "Answer"),
          answer: String(answer.value ?? answer.answer ?? ""),
          answerEn: String(translated[index]?.value ?? translated[index]?.answer ?? ""),
          labelEn: String(translated[index]?.label ?? ""),
          unit: String(answer.unit || item.unit || ""),
        }));
      } catch {
        return [item];
      }
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function submitContentResponse(
  input: SubmitContentResponseInput
): Promise<SubmitContentResponseResult> {
  const result =
    await pg.submitContentResponse(input);

  // Only a full success reaches these caches (matches the old handler, which
  // invalidated right before its 200).
  if (result.status === 200) {
    invalidateCache("contentResponses");
    invalidateCache("athleteMetrics");
    invalidateCache("contentAssignments");
    if (result.body.isIntake) invalidateCache("clients");
  }
  return result;
}
