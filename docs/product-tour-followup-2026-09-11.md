# Product tour follow-up — 11 September 2026

Update, 17 September: T01–T10 now have local fixes and regression coverage. See [the implementation and verification report](tour-fixes-2026-09-17.md). The findings below preserve the original audit evidence.

**The local fixes improved the core experience, but this tour found additional launch blockers in forms, physical tests and the coach review queue.** The most urgent work is reliable submission and a complete coach queue. Visual polish should follow those corrections.

This assessment covers the current local candidate, including the earlier reliability and translation changes. It does not describe the currently deployed release. Login/security and exercise footage were excluded. No production records, payments or messages were created. This pass added assessment scripts, evidence and this report; it did not change product code.

## What I toured

I opened the store, coaching purchase entry, athlete home, coach review, client roster and test library at 390 and 1440 pixels: **12 fresh route captures**, without an uncaught page error or document-level horizontal overflow. I then followed product detail → checkout; athlete home → workout overview → exercise player; questionnaire → interrupted submission → retry; calendar → completed questionnaire; Chinese physical test → required-field validation; coach review → submitted answers; and roster search → athlete workspace.

The fixture was deliberately synthetic: one coached athlete, a training session, a weekly questionnaire, a two-item physical test, a 1,001-athlete roster and existing 240,000-set load data. Later captures contain additional questionnaires created specifically for the submission burst. Their repetitive names and unusually high task counts are test data, not claims about customer content.

The in-app browser connection failed during setup; browser checks used installed Playwright/Chromium against the isolated local server. Miniprogram findings below use current source and execution of extracted functions with mocked network/device boundaries. **No fresh native WeChat device tour or payment settlement is claimed.** The earlier 840-test result remains the previous batch's validation; this assessment did not rerun that full suite or conduct a production capacity test.

## Findings requiring changes

### T01 · P1 · Normal concurrent questionnaire submissions can fail

Forty simultaneous HTTP submissions for **40 distinct assignments** returned **25 successes and 15 HTTP 500s** in a 346 ms local burst. No clock or random generator was mocked. All 15 failures attempted a response ID already stored for a different assignment, verified by reading the database afterward.

Questionnaire IDs are `FR-${Date.now()}`. Different requests arriving in the same millisecond share an ID. Test-result and derived-metric IDs also depend on that millisecond plus the item position, although this burst measured questionnaires only. See [contentResponses.ts](../server/db/pg/contentResponses.ts:170).

Use UUIDs or database-generated unique IDs throughout this submission path. Independently make retries safe as described in T02. The burst used one synthetic client with different assignments; the identifier is global, so this is not specific to one athlete. The observed failure rate is a reproduction, not a prediction of production traffic or supported-user capacity.

Acceptance: concurrent independent forms/tests all save; a duplicate logical submission returns its existing result; no duplicate IDs or extra responses.

Evidence: [HTTP/database results](../deliverables/audit-2026-09-11/tour/submission-probes.json), [15 collision confirmations](../deliverables/audit-2026-09-11/tour/coach-proof.json).

### T02 · P1 · Forms and physical tests still duplicate or partially save on retry

In the browser, I allowed a questionnaire submission to commit successfully, then dropped its response before it reached the page. The page retained the answers and offered another submit. Retrying left **two stored submissions for the same assignment**.

For a two-item physical test, I injected a database failure on the second result. The failed request left the first result and its derived strength metric committed, while the assignment remained incomplete. After retry, the database held **three results instead of two, and two identical derived metrics instead of one**. The temporary failure trigger was removed in `finally`.

The earlier atomic workout fix does not cover this repository. Form answers, test results, core derived metrics and assignment completion need one transaction with a stable logical submission identity. Translation should run after that commit. Define an explicit correction flow if athletes may edit a completed assessment; repeated POSTs should not silently become new results.

Evidence: [browser retry and row count](../deliverables/audit-2026-09-11/tour/journey-results.json), [partial-save and retry snapshots](../deliverables/audit-2026-09-11/tour/submission-probes.json). Implementation: [contentResponses.ts](../server/db/pg/contentResponses.ts).

### T03 · P1 · The coach board hides submissions beyond its first 18

The API returned **27 assignment groups** after the probes. The settled review board displayed **18 cards**, reported 18 submissions and provided no next page or “show all” action. The other nine were absent from this board, although their data remained in the API and may be reachable through individual clients.

[App.tsx](../src/App.tsx:13869) truncates submissions, unreviewed workout comments and missed workouts to 18. [ReviewPage.tsx](../src/ReviewPage.tsx:658) renders only that truncated collection and uses its length as the count. The runtime reproduction was for submissions; the analogous comments/missed-workout limit is source-confirmed.

