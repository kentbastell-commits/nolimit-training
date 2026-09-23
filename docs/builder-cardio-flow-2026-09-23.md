# Cardio editing in the workout builder

Kent reported tiny heart-rate fields, duplicate Bike entries and a blank editor after deleting one.

## Reproduction and changes

- A WebKit phone check reproduced two Bike entries from a rapid double tap. A single add path did not duplicate a row; the library had no immediate visible result on a phone. Picks now ignore repeated activation of the same choice within 700 ms. On phones, a successful add opens that exercise's prescription immediately; desktop keeps the library open and shows how many copies are in the session. Coaches can still deliberately duplicate an exercise or return to the library to add it again.
- Deleting the open last row reproduced an empty focused editor. Deleting any row while that editor is open now returns to the session instead of retaining an invalid or shifted index.
- HR inputs measured 16 × 30 px at 390 px viewport width. Cardio duration and intensity now occupy full rows on phones; HR inputs have 60 px minimum width, 44 px minimum height and 16 px text. The method selector is above the range. Focused-editor footer margins no longer cause horizontal overflow.
- New cardio entries start with one interval and blank duration/rest targets rather than strength defaults of three sets and eight repetitions. Deliberately adding to a circuit still respects its prescribed rounds. Existing prescriptions are untouched. Lifting-only controls are hidden on time/distance prescriptions.
- New field labels and feedback are translated into English and Chinese.

## Verification

Browser checks use an isolated copy of the Accessory assignment and intercept writes locally. Covered rapid add, duration/distance switching, HR entry, adding/removing a set, intentional duplication, deleting the open duplicate, replacing an exercise, saving, previewing and reopening the saved prescription. Core exercises retain two sets and the session notes are preserved.

Local results and screenshots: `deliverables/builder-cardio-2026-09-23/`. Phone Chromium at 360 px, WebKit at 390 px (including a 520 px high viewport), and desktop Chromium at 1440 px are checked. These are browser emulations, not physical iPhone/keyboard tests. Component regressions cover phone and desktop rapid activation and deletion. Production release results are recorded separately in the same deliverables directory.
