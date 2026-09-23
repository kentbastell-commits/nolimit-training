# Mobile coaching — release B

23 September 2026. Implements the daily coaching slice of the [benchmark audit](mobile-coaching-benchmark-2026-09-23.md).

## Daily coaching

Review now opens with actionable rows and compact filters. Replies come first, followed by recent training/check-ins, programming coverage, and older follow-ups. Orders and enquiries have their own Admin filter. The first action is visible without scrolling at 360px and 390px. The navigation badge and queue use the same coaching-item state.

Each item opens its existing reply, video, assessment or workout controls. Coaches can record a private decision, resolve an item, snooze it until the next China calendar day, inspect its decision history, or reopen it. These states persist in Postgres across devices and reloads. Concurrent decisions receive a conflict response rather than silently overwriting each other. Corrections to source content invalidate an earlier resolution. Existing successful replies/reviews also leave the active queue and remain reachable through History. Resolve records a coaching decision; it does not send a reply or change the athlete's training status.

Review retains the selected athlete, filter, expanded item and scroll position while visiting the athlete workspace. In-progress reply drafts and private follow-up notes remain in app memory during that navigation. The workspace provides Back to Review, including after returning from the existing isolated session editor. Unsaved private review notes are not recoverable after a full page reload; saved decisions are.

## Athlete context and programming

The coach's Overview combines the latest completed session and its recorded exertion/duration, the latest check-in and readiness change when both values exist, the next session, and the end/count of future scheduled training. It links directly to the last workout, next-session editing, follow-ups, Progress and Profile & Notes. Recent activity links training, check-ins, video feedback and saved coaching decisions to their sources. Athlete notes, coach replies and private decisions are labeled separately.

Athlete-specific calendar editing now offers Last performed beside each exercise: the most recent matching recorded sets, reps/load/time/distance and athlete notes. This is reference information, never an automatic prescription. New history metadata scopes results to exercise and assignment IDs; legacy rows fall back to exact normalized exercise names. Legacy load/distance records do not include reliable unit metadata, so this display labels the value without inventing units. Session dates are displayed as session dates, not claimed completion timestamps.

Roster training activity uses completed sessions and check-ins, not web login. Old program-name text no longer suppresses an empty-calendar warning. Missing contact details are labeled Account setup. Near-end coverage shows its end date. Cancelled sessions and future work do not reduce due-session adherence; paused/archived athletes do not receive automatic inactivity/programming warnings, and digital-only clients do not receive automatic programming warnings. Missing history stays unknown.

A same-day check-in correction after a coach review now becomes Resubmitted and reopens review while retaining the earlier coach reply. Corrections before review retain Submitted. A fresh coach review sets Reviewed. Existing historical rows keep their previous review interpretation.

## Validation and release

- Forced TypeScript compilation and production build.
- Full regression suite: 955 tests across 105 files passed, including real local Postgres checks for persistence, history, concurrent writes, authorization and check-in correction.
- Browser fixtures at 360px, 390px and 1440px: Review → athlete overview → adjust session → return to the same review; previous performance; save failure retaining notes; snooze/reopen/resolve; persisted history after reload; check-in portal positioning. Session save and check-in reply were simulated at 390px/1440px. Chinese Review and Overview were checked at 360px.
- Browser screenshots and results: [local evidence](../deliverables/mobile-coaching-release-b-2026-09-23/). In-app browser bootstrap failed with `missing field sandboxPolicy`; standalone Playwright provided browser emulation.
- Migration `0025_coaching_review` adds separate state/history tables. No backlog is automatically resolved or rewritten. Production verification uses reads only; simulated replies/decisions and session editing use local fixtures, and database writes in tests use the isolated local test database.

Release verification is recorded in the local evidence folder. No physical-device keyboard/background recovery or native WeChat verification is claimed. Existing legacy detail screens still contain English labels; full translation, reconnect/notifications, reusable programming blocks and broader editor parity remain in releases C/D.
