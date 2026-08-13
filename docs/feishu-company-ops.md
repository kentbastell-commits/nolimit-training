# Feishu Company Ops — architecture & handoff

Audience: any AI agent (Codex, Claude) or developer touching the company's
Feishu operations layer. Built 2026-08-10 in one session, driven entirely via
the Feishu open API from local Node scripts. Read this before creating,
renaming, or "improving" anything in the ops tenant.

## Credentials & how to run

- App: 自建应用 `cli_aaf3251ae8389bcb` ("company operations" app).
  Credentials in `.env.local` (git-ignored) — `FEISHU_ADMIN_APP_ID`,
  `FEISHU_ADMIN_APP_SECRET`, plus the three base-token environment variables
  listed below. The migration/runtime scripts also discover the private table,
  form, calendar and Drive IDs used by the portal. Their values must remain in
  local/server environment files. These creds are SEPARATE from both products'
  Feishu creds (nolimit prod has none locally; kangfu's are its own). Never
  cross them (PIPL separation).
- Run pattern: `node --env-file=c:\Users\kentb\nolimit-training\.env.local <script.mjs>`
  (allowlisted in `.claude/settings.local.json`).
- Granted scopes: `bitable:app`, `drive:drive`, `wiki:wiki`, `docx:document`,
  `calendar:calendar`, `contact:user.employee_id:readonly`. Scope grants are
  admin-consent links (`open.feishu.cn/app/<id>/auth?q=<scopes>`); an API
  call that fails 99991672 returns the exact grant link in its error body.

## What exists (all app-owned, tenant acn3vin1oszp.feishu.cn)

| Thing | Token/ID | Sharing |
|---|---|---|
| 🔒 HR·财务 Confidential base | `FEISHU_ADMIN_BASE_APP_TOKEN` | **LOCKED**: link share closed; founder explicit full_access member |
| 👥 团队运营 Team Ops base | `FEISHU_TEAMOPS_BASE_APP_TOKEN` | link closed; only explicit collaborators/app; staff use the authenticated workspace/forms |
| 📈 增长与内容 Growth & Content OS base | `FEISHU_GROWTH_BASE_APP_TOKEN` | link closed; only explicit collaborators/app; staff use the authenticated workspace/forms |
| Start Here hub doc | managed app-owned document | tenant-readable; editing restricted |
| Policy docs (报销/提成/入职) | managed app-owned documents | tenant-readable; editing restricted; carry a "Handbook prevails" banner |
| 报销申请 expense form | managed inside the Expenses table | unshared; staff submit through the authenticated workspace |
| 周报 / 平台数据 forms | managed inside their Growth tables | unshared; staff submit through the authenticated workspace |
| 公司日历 Company calendar | managed tenant calendar | tenant-visible; founder = writer; recurring Monday 10:00 growth meeting |
| 内容与拍摄 Content & Shoot calendar | managed tenant calendar | tenant-visible; founder = writer |
| 公司共享资料 Company Shared Assets | dedicated Company Operations Drive folder | private; founder = full access; approved Growth users = edit; other approved staff = view |

### Confidential base tables
Staff register · Payroll ledger (payday = 10th; + perf-bonus column) ·
Commission Rules (REAL rates from Employee Handbook V2.0 Appendix A-1 — see
below) · Commission Statements (+Quarter/Growth Bonus/Factor) · Monthly
Performance (private source of truth for the portal workflow described below:
five categories 25/20/20/15/20 → bonus 2000/1500/1000/500/0 at
90/80/70/60; employee 3-working-day response field) ·
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

## Private monthly performance and bonus workflow

The user-facing workflow lives at `/company-ops` under **Performance / 月度绩效**.
The `月度绩效 Monthly Performance` table remains inside the Confidential Base;
staff never receive its raw Base link. The server resolves the signed-in Feishu
account to one Staff record and returns only that employee's cycles. A client
payload cannot choose another employee, set a score, change a weight, write a
bonus, or advance the workflow status.

| Role | What the person sees and can do |
|---|---|
| Founder | All active employees and all monthly cycles; set the month, report deadline and measurable success standard for each fixed category; request additions; score; review challenges; finalise and stage the accepted performance bonus to payroll. |
| Growth (Yumei) | **My Month** only: her five agreed goals, weights, deadline and status; submit one summary plus a result for every goal; add evidence links or upload a small video; see the founder's score/feedback; accept it or ask for review. She cannot see another employee's cycle, raw payroll, identity/bank details or the Confidential Base. |
| Staff / Finance | Their own linked performance cycles and employee response actions. They can view Company Shared Assets; direct portal upload is reserved for Growth and founders. Finance access does not reveal other employees' performance cycles. |
| Pending | The access-request screen only; no Company Operations records. |

The lifecycle is deliberately explicit:

1. The founder opens Performance before the month, selects an active employee,
   and confirms the month, report deadline and success measure for all five
   fixed categories: Content & Delivery (25%), Quality & Optimization (20%),
   Campaigns & Partners (20%), Community & Leads (15%), and Ownership (20%).
2. The employee submits a monthly report containing a short overall summary,
   one result per category, optional context, and private Feishu evidence links.
3. The founder either requests more information or scores every category from
   0–100. The server calculates the weighted total, the pre-tax monthly bonus
   (≥90 = ¥2,000; ≥80 = ¥1,500; ≥70 = ¥1,000; ≥60 = ¥500; below 60 = ¥0),
   and the applicable personal factor (1.0 / 0.8 / 0.5 / 0).
4. The employee accepts the latest assessment or submits a reasoned challenge.
   A challenge returns the cycle for review and scoring; it cannot silently
   overwrite the founder's assessment.
5. Only after the employee accepts the latest score can the founder finalise.
   Finalisation writes only `月度绩效奖金 Perf Bonus` into the matching payroll
   month. It does not alter base salary, commissions, reimbursements or an
   already locked/paid payroll record.

### Yumei's first-time setup

1. Yumei signs in at `/company-ops` with her own company Feishu account.
2. If access is denied, she leaves **Brand & Growth / 品牌与增长** selected and
   submits the access request. Do not make her a founder, finance user,
   super-admin or Confidential Base collaborator.
3. A founder approves the request in Company Operations. This links her Feishu
   identity to an active Staff record and attempts to grant `edit` on the
   private Company Shared Assets folder. If the folder grant warns, verify and
   add her manually in Feishu Drive; do not enable public sharing.
4. After approval, she signs in again. The founder can then select her in the
   Performance goal setter. Until the Staff link exists, no employee cycle is
   exposed and she will not appear in the selector.

## Feishu Drive video evidence

Growth users and founders have a drag-and-drop video area on the Performance
page. The browser sends the file to the authenticated Company Operations upload
endpoint, which validates the session, CSRF token, role, content type, file
signature and size before uploading it into `公司共享资料 Company Shared Assets`.
The returned private Feishu file link is inserted into the employee's evidence
list. Other approved roles get a read-only link to the folder rather than an
upload control.

Feishu's one-shot file endpoint caps a request at 20 MiB, so the portal
automatically switches larger files to Feishu's official multipart upload flow.
The Company Operations safety cap is **500 MiB per file**; the tenant's current
storage-plan quota still applies. Keep raw social-video working files in the
shared assets tree; keep identity, bank, payroll, legal and health data out of it.

## Commission rules — REVISED 2026-08-12 (Kent's decision; supersedes Handbook V2.0 Appendix A-1)
Campaign-attributed sales only (no tracking code = no commission):
digital programs **10%** of net collected revenue, **13%** on the portion
above **¥80,000** in a calendar month · online 1:1 **8%** of the new client's
first 3 paid months · in-person **5%** first package · team/institution and
presentations/workshops/camps: **pre-approved written flat fee**, agreed
before the opportunity is approved. Attribution share applies (originator 40 /
manager 40 / closer 20; founder-approved staff share is what's paid).

The old tiered model (digital 4/5/6% at ¥25k/¥50k, in-person 3%, team 2%,
renewals 1%) is RETIRED — it was too low and too complicated to motivate, and
the tier direction penalised exactly the launch months that need the push.
Executable copy: `server/companyOps/campaignPolicy.ts`. Still current from the
handbook: activated-partner bonus ¥500 once per partner at ≥¥10k cumulative;
settlement monthly calc, paid with payroll (refunds claw back from unpaid
variable comp only). **Handbook Appendix A-1 and the Feishu 提成规则 table must
be updated to match — until they are, they contradict what the app pays.**

## Design decisions & their logic (don't re-litigate without new facts)

1. **Two ops bases + one growth base, not four ops bases** (Codex's original
   4-way split). Bitable record links CANNOT cross bases; splitting
   staff/payroll/commissions apart would orphan every 员工 link and force
   duplicate staff lists. Two bases give the same confidentiality boundary
   (founders vs staff) with working links. The third base is Yumei's
   workspace, separate because its audience and lifecycle differ.
2. **Confidentiality via base boundary plus a server-filtered portal, not row
   permissions.** Bitable
   row-level/advanced permissions are a paid tier; the free boundary is the
   base. Hence: anything staff must not see lives in the Confidential base;
   staff submit approved workflows through an allowlisted form or authenticated
   server action. Performance reads are linked to the signed-in Staff record,
   so the employee never receives the table or another employee's rows.
3. **Native Approval app (审批) deliberately NOT created via API.** Feishu
   warns API-created approval definitions are hard/impossible to delete.
   If/when formal approval chains are wanted (esp. leave with balances),
   Kent builds them from templates in the admin UI. The expense FORM +
   kanban covers claims at 4-person scale meanwhile.
4. **Postgres stays authoritative for sales/commissions.** The platform's
   paid orders and approved campaign codes are the attribution source. The
   Company Operations campaign page aggregates paid CNY orders without copying
   customer PII into Feishu. Growth reports evidence and adjustments; only a
   founder can reconcile eligible revenue and calculate the commission preview.
   Reconciliation never triggers an automatic payout.
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
  stay private and people must receive explicit membership. The migration
  creates the Company Shared Assets folder, grants founders explicitly, and
  the access-approval flow attempts the role-appropriate member grant.
- **Member grants need a real user id.** `member_type: "email"` fails
  (1063001) unless the email is the person's actual Feishu login. Resolve
  the authorised account through the Contact API or the application's
  `creator_id`; never commit personal login identifiers to this document.
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
- Complete Yumei's first sign-in and approve her **Brand & Growth** request;
  then verify that she sees only **My Month**, can edit Company Shared Assets,
  and remains unable to open the Confidential Base or other employees' cycles.
- Admin-UI work (Kent, optional): Approval templates (请假/差旅), attendance
  schedule 09:30–18:30 matching the handbook.
- After the first reconciled campaign, verify that its staged amount appears in
  the reviewed monthly commission-statement process before payroll is locked.

## Migration and runtime requirements

Run the migration and runtime configuration in this order whenever this schema
is first deployed or the managed Feishu resources change:

```powershell
node --env-file=.env.local scripts/company-ops/migrate.mjs --dry
node --env-file=.env.local scripts/company-ops/migrate.mjs --apply
node --env-file=.env.local scripts/company-ops/configure-runtime-env.mjs --dry --env=.env.local
node --env-file=.env.local scripts/company-ops/configure-runtime-env.mjs --apply --env=.env.local
node --env-file=.env.local scripts/company-ops/verify.mjs
```

The performance migration is additive: it creates/merges the workflow fields
and status options and does not delete records. The runtime step must discover
and write at least `FEISHU_ADMIN_PERFORMANCE_TABLE_ID`,
`FEISHU_ADMIN_SHARED_ASSETS_FOLDER_TOKEN`, and
`FEISHU_ADMIN_SHARED_ASSETS_FOLDER_URL` to the server-only environment. Do not
copy these values into client code, commit them, or reuse the retired training
app's storage credentials. Restart the server after the managed env file is
updated, then verify employee self-only access and one test upload before use.
