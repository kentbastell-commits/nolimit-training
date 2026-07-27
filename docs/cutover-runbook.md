# Postgres cutover runbook — trainnolimit.cn on the Shanghai CVM

**⚡ 2026-07-21: THE DATABASE SWAP ALREADY HAPPENED — on the HK box.** Kent
approved doing the Feishu→Postgres flip early on familiar ground. Production
(`trainnolimit.com`, pm2 `nolimit-training`) now runs `DATA_BACKEND=postgres`
against local DB **`nolimit_prod`** (17/17 write battery, live write round-trip
verified). The twin keeps throwaway DB `nolimit` via an explicit pm2-env
`DATABASE_URL` override (pinned BEFORE the shared `.env` was repointed).
Nightly `pg_dump` cron at 03:30 → `/opt/backups/pg`, 14-day retention.
Feishu is now a **frozen read-only mirror** — edits there do nothing.
Rollback (if ever needed): revert the two `.env` lines (`DATA_BACKEND`,
`DATABASE_URL` → `/nolimit`) + `pm2 restart nolimit-training`; Feishu data
frozen at 2026-07-21.

**What remains of this runbook** is the SERVER + DOMAIN move (HK → Shanghai
CVM, trainnolimit.cn): now a much simpler **pg→pg** move — `pg_dump
nolimit_prod` → restore on nolimit-cn replaces steps 1–2 (no Feishu freeze, no
ETL); steps 3–9 unchanged. Off-box backup shipping (HK→CN rsync of
/opt/backups/pg) still worth adding.

**Trigger:** ICP beian approval for trainnolimit.cn (order 30178426682034412,
Guangdong bureau, submitted 2026-07-17). **APPROVED 2026-07-27.**

**⚡ 2026-07-27: PRE-FLIGHT COMPLETE — the CN box is cutover-ready.**
Executed same day as approval: code brought current via bundle (b529949, the
post-Feishu-retirement codebase — there is no `DATA_BACKEND` switch any more,
so step 3's flip is obsolete); `nolimit_prod` created and restored from that
morning's HK dump (row counts matched HK exactly: clients=5, workouts=26,
logs=238 — this doubled as the first real restore drill of the nightly
backups); `drizzle-kit migrate` applied 0008; twin (app 1, :3101) pinned to
throwaway `nolimit` in its OWN pm2 env BEFORE the shared `.env` was repointed
(mistake #41); app rebuilt + restarted; **write battery 17/17** against the
box. NOTE the runbook's port was wrong: the CN main app serves on **:3001**
(not 3100). Also note: the CN box's ssh drops occasionally mid-command
(GFW/middlebox flakiness) — re-run, don't diagnose.

**⚡⚡ 2026-07-27 evening: CUTOVER EXECUTED — trainnolimit.cn IS LIVE from
the Shanghai box.** DNS (@ + www → 124.222.125.91), certbot TLS with
http→https redirect, final delta dump→restore from HK (client_messages
included), ICP footer (粤ICP备2026103091号) verified in the served bundle,
live WRITE round-trip via https://trainnolimit.cn (clientMessage create →
read-back → cleaned; bot ping fired). Monitoring live on CN: 5-min watchdog +
06:00 report (HEALTH_SITE_URL=.cn) + nightly pg_dump; HK now PULLS CN
backups to /opt/backups/pg-cn/ at 04:45 (CN is the live origin — backup flow
reversed). Mini program repointed (prod API_BASE=https://trainnolimit.cn,
uploaded 2026.07.27.2). CN egress IP confirmed 124.222.125.91 (for the
AppSecret whitelist). CN ops note: sshd drops long-lived sessions — run long
commands via `sudo systemd-run --unit=x --collect bash -c '... > /tmp/x.log'`
and poll the log; retry short commands on "Connection closed".

**✅ SPLIT BRAIN CLOSED (2026-07-27, Kent-approved):** trainnolimit.com is
now a PASS-THROUGH — HK nginx terminates .com TLS and proxies everything to
https://trainnolimit.cn (Host+SNI rewritten to the filed domain or mainland
ingress rejects it). Proven by planting a row directly in the Shanghai DB and
reading it back through .com; image uploads 200 through both doors. ONE
backend, one database (Shanghai). The HK app on :3001 still runs but nothing
external reaches it — rollback only (config backup:
nolimit-training.conf.bak-pre-proxy; restoring it accepts losing post-cutover
data). Final 3.9G uploads rsync HK→CN ran at proxy time. The HK twin (:8443)
is untouched and still serves mini-program DEV builds.

**🚧 Launch gate ON (2026-07-27):** both domains serve public/coming-soon.html
to visitors without the gate cookie; /api/ + /uploads/ exempt (mini program
unaffected). Entry token lives in the CN nginx conf + local memory (not
printed here). Lift at launch: restore nolimit-training.conf.bak-pre-gate on
nolimit-cn + nginx reload.

