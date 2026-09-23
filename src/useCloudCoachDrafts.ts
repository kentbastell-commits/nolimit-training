import { useCallback, useEffect, useRef, useState } from "react";
import { readCoachDrafts, removeCoachDraft, writeCoachDraft, type CoachDraft } from "./coachDraft";
import { syncCoachDrafts, type DraftCloudStatus } from "./cloudCoachDrafts";

export function useCloudCoachDrafts<T>(owner: string, drafts: CoachDraft<T>[], activeId: () => string | undefined, update: (drafts: CoachDraft<T>[]) => void) {
  const [statuses, setStatuses] = useState<Record<string, DraftCloudStatus>>({});
  const [state, setState] = useState<DraftCloudStatus>("syncing");
  const live = useRef({ owner, activeId, update }); live.current = { owner, activeId, update };
  const refresh = useCallback(async () => {
    if (!owner) return;
    setState("syncing");
    try {
      const key = localStorage.getItem("nl_coach_key");
      if (!key) { setState("offline"); return; }
      const result = await syncCoachDrafts(owner, key, () => live.current.activeId());
      if (live.current.owner !== owner) return;
      setStatuses(result); setState(Object.values(result).includes("offline") ? "offline" : "synced");
      live.current.update(readCoachDrafts<T>(owner));
    } catch { if (live.current.owner === owner) setState("offline"); }
  }, [owner]);
  const revisions = drafts.map(d => `${d.id}:${d.revision}`).join("|");
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 1000); return () => clearTimeout(timer); }, [refresh, revisions]);
  useEffect(() => {
    const retry = () => { if (document.visibilityState !== "hidden") void refresh(); };
    window.addEventListener("online", retry); window.addEventListener("focus", retry); window.addEventListener("storage", retry);
    const timer = window.setInterval(retry, 30000);
    return () => { window.removeEventListener("online", retry); window.removeEventListener("focus", retry); window.removeEventListener("storage", retry); clearInterval(timer); };
  }, [refresh]);
  const keepBoth = (id: string) => {
    const draft = readCoachDrafts<T>(owner).find(d => d.id === id);
    if (!draft || live.current.activeId() === id) return;
    // Preserve this device's edits under a new identity, then download the other version.
    const copy = { ...draft, id: crypto.randomUUID(), revision: crypto.randomUUID(), cloudRevision: null, title: `${draft.title} · ${new Date().toLocaleString()}` };
    if (writeCoachDraft(owner, copy, null) !== "saved") return;
    removeCoachDraft(owner, draft.id, draft.revision, false);
    live.current.update(readCoachDrafts<T>(owner)); void refresh();
  };
  return { statuses, state, refresh, keepBoth };
}
