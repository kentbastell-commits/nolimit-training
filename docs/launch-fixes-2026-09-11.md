# Launch fixes — first implementation batch

Follow-up: [translation coverage and reliability fixes](translation-fixes-2026-09-11.md) cover DeepSeek-first translation, interface fallbacks and the additional release migration.

These changes follow the [11 September product audit](./product-launch-audit-2026-09-11.md). Update, 17 September: the web/API changes and migrations are deployed; miniprogram version **2026.9.17** uploaded successfully through DevTools. Trial promotion and public release remain unconfirmed. See [deployment status](deployment-2026-09-17.md). Login/security remain outside this work. Existing workspace changes, including the miniprogram's design work, have been preserved.

## Implemented

| Audit finding | Change |
|---|---|
| 01: Chinese-language crash | Removed opposing language synchronization effects. Public pages share i18n state and restore the stored preference. Coaching follows the same language. |
| 02: duplicate/partial workout saves | Logs, completion/load metrics and exercise results now share a PostgreSQL transaction. A row lock on the assigned workout serializes concurrent submissions; completed submissions acknowledge retries without creating more sets. Translation remains outside the transaction. Missing session references fail instead of creating orphan logs. |
| 03: history load bottleneck | Athlete filtering happens in SQL for history, calendar and exercise results. Added the client-code index. Concurrent cache misses share a read; invalidation prevents an older read repopulating stale cache. Cache entry count is bounded. Public landing now fetches only programs, coaches and reviews. |
| 04: small order-ID space | New orders and intake assignments use UUID-based IDs. Existing IDs remain valid. |
| 05–07: scheduling and fulfillment | Delivery uses China-date helpers, preserves test days, and commits calendar, order statuses and access dates atomically. Concurrent activations serialize per athlete. Weekly training days stay within their week. |
| 08–09: lost offline queue items | One shared flush removes only acknowledged operation IDs from current storage. New items survive an in-flight upload. Rejected/old submissions remain stored. Storage failure is returned to the player, which stays open and displays an error. Foreground/network recovery trigger retry; Calendar no longer waits for the entire queue before loading. |
| 10: false intake completion | Both clients advance only after successful intake submission. Failed requests preserve the current form and show retry feedback. Skipping is separate from submitting. The web success screen distinguishes a submitted questionnaire from a skipped one. |
| 11: misleading payment states | Native checkout says “Continue to WeChat Pay”; manual-transfer copy is separate. The miniprogram checks backend payment status after the payment sheet and distinguishes cancellation from failure. Manual coaching copy no longer asserts confirmed payment. |
| 12: coached buyer loses coached UI | Checkout returns the existing customer's client type. Mini purchase/profile/foreground refresh reconcile that type instead of overwriting it with Digital Program. |
| 13: logging/history mismatch | Checking a set records completion; blank performance fields stay blank in both clients. Completed mini sessions read their saved set records, including swaps, sides and skips, rather than current prescription rows. |
| 15: bundle metadata/scheduling | Web duration uses bundle members and retains their catalog order. Delivery schedules bundle phases sequentially and standalone add-ons in parallel. Missing paid phases fail delivery atomically. Nested bundles require a separate product rule and currently fail explicitly. |
| 16: inbox false-empty state | Failed feeds retain their previous messages and show retry feedback. A complete network failure no longer appears as an ordinary empty inbox. |
| 18: selected mobile/accessibility issues | Mobile navigation fits 320/390 px. Checkout has dialog semantics, contained keyboard focus, Escape and focus restoration. The large mobile checkout image is removed, and direct checkout is labeled Checkout. Workout tutorial copy/styling matches the logging behavior. |

The new delivery implementation lives in [programDelivery.ts](../server/db/pg/programDelivery.ts). Coach-driven assignment remains a separate implementation; unifying both assignment paths is additional work. There is no automatic rewrite of existing customer histories or calendars in this batch.

## Measured results

