# Shared coach and athlete design

Kent's requirement: mobile should remain familiar to a desktop coach, and View as athlete should follow the mini program. Use one NX LIMIT identity, with desktop as the reference for coach workflows and the mini program as the reference for athlete screens.

## Implemented

- Coach navigation and athlete calendar context remain in place. Phone headers, roster rows and session cards are compact; Week / Month / Full retain their desktop meanings. A phone week strip provides date shortcuts.
- Calendar Add offers New workout, Saved workout, Program and Test directly, on both devices. Assignment still has a content/date/athlete confirmation before writing.
- Calendar workout editing brings exercises onto the first screen, collapses session notes/settings and keeps Save and return reachable. Program editing uses the same week/day hierarchy, collapsible week sections, Copy to next week and Duplicate week, with a fixed phone Save program action. Reviewing a day remains distinct from saving the complete program.
- Athlete web and preview share Today / Training / Coach (or Support / Get started) / Me. Today follows the mini-program layout: relevant session, daily habits and progress. Training retains the usable calendar/history routes; Me provides records, assessments, owned programs and account settings. Coach has messages, feedback and contact destinations.
- The athlete palette, cards, icons and workout-player treatment follow the mini-program reference. English and Chinese share the same structure. Desktop preview starts in a phone-sized frame, with an expand option.
- Preview blocks API writes, workout/assessment draft persistence, remembered athlete identity and changes to the coach's stored language/weight preferences. Closing returns to the original coaching context. Coach-roster and athlete-profile caches have separate keys.
- Web profile reads use the same resolved `myProfile` data as the mini program. Legacy athletes with an assigned coach and training but no type/order resolve to the display type `Coaching`, unless an owned digital program is known. This read does not change stored account types, payments or entitlements.
- The roster's programming warning checks future scheduled workouts before treating an empty profile program field as an unplanned athlete.

## Verification and release evidence

Browser walkthroughs use cached/read-only production data and intercept all assignment/save submissions. Local legacy-profile fixtures reflect the new read-only resolution, which also has real Postgres regression coverage. No QA workouts, assignments, messages or workout logs are submitted to production.

Covered journeys: coach roster → athlete → calendar → edit → return; direct saved-workout selection and timed-prescription preview; athlete preview → Today / Me / records / Coach / Training; Chinese workout-player notes; program creation, day editing, copying, week duplication and simulated program save. Check that returning/reloading after preview retains the complete coach roster.

Evidence and final release receipt: `deliverables/mobile-redesign-2026-09-22/`. The design audit remains at `deliverables/mobile-coach-2026-09-22/audit.md`.

These are browser checks at phone widths and desktop, not physical iPhone/WeChat runtime certification. The web preview renders the shared web athlete UI; native WeChat title bars, sharing and payment APIs remain native. This change does not upload or publish a mini-program build. Existing athlete notes, assignments, prescriptions and submitted records are preserved.
