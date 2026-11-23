// Athlete name drawn over a demo video, surviving fullscreen.
//
// The portal's page watermark (ContentWatermark) covers the player modal,
// but a native <video> fullscreen shows only the video element, which is
// exactly when someone screen-records a demo. So the label lives in a
// wrapper, the wrapper is what goes fullscreen (our own button; the native
// fullscreen control is hidden where the browser lets us), and the label
// hops corners every 20 s so it cannot be cropped out. Prints the NAME,
// never the CL- code (the code is a login credential).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWatermarkName } from "./ContentWatermark";
import "./VideoWatermark.css";

const CORNERS = ["tr", "br", "bl", "tl"] as const;

export default function VideoWatermark({ children, label, className = "" }: { children: ReactNode; label?: string; className?: string }) {
  const resolved = useWatermarkName(label === undefined);
  const name = (label ?? resolved).trim();
  const wrap = useRef<HTMLDivElement>(null);
  const [corner, setCorner] = useState(0);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setCorner((c) => (c + 1) % CORNERS.length), 20000);
    const onChange = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => { clearInterval(id); document.removeEventListener("fullscreenchange", onChange); };
  }, []);
  const canFullscreen = typeof document !== "undefined" && !!(document.documentElement as HTMLElement & { requestFullscreen?: unknown }).requestFullscreen;
  const toggleFullscreen = () => {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement === el) void document.exitFullscreen?.();
    else void el.requestFullscreen?.().catch(() => {
      // iOS Safari has no element fullscreen: fall back to the native player.
      const video = el.querySelector("video") as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
      video?.webkitEnterFullscreen?.();
    });
  };
  if (!name) return <>{children}</>;
  return <div ref={wrap} className={`videoWm${full ? " videoWm--full" : ""} ${className}`.trim()}>
    {children}
    <span className={`videoWmLabel videoWmLabel--${CORNERS[corner]}`} aria-hidden="true">{name} · NX LIMIT</span>
    {canFullscreen && <button type="button" className="videoWmFull" onClick={toggleFullscreen} aria-label={full ? "Exit fullscreen" : "Fullscreen"}>{full ? "⤡" : "⤢"}</button>}
  </div>;
}
