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

  const coarse = await scan(coarseTimes, 0, estimatedTotal);
  const coarseFlights = detectFlights(coarse, {
    minFlightS: Math.max(0.2, coarseStep * 2),
  });
  if (!coarseFlights.length) return null;
  const target = coarseFlights.reduce((a, b) => (b.flight > a.flight ? b : a));

  const fineTimes: number[] = [];
  for (let t = Math.max(0, target.takeoff - fineWindow); t < Math.min(duration, target.takeoff + fineWindow); t += frameDur) fineTimes.push(t);
  for (let t = Math.max(0, target.landing - fineWindow); t < Math.min(duration, target.landing + fineWindow); t += frameDur) fineTimes.push(t);

  const fine = await scan(fineTimes, coarseTimes.length, estimatedTotal);

  // Merge (fine samples win near-duplicates) and re-detect at full precision.
  const merged = [...coarse, ...fine].sort((a, b) => a.t - b.t);
  const flights = detectFlights(merged, { minFlightS: Math.max(0.15, frameDur * 4) });
  if (!flights.length) return null;

  // The flight overlapping the coarse target (multi-jump clips keep their
  // other jumps at coarse precision only).
  const mid = (target.takeoff + target.landing) / 2;
  const best = flights.reduce((a, b) =>
    Math.abs((b.takeoff + b.landing) / 2 - mid) <
    Math.abs((a.takeoff + a.landing) / 2 - mid)
      ? b
      : a
  );
  opts.onProgress?.(100);
  return {
    takeoff: best.takeoff,
    landing: best.landing,
    confidence: best.confidence,
    jumpsFound: coarseFlights.length,
  };
}
