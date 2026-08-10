# Feishu Company Ops — architecture & handoff

Audience: any AI agent (Codex, Claude) or developer touching the company's
Feishu operations layer. Built 2026-08-10 in one session, driven entirely via
the Feishu open API from local Node scripts. Read this before creating,
renaming, or "improving" anything in the ops tenant.

## Credentials & how to run

- App: 自建应用 `cli_aaf3251ae8389bcb` ("company operations" app).
  Credentials in `.env.local` (git-ignored) — `FEISHU_ADMIN_APP_ID`,
  `FEISHU_ADMIN_APP_SECRET`, plus the three base tokens below. These creds
  are SEPARATE from both products' Feishu creds (nolimit prod has none
  locally; kangfu's are its own). Never cross them (PIPL separation).
- Run pattern: `node --env-file=c:\Users\kentb\nolimit-training\.env.local <script.mjs>`
  (allowlisted in `.claude/settings.local.json`).
- Granted scopes: `bitable:app`, `drive:drive`, `wiki:wiki`, `docx:document`,
  `calendar:calendar`, `contact:user.employee_id:readonly`. Scope grants are
  admin-consent links (`open.feishu.cn/app/<id>/auth?q=<scopes>`); an API
  call that fails 99991672 returns the exact grant link in its error body.

## What exists (all app-owned, tenant acn3vin1oszp.feishu.cn)

| Thing | Token/ID | Sharing |
|---|---|---|
| 🔒 HR·财务 Confidential base | `FEISHU_ADMIN_BASE_APP_TOKEN` = OyCubtmyfaz6RyssKIxcmb6MnDd | **LOCKED**: link share closed; Kent explicit full_access member |
| 👥 团队运营 Team Ops base | `FEISHU_TEAMOPS_BASE_APP_TOKEN` = ABvrb409GaveQRsmgFscjR5LnjE | tenant_editable link |
| 📈 增长与内容 Growth & Content OS base | `FEISHU_GROWTH_BASE_APP_TOKEN` = T2HcbJjJ4a5XhFsKzFVcINFPnjd | tenant_editable link |
| Start Here hub doc | docx `NLFJdDHZUo3W0cx9MGEcwv3Nnhe` | tenant_editable |
| Policy docs (报销/提成/入职) | docx `LUzAdjsb…` / `TtnEdR8h…` / `IVIwdYiY…` | tenant_editable; carry a "Handbook prevails" banner |
| 报销申请 expense form | share/base/shrcnr1fxtOtnivPXuRgQuU9JLb | form-level share (independent of base lock) |
| 周报 / 平台数据 forms | shrcnFqwVQIVEpowtQ8Q7Kq2vHg / shrcnXwWUEFz1fiUCw1DtNOAUVh | form-level share |
| 公司日历 Company calendar | feishu.cn_YEIRLwQ6JJuk0tlE940Cdd@group.calendar.feishu.cn | public (tenant); Kent = writer; recurring Monday 10:00 growth meeting |
| 内容与拍摄 Content & Shoot calendar | feishu.cn_Xi7UsChug28usEosnnBgRa@group.calendar.feishu.cn | public (tenant); Kent = writer |
| 品牌与营销 footage folder | in KENT'S OWN Drive (not app space) | Kent shares to staff manually |

### Confidential base tables
Staff register · Payroll ledger (payday = 10th; + perf-bonus column) ·
Commission Rules (REAL rates from Employee Handbook V2.0 Appendix A-1 — see
below) · Commission Statements (+Quarter/Growth Bonus/Factor) · Monthly
Performance (contract Appendix 1: five categories 25/20/20/15/20 → bonus
2000/1500/1000/500/0 at 90/80/70/60; employee 3-working-day response field) ·
Expenses ledger (+city-tier hotel caps 500/400/300, pre-approved flag,
approval kanban; fed by the shared form).

### Growth & Content OS tables (Yumei's workspace, per her Role Playbook Part VI)
Content Calendar (12-status kanban pipeline, needs-founder-OK flag, form for
idea intake, metrics incl. attributed revenue) · Campaigns · KOL & Partners
(10-stage kanban) · Leads CRM (kanban + intake form; "no health data" rule in
the notes field name) · Platform Metrics (+entry form) · Weekly Reports &
Milestones (the playbook's A–F Friday format + founder-feedback field, form +
review kanban).

### Team Ops tables
Assets · Onboarding (11 generic checklist tasks + Yumei's contract 90-day
milestones) · Internal Requests (kanban + form).

