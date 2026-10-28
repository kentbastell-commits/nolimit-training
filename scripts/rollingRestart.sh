#!/usr/bin/env bash
# Rolling restart of the two production forks with a real readiness wait.
#
# Why not `pm2 reload ecosystem.config.cjs`? In fork mode PM2's "reload" is a
# kill+start per app, and it moved on to the second app as soon as the first
# PROCESS existed — not when it was listening. tsx takes ~3 s to boot, so both
# forks were down together and nginx answered 502 to whoever was mid-workout
# (2026-10-27 10:42, 11 requests for one athlete). This script restarts one
# app, polls its port until the server answers, then does the other.
#
# Also the only way to pick up changed ecosystem options (wait_ready,
# listen_timeout): `pm2 start <file> --only <app>` after a delete re-reads
# the file; a bare reload keeps the old process description.
#
# Usage (on the server, from /opt/nolimit-training):
#   bash scripts/rollingRestart.sh
set -euo pipefail
cd "$(dirname "$0")/.."

wait_for() { # name port
  local name="$1" port="$2" i
  for i in $(seq 1 60); do
    if curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${port}/api/programs"; then
      echo "[rolling] ${name} answering on :${port} after ${i}s"
      return 0
    fi
    sleep 1
  done
  echo "[rolling] ${name} did NOT answer on :${port} within 60s — check pm2 logs ${name}" >&2
  return 1
}

restart_one() { # name port
  local name="$1" port="$2"
  echo "[rolling] restarting ${name}"
  pm2 delete "${name}" >/dev/null 2>&1 || true
  pm2 start ecosystem.config.cjs --only "${name}" >/dev/null
  wait_for "${name}" "${port}"
}

restart_one nolimit-training 3001
restart_one nolimit-training-2 3002
pm2 save >/dev/null
pm2 list | grep nolimit-training
