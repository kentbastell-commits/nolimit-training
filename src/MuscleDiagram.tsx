import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BODY_BASE,
  BODY_VIEWBOX,
  BACK_SHAPES,
  FRONT_SHAPES,
  MUSCLE_LABELS,
  type BodyShape,
} from "./muscleGroups";
import "./MuscleDiagram.css";

interface MuscleDiagramProps {
  selected: string[];
  // Presence of onToggle is what makes the diagram editable — omit it for a
  // read-only display (the athlete-facing exercise info view).
  onToggle?: (key: string) => void;
  className?: string;
}

function renderShape(
  shape: BodyShape,
  isSelected: boolean,
  isBase: boolean,
  interactive: boolean,
  onClick?: () => void
) {
  const className = isBase
    ? "muscleDiagramBase"
    : `muscleDiagramRegion${isSelected ? " isSelected" : ""}${
        interactive ? " isInteractive" : ""
      }`;
  const props =
    shape.type === "ellipse"
      ? { cx: shape.cx, cy: shape.cy, rx: shape.rx, ry: shape.ry }
      : {
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          rx: shape.rx,
        };
  const Tag = shape.type;
  return (
    <Tag
      key={`${shape.key}-${JSON.stringify(props)}`}
      className={className}
      onClick={isBase ? undefined : onClick}
      {...(props as any)}
    />
  );
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
  const shapes = view === "front" ? FRONT_SHAPES : BACK_SHAPES;
  const selectedSet = new Set(selected);

  return (
    <div className={`muscleDiagram ${className || ""}`}>
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
        {BODY_BASE.map((shape) => renderShape(shape, false, true, false))}
        {shapes.map((shape) =>
          renderShape(
            shape,
            selectedSet.has(shape.key),
            false,
            interactive,
            () => onToggle?.(shape.key)
          )
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
