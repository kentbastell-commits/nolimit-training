import { useEffect, useRef, useState } from "react";
const prefix = (owner: string, kind: string) => `nl-coach-reply:v1:${owner}:${kind}:`;
export function readReplyDrafts(owner: string, kind: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!owner) return result;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith(prefix(owner, kind))) {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      if (typeof value === "string") result[decodeURIComponent(key.slice(prefix(owner, kind).length))] = value;
    }
  }
  return result;
}
export function persistReplyDrafts(owner: string, kind: string, previous: Record<string, string>, next: Record<string, string>) {
  let conflict = false;
  const persisted = { ...previous };
  try {
    for (const id of new Set([...Object.keys(previous), ...Object.keys(next)])) {
      if (previous[id] === next[id]) continue;
      const key = prefix(owner, kind) + encodeURIComponent(id);
      const existing = JSON.parse(localStorage.getItem(key) || "null");
      if ((existing ?? undefined) !== previous[id] && existing !== next[id]) { conflict = true; continue; }
      if (next[id] === undefined || next[id] === "") { localStorage.removeItem(key); delete persisted[id]; }
      else { localStorage.setItem(key, JSON.stringify(next[id])); persisted[id] = next[id]; }
    }
    return { status: conflict ? "conflict" : "saved", persisted };
  } catch { return { status: "unavailable", persisted }; }
}

export default function useCoachReplyDrafts(owner: string, kind: string) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const loaded = useRef("");
  const hydrating = useRef(false);
  const persisted = useRef<Record<string, string>>({});
  const latest = useRef(values); latest.current = values;
  useEffect(() => {
    if (!owner) return;
    try {
      const saved = readReplyDrafts(owner, kind);
      persisted.current = saved; loaded.current = owner; hydrating.current = true;
      setValues(saved); setStatus("saved");
    } catch { setStatus("unavailable"); }
  }, [owner, kind]);
  useEffect(() => {
    if (!owner || loaded.current !== owner) return;
    // The hydration render is never an instruction to erase existing drafts.
    if (hydrating.current) { hydrating.current = false; return; }
    const flush = () => {
      const result = persistReplyDrafts(owner, kind, persisted.current, latest.current);
      persisted.current = result.persisted; setStatus(result.status);
    };
    flush();
    const background = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", background);
    return () => document.removeEventListener("visibilitychange", background);
  }, [owner, kind, values]);
  return [values, setValues, status] as const;
}
