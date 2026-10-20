import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./ReviewVideo.css";

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

export default function ReviewVideo({ url, title }: { url: string; title: string }) {
  // A new submission must start with fresh connection/error state.
  return <ReviewVideoPlayer key={url} url={url} title={title} />;
}

function ReviewVideoPlayer({ url, title }: { url: string; title: string }) {
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const sources = reviewVideoSources(url);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const position = useRef(0);
  const resume = useRef(false);
  const clearTimer = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; };
  const fail = () => {
    clearTimer();
    position.current = video.current?.currentTime || position.current;
    if (index < sources.length - 1) setIndex(index + 1);
    else setFailed(true);
  };
  const waitForConnection = () => {
    clearTimer();
    timer.current = setTimeout(() => {
      const current = video.current;
      if (current && (current.readyState === 0 || (!current.paused && current.readyState < 3))) fail();
    }, 12000);
  };
  useEffect(() => {
    if (resume.current) void video.current?.play().catch(() => {});
    return () => clearTimer();
  }, [index, attempt]);
  const retry = () => { clearTimer(); resume.current = true; setFailed(false); setIndex(0); setAttempt(n => n + 1); };
  return <div className="reviewVideoPlayer">
    <video key={`${index}:${attempt}`} ref={video} className="rvVideo" src={sources[index]}
      aria-label={title} controls playsInline preload="none"
      onLoadStart={() => { if (resume.current) waitForConnection(); }} onError={fail}
      onLoadedMetadata={event => {
        clearTimer();
        const current = event.currentTarget;
        if (position.current > 0 && Number.isFinite(current.duration)) current.currentTime = Math.min(position.current, Math.max(0, current.duration - 0.1));
      }}
      onPlay={() => { resume.current = true; waitForConnection(); }}
      onPause={event => { if (!event.currentTarget.error) resume.current = false; clearTimer(); }}
      onWaiting={waitForConnection}
      onStalled={() => { if (video.current?.readyState === 0 || !video.current?.paused) waitForConnection(); }}
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
