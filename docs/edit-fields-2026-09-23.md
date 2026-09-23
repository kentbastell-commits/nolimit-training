# Edit fields access restored

23 September 2026. Follow-up to mobile coaching release C.

The shared prescription editor could display custom fields but did not expose the selector. Coaches had to discover the older three-dot exercise menu; the mobile program-day editor did not expose that route.

Every strength prescription table now has a visible **Edit fields** button above its sets. The existing exercise menu uses the same label and opens the same selector. The selector offers weight, reps, time/hold, distance, RPE and RIR, with one to three selected fields, their column order, and guidance on replacing a field when three are selected. The last field cannot be removed accidentally. Cardio keeps its existing time/distance controls.

The selector and strength field labels are translated in English and Chinese. The selector uses the shared accessible overlay with focus return and Escape handling. Closing it keeps changes in the current workout draft; the coach still saves the session or program to publish. Changing field visibility preserves the underlying set values.

Browser fixture checks at 360px and 1440px switch reps to timed holds and back, verify retained values, close with Escape without losing the workout editor, and inspect the saved isolated-session payload. The mobile program-day editor also exposes the selector. Unit coverage checks selection limits and Chinese labels. Production verification is read-only; no athlete programs are modified during QA. Evidence is in `deliverables/edit-fields-2026-09-23/`.
