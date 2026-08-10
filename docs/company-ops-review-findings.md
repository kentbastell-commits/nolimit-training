# Company Ops app — vetting findings (2026-08-11, for Codex)

Independent review of the company-ops module against the Employee Handbook
flows and the 4-person org (Kent + Mario founders, Yumei growth, external HR
consultant). Security and the performance-review state machine are genuinely
strong. The gaps cluster in three groups: loose display wires, missing
handbook flows, and an IA sized for a 40-person company. File:line refs
verified 2026-08-11 on main + working tree.

## P0 — broken wires (data exists, UI never shows it; cheap fixes)

1. Onboarding 90-day timeline renders BLANK: UI groups by
   `task.phase ∈ {before_start, week_one, day_30, day_60, day_90}`
   (OnboardingHome.tsx:275-307) but the API sets phase from the Feishu
   类别 Category (companyOpsDashboard.ts:143), whose values are
   合同/保密资料/制度/账号/设备/培训/绩效/行政 — zero overlap, and the
   empty-state doesn't fire either. types.ts:256 widens the union with
   `| string` so tsc can't catch it.
2. Founder approves expenses BLIND: decisions never carry href/context
   (companyOpsDashboard.ts:121-138), so the receipt URL is never visible
   from the approval card (FounderHome.tsx:142-147 dead branch).
3. Founder cannot write feedback: handleDecision sends only
   {decisionId, actionType} (CompanyOpsApp.tsx:430-435); server accepts a
   `feedback` field (repository.ts:3160) but stores the literal "Reviewed"/
   "Changes requested". The Monday-feedback loop needs a text box.
4. Yumei's Decisions tab is permanently empty: server grants growth
   `view_decisions` (companyOpsSession.ts:35) but approvals are only
   populated in the financeVisible branch (repository.ts:1763-1899).
   Either populate her view or drop the nav item for growth.
5. "Weekly report due" banner hardcoded true (companyOpsDashboard.ts:326).
6. Always-empty surfaces: growth.metrics [] (dashboard:319), founder
   onboardingCases [] (:340), weekRhythm never emitted, ~a third of
   types.ts consumed-but-never-produced (focus.tone/href, lead.nextAction,
   campaign.leads/collectedRevenue, finance.links, onboarding.roleTitle/
   startDate/confidentialDetailsComplete → "Confidential details" card
   stuck on incomplete, etc.).
7. Employee's own payroll breakdown computed (repository.ts:2892-2899) but
   dropped by the API (companyOpsDashboard.ts:272-275) — "My Pay" could
   show base/bonus/deductions/net and doesn't.

## P1 — missing pieces of live handbook flows (needed within Yumei's first month)

8. Expense flow: no receipt/fapiao UPLOAD (form takes a pasted URL;
   the asset-upload pipeline exists but is wired only to Performance and
   403s finance/staff) and the SUBMITTER can never see her own expense
   status (expenses fetched only when financeVisible). Add upload + a
   "my submissions" strip. Also: one submission path only — the
   FEISHU_ADMIN_EXPENSE_FORM_URL env var silently swaps the in-app drawer
   for an external Feishu form (dashboard:194-196), forking validation.
9. Performance deadlines: no "scored by 3rd working day" and no
   3-working-day employee-response expiry (canRespond never expires,
   PerformanceHome; reminders.mjs has no performance category).
10. reminders.mjs is invoked by NOTHING (no cron entry). Either schedule
    it on the Shanghai box or delete it.
11. update_status engine (repository.ts:3725-3763) has zero UI callers —
    the content pipeline is read-only; Yumei can't move Idea → Scheduled.
    Either add status controls on GrowthHome cards or drop the engine.
12. submit_internal_request allowed for every role, no UI. One generic
    "request something" drawer entry closes it.

## P2 — flows not built (decide: build, use Feishu native, or drop)

13. Leave requests: nothing exists (FEISHU_LEAVE_APPROVAL_CODE is read by
    no code; docs/feishu-native-approvals.md:82-83 claims a fallback that
    doesn't exist — fix the doc). Recommendation: Feishu native Approval
    (admin UI), not app code.
14. Offboarding: access removal happens only as a side effect of Staff
    status change; no Drive-membership revocation inverse (grant exists
    at repository.ts:3705-3716), no asset-return checklist.
15. Company assets register: absent (Team Ops base has 公司资产 — either
    surface it read-only or leave it Feishu-only; don't duplicate).
16. Commission engine: read-only stub by design — statements display +
    acknowledge/dispute work; the monthly-calc/quarterly-settle sync from
    Postgres is the known future build (trigger: first real sales).

## Org-fit / IA recommendations

17. Role model: `finance` is unexercised and there is NO role for the real
    5th person (external HR consultant — normalizeRole repository.ts:767-772
    has no HR branch; 人事/行政 titles land in `staff` with nothing useful).
    Either add an hr branch mapping to the finance view (minus the
    stray global payrollStatus/commissionStatus leak, dashboard:168-170 —
    first-row-of-table, an arbitrary employee's) or keep HR out of the app
    and in the Confidential base directly. Also collapse the 47-name
    action alias table (auth.ts:31-80) — dotted variants are dead.
18. Yumei's nav: 6 items of which Decisions is empty, Onboarding breaks
    after the phase fix but should retire after day 90, Policies shows at
    most 2 of the 4 defined docs (Employee Handbook itself can never be
    acknowledged in-app — dashboard:222-241 emits only expense+commission).
    Emit all four policy docs; hide Decisions for growth; auto-hide
    Onboarding when the case completes.
19. Founder sees "Ask the founder for a decision" (self-addressed queue) —
    server quickActions list reuses the growth list (dashboard:176-187)
    and beats the correct client-side filter (utils.ts:57).
20. i18n: chrome is bilingual but Yumei's DATA is English — status pills
    (decodeStatus canonical names), decision.category raw (FounderHome:94,
    118), every action success/error message (repository/CompanyOpsApp
    toasts), and the five DEFAULT_GOALS category names the founder sets
    (PerformanceHome.tsx:40-46) despite bilingual Feishu fields.
    PerformanceHome bypasses copy.ts with 94 inline text() calls.
21. Silent degradation: listOptional swallows config errors → renamed
    Feishu table = empty cheerful dashboard; currentMonthRevenue catch →
    ¥0 revenue on DB outage with no warning. Surface a "data unavailable"
    state at least for founder revenue.
22. Disclosure: TranslatableText sends internal record text to the
    configured LLM (session-gated, capped) — add one line to loginPrivacy
    copy so staff know AI translation is in play.

## Security notes (good marks, two flags)

- OAuth state double-submit, HMAC sessions (__Host- cookie), CSRF +
  Origin checks, tenant pinning, fail-closed confidentiality branches,
  aggregate-only revenue (verified: 2 group keys + 2 aggregates, no PII),
  allowlisted Feishu writes with server-forced statuses — all solid.
- Flag 1: finance role sees global payrollStatus/commissionStatus of an
  arbitrary first table row (dashboard:168-170) — scope or drop.
- Flag 2: healthDataPattern guard runs only on `lead` submissions; content/
  partner/campaign/support/expense text is unchecked. Cheap to generalize.
- Undocumented env vars read by code: FEISHU_ADMIN_OAUTH_SCOPES (without
  it the authorize URL has NO scope), FEISHU_ADMIN_COOKIE_NAME,
  FEISHU_ADMIN_SESSION_TTL_SECONDS, FEISHU_ADMIN_OAUTH_STATE_TTL_SECONDS.
  Six FEISHU_*_APPROVAL_CODE vars are documented but read by nothing.
