---
type: client
name:
tags:
  - client
  - intake
created: {{date}}
status: active
goal:
training_age:
days_per_week:
minutes_per_session:
equipment:
injuries:
medical_flags:
dislikes:
current_program:
---

# {{title}}

> [!info] How to use
> Fill in the Properties above and the sections below. When you're ready for a program, paste **this note** plus [[Program Rules]] into Claude and ask for a program. Keep this note as the client's living record — update it after check-ins.

> [!note] Allowed values (keep these consistent so the rules can act on them)
> - **goal:** `fat-loss` · `muscle-gain` · `strength` · `general-health` · `sport-performance`
> - **training_age:** `beginner` · `intermediate` · `advanced`
> - **equipment:** a list, e.g. `[full-gym]`, `[dumbbells, bands]`, `[bodyweight]`
> - **injuries:** a list of tags, e.g. `[left-knee-acl, shoulder-impingement]` (leave empty `[]` if none)

## Goal & context
_What does this client actually want, in their own words? Any deadline or event?_

## Training history
_Experience level, past programs, what worked and what they hated._

## Assessment / movement screen
_Mobility limits, imbalances, anything you observed in person._

## Injuries & contraindications
_Detail each flag from the `injuries` property — which movements to avoid, what's cleared, pain history._

## Preferences & logistics
_Schedule, equipment access, exercises they love or refuse, travel, time constraints._

## Coach notes
_Anything else I should weigh when writing the program._

## Program
_Link the generated program here once created, e.g._ `[[2026-07 - Client Name - Phase 1]]`
