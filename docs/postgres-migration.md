# Postgres Migration Plan

Status: **Read side + schema re-sync + ALL WRITE PATHS complete on branch
`postgres-sprint`; every API handler now goes through the repository layer.**
Last updated 2026-07-17.

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
5. ✅ **READ SIDE COMPLETE — all 14 read endpoints converted + verified serving
   from Postgres (local):** exercises, clients, programs, coaches, subscriptions,
   athleteMetrics, productOrders, workouts, workoutHistory, workoutDetails,
   programTemplates, contentResponses, analytics, teams. Backend-agnostic
   filtering/aggregation/joins live in the repository (workoutHistory aggregation,
   analytics over clients+workouts, contentResponses answersJson expansion,
   programTemplates program match, teams). ETL now remaps team `positions` keys
   record_id→code. Verified e.g. teams positions `{"CL-0001":"Forwards"}`,
   analytics summary, workoutDetails join.

   ✅ **WRITE SIDE COMPLETE (2026-07-17) — all ~28 write handlers converted +
   verified on Postgres.** Write pattern everywhere: feishu impl verbatim
   (shared `createRecord`/`updateRecord`/`deleteRecord`/`batchCreateRecords`/
   `batchDeleteRecords` in feishu/client.ts) + pg impl (Drizzle) + repository
   dispatch (lazy pg import, cache invalidation moved here) + thin handler.
   Key: the frontend's record ids are business codes in pg mode, so pg writes
   locate rows by code — consistent with the reads.
   Converted: createClient/updateClient/recordLogin, upsertExercise,
   upsertCoach/Team/Subscription, createProductOrder/updateProductOrder,
   assignProgram, updateAssignedProgramDate, duplicateAssignedWorkout,
   setWorkoutReviewed, saveWorkoutLog (logs + exercise results + sRPE load),
   workoutComments/reviewWorkoutComment, createProgram/updateProgram/
   duplicateProgram, createWorkoutTemplate (+ set_prescriptions +
   exercise_alternates children), formTemplates + testTemplates full CRUD (new
   domains), notifications/checkIns/exerciseResults full CRUD (new domains),
   assignContent/updateContentAssignmentDate/contentAssignments (new domain),
   submitContentResponse (incl. the test→metric pipeline, extracted
   backend-agnostic into `server/db/metricPipeline.ts`), deleteRecord (generic
   whitelist + client cascade, new `records` domain), autoLoadProgram +
   activateDigitalOrder + coachingSignup (new `fulfillment` domain; coach
   notifications composed in the impls, fired by the thin handlers).
   pg-mode conventions locked in the process: pg code mints are
   collision-safe (PKs — timestamp/remint where Feishu used bare random),
   FK targets are validated before linking (Feishu just stores dead text; pg
   nulls the link and keeps the row), and `clients.program_id` (single FK vs
   Feishu multi-link) is set-when-empty, never overwritten.
   Verified 2026-07-17: `tsc -b --force` clean, vite build clean, all 557 unit
   tests pass UNMODIFIED (they pin the legacy wire responses), and a 59-check
   runtime battery ran every write through the repository layer against local
   Postgres (create→read-back→cleanup per domain; payment gate 402, autoload
   dedup, Epley metric calc, client cascade delete all exercised), plus an
   HTTP smoke through the booted Express server in pg mode.
   Remaining: translate-on-write + attachments→COS (both optional for cutover).

   Note: live test data has many workout_templates with empty Program ID links and
   a few junk values (e.g. reps "46244") — not ETL bugs, just test data.
   Convention: `id`/`recordId`/`clientRecordIds` return the business code on
   Postgres (no record_ids); consistent within a backend, flips together at cutover.
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
7. ✅ **Translate-on-write (2026-07-17)**: `server/db/translate.ts` — Tencent
   MT via a hand-rolled TC3-signed call (no SDK), 5s timeout, in-process
   cache, silent no-op without creds. Fire-and-forget hooks in the pg impls
   fill EMPTY mirror columns only (client notes→notes_en, workout
   notes→athlete_notes_en, form comments→client_comment_en, exercise
   name/cues→*_cn, program name/goal→*_cn, test library→*_cn). Key: CAM
   sub-user `tmt-api` (QcloudTMTFullAccess only) on the ENTERPRISE account;
   creds in all three .envs. Verified live on the HK twin. Gotcha: verifying
   with curl from Windows Git Bash mangles CJK in `-d` strings — test from
   the server with `--data-binary @file`.
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

