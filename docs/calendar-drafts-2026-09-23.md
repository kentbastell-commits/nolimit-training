# Private calendar drafts

Coaches can populate an athlete's calendar before releasing their training.

- In the builder, choose **Save as draft**, select the athlete and start date, then save. This creates a separate calendar copy, including the current unsaved session. Multi-day plans use the existing assignment spacing; dates can be adjusted on the calendar.
- Saved sessions and programs also offer **Save as draft** in their assignment controls.
- Calendar cards display **Draft · coach only**. Editing and copying a draft preserve that status. **Save draft and return** saves changes without publication.
- **Review & publish** lists the athlete's unpublished sessions and test days. Select the desired items and choose **Publish selected**. Other drafts remain private.
- Athlete preview, web and the existing WeChat mini program see published training only. No mini program update is needed for this server-enforced visibility boundary.

The existing device/cloud builder recovery draft remains separate: it protects unfinished typing. Calendar drafts are saved assignments visible to coaches across devices. Published sessions continue to use their existing edit flow; this feature does not unpublish existing training or stage revisions over an already published session.

## Implementation

Migration `0028_calendar_drafts` adds non-null draft flags to assigned workouts/tests and an `assignment_only` marker on private programs. Existing assignments remain published. Draft creation snapshots templates, per-set targets and alternate exercises in one transaction; a stable request identifier protects retries after lost responses. New builder drafts also save their program and calendar assignments atomically.

Publishing is coach-authenticated and checks a review version before atomically releasing the selected assignments. Concurrent edits or date changes require a fresh review. The ordinary assignment API retains its published behavior. Draft saves never rewrite a live library source.

Athlete list caches, direct day reads, template reads, HTML exports, workout/test submissions, single-session rescheduling and plan status exclude unpublished assignments. Partial publication exposes only published program days. Coach and athlete browser calendar caches are separate. Cache invalidation reaches both server workers through the existing notification bus.

## Verification

Database tests cover coach authentication, atomic creation/rollback, retry identity, library and athlete isolation, draft edits/copies, stale publication review, selected-day publication, mixed test/workout schedules, athlete preview filtering and direct API/export access. Browser fixtures cover saved-session drafting, failed-save retry, draft editing, publication conflict/reload, new builder drafts, athlete preview and Chinese labels at 360/390px WebKit and 1440px Chromium.

Private evidence and release receipts: `deliverables/calendar-drafts-2026-09-23/`. Browser writes use fixtures; production checks are read-only.
