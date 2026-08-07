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

done_n=0; skip_n=0; fail_n=0
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
    echo "OK $f $((out_size/1048576))MB" >>"$LOG"
  else
    rm -f "$tmp"
    fail_n=$((fail_n+1))
    echo "FAIL $f (src_dur=$src_dur out_dur=$out_dur size=$out_size)" >>"$LOG"
  fi
done

echo "DONE optimized=$done_n skipped=$skip_n failed=$fail_n" | tee -a "$LOG"
du -sh "$UP" "$BAK" | tee -a "$LOG"
