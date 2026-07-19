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

export function detectFlights(
  samples: PoseSample[],
  opts: { minFlightS?: number; maxFlightS?: number } = {}
): FlightDetection[] {
  const minFlight = opts.minFlightS ?? 0.15;
  const maxFlight = opts.maxFlightS ?? 5;

  const valid = samples.filter(
    (s): s is PoseSample & { foot: number } => s.foot !== null && s.vis > 0.3
  );
  if (valid.length < 30) return [];

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

  // All contiguous runs above threshold (a clip may hold several jumps).
  const runs: Array<{ start: number; end: number }> = [];
  let start = -1;
  for (let i = 0; i <= resid.length; i++) {
    const airborne = i < resid.length && resid[i].d > threshold;
    if (airborne && start < 0) start = i;
    if (!airborne && start >= 0) {
      runs.push({ start, end: i - 1 });
      start = -1;
    }
  }

  // Edge refinement: the raw threshold crossing fires AFTER true takeoff and
  // BEFORE true landing (systematically short). Interpolating each edge at the
  // HALF-threshold crossing cancels that against the plantar-flexion tail —
  // calibrated 2026-07-19 against a MyJump-measured 60fps jump: 624ms vs
  // MyJump's 633ms (47.8cm vs 49.2cm) where raw crossings read 584ms (41.7cm).
  const half = threshold / 2;
  const halfCross = (edge: number, dir: -1 | 1): number => {
    let i = edge;
    while (i + dir >= 0 && i + dir < resid.length && resid[i].d > half) i += dir;
    const a = resid[i];
    const b = resid[i - dir] ?? a;
    if (b.d === a.d) return a.t;
    return a.t + ((half - a.d) * (b.t - a.t)) / (b.d - a.d);
  };

  const flights: FlightDetection[] = [];
  for (const run of runs) {
    const takeoff = halfCross(run.start, -1);
    const landing = halfCross(run.end, 1);
    const flight = landing - takeoff;
    if (flight < minFlight || flight > maxFlight) continue;

    // Confidence: dip depth over noise + how solidly the run held threshold.
    const runSamples = resid.slice(run.start, run.end + 1);
    const depth = Math.max(...runSamples.map((r) => r.d));
    const clearance = Math.min(1, depth / (threshold * 3));
    const solidity =
      runSamples.filter((r) => r.d > threshold).length / runSamples.length;
    const confidence = Math.round(clearance * solidity * 100) / 100;
    if (confidence < 0.5) continue;

    flights.push({ takeoff, landing, flight, confidence });
  }
  return flights;
}

/**
 * Drop-jump structure from a clip's flights: the drop off the box is one
 * flight, the rebound jump another; the ground contact between them is what
 * RSI needs. Picks the pair with the biggest rebound whose contact gap is
 * physiologic; null when the clip doesn't contain a drop-jump pattern.
 */
export function pickDropJump(
  flights: FlightDetection[],
  opts: { minContactS?: number; maxContactS?: number } = {}
): { contact: number; takeoff: number; landing: number } | null {
  const minContact = opts.minContactS ?? 0.04;
  const maxContact = opts.maxContactS ?? 4; // generous: slow-mo stretches it
  const ordered = [...flights].sort((a, b) => a.takeoff - b.takeoff);
  let best: { contact: number; takeoff: number; landing: number; score: number } | null =
    null;
  for (let i = 0; i < ordered.length - 1; i++) {
    const drop = ordered[i];
    const rebound = ordered[i + 1];
    const gap = rebound.takeoff - drop.landing;
    if (gap < minContact || gap > maxContact) continue;
    if (!best || rebound.flight > best.score) {
      best = {
        contact: drop.landing,
        takeoff: rebound.takeoff,
        landing: rebound.landing,
        score: rebound.flight,
      };
    }
  }
  return best ? { contact: best.contact, takeoff: best.takeoff, landing: best.landing } : null;
}

/** Best (longest-flight) confident jump, or null. */
export function detectFlight(
  samples: PoseSample[],
  opts: { minFlightS?: number; maxFlightS?: number } = {}
): FlightDetection | null {
  const flights = detectFlights(samples, opts);
  if (!flights.length) return null;
  return flights.reduce((best, f) => (f.flight > best.flight ? f : best));
}
