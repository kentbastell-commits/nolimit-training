// Faint repeating identity watermark over paid program content (athlete
// portal only). Makes screenshots/re-shares of program material traceable
// to the buyer without blocking legitimate use.
//
// Self-sufficient by design: reads the portal login code from localStorage
// (nl_portal_code, written at portal entry) and resolves the athlete's NAME
// via /api/myProfile — the watermark deliberately never prints the CL- code,
// because the code IS the portal credential and a screenshot would leak it.
// Renders nothing while the name is unknown (coach views, tests, logged-out).
import { useEffect, useState } from "react";
import "./ContentWatermark.css";

// Module-level cache: one profile fetch per page load, shared across every
// mount (the player modal can mount/unmount many times per session).
let cachedName: string | null = null;
let inflight: Promise<string> | null = null;

function resolveWatermarkName(): Promise<string> {
  if (cachedName !== null) return Promise.resolve(cachedName);
  if (inflight) return inflight;
  let code = "";
  try {
    code =
      new URLSearchParams(window.location.search).get("client") ||
      window.localStorage.getItem("nl_portal_code") ||
      "";
  } catch {
    /* storage unavailable — render nothing */
  }
  if (!code) {
    cachedName = "";
    return Promise.resolve("");
  }
  inflight = fetch(`/api/myProfile?clientId=${encodeURIComponent(code)}`)
    .then((res) => res.json())
    .then((data) => {
      cachedName = String(data?.profile?.name || "");
      return cachedName;
    })
    .catch(() => {
      cachedName = "";
      return "";
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export default function ContentWatermark() {
  const [name, setName] = useState(cachedName || "");

  useEffect(() => {
    let alive = true;
    resolveWatermarkName().then((n) => {
      if (alive) setName(n);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!name) return null;

  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><text x='150' y='100' font-family='sans-serif' font-size='15' font-weight='700' fill='rgba(128,128,128,0.09)' text-anchor='middle' transform='rotate(-24 150 100)'>${name
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/'/g, "&apos;")} · NX LIMIT</text></svg>`;

  return (
    <div
      className="contentWatermark"
      aria-hidden="true"
      style={{
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(tile)}")`,
      }}
    />
  );
}
