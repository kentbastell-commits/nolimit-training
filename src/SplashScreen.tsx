import { useEffect, useRef, useState } from "react";
import "./SplashScreen.css";

type Props = {
  /** Controlled 0–100 progress. Overrides both tracked and timed modes. */
  progress?: number;
  /**
   * Tracked mode: pass the app's real "boot finished" flag. While false the
   * bars trickle up and hold near the top; once true they finish to 100%.
   * Presence of this prop (a boolean) selects tracked mode.
   */
  done?: boolean;
  /** Called once the fill reaches 100%. */
  onFinish?: () => void;
};

const TOPS = [0.56, 0.7, 0.82, 0.92, 1]; // rising-ramp silhouette
const IDLE = 7;
const HOLD_CAP = 90; // how high the trickle climbs before the app is ready

export default function SplashScreen({ progress, done, onFinish }: Props) {
  const controlled = typeof progress === "number";
  const tracked = !controlled && typeof done === "boolean";
  const [auto, setAuto] = useState(0);
  const [phase, setPhase] = useState(0); // drives the shimmer
  const doneRef = useRef(false);

  const pct = Math.min(100, Math.max(0, controlled ? progress! : auto));
  const shown = Math.floor(pct);

  // Timed fill — only when neither controlled nor tracked (standalone/demo use).
  useEffect(() => {
    if (controlled || tracked) return;
    const dur = 2600;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setAuto(Math.floor(t * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controlled, tracked]);

  // Tracked fill — trickle toward HOLD_CAP while booting, snap to 100 when the
  // app signals ready. Eases so the bars keep moving without ever stalling.
  useEffect(() => {
    if (!tracked) return;
    let raf = 0;
    const tick = () => {
      setAuto((a) => {
        const cap = done ? 100 : HOLD_CAP;
        const speed = done ? 0.18 : 0.02;
        let next = a + (cap - a) * speed;
        if (done && next > 99.4) next = 100;
        return Math.min(cap, next);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tracked, done]);

  // Shimmer clock
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setPhase(performance.now() / 160);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Fire onFinish once
  useEffect(() => {
    if (pct >= 100 && !doneRef.current) {
      doneRef.current = true;
      const id = setTimeout(() => onFinish?.(), 450); // brief "complete" dwell
      return () => clearTimeout(id);
    }
  }, [pct, onFinish]);

  const bars = TOPS.map((top, i) => {
    const local = Math.max(0, Math.min(1, (pct - i * 20) / 20));
    const target = IDLE + local * (top * 100 - IDLE);
    const shimmer = local > 0 && local < 1 ? Math.sin(phase) * 5 : 0;
    return Math.max(6, Math.min(100, target + shimmer));
  });

  return (
    <div className="nlSplash">
      <img className="nlSplash__logo" src="/nx_limit_training_white_on_black.png" alt="NX LIMIT Training" />

      <div className="nlSplash__bars">
        {bars.map((h, i) => (
          <span key={i} className="nlSplash__bar" style={{ height: `${h}%` }} />
        ))}
      </div>

      <div className="nlSplash__pct">
        {String(shown).padStart(2, "0")}<span>%</span>
      </div>

      <div className="nlSplash__track">
        <span className="nlSplash__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="nlSplash__label">POWERING UP</div>
    </div>
  );
}
