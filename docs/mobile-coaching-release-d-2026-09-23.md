# Mobile coaching release D — web reliability and language

23 September 2026. Follows the [mobile benchmark](mobile-coaching-benchmark-2026-09-23.md) and releases A–C.

## Changes

- Browser Back closes the workout, athlete preview or notification sheet before leaving the athlete. Moving between Review and the athlete restores calendar date and view. Refresh restores the workspace; an old history entry cannot reopen a discarded builder. Unsaved builder changes keep the existing explicit leave/recovery choices.
- Failed calendar refreshes retain the last successful workout list and show a retry state with its load time. A failed related request no longer clears successfully loaded workouts. Late results from another athlete cannot replace the current athlete's workouts or history.
- Coach message replies, check-in replies, video feedback and private Review notes persist on the device. Storage is separated by coach and item; concurrent tabs cannot silently overwrite the same reply. Failed writes retain text. Rapid reply taps are guarded; reconnect does not automatically publish drafts.
- Web training dates, assignment defaults, overdue checks and coach analytics use China time (UTC+8), independently of the device timezone. Civil date arithmetic remains separate from formatting an absolute timestamp. The calendar states its timezone.
- English/Chinese labels cover the main navigation, roster controls, calendar, builder controls, circuit instructions and Review actions. Coaching interface language does not change the athlete's saved content language. Exercise and session titles remain the authored content.
- Notifications are reachable from More on phone and Admin on desktop. Refresh failures keep the previous list; athlete links open the relevant workspace. These are existing application records, not a new push or WeChat delivery service.

## Verification

- Forced TypeScript compilation, production build, and all 995 tests across 113 files passed.
- New regressions cover China/Japan midnight, timezone-offset equivalence, invalid dates, leap years, draft hydration/remount, coach/type separation, multi-tab conflicts, unavailable storage, Back behavior and history restoration.
- Playwright WebKit phone checks at 360px and 390px and Chromium at 1440px. Fixed time is 00:30 in Japan on 24 September, while China's calendar correctly remains 23 September. Desktop also uses America/Los_Angeles.
- Fixture journeys cover partial read failure, failed refresh with retained calendar, manual retry, workout/preview/notification Back, failed notification refresh, reply reload recovery, failed reply followed by successful retry, rapid taps, and return to the same calendar. English/Chinese screens and horizontal overflow are checked.
- The prior assigned-session recovery journey is retained: add one Bike, edit duration/HR, recover a stale draft, retry a failed publish, and preserve the four two-set core exercises. All automated browser writes are intercepted fixtures.
- Evidence, test results and deployment verification: `deliverables/mobile-coaching-release-d-2026-09-23/`. The earlier session-recovery runner stores its evidence in `deliverables/session-save-recovery-2026-09-23/`.

## Completion boundary

This delivers the web portion of phase 4. Physical iPhone/Android keyboards, OS process termination, native WeChat and actual push delivery are not certified by browser emulation. No mini-program upload is included. Source inspection found the mini-program calendar still uses device-local day helpers; parity for athletes travelling outside China remains a separate mini-program change and review.

Before declaring the complete cross-device phase finished, check a real phone with its keyboard open, background and resume an unsent draft, and verify China-midnight assignments in the mini program after its date helpers are aligned. Cloud draft synchronization, notification preferences, coach-initiated chat and voice feedback are not added by this release. Device drafts are not a backup against clearing browser storage.
