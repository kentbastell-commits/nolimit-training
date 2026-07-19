# Season 1 climbing products — approved blueprint (PARKED, ready to build)

Status 2026-07-20 (overnight): **STEPS 1-3 EXECUTED — awaiting Kent's review.**
All 6 products created on prod Feishu (publicStoreVisible=false, Draft):
PR-5345 Climbing 1 / PR-5772 Climbing 2 / PR-9055 Climbing 3 / PR-7449
Climbing 4 / PR-1442 Fingers / PR-1234 Shoulders. 128 sessions seeded
(28+28+28+28+8+8), verified via programTemplates counts + workoutDetails
spot-checks; seed idempotent (re-run: 0 to write); CN names/goals patched.
Old SKUs untouched and still store-visible. REMAINING (needs Kent): review
in builder -> flip publicStoreVisible + productStatus Active -> create new
bundle "Climbing Season 1 – Complete (1-4)" ¥899 with the new PR ids ->
delete old SKUs (PR-6665/1803/3206/7596/3061/2367).

## Decisions already made (Kent, 2026-07-18/19)

- Replace Climbing S1–S4 with season-based products: **Climbing 1–4, Season 1**
  (Programs table has a `Season` number column). Next year = Season 2.
- Delete old SKUs (PR-6665, PR-1803, PR-3206, PR-7596), old bundle (PR-3061),
  old Joint Prep add-on (PR-2367) — AFTER the replacements exist and are
  verified. Deletion explicitly authorized by Kent.
- Carry over old store metadata verbatim (prices ¥299/¥299/¥349/¥349, bundle
  ¥899, CN/EN sales copy, Rock Climbing category, listing types).
- **Weekly rhythm (all 4 programs):** 7 scheduled days × 4 weeks = 28 sessions
  per program. Days 1/2/4/6 = real training; days 3/5/7 = OPTIONAL steady
  cardio, "30 min any machine @ 130–150 bpm" (single-exercise Cardio session).
- **Two targeted add-ons replace Joint Prep** (¥99 each, 2 sessions/wk × 4wk):
  "Climber's Fingers" and "Climber's Shoulders".

## Phase designs (every exercise from the live library — CN names/videos free)

- **Climbing 1 – Foundation** (Beginner): Lower Foundation / Pull + Finger
  Intro (open-hand density hangs ONLY, low intensity) / Push + Shoulder Care /
  Skills + Core Tension. W1→W3 build (3→4 sets, +5s hangs, +2.5–5kg), W4
  consolidation.
- **Climbing 2 – Base Strength** (Intermediate): Standard Max Hangs +
  Hangboard Repeaters, weighted pulls, Lock-Off Holds, heavier squat/hinge,
  antagonist push, Pinch Block Lift.
- **Climbing 3 – Power** (Advanced): Foot-On Campus → Campus Board Ladder,
  Offset Pull-Up, explosive hinge (KB swing / hang power clean), contrast
  lower pairs (squat+jump), High-Intensity Hangboard Repeaters, PE circuits.
- **Climbing 4 – Performance** (Advanced): peaking — max-hang maintenance,
  Crimp Isometrics, 4×4-style performance circuits, Cluster Lock-Off Hold,
  recovery/mobility day, genuine W4 taper.
- **Fingers add-on:** density hangs → repeaters → crimp isometric
  progressions, pinch, wrist pronation/supination.
- **Shoulders add-on:** face pulls, cuff ER/IR, Scapular Lock-Off, Ring
  Lock-Off stability, overhead control.

Sample Week 1 of Climbing 1 (approved level of detail) is in the session
notes format used by Hyrox Phase 1: `Section:` + `Tracking:` meta lines +
warm-up + coaching text, bilingual session names.

## Execution (when resumed)

1. Create 6 products via `/api/createProgram` + `/api/updateProgram` (store
   fields incl Season=1); NOT store-visible yet.
2. Seed 128 sessions via `/api/createWorkoutTemplate` (one call per session
   with `exercises[]`; map names → exerciseId from `/api/exercises`). Seed
   script rules apply: --dry counts first, chunked, 20s retry on Feishu
   1254607, re-runnable dedupe by (programId, week, day).
3. Kent reviews/edits in the builder.
4. Flip publicStoreVisible on the 4 mains + 2 add-ons; create new bundle
   "Climbing Season 1 – Complete (1–4)" ¥899 with bundleProgramIds = new PRs.
5. Delete old 6 SKUs (deleteRecord resource "program").
6. Verify store pages (web + mini program) and one test purchase→fulfilment
   on the twin (write battery covers the flow).
