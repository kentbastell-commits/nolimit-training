# Mobile session editor and workout preview follow-up

23 September 2026.

The exercise library retained desktop columns on narrow screens because later, more specific `!important` rules overrode its original mobile layout. Direct exercise editing used a separate one-column rule and passed earlier QA; entering through Add Exercise or Sections exposed the broken columns. Calendar editing deliberately uses the shared session editor even on phones, so the fix follows viewport CSS instead of relying on the separate mobile program-builder flag.

The phone library now uses one full-width panel at a time: Exercises, Sections, Session and Order. Search and adding multiple exercises stay in Exercises; choosing a section returns to the library; Session exposes full prescriptions and Edit fields; Order supports explicit up/down movement of linked blocks. The footer and close control remain reachable on short screens. Desktop keeps its multi-column layout. The workout preview header wraps to keep its close control visible at narrow widths.

At a glance retains the exercise list, circuits and prescriptions. Session notes and exercise setup/execution cues become collapsed, labelled disclosures with a one-line teaser. Expanding retains all text and separates Setup/Execution paragraphs. English and Chinese labels are supplied. Circuit headings use the current structured prescription counts rather than old draft log counts; exercise badges also use the shared prescription count.

Read-only inspection of Yanjun's Accessory assignment found three saved sets per exercise and session prose saying two rounds. That is a saved-content disagreement, not a stale preview. Kent was asked which prescription is intended. The UI patch does not silently change the athlete's program or rewrite the coaching notes.

Regression evidence is in `deliverables/mobile-session-fix-2026-09-23/`. Browser fixtures exercise calendar → View/Review → Edit in Builder → sections → add → edit fields → reorder → replace → save → reopen preview, at 360px Chromium and 390px WebKit, including a 520px-tall viewport. A 1440px desktop pass and the earlier field-selector regression flow also pass. No live workout saves occur during browser verification. WebKit automation is not a physical-iPhone or keyboard certification.
