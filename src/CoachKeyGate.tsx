// Coach-console access gate. Once COACH_ACCESS_KEY is set on the server,
// coach/admin endpoints 401 without the key; this screen collects it ONCE per
// device, stores it as nl_coach_key (the appCore fetch wrapper then attaches
// it to every /api call), and re-verifies against a real coach endpoint.
// Coach-side surface — English only by convention.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Lock } from "lucide-react";
import "./CoachKeyGate.css";

export default function CoachKeyGate({
  onUnlocked,
}: {
  onUnlocked: () => void;
}) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tryUnlock = async () => {
    const cleaned = key.trim();
    if (!cleaned || busy) return;
    setBusy(true);
    setError("");
    try {
      window.localStorage.setItem("nl_coach_key", cleaned);
      // Probe a coach-only endpoint; the fetch wrapper attaches the stored
      // key. Only a 401 means "wrong key" — any other status is the endpoint
      // doing its own thing and the key is accepted.
      const res = await fetch("/api/enquiries");
      if (res.status === 401) {
        window.localStorage.removeItem("nl_coach_key");
        setError("That key wasn't accepted — check it and try again.");
        return;
      }
      onUnlocked();
    } catch {
      // Network hiccup — don't burn the attempt; the key stays stored and
      // the console will work once the connection recovers.
      onUnlocked();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="coachKeyGate">
      <div className="coachKeyGateCard">
        <span className="coachKeyGateIcon" aria-hidden="true">
          <Lock size={22} />
        </span>
        <h1>Coach Console</h1>
        <p>Enter your access key to continue. It's remembered on this device.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void tryUnlock();
          }}
        >
          <input
            autoFocus
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Access key"
            aria-label="Coach access key"
            autoComplete="current-password"
          />
          <button type="submit" className="goldButton" disabled={busy || !key.trim()}>
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>
        {error && <p className="coachKeyGateError">{error}</p>}
      </div>
    </div>
  );
}
