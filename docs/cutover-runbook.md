# Postgres cutover runbook — trainnolimit.cn on the Shanghai CVM

**Trigger:** ICP beian approval for trainnolimit.cn (order 30178426682034412,
Guangdong bureau, submitted 2026-07-17). Until then: do nothing here.

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