## Phase 2 — cutover (UNBLOCKED 2026-07: mainland CVM exists)
The original blocker (nowhere to run production Postgres) is gone — the
Shanghai CVM (`ssh nolimit-cn`, 124.222.125.91) hosts Postgres locally at
first; TencentDB is a later upgrade when revenue justifies it.
1. Install PostgreSQL on the mainland CVM; nightly `pg_dump` off-box.
2. Run the **ETL once** into the production database (re-run fresh at DNS
   cutover to catch content authored during the beian wait).
3. Flip `DATA_BACKEND=postgres` on the CVM; smoke-test every flow on the raw IP.
4. At beian approval: final ETL re-run, DNS → Shanghai, HK stays as fallback.
5. Keep Feishu **read-only as backup** for ~2 weeks.

## Sprint log
- **2026-07-16 — branch reconciled onto `postgres-sprint`** (main had moved 403
  commits since the June pause). The `server/db` layer came over wholesale; the
  in-process cache layer main grew in the meantime now lives in the
  REPOSITORIES (same keys/TTLs/invalidation as the old handlers, shared by both
  backends); feishu impls picked up main's post-June behavior (programs
  session-type map + store fields, templates retry/never-cache-truncated +
  full prescription fields, workoutDetails raw caches + alternate exercises,
  workouts load metrics, logs Client Code, orders Payment Reference); pg impls
  compile with `TODO(schema-resync)` defaults for columns Feishu grew after
  June. `tsc -b` now type-checks `api/` + `server/` (caught 5 latent errors,
  incl. the formVideos cache that never hit). Verified: tsc + vite clean,
  api unit suite green, server boots in BOTH modes — Feishu mode returns
  graceful config errors locally, `DATA_BACKEND=postgres` serves the June
  dataset end-to-end (exercises, programs, clients, analytics, teams, orders,
  history).
- **2026-07-16 — schema re-synced to the LIVE base** (introspected all 36
  Feishu tables via `scripts/introspect-schema.mjs` on the HK server; diffed
  with `scripts/diff-schema.ts`). Added 5 new tables (workload_logs, reviews,
  enquiries, form_videos, test_library) + new columns (programs
  season/built-for/store-category/listing/bundles/compare-at, assigned_workouts
  session RPE/duration/load + coach reviewed, workout_logs client_code +
  actual RPE/RIR, product_orders fulfillment_status, check_ins 7 fields,
  test_templates category). Migration `0001_high_mojo.sql` applied locally;
  fresh ETL dump (2,760 rows / 29 tables) loaded; pg endpoints re-verified
  (store fields, session-type map via one selectDistinct, load metrics,
  per-clientCode history: 227 logs). 6 legacy no-env-var Feishu tables (Saved
  Programs, Progress Metrics, old Check-ins, Payment, Onboarding Workflow,
  Automations) intentionally NOT modeled — no handler reads them.
- **2026-07-17 — WRITE SPRINT COMPLETE.** All ~28 write handlers converted to
  the repository pattern (details under Phase 1 §5). Ran as a 10-agent parallel
  wave with strict per-domain file ownership; a session limit killed 8 agents
  mid-flight, and the sprint was finished solo from their on-disk partial work
  (the dying messages understated progress — most domains had 2 of 4 layers
  already written and correct). New shared pieces: batch write helpers in
  feishu/client.ts, `server/db/templateMeta.ts` (Coaching Notes parser),
  `server/db/metricPipeline.ts` (test→metric calculations), new domains
  records/fulfillment/contentAssignments/formTemplates/testTemplates/
  notifications/checkIns/exerciseResults/workoutLogs. Gate results: tsc clean,
  vite clean, 557/557 unit tests unmodified, 59/59 pg runtime checks, HTTP
  smoke in pg mode.
