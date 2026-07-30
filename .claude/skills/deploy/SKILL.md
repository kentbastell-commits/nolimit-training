---
name: deploy
description: Build-check, commit, and deploy nolimit-training (Shanghai CVM via bundle) or kangfu-zhuanjia (HK via bundle), then verify live. Use whenever Kent says "deploy", "ship it", "push it live", or work is finished and he has approved deployment. Handles each target's transport — GitHub is a backup for nolimit, NOT its deploy path.
---

# Deploy

Deploys one of the two production apps. Determine the target repo first — from
which repo the session's changes live in, or ask if changes span both (deploy
both, sequentially).

| Target | Repo path | Deploy transport | Server (ssh alias) | Server dir | PM2 app | Live URL |
|---|---|---|---|---|---|---|
| nolimit | `c:\Users\kentb\nolimit-training` | **git bundle via scp** (GitHub is blocked FROM the mainland box — a push deploys NOTHING) | `nolimit-cn` (124.222.125.91, Shanghai) | `/opt/nolimit-training` | `nolimit-training` | https://trainnolimit.cn |
| kangfu | `c:\Users\kentb\kangfu-zhuanjia` | **git bundle via scp** (server origin = `/tmp/kangfu.bundle`) | `nolimit` (43.132.228.109, HK) | `/opt/kangfu-zhuanjia` | `kangfu-zhuanjia` | https://kangfu.trainnolimit.com |

**Since the 2026-07-27 cutover, nolimit production is the SHANGHAI box.**
trainnolimit.com is only an HK nginx pass-through to trainnolimit.cn; the HK
`nolimit-training` app on :3001 is a rollback relic — updating it deploys
nothing a user can see (the ghost-deploy trap, now on nolimit too). The HK
**twin** (:8443, `nolimit-training-pg`, throwaway DB) still lives on HK and
still serves mini-program DEV builds — deploy to it separately if a dev-build
feature needs new endpoints. Shanghai ops note: its sshd drops long-lived
sessions — run long server commands via
`sudo systemd-run --unit=x --uid=ubuntu --gid=ubuntu --collect bash -c
'... > /tmp/x.log'` and poll the log; the repository is owned by `ubuntu`, so
omitting the user flags makes root Git reject it as dubious ownership. Simply
retry short commands that die with "Connection closed".

## Preconditions — abort with a clear message if any fails

1. Kent has actually asked to deploy (or previously said to deploy without asking).
   Committed-but-undeployed work is the normal resting state, not a failure.
2. Working tree state is intentional: run `git status --short` **in the target
   repo** (cd explicitly — the shell cwd resets between commands). Uncommitted
   changes that belong to the deliverable get committed first; unrelated untracked
   files (e.g. `coaching-vault/`) are NEVER swept in — stage files by name, not
   `git add -A`, unless status shows only your own work.
