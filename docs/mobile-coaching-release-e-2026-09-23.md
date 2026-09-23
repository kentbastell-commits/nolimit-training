# Mobile coaching release E — drafts and weekly progression

23 September 2026. Extends the [mobile coaching benchmark](mobile-coaching-benchmark-2026-09-23.md) and completes the mini-program timezone implementation left after release D.

## Delivered behavior

- Workout/program drafts synchronize after a pause in editing and refresh on focus, reconnect and periodically while the app is visible. A second device using the same coach access can expand **Unfinished coaching drafts** and resume. Status distinguishes synced, syncing, local-only and conflicting versions. Sync never publishes an athlete assignment.
- Local storage remains the first save path. Failed sync retains local work. Concurrent edits require **Keep both versions** in the draft list, preserving the device's changes as a separate draft. Open editors are never silently replaced. Publish/discard queues a revision-checked cloud deletion; tombstones prevent a clean old device copy from resurrecting it. A newer unsynced version on another device is preserved.
- Cloud records are scoped using the verified coach access key on the server, not a caller-supplied owner. An unset server key does not grant access. Stored session edit baselines travel with the draft, so the existing three-way session recovery remains in effect when publishing.
- **Copy & progress** shows current and copied loads, plus expandable recent completed sets with the historical prescribed reps, actual reps/load/time/distance and athlete notes. Dates identify the latest recorded session; it is not assumed to belong to the source week. Missing historical load prescriptions are not reconstructed from the current plan.
- Load presets, per-exercise selection, a sticky copy button and an inline target-week replacement confirmation work on phone and desktop. Bodyweight, percentages, values containing units and automatic targets are excluded from numeric load changes. Copy modifies the draft only.
- The mini program uses China dates for Home, Calendar, weekly completion/streaks, check-ins, workload dates, inbox dates and onboarding defaults. Calendar day/week/month arithmetic uses UTC civil dates to avoid device timezone and DST changes. Calendar labels the timezone. Existing scheduled timestamps are not rewritten.

## Verification

- Forced TypeScript compilation, production build and **1,011 web tests across 116 files** passed. New real-Postgres tests cover coach access, ownership, concurrent writes, retries, stale deletes and tombstones. Client tests cover offline recovery, delayed acknowledgements, competing versions, deletion before first upload and reviewed week progression.
- Mini-program TypeScript and production build passed; **33 Node tests** passed, including China/Japan/Los Angeles boundaries, Monday totals, DST dates, leap years, circuit playback and retained save queues.
- WebKit at 360px and 390px and Chromium at 1440px exercise phone/desktop handoff, offline typing, simultaneous edits, preservation of both versions, weekly load comparison, China dates and horizontal bounds. A shortened 520px viewport checks action reachability; this is not a physical keyboard test.
- The assigned-session recovery journey checks add-one-Bike, HR 130–150, 30-minute duration, stale-version recovery, failed saves and successful retry with all four core exercises still at two sets. All browser writes use intercepted fixtures; no athlete programming is changed by these tests.
- The in-app Browser bootstrap is unavailable (`missing field sandboxPolicy`). Standalone Playwright provided browser QA; evidence and scripts are in `deliverables/mobile-coaching-release-e-2026-09-23/`.

## Workflow checks

Counts describe the fixed fixture routes, excluding typing and automatic browser scrolling. They are reproducible action counts, not human usability timings or Japan network benchmarks.

| Task / starting point | Actions | Result |
| --- | --- | --- |
| Roster → selected day's assigned-session editor | 5 on phone; 4 on desktop | Athlete, date and assignment scope retained. |
| Open a synced draft on another device | 2 | Expand drafts, Resume. No manual export or re-entry. |
| Week overview → inspect recent result → copy next week at +5% | 4 taps; no keyboard entry | Source load 20 retained; selected copied load 21. |
| Selected calendar date → assign saved session | 4 taps | Confirmed athlete/date; one assignment; calendar refresh shows it. Search adds typing when needed. |
| Calendar → Review item → send reply | 3 taps plus typing | Reply reaches the selected item. Reload recovery, failed send and retry also checked separately. |

The draft list starts collapsed so it does not displace the coach workspace. Progression presets remove numeric entry for common adjustments; results are available in the same sheet instead of requiring a separate history visit. Review and assignment routes retain their existing scope previews.

## Release boundary

Mini-program source: `4168aae`. Verified build uploaded successfully through WeChat DevTools as **2026.9.23.1** (938,060 bytes); this is a development upload. Select this version for trial testing, then submit/release through WeChat's review process. Physical iPhone/Android keyboard, OS termination/background recovery and native WeChat travel testing remain unverified from this workstation. Browser emulation and pure date tests do not certify those behaviors.

Coach replies/private review notes still use device storage; cross-device synchronization in this release applies to workout/program builder drafts. Both devices must use the same coach sign-in. Clearing browser storage before an unsynced draft uploads can still lose that device-only copy.
