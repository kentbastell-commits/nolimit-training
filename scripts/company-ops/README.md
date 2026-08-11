# Feishu Company Operations migration

These scripts turn the three existing app-owned Feishu Bases into a safer, task-oriented company operations workspace. They are designed for repeatable runs: existing objects are inspected first, missing objects are added, compatible select options are merged, and no table or record deletion is implemented.

## Commands

Run the read-only plan first:

```powershell
node --env-file=.env.local scripts/company-ops/migrate.mjs --dry
```

After reviewing every planned action, an authorized administrator can apply it:

```powershell
node --env-file=.env.local scripts/company-ops/migrate.mjs --apply
```

If the application-admin scope is unavailable and the Confidential Base has
exactly one full-access Open ID belonging to an active tenant manager, use the
verified wrapper. It keeps the discovered ID in memory and never prints or
persists it:

```powershell
node --env-file=.env.local scripts/company-ops/apply-verified-founder.mjs
```

After migration, generate the authenticated portal's server-only runtime
configuration without printing any IDs, tokens or URLs. Dry-run first; apply
writes the target env atomically with mode `0600`:

```powershell
node --env-file=.env.local scripts/company-ops/configure-runtime-env.mjs --dry --env=.env.local
node --env-file=.env.local scripts/company-ops/configure-runtime-env.mjs --apply --env=.env.local
```

The migration must run before runtime discovery. It adds the private Monthly
Performance workflow fields/status options and creates the Company Shared
Assets folder tree. Runtime discovery then records the exact table and folder
IDs used by the web portal. Restart the application server after applying the
runtime env file.

Verify the resulting schema, forms, folder structure, and sharing policy:

```powershell
node --env-file=.env.local scripts/company-ops/verify.mjs
```

Preview reminder counts without sending anything:

```powershell
node --env-file=.env.local scripts/company-ops/reminders.mjs --dry
node --env-file=.env.local scripts/company-ops/reminders.mjs --date=2026-08-10 --json
```

The preview emits aggregate counts only. Delivery is dormant by default. After the delivery log and Staff opt-in field have been applied and verified, an administrator may deliberately enable and invoke it:

```powershell
$env:COMPANY_OPS_REMINDERS_ENABLED="true"
node --env-file=.env.local scripts/company-ops/reminders.mjs --send
```

This still sends only to Staff rows where `机器人提醒 Bot Reminders` is checked and `飞书用户 Feishu User` contains that employee's Open ID. Messages contain category counts only. A hashed `date + Open ID + category` key and Feishu message UUID prevent duplicate sends; raw Open IDs are not stored in the delivery log.

## Configuration

Required values stay in the git-ignored `.env.local` file:

```dotenv
FEISHU_ADMIN_APP_ID=
FEISHU_ADMIN_APP_SECRET=
FEISHU_ADMIN_BASE_APP_TOKEN=
FEISHU_TEAMOPS_BASE_APP_TOKEN=
FEISHU_GROWTH_BASE_APP_TOKEN=
```

The runtime configurator manages the derived values, including:

```dotenv
FEISHU_ADMIN_PERFORMANCE_TABLE_ID=
FEISHU_ADMIN_SHARED_ASSETS_FOLDER_TOKEN=
FEISHU_ADMIN_SHARED_ASSETS_FOLDER_URL=
```

Do not hand-copy these into browser code. They are server-only identifiers and
must be rediscovered after replacing a Base/table/folder. The upload route is
unavailable until both shared-assets values are present; the performance page
cannot read/write cycles until the performance table ID is present.

Optional least-privilege collaborators:

```dotenv
FEISHU_FOUNDER_OPEN_IDS=ou_xxx,ou_yyy
FEISHU_GROWTH_EDITOR_OPEN_IDS=ou_zzz
FEISHU_TENANT_DOMAIN=your-tenant.feishu.cn
```

Supported aliases are `FEISHU_ADMIN_TEAMOPS_BASE_APP_TOKEN` for `FEISHU_TEAMOPS_BASE_APP_TOKEN`, `FEISHU_ADMIN_GROWTH_BASE_APP_TOKEN` for `FEISHU_GROWTH_BASE_APP_TOKEN`, `FEISHU_ADMIN_FOUNDER_OPEN_IDS` for `FEISHU_FOUNDER_OPEN_IDS`, and `FEISHU_ADMIN_TENANT_DOMAIN` for `FEISHU_TENANT_DOMAIN`.

The founder list is also derived from explicit `full_access` members of the Confidential Base. Add Yumei's Open ID to `FEISHU_GROWTH_EDITOR_OPEN_IDS` only if she needs raw Growth Base editing; the authenticated company workspace can remain her normal interface.

## Monthly performance and bonus workflow

The authoritative records stay in the founder-only `月度绩效 Monthly
Performance` table. Employees use `/company-ops` → **Performance / 月度绩效**;
they do not receive the raw Confidential Base. Server-side identity linking
filters non-founders to their own Staff record and rejects client-supplied
weights, bonus amounts, statuses or a different employee identity.

The monthly sequence is:

1. Founder selects an active employee, month and report deadline, then writes
   a measurable success standard for each fixed category. Weights are always
   25/20/20/15/20.
2. Employee sees **My Month** and submits an overall summary, a result for all
   five goals, optional context and private HTTPS evidence links.
