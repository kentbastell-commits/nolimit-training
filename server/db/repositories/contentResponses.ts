import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/contentResponses.ts";
import type { ResponseDTO } from "../dto.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

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

// Expansion of questionnaire answersJson + client filter + sort are
// backend-agnostic, so they live here. The unfiltered list is cached (5 min);
// form/test submit endpoints invalidate "contentResponses".
export async function getContentResponses(clientId = "", clientName = ""): Promise<ResponseDTO[]> {
  let all = getCached<ResponseDTO[]>("contentResponses");
  if (!all) {
    all =
      DATA_BACKEND === "postgres"
        ? await (await import("../pg/contentResponses.ts")).listAllResponses()
        : await feishu.listAllResponses();
    setCached("contentResponses", all, 5 * 60 * 1000);
  }

  const reqId = clientId.toLowerCase();
  const reqName = clientName.toLowerCase();

  return all
    .flatMap((item) => {
      if (item.responseType !== "Questionnaire" || !item.answersJson) return [item];
      try {
        const answers = JSON.parse(item.answersJson);
        if (!Array.isArray(answers)) return [item];
        return answers.map((answer: any, index: number) => ({
          ...item,
          recordId: `${item.recordId}-${answer.questionId || index}`,
          itemId: String(answer.questionId || answer.itemId || index + 1),
          label: String(answer.label || item.label || "Answer"),
          answer: String(answer.value || answer.answer || ""),
          unit: String(answer.unit || item.unit || ""),
        }));
      } catch {
        return [item];
      }
    })
    .filter((item) => {
      if (!reqId && !reqName) return true;
      return (
        (Boolean(reqId) && item.clientId.toLowerCase().includes(reqId)) ||
        (Boolean(reqName) && item.clientName.toLowerCase() === reqName)
      );
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function submitContentResponse(
  input: SubmitContentResponseInput
): Promise<SubmitContentResponseResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/contentResponses.ts")).submitContentResponse(input)
      : await feishu.submitContentResponse(input);

  // Only a full success reaches these caches (matches the old handler, which
  // invalidated right before its 200).
  if (result.status === 200) {
    invalidateCache("contentResponses");
    invalidateCache("athleteMetrics");
    invalidateCache("contentAssignments");
  }
  return result;
}
