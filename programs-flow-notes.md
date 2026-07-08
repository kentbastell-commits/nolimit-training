# programs-flow-notes.md — Client "My Programs" flow redesign

Goal: replace the client portal's program dropdown + Progress/Edit/Store tab
strip with a **status-driven card flow**: a sport-grouped list routes each
program by derived status. View-layer + flow change only — all data/handlers and
the scheduler are reused unchanged.

## The flow (new)

`src/PortalPrograms.tsx` is now a small screen router (local `view` state):

- **list** — programs grouped by `sport`, groups with an in-progress program
  first. Each card: dark monogram tile (sport abbr), name (Bebas), meta
  (`sport · N wks · M×/wk`), and a **derived status pill**. Plus a Store button.
- **Routing on tap:** in-progress → **dashboard**; not-started → **overview**;
  completed → **completed recap**.
- **overview** (not-started) — Overview/Sessions segmented control; Overview =
  weeks/per-week/level tiles + description + "what you'll build" (from program
  `goal`); Sessions = sample-week list. Sticky "Load into your calendar →".
- **schedule** — the "How should we place it?" design: three mode cards
  (Month/Week/Day), start-date input, per-mode date pickers, and a sticky "Add
  to my calendar". **Reuses the existing scheduler exactly**
  (`setClientProgramScheduleMode`, `clientProgramStartDate`,
  `clientProgramWeekStarts`, `clientProgramDayDates`, `loadClientProgramSessions`,
  `populateClientProgramCalendar`) — no scheduler logic changed.
- **dashboard** (in-progress) — renders the existing `renderProgramHome()`
  (already a rich, real-data dashboard: progress ring, up-next, streak calendar,
  PRs, syllabus) with a back-to-list button. **Reused, not rewritten** — see
  scoping note.
- **completed** — recap: gold seal, PROGRAM COMPLETE, sessions/adherence/weeks
  tiles, season-summary table, restart button.

## Status derivation (new, in App.tsx)

There is no status field on a program — it's derived from the real calendar
workouts. Added `clientProgramStatuses` (App.tsx, after
`getClientProgramCalendarWorkouts`): per purchased program, filters the global
`workouts` by that program, then:
- no calendar workouts ⇒ **not-started**
- all `completionStatus` complete ⇒ **completed**
- otherwise ⇒ **in-progress** (with `currentWeek` = earliest incomplete week)

Threaded App.tsx → ClientWorkspace → PortalPrograms as `clientProgramStatuses`.

## Scoping decisions (deliberate, documented)

1. **Dashboard = existing `renderProgramHome`.** The reference shows a simpler
   dark dashboard, but the app's `renderProgramHome` (~635 lines) already
   delivers everything it wants (ring, up-next, week strip, PRs) from real data,
   plus finisher/review/onboarding. Rewriting it was high risk for no functional
   gain, so the in-progress route reuses it (wrapped with back nav). A pixel-exact
   dark-hero restyle of it can be a focused follow-up.
2. **After "Add to my calendar" the existing `populateClientProgramCalendar`
   runs, which navigates to the calendar (Training tab) on success** — its
   existing behavior, preserved (the prompt said reuse it with no regressions).
   The design's immediate loading→dashboard hand-off would require changing that
   handler's navigation; deferred to avoid a scheduler regression. After commit
   the program shows "In progress" and taps into the dashboard.
3. **Recap "training time / total volume / biggest gain"** aren't tracked as
   client-facing metrics yet — shown as `—` with `// TODO` (per the prompt).
4. **Coach portraits / two coaches** not applicable here.

## Bilingual + motion

New copy uses the portal's `paceZh` ternary pattern (matching the existing file);
existing `t()` keys reused (`myPrograms`, `week`, `day`, `programStartDate`,
`previewDates`, `atAGlance`, etc.). Screen entrances use framer-motion (fade +
12px rise, ease-out-expo) and collapse under `prefers-reduced-motion`.

## Verification

- `npx tsc -b --force` + `npm run build` clean.
- Unit suite green (97 files, 512 tests); PortalPrograms test rewritten for the
  new flow (empty state, list + derived status + routing, in-progress→dashboard).
- Screenshotted against **live prod data** (CL-0001): the sport-grouped list with
  the "In progress · Week 1" pill, and the in-progress → dashboard route showing
  the real progress ring / up-next / streak / syllabus. Overview/schedule/
  completed screens covered by the build + unit routing tests (CL-0001 has only
  an in-progress program to drive live).

## Not yet deployed

Committed on `main`; deploy is Kent's call.
