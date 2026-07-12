# Client mobile experience audit

Date: 2026-07-13  
Scope: authenticated client portal at phone widths, including onboarding, Home,
Training, Programs, Profile, workout execution, forms/tests, history, and completion
overlays.

## Executive recommendation

Start tomorrow with the shared client overlay contract, then fix calendar touch
drag and workout execution. The current visual language is already coherent; the
highest-risk problems are navigation overlap, mobile viewport handling, accidental
gesture activation, and inconsistent close/save behavior.

Recommended implementation order:

1. Operational overlays and sheets
2. Training calendar touch behavior
3. Workout player completion/logging flow
4. Programs scheduling and destructive actions
5. Home tabs, Profile resilience, and bilingual sweep
6. Mobile regression coverage and final visual QA

## Audit method and confidence

This was a code, responsive-style, and test-coverage audit. The in-app browser
connection failed before it could open the local preview, so no screenshot or
computed-style inspection was possible. Findings backed by explicit code (for
example, the Programs sheet at `z-index: 60` below a nav at `z-index: 1200`) are
high confidence. Density and visual-balance recommendations should be confirmed
first thing tomorrow at 390px.

Existing strengths worth preserving:

- Four-destination bottom navigation already respects safe-area insets.
- Home, Calendar, Programs, and Profile use one paper/gold visual language.
- Calendar supports Week, Month, and Full views with clear category coding.
- The workout player already has a dedicated full-screen phone layout.
- Programs derive real not-started/in-progress/completed states.
- The Playwright suite already has an iPhone 13 project for portal tests.
- Reduced-motion handling exists for onboarding and celebrations.

## P0 — fix first

### 1. Establish one client overlay contract

Problem:

- `.ppModalScrim` in `PortalPrograms.css` uses `z-index: 60`, while the client
  bottom navigation uses `z-index: 1200`. The navigation can cover the edit-dates
  sheet and intercept its bottom controls.
- The Programs sheet uses `max-height: 82vh`, not dynamic viewport units.
- The main workout player, content-assignment modal, and exercise-history modal
  do not consistently expose `role="dialog"`, `aria-modal`, an accessible name,
  Escape behavior, or focus restoration.
- Mobile workout/history surfaces still contain `100vh` rules, which are fragile
  around expanding browser chrome and phone keyboards.

Implementation:

- Define one shared operational layer: `z-index >= 2000`, `100dvh`, safe-area
  padding, sticky header/footer, internal scroll body, and visible focus styles.
- Add labelled dialog semantics, Escape handling, initial focus, and focus return
  to the opener.
- Give close controls a minimum 44px target. Replace visible `x` text with a
  labelled icon control.
- Apply the contract to Programs edit dates, workout player, form/test submission,
  exercise history, and note-to-coach.

Acceptance criteria:

- No bottom navigation is visible or tappable over an operational overlay.
- Footer action remains visible with the keyboard open at 390px.
- Escape closes non-destructive overlays; closing an in-progress workout requires
  an explicit keep/discard decision.
- Focus returns to the card/button that opened the overlay.

### 2. Stop calendar scrolling from becoming drag-and-drop

Problem:

`startClientCalendarWorkoutTouch` attaches to the workout card immediately. Once
vertical movement exceeds 10px, `preventDefault()` begins and the card enters drag
mode. A normal scroll can therefore become a reschedule/reorder gesture. There is
no equally capable non-drag control for keyboard users or clients who struggle
with precision gestures.

Implementation:

- Start drag only from a dedicated handle after a short long-press threshold, or
  use an explicit "Arrange" mode.
- Keep the rest of the card `touch-action: pan-y` and tap-to-open.
- Add a simple Move/Reschedule sheet as the accessible alternative.
- Preserve the useful live day-preview card after drag has deliberately started.

Acceptance criteria:

- Vertical scrolling never moves a workout.
- Tap still opens a workout reliably.
- Drag, Move action, and keyboard path all produce the same order/date result.
- A moved workout gets clear success feedback and rolls back visibly on failure.

### 3. Validate the complete workout-execution loop at 390px

Problem:

- The rest timer is a fixed bottom widget while the active workout player also
  uses fixed bottom controls. These need a deliberate shared layout so one cannot
  hide logging or Finish actions.
- Current unit coverage only checks loading and At-a-Glance rendering. The mobile
  e2e stops after entering logging; it does not cover navigation between exercises,
  timer controls, validation, finish confirmation, error recovery, or completion.
- The main player lacks the same explicit dialog/close contract described above.

Implementation:

- Dock the timer above the active action bar or collapse it into a compact player
  header; never allow two independent bottom-fixed surfaces.
- Make current exercise/set, previous/next, Save/Finish, and timer state readable
  without scrolling to infer context.
