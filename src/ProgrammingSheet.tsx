import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import PortalToApp from "./PortalToApp";
import "./ProgrammingTools.css";

export default function ProgrammingSheet({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(close); closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("button,input,select,textarea")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); }
      if (e.key !== "Tab") return;
      const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select,textarea,[tabindex="0"]') || []).filter(el => el.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey, true); previous?.isConnected && previous.focus(); };
  }, []);
  return <PortalToApp><div className="programmingScrim" onClick={close}><section className="programmingSheet" ref={ref} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
    <header><h2>{title}</h2><button type="button" aria-label="Close" onClick={close}><X size={20} /></button></header><div className="programmingSheetBody">{children}</div>
  </section></div></PortalToApp>;
}