3. Founder requests changes or scores each category 0–100. The server derives
   the weighted score and pre-tax bonus: ≥90 ¥2,000; ≥80 ¥1,500; ≥70 ¥1,000;
   ≥60 ¥500; below 60 ¥0.
4. Employee accepts the latest score or challenges it with a comment.
5. Founder may finalise only after acceptance. Finalisation stages only
   `月度绩效奖金 Perf Bonus` in the matching payroll row and refuses to alter a
   locked or paid payroll record.

Role boundary:

- founders see/manage every cycle and the safe active-staff selector;
- Growth, Staff and Finance users see only their own linked cycles and can
  submit/respond when the current workflow status permits;
- Growth users and founders can upload shared video evidence; other approved
  users have read-only shared-assets access;
- pending users can request a role but cannot read Company Operations records.

### Set up Yumei

1. Ask Yumei to sign in with her own company Feishu account.
2. On the denied screen, keep **Brand & Growth / 品牌与增长** selected and send
   the access request.
3. A founder approves it in Company Operations. Do not assign founder,
   finance, super-admin or Confidential Base access.
4. Confirm the approval linked one active Staff record and granted `edit` on
   Company Shared Assets. If Feishu rejects the automatic folder grant, add
   her explicitly in Drive and keep link sharing closed.
5. Sign in as Yumei and verify that she sees only **My Month**. Then sign in as
   founder and create her first monthly goal cycle.

## Feishu Drive video upload

The Performance page provides Growth users and founders with a video drop
zone. Uploads go through the authenticated Company Operations server, not
directly from the browser to an exposed folder token. The server enforces
session, CSRF/origin, role, file-type/signature, rate/concurrency and size
checks, uploads to `公司共享资料 Company Shared Assets`, and returns a private
Feishu link that can be attached to the monthly report.

Feishu's one-shot file endpoint caps a request at 20 MiB, so the portal
automatically switches larger files to Feishu's official multipart upload flow.
The Company Operations safety cap is **500 MiB per file**; the tenant's current
storage-plan quota still applies. Store only non-sensitive Brand/Growth working
media here—never identity documents, bank details, payroll, legal files or
health information.

## Campaign approval and revenue workflow

Growth staff use `/company-ops?page=campaigns`; they do not edit calculated
revenue or commission fields in the raw Growth Base. A new brief is submitted
directly to **Pending Approval**. Only a founder can approve it, request changes
or reject it. Approval snapshots the staff attribution share and handbook rule,
then creates opaque campaign/staff codes plus channel-specific tracking links
and QR codes.

After Growth activates and completes the campaign, the results form shows the
paid revenue tracked in Postgres. Any offline/manual amount requires private
HTTPS evidence. Refunds and adjustments reduce the maximum reconcilable amount.
Only a founder can reconcile, and campaigns at or above CNY 300,000 cannot be
approved without an explicit written custom rate. A reconciled amount is a
commission preview for the reviewed monthly statement, never an automatic
payout instruction.

The workflow is additive to the existing `活动 Campaigns` table. Re-run the
migration plan/apply/verify sequence after deploying this version so the new
fields and status options exist before staff use the page.

## Safety and access model

- Raw Team Ops and Growth Base links are closed. Founders retain explicit `full_access`; configured growth editors receive `edit` only.
- Confidential HR, finance and performance tables remain founder-only. The
  portal exposes a server-filtered employee view of the signed-in person's own
  performance cycle; it never exposes the raw Base or another employee's row.
  The only shared Base form is the tenant-only confidential employee-details
  intake form, whose visible questions are explicitly allowlisted.
- Legacy operational forms are unshared. Staff should use the authenticated workspace or reviewed Feishu approval flows instead of raw Base links.
- The migration creates an app-owned `公司共享资料 Company Shared Assets` root and only non-sensitive Brand, Content, Campaign, Testimonial, KOL, Template, and Archive subfolders. HR, Finance, and Legal files do not belong in this broadly shared root.
- Folder sharing is never made public. If Feishu rejects folder-member management through the API, the scripts warn and require manual founder access verification in Drive.
- Product support records use a product business ID only. Do not put names, contact details, identity documents, payment data, injuries, diagnoses, assessments, or other health data in the support log.
- Credentials, access tokens, Base tokens, record contents, and user Open IDs are not printed.

## Interpreting the first dry run

Before the first apply, form warnings that say a newly planned field is missing are expected: the apply sequence creates all fields before reconfiguring form visibility and required flags. A missing `FEISHU_GROWTH_EDITOR_OPEN_IDS` value is also non-blocking when staff use the authenticated workspace; it only means Yumei will not have direct raw-Base editing. Any other warning or API failure should be reviewed as potentially blocking before `--apply`.

## Deliberately manual follow-ups

Feishu's API cannot safely complete every UX step. Keep these as reviewed admin tasks:

- configure filters, sorting, visible fields, Kanban grouping, and the Content Calendar date binding in the Feishu UI;
- build dashboard widgets in the Feishu UI;
- create native Expense, Leave, Travel, and Marketing/KOL Spend approvals in Feishu Admin;
- publish and approve the custom app's Web App and Bot capabilities;
- review the ten empty rows before deleting the default `数据表` manually;
- keep the legacy onboarding table until Templates, Cases, and Tasks have been proven in normal use.
