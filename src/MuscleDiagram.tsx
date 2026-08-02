import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ANTERIOR, POSTERIOR, MUSCLE_LABELS } from "./muscleGroups";
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
  const [view, setView] = useState<"front" | "back">("front");
  const interactive = Boolean(onToggle);
  const isZh = i18n.language?.startsWith("zh");
  const selectedSet = new Set(selected);
  const regions = view === "front" ? ANTERIOR : POSTERIOR;

  return (
    <div className={`muscleDiagram ${interactive ? "" : "readOnly"} ${className || ""}`}>
      <div className="muscleDiagramViewToggle">
        <button
          type="button"
          className={view === "front" ? "active" : ""}
          onClick={() => setView("front")}
        >
          {t("muscleDiagramFront")}
        </button>
        <button
          type="button"
          className={view === "back" ? "active" : ""}
          onClick={() => setView("back")}
        >
          {t("muscleDiagramBack")}
        </button>
      </div>
      <svg
        className="muscleDiagramSvg"
        viewBox="0 0 100 200"
        role="img"
        aria-label={t("muscleDiagramAriaLabel")}
      >
        {/* Decorative silhouette — head + limb/torso contour lines, never
            selectable, just gives the muscle polygons a body to sit on. */}
        <ellipse className="muscleDiagramHead" cx="50" cy="13" rx="9" ry="12" />
        <path
          className="muscleDiagramOutline"
          d="M 20,40 L 15,90 L 10,196 M 80,40 L 85,90 L 90,196 M 25,55 L 22,150 L 20,196 M 75,55 L 78,150 L 80,196"
        />
        {regions.map((region) =>
          region.svgPoints.map((points, i) => {
            const isSelected = selectedSet.has(region.muscle);
            const cls =
              "muscleDiagramRegion" +
              (isSelected ? " isSelected" : "") +
              (interactive ? " isInteractive" : "");
            return (
              <polygon
                key={`${region.muscle}-${i}`}
                points={points}
                className={cls}
                onClick={
                  interactive ? () => onToggle?.(region.muscle) : undefined
                }
              >
                <title>
                  {MUSCLE_LABELS[region.muscle]
                    ? isZh
                      ? MUSCLE_LABELS[region.muscle].cn
                      : MUSCLE_LABELS[region.muscle].en
                    : region.muscle}
                </title>
              </polygon>
            );
          })
        )}
      </svg>
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
