# Session editing and calendar planning — 23 September 2026

This release implements the five agreed follow-ups to the mobile coaching work. Phone and desktop use the same actions, prescriptions and saved records.

## Coach workflow

1. **Bulk edit** updates reps and rest on every selected set, including exercises that already have individual set prescriptions. Blank fields retain their previous values. Set counts must be whole numbers from 1–100. Load, time, intensity and other untouched targets retain their individual values.
2. **Undo / Redo** recover up to 40 changes to the current session's exercises and notes, including deletion, circuit links and order. Changing sessions or athletes resets that stack. **Saved history** in a calendar session's builder opens earlier saved snapshots; **Restore to editor** loads their exercises and notes for review. Publication remains an explicit action. History begins with the first edit after this release; it does not manufacture versions for older saves. Displayed history times indicate when the snapshot was captured.
3. **Review & publish** expands each workout into an athlete preview with circuit rounds, per-set targets and collapsible session/exercise notes. The review checks the saved content again before publishing selected items.
4. When editing a published workout, **Save as draft** saves a private revision. The athlete continues seeing the published workout on web and WeChat. Reopen the session to continue editing, use **Publish changes**, or publish it from **Review & publish**. Discarding a private revision keeps it in saved history. Completed or started workouts cannot be replaced.
5. **Select sessions · Move / Copy** selects several calendar workouts, shifts them with their spacing preserved, and allows individual destination dates. The final button states the number of sessions affected. Moves update their dates together; copies receive independent templates and start as drafts. Review/publish or discard an existing private revision before including that workout. Started/completed workouts and tests/forms are outside this selection tool.

## Persistence and scope

- Migration `0029_session_revisions` adds private revisions, immutable JSON history snapshots and calendar request receipts.
- Published assignments retain their existing program pointer until publication. Private revision programs use the existing assignment-only visibility checks, including old mini-program direct detail URLs.
- Assignment row locks serialize edits/publication with training submissions. Stale versions require a reviewed merge. Batch calendar changes validate all selected sessions in one transaction and roll back if any becomes unavailable or starts training.
- Copy retries reuse a request ID. A repeated matching request returns its original result; reusing that ID with different contents fails. Copies preserve per-set targets and bilingual cues, without athlete logs or feedback.
- New and extended private APIs require positive coach authorization even when a server key is missing. Reads use `no-store`.
- Session notes share their disclosure component and styles with the workout player. The mobile footer keeps draft and publish actions side by side; Undo/history stay in the editor toolbar.

## Verification

Real local Postgres regression tests cover draft privacy, reviewed publication, stale/started-session rejection, immutable/discarded history, copy idempotency, same-athlete selection, date validation and transactional rollback. Logic/component tests cover per-set bulk targets and Undo scope. Browser checks use intercepted fixture APIs, never production writes, for the complete edit/review/move/copy workflow at mobile WebKit and desktop Chromium sizes, including a failed-copy retry and English/Chinese screens. Physical iPhone/Android keyboard and background/resume checks remain separate device work.

Private QA artifacts and the deployment receipt are in `deliverables/session-planning-2026-09-23/`.
