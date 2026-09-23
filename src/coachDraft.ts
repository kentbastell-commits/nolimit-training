export type CoachDraft<T> = { schema: 1; id: string; revision: string; title: string; updatedAt: number; snapshot: T };
const prefix = "nl-coach-draft:v1:";
export const coachDraftKey = (owner: string, id: string) => `${prefix}${owner}:${encodeURIComponent(id)}`;

export function readCoachDrafts<T>(owner: string): CoachDraft<T>[] {
  const drafts: CoachDraft<T>[] = [];
  if (!owner) return drafts;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`${prefix}${owner}:`)) continue;
      try {
        const draft = JSON.parse(localStorage.getItem(key) || "null");
        const s = draft?.snapshot;
        if (draft?.schema === 1 && typeof draft.id === "string" && typeof draft.revision === "string"
          && typeof draft.title === "string" && Number.isFinite(draft.updatedAt) && s
          && typeof s.programName === "string" && Array.isArray(s.programSessions)
          && Array.isArray(s.selectedProgramExercises)
          && s.programSessions.every((day: any) => day && typeof day.localId === "string" && Array.isArray(day.exercises))) drafts.push(draft);
      } catch { /* a damaged draft must not block the coach workspace */ }
    }
  } catch { /* private browsing / storage unavailable */ }
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
}

// expectedRevision also protects drafts in another tab on this device.
export function writeCoachDraft<T>(owner: string, draft: CoachDraft<T>, expectedRevision: string | null): "saved" | "conflict" | "unavailable" {
  try {
    const key = coachDraftKey(owner, draft.id);
    const previous = JSON.parse(localStorage.getItem(key) || "null");
    if ((previous?.revision || null) !== expectedRevision) return "conflict";
    localStorage.setItem(key, JSON.stringify(draft));
    return "saved";
  } catch { return "unavailable"; }
}

export function removeCoachDraft(owner: string, id: string, revision: string): boolean {
  try {
    const key = coachDraftKey(owner, id);
    const current = JSON.parse(localStorage.getItem(key) || "null");
    if (current && current.revision !== revision) return false;
    localStorage.removeItem(key);
    return true;
  } catch { return false; }
}
