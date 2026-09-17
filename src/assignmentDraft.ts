export type AssignmentDraft = { answers: Record<string, string>; comment: string };
const memory = new Map<string, AssignmentDraft>();
export const assignmentDraftKey = (client: string, assignment: string) => `nl-assignment-draft:${client}:${assignment}`;
export function readAssignmentDraft(key: string): AssignmentDraft | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    if (raw && typeof raw.answers === "object" && raw.answers && !Array.isArray(raw.answers)) {
      return { answers: Object.fromEntries(Object.entries(raw.answers).filter(([, v]) => typeof v === "string")) as Record<string, string>, comment: typeof raw.comment === "string" ? raw.comment : "" };
    }
  } catch { /* use the retained session draft */ }
  return memory.get(key) || null;
}
export function writeAssignmentDraft(key: string, draft: AssignmentDraft): boolean {
  memory.set(key, draft);
  try { localStorage.setItem(key, JSON.stringify(draft)); return true; } catch { return false; }
}
export function clearAssignmentDraft(key: string) {
  memory.delete(key);
  try { localStorage.removeItem(key); } catch { /* completed state takes priority on reopen */ }
}