- Preserve typed logs during accidental close/reopen and show a clear unsaved-state
  warning.
- Add long exercise names, unilateral work, circuits, timed WODs, videos, coaching
  notes, and keyboard-open states to the visual fixtures.

Acceptance criteria:

- Every input and primary action remains visible/reachable at 360–430px.
- Finish cannot be triggered accidentally and never loses entered logs.
- Timer controls do not cover inputs, navigation, or Finish.
- Success flows into the celebration and then returns to the correct calendar day.

## P1 — next pass

### 4. Make Program scheduling and restart behavior predictable

Problem:

- Edit-workout dates write immediately from each date input, while the visible
  `Done` button only closes the sheet. This can read like an unsaved draft form.
- Restart uses native `window.confirm`, which is visually inconsistent, difficult
  to test, and provides limited explanation for a destructive reset.
- The edit sheet does not declare `aria-modal="true"` and has no Escape/focus
  restoration behavior.

Implementation:

- Choose one model: draft all dates and use `Save changes`, or clearly label each
  row `Saved`/`Saving`/`Failed` when auto-saving. The draft-and-save model is
  recommended for predictable bulk changes.
- Replace native confirmation with a branded destructive confirmation sheet that
  states exactly what is reset and what is retained.
- Add a program-dashboard test covering edit dates, failure rollback, and restart
  cancellation.

### 5. Make Home sections resilient at narrow widths and in Chinese

Problem:

- Home renders three or four equal-width tab buttons at 13.5px. Four tabs plus
  longer Chinese labels can become cramped at 360–390px.
- Whole-page swipe changes sections, but there is no automated swipe test and no
  visible affordance explaining that gesture.
- Swipe handling should not steal gestures originating inside charts, horizontally
  scrollable controls, or form inputs.

Implementation:

- Use a compact scrollable/sticky tab rail or reduce labels deliberately at the
  360px breakpoint; keep tap as the primary discovery path.
- Add a subtle page indicator if swipe remains.
- Ignore swipe starts inside interactive/chart/scroll regions.
- Add English and Chinese long-label fixtures plus a touch-swipe regression test.

### 6. Harden Profile rows for real account data

Problem:

Profile settings are visually clean, but rows use left/right flex layout without
a phone-specific long-value rule. Long email addresses, package names, coach names,
or translated values can squeeze labels or overflow. Language and unit changes are
immediate but do not expose a strong saved/error state.

Implementation:

- Give values `min-width: 0`, `overflow-wrap: anywhere`, and a two-line limit where
  appropriate; stack only the rows that need it below 390px.
- Show lightweight saved/error feedback for language and weight-unit changes.
- Add long email/package and Chinese rendering tests.

### 7. Complete the client bilingual sweep

Problem:

Client surfaces mix `t()`, `paceZh` ternaries, and `localizeText()`. The form/test
submission modal still contains hardcoded English labels such as Weight, Reps,
Distance, Minutes, Seconds, Notes, and Select. Client component tests contain no
Chinese portal rendering cases.

Implementation:

- Route every client-visible label through the existing translation system while
  keeping persisted option values unchanged.
- Add one Chinese fixture per primary route and workout/form flow.
- Check truncation and wrapping, not only string presence.

## P2 — polish after the critical flows

### 8. Standardize loading, empty, error, and retry states

Home, Training, Programs, history, and form/test flows use different combinations
of plain paragraphs, cards, and silent fallbacks. Create one small state component
with optional retry and use it for route-level fetches. Retain the friendly existing
copy, but ensure a failed request is never indistinguishable from "no data yet".

### 9. Improve onboarding for short viewports and browser chrome

`PortalWelcome` still uses `min-height: 100vh`. Switch to `100dvh` with safe-area
padding and verify 360×640, increased text size, pending activation, error, and
returning-client states. Keep its current strong focus and reduced-motion behavior.

### 10. Verify celebration layouts beyond the happy portrait case

Celebrations correctly sit above all UI and honor reduced motion. Add small-height,
landscape, Chinese copy, and increased-text checks so the CTA cannot fall below the
viewport. Ensure completion state is already persisted before animation begins.

### 11. Reduce stylesheet ownership risk

Much of the final client styling lives in large, source-order-last blocks in
`App.css`, while route components also have co-located CSS. During implementation,
move new route-specific fixes into the route stylesheet and use page-root-scoped,
unique selectors. Verify computed styles after navigating through every lazy-loaded
client route; do not assume first-load and post-navigation CSS order are identical.

## Route-by-route scorecard

