#!/bin/bash
# One-time exercise-video optimization: phone-friendly weight (1080p cap,
# 30fps, CRF 24) with the moov index up front (+faststart), SAME filenames so
# every stored URL keeps working. Originals preserved outside the served dir.
# Idempotent: outputs are tagged comment=nx-opt and skipped on re-run.
set -u
UP=/opt/nolimit-training/uploads
BAK=/opt/nolimit-training/uploads-originals
LOG=/tmp/optimizeVideos.log
mkdir -p "$BAK"
cd "$UP" || exit 1

mkdir -p "$UP/thumbs"

done_n=0; skip_n=0; fail_n=0; purged_urls=""
for f in ex-*; do
  [ -f "$f" ] || continue
  case "$f" in *.mov|*.mp4|*.m4v) ;; *) continue;; esac

  # Poster frame for the players (web tile + mini <Video poster>), keyed by
  # basename: ex-abc.mov -> thumbs/ex-abc.jpg. Cheap, so ensure it always.
  thumb="$UP/thumbs/${f%.*}.jpg"
  if [ ! -f "$thumb" ]; then
    nice -n 15 ffmpeg -y -v error -ss 0.5 -i "$f" -frames:v 1 -vf "scale=480:-2" "$thumb" 2>>"$LOG"
  fi

  # Already optimized?
  tag=$(ffprobe -v error -show_entries format_tags=comment -of default=nw=1:nk=1 "$f" 2>/dev/null | head -1)
  if [ "$tag" = "nx-opt" ]; then skip_n=$((skip_n+1)); continue; fi

  src_dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$f" 2>/dev/null | cut -d. -f1)
  tmp="$UP/.opt-tmp-$f"
  # Cap at 1920x1080 preserving aspect (never upscale), even dimensions.
  nice -n 15 ffmpeg -y -v error -i "$f" \
    -vf "scale=ceil(iw*min(1\,min(1920/iw\,1080/ih))/2)*2:ceil(ih*min(1\,min(1920/iw\,1080/ih))/2)*2,fps=30" \
    -c:v libx264 -crf 24 -preset veryfast -pix_fmt yuv420p \
    -c:a aac -b:a 96k \
    -metadata comment=nx-opt -movflags +faststart \
    "$tmp" 2>>"$LOG"

  out_dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$tmp" 2>/dev/null | cut -d. -f1)
  out_size=$(stat -c%s "$tmp" 2>/dev/null || echo 0)

  # Accept only if the output exists, is >100KB, and duration matches ±2s.
  if [ "$out_size" -gt 100000 ] && [ -n "$out_dur" ] && [ -n "$src_dur" ] \
     && [ $((out_dur - src_dur)) -le 2 ] && [ $((src_dur - out_dur)) -le 2 ]; then
    cp -p "$f" "$BAK/$f" 2>/dev/null || true
    mv "$tmp" "$f"
    done_n=$((done_n+1))
    purged_urls="$purged_urls https://media.trainnolimit.cn/uploads/$f"
    echo "OK $f $((out_size/1048576))MB" >>"$LOG"
  else
    rm -f "$tmp"
    fail_n=$((fail_n+1))
    echo "FAIL $f (src_dur=$src_dur out_dur=$out_dur size=$out_size)" >>"$LOG"
  fi
done

