---
name: deploy
description: Build-check, commit, and deploy nolimit-training or kangfu-zhuanjia to the Tencent HK server, then verify live. Use whenever Kent says "deploy", "ship it", "push it live", or work is finished and he has approved deployment. Handles the two repos' different deploy mechanics (GitHub pull vs git bundle).
---

# Deploy

Deploys one of the two production apps. Determine the target repo first — from
which repo the session's changes live in, or ask if changes span both (deploy
both, sequentially).

| Target | Repo path | Deploy transport | Server dir | PM2 app | Live URL |
|---|---|---|---|---|---|
| nolimit | `c:\Users\kentb\nolimit-training` | GitHub (server pulls origin) | `/opt/nolimit-training` | `nolimit-training` | https://trainnolimit.com |
| kangfu | `c:\Users\kentb\kangfu-zhuanjia` | **git bundle via scp** (server origin = `/tmp/kangfu.bundle`) | `/opt/kangfu-zhuanjia` | `kangfu-zhuanjia` | https://kangfu.trainnolimit.com |

SSH alias `nolimit` is preconfigured (43.132.228.109, key `~/.ssh/nolimit_deploy`).

## Preconditions — abort with a clear message if any fails

1. Kent has actually asked to deploy (or previously said to deploy without asking).
   Committed-but-undeployed work is the normal resting state, not a failure.
2. Working tree state is intentional: run `git status --short` **in the target
   repo** (cd explicitly — the shell cwd resets between commands). Uncommitted
   changes that belong to the deliverable get committed first; unrelated untracked
   files (e.g. `coaching-vault/`) are NEVER swept in — stage files by name, not
   `git add -A`, unless status shows only your own work.
3. Local gate: `npx tsc -b --force` clean AND `npm run build` clean in the target
   repo. The server build uses `tsc -b --force`, which catches unused-var errors an
   incremental local build masks. Never deploy past a red gate.

## Steps — nolimit

```bash
cd /c/Users/kentb/nolimit-training
npx tsc -b --force && npm run build
git push origin main
ssh nolimit "cd /opt/nolimit-training && git pull origin main && npm install --no-audit --no-fund && npx tsc -b --force && npx vite build && pm2 restart nolimit-training"
```

## Steps — kangfu

A GitHub push does NOT reach this server. Push anyway (backup), then ship the bundle:

```bash
cd /c/Users/kentb/kangfu-zhuanjia
npx tsc -b --force && npm run build
git push origin main
git bundle create /tmp/kangfu-deploy.bundle main
scp /tmp/kangfu-deploy.bundle nolimit:/tmp/kangfu.bundle
ssh nolimit "cd /opt/kangfu-zhuanjia && git pull origin main && npm install --no-audit --no-fund && npx tsc -b --force && npx vite build && pm2 restart kangfu-zhuanjia"
```

## Verify — a deploy without verification is not a deploy

1. `ssh nolimit "cd <server dir> && git log --oneline -1"` — must equal the local
   HEAD short hash. If it doesn't, the pull didn't take (for kangfu this almost
   always means the bundle wasn't uploaded).
2. `curl -s -o /dev/null -w "%{http_code}" <live URL>/` — must be 200. Give PM2
   ~5 seconds after restart before probing.
3. Behavior check: hit ONE live endpoint or page that exercises this deploy's
   change and confirm the new behavior (e.g. a new API returns its shape, a new
   field appears in `/api/exercises`). "It's probably fine" does not pass.
4. `ssh nolimit "pm2 list | grep <app>"` — status `online`, and the restart counter
   (`↺`) did not jump more than +1 (a climbing counter means crash-looping; check
   `pm2 logs <app> --lines 30 --nostream` immediately).

## Failure handling

- Server `tsc`/`vite` failure: fix locally, recommit, redeploy from the top. Never
  hand-edit files on the server.
- Crash loop after restart: `pm2 logs <app> --lines 50 --nostream`, diagnose; if
  the fix isn't in hand within a few minutes, roll back:
  `ssh nolimit "cd <server dir> && git reset --hard HEAD~1 && npx vite build && pm2 restart <app>"`
  then tell Kent exactly what happened and what's rolled back.
- Feishu API errors on first probe: `code 1254607` is transient throttling — wait
  20s and re-probe before suspecting the deploy.

## Report to Kent

One short paragraph: what's live now (behavior, not file names), the verification
that passed, and anything that still needs him (e.g. recharge DeepSeek). No deploy
command needed at the end — it already ran.
