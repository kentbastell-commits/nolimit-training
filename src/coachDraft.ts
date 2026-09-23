export type CoachDraft<T> = { schema: 1; id: string; revision: string; title: string; updatedAt: number; snapshot: T; cloudRevision?: string | null };
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
    localStorage.setItem(key, JSON.stringify({ ...draft, cloudRevision: previous?.cloudRevision ?? draft.cloudRevision ?? null }));
    return "saved";
  } catch { return "unavailable"; }
}

export function removeCoachDraft(owner: string, id: string, revision: string, sync = true): boolean {
  try {
    const key = coachDraftKey(owner, id);
    const current = JSON.parse(localStorage.getItem(key) || "null");
    if (current && current.revision !== revision) return false;
    if (current && sync) {
      const pending = readDraftDeletions(owner);
      pending[id] = { revision: crypto.randomUUID(), localRevision: revision, cloudRevision: current.cloudRevision || null };
      localStorage.setItem(deletionKey(owner), JSON.stringify(pending));
    }
    localStorage.removeItem(key);
    return true;
  } catch { return false; }
}

const deletionKey = (owner: string) => `nl-coach-draft-delete:v1:${owner}`;
export type DraftDeletion = { revision: string; localRevision: string; cloudRevision: string | null };
export function readDraftDeletions(owner: string): Record<string, DraftDeletion> {
  try { return JSON.parse(localStorage.getItem(deletionKey(owner)) || "{}"); } catch { return {}; }
}
export function clearDraftDeletion(owner: string, id: string, revision: string) {
  const pending = readDraftDeletions(owner);
  if (pending[id]?.revision !== revision) return;
  delete pending[id]; localStorage.setItem(deletionKey(owner), JSON.stringify(pending));
}
export function acknowledgeCoachDraft(owner: string, id: string, revision: string, expectedCloud: string | null) {
  const key = coachDraftKey(owner, id), current = JSON.parse(localStorage.getItem(key) || "null");
  if (current && (current.cloudRevision || null) === expectedCloud) localStorage.setItem(key, JSON.stringify({ ...current, cloudRevision: revision }));
  const pending = readDraftDeletions(owner);
  if (pending[id] && pending[id].cloudRevision === expectedCloud) {
    pending[id].cloudRevision = revision; localStorage.setItem(deletionKey(owner), JSON.stringify(pending));
  }
}
export function acceptCloudDraft<T>(owner: string, draft: CoachDraft<T>, expectedLocal: string | null): boolean {
  const key = coachDraftKey(owner, draft.id), current = JSON.parse(localStorage.getItem(key) || "null");
  if ((current?.revision || null) !== expectedLocal) return false;
  localStorage.setItem(key, JSON.stringify({ ...draft, schema: 1, cloudRevision: draft.revision }));
  return true;
}
