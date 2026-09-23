# Calendar session save recovery — 23 September 2026

The Accessory editor held an older three-round draft when its assigned session was corrected to two rounds. The server correctly rejected the stale version, but the UI offered no way to recover the new Bike without discarding work.

On a session-version conflict, the builder now fetches the latest assigned session and presents a review dialog. A three-way comparison retains additions and independent edits, and adopts saved changes to untouched exercises. Changes to the same exercise or session field require an explicit choice. Duplicate exercise identities and competing reorderings receive a whole-list choice because occurrence identity cannot be inferred safely. Publication still uses the server version guard and preserves started/completed-session protection.

New drafts include their original session baseline. Existing drafts recover it from the original template rows already stored on the device. Applying a reviewed version updates the editor and its device draft before the publish request, preserving it if that request fails. No automatic retry silently overwrites a newer session.

The calendar editor's close/back action now offers Save and return, Keep draft and leave, and Continue editing. Keeping a draft verifies the local write succeeded before leaving; storage errors and other-tab conflicts keep the editor open. Successful publication removes the active draft and returns to the same athlete's calendar.

Verification covers the legacy Accessory draft plus Bike, two-round corrections, notes, conflicting prescriptions, deletions, duplicate identities, reorderings, unavailable baselines, focus/keyboard behavior, and actual PostgreSQL stale-version rejection followed by a fresh-version save. Browser scenarios exercise 390px WebKit, 360px Chromium, and desktop, including failed refresh, failed publication, draft resume after reload, and eventual save. All scenario writes are intercepted fixtures; live athlete prescriptions are not modified by browser QA.

Private screenshots, test reports, and deployment evidence are in `deliverables/session-save-recovery-2026-09-23/`.