The load fixture is unchanged: 1,000 synthetic load athletes, 240,000 logged sets, the same real Express API and a separate local database. Each requested history contains 240 sets. These are local diagnostic bursts, not production capacity certification.

| Scenario | Audit baseline | After fixes |
|---|---:|---:|
| One cold athlete history | 1,335 ms | 35 ms |
| Ten different cold histories | 12,293 ms; one 500 | 48 ms total; all 200 |
| Repeat ten-cold-client run | 13,997 ms; all 200 | 133 ms total; all 200 |
| Sampled process RSS in first ten-cold run | approximately 1,304 MB | approximately 178 MB |
| 100 requests after explicitly warming ten clients | p95 231 ms | p95 221 ms |

Workstation activity varies between runs. The repeat confirms the improvement remains substantial; the mechanism is reduced database result materialization plus indexed filtering, not additional production hardware. The original intermittent 500's exact cause remains unproven.

Results: [load comparison](../deliverables/audit-2026-09-11/fix-load-results.json), [repeat](../deliverables/audit-2026-09-11/fix-load-recheck.json).

## Validation

- Full suite: **811 tests across 83 files passed** after the main backend/frontend changes. This includes the new concurrent-save, rollback, delivery, bundle, exact-client and historical-record regressions.
- A subsequently added coaching-intake interaction test passed: injected HTTP 503 retains answers; retry submits the same values and only then completes. Targeted reruns passed **63 tests across seven files**, followed by **12 UI/i18n tests across three files** after the final copy/focus changes. These counts overlap the full suite and are not additive coverage totals.
- Miniprogram: **five source-executed boundary/record tests passed**, covering enqueue-during-flush, shared flush, storage failure, old/rejected saves, lost-response acknowledgement and completed records.
- Web and miniprogram TypeScript checks and production builds passed. Vite still reports large chunks; further route splitting remains open.
- Local Chromium checks passed at **320, 390 and 1440 px**: repeated EN/Chinese switching, Chinese reload/store navigation, no React runtime failure, reduced landing requests, navigation bounds and checkout keyboard behavior.
- New index migration was applied successfully to the isolated audit database before load verification.

Evidence is under [deliverables/audit-2026-09-11](../deliverables/audit-2026-09-11/), with `fix-` prefixes. The original audit JSON results are retained. `web-build/` now contains the candidate build. The native-payment wording check uses a config fixture; it does not initiate payment.

The in-app browser still fails during connection setup, so verification used the installed Playwright browser tools. Native WeChat simulator/device behavior, actual payment settlement and production load were not exercised.

## Release sequencing and remaining work

Apply [migration 0021](../server/db/migrations/0021_workout_log_client_code_index.sql) and release the shared backend/web before uploading the new miniprogram. The mini's completed-workout view depends on the additional history fields and workout filter. These changes have only been built locally.

The following remain open from the audit:

- **14:** customer order history/resume-payment and a proper owned-program library in the mini; durable intake recovery after closing/restarting the app. Forms currently retain failed submissions while their page remains mounted.
- **17:** the actual WeChat wellness template configuration and reminder-device verification.
- **18/20:** broader coach/mobile usability and contrast checks, Today/home priorities and explicit active-program selection.
- **19:** graceful worker draining, database/request deadlines, per-worker health checks/metrics, restart rehearsal and backup-restore rehearsal.
- **02/03 follow-through:** web submission recovery after a browser restart, complete SQL pagination/aggregation for long histories, narrower write invalidation and further coach/report query scaling. The reproduced transactional and cold-athlete-read failures are fixed; this is not a claim that every workload now scales.
- Real iOS/Android/WeChat acceptance, payment handoff/settlement and a 30-minute mixed read/write run on representative infrastructure before public launch.

The next implementation batch should complete customer recovery and operational resilience, followed by the launch rehearsal defined in the audit. This first batch does not change the audit's requirement for those release gates.
