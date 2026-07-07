---
name: extract-approach
description: After solving a non-trivial problem, distill the approach into a learnings note and file it where the next session will actually find it (CLAUDE.md rule, skill update, memory, or repo doc). Run before reporting a solved problem as done — a solution without its learnings note is unfinished work.
---

# Extract approach

Turns a solved problem into a durable improvement in ≤5 minutes. The output is
never a loose notes file — it is an edit to the ONE place a future session would
look first.

## Does this problem qualify?

Run this skill when ANY of these is true:

- a wrong assumption cost real time (deployed to the wrong target, wrong API
  convention, wrong root cause chased)
- an external system revealed a non-obvious behavior (Feishu quirk, DeepSeek
  behavior, PM2/server surprise, i18next convention)
- you invented a procedure that worked and would be repeated (a pipeline, a
  recovery pattern, a verification sequence)
- a bug's *class* is likely to recur even though this instance is fixed

Skip it (silently, no note) when the fix was mechanical and self-evidently
findable next time: a typo, a missing import, a one-line logic slip with an
obvious failure message. Filing noise is worse than filing nothing.

## Write the note — 6 lines maximum

```
Problem: <one line — the symptom as it appeared>
Root cause / key insight: <the non-obvious fact that unlocked it>
What worked: <the approach, concretely, imperative voice>
Dead ends: <what NOT to try again, if any — else omit>
Recurs when: <the trigger condition a future session can recognize>
Filed to: <destination from the routing table>
```

Write it tight enough that a weaker model reading only this note could avoid the
whole detour.

## Route it — exactly one primary destination

| The learning is... | File it as |
|---|---|
| A rule of behavior in these repos ("always X before Y", a new failure mode) | New entry in CLAUDE.md **"Named mistakes"** list (give it a name) or the relevant checklist — keep the entry to 2-3 lines |
| A change to a procedure that already has a skill (deploy, bilingual-sweep, seed-feishu, this one) | Edit that SKILL.md — fix the step that let the problem happen |
| A repeatable procedure with no home yet, likely needed ≥3 more times | Propose a new skill to Kent (one line: name + what it saves); write it if he agrees or if he has standing approval |
| A fact about external systems/infra (server layout, Feishu behavior, account state, credentials location) | Memory file (`reference_*` / `project_*`) + one-line pointer in MEMORY.md; update the existing memory if one covers the topic |
| True only for the current feature branch / this week | Nowhere permanent — put it in the commit message body and move on |

Rules: one primary destination, no duplicates (a pointer elsewhere is fine, a
copy is not). Prefer EDITING an existing entry over adding a near-duplicate —
if CLAUDE.md already names the mistake, sharpen that entry instead of appending
a new one. CLAUDE.md and SKILL.md edits get committed with the work.

## Close the loop

End the problem's final report to Kent with one line:

> Learnings filed: <where> — <the one-sentence insight>.

If the learning contradicts something already written (a stale memory, an
outdated CLAUDE.md rule), fix the stale entry in the same pass — that's the
whole point.