# ---- athlete form clips (fv-*) ----------------------------------------------
# WeChat's Android transcoder declares H.264 Level 6.0 (level_idc 60); Apple
# decoders accept <= 5.2 and refuse the stream outright
# (MEDIA_ERR_SRC_NOT_SUPPORTED — 2026-10-31, every clip on the coach's phone).
# Rewriting the SPS level is lossless (-c copy + h264_metadata bsf). VP8/HEVC
# clips get a real transcode so they play on desktop Chrome too. H.264 clips
# already <= 5.2 are left alone (tagged nx-opt so they're not re-probed).
for f in fv-*; do
  [ -f "$f" ] || continue
  case "$f" in *.mov|*.mp4|*.m4v) ;; *) continue;; esac
  thumb="$UP/thumbs/${f%.*}.jpg"
  if [ ! -f "$thumb" ]; then
    nice -n 15 ffmpeg -y -v error -ss 0.5 -i "$f" -frames:v 1 -vf "scale=480:-2" "$thumb" 2>>"$LOG"
  fi
  tag=$(ffprobe -v error -show_entries format_tags=comment -of default=nw=1:nk=1 "$f" 2>/dev/null | head -1)
  if [ "$tag" = "nx-opt" ]; then skip_n=$((skip_n+1)); continue; fi
  read -r codec level < <(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,level -of csv=p=0 "$f" 2>/dev/null | tr "," " ")
  codec=${codec:-}; level=${level:--1}
  tmp="$UP/.opt-tmp-${f%.*}.mp4"
  if [ "$codec" = "h264" ] && [ "$level" -le 52 ]; then
    skip_n=$((skip_n+1)); continue
  elif [ "$codec" = "h264" ]; then
    nice -n 15 ffmpeg -y -v error -i "$f" -c copy -bsf:v "h264_metadata=level=4.1" -movflags +faststart -metadata comment=nx-opt "$tmp" 2>>"$LOG"
  elif [ -n "$codec" ]; then
    nice -n 15 ffmpeg -y -v error -i "$f" \
      -vf "scale=ceil(iw*min(1\,min(1920/iw\,1920/ih))/2)*2:ceil(ih*min(1\,min(1920/iw\,1920/ih))/2)*2" \
      -c:v libx264 -profile:v high -level 4.1 -crf 24 -preset veryfast -pix_fmt yuv420p \
      -c:a aac -b:a 96k -metadata comment=nx-opt -movflags +faststart "$tmp" 2>>"$LOG"
  else
    skip_n=$((skip_n+1)); continue
  fi
  src_dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$f" 2>/dev/null | cut -d. -f1)
  out_dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$tmp" 2>/dev/null | cut -d. -f1)
  out_lvl=$(ffprobe -v error -select_streams v:0 -show_entries stream=level -of csv=p=0 "$tmp" 2>/dev/null)
  out_size=$(stat -c%s "$tmp" 2>/dev/null || echo 0)
  if [ "$out_size" -gt 50000 ] && [ -n "$out_dur" ] && [ -n "$src_dur" ] \
     && [ $((out_dur - src_dur)) -le 1 ] && [ $((src_dur - out_dur)) -le 1 ] && [ "${out_lvl:-99}" -le 52 ]; then
    cp -p "$f" "$BAK/$f" 2>/dev/null || true
    mv "$tmp" "$f"   # same filename: stored URLs keep working; player adds ?v=l41
    done_n=$((done_n+1))
    purged_urls="$purged_urls https://media.trainnolimit.cn/uploads/$f"
    echo "OK fv $f level=$out_lvl $((out_size/1024))KB" >>"$LOG"
  else
    rm -f "$tmp"
    fail_n=$((fail_n+1))
    echo "FAIL fv $f (src_dur=$src_dur out_dur=$out_dur level=$out_lvl size=$out_size)" >>"$LOG"
  fi
done

# The CDN may have cached the pre-optimization bytes under these URLs the
# moment a coach viewed them — purge so edges re-pull the rewritten file.
# Best-effort: purgeCdn.mjs exits 0 (no-op) when creds are absent or the CAM
# policy lacks cdn purge permission; the origin's no-cache-while-fresh header
# (server/index.ts /uploads setHeaders) is the backstop.
if [ -n "${purged_urls:-}" ]; then
  # shellcheck disable=SC2086
  /usr/bin/node --env-file=/opt/nolimit-training/.env \
    /opt/nolimit-training/scripts/purgeCdn.mjs $purged_urls >>"$LOG" 2>&1 || true
fi

echo "DONE optimized=$done_n skipped=$skip_n failed=$fail_n" | tee -a "$LOG"
du -sh "$UP" "$BAK" | tee -a "$LOG"
