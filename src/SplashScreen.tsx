import { useEffect, useRef, useState } from "react";
import "./SplashScreen.css";

type Props = {
  /** Pass real progress 0–100 if you have it; omit to auto-run a timed fill. */
  progress?: number;
  /** Called once the fill reaches 100%. */
  onFinish?: () => void;
};

const TOPS = [0.56, 0.7, 0.82, 0.92, 1]; // rising-ramp silhouette
const IDLE = 7;

export default function SplashScreen({ progress, onFinish }: Props) {
  const controlled = typeof progress === "number";
  const [auto, setAuto] = useState(0);
  const [phase, setPhase] = useState(0); // drives the shimmer
  const doneRef = useRef(false);

  const pct = Math.min(100, Math.max(0, controlled ? progress! : auto));

  // Auto fill (only when no external progress is supplied)
  useEffect(() => {
    if (controlled) return;
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
  }, [controlled]);

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
      <img className="nlSplash__logo" src="/nl_wordmark_black.png" alt="NoLimit Training" />

      <div className="nlSplash__bars">
        {bars.map((h, i) => (
          <span key={i} className="nlSplash__bar" style={{ height: `${h}%` }} />
        ))}
      </div>

      <div className="nlSplash__pct">
        {String(pct).padStart(2, "0")}<span>%</span>
      </div>

      <div className="nlSplash__track">
        <span className="nlSplash__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="nlSplash__label">POWERING UP</div>
    </div>
  );
}
