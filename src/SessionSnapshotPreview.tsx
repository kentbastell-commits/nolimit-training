import { useTranslation } from "react-i18next";
import { exercisePrescription, parseExerciseNotes } from "./appCore";
import WorkoutNotes from "./WorkoutNotes";
import "./CalendarDraftControls.css";

export type SessionSnapshot = { workout: { sessionName?: string; sessionNameCn?: string; coachNotes?: string; coachNotesCn?: string; scheduledDate?: string | number | null; sessionType?: string | null; sessionGoal?: string | null; intensity?: string | null; estimatedDuration?: string | number | null }; templates: any[]; program?: any };
export default function SessionSnapshotPreview({ snapshot }: { snapshot: SessionSnapshot }) {
  const { i18n } = useTranslation(); const zh = i18n.language.startsWith("zh");
  const rows = [...snapshot.templates].sort((a, b) => Number(a.order) - Number(b.order));
  const notes = (zh ? snapshot.workout.coachNotesCn : "") || snapshot.workout.coachNotes || rows[0]?.sessionNotes;
  return <section className="sessionSnapshotPreview workoutGlancePanel">
    <h3>{(zh ? snapshot.workout.sessionNameCn : "") || snapshot.workout.sessionName}</h3>
    {notes && <WorkoutNotes title={zh ? "训练说明" : "Session notes"} notes={notes} />}
    {rows.map((row, index) => {
      const meta = parseExerciseNotes(row.notes || ""), previous = index ? parseExerciseNotes(rows[index - 1].notes || "") : null;
      const circuit = meta.groupType === "Circuit" && meta.groupName;
      const circuitStart = circuit && (previous?.groupName !== meta.groupName || previous?.groupType !== meta.groupType);
      const members = [row];
      if (circuitStart) for (const next of rows.slice(index + 1)) {
        const m = parseExerciseNotes(next.notes || ""); if (m.groupName !== meta.groupName || m.groupType !== "Circuit") break; members.push(next);
      }
      const sets = row.setPrescriptions?.length ? row.setPrescriptions : meta.setPrescriptions || [];
      const cues = (zh ? row.notesCn : "") || meta.coachingNotes;
      return <div key={row.recordId || index} className="sessionSnapshotExercise">
        {meta.sectionName && meta.sectionName !== previous?.sectionName && <h4 className="workoutGlanceSection">{meta.sectionName}</h4>}
        {circuitStart && <div className="workoutGlanceCircuitHeader">{zh ? "循环" : "Circuit"} · {Math.max(...members.map(r => exercisePrescription(r, zh).sets), 1)} {zh ? "轮" : "rounds"}</div>}
        <div className="sessionSnapshotName"><span className="exerciseLabelBadge">{meta.exerciseLabel || index + 1}</span><div><strong>{(zh ? row.exerciseNameCn : "") || row.exerciseName}</strong><small>{exercisePrescription(row, zh).summary}</small></div></div>
        <details><summary>{zh ? "每组目标与教练提示" : "Set targets & coaching cues"}</summary>
          {sets.length ? <ol className="sessionSnapshotSets">{sets.map((s: any, i: number) => <li key={i}><strong>{zh ? `第 ${i + 1} 组` : `Set ${i + 1}`}</strong><span>{[
            s.reps && `${s.reps} ${zh ? "次" : "reps"}`, s.load, s.time && `${s.time} ${zh ? "秒" : "sec"}`, s.distance,
            s.percent && `${s.percent}% 1RM`, s.percentMas && `${s.percentMas}% MAS`, s.intensityValue && `${s.intensityMode || "HR"} ${s.intensityValue}`,
            s.rpe && `RPE ${s.rpe}`, s.rir && `RIR ${s.rir}`, s.tempo && `${zh ? "节奏" : "Tempo"} ${s.tempo}`, s.rest && `${zh ? "休息" : "Rest"} ${s.rest}`,
          ].filter(Boolean).join(" · ")}</span></li>)}</ol> : null}
          {cues && <WorkoutNotes title={zh ? "教练提示" : "Coach notes"} notes={cues} />}
        </details>
      </div>;
    })}
  </section>;
}
