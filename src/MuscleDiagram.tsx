import { useId, useState } from "react";
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
  // Pattern ids must be unique per rendered instance — two diagrams on one
  // page (e.g. a future side-by-side view) would otherwise collide, since
  // url(#id) resolves against the whole document, not per-<svg>.
  const uid = useId().replace(/[:]/g, "");
  const dimPattern = `muscleHatchDim-${uid}`;
  const goldPattern = `muscleHatchGold-${uid}`;

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
      <div className="muscleDiagramCard">
        <svg
          className="muscleDiagramSvg"
          viewBox={BODY_VIEWBOX}
          role="img"
          aria-label={t("muscleDiagramAriaLabel")}
        >
          <defs>
            <pattern
              id={dimPattern}
              patternUnits="userSpaceOnUse"
              width="3"
              height="3"
              patternTransform="rotate(45)"
            >
              <rect width="3" height="3" fill="#4a4330" />
              <line x1="0" y1="0" x2="0" y2="3" stroke="#6b6247" strokeWidth="1" />
            </pattern>
            <pattern
              id={goldPattern}
              patternUnits="userSpaceOnUse"
              width="3"
              height="3"
              patternTransform="rotate(45)"
            >
              <rect width="3" height="3" fill="#c99a2e" />
              <line x1="0" y1="0" x2="0" y2="3" stroke="#ffe08a" strokeWidth="1" />
            </pattern>
          </defs>
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
                  fill={`url(#${isSelected ? goldPattern : dimPattern})`}
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
      </div>
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
