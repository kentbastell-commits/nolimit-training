# Postgres Migration Plan

Status: **Phase 1 (prep) in progress.** Last updated 2026-06-19.

> **Milestone (2026-06-19): full pipeline verified end-to-end on a local
> Postgres 16.** Migration creates all 25 tables → ETL loads a copy of real
> Feishu data (756 rows; extract on the server via `--dump`, load locally via
> `--from`, so no credentials are copied) → the app running with
> `DATA_BACKEND=postgres` served the real `/api/exercises` endpoint with 452
> exercises straight from Postgres. The repository pattern works against
> Postgres with the frontend unchanged.

The goal is to move the app's database off Feishu (Lark) Base onto PostgreSQL —
once — in a way that scales to heavy traffic and leaves a clean, conventional,
sellable codebase. This doc is the single source of truth for the migration.

## Why we're doing this
Feishu Base is a no-code backend: rate-limited, single-region, API-heavy, and
not something an acquirer can own or operate. Postgres is the industry-standard
engine that scales effectively without limit (read replicas, partitioning,
pooling) and is exactly what raises valuation and survives due diligence.

## The durability guarantee ("never migrate again")
The thing that prevents a future re-migration is **not** the ORM — it's the
**repository layer**. Every API handler must call functions in `server/db/`
instead of touching the database directly. Then query tools, caching, or even
the engine itself can change by editing one folder, never the 45 endpoints.

## Locked decisions
| Topic | Decision | Why |
|---|---|---|
| Engine | **PostgreSQL 16** | Endgame engine; scales indefinitely. |
| Query layer | **Drizzle ORM** behind a repository layer | Compiles to plain parameterized SQL, no separate query engine → predictable latency at high traffic, pooler-friendly. Readable by any team. (Kysely is the equal-quality pure-SQL alternative; avoid Prisma at very high traffic.) |
| Migrations | **drizzle-kit** SQL migration files (committed) | Versioned, reviewable, standard. |
| Primary keys | Existing **business codes** (`CL-0001`, `EX-…`) as text PKs | Already used in URLs/links; zero frontend or ETL remapping. |
| Timestamps | **bigint epoch-ms** | Matches all current frontend date parsing (no App.tsx churn). |
| Multi-select | **text[]** (equipment, tags, categories) | Simple, queryable. Normalize later only if filtering demands it. |
| Variable structures | **jsonb** (set prescriptions, form answers, team positions) | Flexible without schema thrash. |
| Money | **numeric(10,2)**; measured values **double precision** | Exact money; convenient floats for metrics. |
| Chinese / `*_EN` fields | **Translate-on-write API** (replaces Feishu AI formula) | Auto-fills CN name / EN notes on save. See below. |

## Local development (unblocked — works today, no HK account needed)
```bash
docker compose up -d                 # local Postgres + Adminer
# add to .env:
#   DATABASE_URL=postgres://nolimit:nolimit_dev@localhost:5432/nolimit
npm run db:generate                  # SQL migration from schema.ts
npm run db:migrate                   # apply to local Postgres
npm run db:studio                    # browse the schema/data
```
Adminer DB browser: http://localhost:8080

## Files
- `docker-compose.yml` — local Postgres 16 + Adminer.
- `drizzle.config.ts` — drizzle-kit config (reads `DATABASE_URL`).
- `server/db/schema.ts` — table definitions (core domain done; rest below).
- `server/db/client.ts` — pooled connection + drizzle instance.
- `server/db/migrations/` — generated SQL (created by `db:generate`).

## Schema coverage
**Complete — all 25 tables, reconciled against the LIVE Feishu tables**
(introspected 2026-06-19, so columns mirror real data not the old reference doc):
coaches, exercises, programs, clients, teams, team_members, workout_templates,
**set_prescriptions**, **exercise_alternates**, assigned_workouts, workout_logs,
exercise_results, athlete_metrics, subscriptions, product_orders, check_ins,
form_templates, form_questions, assigned_forms, form_responses, test_templates,
test_items, assigned_tests, test_results, notifications.

What the introspection corrected vs the first draft:
- **set_prescriptions** is its own Feishu table (Template ID, Set Number, Reps,
  Load, Percent, Percent MAS, Intensity Mode/Value, Tempo, Rest) — modeled as a
  table linked to `workout_templates`, not a jsonb guess. *(Resolves the old TODO.)*
- **exercise_alternates** is its own table (substitute exercises per template row).
- **workout_templates** carries ~20 builder fields (Session Type/Goal, Target
  Source/Metric/Percent/Adjustment, Auto/Display Target, Section Name, Exercise
  Label, Group Type/Name, Tracking Type, Is Unilateral/Accessory, Accessory
  Parent/Color) — all added.
- **athlete_metrics** uses Metric Type / Metric Value / Valid From / Valid Until
  / Source Test ID (not the assumed metricKind/recordedAt).
- **check_ins** uses Submitted Date / Mood / Coaches Notes / Reviewed Date.
- **clients** also carries denormalized perf fields (MAS, HR Max, Resting HR,
  Zone 5K/10K/Threshold/Easy %) — added.
