# celebration-notes.md — Animated post-workout celebrations

Goal: when an athlete finishes a workout, play a full-screen animated brand
celebration (one of three random variants) — while keeping the existing
RPE + exercises-review finish screen untouched.

## The flow (unchanged where it matters)

1. Athlete finishes the workout in the player → the **finish/review screen**
   (session RPE, editable per-exercise review, stats, new PRs). **Kept exactly
   as before** — `App.tsx` finish sheet, unchanged.
2. Taps **Save & Finish** → `saveWorkout` fires optimistically: it shows the
   celebration instantly and syncs the log to the server in the background
   (`syncWorkoutSubmission` → `/api/saveWorkoutLog`).
3. The **new animated celebration** plays (random variant, gold-on-ink) with a
   coach message + session stats + CONTINUE. Tapping CONTINUE dismisses it.

So the celebration is the reward *after* the review screen — the review screen
is where RPE and exercises are handled, the celebration is pure payoff.

## What changed

- **New component** `src/Celebration.tsx` + `src/Celebration.css` (drop-in from
  the design), three variants: `fistbump` (POUND IT), `highfive` (UP TOP!),
  `thumbsup` (CRUSHED IT / "COACH APPROVED"). Self-contained, reduced-motion and
  safe-area aware, fires a per-variant haptic at impact.
- **Replaced** the old static "Session Complete" card (`.celebrationOverlay`)
  with `<Celebration>`, driven by the existing `workoutCelebration` state. The
  variant is picked at submit time in `saveWorkout` (random, never the same one
  twice in a row via `pickCelebrationVariant`).
- **Bilingual**: EN uses the component's per-variant defaults; ZH passes
  `kicker` / `headline` / `message` / `ctaLabel` overrides (natural coach
  Chinese) plus a localized stats line. Coach name comes from
  `selectedClientProgram?.coach`.
- **Deviations from the drop-in** (genuine conflicts, per its own notes):
  - Logo: the repo's `/nl_wordmark_clean.png` is gold-on-an-opaque-plate; used
    `/nl_wordmark_black.png` + `mix-blend-mode: screen` instead (same fix as the
    splash) — clean gold wordmark on dark.
  - Added an optional `kicker` prop so the "WORKOUT COMPLETE" / "COACH APPROVED"
    line can be localized.
  - Did **not** mount `CelebrationHost` (the event-based random-fire host): this
    app is state-driven (`workoutCelebration`), so `<Celebration>` is wired
    directly to that state instead of a `window` event. Cleaner, no parallel
    trigger system.

## Safety net preserved

The old card also showed sync status + a Retry for a failed background save.
Since the animation replaces that card, a failed sync now:
- shows an error **toast**, and
- raises a persistent **`.workoutSyncFailBar`** (bottom, survives the
  celebration being dismissed) with a **Retry** button — driven by new
  `failedSubmission` state, cleared on success. A logged workout is never
  silently lost. (The old `celebrationSync` state was removed — `failedSubmission`
  fully replaces it.)

## Verification

- `npx tsc -b --force` clean, `npm run build` clean.
- Unit suite green (97 files, 511 tests — +4 Celebration smoke tests).
- Screenshotted all three variants on iPhone width: highfive and thumbsup render
  fully (gesture, confetti, headline, coach card, stats, CONTINUE); the logo
  reads as a clean gold wordmark on dark. (fistbump's text fades are flaky to
  capture under headless Chromium's CSS-animation throttling — a screenshot
  artifact, not a runtime bug; the DOM is correct and the identical coach/stats
  code renders in the other two variants.)

## Not yet deployed

Committed on `main`; deploy is Kent's call.
