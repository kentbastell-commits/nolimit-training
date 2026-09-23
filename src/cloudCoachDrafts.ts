import { acceptCloudDraft, acknowledgeCoachDraft, clearDraftDeletion, readCoachDrafts, readDraftDeletions, removeCoachDraft, type CoachDraft } from "./coachDraft";
export type RemoteDraft = CoachDraft<any> & { deleted: boolean };
export type DraftCloudStatus = "synced" | "conflict" | "offline" | "syncing";

export function draftSyncAction(local: CoachDraft<any> | undefined, remote: RemoteDraft | undefined, active: boolean) {
  if (!local) return remote && !remote.deleted ? "download" : "none";
  if (local.revision === remote?.revision) return "ack";
  if (!remote) return local.cloudRevision ? "conflict" : "upload";
  if (local.revision === local.cloudRevision && !active) return remote.deleted ? "remove" : "download";
  if (!remote.deleted && remote.revision === local.cloudRevision) return "upload";
  return "conflict";
}

// Serialize within this tab. The API's revision check handles other devices/tabs.
const running = new Map<string, Promise<Record<string, DraftCloudStatus>>>();
export function syncCoachDrafts(owner: string, key: string, activeId: () => string | undefined): Promise<Record<string, DraftCloudStatus>> {
  const prior = running.get(owner); if (prior) return prior;
  const task = (async () => {
    const request = async (body?: unknown) => {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
      let response: Response;
      try { response = await fetch("/api/coachDrafts", { signal: controller.signal, method: body ? "POST" : "GET", headers: { "x-coach-key": key, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
      finally { clearTimeout(timeout); }
      if (!response.ok) throw Object.assign(new Error("Draft sync failed"), { status: response.status });
      return response.json();
    };
    const data = await request();
    if (!Array.isArray(data.drafts)) throw new Error("Invalid draft response");
    const remote = new Map<string, RemoteDraft>(data.drafts.map((d: RemoteDraft) => [d.id, d]));
    const status: Record<string, DraftCloudStatus> = {};
    // A durable tombstone prevents an offline device resurrecting a published draft.
    for (const [id, pending] of Object.entries(readDraftDeletions(owner))) {
      const saved = remote.get(id);
      if (saved?.deleted) { clearDraftDeletion(owner, id, pending.revision); continue; }
      if (saved && saved.revision !== pending.cloudRevision && saved.revision !== pending.localRevision) {
        // Another device owns newer work. Keep its draft instead of deleting it.
        clearDraftDeletion(owner, id, pending.revision); continue;
      }
      try {
        // Even a never-uploaded draft needs a tombstone: another tab may have
        // started its first upload just before this deletion.
        const result = await request({ id, revision: pending.revision, expectedRevision: saved?.revision || null, deleted: true });
        remote.set(id, result.draft); clearDraftDeletion(owner, id, pending.revision);
      } catch (error: any) { status[id] = error.status === 409 ? "conflict" : "offline"; }
    }
    const ids = new Set([...readCoachDrafts(owner).map(d => d.id), ...remote.keys()]);
    for (const id of ids) {
      if (readDraftDeletions(owner)[id]) continue;
      const local = readCoachDrafts(owner).find(d => d.id === id), saved = remote.get(id);
      const action = draftSyncAction(local, saved, activeId() === id);
      try {
        if (action === "ack") acknowledgeCoachDraft(owner, id, saved!.revision, local!.cloudRevision || null);
        if (action === "download") acceptCloudDraft(owner, saved!, local?.revision || null);
        if (action === "remove") removeCoachDraft(owner, id, local!.revision, false);
        if (action === "upload") {
          const result = await request({ ...local!, expectedRevision: local!.cloudRevision || null });
          acknowledgeCoachDraft(owner, id, result.draft.revision, local!.cloudRevision || null);
        }
        status[id] = action === "conflict" ? "conflict" : "synced";
      } catch (error: any) { status[id] = error.status === 409 ? "conflict" : "offline"; }
    }
    return status;
  })().finally(() => running.delete(owner));
  running.set(owner, task); return task;
}
