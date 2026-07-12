// Client-side observability: crashes, failed API calls, and funnel events are
// fire-and-forget POSTed to /api/clientLog. Never awaited on a user path and
// never allowed to throw — losing an event must cost nothing.

type EventKind = "crash" | "api_fail" | "funnel";

// Per-session caps so a crash loop or flaky network can't spam the endpoint:
// at most 40 events total, and each distinct message reported once.
const MAX_EVENTS_PER_SESSION = 40;
let sentCount = 0;
const seenMessages = new Set<string>();

export function reportClientEvent(
  kind: EventKind,
  event: string,
  detail: { message?: string; stack?: string; clientId?: string } = {}
) {
  try {
    if (sentCount >= MAX_EVENTS_PER_SESSION) return;
    const dedupeKey = `${kind}:${event}:${detail.message || ""}`;
    if (kind !== "funnel" && seenMessages.has(dedupeKey)) return;
    seenMessages.add(dedupeKey);
    sentCount += 1;

    const payload = JSON.stringify({
      kind,
      event,
      message: detail.message || "",
      stack: detail.stack || "",
      clientId: detail.clientId || "",
      url: window.location.pathname + window.location.search,
    });

    // sendBeacon survives page unloads (checkout redirects, tab closes);
    // keepalive fetch is the fallback.
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/clientLog", blob)) {
      void fetch("/api/clientLog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Telemetry must never break the app it observes.
  }
}

// Global crash hooks — catches errors outside React (event handlers, async
// code) that the ErrorBoundary never sees.
export function initTelemetry() {
  try {
    window.addEventListener("error", (e) => {
      reportClientEvent("crash", "window_error", {
        message: e.message || String(e.error || ""),
        stack: String(e.error?.stack || "").slice(0, 2000),
      });
    });
    window.addEventListener("unhandledrejection", (e) => {
      const reason: any = e.reason;
      reportClientEvent("crash", "unhandled_rejection", {
        message: String(reason?.message || reason || ""),
        stack: String(reason?.stack || "").slice(0, 2000),
      });
    });
  } catch {
    // Old browser without these APIs — fine, we just observe less.
  }
}