Add a full queue with accurate totals, pagination, filters and an explicit reviewed state. Preserve older unresolved work as new items arrive. Cards should show the actual questionnaire/test title: the current global grouping receives no assignments and falls back to generic “Questionnaire” titles, making different assessments difficult to distinguish.

Acceptance: with at least 50 unresolved items, coaches can reach every item, counts stay correct, and reviewing one updates the queue without hiding another.

Evidence: [settled board screenshot](../deliverables/audit-2026-09-11/tour/coach-review-stable.png), [API-versus-UI comparison](../deliverables/audit-2026-09-11/tour/coach-proof.json).

### T04 · P1 · Miniprogram physical tests end at a web-only instruction

The forms page includes physical-test assignments, but tapping one immediately shows “Tests are completed in the web portal” and returns. It does not open a native test form or provide a direct continuation link. The web does have the required result inputs.

This becomes particularly important now that purchased-program test days are correctly delivered as tests. A mini buyer can receive a legitimate assessment that the mini cannot complete.

Implement native manual result entry for the supported test types, instructions, units, required-field checks, confirmation and completed-result review. Video-based Jump Lab analysis can remain a deliberate web feature; ordinary numeric testing should have a usable mini path.

Evidence: [forms page](../../nolimit-miniprogram/src/pages/forms/index.tsx:106), [executed tap handler](../deliverables/audit-2026-09-11/tour/mini-probes.json). This confirms the handler behavior, not native visual rendering.

### T05 · P1 · Miniprogram questionnaire outages still look like an empty inbox

The forms loader catches each request independently and replaces failure with an empty array. Its success handler then sets `loadFailed` to false. Executing the current loader with all three requests rejected cleared existing assignments, templates and responses, and ended with `loading: false, loadFailed: false`.

The empty-state screen can therefore imply the athlete has nothing to complete during an outage. Partial failure can also leave visible assignments whose templates cannot open. The earlier inbox correction needs to be applied here too.

Retain previously loaded data, identify failed sources, offer Retry and disable only actions that depend on unavailable data. Do not overwrite a previously populated list with a successful-looking empty result.

Evidence: [loader](../../nolimit-miniprogram/src/pages/forms/index.tsx:52), [executed failure probe](../deliverables/audit-2026-09-11/tour/mini-probes.json).

### T06 · P2 · Completed web questionnaires reopen as blank submissions

From the athlete calendar, opening a questionnaire marked Completed produced an empty, editable form with an enabled Submit button. The previously submitted choice was not selected. This invites the athlete to repeat an already completed task and compounds T02.

Opening any assignment currently clears answers in [App.tsx](../src/App.tsx:17233). Completed questionnaires/tests should open their saved results in a clear read-only view. If corrections are allowed, use a separate “Edit response” action with revision semantics.

Evidence: [completed form reopened](../deliverables/audit-2026-09-11/tour/completed-form-reopened.png), [checked-count and Submit state](../deliverables/audit-2026-09-11/tour/more-results.json).

### T07 · P2 · A weekly questionnaire sends an existing athlete through the welcome flow

Submitting the synthetic “Weekly reflection” showed the onboarding welcome screen, including “Your training program has loaded into your calendar,” even though this was an existing athlete completing a routine questionnaire.

[App.tsx](../src/App.tsx:17525) treats every `Questionnaire` assignment as intake. The API notification text makes the same assumption. Completion needs to distinguish purchase intake from recurring coaching forms. Routine forms should confirm that the response was saved and return to the previous task/calendar. Only actual onboarding should advance purchase setup, and it should report delivery state from the server.

Evidence: [post-submission screen](../deliverables/audit-2026-09-11/tour/weekly-form-next-screen.png). The welcome message is confirmed; this probe did not establish that a new plan was actually delivered by that transition.

### T08 · P2 · Required multiple-choice answers can be submitted empty

Selecting and then deselecting the only checked option stored the string `[]`. The web allowed submission because that string is truthy. The intercepted request contained an empty required answer. The equivalent miniprogram required-field check also treats `[]` as a nonempty string; that branch is source-confirmed.

Validate the semantic value by question type: a required multiple-choice answer must contain at least one valid option; a required text answer must contain non-whitespace text. Apply the same validation on the server. The test request was intercepted with a deliberate 400 response, so this UI probe did not save the invalid answer.

Evidence: [captured request](../deliverables/audit-2026-09-11/tour/journey-results.json), [web validation](../src/App.tsx:17471), [mini validation](../../nolimit-miniprogram/src/pages/forms/index.tsx:166).

