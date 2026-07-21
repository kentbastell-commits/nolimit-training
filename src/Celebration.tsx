import { useEffect, useMemo, useRef, useState } from "react";
import "./Celebration.css";

export type CelebrationVariant = "fistbump" | "highfive" | "thumbsup";

type Props = {
  variant: CelebrationVariant;
  kicker?: string;
  headline?: string;
  coachName?: string;
  message?: string;
  stats?: string;
  ctaLabel?: string;
  onDone?: () => void;
};

const DEFAULTS: Record<
  CelebrationVariant,
  { kicker: string; headline: string; message: string; haptic: number[]; impactMs: number }
> = {
  fistbump: {
    kicker: "WORKOUT COMPLETE",
    headline: "POUND IT",
    message: "That's how champions close it out. See you tomorrow.",
    haptic: [18, 26, 55],
    impactMs: 780,
  },
  highfive: {
    kicker: "WORKOUT COMPLETE",
    headline: "UP TOP!",
    message: "Huge effort this week. Keep that streak alive.",
    haptic: [30, 40, 30],
    impactMs: 300,
  },
  thumbsup: {
    kicker: "COACH APPROVED",
    headline: "CRUSHED IT",
    message: "Reviewed your session — new standard set. Proud of you.",
    haptic: [15, 25, 60],
    impactMs: 360,
  },
};

// fist-bump: confetti ERUPTS from the contact point (dx/dy = eruption vector)
const BURST = [
  { dx: -92, dy: -30, w: 8, h: 12, c: "#d8bd62", r: 2 },
  { dx: -70, dy: -58, w: 7, h: 7, c: "#f0d98a", r: 50 },
  { dx: -48, dy: -72, w: 8, h: 11, c: "#f5f1e8", r: 2 },
  { dx: -20, dy: -80, w: 6, h: 12, c: "#9f7a1b", r: 2 },
  { dx: 8, dy: -82, w: 7, h: 7, c: "#d8bd62", r: 50 },
  { dx: 34, dy: -74, w: 8, h: 12, c: "#f0d98a", r: 2 },
  { dx: 60, dy: -58, w: 6, h: 6, c: "#f5f1e8", r: 50 },
  { dx: 86, dy: -34, w: 8, h: 11, c: "#d8bd62", r: 2 },
  { dx: -96, dy: 6, w: 7, h: 11, c: "#f0d98a", r: 2 },
  { dx: -58, dy: -14, w: 6, h: 6, c: "#9f7a1b", r: 50 },
  { dx: 52, dy: -16, w: 7, h: 12, c: "#f5f1e8", r: 2 },
  { dx: 96, dy: 4, w: 8, h: 7, c: "#d8bd62", r: 50 },
  { dx: -34, dy: -46, w: 6, h: 11, c: "#f0d98a", r: 2 },
  { dx: 22, dy: -52, w: 7, h: 7, c: "#f5f1e8", r: 50 },
];

// high-five: confetti RAINS from the top (left% / delay / duration)
const RAIN = [
  { l: 12, d: 0.2, dur: 1.9, w: 7, h: 12, c: "#d8bd62", r: 2 },
  { l: 22, d: 0.45, dur: 2.2, w: 6, h: 6, c: "#f0d98a", r: 50 },
  { l: 32, d: 0.1, dur: 1.7, w: 8, h: 11, c: "#9f7a1b", r: 2 },
  { l: 42, d: 0.55, dur: 2.4, w: 6, h: 12, c: "#f5f1e8", r: 2 },
  { l: 52, d: 0.3, dur: 2.0, w: 7, h: 7, c: "#d8bd62", r: 50 },
  { l: 62, d: 0.15, dur: 1.8, w: 8, h: 11, c: "#f0d98a", r: 2 },
  { l: 72, d: 0.5, dur: 2.3, w: 6, h: 6, c: "#9f7a1b", r: 50 },
  { l: 82, d: 0.25, dur: 1.9, w: 7, h: 12, c: "#d8bd62", r: 2 },
  { l: 18, d: 0.6, dur: 2.1, w: 6, h: 11, c: "#f5f1e8", r: 2 },
  { l: 38, d: 0.05, dur: 1.6, w: 7, h: 7, c: "#f0d98a", r: 50 },
  { l: 58, d: 0.4, dur: 2.4, w: 8, h: 12, c: "#9f7a1b", r: 2 },
  { l: 78, d: 0.2, dur: 1.8, w: 6, h: 6, c: "#d8bd62", r: 50 },
  { l: 28, d: 0.5, dur: 2.2, w: 7, h: 11, c: "#f0d98a", r: 2 },
  { l: 68, d: 0.35, dur: 2.0, w: 6, h: 12, c: "#f5f1e8", r: 2 },
];

