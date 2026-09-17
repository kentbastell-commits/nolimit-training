# Translation coverage and reliability — 11 September 2026

Implemented locally across `nolimit-training` and `nolimit-miniprogram`. Production configuration and both translation providers were checked, but the application changes, database migration and existing-content backfill have **not been deployed or applied to production**.

## Translation order

1. **DeepSeek first** for content that needs translation. The live configuration is `deepseek-v4-flash` at Tencent TokenHub (`https://tokenhub.tencentmaas.com/v1`).
2. **Tencent Machine Translation** if DeepSeek times out, fails or returns an incomplete/empty response.
3. **Saved interface text or the original content** remains readable when translation is unavailable. Bundled menus, buttons and labels work offline; switching language does not wait for an AI call.

Explicit translated copy is retained. When a source field changes without a replacement translation, its old mirror is cleared atomically and regenerated. Delayed responses cannot apply to a different source or replace a newer translation. Names identifying people, IDs, answer values, units and recorded workout numbers remain original data.

## Coverage fixed

[The shared coverage map](../server/db/contentTranslations.ts) now covers **19 content areas and 53 translation fields**, used by both write-time translation and the backfill command.

| Area | Coverage |
| --- | --- |
| Exercises | Names, categories, muscles, equipment, movement patterns, coaching/technical cues and common mistakes |
| Programmes and store | Names, goals, phases, descriptions, store categories and sales copy |
| Workout templates | Session titles, goals, session notes and human coaching notes; builder metadata stays out of translations |
| Assigned/completed workouts | Calendar titles, coach notes and goals; completed exercise names are localized without changing the saved exercise or actual performance |
| Forms | Titles, descriptions, question labels, help and option labels |
| Physical tests | Battery titles/descriptions, item names, instructions, display units and library protocols |
| Coach communication | Replies to messages, check-ins and video submissions |
| Athlete communication | English mirrors of messages, check-in notes, video notes, client/intake notes, workout notes, questionnaire comments/answers and test notes |
| Public content | Coach biographies, testimonials in both languages and incoming enquiry notes |
| Company operations | Shared DeepSeek/Tencent path, mixed-language text, recovery after failed requests and inbox message bodies |

The web calendar now uses translated form/test titles. The miniprogram displays session goals/notes in Chinese and preserves Chinese exercise names when reopening completed workouts. Both clients display translated form choices while submitting stable original values; older responses that stored a Chinese choice remain recognizable. The storefront identifies translated testimonials and keeps their original text available in the title attribute.

## Reliability changes

- Identical simultaneous requests share one provider call. Provider concurrency is capped at four per API process, pending translation texts at 256, background write jobs at 128, and database reads at 200 rows per write batch.
- Long text is split at UTF-8-safe boundaries. Every chunk must succeed before its result is stored. Oversized input (over 32,000 UTF-8 bytes) remains untranslated rather than being silently cut off.
- Timeouts include response-body reads. Token-limited DeepSeek answers trigger fallback instead of being saved as complete instructions.
- Successful translations use a bounded cache. Temporary Tencent cache entries expire after one minute so new requests can try DeepSeek again; failures have a short retry interval.
- Translation writes invalidate the affected read caches through the existing cross-process cache bus. The maintenance command also uses that bus in apply mode.
- Operations text no longer keeps a failed result cached for the whole session or shows a previous field's translation after editing. Its request timeout allows the provider fallback to run.
- Invalid miniprogram language storage falls back to Chinese. Full storage no longer prevents changing the interface language.

Translation remains best effort after the original save. A provider outage, saturated translation queue or process restart can leave a mirror empty; the original remains available, and a later save or the backfill command can fill it. This is not a durable background-job system.

## Validation

- Seven synthetic live-provider smoke cases passed using the updated translator module in an isolated remote process: exercise instructions, athlete Chinese-to-English, store copy, form wording, test instructions, operations text, and a forced DeepSeek failure followed by Tencent success. No customer records were changed.
- The final full web/backend suite passed: **840 tests across 88 files** in 155 seconds. Both production builds passed after the translation changes.
- Additional integration tests exercise every registered area against local PostgreSQL, edited source fields, curated Chinese, delayed reply races, provider failures, cache invalidation, questionnaire values and completed-workout records.
- Eight miniprogram checks passed, including offline dictionaries, invalid/full language storage, stable translated choices, completed records and the earlier save-queue regressions. TypeScript and both production builds passed.
- Chromium browser checks at 390px and 1440px verified Chinese calendar/form titles, question/help text, option labels and buttons, with the same original answer submitted from each viewport. No browser exceptions occurred. Screenshots were inspected.
- The maintenance command was tested on synthetic local data: dry-run made no provider calls or writes; apply mode respected its row limit, filled missing fields and preserved originals.

Evidence: [live provider results](../deliverables/audit-2026-09-11/translation-live-smoke.jsonl), [read-only production coverage](../deliverables/audit-2026-09-11/translation-live-coverage.jsonl), [release tests](../deliverables/audit-2026-09-11/translation-release-tests.log), [worker regressions](../deliverables/audit-2026-09-11/translation-worker-regressions.log), [miniprogram tests](../deliverables/audit-2026-09-11/translation-mini-tests.log), [browser results](../deliverables/audit-2026-09-11/translation-ui-results.json), [phone screenshot](../deliverables/audit-2026-09-11/translation-form-390.png), [maintenance check](../deliverables/audit-2026-09-11/translation-maintenance-results.log).

The production coverage snapshot confirms missing mirrors in existing content. Its raw workout-note counts include metadata-only records; the maintenance command filters those out. Automated checks verify routing, persistence and display; they do not establish native-speaker approval of every generated sentence. Native WeChat device testing remains outstanding.

## Release and existing content

Apply [migration 0021](../server/db/migrations/0021_workout_log_client_code_index.sql) from the previous fix batch and [migration 0022](../server/db/migrations/0022_translation_coverage.sql) before releasing the backend/web, then release the miniprogram. Migration 0022 adds 18 missing translation columns.

Run [the coverage command](../scripts/translationCoverage.ts) from the deployed repository:

```sh
# Read-only inventory; no translation calls or writes.
npx tsx scripts/translationCoverage.ts

# Fill up to 100 records in one content area, preserving existing mirrors.
npx tsx scripts/translationCoverage.ts --area programs --apply --limit 100
```

Repeat bounded batches for the other areas listed in `translationAreas`, and inspect the inventory again. Unavailable translations produce a nonzero exit status for retry. Existing nonempty translations are not automatically rewritten; editorial corrections remain explicit.
