import { DATA_BACKEND } from "../backend.ts";
import * as feishu from "../feishu/contentAssignments.ts";
import { getCached, setCached, invalidateCache } from "../../../api/_cache.ts";

// Assigned questionnaires + physical tests (Feishu: Assigned Forms / Assigned
// Tests tables; Postgres: assigned_forms / assigned_tests). The unfiltered
// merged list is cached under "contentAssignments" (5 min); every writer in
// this domain (and submitContentResponse, which marks assignments completed)
// invalidates that key.

export type ContentAssignmentDTO = {
  recordId: string;
  assignmentId: string;
  assignmentType: string;
  templateId: string;
  templateName: string;
  clientId: string;
  clientCode: string;
  clientName: string;
  assignedDate: string;
  dueDate: string;
  status: string;
};

export type AssignContentInput = {
  assignmentType: string;
  templateId: string;
  templateName?: string;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  assignedDate?: string;
  dueDate?: string;
};

export type AssignContentResult =
  | { success: true; recordId: string; larkResponse?: any }
  | { success: false; kind: "no-columns"; availableFields: string[] }
  | {
      success: false;
      kind: "create-failed";
      larkResponse: any;
      fieldsSent: Record<string, any>;
    };

export type UpdateAssignmentDateInput = {
  assignmentType: string;
  recordId: string;
  scheduledDate: string;
};

export type UpdateAssignmentDateResult =
  | {
      success: true;
      updatedFields: string[];
      failedFields: { fieldName: string; response: any }[];
    }
  | { success: false; kind: "no-date-column"; availableFields: string[] }
  | {
      success: false;
      kind: "update-failed";
      attemptedFields: string[];
      failedFields: { fieldName: string; response: any }[];
    };

export async function getContentAssignments(
  clientId = "",
  clientCode = "",
  clientName = ""
): Promise<ContentAssignmentDTO[]> {
  let all = getCached<ContentAssignmentDTO[]>("contentAssignments");
  if (!all) {
    const raw =
      DATA_BACKEND === "postgres"
        ? await (await import("../pg/contentAssignments.ts")).listContentAssignments()
        : await feishu.listContentAssignments();
    // Completely empty rows are dropped before caching (matches the old handler).
    all = raw.filter((assignment) =>
      Boolean(
        assignment.templateId ||
          assignment.templateName ||
          assignment.clientId ||
          assignment.clientCode ||
          assignment.clientName ||
          assignment.assignedDate ||
          assignment.dueDate
      )
    );
    setCached("contentAssignments", all, 5 * 60 * 1000);
  }

  const requestedClientId = clientId.toLowerCase();
  const requestedClientCode = clientCode.toLowerCase();
  const requestedClientName = clientName.toLowerCase();

  return all.filter((assignment) => {
    if (!requestedClientId && !requestedClientCode && !requestedClientName) {
      return true;
    }

    const assignmentClientId = assignment.clientId.toLowerCase();
    const assignmentClientCode = assignment.clientCode.toLowerCase();
    const assignmentClientName = assignment.clientName.toLowerCase();

    return (
      (Boolean(requestedClientId) && assignmentClientId.includes(requestedClientId)) ||
      (Boolean(requestedClientCode) && assignmentClientCode === requestedClientCode) ||
      (Boolean(requestedClientName) && assignmentClientName === requestedClientName)
    );
  });
}

export async function assignContent(
  input: AssignContentInput
): Promise<AssignContentResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (await import("../pg/contentAssignments.ts")).assignContent(input)
      : await feishu.assignContent(input);
  if (result.success) invalidateCache("contentAssignments");
  return result;
}

export async function updateContentAssignmentDate(
  input: UpdateAssignmentDateInput
): Promise<UpdateAssignmentDateResult> {
  const result =
    DATA_BACKEND === "postgres"
      ? await (
          await import("../pg/contentAssignments.ts")
        ).updateContentAssignmentDate(input)
      : await feishu.updateContentAssignmentDate(input);
  if (result.success) invalidateCache("contentAssignments");
  return result;
}