**Kent-side remaining:** mp-admin request-domain whitelist
(https://trainnolimit.cn), AppSecret IP whitelist → 124.222.125.91, decide
the .com redirect, 小程序备案; 公安备案 clock (30 days) started 2026-07-27.
Post-cutover pass below still applies (privacy policy per mistake #19, TMT
env, WECHAT_MINI_* env on CN).

**Shape of the move:** Feishu stops being the database and becomes a frozen
backup. The Shanghai CVM (`ssh nolimit-cn`, 124.222.125.91) serves
trainnolimit.cn with `DATA_BACKEND=postgres` against its local PostgreSQL 16.
The HK box stays running as fallback for ~2 weeks.

Rehearsed end-to-end 2026-07-18: both twins ETL-loaded fresh, 29-endpoint
parity harness run (`scripts/parity-check.mjs`), all mismatches fixed or classified (see "Accepted
differences" below).

## Pre-flight (any day before)

- [ ] `git log` on nolimit-cn == GitHub main (bundle deploy: `git bundle create
      /tmp/nolimit-deploy.bundle main` → `scp` → `nolimit-cn:/tmp/nolimit.bundle`
      → `git pull origin main`)
- [ ] `npx drizzle-kit migrate` clean on nolimit-cn (all migrations applied)
- [ ] Announce a quiet window to coaches (writes made in Feishu after the final
      ETL are lost)

## Cutover day, in order

1. **Freeze Feishu writes** (stop coach edits; the app keeps running on HK).
2. **Final ETL** on nolimit-cn (Feishu → Shanghai pg, truncate+insert,
   idempotent — safe to re-run on any failure):
   `ssh nolimit-cn "cd /opt/nolimit-training && nohup npx tsx server/db/etl/run.ts > /tmp/etl-final.log 2>&1 &"`
   Verify: `grep loaded /tmp/etl-final.log` — row counts sane, no table
   unexpectedly 0. (assigned_forms must be > 0 — the 2026-07-18 filter fix.)
3. **Flip the CN main app to Postgres**: in `/opt/nolimit-training` pm2 config
   for `nolimit-training` (port 3100/prod), set `DATA_BACKEND=postgres`,
   `pm2 restart nolimit-training --update-env`. Smoke on the box:
   `curl 127.0.0.1:<port>/api/programs` serves business-code ids.
4. **Nginx + TLS on nolimit-cn**: server_name trainnolimit.cn (+ www);
   `certbot --nginx -d trainnolimit.cn -d www.trainnolimit.cn` (run AFTER DNS
   points at the box, or use DNS-01 first). Mirror the HK nginx conf including
   the `/api/uploadFormVideoFile` 550m location and `/uploads` static block.
5. **Media**: `/opt/nolimit-training/uploads` already syncs HK→CN; run one final
   rsync (detached) before DNS: uploads are write-heavy near cutover.
6. **DNS**: point trainnolimit.cn A record → 124.222.125.91. (trainnolimit.com
   stays on HK until its own migration decision; .com transfer eligible
   ~2026-08-19.)
7. **Write battery** against the box BEFORE DNS (17 steps: order → payment
   gate → fulfilment → logging → check-in review → forms → videos → coaching
   signup → cascade delete; self-cleaning):
   `BATTERY_BASE=http://127.0.0.1:<port> node scripts/twin-write-battery.mjs --i-know-this-is-preprod`
   Must be 17/17. (Passed 17/17 vs the HK twin 2026-07-18.)
8. **Verify live** (from a mainland vantage if possible):
   - https://trainnolimit.cn 200, portal loads, coach console loads
   - one real WRITE round-trip: save a workout log on a test client, read back
   - store checkout → Pending order appears; NO fulfilment before coach verify
   - mini program dev build pointed at https://trainnolimit.cn works (then
     update `config/index.js` API_BASE + request-domain whitelist in
     mp.weixin.qq.com)
9. **Feishu → read-only** (~2 weeks): tell coaches Feishu is now a stale
   mirror; all edits happen in the app.

## Rollback (any point before DNS TTL settles)

DNS back to HK (43.132.228.109) — HK is still running Feishu-backed and was
never touched. Data written to Shanghai pg during the failed window must be
re-entered by hand (keep the window short; freeze writes if rolling back).

## Post-cutover pass (within days)

- [ ] **Privacy policy update** (named mistake 19): data now lives in mainland
      China — remove the temporary cross-border consent from signup flows,
      update trainnolimit.com/legal text, record the change date.
- [ ] Feishu translate-on-write is replaced by TMT on the server — confirm
      `TENCENT_TMT_*` env on nolimit-cn (enterprise-account sub-user key).
- [ ] `WECHAT_MINI_APPID`/`WECHAT_MINI_SECRET` env on nolimit-cn (one-tap login).
- [ ] WeChat AppSecret **IP whitelist** (mp.weixin.qq.com → 开发管理 → 开发设置 →
      IP白名单): replace the HK IP 43.132.228.109 with the new server's egress IP
      (verify with `curl ifconfig.me` FROM the box) same day, or jscode2session
      calls get rejected and one-tap login silently dies (enabled 2026-07-21).
- [ ] 公安备案 within 30 days of the site going live on the filed domain.
- [ ] 小程序备案 via mp.weixin.qq.com (needs the approved 主体备案号), then
      request-domain whitelist → WeChat review (decide 商户号 vs store flag-off
      first).
- [ ] Nightly `pg_dump` off-box confirmed running on nolimit-cn.
- [ ] Decide admin UI (Drizzle Studio via tunnel — demoed, pending verdict).

## Accepted backend differences (parity-verified 2026-07-18, do NOT chase)

- `id`/`clientId`-style fields: Feishu returns record_ids, Postgres returns
  business codes (CL-…, AW-…). By design; frontends treat them opaquely.
- `/api/teams` `memberIds` + `positions` keys: record_ids → client codes.
- `/api/contentResponses?clientId=CL-…`: Feishu matches record_id text, pg
  matches codes — callers always pass the id the same backend handed them.
- Assignment `status`/`assignedDate`/`clientName`: pg returns richer, more
  correct values (Feishu read maps legacy aliases). Improvement, not regression.
- CL-0001 phone on twins is the staging demo value `13800000001` (re-set after
  every ETL for Claire mini-program demo; prod value differs).
