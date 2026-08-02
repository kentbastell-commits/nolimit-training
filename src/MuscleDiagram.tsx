import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ANTERIOR, POSTERIOR, MUSCLE_LABELS, BODY_VIEWBOX } from "./muscleGroups";
import outlineFront from "./assets/muscleOutlineFront.png";
import outlineBack from "./assets/muscleOutlineBack.png";
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
  const outline = view === "front" ? outlineFront : outlineBack;

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
        viewBox={BODY_VIEWBOX}
        role="img"
        aria-label={t("muscleDiagramAriaLabel")}
      >
        <image
          href={outline}
          x="0"
          y="0"
          width="100"
          height="290"
          preserveAspectRatio="none"
          className="muscleDiagramOutline"
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