3. Local gate — all three must be clean in the target repo, in this order:
   `npx tsc -b --force`, `npm run build`, and `npx vitest run --maxWorkers=1`
   (nolimit only; ~2 min). The server build uses `tsc -b --force`, which catches
   unused-var errors an incremental local build masks. **Tests are part of the
   gate**: they run against a real local Postgres and are the only thing that
   catches a broken money path or a leaked athlete read before a client does.
   Use `--maxWorkers=1` — higher values give phantom whole-suite failures
   (named mistake #15). Never deploy past a red gate.
4. A standalone subtree deployed outside its parent repo must also pass `npm ci`
   and its production build after extraction on the target. Parent `node_modules`
   hoisting can hide missing direct dependencies locally. Apply Nginx patches
   from the config directory with relative filenames; GNU patch rejects absolute paths.

## Steps — nolimit (Shanghai)

A GitHub push does NOT reach production. Push anyway (source-of-truth backup),
then ship the bundle:

```bash
cd /c/Users/kentb/nolimit-training
npx tsc -b --force && npm run build && npx vitest run --maxWorkers=1
git push origin main
git bundle create /tmp/nolimit-deploy.bundle main
scp /tmp/nolimit-deploy.bundle nolimit-cn:/tmp/nolimit.bundle
ssh nolimit-cn "cd /opt/nolimit-training && git pull origin main && npm install --no-audit --no-fund && npx drizzle-kit migrate && npx tsc -b --force && npx vite build && pm2 reload ecosystem.config.cjs --only nolimit-training"
```

If the ssh step dies with "Connection closed" mid-build, re-run just that step
— or run it detached via systemd-run and poll (see the ops note above).

**Cluster mode (since 2026-07-30):** nolimit-training runs as 2 PM2 cluster
workers via `ecosystem.config.cjs` in the repo root (a crash in one worker no
longer takes the whole site down, and it spreads load across 2 CPU cores).
`pm2 reload` (not `restart`) does a rolling reload — one worker at a time, so
there's no full-outage gap during a deploy. `pm2 list` now shows 2 rows for
`nolimit-training`; the restart-counter check in Verify below applies to
EACH row. Never change `pm2 restart nolimit-training` back to a bare
single-process command — that silently drops back to one instance with no
redundancy. If `ecosystem.config.cjs` itself changes (e.g. instance count,
`PG_POOL_MAX`), `pm2 reload` picks up the new file automatically since it's
referenced by path each deploy.

`drizzle-kit migrate` is idempotent (prod tracks applied migrations in
`drizzle.__drizzle_migrations`) — safe on every deploy, and REQUIRED whenever
`server/db/migrations/` gained a file. Never hand-apply migration SQL with
psql on prod: mixing manual applies with drizzle tracking desyncs the journal.

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

## Steps — NoLimit mini program

Build from `c:\Users\kentb\nolimit-miniprogram`, then upload through the installed
WeChat DevTools CLI. An upload creates a new development version; it is not the
same as submitting for review or releasing it in the WeChat admin.

```powershell
npx tsc --noEmit
npm run build:weapp
& 'C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat' islogin --project 'C:\Users\kentb\nolimit-miniprogram'
& 'C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat' upload --project 'C:\Users\kentb\nolimit-miniprogram' --version '<version>' --desc '<description>' --debug
```

DevTools can report one port from `islogin` while the already-running IDE is
actually listening on another. If upload stalls, stop only the exact CLI upload
process, retry with `--debug`, and use the port from “IDE server has started on
http://127.0.0.1:<port>” as `--port <port>`. Never kill all Node/DevTools processes.

## Verify — a deploy without verification is not a deploy

Use the target's own ssh alias (`nolimit-cn` for nolimit, `nolimit` for kangfu).

1. `ssh <alias> "cd <server dir> && git log --oneline -1"` — must equal the local
   HEAD short hash. If it doesn't, the pull didn't take (bundle transports: this
   almost always means the bundle wasn't uploaded). Trap (bit once 2026-07-18):
   a file scp'd into the server worktree and LATER committed makes `git pull`
   abort on "untracked working tree files would be overwritten" — and
   `pull | tail -1` shows a healthy-looking "Updating a..b" line while HEAD
   never moves. Never scp into the server repo (use /tmp and run from there);
   if it happened, `rm` the colliding file and re-pull.
2. `curl -s -o /dev/null -w "%{http_code}" <live URL>/` — must be 200. Give PM2
   ~5 seconds after restart before probing. For nolimit, probe
   https://trainnolimit.cn AND https://trainnolimit.com — the second proves the
   HK pass-through still forwards to the new build.
3. Behavior check: hit ONE live endpoint or page that exercises this deploy's
   change and confirm the new behavior (e.g. a new API returns its shape, a new
   field appears in `/api/exercises`). "It's probably fine" does not pass.
4. `ssh <alias> "pm2 list | grep <app>"` — status `online`, and the restart counter
   (`↺`) did not jump more than +1 (a climbing counter means crash-looping; check
   `pm2 logs <app> --lines 30 --nostream` immediately). nolimit-training runs as
   2 cluster workers, so this shows 2 rows — check both.
5. nolimit only: `ssh nolimit-cn "crontab -l | grep -c healthCheck"` must return
   2 — the 5-minute watchdog and the 06:00 morning report run on the SHANGHAI
   box now. Kent has no ops person, so those two are how he learns about a
   problem without a client telling him; a deploy that silently drops them
   leaves him blind.

## Failure handling

- Server `tsc`/`vite` failure: fix locally, recommit, redeploy from the top. Never
  hand-edit files on the server.
- Crash loop after restart: `pm2 logs <app> --lines 50 --nostream`, diagnose; if
  the fix isn't in hand within a few minutes, roll back:
  `ssh nolimit "cd <server dir> && git reset --hard HEAD~1 && npx vite build && pm2 restart <app>"`
  (nolimit-training: `pm2 reload ecosystem.config.cjs --only nolimit-training`
  instead of `restart`, same reason as the deploy step) then tell Kent exactly
  what happened and what's rolled back.
- Feishu API errors on first probe: `code 1254607` is transient throttling — wait
  20s and re-probe before suspecting the deploy.

## Report to Kent

One short paragraph: what's live now (behavior, not file names), the verification
that passed, and anything that still needs him (e.g. recharge DeepSeek). No deploy
command needed at the end — it already ran.
