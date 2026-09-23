import { useEffect, useRef } from "react";

export type CoachLocation = { page: string; client: string; tab: string; libraryTab: string; calendarStyle: string; calendarView: string; week: string; month: string; date: string; scroll: number };
const key = (value: CoachLocation) => [value.page, value.client, value.tab, value.libraryTab].join("|");
type Entry = { location: CoachLocation; overlay: boolean };
const readEntry = (state: any): Entry | undefined => {
  const entry = state?.nlCoachLocation;
  return entry?.location && ["page", "client", "tab", "libraryTab", "calendarStyle", "calendarView", "week", "month", "date"].every(k => typeof entry.location[k] === "string") ? entry : undefined;
};

/** Browser history contains only navigation context, never draft or reply content. */
export default function useCoachHistory(enabled: boolean, location: CoachLocation, overlay: boolean,
  closeOverlay: () => boolean, restore: (location: CoachLocation) => void) {
  const current = useRef({ location, overlay, closeOverlay, restore });
  current.current = { location, overlay, closeOverlay, restore };
  const initialized = useRef(false), skipping = useRef(false), restoring = useRef(""), hydrating = useRef(false);
  const write = (entry: Entry, push = false) => {
    const state = { ...window.history.state, nlCoachLocation: entry };
    if (push) window.history.pushState(state, ""); else window.history.replaceState(state, "");
  };
  useEffect(() => {
    if (!enabled) return;
    initialized.current = true;
    const existing = readEntry(window.history.state);
    if (existing) {
      const target = { ...existing.location, libraryTab: existing.location.libraryTab === "Program Builder" ? "Saved Programs" : existing.location.libraryTab };
      restoring.current = key(target); hydrating.current = true;
      current.current.restore(target); write({ location: target, overlay: false });
    } else write({ location: current.current.location, overlay: false });
    const pop = (event: PopStateEvent) => {
      const active = current.current;
      if (skipping.current) { skipping.current = false; write({ location: active.location, overlay: active.overlay }); return; }
      if (active.overlay) {
        if (!active.closeOverlay()) write({ location: active.location, overlay: true }, true);
        return;
      }
      const target = readEntry(event.state);
      if (!target) return;
      const destination = { ...target.location, libraryTab: target.location.libraryTab === "Program Builder" ? "Saved Programs" : target.location.libraryTab };
      restoring.current = key(destination);
      active.restore(destination);
      // Forward cannot resurrect a discarded editor or a stale workout modal.
      write({ location: destination, overlay: false });
      requestAnimationFrame(() => window.scrollTo(0, target.location.scroll || 0));
    };
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    const scroll = () => {
      if (current.current.overlay || skipping.current) return;
      if (scrollTimer) return;
      const route = key(current.current.location);
      // Safari rate-limits history writes. Coalesce touch-scroll events instead
      // of calling replaceState for every frame of a long athlete calendar.
      scrollTimer = setTimeout(() => {
        scrollTimer = undefined;
        const entry = readEntry(window.history.state);
        if (entry && !current.current.overlay && !skipping.current && key(entry.location) === route)
          write({ ...entry, location: { ...entry.location, scroll: window.scrollY } });
      }, 500);
    };
    window.addEventListener("popstate", pop); window.addEventListener("scroll", scroll, { passive: true });
    return () => { initialized.current = false; clearTimeout(scrollTimer); window.removeEventListener("popstate", pop); window.removeEventListener("scroll", scroll); };
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !initialized.current || skipping.current) return;
    if (hydrating.current) { hydrating.current = false; return; }
    const entry = readEntry(window.history.state);
    if (overlay) { if (!entry?.overlay) write({ location, overlay: true }, true); return; }
    if (entry?.overlay) { skipping.current = true; window.history.back(); return; }
    const returning = restoring.current === key(location);
    if (returning) restoring.current = "";
    const changed = entry && key(entry.location) !== key(location);
    write({ location: { ...location, scroll: changed && !returning ? 0 : entry?.location.scroll || location.scroll }, overlay: false }, Boolean(changed && !returning));
  }, [enabled, overlay, location.page, location.client, location.tab, location.libraryTab, location.calendarStyle, location.calendarView, location.week, location.month, location.date]);
}
