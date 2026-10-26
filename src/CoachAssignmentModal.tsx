import { useEffect, useRef, useState } from "react";
import { assignmentValues, coachKey, resolveCoach, type AssignmentAthlete, type AssignmentCoach } from "./coachAssignment";
import "./CoachAssignmentModal.css";

export type CoachAssignmentPayload = { clientRecordId: string; coach: string; primaryCoachId: string; secondaryCoachId: string };

export default function CoachAssignmentModal({ athletes, coaches, athlete, presetCoach, zh = false, close, save }: {
  athletes: AssignmentAthlete[]; coaches: AssignmentCoach[]; athlete?: AssignmentAthlete; presetCoach?: AssignmentCoach; zh?: boolean;
  close: () => void; save: (payload: CoachAssignmentPayload) => Promise<void>;
}) {
  const tr = (en: string, cn: string) => zh ? cn : en;
  const [athleteId, setAthleteId] = useState(athlete?.id || "");
  const [search, setSearch] = useState("");
  const [values, setValues] = useState(() => athlete ? assignmentValues(athlete, coaches) : { primaryCoachId: presetCoach ? coachKey(presetCoach) : "", secondaryCoachId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    const root = dialog.current!;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) close();
      if (e.key === "Tab") {
        const items = Array.from(root.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled)"));
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); };
  }, [busy, close]);
  const selectAthlete = (id: string) => {
    setAthleteId(id);
    const selected = athletes.find(a => a.id === id);
    const next = selected ? assignmentValues(selected, coaches) : { primaryCoachId: "", secondaryCoachId: "" };
    if (presetCoach) next.primaryCoachId = coachKey(presetCoach);
    if (next.primaryCoachId === next.secondaryCoachId) next.secondaryCoachId = "";
    setValues(next);
    setError("");
  };
  const options = (current: string, exclude: string) => {
    const available = coaches.filter(c => c.status !== "Inactive" || coachKey(c) === current);
    return <>
      {current && !available.some(c => coachKey(c) === current) && <option value={current}>{current}</option>}
      {available.map(c => <option key={coachKey(c)} value={coachKey(c)} disabled={coachKey(c) === exclude}>{c.name}{c.status === "Inactive" ? tr(" (inactive)", "（停用）") : ""}</option>)}
    </>;
  };
  const submit = async () => {
    if (!athleteId || busy) return;
    if (values.primaryCoachId && values.primaryCoachId === values.secondaryCoachId) { setError(tr("Choose different primary and supporting coaches.", "主教练和辅助教练不能相同。")); return; }
    setBusy(true); setError("");
    try {
      await save({ clientRecordId: athleteId, ...values, coach: resolveCoach(values.primaryCoachId, coaches)?.name || values.primaryCoachId });
      close();
    } catch (e) { setError(e instanceof Error ? e.message : tr("Could not save assignment. Try again.", "分配保存失败，请重试。")); }
    finally { setBusy(false); }
  };
  return <div className="coachAssignScrim" onClick={() => { if (!busy) close(); }}>
    <div className="coachAssignDialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="coach-assign-title" onClick={e => e.stopPropagation()}>
      <header><div><h2 id="coach-assign-title">{tr("Assign coaches", "分配教练")}</h2><p>{(athlete ? `${athlete.name}${athlete.coachAlias ? ` · ${athlete.coachAlias}` : ""}` : "") || presetCoach?.name || tr("Choose an athlete and their coaches.", "选择运动员及其教练。")}</p></div><button type="button" onClick={close} disabled={busy} aria-label={tr("Close assignment", "关闭分配")}>×</button></header>
      {!athlete && <>
        <label>{tr("Find athlete", "搜索运动员")}<input value={search} onChange={e => setSearch(e.target.value)} disabled={busy} placeholder={tr("Name or athlete code", "姓名或运动员编号")} /></label>
        <label>{tr("Athlete", "运动员")}<select value={athleteId} onChange={e => selectAthlete(e.target.value)} disabled={busy}><option value="">{tr("Choose athlete", "选择运动员")}</option>{athletes.filter(a => a.id === athleteId || `${a.name} ${a.coachAlias || ""} ${a.clientCode || a.id}`.toLowerCase().includes(search.toLowerCase())).map(a => <option key={a.id} value={a.id}>{a.name}{a.coachAlias ? ` · ${a.coachAlias}` : ""} · {a.clientCode || a.id}</option>)}</select></label>
      </>}
      <label>{tr("Primary coach", "主教练")}<select value={values.primaryCoachId} disabled={busy} onChange={e => setValues({ ...values, primaryCoachId: e.target.value, secondaryCoachId: e.target.value === values.secondaryCoachId ? "" : values.secondaryCoachId })}><option value="">{tr("Unassigned", "待分配")}</option>{options(values.primaryCoachId, "")}</select></label>
      <label>{tr("Supporting coach", "辅助教练")}<select value={values.secondaryCoachId} disabled={busy} onChange={e => setValues({ ...values, secondaryCoachId: e.target.value })}><option value="">{tr("None", "无")}</option>{options(values.secondaryCoachId, values.primaryCoachId)}</select></label>
      <p className="coachAssignHint">{tr("New signups stay unassigned until a coach is selected. Saving updates the athlete’s coach in the miniprogram.", "新注册运动员在选择教练前保持待分配状态。保存后，小程序会显示所分配的教练。")}</p>
      {error && <p role="alert">{error}</p>}
      <footer><button type="button" onClick={close} disabled={busy}>{tr("Cancel", "取消")}</button><button type="button" className="coachAssignSave" disabled={busy || !athleteId} onClick={() => void submit()}>{busy ? tr("Saving…", "保存中…") : tr("Save assignment", "保存分配")}</button></footer>
    </div>
  </div>;
}