- **test_items / test_results** carry the test→metric pipeline fields
  (Creates Metric, Calculation Method, Metric Name/Unit, Input Unit).

**Intentionally dropped:** Feishu `UnknownName*` junk columns, `SourceID`
(import bookkeeping), link-mirror columns, `Automations` (Feishu-only). Body
Metrics (`FEISHU_BODY_METRICS_TABLE_ID`) stays un-modeled per the China-PIPL
deferral.

> TODO before ETL: the **coaches** and **product_orders** Feishu table-IDs did
> not surface in the server `.env` value-scan (only 23 of the expected tables
> did). Confirm how `coaches.ts` / `productOrders.ts` resolve their table IDs
> and wire them into the ETL. (Both tables exist and are kept in the schema.)

## Phase 1 — readiness work (NOT blocked by the HK license)
1. ✅ Toolchain + local Postgres + Drizzle scaffolding.
2. ✅ Core schema draft.
3. ✅ All 25 tables, reconciled against live Feishu data; clean baseline migration.
4. 🟡 **Repository layer** — pattern established + first slice done (`exercises`).
   Structure (per domain): `repositories/<d>.ts` (the only thing handlers import;
   dispatches on `DATA_BACKEND`, lazy-loads the pg impl so Feishu never pulls in
   pg/drizzle) → `feishu/<d>.ts` (logic moved verbatim from the handler) +
   `pg/<d>.ts` (Drizzle, returns the same DTO from `dto.ts`). Switch via
   `DATA_BACKEND=feishu|postgres` (default feishu). Shared cached-token Feishu
   client in `feishu/client.ts`. Build typechecks the whole chain (handler import
   pulls it into `tsc`). Remaining domains follow this template mechanically.
5. 🟡 Refactor the 45 `api/*.ts` handlers to call repositories — `exercises.ts`
   done as the reference (now a thin handler); rest pending.
6. ✅ **ETL script** built + cleaned (`server/db/etl/`): extract → transform
   (link→FK resolution) → load. **Dry-run validated against live data
   2026-06-19**: all 25 tables + derived team_members, **0 unmapped fields**,
   every client/program/exercise reference resolves to a business code. Load
   step pending a Postgres target. Cleanup rules applied:
   - **Reference resolution handles all three Feishu storage styles**: structured
     link, record-id-as-plain-text (e.g. athlete_metrics/form/test "Client ID"),
     and the business code already in text. (`resolveOne` in transform.ts.)
   - **Coach references relaxed to plain text** (stored as names like "Kent
     Bastell", not codes) — no FK to `coaches`.
   - **Translation-formula junk scrubbed to NULL** (Feishu AI CN/EN placeholders
     like "请提供需要翻译…" / "Please provide … translated"). (`TRANSLATION_JUNK`.)
   - **Blank seed rows skipped** (rows whose business-code PK field is empty) —
     dropped Feishu's empty placeholder rows across coaches, check_ins,
     exercise_results, notifications, assigned_forms, etc.

   ✅ Load implemented + **run against local Postgres** (`--from` a dump):
   loaded exercises 452, workout_templates 103, workout_logs 110, athlete_metrics
   13, test_results 19, etc. FK-orphan safety nulls references whose target isn't
   present (8 nulled in the test data) so a constraint can't break the load.
   `--dump`/`--from` split keeps extraction (Feishu creds) and loading (Postgres)
   on separate machines — also how the real cutover runs.
7. ⬜ **Translate-on-write**: on create/update of a record with CN/EN fields,
   call a translation API (Tencent MT or DeepL) to fill `*_cn` / `*_en`.
   Replaces the Feishu AI formula. Cache results; cost is per new record.
8. ⬜ **Attachments → object storage**: exercise thumbnails/videos (and future
   photos) move to Tencent COS + CDN; Postgres stores only the URL.
9. ⬜ Seed/integration tests against local Postgres.

## Heavy-traffic architecture (designed in from the start)
- **Indexes**: FKs + common filters indexed in `schema.ts` (client+date,
  category, status, etc.).
- **Connection pooling**: `pg.Pool` in `client.ts`; **PgBouncer** in front in prod.
- **Caching**: Redis for hot read-only data (exercise library, programs).
- **Stateless API**: the Express app is already stateless → scale horizontally
  behind a load balancer.
- **Read replicas / partitioning**: available later if needed (workout_logs is
  the table that will grow fastest — candidate for time partitioning).
- **CDN** for all static + media assets.

## Phase 2 — cutover (BLOCKED on the HK company license)
1. Open Tencent Cloud **business** account under the HK holding company.
2. Provision **TencentDB for PostgreSQL** + a new Lighthouse server (HK region).
3. `git clone` the code (already portable — no Vercel lock-in).
4. Run the **ETL once** into the production database.
5. Flip `DATA_BACKEND=postgres`; smoke-test every flow.
6. Keep Feishu **read-only as backup** for ~2 weeks.
7. Drop Vercel; cancel the personal Tencent server.

## Known future tech-debt (not part of this migration, but relevant to a sale)
`src/App.tsx` is one ~900KB monolithic component. Splitting it is the biggest
remaining sellability/maintainability item after the DB move. The repository
layer is step one of making the backend modular; the frontend split is a
separate effort.