### T09 · P2 · Closing a web form silently discards the draft

After entering a choice and a comment, pressing Cancel and reopening the questionnaire returned both fields empty. There was no retain/discard prompt. This extends the earlier recovery concern to ordinary assigned forms, not just purchase intake or workout logging.

Retain per-athlete, per-assignment drafts across modal close and refresh, show that a draft was restored, and clear it only after server confirmation or explicit discard. Completed-result viewing must remain distinct from a draft.

Evidence: [reopen state](../deliverables/audit-2026-09-11/tour/journey-results.json).

### T10 · P2 · Chinese interface coverage and form styling need another pass

DeepSeek/Tencent content translation and fixed interface translations are separate layers. The new Chinese test title and instructions rendered correctly, but **Weight, Reps and Notes** stayed English. Required-result validation also stayed English. Calendar cards exposed raw **Questionnaire, Physical Test, Scheduled and Completed** labels. The workout introduction still names “Finish Workout” inside otherwise Chinese instructions.

These are fixed interface strings; provider failover does not translate them. Route them through the interface dictionary, including status names, validation and help. Add a journey-level Chinese check covering failure and completed states, rather than checking only translated content fields.

The multiple-choice form also places small checkboxes separately from their labels, with excessive vertical separation. Render each choice as one aligned, comfortably tappable row. Keep the same treatment for required, selected and disabled review states.

Evidence: [Chinese test](../deliverables/audit-2026-09-11/tour/chinese-physical-test.png), [English validation in Chinese flow](../deliverables/audit-2026-09-11/tour/chinese-test-validation.png), [choice layout](../deliverables/audit-2026-09-11/tour/completed-form-reopened.png).

## Product improvements that remain worthwhile

The existing dark/gold visual identity, product detail card and exercise overview are coherent. The freshly toured pages stayed within the viewport. The exercise player opened with actual repetitions and weights empty, matching the corrected logging contract.

I would still make these changes before calling the experience five-star:

- **Put today's next action first.** The mobile athlete screen still places the large wellness block, secondary tabs and Jump Lab above training. Give the next session a prominent start action, keep wellness compact and surface unread coach feedback nearby. [Current home](../deliverables/audit-2026-09-11/tour/390-portal.png).
- **Complete purchase recovery and ownership.** The previously identified order history/resume-payment gap and mini owned-program library remain open. An interrupted buyer needs to find the existing order and continue. The mini profile still uses one `purchasedProgramId` link, and home still chooses a progress program by the largest workout count.
- **Bound the coach roster rendering.** The 1,001-athlete roster rendered 4,018 buttons on mobile and 4,021 on desktop. Add pagination or virtualization. However, the measured search completed in about 259 ms including a deliberate 200 ms settle wait under 4× Chromium CPU throttling, with no recorded long task. This is a scaling improvement recommendation, not a reproduced roster crash. [Roster source](../src/CoachClientsPage.tsx:653).
- **Finish native and operational acceptance.** Real WeChat iOS/Android testing, interrupted payment recovery, background/resume, video playback, a sustained mixed read/write load test, worker-restart rehearsal and backup restore remain open from the original audit. This short local tour does not close those gates.

## Recommended next batch

1. Fix T01–T02 together: collision-free IDs, transactional submission, safe retries and explicit correction semantics.
2. Fix T03: complete coach queues with accurate counts and meaningful titles.
3. Finish the miniprogram assessment path and truthful offline states, T04–T05.
4. Correct form completion, onboarding routing, validation and draft handling, T06–T09.
5. Apply the Chinese interface and visual pass, T10, then repeat the same journeys on real phones.

## Evidence and reruns

The [tour evidence directory](../deliverables/audit-2026-09-11/tour) contains screenshots and JSON results. `tour.mjs` produced the 12 route captures; `tour-journeys.mjs` produced the form/retry/test evidence; `tour-more.mjs` completed the product/checkout and completed-form checks; `tour-coach-proof.mjs` verified all 15 collisions, the 27-versus-18 queue and athlete workspace/player navigation; `tour-mini-probes.mjs` executed current extracted mini handlers.

Two earlier store locator attempts and an earlier coach locator attempt timed out because the automation expected different casing/language. Those were corrected and the routes completed in the later scripts; they are not reported as product failures. The authoritative settled coach counts are in `coach-proof.json`, not the earlier screenshot taken during its count animation.

All database probes assert a loopback host and use `nolimit_launch_audit_20260911`. Submission probes intentionally mutate synthetic fixtures; they should be rerun against a clean tour fixture when comparing exact counts. External server fetches were blocked, and the temporary database failure trigger/function were removed after the probe.
