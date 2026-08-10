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

Optional least-privilege collaborators:

```dotenv
FEISHU_FOUNDER_OPEN_IDS=ou_xxx,ou_yyy
FEISHU_GROWTH_EDITOR_OPEN_IDS=ou_zzz
FEISHU_TENANT_DOMAIN=your-tenant.feishu.cn
```

Supported aliases are `FEISHU_ADMIN_TEAMOPS_BASE_APP_TOKEN` for `FEISHU_TEAMOPS_BASE_APP_TOKEN`, `FEISHU_ADMIN_GROWTH_BASE_APP_TOKEN` for `FEISHU_GROWTH_BASE_APP_TOKEN`, `FEISHU_ADMIN_FOUNDER_OPEN_IDS` for `FEISHU_FOUNDER_OPEN_IDS`, and `FEISHU_ADMIN_TENANT_DOMAIN` for `FEISHU_TENANT_DOMAIN`.

The founder list is also derived from explicit `full_access` members of the Confidential Base. Add Yumei's Open ID to `FEISHU_GROWTH_EDITOR_OPEN_IDS` only if she needs raw Growth Base editing; the authenticated company workspace can remain her normal interface.

## Safety and access model

- Raw Team Ops and Growth Base links are closed. Founders retain explicit `full_access`; configured growth editors receive `edit` only.
- Confidential HR and finance data remains founder-only. The only shared Base form is the tenant-only confidential employee-details intake form, whose visible questions are explicitly allowlisted.
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
