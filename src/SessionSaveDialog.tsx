import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import PortalToApp from "./PortalToApp";
import { reconcileAssignedSession, type RecoveryChoice, type SessionRecovery } from "./assignedSessionRecovery";
import { exercisePrescription, type ProgramSession, type ProgramExercise } from "./appCore";
import "./SessionSaveDialog.css";

export function SessionSaveDialog({ title, children, onClose, busy }: { title: string; children: ReactNode; onClose: () => void; busy: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <PortalToApp><div className="sessionSaveScrim" onClick={() => !busy && onClose()}>
    <div className="sessionSaveDialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}
      onClick={e => e.stopPropagation()} onKeyDown={e => {
        e.stopPropagation();
        if (e.key === "Escape" && !busy) onClose();
        if (e.key === "Tab") {
          const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, [tabindex="0"]'));
          const first = nodes[0], last = nodes.at(-1);
          if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }}><h2>{title}</h2>{children}</div>
  </div></PortalToApp>;
}

export default function AssignedSessionRecoveryDialog({ recovery, busy, onClose, onPublish, privateDraft = false }: {
  recovery: SessionRecovery; busy: boolean; onClose: () => void; onPublish: (session: ProgramSession) => void; privateDraft?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [choices, setChoices] = useState<Record<string, RecoveryChoice>>({});
  const result = reconcileAssignedSession(recovery, choices);
  const exerciseText = (e: ProgramExercise) => {
    const zh = i18n.language.startsWith("zh");
    let prescription = exercisePrescription(e, zh).summary;
    if (e.trackingType === "Time" || e.trackingType === "Distance") {
      const values = (e.setPrescriptions?.length ? e.setPrescriptions : [{ reps: e.reps }]).map(s => {
        const value = s.reps || (e.trackingType === "Time" ? s.time : s.distance) || "—";
        const clock = value.match(/^(\d+):(\d{2})$/);
        return clock ? `${Number(clock[1])} ${zh ? "分" : "min"} ${Number(clock[2])} ${zh ? "秒" : "sec"}` : value;
      });
      prescription = [t("recoverySets", { count: e.setPrescriptions?.length || Number(e.sets) }), [...new Set(values)].join(" / ")].join(" · ");
    }
    const intensities = [...new Set((e.setPrescriptions || []).filter(s => s.intensityValue).map(s =>
      s.intensityMode === "hr" ? `${s.intensityValue} bpm` : `${s.intensityValue} ${s.intensityMode === "mas" ? "%MAS" : "RPE"}`))];
    const rows = e.setPrescriptions || [];
    const values = (field: "load" | "percent" | "percentMas" | "tempo" | "rpe" | "rir", fallback = "") =>
      [...new Set(rows.map(s => s[field]).filter(Boolean))].join(" / ") || fallback;
    const load = values("load", e.load), tempo = values("tempo", e.tempo);
    return [e.exerciseName, prescription, ...intensities,
      load && `${t("recoveryLoad")}: ${load}`, values("percent") && `${values("percent")}%1RM`,
      values("percentMas") && `${values("percentMas")}%MAS`, values("rpe") && `RPE ${values("rpe")}`, values("rir") && `RIR ${values("rir")}`,
      tempo && `${t("recoveryTempo")}: ${tempo}`,
      e.rest && `${t("rest")} ${e.rest}${/^\d+$/.test(e.rest) ? zh ? "秒" : " sec" : ""}`].filter(Boolean).join(" · ");
  };
  const describe = (value: unknown): string => {
    if (Array.isArray(value)) return value.map(exerciseText).join("\n");
    if (value && typeof value === "object") {
      const e = value as ProgramExercise;
      return [exerciseText(e), e.coachingNotes, e.coachingNotesCn,
        ...(e.setPrescriptions || []).map((s, i) => `${t("recoverySet", { count: i + 1 })}: ${exerciseText({ ...e, exerciseName: "", sets: "1", reps: s.reps || "", rest: s.rest || "", load: s.load || "", tempo: s.tempo || "", setPrescriptions: [s] })}`)].filter(Boolean).join("\n");
    }
    return value == null || value === "" ? t("recoveryRemoved") : String(value);
  };
  return <SessionSaveDialog title={t("recoveryTitle")} onClose={onClose} busy={busy}>
    <p>{t("recoveryHint")}</p>
    {result.conflicts.map(conflict => <fieldset key={conflict.key} disabled={busy}>
      <legend>{conflict.key.startsWith("exercise:") ? conflict.label : t(`recoveryField_${conflict.label}`)}</legend>
      <p>{t("recoveryChoose")}</p>
      {(["draft", "latest"] as const).map(choice => <label className="sessionRecoveryChoice" key={choice}>
        <input type="radio" name={conflict.key} checked={choices[conflict.key] === choice} onChange={() => setChoices(c => ({ ...c, [conflict.key]: choice }))} />
        <span><strong>{t(choice === "draft" ? "recoveryMine" : "recoveryLatest")}</strong><span className="sessionRecoveryValue">{describe(conflict[choice])}</span></span>
      </label>)}
    </fieldset>)}
    <h3>{t("recoveryPreview")}</h3>
    <ol className="sessionRecoveryPreview">{result.session.exercises.map((e, i) => <li key={i}>{exerciseText(e)}</li>)}</ol>
    {result.session.sessionNotes && <details><summary>{t("recoveryField_sessionNotes")}</summary><p className="sessionRecoveryValue">{result.session.sessionNotes}</p></details>}
    <div className="sessionSaveActions">
      <button type="button" className="sessionSavePrimary" disabled={busy || result.unresolved > 0 || !result.session.exercises.length} onClick={() => onPublish(result.session)}>{privateDraft ? (i18n.language.startsWith("zh") ? (busy ? "正在保存…" : "保存检查后的草稿") : (busy ? "Saving…" : "Save reviewed draft")) : t(busy ? "recoveryPublishing" : "recoveryPublish")}</button>
      <button type="button" disabled={busy} onClick={onClose}>{t("recoveryContinue")}</button>
    </div>
  </SessionSaveDialog>;
}
