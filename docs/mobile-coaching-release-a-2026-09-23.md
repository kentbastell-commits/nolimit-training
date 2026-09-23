# Mobile coaching: reliable editing and recovery

23 September 2026 · Release A of the [mobile coaching audit](mobile-coaching-benchmark-2026-09-23.md)

This release repairs the four foundational workflows before changing the daily Review experience. Phone and desktop use the same edit scope, prescriptions, save behavior and recovery model.

## Changes

- **Review check-ins:** the panel opens at the viewport, including from a scrolled queue. It sits above navigation, locks background scrolling, traps keyboard focus, supports Escape and returns focus without losing the queue position. The reply area scrolls within the available height.
- **Assigned-session edits:** Edit from an athlete's calendar saves only that assigned workout. The server creates a hidden session version and updates that assignment in one transaction, including set prescriptions and alternates. The library, other assignments and completed history retain their original references. Started/completed workouts reject edits; stale and overlapping saves return a conflict. Unchanged Chinese coaching guidance is carried forward.
- **Prescription display:** builder, assignment preview, calendar summaries, library previews and workout review use the same structured-set formatter. Examples: `2 rounds · 30 sec/side` and `3 sets · 20 / 15 / 12 reps`. Existing coaching text remains visible; the formatter does not infer or change programming from that text. English and Chinese units are supported.
- **Device drafts:** unfinished program/session edits persist locally, with an explicit Resume/Discard notice on return. Recovery includes the current day, exercises, notes, edit target, athlete and calendar context. A successful save clears the draft; a failed assigned-session save retains it. Storage failure and another tab's draft changes have distinct statuses. The existing library save no longer treats older rows as proof that a failed write succeeded.

Drafts are scoped by the authenticated coach credential and draft identity. They are **device-local**, not phone-to-desktop cloud sync. Publishing still requires the coach's Save action. Deliberately leaving/discarding the editor asks before removing its draft.

## Compatibility and limits

The current mini program already reads exercises using `programId/week/day`. Private assigned-session versions preserve that contract, so this server/web change requires no mini program upload. Normal calendar refresh is needed to obtain a changed assignment. Native mini program UI, physical iPhone/Android keyboards, and operating-system background termination still need device verification.

Library editing remains a separate, shared-template operation. This release adds a template-baseline check before library saves; the atomic server version check belongs to assigned-session editing. An affected-assignment review for deliberate library propagation, server drafts, version merging and undo remain follow-up work.

No athlete program, assignment, reply or completed result was changed on production during verification. Browser write scenarios used intercepted local fixture responses; database isolation/rollback/concurrency tests used the dedicated local test database.

## Verification

- Forced TypeScript build and production Vite build.
- Full unit/component/Postgres regression suite: **933 tests passed across 102 files**. Includes stale edits, overlapping saves, rollback, completed/started sessions, authorization, Chinese cue preservation, draft corruption/storage failure, and focus restoration.
- Browser checks at 360px, 390px and 1440px; check-in opening at document scroll 972px produced panel bounds `0–844px`. At 500px viewport height, close/reply controls remained reachable and navigation stayed behind the panel.
- A new program survived refresh and resumed. Assigned-session edits survived a simulated failed save and refresh on phone and desktop. A confirmed save returned to the same athlete calendar and removed the local draft. Those scenarios recorded no application page errors.
- Timed holds and varying pogo prescriptions checked against the existing Yanjun fixture. Production verification is read-only.

Evidence and deployment receipts: [local release folder](../deliverables/mobile-coaching-release-a-2026-09-23/).

## Next release

Release B: put the next coaching action first in Review, add a useful athlete summary, and connect recent results, check-ins and follow-up. Retain the current desktop/mobile structure and the mini program's athlete visual direction.
