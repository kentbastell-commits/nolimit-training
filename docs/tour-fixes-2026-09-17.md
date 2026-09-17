# Follow-up tour fixes — 17 September 2026

Deployment update: the web/API fixes and migrations are now live; miniprogram version **2026.9.17** uploaded successfully through DevTools. Trial promotion and public release remain unconfirmed. See [deployment status and verification](deployment-2026-09-17.md). The implementation report below records the pre-deployment checks.

All ten findings (T01–T10) from the [follow-up tour](product-tour-followup-2026-09-11.md) have fixes across the web app, API and miniprogram, with release status recorded above. Login/security and exercise footage were outside this batch.

## Changes

| Finding | Result |
| --- | --- |
| T01: concurrent submissions collide | Form responses, test results, metrics and new assessment assignments use UUIDs. Forty concurrent HTTP submissions now save forty distinct responses. |
| T02: retries duplicate or partly save results | An assignment row lock serializes retries. Answers, test results, calculated metrics and completion commit in one transaction. A retry after success returns success without creating another submission. Translation starts after commit. |
| T03: coach review hides older work | Submissions, comments, missed workouts and orders have pagination. Submissions also have athlete/title search and pending/reviewed/all filters. Cards show assessment titles; reviewed state persists in the database and can be undone. |
| T04: miniprogram tests have no entry flow | Athletes can enter strength results, timed-distance results and numeric measurements, with notes, validation and saved-result review. |
| T05: miniprogram outages look empty | Failed sources retain previously loaded data. A visible error and Retry action remain available, including after partial failures. Stale loads cannot overwrite a newer athlete/session. |
| T06: completed answers reopen blank | Completed web and mini assessments show saved answers without a Submit action. An answer-loading failure asks the athlete to retry instead of opening a blank form. |
| T07: routine forms trigger onboarding | Intake is an explicit assignment property. Routine forms confirm completion and remain in the portal. Purchase intake opens the start-date chooser; program delivery begins only after selecting a date. Notifications no longer claim every questionnaire loaded a program. |
| T08: required choices accept an empty selection | Web, mini and API validate the meaning of each answer, including required choice arrays, allowed options and whitespace-only text. Test values also receive shared numeric validation. |
| T09: web drafts disappear | Drafts persist per athlete and assignment across close/reload. The interface confirms restoration and warns if device storage fails. Confirmation from the server clears the draft. Existing miniprogram drafts survive migration to athlete-scoped keys. |
| T10: Chinese labels and choice layout | Test fields, validation, assignment types, calendar statuses and workout help have Chinese interface text. Choices are aligned, comfortably tappable rows. Completed calendar entries say View. The intake start button uses the app’s existing primary styling. |

The browser verification also caught and fixed a missing calendar translation callback between components. A regression test now covers that connection.

Completed submissions are deliberately read-only. A coach can assign a new assessment for a correction; this batch does not add answer revision history or delete older duplicate submissions.

## Verification

- **Full web/backend suite: 864 tests passed across 92 files.** [Log](../deliverables/tour-fixes-2026-09-17/release-tests.log).
- **Final targeted UI checks: 16 tests passed across four files**, including the calendar callback, saved-answer view and draft behavior. [Log](../deliverables/tour-fixes-2026-09-17/final-ui-tests.log).
- **Miniprogram: 14 reliability checks passed**, TypeScript passed and the WeChat build succeeded. Checks execute the actual page handlers with controlled network/device boundaries. [Tests](../deliverables/tour-fixes-2026-09-17/mini-tests.log), [types](../deliverables/tour-fixes-2026-09-17/mini-types.log), [build](../deliverables/tour-fixes-2026-09-17/mini-build.log).
- **Web production build succeeded.** Its existing large-chunk warning remains. [Build log](../deliverables/tour-fixes-2026-09-17/web-build.log).
- **Real local HTTP burst: 40/40 successful in 452 ms**, with 40 unique IDs and exactly one response for each assignment. The earlier reproduction was 25 successes and 15 failures. This is one local measurement, not a production capacity estimate. [Results](../deliverables/tour-fixes-2026-09-17/submission-burst.json).
- Database regression tests also force the same timestamp across forty submissions, exercise concurrent retries, and inject a failure into the second physical-test result. The failed transaction leaves no partial results, metrics or completion; retry saves one complete batch.
- **Browser journeys passed at mobile and desktop widths:** empty required choices, draft restoration after reload, a deliberately lost success response followed by retry, completed-answer review, Chinese test validation, real intake continuation, coach pagination/search and persistent reviewed history. No uncaught browser errors were recorded. [Results](../deliverables/tour-fixes-2026-09-17/browser-results.json).

Visual evidence: [restored Chinese draft](../deliverables/tour-fixes-2026-09-17/mobile-restored-draft.png), [saved answers](../deliverables/tour-fixes-2026-09-17/mobile-completed-answers.png), [Chinese test inputs](../deliverables/tour-fixes-2026-09-17/mobile-chinese-test.png), [intake continuation](../deliverables/tour-fixes-2026-09-17/mobile-intake-next-step.png), [coach pagination](../deliverables/tour-fixes-2026-09-17/desktop-review-next-page.png), [reviewed history](../deliverables/tour-fixes-2026-09-17/desktop-reviewed-history.png).

Browser checks used installed Chromium/Playwright after the in-app browser connection failed. All writes used synthetic local data; external requests, payment and coach notifications were disabled. No fresh native WeChat device verification is claimed.

## Release requirements and remaining work

Deploy migration [0023_assessment_workflow.sql](../server/db/migrations/0023_assessment_workflow.sql) before the new API and clients, after the earlier pending migrations. It adds the intake marker and test review timestamp. It has been applied only to local test/audit databases. The migration marks known historical digital-purchase intake assignments (`FA-` IDs). Historical manually assigned forms cannot safely be inferred as intake from their names; any still-pending manual intake needs an explicit check during release preparation.

The earlier DeepSeek-first → Tencent-provider-fallback translation implementation remains in place. Fixed interface text has its own Chinese translations. This batch did not repeat live provider calls; their earlier verification is recorded in [translation-fixes-2026-09-11.md](translation-fixes-2026-09-11.md).

Before launch, complete native WeChat device acceptance, deployment verification and a sustained load/soak run on the intended hosting environment. Coach pagination currently pages the loaded response set in the browser; it solves inaccessible work but does not bound the global coach API payload. Server pagination, roster scale, the Today experience and order/library history remain separate recommendations from the tour. Passing this batch does not establish a supported concurrent-user capacity or a crash-free launch guarantee.
