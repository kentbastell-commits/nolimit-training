import { useState } from "react";
import { useTranslation } from "react-i18next";
import Model, { type IExerciseData, type IMuscleStats } from "react-body-highlighter";
import { MUSCLE_LABELS } from "./muscleGroups";
import "./MuscleDiagram.css";

interface MuscleDiagramProps {
  selected: string[];
  // Presence of onToggle is what makes the diagram editable — omit it for a
  // read-only display (the athlete-facing exercise info view).
  onToggle?: (key: string) => void;
  className?: string;
}

export default function MuscleDiagram({
  selected,
  onToggle,
  className,
}: MuscleDiagramProps) {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<"anterior" | "posterior">("anterior");
  const interactive = Boolean(onToggle);
  const isZh = i18n.language?.startsWith("zh");

  // The library is built around "exercises worked these muscles" (with a
  // frequency-based color ramp) rather than a plain multi-select — a single
  // synthetic entry with every selected muscle at frequency 1 gets the same
  // toggle-picker behavior we need, using only highlightedColors[0].
  const data: IExerciseData[] = [
    { name: "target-muscles", muscles: selected as IExerciseData["muscles"] },
  ];

  return (
    <div className={`muscleDiagram ${interactive ? "" : "readOnly"} ${className || ""}`}>
      <div className="muscleDiagramViewToggle">
        <button
          type="button"
          className={view === "anterior" ? "active" : ""}
          onClick={() => setView("anterior")}
        >
          {t("muscleDiagramFront")}
        </button>
        <button
          type="button"
          className={view === "posterior" ? "active" : ""}
          onClick={() => setView("posterior")}
        >
          {t("muscleDiagramBack")}
        </button>
      </div>
      <Model
        type={view}
        data={data}
        bodyColor="#d9d3c2"
        highlightedColors={["#d4af37"]}
        style={{ width: "100%", maxWidth: 190, margin: "0 auto" }}
        onClick={
          interactive
            ? ({ muscle }: IMuscleStats) => onToggle?.(muscle)
            : undefined
        }
      />
      {interactive && (
        <p className="muscleDiagramHint">{t("muscleDiagramHint")}</p>
      )}
      {selected.length > 0 && (
        <div className="muscleDiagramChips">
          {selected.map((key) => {
            const label = MUSCLE_LABELS[key];
            if (!label) return null;
            return (
              <span key={key} className="muscleDiagramChip">
                {isZh ? label.cn : label.en}
                {interactive && (
                  <button
                    type="button"
                    aria-label={t("removeMuscle", {
                      muscle: isZh ? label.cn : label.en,
                    })}
                    onClick={() => onToggle?.(key)}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