export default function Celebration({
  variant,
  kicker,
  headline,
  coachName = "COACH K",
  message,
  stats = "45 MIN · 12 EXERCISES · 3 PRs",
  ctaLabel = "CONTINUE",
  onDone,
}: Props) {
  const cfg = DEFAULTS[variant];
  const [showCta, setShowCta] = useState(false);
  const fired = useRef(false);
  const rays = useMemo(() => [0, 45, 90, 135, 180, 225, 270, 315], []);

  useEffect(() => {
    const t1 = setTimeout(() => {
      if (!fired.current && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(cfg.haptic);
      }
      fired.current = true;
    }, cfg.impactMs);
    const t2 = setTimeout(() => setShowCta(true), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [cfg.haptic, cfg.impactMs]);

  return (
    <div className={`cel cel--${variant}`}>
      <img className="cel__logo" src="/nl_wordmark_white.png" alt="NoLimit Training" />

      {variant === "highfive" && (
        <div className="cel__rain">
          {RAIN.map((p, i) => (
            <span
              key={i}
              className="cel__drop"
              style={
                {
                  left: `${p.l}%`,
                  width: p.w,
                  height: p.h,
                  background: p.c,
                  borderRadius: p.r === 50 ? "50%" : 2,
                  animationDelay: `${p.d}s`,
                  animationDuration: `${p.dur}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      <div className="cel__stage">
        <div className="cel__glow" />

        {variant === "fistbump" && (
          <>
            <div className="cel__rays">
              <div className="cel__raysHub">
                {rays.map((deg) => (
                  <div key={deg} className="cel__rayArm" style={{ transform: `rotate(${deg}deg)` }}>
                    <span className="cel__ray" />
                  </div>
                ))}
              </div>
            </div>
            <div className="cel__shock" />
            <div className="cel__flash" />
            <div className="cel__burstHub">
              {BURST.map((p, i) => (
                <span
                  key={i}
                  className="cel__spark"
                  style={
                    {
                      "--dx": `${p.dx}px`,
                      "--dy": `${p.dy}px`,
                      width: p.w,
                      height: p.h,
                      background: p.c,
                      borderRadius: p.r === 50 ? "50%" : 2,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
            <div className="cel__fists">
              <div className="cel__fist cel__fist--l">👊</div>
              <div className="cel__fist cel__fist--r">
                <span className="cel__mirror">👊</span>
              </div>
            </div>
          </>
        )}

        {variant === "highfive" && <div className="cel__hands">🙌</div>}

        {variant === "thumbsup" && (
          <>
            <div className="cel__seal" />
            <div className="cel__seal cel__seal--dashed" />
            <div className="cel__thumb">👍</div>
          </>
        )}
      </div>

      <div className="cel__reveal">
        <div className="cel__kicker">{kicker ?? cfg.kicker}</div>
        <div className="cel__headline">{headline ?? cfg.headline}</div>
      </div>

      <div className="cel__coach">
        <div className="cel__avatar">{coachName.replace(/^COACH\s*/i, "").charAt(0) || "K"}</div>
        <div>
          <div className="cel__coachName">{coachName}</div>
          <div className="cel__coachMsg">{message ?? cfg.message}</div>
        </div>
      </div>

      <div className="cel__stats">{stats}</div>

      <button
        className="cel__cta"
        style={{ opacity: showCta ? 1 : 0, pointerEvents: showCta ? "auto" : "none" }}
        onClick={onDone}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
