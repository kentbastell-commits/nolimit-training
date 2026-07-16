import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/contentResponses.ts";
import type { ResponseDTO } from "../dto.ts";
import { getCached, setCached } from "../../../api/_cache.ts";

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