| Surface | Current state | Main follow-up | Priority | Existing coverage |
|---|---|---|---|---|
| Welcome / activation | Visually focused, safe controls | `100dvh`, short-height and error-state QA | P2 | Unit test; no full activation e2e |
| Home / Tasks | Strong greeting, readiness hero, task cards | Narrow/Chinese tab rail and swipe isolation | P1 | Basic unit + mobile e2e render |
| Home / Records | Functional PR/history surfaces | Long-data, history modal contract, empty/error states | P1 | Tab smoke only |
| Home / Metrics | Functional charts and selectors | Keyboard-open/long-label/chart gesture QA | P2 | Tab smoke only |
| Home / Workload | Real monitored-athlete data | Four-tab density and swipe test | P1 | Tab smoke only |
| Training / Week | Clear calendar and day cards | Deliberate drag activation and accessible Move | P0 | Basic unit + mobile render e2e |
| Training / Month | Strong dot-grid and selected-day glance | Same drag/reschedule safety; long-month labels | P0 | No interaction e2e |
| Training / Full | Useful agenda view | Scroll-vs-drag conflict; very long program QA | P0 | No interaction e2e |
| Workout player | Rich and mobile-specific | Timer/action collision, close/save safety, full completion test | P0 | Two unit tests + partial e2e |
| Forms / Tests | Supports detailed inputs | Dialog contract, dynamic viewport, bilingual labels | P0/P1 | Component unit only |
| My Programs list | Clear state-driven cards | Long names/translations and route transition focus | P2 | Good basic unit coverage |
| Program dashboard | Useful progress/next-session summary | Edit-date semantics and custom restart confirm | P1 | One dashboard unit case |
| Program guide | Compact overview/sessions switch | Long content, sticky CTA, back-navigation focus | P2 | No dedicated test |
| Program recap | Strong completion concept | Small-height/Chinese table and CTA QA | P2 | No dedicated test |
| Profile | Clean account/settings presentation | Long values and saved/error feedback | P1 | Basic portal render only |
| Exercise history | Useful date grouping | Dialog/Escape/focus contract and 100dvh | P0 | No modal interaction test |
| Celebration | Strong brand moment | Landscape/short-height/large-text verification | P2 | No dedicated client-flow e2e |

## Tomorrow's efficient implementation plan

### Pass A — shared operational layers

Files likely involved:

- `src/App.css`
- `src/PortalPrograms.tsx` / `src/PortalPrograms.css`
- `src/WorkoutPlayerModal.tsx` / `src/WorkoutPlayerModal.css`
- `src/ContentAssignmentModal.tsx` / `src/ContentAssignmentModal.css`
- `src/ExerciseHistoryModal.tsx` / `src/ExerciseHistoryModal.css`

Deliver one reusable behavior contract first, then apply it to all five surfaces.
Do not independently invent five modal implementations.

### Pass B — Training touch and workout completion

- Add drag handle/long-press or Arrange mode.
- Add accessible Move/Reschedule action.
- Dock timer relative to the player action bar.
- Add end-to-end completion coverage with mocked/safe non-production data.

### Pass C — Programs, Home, and Profile

- Replace immediate-date ambiguity and native restart confirmation.
- Harden Home tab rail/swipes for 360px and Chinese.
- Make Profile values wrap and expose preference save feedback.

### Pass D — bilingual and visual regression sweep

- Run the bilingual sweep over client-only files.
- Add Chinese fixtures.
- Capture/compare 360×800, 390×844, and 430×932 in light and dark system modes.
- Navigate Home → Training → Programs → Profile before each final screenshot so
  lazy stylesheet ordering is included in verification.

## Test additions required before declaring the client pass complete

- Portal e2e: explicit viewport assertions at 360, 390, and 430px.
- Portal e2e: Home swipe plus tap navigation.
- Portal e2e: Calendar scroll does not start drag; deliberate Move does.
- Portal e2e: Workout open → log → timer → finish → celebration → calendar return.
- Component: Programs edit-date save/failure and restart cancellation.
- Component: ContentAssignmentModal and ExerciseHistoryModal dialog/Escape behavior.
- Component: English/Chinese long-label fixtures for all four primary destinations.
- Accessibility: no focusable bottom-nav elements while a modal is open.
- Dark-system check: forced-light client surfaces keep readable headings/labels.

## Definition of done

- No horizontal page overflow from 360px upward.
- No operational action is covered by the bottom navigation or software keyboard.
- Every tap target is at least 44×44px for coarse pointers.
- Drag is optional; every reorder/reschedule action has a button/keyboard path.
- Every client overlay uses `100dvh`, safe areas, labelled dialog semantics, Escape,
  and focus restoration.
- Empty, loading, error, and retry states are distinguishable.
- English and Chinese both pass visual checks with realistic long content.
- The mobile Playwright suite covers the complete workout and program-management
  loops, not only route rendering.