## Commission rules seeded (source: Employee Handbook V2.0, Appendix A-1)
Digital programs 4/5/6% tiered at ¥25k/¥50k monthly attributable net
collected revenue · online 1:1 8% of new client's first 3 paid months ·
in-person 3% first package · team/institution first contract 2% (>¥300k needs
pre-signing written rate) · renewals 1% written-approval-only · activated
partner bonus ¥500 once per partner at ≥¥10k cumulative · quarterly growth
bonus 2k/5k/10k/15k at 150k/300k/500k/800k × personal factor (monthly perf
90+=100%, 80-89=80%, 70-79=50%, <70=0). Settlement: monthly calc, quarterly
reconciliation, paid with payroll on 4/10, 7/10, 10/10, 1/10; refunds claw
back from unpaid variable comp only.

## Design decisions & their logic (don't re-litigate without new facts)

1. **Two ops bases + one growth base, not four ops bases** (Codex's original
   4-way split). Bitable record links CANNOT cross bases; splitting
   staff/payroll/commissions apart would orphan every 员工 link and force
   duplicate staff lists. Two bases give the same confidentiality boundary
   (founders vs staff) with working links. The third base is Yumei's
   workspace, separate because its audience and lifecycle differ.
2. **Confidentiality via base boundary, not row permissions.** Bitable
   row-level/advanced permissions are a paid tier; the free boundary is the
   base. Hence: anything staff must not see lives in the Confidential base;
   anything staff submit into it goes through a FORM (form fillers never see
   the table).
3. **Native Approval app (审批) deliberately NOT created via API.** Feishu
   warns API-created approval definitions are hard/impossible to delete.
   If/when formal approval chains are wanted (esp. leave with balances),
   Kent builds them from templates in the admin UI. The expense FORM +
   kanban covers claims at 4-person scale meanwhile.
4. **Postgres stays authoritative for sales/commissions.** The platform's
   orders/referral codes are the attribution source. A future monthly sync
   script computes attributable net collected revenue per the rules above and
   writes Commission Statements rows; staff never edit earned amounts.
   Not built yet — nothing is sold yet.
5. **Policy numbers live in ONE place.** The signed contract + Employee
   Handbook prevail; the three Feishu policy docs are summaries and carry a
   banner saying so (they briefly contradicted the handbook — 10% flat vs
   4-6% tiered — which is exactly how labor disputes start).
6. **YAGNI on enterprise tables** (vendors, cash-flow, compliance calendar,
   licence registry, training records): add when the first real record
   exists, not before.

## API gotchas learned (save yourself the hour)

- **App-owned ≠ human-visible.** Bases/docs/folders created by the app live
  in the app's space; humans see them only via link shares or explicit
  membership. Bases/docs: `PATCH /drive/v1/permissions/{token}/public` works.
  **Folders: NO public-share API at all** (`type=folder` rejected) → folders
  humans need must be created by a human (hence the footage folder lives in
  Kent's Drive).
- **Member grants need a real user id.** `member_type: "email"` fails
  (1063001) unless the email is the person's actual Feishu login. Resolve
  via `POST /contact/v3/users/batch_get_id` — **Kent's Feishu login is
  mobile +8617606523711** (not his gmail, not 15651989261).
- **Form sharing is independent** of the base's public link setting:
  `PATCH .../forms/{view_id} {shared: true, shared_limit: "tenant_editable"}`
  then GET returns `shared_url`. Works even on the locked base.
- Kanban/form views can be created via API (`POST .../views`), but a
  CALENDAR view's date-field binding cannot (field validation error) —
  2 clicks in the UI instead.
- The API-created base arrives with a default `数据表` containing 10 EMPTY
  rows — `{}` fields, safe to delete, but always re-check emptiness at
  delete time.
- Number/date field properties: `{formatter}` / `{date_formatter,auto_fill}`;
  select options via `property.options[{name}]`; link fields type 18 with
  `property.table_id` (same base only).

## Open items

- Kent verifying 营业执照 vs handbook draft: credit code `MAKEAFD20G`
  (filings, passed Tencent verification) vs `MAKAFPTD20G` (handbook), and
  address 825室 vs 825D. Whichever is wrong gets corrected everywhere.
- When Yumei's Feishu account exists: share Growth OS + Team Ops + footage
  folder + the three form links + Start Here; subscribe her to both
  calendars; she must NOT get Confidential access or any super-admin role.
- Admin-UI work (Kent, optional): Approval templates (请假/差旅), attendance
  schedule 09:30–18:30 matching the handbook.
- Future build: Postgres → Commission Statements monthly sync (trigger:
  first real sales); per-staff attribution codes in the store.
