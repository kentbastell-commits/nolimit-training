---
name: seed-feishu
description: Generate large batches of bilingual clinical/training content (exercises, injuries, clinical tests, protocols) with parallel agents and seed them into a Feishu table safely — validated, deduped, re-runnable, with dry-run. Use when Kent asks to "populate", "fill", or "add N entries to" any library, or to extend an existing one.
---

# Seed Feishu content library

The pipeline that built the kangfu injury library (226), clinical tests, and the
517-exercise library. Three phases: **spec → generate (parallel agents) → seed
(validated script)**. Never skip the spec; it is what makes 10 agents produce one
consistent library instead of ten styles.

## Phase 1 — Spec (one file, before any generation)

Write `<scratchpad>/<library>-spec.md` containing, exactly:

1. **The JSON schema** for one entry — every field, with a fully-worked example
   entry showing the expected quality (bilingual, clinical register). Arrays for
   anything that becomes numbered/bulleted text.
2. **Closed vocabularies** — the exact strings allowed for every select/multiselect
   field (categories, labels, equipment, difficulty). Agents must not invent
   values: Feishu auto-creates select options on write, so one creative agent
   pollutes the option list permanently.
3. **Quality bar** — bilingual rule (natural clinical Chinese first, concise
   English; never literal translation), safety/watchout requirements, what counts
   as filler (reject passive-only/woo content).
4. **Cross-reference rules** — if entries link to each other (progressions,
   linked tests), links are exact `name` values of other entries; chains within an
   agent's own file; a short list of canonical shared names other files may
   reference.
5. **Output contract** — one JSON array per agent, UTF-8, no markdown fences,
   written to an exact scratchpad path; final agent message is a one-line count.

Before generating, verify the target Feishu table's real fields and types
(`GET /fields`, using the repo's `.env` creds) — the spec must map 1:1 onto
existing columns. Create missing columns additively first (MultiSelect = type 4,
Text = 1, URL = 15); never rename or delete existing ones without asking Kent.

## Phase 2 — Generate (parallel agents)

- Partition by domain (body region, category) with **explicit ownership
  boundaries** in each prompt ("do NOT create squat variants — the strength agent
  owns those"), or duplicates will burn 5-10% of the output.
- Per-agent size: ≤ ~60 rich bilingual entries. Tell agents to **write their file
  in parts** (write part 1, extend for part 2) so a mid-run death loses nothing —
  agent crashes are normal at this scale; partial files are the recovery mechanism.
- Each prompt: "Read <spec path> and follow it EXACTLY" + domain assignment +
  condition/topic coverage list + required chains + ownership boundaries + exact
  output path + count.
- On agent failures: inventory what landed (`ls` + JSON-parse each file), then run
  ONE top-up agent for the gaps — give it the missing cross-referenced names
  explicitly and make it read the existing files first to avoid duplicates.

## Phase 3 — Seed script

Model on `kangfu-zhuanjia/scripts/seedExerciseLibrary.mjs`. Required properties —
all of them, they are what make re-running safe:

1. Loads `.env` itself; reads all `<prefix>-*.json` from the scratchpad; tolerates
   BOM/markdown fences.
2. **Validates** every entry against the spec's required fields; logs and skips
   invalid ones (never aborts the batch for one bad entry).
3. **Dedupes** across files by normalized name (lowercase, alphanumeric only —
   this also matches "中文名 English Name" combined fields against plain English
   names) — first wins, duplicates logged.
4. **Checks cross-references** resolve; unresolved ones are warnings, not errors.
5. **Skips what's already live** (fetch existing records first) — this is what
   makes the script re-runnable after partial failures.
6. `--dry` mode: full validation + per-file counts + zero writes. **Always run
   `--dry` and read its output before the real run.**
7. Writes via `batch_create` in chunks of ≤100 with ~400ms pauses; on a failed
   batch, falls back to one-by-one so a single bad record can't sink 99 good ones;
   checks `code !== 0` on every response (Feishu 200s its errors).
8. Treats `code 1254607` ("Data not ready") as transient: those records simply
   remain unseeded and the script is re-run 20s later.

## Phase 4 — Verify in Feishu (not just script exit codes)

Pull the table back through the Feishu API and assert, printing each:

- [ ] total record count matches expected (seeded + pre-existing)
- [ ] zero records missing required fields (labels, difficulty, cues, CN fields)
- [ ] select/multiselect option lists contain ONLY spec vocabulary (list strays)
- [ ] cross-references: zero unresolved (or the known accepted list)
- [ ] spot-read 2-3 full records for content quality (bilingual register, safety notes)

Then check the live API serves the new data (mind the 10-min cache — use the
handler's `debug=1` bypass or wait it out), fix any pre-existing records the new
fields left behind (backfill script), and report to Kent with counts per category
and 1-2 sample entries. If UI changes are needed to surface new fields (filters,
chips), that's a separate deliverable — flag it, don't bury it.
