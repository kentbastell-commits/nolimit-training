import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./ReviewVideo.css";
import { uploadThumbUrl } from "./appCore";
import { reportClientEvent } from "./telemetry";

// Review uploads are small and belong to the website the coach already has
// open. Prefer that connection; a VPN may route the media hostname differently.
export function reviewVideoSources(url: string): string[] {
  try {
    const parsed = new URL(url, window.location.origin);
    const hosted = /^(?:www\.)?(?:media\.)?trainnolimit\.(?:cn|com)$/i.test(parsed.hostname);
    if ((hosted || url.startsWith("/uploads/")) && parsed.pathname.startsWith("/uploads/")) {
      const resource = parsed.pathname + parsed.search;
      return [resource, "https://media.trainnolimit.cn" + resource];
    }
  } catch { /* Keep external or unrecognised sources unchanged. */ }
  return [url];
}

// iPhone WebKit owns a small pool of native media players. A session group
// with 13 clips mounted 13 <video> elements at once (26 with the fallback
// source), and every element past the pool limit failed instantly with
// MEDIA_ERR_SRC_NOT_SUPPORTED — for perfectly good H.264 files the server had
// just answered with 206s (2026-10-30, logs/client-events video_load_failed).
// So a clip is a poster until the coach taps it, and only ONE <video> is
// live on the page at a time: tapping another clip returns the previous one
// to its poster. Desktop had to click play anyway, so nothing is lost there.
const livePlayers = new Set<() => void>();
function claimLivePlayer(release: () => void) {
  livePlayers.forEach(fn => { if (fn !== release) fn(); });
  livePlayers.clear();
  livePlayers.add(release);
}

export default function ReviewVideo({ url, title }: { url: string; title: string }) {
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const [active, setActive] = useState(false);
  const release = useRef(() => setActive(false));
  useEffect(() => {
    const fn = release.current;
    return () => { livePlayers.delete(fn); };
  }, []);
  // A new submission must start with fresh connection/error state.
  useEffect(() => { setActive(false); }, [url]);
  const poster = uploadThumbUrl(url);
  if (!active) {
    return <button type="button" className="reviewVideoPoster" aria-label={`${zh ? "播放" : "Play"} ${title}`}
      style={poster ? { backgroundImage: `url(${poster})` } : undefined}
      onClick={() => { claimLivePlayer(release.current); setActive(true); }}>
      <span className="reviewVideoPlayGlyph" aria-hidden="true">▶</span>
    </button>;
  }
  return <ReviewVideoPlayer key={url} url={url} title={title} poster={poster} />;
}

function ReviewVideoPlayer({ url, title, poster }: { url: string; title: string; poster: string }) {
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const sources = reviewVideoSources(url);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const position = useRef(0);
  // The player only exists because the coach tapped the poster, so playback
  // is wanted from the first frame.
  const resume = useRef(true);
  const clearTimer = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; };
  // Every give-up is reported with the media element's own diagnosis, so a
  // "couldn't load" on one coach's phone can be read from logs/client-events
  // instead of guessed at (the Oct-30 iPhone failure had no other evidence).
  const report = (reason: string) => {
    const v = video.current;
    const can = typeof v?.canPlayType === "function" ? v.canPlayType('video/mp4; codecs="avc1.64001F, mp4a.40.2"') : "?";
    reportClientEvent("api_fail", "video_load_failed", { message:
      `${reason} src=${index + 1}/${sources.length} ${sources[index]} code=${v?.error?.code ?? "-"} msg=${v?.error?.message || "-"} net=${v?.networkState ?? "-"} ready=${v?.readyState ?? "-"} userPlay=${resume.current} canPlay=${can || "no"}` });
  };
  const fail = (reason = "error") => {
    clearTimer();
    report(reason);
    position.current = video.current?.currentTime || position.current;
    if (index < sources.length - 1) setIndex(index + 1);
    else setFailed(true);
  };
  // Bytes still arriving = a slow link, not a dead one: wait up to 3 more
  // rounds (48 s total) before switching sources, so a cross-border coach
  // phone on a 1 MB/s link isn't failed mid-download.
  const patience = useRef(0);
  const buffered = () => { const b = video.current?.buffered; return b && b.length ? b.end(b.length - 1) : 0; };
  const waitForConnection = () => {
    clearTimer();
    const before = buffered();
    timer.current = setTimeout(() => {
      const current = video.current;
      if (!current) return;
      const starving = current.readyState === 0 || (!current.paused && current.readyState < 3);
      if (!starving) { patience.current = 0; return; }
      const stillLoading = current.networkState === 2 && buffered() > before;
      if (stillLoading && patience.current < 3) { patience.current += 1; waitForConnection(); return; }
      patience.current = 0;
      fail("timeout");
    }, 12000);
  };
  useEffect(() => {
    if (resume.current) void video.current?.play().catch(() => {});
    return () => clearTimer();
  }, [index, attempt]);
  const retry = () => { clearTimer(); resume.current = true; setFailed(false); setIndex(0); setAttempt(n => n + 1); };
  return <div className="reviewVideoPlayer">
    <video key={`${index}:${attempt}`} ref={video} className="rvVideo" src={sources[index]}
      aria-label={title} controls playsInline autoPlay preload="auto" poster={poster || undefined}
      onLoadStart={() => { if (resume.current) waitForConnection(); }} onError={() => fail("error")}
      onLoadedMetadata={event => {
        clearTimer();
        const current = event.currentTarget;
        if (position.current > 0 && Number.isFinite(current.duration)) current.currentTime = Math.min(position.current, Math.max(0, current.duration - 0.1));
      }}
      onPlay={() => { resume.current = true; waitForConnection(); }}
      onPause={event => { if (!event.currentTarget.error) resume.current = false; clearTimer(); }}
      // WebKit fires "stalled" when it simply chose not to download more; only
      // a play the coach asked for arms the connection timer.
      onWaiting={() => { if (resume.current) waitForConnection(); }}
      onStalled={() => { if (resume.current) waitForConnection(); }}
      onCanPlay={() => { clearTimer(); if (resume.current && video.current?.paused) void video.current.play().catch(() => {}); }}
      onPlaying={() => { clearTimer(); setFailed(false); }}
      onEnded={() => { resume.current = false; clearTimer(); }} />
    {failed && <p className="reviewVideoError" role="alert">{zh ? "视频暂时无法加载。请重试，或直接打开视频。" : "The video couldn’t load. Retry or open it directly."}</p>}
    <div className="reviewVideoActions">
      <button type="button" onClick={retry}>{zh ? "重新加载视频" : "Reload video"}</button>
      <a href={sources[0]} target="_blank" rel="noopener noreferrer">{zh ? "打开视频" : "Open video"}</a>
    </div>
  </div>;
}
