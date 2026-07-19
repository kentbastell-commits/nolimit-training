// Automatic takeoff/landing detection from a pose-landmark trajectory.
// Input: per-frame samples of the lowest foot landmark's normalized y
// (bigger = lower in frame) from MediaPipe Pose. Detection: a rolling
// 70th-percentile baseline tracks "feet on floor" (absorbing slow camera
// drift); the longest sustained excursion above noise is the flight.
//
// Validated 2026-07-19 against Kent's real 120fps slo-mo clips: on
// static-camera footage the detected flight time matched hand-labeled
// frames (53.1cm vs ~52-53cm). Cameras that PAN or ZOOM during the jump
// defeat the baseline — those clips must return null (low confidence)
// rather than a wrong answer; the athlete marks manually.

export type PoseSample = {
  t: number; // seconds on the video timeline
  foot: number | null; // max normalized y of heel/toe landmarks
  vis: number; // min visibility of the foot landmarks
};

export type FlightDetection = {
  takeoff: number;
  landing: number;
  flight: number; // timeline seconds
  confidence: number; // 0..1
};

export function detectFlight(
  samples: PoseSample[],
  opts: { minFlightS?: number; maxFlightS?: number } = {}
): FlightDetection | null {
  const minFlight = opts.minFlightS ?? 0.15;
  const maxFlight = opts.maxFlightS ?? 5;

  const valid = samples.filter(
    (s): s is PoseSample & { foot: number } => s.foot !== null && s.vis > 0.3
  );
  if (valid.length < 30) return null;

  const win = 1.8;
  const baselineAt = (t: number): number => {
    const vals = valid
      .filter((s) => Math.abs(s.t - t) <= win)
      .map((s) => s.foot)
      .sort((a, b) => a - b);
    return vals[Math.floor(vals.length * 0.7)] ?? 0;
  };
  const resid = valid.map((s) => ({ t: s.t, d: baselineAt(s.t) - s.foot }));

  const absd = resid.map((r) => Math.abs(r.d)).sort((a, b) => a - b);
  const noise = absd[Math.floor(absd.length * 0.6)] || 0.004;
  const threshold = Math.max(noise * 4, 0.02);

  // Longest contiguous run above threshold.
  let best: { start: number; end: number; len: number } | null = null;
  let start = -1;
  for (let i = 0; i <= resid.length; i++) {
    const airborne = i < resid.length && resid[i].d > threshold;
    if (airborne && start < 0) start = i;
    if (!airborne && start >= 0) {
      const len = resid[i - 1].t - resid[start].t;
      if (!best || len > best.len) best = { start, end: i - 1, len };
      start = -1;
    }
  }
  if (!best) return null;

  const takeoff = resid[best.start].t;
  const landing = resid[best.end].t;
  const flight = landing - takeoff;
  if (flight < minFlight || flight > maxFlight) return null;

  // Confidence: how far the flight dip clears the noise floor, and how much
  // of the run actually stayed above threshold (a ragged run = camera junk).
  const runSamples = resid.slice(best.start, best.end + 1);
  const depth = Math.max(...runSamples.map((r) => r.d));
  const clearance = Math.min(1, depth / (threshold * 3));
  const solidity =
    runSamples.filter((r) => r.d > threshold).length / runSamples.length;
  const confidence = Math.round(clearance * solidity * 100) / 100;
  if (confidence < 0.5) return null;

  return { takeoff, landing, flight, confidence };
}
