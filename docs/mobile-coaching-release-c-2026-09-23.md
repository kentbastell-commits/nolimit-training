# Mobile coaching — release C

23 September 2026. Implements consistent programming from the [benchmark audit](mobile-coaching-benchmark-2026-09-23.md).

## Programming

The mobile day editor and saved-session exercise editor now share the same prescription controls. Both support custom tracking fields, timed holds, distance, per-set rest, tempo, percentages, unilateral work, alternates and coach notes. The old phone-only kg/reps table has been removed. English and Chinese notes round-trip through template loading, reusable blocks, whole-program saves and isolated athlete-session saves. Editing the English source clears the old translation for regeneration or an explicit Chinese edit.

Exercise blocks are a shared, coach-only Postgres library. Coaches select exercises from the current session, name the block in English and optionally Chinese, and save it. Selecting a circuit station includes its linked group. Blocks preserve exercise order, per-set prescriptions, rounds/EMOM/AMRAP settings, rest, alternates and bilingual notes. Search, favorites, recent usage, prescription preview and deletion are available in the same sheet on desktop and phone. Repeated insertion creates independent copies with new circuit identities; changing a session never edits the saved block. A block save is separate from publishing its containing session.

Week duplication uses one sheet on both devices: select destination weeks, optionally adjust numeric loads, and inspect the source → copied load comparison. Existing target sessions require confirmation before replacement. Numeric loads can increase or decrease; values containing units, percentages, bodyweight instructions and automatic targets are retained. The preview and copy include the current session draft. Copying extends the program duration when needed and leaves the result unpublished until the program is saved.

## Navigation

Library opens directly to the last section used on this browser. Exercises / Programs / Sessions / Forms / Tests are common destinations on phone and desktop. Programming search and filters sit directly above the results; Refresh is a small header action, and the redundant statistics board and nested tab menu are removed from this flow.

The phone Week view shows the selected day's sessions beneath the seven-day strip. All days remain accessible from that strip; desktop keeps the full week grid. Month and Full remain available. Session action buttons expose View / Review, Edit this session, Copy, Move to another date and Delete. Completed sessions expose review instead of editing. Move uses the existing clipboard and visible destination-day paste action; long-press remains a shortcut. Backend protection still refuses edits to completed or started sessions.

The athlete name is a searchable switcher that preserves the workspace tab and calendar date. Isolated session saves continue returning to that athlete and date. New dialogs use a portal, keyboard focus containment, Escape, focus restoration and body scroll locking.

## Verification and boundaries

- Forced TypeScript compilation and production build passed. The full regression suite passed 963 tests across 107 files; results are recorded in the [release evidence](../deliverables/mobile-coaching-release-c-2026-09-23/).
- Local Postgres checks cover block persistence, complete bilingual circuit metadata, concurrent saves, stale deletes, authorization and explicit Chinese-note edits isolated to one assignment.
- Browser fixtures cover 360px, 390px and desktop: direct library navigation, remembered section, visible calendar actions, shared prescriptions, block save/insert, scoped session save and return, and week progression. The 360px flow checks that a numeric load of 20 becomes 21 after +5%. Chinese navigation, calendar and athlete search are checked at 360px.
- Production checks are read-only. Fixture writes and test-database records do not touch live athlete programs, replies, notifications, orders or payments. Migration `0026_programming_blocks` adds one table; it does not seed or alter athlete training.
- The in-app browser connection failed with `missing field sandboxPolicy`; standalone Playwright supplied browser emulation. Physical iPhone/Android keyboards, background recovery, real notifications and native WeChat are not certified by these checks.

Release D remains: a full legacy-label translation pass, calendar timezone consistency across travel, reconnect/notification behavior and physical-device QA. The shared coach controls adapt their layout to the screen; the entire desktop and mobile program shell has not been replaced. Unsaved block names/selections exist only while their sheet remains open; session prescription drafts retain the existing device recovery behavior. Browser-level Back/history across all app pages remains part of the broader navigation audit.
