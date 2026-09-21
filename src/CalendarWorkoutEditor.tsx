import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import PortalToApp from "./PortalToApp";
import "./CalendarWorkoutEditor.css";

export default function CalendarWorkoutEditor({ context, onClose, busy, children }: {
  context: { clientName: string; date: string } | null;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!context) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [context]);
  if (!context) return <>{children}</>;
  return (
    <PortalToApp>
      <div className="calendarWorkoutBackdrop" onClick={() => !busy && close.current()} />
      <div className="calendarWorkoutEditor" ref={panel} role="dialog" aria-modal="true"
        aria-label={t("calendarWorkoutEditor", { name: context.clientName })} tabIndex={-1}
        onKeyDown={(event) => {
          // Nested exercise/library sheets own their own keyboard handling.
          if (!event.currentTarget.contains(event.target as Node)) return;
          if (event.key === "Escape" && !busy) {
            event.stopPropagation(); close.current();
          }
          if (event.key === "Tab") {
            const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
            )).filter(node => node.getClientRects().length > 0);
            const first = nodes[0], last = nodes.at(-1);
            if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
              event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault(); first?.focus();
            }
          }
        }}>
        <div className="calendarWorkoutContext">
          <span>{t("calendarWorkoutOrigin", { name: context.clientName })} <span aria-hidden="true">·</span> {context.date}</span>
          <button type="button" disabled={busy} onClick={onClose} aria-label={t("backToAthleteCalendar")}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </PortalToApp>
  );
}
