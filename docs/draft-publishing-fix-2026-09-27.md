# Draft publication from the calendar preview

The coach workout preview offered **Submit Workout** for unpublished calendar drafts. That called the athlete-results endpoint, optimistically marked the calendar card Completed, and closed the player. The server correctly rejected results for a private draft, but the browser displayed a generic sync failure and kept the false Completed status.

Read-only production inspection confirmed the reported September 30 session remained Scheduled and private, with eight exercises and zero workout logs. A fixture using the previous production assets reproduced the screenshot's failure. No athlete data was changed during diagnosis or testing.

Changes:

- Draft previews show **Draft · coach only** and **Review & publish**, with result fields disabled and no workout-submission action.
- The calendar session menu also offers **Review & publish** for drafts.
- Opening publication from one session selects only that session. Calendar-wide review continues selecting all drafts. A missing/already-published session does not cause other drafts to become selected.
- The application guards draft submissions before updating completion state. The server returns a specific 409 draft response; the updated client restores Scheduled, retains device data, and directs the coach to publication instead of offering a results retry.
- Existing publication checks, revision handling, athlete results, and completed-workout protection remain in place. Publication changes visibility, not completion.

Validation: 42 relevant component and real local Postgres tests passed; TypeScript and the production build passed. Browser fixtures at 390 px WebKit and 1440 px Chromium exercised preview → review → cancel, session-menu publication, failed publication → reload → retry, one-session selection with another draft present, and reopening the published Scheduled workout. No workout-log writes or page errors occurred in the corrected flow. Private evidence is in `deliverables/draft-publish-2026-09-27/`. Browser checks simulate mobile; no physical phone was connected.

After deployment, Mario should refresh the coaching page, open the draft, choose **Review & publish**, and confirm **Publish selected (1)**. The saved draft does not require recreation or clearing browser storage.
