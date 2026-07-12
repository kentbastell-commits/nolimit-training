/* eslint-disable @typescript-eslint/no-explicit-any */
// Tier 1 · KPI count-up. Wrap any KPI value: <CountUp value={k.value} />.
// Parses the leading number out of the app's already-formatted strings
// ("2,340", "1.08", "18.6k", "82", "—") and tweens 0 → value over ~700ms
// (ease-out cubic), preserving commas / decimals / suffix. Non-numeric values
// (e.g. "—") render as-is. Re-runs whenever the value changes. Honours
// prefers-reduced-motion. Pair with font-variant-numeric: tabular-nums so the
// digits don't jitter while counting.
import { useEffect, useRef, useState } from "react";

const NUM_RE = /^(-?[\d,]*\.?\d+)(.*)$/;

export default function CountUp({
  value,
  duration = 700,
}: {
  value: any;
  duration?: number;
}) {
  const text = value == null ? "" : String(value);
  const match = text.match(NUM_RE);
  const target = match ? parseFloat(match[1].replace(/,/g, "")) : NaN;
  const decimals = match && match[1].includes(".") ? match[1].split(".")[1].length : 0;
  const useComma = match ? /,/.test(match[1]) || target >= 1000 : false;
  const suffix = match ? match[2] : "";

  const [display, setDisplay] = useState(target);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(target);
      return;
    }
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    setDisplay(0);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  if (!Number.isFinite(target)) return <>{text}</>;

  const fixed = display.toFixed(decimals);
  const formatted = useComma
    ? Number(fixed).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : fixed;
  return (
    <>
      {formatted}
      {suffix}
    </>
  );
}
