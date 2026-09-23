# Publication comparison and mobile acceptance — 23 September 2026

## Coach workflow

- **Publish changes** now opens a review comparing the proposed edit with the workout the athlete currently sees. **Confirm & publish changes** performs the save; **Back to editing** preserves the editor and its recoverable draft.
- **Calendar → Review & publish** shows the same comparison for private revisions. Never-published workouts are labelled **New session**, with the full athlete preview available underneath.
- The comparison covers session names, dates where they differ, goals, intensity, duration, notes, exercise additions/removals/order, circuit structure, tracking fields, alternatives, per-set targets and coaching cues. Long notes stay collapsed. English and Chinese labels use the same layout.
- Calendar moves already show original and destination dates in their own review. Moving an existing published session still takes effect when the move is confirmed; this release does not introduce private date revisions.
- Exercise template IDs change on every save, so comparisons use exercise identity and prescription values. Repeated exercises appear as an ordered group rather than guessing which repeated occurrence was removed.
- The builder freezes the session being reviewed. A failed baseline read disables publication and offers Retry. Existing server version checks still reject stale/started workouts; conflict recovery is followed by a fresh publication review.

## Automated verification

Evidence is kept privately in `deliverables/publish-review-2026-09-23/`; fixtures include athlete data and must not be committed. Browser mutations use intercepted APIs. Real local Postgres tests verify private/public separation and the existing mini-program workout-detail contract.

The browser journeys cover editing at reduced viewport height, review cancellation, failed baseline reads, failed publication, draft retention, reload/resume, private save and batch/direct publication. Separate journeys cover adding Bike, heart-rate targets, intentional duplication/deletion, reopening prescriptions, and video close controls in portrait/landscape.

Browser engines and reduced viewport height are simulations. Switching browser tabs is not an operating-system background/termination test. API compatibility does not certify the native WeChat interface.

Local release checks passed: forced TypeScript, production build and **1,056 tests across 123 files**. Complete review/recovery journeys passed in WebKit at 360/390 px and Chromium at 390/1440 px, with no runtime errors. English/Chinese review layouts were inspected. Bike add/edit/delete/reopen and portrait/landscape video-close journeys passed in 390 px WebKit; the HR input measured approximately 117 × 44 px with no horizontal overflow.

## Physical-device acceptance — pending device access

No iPhone/Android test device or device-control connection was available in this workspace. Physical keyboard, app switching, OS termination and native WeChat checks remain **unverified** until performed on a phone. Do not mark this acceptance complete based on the automated results.

Use Kent's own test-athlete calendar and a clearly named test session. Record phone/OS, browser, WeChat version, language and timezone. Repeat on iPhone/Safari and Android/Chrome when available.

1. Open the calendar, edit the test session and add Bike once. Enter a time and a heart-rate range with the real keyboard open. Verify both HR fields and Done editing remain reachable without sideways scrolling. Delete the Bike and confirm the editor returns normally.
2. Change three sets to two and update a coaching cue. Tap Publish changes: verify the live → proposed values. Tap Back to editing and confirm both edits remain. Save as draft; verify the athlete's web/WeChat calendar still shows the previous prescription.
3. Reopen the draft, type another note and wait for the draft status. Switch to WeChat, then back to the browser. Confirm the note remains. Close/reopen the browser and Resume draft; confirm the athlete, date, notes and set targets are retained.
4. With the editor already open, disable networking, edit a note and attempt publication. Verify there is no success claim and edits remain. Reconnect, retry, review the changes and confirm publication once. Verify the calendar returns to the same athlete/date and there is only one session.
5. Open that session through the athlete web view and the actual WeChat mini program. Confirm two sets and the new cue appear. Open an exercise video from At a Glance, rotate the phone, then close it and confirm the workout remains usable.
6. Repeat the critical edit/review/video steps in Chinese. With a Japan device timezone, confirm the planned China calendar date remains unchanged. Record failures with the step and visible message; do not put access codes or phone numbers in the report.

| Device acceptance | Result |
| --- | --- |
| iPhone/Safari keyboard, app switching, restart | Pending |
| Android/Chrome keyboard, app switching, restart | Pending |
| Actual WeChat athlete workflow and current released version | Pending |
| Real phone connection loss and reconnect | Pending |
