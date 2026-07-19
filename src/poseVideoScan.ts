// Browser-side auto-marking: run self-hosted MediaPipe Pose over a jump
// video (coarse sweep, then a fine pass around the detected flight) and
// return the best jump's takeoff/landing on the video timeline. Used by the
// Jump Lab "Auto-mark" button; all assets load from /pose/* on our own
// domain (China-safe), and the video never leaves the device.
import { detectFlights, type PoseSample } from "./jumpAutoMark";

type PoseInstance = {
  setOptions: (o: Record<string, unknown>) => void;
  onResults: (cb: (r: any) => void) => void;
  initialize: () => Promise<void>;
  send: (i: { image: HTMLVideoElement }) => Promise<void>;
  reset?: () => void;
};

declare global {
  interface Window {
    Pose?: new (o: { locateFile: (f: string) => string }) => PoseInstance;
    __nlPose?: PoseInstance;
    __nlPoseResolve?: ((r: any) => void) | null;
  }
}

async function getPose(): Promise<PoseInstance> {
  if (window.__nlPose) return window.__nlPose;
  if (!window.Pose) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/pose/pose.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("pose.js failed to load"));
      document.head.appendChild(script);
    });
  }
  const pose = new window.Pose!({ locateFile: (f: string) => `/pose/${f}` });
  // Lite model: ~3x faster per frame on phones; foot-trajectory accuracy is
  // what matters here and the crossing detector's noise threshold adapts.
  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: false,
    minDetectionConfidence: 0.4,
    minTrackingConfidence: 0.4,
  });
  pose.onResults((r: any) => {
    window.__nlPoseResolve?.(r);
  });
  await pose.initialize();
  window.__nlPose = pose;
  return pose;
}

export type AutoMarkResult = {
  takeoff: number;
  landing: number;
  confidence: number;
  jumpsFound: number;
  // Every confident flight at fine precision, for drop-jump pairing.
  flights: Array<{ takeoff: number; landing: number; flight: number; confidence: number }>;
};

export async function autoDetectJump(
  videoUrl: string,
  opts: {
    frameDur: number;
    onProgress?: (pct: number) => void;
    onStatus?: (status: "model" | "scan") => void;
    cancelled?: () => boolean;
  }
): Promise<AutoMarkResult | null> {
  opts.onStatus?.("model");
  const pose = await getPose();
  opts.onStatus?.("scan");

  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("video load failed"));
  });
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration < 1) return null;

  const frameDur = Math.min(Math.max(opts.frameDur || 1 / 30, 1 / 240), 1 / 10);
  // Cap the coarse pass at ~110 frames so long clips don't take minutes on a
  // phone; flights shorter than ~4 coarse steps are caught by the fine pass.
  const coarseStep = Math.max(frameDur * 3, 1 / 15, duration / 110);

  // Inference input: downscaled offscreen canvas. MediaPipe resizes to
  // 256x256 internally - shipping 1080p frames across the JS/wasm boundary
  // just burns phone CPU.
  const scale = 384 / Math.max(video.videoWidth, video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(64, Math.round(video.videoWidth * Math.min(1, scale)));
  canvas.height = Math.max(64, Math.round(video.videoHeight * Math.min(1, scale)));
  const cx = canvas.getContext("2d")!;

  const coarseTimes: number[] = [];
  for (let t = 0; t < duration; t += coarseStep) coarseTimes.push(t);

  const scan = async (times: number[], done: number, total: number) => {
    const out: PoseSample[] = [];
    for (let i = 0; i < times.length; i++) {
      if (opts.cancelled?.()) throw new Error("cancelled");
      video.currentTime = times[i];
      await new Promise<void>((resolve) => (video.onseeked = () => resolve()));
      cx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const results: any = await new Promise((resolve) => {
        window.__nlPoseResolve = resolve;
        void pose.send({ image: canvas as unknown as HTMLVideoElement });
      });
      window.__nlPoseResolve = null;
      const lm = results?.poseLandmarks;
      if (lm) {
        out.push({
          t: times[i],
          foot: Math.max(lm[29].y, lm[30].y, lm[31].y, lm[32].y),
          vis: Math.min(lm[29].visibility, lm[30].visibility),
        });
      } else {
        out.push({ t: times[i], foot: null, vis: 0 });
      }
      opts.onProgress?.(Math.round(((done + i + 1) / total) * 100));
    }
    return out;
  };

  // Fine pass only needs the neighborhoods of the flight edges.
  const fineWindow = 0.7;
  const estimatedTotal = coarseTimes.length + Math.ceil((fineWindow * 4) / frameDur);

  // The model is a TRACKER - it assumes temporal continuity. Reset before
  // every pass so a previous run's (or the coarse pass's) leftover state
  // can't corrupt landmarks; all scan sequences below are forward-in-time.
  pose.reset?.();
  const coarse = await scan(coarseTimes, 0, estimatedTotal);
  const coarseFlights = detectFlights(coarse, {
    minFlightS: Math.max(0.2, coarseStep * 2),
  });
  if (!coarseFlights.length) return null;

  // EVERY coarse candidate gets the fine pass (near-equal jumps would
  // otherwise swap ranking on landmark noise between runs, making the
  // result non-deterministic). Edge windows are merged into forward-ordered
  // non-overlapping ranges so the tracker never sees time move backwards.
  const rawRanges: Array<[number, number]> = [];
  for (const flight of coarseFlights.slice(0, 5)) {
    if (flight.landing - fineWindow <= flight.takeoff + fineWindow) {
      rawRanges.push([
        Math.max(0, flight.takeoff - fineWindow),
        Math.min(duration, flight.landing + fineWindow),
      ]);
    } else {
      rawRanges.push([Math.max(0, flight.takeoff - fineWindow), flight.takeoff + fineWindow]);
      rawRanges.push([flight.landing - fineWindow, Math.min(duration, flight.landing + fineWindow)]);
    }
  }
  rawRanges.sort((a, b) => a[0] - b[0]);
  const ranges: Array<[number, number]> = [];
  for (const r of rawRanges) {
    const last = ranges[ranges.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else ranges.push([...r] as [number, number]);
  }
  const fineTimes: number[] = [];
  for (const [a, b] of ranges) for (let t = a; t < b; t += frameDur) fineTimes.push(t);

  pose.reset?.();
  const fine = await scan(fineTimes, coarseTimes.length, estimatedTotal);

  // Merge - fine samples replace coarse near-duplicates (they were measured
  // with better temporal context), then re-detect at full precision.
  const byTime = new Map<number, PoseSample>();
  for (const sample of coarse) byTime.set(Math.round(sample.t * 1000), sample);
  for (const sample of fine) byTime.set(Math.round(sample.t * 1000), sample);
  const merged = [...byTime.values()].sort((a, b) => a.t - b.t);
  const flights = detectFlights(merged, { minFlightS: Math.max(0.15, frameDur * 4) });
  if (!flights.length) return null;

  // All jumps now carry fine precision - the longest flight IS the athlete's
  // best jump, and the choice is stable across runs.
  const best = flights.reduce((a, b) => (b.flight > a.flight ? b : a));
  opts.onProgress?.(100);
  return {
    takeoff: best.takeoff,
    landing: best.landing,
    confidence: best.confidence,
    jumpsFound: flights.length,
    flights,
  };
}
