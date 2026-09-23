import "./WorkoutNotes.css";
import { ChevronDown } from "lucide-react";
import { parseExerciseCueSections } from "./appCore";

export default function WorkoutNotes({ title, notes }: { title: string; notes: string }) {
  const preview = notes.replace(/\s+/g, " ").trim();
  // Imported coaching notes commonly put these headings on their own line,
  // without a colon. Preserve the same section structure in that format.
  const structured = notes.replace(/^(Setup|Execution|Coaching cues|Key cues|准备姿势|起始姿势|动作执行|动作要点|注意事项)\s*$/gmi, "$1:");
  return <details className="workoutNotesDisclosure">
    <summary><span><strong>{title}</strong><small>{preview}</small></span><ChevronDown size={18} aria-hidden="true" /></summary>
    <div className="workoutNotesContent">{parseExerciseCueSections(structured).map((section, index) => <div key={index}>
      {section.title !== "Coaching Notes" && <h4>{section.title}</h4>}
      <p>{section.lines.join("\n")}</p>
    </div>)}</div>
  </details>;
}