- **2026-07-17 (later) — REPOSITORY LAYER 100% COMPLETE.** The five newer CRUD
  handlers converted (enquiries+inPersonEnquiry, workloadLogs+saveWorkloadLog,
  reviews, formVideos, testLibrary) — no handler anywhere touches Feishu
  directly anymore (api/clientLog.ts is filesystem-only, no DB). Verified:
  tsc + vite clean, unit tests green unmodified, 17-check pg runtime battery
  (incl. workload same-day upsert-not-duplicate, review store-approval gate,
  test-library exercise-name join). Also shipped earlier same day: main merged
  to 666eae5 and DEPLOYED to HK production in Feishu mode — the post-cutover
  code now serves live traffic against Feishu, so behavior differences surface
  before the data swap.
- **2026-07-17 (evening) — HK STAGING TWIN LIVE.** PostgreSQL 15.18 installed
  on the HK box (dnf, OpenCloudOS 9.6; local-only, scram auth; DATABASE_URL
  appended to /opt/nolimit-training/.env — harmless to prod, pg is lazily
  imported). Migrations applied (30 tables), full ETL run ON the box (extract
  + load in one step since the Feishu creds live there; 927 workout templates,
  766 set prescriptions, 604 exercises, 234 workout logs). Second pm2 app
  **nolimit-training-pg** (PORT=3101, DATA_BACKEND=postgres, pm2 saved) +
  nginx block `nolimit-training-pg.conf` serving the same dist at
  **https://trainnolimit.com:8443** with the same cert. Verified from the box:
  vhost 200, /api/programs/exercises/workoutHistory/analytics all serving
  business-code ids from Postgres; production 443 untouched. External access
  pending ONE Kent action: open TCP 8443 in the Tencent Lighthouse firewall
  console. Ops notes: cross-border ssh drops during long Feishu-heavy runs —
  always `nohup … > /tmp/x.log &` long server jobs; re-run ETL any time
  (truncate+insert idempotent, /tmp/etl-hk.log). Twin data is THROWAWAY;
  Feishu remains source of truth until DNS cutover.
- **2026-07-17 (night) — SHANGHAI CUTOVER TARGET READY.** CN box bundle-
  deployed to 155a7b9 (GitHub blocked → git bundle, like kangfu), PostgreSQL
  **16.14** installed from the Tencent PGDG mirror
  (mirrors.cloud.tencent.com/postgresql/repos/apt — mainland-fast, and avoids
  Ubuntu 22.04's default PG14 which EOLs Nov 2026), migrations applied, full
  ETL run on-box (Feishu reachable from mainland, ~0.13s), pm2 app
  `nolimit-training-pg` PORT=3101 DATA_BACKEND=postgres saved. Verified:
  /api/programs + /api/analytics serve business-code ids from Postgres on
  127.0.0.1:3101. Not exposed externally (box stays dark until beian). ICP
  beian SUBMITTED same day (order 30178426682034412, Guangdong bureau,
  1-20 working days).
- **SPRINT COMPLETE 2026-07-17.** Everything is done except the cutover
  itself, which is gated on beian approval (submitted 2026-07-17, order
  30178426682034412). At approval: final ETL re-run on Shanghai, flip its
  main pm2 app to DATA_BACKEND=postgres, DNS → Shanghai, TLS via certbot,
  Feishu read-only for ~2 weeks. Media is already self-hosted under /uploads
  and synced to the CVM (COS optional later). Open decision: post-cutover
  admin UI (Drizzle Studio via tunnel demoed to Kent 2026-07-17 — likely
  sufficient, pending his verdict).

## Known future tech-debt (not part of this migration, but relevant to a sale)
`src/App.tsx` is one ~900KB monolithic component. Splitting it is the biggest
remaining sellability/maintainability item after the DB move. The repository
layer is step one of making the backend modular; the frontend split is a
separate effort.
