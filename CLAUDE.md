# CLAUDE.md — Operating manual for Kent's coaching platforms

Kent is a fitness coach and founder, not a programmer. He reads outcomes, not diffs.
Deliver working, verified software; explain in plain language; never hand him a list
of options when a recommendation will do. He often runs several AI agents on the
same repo at once — check `git status` before editing, stay off files another agent
is actively changing, and keep your diffs surgical in shared files. When you must fix
something inside a file another session has uncommitted WIP in, don't trust `git add
-p` alone on a big file — nearby unrelated hunks merge under its default context and
you'll stage a mix. Instead: `git show HEAD:<file> > base`, copy to `mine`, reapply
your OWN edits onto `mine` (only works if your target text is unchanged since HEAD —
if it lives inside code the other session added and hasn't committed yet, leave that
one edit uncommitted in the working tree and move on), `git diff --no-index base mine`,
fix the diff's path headers to point at the real file, then `git apply --cached
--check` and `git apply --cached` to stage cleanly without touching the working tree.

## Exercise footage

Before touching exercise footage, read `docs/footage-reframing-runbook.md` in full.
It is the canonical record of the approved 9:16 and 16:9 framing, audio, output,
and QA workflow. Follow its future-edit decision process and mandatory full-duration
QA gates: measure the complete technique-critical motion envelope, render a working
candidate, and inspect movement extremes before replacing a master. Do not substitute
a generic center crop or spend paid reframe credits unless Kent explicitly authorizes
that run.

## The two products

| | nolimit-training (this repo) | kangfu-zhuanjia (`c:\Users\kentb\kangfu-zhuanjia`) |
|---|---|---|
| What | Coaching platform (climbing/strength) | 康复专家 — physio clinic app, forked 2026-07 |
| Live | trainnolimit.com | kangfu.trainnolimit.com |
| Server dir | `/opt/nolimit-training` | `/opt/kangfu-zhuanjia` |
| PM2 app | `nolimit-training` | `kangfu-zhuanjia` |
| Server git origin | GitHub (pull works after push) | **`/tmp/kangfu.bundle` — a GitHub push deploys NOTHING; you must scp a fresh bundle first** |
| Vocabulary | coach / client / workout | 治疗师 therapist / 患者 patient / 诊疗 session |

Both run on the same Tencent HK box (ssh alias `nolimit`, key `~/.ssh/nolimit_deploy`).
**Hard rule (PIPL):** the two products use completely separate Feishu bases and app
credentials. Never point one repo's `.env` at the other's base, never copy patient
data between them, never "borrow" a table ID across products.

## Architecture (same in both repos)

- **Frontend**: React 19 + TS + Vite SPA. `src/App.tsx` is a ~19k-line monolith by
  design; leaf pages/modals are extracted to their own `.tsx` + co-located `.css`
  files with props threaded from App.tsx (`{ [key: string]: any }` prop bags).
  Don't refactor the monolith; follow the extraction pattern only when adding a
  genuinely new page.
- **Backend**: `api/*.ts` are Vercel-style handlers, served self-hosted by
  `server/index.ts` (Express). **A new handler does nothing until you import it and
  add it to the `handlers` map in `server/index.ts`.**
- **Auth model (nolimit): there is no session layer for athlete-facing
  endpoints.** A client's code (`CL-0001` style, sequential, guessable) IS the
  athlete portal's entire credential everywhere — no password, no token. Every
  athlete-facing write trusts whatever `clientId`/`clientCode` is in the
  request body with no proof the caller actually is that client (a 2026-07-30
  full-API audit found and fixed the worst cases — an unauthenticated
  full-content paywall bypass on `programs`/`programTemplates`/
  `workoutDetails`, an unrestricted-field `updateClient`, several IDOR writes —
  but `shiftAssignedWorkouts` and `coachingSignup`'s claim stage still trust a
  bare client-supplied code with no ownership check, because that's this
  systemic gap, not a one-off bug). Coach-side protection is `coachKeyOk()` +
  `COACH_ONLY_HANDLERS` in `api/_coachAuth.ts` (off until `COACH_ACCESS_KEY` is
  set at pilot launch) — but a handler the athlete portal ALSO needs (dual-use,
  like `programTemplates` or `updateClient`) can't just be coach-gated; it
  needs a field allowlist or an entitlement check (see
  `clientHasProgramAccess` in `server/db/pg/clients.ts` for the pattern) that
  still works with `coachKeyOk()` unset. Before excluding any handler from
  `COACH_ONLY_HANDLERS` "because the portal needs it," grep every real call
  site (`src/App.tsx`) — a stale, unverified comment claiming that is exactly
  how `subscriptions`/`teams` shipped unauthenticated for an unknown period.
  A real fix is session tokens issued at portal entry; until that exists,
  every new athlete-facing write/read handler should be reviewed against this
  gap specifically, not assumed safe by precedent.
- **Database: nolimit is Postgres ONLY** (live 2026-07-21; the Feishu backend was
  deleted 2026-07-26). DB `nolimit_prod` on the HK box. There is no
  `DATA_BACKEND` switch and no `server/db/feishu/` tree any more — the
  repository layer (`server/db/repositories/`) calls `server/db/pg/` directly.
  **kangfu is still Feishu Bitable**, so Feishu rules below still apply THERE.
  Kept in nolimit: `server/db/etl/` plus `api/_token.ts` / `_pagination.ts` (the
  migration path and the verified record of live Feishu column names), and
  `docs/feishu-base-reference.md` as history. The Feishu base is a frozen
  read-only mirror — never write to it expecting effects.
- **Test days in programs (nolimit, since 2026-08-02)**: a placed test is ONE
  `workout_templates` row with `test_template_id` set and NO exercise fields —
  so never assume every template row has an exercise, and never validate
  "session must have exercises" without excepting `testTemplateId` (both save
  handlers already do). On assign, every `/api/assignProgram` path splits these
  into `assigned_tests` rows (the content-assignments stream), not assigned
  workouts — a new assign path must carry `testTemplateId` through or test days
  silently vanish for that path.
- **Dates (nolimit pg)**: `scheduled_date` and friends are epoch-ms meaning
  "the start of that day in China time". Convert a `YYYY-MM-DD` string with
  `dayStartMs()` from `server/db/pg/_util.ts` — never `new Date(str)` (UTC
  midnight) or ``new Date(`${str}T00:00:00`)`` (server-local midnight). Prod is
  UTC+8, so the two disagree by 8h and a comparison across them silently drops
  rows. `epochToDate()` is the inverse.
- **Tests**: handler tests run against a REAL local Postgres (`nolimit_test`),
  not mocks — `node --env-file=.env scripts/setupTestDb.mjs` once, AND again
  after every new migration (a handful of files failing on "column does not
  exist" right after a schema change means exactly this, not broken tests),
  then `npx vitest run --project pg`. They truncate every table between cases and
  refuse any non-localhost host, so they can never touch the dev DB or prod.
- **Cache**: `api/_cache.ts` in-process cache makes reads fast. Every writer MUST
  call `invalidateCache(...)` for every cache key its write affects, or coaches see
  stale data for up to 10 minutes.
- **i18n**: react-i18next, EN + 中文. Hand keys live in `src/i18n.ts`; bulk keys in
  `src/i18nGenerated.ts` built by `scripts/mergeI18nKeys.mjs` (kangfu). Therapist UI
  has a language toggle (localStorage `kangfu-ui-language`); the patient portal
  follows the patient's stored preference.
- **AI features (kangfu)**: DeepSeek via `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL` on the
  server only. All AI calls are best-effort: a failure must never block a save.
- **Tests**: Playwright e2e in `tests/` (`npm run test:e2e`). `postgres-migration`
  branch holds the future Drizzle/repository-layer work — don't merge it casually.

## Named mistakes a model will make here, and the rule that prevents each

1. **The ghost deploy** — pushing kangfu to GitHub and calling it deployed. The
   server's origin is a bundle file. Rule: kangfu deploy = bundle → scp → ssh pull →
   build → pm2 restart. Verify live afterwards or it didn't happen.
2. **The masked build break** — local incremental `tsc` passes, server `tsc -b`
   fails on unused vars. Rule: run `npx tsc -b --force` before every commit you
   intend to ship.
3. **The empty-field write bomb** (kangfu only — nolimit has no Feishu writers) — sending `""` to a Feishu Number/URL column fails
   the ENTIRE record write. Rule: omit empty values from `fields`; never send them.
4. **The link-field string** (kangfu only) — writing a code like `"CL-1042"` to a DuplexLink
   column. Rule: DuplexLink fields take `[record_id]` arrays; always check the write
   response body, Feishu often returns 200 with `code != 0`.
5. **The stale cache** — adding a write path without invalidation. Rule: grep how
   sibling writers invalidate (`invalidateCache`) and mirror it, same keys.
   Under the 2-fork setup invalidation is per-process; SOLVED 2026-08-03 by
   the Postgres LISTEN/NOTIFY bus (`server/db/cacheBus.ts`, started in
   server/index.ts): invalidateCache broadcasts, each fork LISTENs and drops
   the prefix locally. It's best-effort — a downed bus degrades to
   TTL-staleness — so if "my write didn't take" ghosts reappear, check the
   bus's LISTEN connection before anything else, and never remove the bus
   start from server/index.ts.
6. **The hardcoded string** — new UI text in English only, or "English 中文" jammed
   in one string. Rule: every user-visible string goes through `t()` with both an
   `en` and a `zh` key. Chinese must be natural clinical Chinese (患者 not 客户,
   治疗师 not 教练), never literal translation.
7. **The translated logic value** — translating `<option>` values or status strings
   that are compared with `===` or persisted to Feishu. Rule: translate the
   *displayed* text only; the `value=`/stored constant never changes. If a string is
   both displayed and persisted (e.g. SECTION_PRESETS titles baked into saved SOAP
   text, SCAN_SECTIONS stored as image category), add a render-time label map and
   leave the constant alone.
8. **The hand-edited generated file** — editing `src/i18nGenerated.ts` directly.
   Rule: edit the scratchpad `i18n-*.json` sources and re-run `mergeI18nKeys.mjs`.
9. **The fatal transient** (kangfu + the nolimit ETL) — treating Feishu `code 1254607` ("Data not ready") as a
   real failure. Rule: it's throttling after heavy writes; wait ~20s and re-run.
   Seed scripts must be re-runnable so retry is always safe.
10. **The wrong-repo commit** — the shell cwd silently resets to nolimit-training
    between commands. Rule: `cd` explicitly in the same command as any
    `git add`/`git commit`, and read the `git status` output before committing.
    Never `git add -A` without checking what's untracked (Kent keeps non-code
    directories like `coaching-vault/` inside repos).
11. **The shotgun kill** — `taskkill /IM node.exe` murders every Node process,
    including other agents' dev servers. Rule: kill by PID or port only.
12. **The plural that never fires** — i18next here is v26 (JSON v4): plural keys are
    `key_one`/`key_other`; `key_plural` silently never matches; Chinese needs only
    `_other`.
13. **The cross-base leak** — using nolimit `.env` values in kangfu code or vice
    versa "because it's the same structure". Rule: creds never cross repos (PIPL).
14. **The blocking AI call** — making a save await a translation/draft with no
    guard. Rule: AI calls get a timeout + try/catch and the save proceeds without
    the AI result on any failure.
15. **The phantom suite failure** — every vitest file fails at once with nonsense
    errors ("failed to find the current suite", `undefined (reading 'config')`)
    while a single file passes: that's memory exhaustion, not broken tests — and
    it is NOT reliably predicted by free RAM: it fired at `--maxWorkers=2`
    with 1.2GB free once and again with 3.5GB free, so "check free RAM" is a
    weak signal. Rule: single file passes → go straight to `--maxWorkers=1`
    (full suite ≈2min). Never touch test code off a phantom run, and never
    conclude a config edit broke the suite until one file has been run on
    its own. 2026-09-18: it fired even AT `--maxWorkers=1` (20 pg files
    "failed", "Vitest failed to find the runner"). The gate that always
    works: run the pg project one file per process (`for f in
    tests/unit/pg/*.test.ts; do npx vitest run --project pg --maxWorkers=1
    "$f"; done`, ~4 min) and `--project node --project dom` separately.
16. **The clobbered intent** — the store checkout has a `useEffect` keyed on
    `storeSelectedProgram?.recordId` that resets step/add-ons/paymentCode. Any
    handler that sets one of those *while also changing the selected program*
    (e.g. the detail popup's "Get this program") has its `setState` wiped by that
    effect on the same render. Rule: carry it through an intent ref the effect
    adopts (`storeStepIntentRef`, `storeAddonIntentRef`) via `requestStoreStep` /
    `requestStoreAddonIds` — never `setStore*` it directly alongside the program.
    Corollary (cost a live no-payment-code bug): state DERIVED from the landing
    step (the minted payment code) must be set inside the reset effect itself —
    a separate mint effect that already ran in the same batch sees unchanged
    deps next render and never re-fires after the wipe.
17. **The China-blocked web font** — loading a display font via Google Fonts
    (`@import url(fonts.googleapis.com…)`) in any client-facing page. Google is
    blocked in mainland China, so the `@import` silently fails and headings fall
    back to a broken bare sans (looked like ghost/clipped text on a real phone).
    Rule: no external font hosts — the landing page (`lv3`) deliberately uses no
    web font; match it with heavy system Inter (`font-weight: 900;
    letter-spacing: -0.02em`) and `text-transform: uppercase` where you need caps.
    A condensed web font swapped for a system one renders WIDER — shrink the size
    and add uppercase to keep the look.
18. **The overriding co-located stylesheet** — editing a rule in `App.css` and
    seeing ZERO effect because the same selector is redefined in a co-located
    chunk CSS (`appInterior.css`, or a component's own `.css`) that loads AFTER
    `App.css` and wins. Rule: when a CSS change has no visible effect, `grep` the
    selector across **every** `.css` file (not just App.css) before touching more
    App.css; verify against the *served/built* CSS or `getComputedStyle`, never
    assume your edit took. (Cost hours on the sidebar identity box: a stray
    `.coachBoxWrap { position:absolute }` in appInterior.css pinned it out of
    flow and made the nav overlap it — invisible from App.css.) Corollary
    (cost the calendar glance badges): REUSING a styled component on a new
    surface inherits that surface's broad themed descendant rules — App.css
    has 6+ stacked `.workoutBlock span { color: … !important }` rules that
    repainted the builder's badge ink illegible. When moving/reusing a
    component, check getComputedStyle in the new context, and out-specific
    the theme rules rather than patching them one by one.
19. **The future-state privacy promise** — writing the privacy policy as if a
    planned mainland/Postgres migration is already complete. Rule: disclose the
    live data path until migration is verified, record temporary cross-border
    consent, then remove that consent and update the policy in the cutover pass.

20. **The invisible crawler head** — adding runtime or Express SEO metadata when
    production Nginx serves `dist` directly. Rule: inspect the live delivery path,
    emit static route HTML at build time, and verify raw HTML rather than the DOM.
    Corollary (bit Kimi 2026-08-11): hand-editing `index.html`'s
    `<!-- SEO:START -->` block is a dead edit — the build regenerates it from
    `src/seoConfig.ts` (via `server/seo.ts`); change titles/descriptions THERE.
    And when verifying the live page pre-launch, remember the nginx launch gate
    serves coming-soon.html to cookie-less requests — curl with the `nl_gate`
    cookie (see `/etc/nginx/conf.d/nolimit-training.conf`) or you're grepping
    the wrong page.

21. **The phantom select value** — a `<select value={state}>` whose state is ""
    (or filtered out of the options) DISPLAYS the first option while state holds
    nothing; with one option onChange can never fire, so submit rejects a form
    that looks complete ("Please select a client and program", AssignmentDrawer).
    Rule: every select needs either an explicit `<option value="">` placeholder
    or an effect that adopts the first option when state leaves the list.
22. **The buyer-claim unlock** — treating “I've paid” or a loose
    `status.includes("paid")` check as authorization to fulfil (the latter also
    matches `Unpaid`). Rule: create `Pending`; unlock server-side only when the
    normalized payment status is exactly `Paid` after coach/provider verification.
23. **The save-label collision** — showing several nearby “Save” actions that
    persist different scopes. Rule: keep one primary action per surface and name
    it by scope (`Done`, `Save Day`, `Save Program`) so the outcome is predictable.
24. **The forced-light dark-mode leak** — a light page inherits root heading
    tokens that turn white under `prefers-color-scheme: dark`. Rule: forced-light
    surfaces own foreground tokens and get visual/contrast checks in dark OS mode.
25. **The lazy CSS last word** — route-level CSS chunks stay loaded after
    navigation, so equal-specificity shared class names can make the layout depend
    on visit order. Rule: use page-unique class names (or a route root + target)
    and verify computed styles after every relevant chunk has loaded.
26. **The wrap-and-pray card** — a dense desktop flex row merely wraps on mobile,
    leaving names and metadata in vertical slivers. Rule: define explicit mobile
    identity/status/action grid areas and inspect real long labels at 390px.
27. **The dashboard wall** — desktop KPI tiles stack into full-width mobile cards
    and push the actionable queue below the fold. Rule: compact repeated summaries
    into a mobile grid and collapse duplicate inline forms into one focused drawer.
28. **The buried drawer footer** — a full-height slide-over sits below the coach
    mobile nav (`z-index: 1200`), hiding its save action. Rule: operational overlays
    must clear the nav stacking layer, use `100dvh`, and expose the footer at 390px.
29. **The drag-locked list** — putting `touch-action: none` on an entire reorder row
    breaks normal vertical scrolling and leaves keyboard users stuck. Rule: confine
    drag gestures to a dedicated handle, keep the row `pan-y`, and provide move buttons.
30. **The pale twin mapper** — one surface renders the same records visibly poorer
    than a sibling (grey badges, missing reps): not CSS — App.tsx has duplicate
    template→session mappers and the crude one hardcoded `sectionName: "Main"` and
    empty sets/reps. Rule: when a view is a degraded twin of another, diff their
    data mappers first and reuse the rich one (`buildSessionsFromTemplates`).
31. **The out-of-scope token** — `background: var(--nl-surface) !important` on a
    coach surface while the `--nl-*` tokens were defined only on
    `.clientPortalApp`: an undefined `var()` computes to TRANSPARENT (made coach
    modals see-through). Rule: any rule consuming `--nl-*` tokens must target a
    scope that defines them (they now live on `.app:not(.clientPortalApp)` too);
    when adding tokens, define them for every scope that consumes them or use
    `var(--x, fallback)`.
32. **The phantom column** (kangfu; on nolimit the pg equivalent is a wrong column name in a drizzle query) — writing a field name the Feishu table doesn't have
    (`Program` on clients; the real columns were `Program ID`/`Full Name`)
    rejects the ENTIRE record write, and an unchecked writer makes it silent —
    every digital purchase lost Intake Status + access dates for weeks. Rule:
    before shipping a Feishu writer, list the table's live fields
    (`node --env-file=.env` on the server → `GET /tables/{id}/fields`), check
    every write response for `code !== 0`, and test the exact write shape on a
    throwaway record. Same trap on READS and alias lists: a guessed alias
    ("Assigned Form ID", "Common Mistakes CN") silently returns "" when the
    live column is "Assigned Forms ID" / "Common Errors / Watchouts CN" — the
    ETL `expected` lists in server/db/etl/transform.ts are the verified live
    column names; check there before inventing an alias.
33. **The deploy that crashes open tabs** — every page and add-modal is a lazy
    chunk; a deploy that deletes old hashed chunks makes any pre-deploy tab
    white-screen on its next navigation ("the app keeps crashing"). Three
    guards now exist — `build.emptyOutDir: false` (old chunks stay servable;
    weekly server cron prunes >14d), the `vite:preloadError` one-shot reload in
    main.tsx, and the app-level ErrorBoundary in main.tsx. Rule: never remove
    any of the three, and suspect stale chunks whenever "crashes on navigation"
    reports follow a day of deploys.
34. **The animated shell that captures every modal** — nl-anim's stagger once
    landed a transform animation on `.app`; Chrome treats an applied transform
    animation (even FINISHED, held by `fill-mode: both`) as the containing
    block for `position: fixed` descendants, so after one page switch every
    modal anchored to the tall document instead of the viewport ("popup way
    down the middle"). Twin trap: headless Chromium defaults to
    `prefers-reduced-motion: reduce`, so animation bugs are INVISIBLE to
    default Playwright runs. Rule: never put transform/filter animations on
    `.app`/`.main` (nl-anim's pick() now refuses shells), and pass
    `reducedMotion: "no-preference"` when verifying anything animation-adjacent.
    The class RECURRED for builder overlays nested deep in page containers
    (Kent-only, unreproducible headlessly). Durable fix: wrap fixed overlays in
    `PortalToApp` (src/PortalToApp.tsx) — portals to the `.app` root, NOT body,
    so `.app:not(.clientPortalApp)` scoped CSS keeps matching. Verify by
    injecting a hostile `transform: translateZ(0)` on `.main > *` and checking
    the overlay rect still equals the viewport.
    RECURRED AGAIN 2026-07-26 on fixed CHROME, not an overlay: the client
    portal's `.mobileClientBottomNav` sat correctly on load, then jumped 178px
    up and stopped tracking scroll after the first tab switch — `.clientPage`
    ends its entrance animation holding an IDENTITY transform
    (`matrix(1,0,0,1,0,0)`), which still creates the containing block. Two
    lessons: the rule covers any `position: fixed` descendant, chrome
    included; and chrome is harder to spot because it looks right until the
    first navigation runs the animation. When a fixed element misbehaves,
    walk its ancestors for `transform !== "none"` — an identity matrix is
    invisible by eye and in a screenshot.
35. **The renumber that collapses rest days** — the builder's
    `renumberProgramSessionsByWeek` used to reassign each week's days by array
    order (1,2,3…), silently pulling a Day-4 session onto Day 3 and destroying an
    intentional Day 1/4/6 layout — surfaced as "error with Day 3 run" on save
    (the Day-4 run had been renumbered). Rule: a session with a real placed
    `day` keeps it; only fill unplaced sessions sequentially. Never compact
    intentional day gaps. Twin cause on that same save: heavy 30-session saves
    trip Feishu throttle (1254607) with no retry — `saveFullProgram` now retries
    failed sessions once after a 3s pause. Any bulk writer needs the same.
    Third cause on that save surface: each session write is 4-8s (the Feishu
    createWorkoutTemplate does 3 round-trips — template batch_create + set-
    prescriptions + alternates dual-writes), so a full multi-week save
    legitimately runs 30-60s+. A static "Saving…" made it look frozen and a
    stuck-looking save was misread as broken. Rule: bulk client-side write
    loops MUST (a) show live progress ("Saving 5/20…"), and (b) wrap every
    fetch in an AbortController timeout — browser `fetch` has NO timeout, so a
    single hung Feishu write freezes the whole save on "Saving…" forever;
    also make the per-item fn return ok:false on error (never throw) so one
    bad item can't reject `mapWithConcurrency` and sink the batch with no retry.
    THE REAL FIX (shipped): a server-side BULK endpoint
    (`/api/createWorkoutTemplatesBulk`) that takes the whole program and
    flattens every session's rows into aggregated chunked `batch_create`s —
    Feishu `batch_create` accepts up to 1000 records, so a whole program is
    ~2-3 round-trips (templates + set-prescriptions + alternates) instead of
    N×3. Save time becomes ~constant regardless of session count (a single
    Feishu write is ~4-5s of latency; the bulk is that once, not per session).
    Make it atomic (batch_delete rollback if the template write can't fully
    complete) and have the client try bulk FIRST, falling back to the proven
    per-session loop on ANY failure — so a bulk bug degrades to "old speed",
    never "broken save". Same lever applies to any N-write loop over Feishu
    (seed scripts, ETL): aggregate into batch_create, don't loop single writes.

36. **The test item named "…Time"** — `getTestInputMode` (App.tsx) switches an
    item to the minutes/seconds distance-time inputs when its name/unit/metric
    text contains time/duration/minute/second/distance/meter (and weight-reps
    on 1rm/epley/…). Such items can't be auto-filled by programmatic answers
    keyed on `testItemId`, and the all-items-required submit gate then blocks
    the whole test. Rule: millisecond-style items are named "Flight (ms)" /
    "Ground Contact (ms)", never "Flight Time"; check the descriptor list
    before naming any new test item.
37. **The split-identity spender** — a ledger derived from orders (referral
    credit: earned minus spent) silently double-spends when the spending order
    is attributed to a different identity than the wallet owner: store checkout
    deduped clients by TYPED PHONE only, so a logged-in rebuy minted a fresh
    CL- code and the credit-consuming order was invisible to the spent lookup.
    Rule: any flow with a known logged-in identity (`buyerClientCode`) attaches
    writes to THAT record first, form fields second; and any balance computed
    as earned−spent must be E2E-tested with a spend followed by a re-quote
    (balance must visibly drop), not just a successful write.
    Corollary (bit Kent live 2026-08-11): the remembered identity must be
    VERIFIED against the typed fields before adoption — Kent's devices stay
    logged into athletes' portals for support, and his own purchase attached
    to Pan Yufei's account (order + intake) because buyerClientCode was
    trusted blindly. Fulfillment now adopts it only when the typed name
    matches that account; a mismatch falls back to phone-dedupe/create.
38. **The uploads path that only worked for video** — prod's nginx has a
    late `location ~* \.(?:js|css|...|png|jpe?g|...)$ { try_files $uri =404; }`
    block (for caching hashed `dist/assets/*`) that, by file-extension regex,
    also matches `/uploads/*.png` — and a plain `location /uploads/ { proxy_pass
    ...}` loses to ANY regex location regardless of file order, so image
    uploads 404'd (served from `dist/`, which doesn't have them) while video
    uploads worked fine (`.mp4` isn't in that regex). Invisible for months
    because nothing had ever uploaded a self-hosted image through
    `/api/uploadFormVideoFile` before — `productImage` etc. were always
    pasted external URLs. Rule: any `location` meant to always win for a
    path prefix needs `^~` (e.g. `location ^~ /uploads/`), not a bare prefix
    — and test a real upload against the LIVE domain (not just the twin,
    whose nginx has no competing regex block) before calling an upload
    feature done. The twin's config is not a faithful proxy stand-in for
    prod's.
39. **The save that reads its own just-cleared state** — a save handler that
    then navigates/guards in the SAME onClick closure (`await
    saveFullProgram(); selectWorkoutTab(...)`) reads STALE closure state: the
    leave-guard's `hasUnsavedBuilderWork()` still saw the pre-save
    `programSessions` (the save had `setProgramSessions([])`, but the closure
    captured the old array), so a successful save always prompted "You have
    unsaved changes." Twin trap on the SAME surface: the "Saved/Unsaved" pill
    used `setTimeout(0)` to flip to "saved", racing the dirty-tracking effect
    that the save's own state resets fire — so it often stuck on "Unsaved",
    making a real save look like it didn't persist. Rule: a save fn returns a
    success boolean; callers navigate only on success and skip the leave-guard
    (nothing's unsaved after a successful save); and status DERIVED from a
    save must be cleared via a ref the dirty-effect reads (`justSavedRef`),
    never a setTimeout racing that effect (same family as #16). Verify the
    backend save chain is healthy FIRST (it was) so you fix the real layer —
    client-side save-state tracking, not the API.

40. **The asset swap that inherits the old asset's hacks** — old logo PNGs were
    gold baked onto black plates, so CSS around them grew compensating hacks
    (`mix-blend-mode: screen` to drop the plate) and some "dark" surfaces are
    actually light at runtime (.sidebar declares rgba(0,0,0,.78) but the coach
    theme paints the collapsed rail WHITE — a white monogram there was
    invisible). Rule: when swapping brand assets, audit every usage site's
    COMPUTED background (getComputedStyle/screenshot, not the declared CSS),
    pick the variant per surface, and delete the old asset's compensating
    blend/filter hacks in the same pass. Big source packages never go in
    public/ (it ships wholesale into dist) — gitignored branding/ holds the
    package; only web-ready exports live in public/.

41. **The shared-.env sibling** — prod and the pg twin are two pm2 apps started
    from the SAME `/opt/nolimit-training` dir and `.env`; repointing `.env`'s
    `DATABASE_URL` for prod would have silently repointed the twin at the
    production DB on its next restart (battery test writes into prod). Twin
    trap: a battery step asserting an *unconfigured-service* contract (wxAuth
    503) breaks the day the service is configured. Rules: before editing a
    shared `.env`, pin every sibling app's divergent values into its own pm2
    env (`VAR=x pm2 restart <sibling> --update-env`) FIRST; and contract tests
    for optional services must accept both the unconfigured AND configured
    responses.

42. **The draft that renders as saved** — the builder grid painted the
    in-progress session as a card (live overlay of `selectedProgramExercises`)
    while the session existed NOWHERE else until "Save Day"; any day-switch
    (`startSessionForCell`, `loadSessionForEditing`) cleared those exercises →
    "his last session disappears". Twin trap: "Save Day" flips the pill to
    "saved" though nothing reached the server, so a status-driven leave-guard
    goes silent on a fully built, never-persisted program. Rules: when UI
    renders uncommitted state as if committed, every context switch must
    COMMIT it (not discard); and track day-level pill state and server-level
    dirty separately (`builderServerDirtyRef`) — a local commit is not a save.
    Two accomplices made it unreportable: the editor's gold "Done" was a no-op
    close identical to Cancel (primary button must do the primary thing), and
    `.toastStack` sat at z-index 1200 under the 1500-3200 overlays, so every
    validation toast was invisible ("the save button wasn't doing anything").
    Rule: toasts stack above the HIGHEST overlay, and check that on every new
    overlay layer.

43. **The decorative input** — the 2026-07-23 audit found a dozen controls
    that collected input and silently dropped it somewhere along
    UI → payload → writer → column → reader → re-display: session notes (no
    hop existed), session CN names (read-back dropped → re-save wiped),
    template edits wiping description/options/help text (writers rewrite ""
    for fields the editor never collects), manual-order phone/notes (no
    column), program/exercise/client-date "clears" that silently no-op
    (empty-omission), an order-assign sending a program NAME into a pg FK.
    Rules: every new input gets its FULL chain traced before calling it done;
    replace-style writers must carry over fields the editor doesn't collect
    (patch-style for scalars); on Postgres an explicit "" is a CLEAR (write
    null), never an omit — Feishu-only empty-omission stays in feishu impls.
    Corollary (cost the Article Builder its list, 2026-08-11): company-ops
    has an extra hop the trace must include — `normalizeDashboard` in
    src/companyOps/api.ts is an explicit field WHITELIST, so a new dashboard
    field the server emits is silently dropped client-side until it's added
    there too. Server payload + client types + page are not enough.
    Corollary (caught in review 2026-09-08, never shipped): REMOVING a
    prefill is a data-contract change too. The workout player stopped
    prefilling actual reps from the prescription (good UI: never echo the
    target as if logged), but the submit sent `actualReps` verbatim, so a
    ✓-only set would have stored "" → 0 reps in volume, PRs and coach
    review. Rule: when a field stops being prefilled, trace the "user
    touched nothing but confirmed" path to the writer and resolve the
    default AT SUBMIT (see `resolvedLogs` in App.tsx), not in the input.
    Corollary (builder audit 2026-09-20): the WRITE-ONLY twin store —
    `set_prescriptions` had been written by every save for months while
    every reader used the "Set Prescriptions: [...]" JSON in coaching_notes,
    so its columns silently lost units (`rest` via toNum) and never gained
    rpe/time/distance; the table looked authoritative and was decoration.
    When a table and a JSON blob both hold the same data, grep for READERS
    of each before trusting either — the one nobody reads is the one that
    has drifted. Now the table is read first (migration 0024), JSON is the
    fallback.

44. **The lifecycle-destroyed draft** — the WeChat mini program
    (`c:\Users\kentb\nolimit-miniprogram`, a THIRD repo) held a whole 45-90
    minute workout in React state and wrote only on "Finish", but WeChat
    destroys a backgrounded mini program after ~5 minutes (at once under
    memory pressure), so a phone left face-down between sets silently lost
    every logged set with no error to report. The same lifecycle freezes
    `setInterval`, so the rest countdown was wrong on every return. Rules:
    any mini-program surface collecting input for longer than ~5 minutes
    mirrors it to local storage on every edit and restores on reopen —
    persist only the USER's input and overlay it on a freshly fetched
    prescription, never re-serve a cached one, so a draft can't resurrect a
    program the coach has since edited; and any timer is a stored DEADLINE
    recomputed from `Date.now()`, never a decrementing counter.

45. **The suite that tests the unused backend** — after the 2026-07-21 pg
    cutover the whole unit suite kept passing while covering NOTHING that
    production ran: 56 of 62 handler tests stubbed Feishu HTTP, no test set
    `DATA_BACKEND`, and it defaulted to `"feishu"`. Green runs for five days
    validated a frozen mirror, which is the likeliest reason the money-path
    bugs (#22, #32, #37, #43) were all found by accident rather than by a
    failing test. Rule: after ANY backend/infra switch, prove which path the
    tests take before trusting them — run one test file under the production
    env var and watch it fail. A config default that decides which code runs
    must never be the permissive one; make the wrong value impossible, not
    merely unlikely. Same class, found 2026-07-26: the mini program's
    `API_BASE` fell back to the **:8443 staging twin** when the Taro define was
    missing, so a prod build could have served athletes from the throwaway
    `nolimit` database (stale programs; workouts logged where nobody reads
    them) with no error. A fallback names the environment you land in when
    configuration fails — it must always be the one that is safe for a real
    user, never the convenient one for a developer. Grep every
    `process.env.X || "…"` in client code for this shape.
46. **The two-convention column** — `assigned_workouts.scheduled_date` was
    written by four call sites using two different `YYYY-MM-DD` → epoch
    conversions (`new Date(str)` = UTC midnight vs ``new Date(`${str}T00:00:00`)``
    = server-local midnight). Both round-tripped through `epochToDate`, so
    display looked perfect and nothing failed — but prod is UTC+8, so a
    COMPARISON across the two was off by 8h: the bulk-reschedule boundary
    excluded the session scheduled on the from-date itself, and the mini
    program's replan defaults to exactly that date. Rule: a column's
    string↔epoch conversion lives in ONE named helper (`dayStartMs` /
    `epochToDate`) that every writer and every comparison uses. Two encodings
    that both round-trip are invisible until something compares them, so
    grep for every writer of a date column before trusting any range query.
47. **The second opinion on the athlete's own number** — the same derived
    figure (est 1RM, MAS pace, HR zone) is now computed in BOTH the web app
    (`src/App.tsx`) and the mini program
    (`nolimit-miniprogram/src/services/performance.ts`). If they disagree, the
    athlete is told two different paces for the same prescription and trusts
    neither. Two concrete traps found building "My Numbers": (a) the
    `/api/workoutHistory` rows carry `bestWeight` and `bestReps` as INDEPENDENT
    maxima from different sets — multiplying them into an Epley 1RM invents a
    lift that never happened; compute per-set from `logs` and take the max.
    (b) The web matches a metric on different field subsets in different places
    (`metricType+metricName+sourceTestName` when finding the latest MAS,
    `metricType+metricName+calculationMethod` when resolving a pace) — match on
    the UNION or the two clients can select different source metrics. Note
    several athletes have multiple MAS rows with the SAME `measuredAt`, so
    "latest" is decided by a stable sort preserving API order — any change to
    sort or filter silently repoints which metric wins. Rule: when duplicating
    a formula into another client, verify against the live web page, not
    against your reasoning. The procedure that works and is cheap: run the
    ACTUAL shipped module in Node (`node --experimental-strip-types`, importing
    the `.ts` by absolute `file:///` URL — a bare specifier resolves against
    the scratchpad, not the repo) against live API data, then read the same
    numbers off the live portal with Playwright (portal metrics sit behind the
    **Metrics tab** — a bare page load renders none of them) and diff the two.
    Also: `workout_templates.display_target` is EMPTY across the whole prod
    DB — planned weights come from client-side resolution
    (`resolvePrescribedLoad` in App.tsx; mirrored as `resolveTargetKg` in the
    mini program's performance.ts) using `targetPercent` + athlete metrics.
    This rule covers SANITIZATION too, not just formulas: exercise-note meta
    labels are translated inconsistently (跟踪/追踪/单侧…), so any exact-label
    filter eventually leaks one to an athlete — both clients must use the
    generic short-CJK-label strip (web `stripLocalizedExerciseMeta`, mini
    `cleanNotes`), and a strip fix in one client is unfinished until the
    same field's every render path in the OTHER client is swept.
    Never build a feature on displayTarget without checking the column has
    data; and note both clients share the web's quirk that an exercise with
    no matching 1RM test falls back to the athlete's FIRST 1RM metric (a
    bench % can resolve from a squat 1RM) — change it in both or neither.
    RECURRED inside ONE client 2026-09-22 (Anthony's screenshot: 板块/标签/
    组次规划 JSON on the mini workout card): the info sheet and the "coach
    cue" line both ran `cleanNotes`, but the card's COMMENT line rendered
    `ex.notesCn` raw — and 323 legacy `coaching_notes_cn` rows (7 programs)
    carry a machine translation of the whole meta block, because the
    translator only started stripping meta lines on 2026-09-17 (4c5c9f8).
    It is not a DeepSeek/TMT quality problem and not location-dependent.
    Rule: the sweep is per RENDER PATH, not per helper — grep `\.notesCn`
    and `\.cueNotesCn` in the page and require every read to pass through
    the strip; the data stays as-is (the EN column holds the same meta by
    design), so a display fix is the fix.
48. **The cascade that forgets the new table** — `client_messages` (migration
    0008) shipped with an FK to clients but was never added to
    `cascadeDeleteClientData` (server/db/pg/records.ts), so deleting any
    athlete who had ever messaged their coach failed whole. Rule: any new
    table with an FK to `clients` gets a delete in the cascade (or `ON DELETE
    CASCADE`) plus a delete-with-child-row test, in the same commit as the
    migration.
49. **The roster on every phone** — the mini program resolved "what type of
    client am I" by fetching ALL of `/api/clients` (every athlete's phone,
    email, coach notes) and picking one row client-side; shipped that way for
    weeks. Rule: athlete-facing clients consume athlete-scoped endpoints only
    (`/api/myProfile`); before wiring any coach-console endpoint into the
    portal or mini program, check what the full response exposes — and when
    adding one, assert the response contains no other client's data.
    When migrating callers off an endpoint, grep for the URL STRING
    (`"/api/clients"`), not the helper names — the first myProfile migration
    missed `fetchMyPerformanceOverrides` exactly this way, same day. Full
    roster is now coach-key-gated; the portal uses `?code=` single-row mode.
    RECURRED on 6 siblings (2026-07-29): `checkIns`, `notifications`,
    `workoutHistory`, `exerciseResults`, `workloadLogs`, `contentAssignments`,
    `athleteMetrics` all had the identical "no clientId filter = return every
    client's rows" shape, unpatched, for an unknown period — same bug, never
    generalized past the one endpoint it was first found on. Rule: this bug
    class is per-SHAPE, not per-file — the moment you find it once, grep every
    repository under `server/db/repositories/` for `!clientId`-style "empty
    filter returns all" branches and gate every one in the same pass, not just
    the reported one.
    RECURRED client-side 2026-09-18: the public `/coaching`, `/in-person` and
    legal pages share App.tsx's boot effect, whose guard listed only
    `isStorePage || isPublicLandingPage`, so every visitor to those pages
    keylessly pulled the roster, teams and subscriptions — and the 2026-07-30
    audit's "the portal never needed them" was true yet missed these
    surfaces. Rule: a boot/page-visit effect in the monolith is gated on the
    surface that NEEDS the data (`isCoachView`), never on a list of surfaces
    that don't; and the way to prove a lock is safe is to record which
    `/api/*` names every public URL actually fires (Playwright `request`
    listener) and intersect with `COACH_ONLY_HANDLERS`, not to reason from
    guards.
50. **The two-field kind** — a digital product's real "kind" (program / bundle
    / add-on) lives in `storeListingType`; `productType` stays `"Digital
    Program"` for bundles and add-ons too (confirmed live: all 3 real add-ons
    and the 1 real bundle have this exact shape). The Digital library's
    Add-ons/Bundles quick-filter tabs (App.tsx `visibleSavedPrograms`, the
    `type:` filter) checked `productType` alone and matched ZERO real rows,
    while the Programs tab wrongly included the add-ons/bundle too —
    meanwhile `CoachProgramsLanding.tsx`'s own `isAddon`/`isBundle`/`kindOf`
    helpers on the SAME page already checked `storeListingType` first and
    were correct. Two pieces of code on one page computed the same
    classification differently; only one was right. Rule: `storeListingType`
    is the source of truth for digital product kind — never branch on
    `productType` alone to detect add-on/bundle. More generally: when you
    find a classification helper (`isX`/`kindOf`) on a page, grep that same
    page for every OTHER place the same classification gets computed by hand
    and diff them — a second, differently-wrong implementation is exactly how
    this one hid for an unknown period.

51. **The client overlay that eats navigation** — the client-detail view
    renders on top of EVERY coach page while `selectedClient` is set, so a
    raw `setActivePage(...)` from inside a client context looks like a dead
    click (the target page mounts underneath, invisible; cost: calendar "New
    session" appeared broken). Rule: navigation out of a client context
    either goes through `goToPage()` (which clears selectedClient) or must
    clear/stash `selectedClient` itself and restore it on the way back
    (see `oneOffReturnClientRef`).
    Calendar workout editing is an in-context exception: keep ClientWorkspace
    mounted and use CalendarWorkoutEditor over it, preserving date/view/scroll.
    Resolve the clicked workout's exact week/day before opening; never default
    to the first program session. Save/close returns to that athlete's calendar.

52. **The overlapping save that doubles the program** — (second cause, fixed
    2026-08-05: `inPlaceEdit` was gated `&& !singleWorkoutMode`, so every
    calendar-session edit CREATED a new library program per save — 5 live
    copies of one session. A save path that forks on mode must keep edit
    semantics in every mode.) Original cause: builder saves wrote
    new template rows then deleted the OLD ones from a list captured at save
    start; two saves racing (double-click beats the `disabled={savingTemplate}`
    re-render) each wrote a full copy while both deleted only the originals —
    PR-1759 stored every exercise in triplicate, rendering as phantom circuit
    rounds. Rules: async save handlers get a REF re-entrancy guard
    (`saveInFlightRef`) — state-based disabling re-renders too late to stop a
    double-click; and any replace-style write is delete+insert in ONE
    server-side transaction (`replaceExisting` in createWorkoutTemplatesBulk),
    never a client-orchestrated capture→insert→delete sequence, which
    duplicates under every race and half-completes under every failure.
    THIRD cause (PR-4418, 2026-09-19): the builder merged the live draft
    into the session list by `localId` only, so a day reopened after "Save
    Day" (id cleared) was APPENDED next to its committed copy and one bulk
    call wrote both — template ids 1 ms apart, the second copy carrying the
    later edit. Rules: session identity is the calendar SLOT (week+day; see
    `upsertProgramSession` in appCore), the bulk endpoint keeps only the
    last session per slot, `replaceExisting` is ALWAYS on (a retry after a
    timed-out-but-committed bulk must be idempotent), and before any
    fallback loop the client asks the server whether rows already exist.
    Diagnose duplicates from the minted ids first: one timestamp = one
    request sent the copies; two timestamps = two saves.

53. **The list that only loads when empty** — every cached client-side list
    (exercises, programs, form/test templates) was fetched only `if
    (list.length === 0)`, so an open app tab NEVER saw records created on
    another device ("created exercises on my phone, they don't show up in
    the library") until a hard reload. Rule: page-visit effects call the
    loader unconditionally and let the loader's own TTL cache throttle
    (fresh → serve memory, stale → refetch); an emptiness guard is a
    never-refresh bug, not an optimization. This class is per-SHAPE: grep
    `length === 0 && !.*[Ll]oading` when you find one instance. Corollary:
    any HANDLER that searches a lazily-loaded list (`programs.find(...)`)
    must await the loader itself when the list is empty — reachable pages
    (a client's calendar via Clients) may never have triggered the load.

54. **The stash that ate the uploads** — on the SERVER, the repo worktree
    (`/opt/nolimit-training`) contains untracked PRODUCTION DATA (`uploads/`,
    `uploads-originals/`). A deploy-blocked pull "fixed" with
    `git stash --include-untracked` + `git stash drop` deleted 6GB of
    exercise videos: stash -u swept the untracked dirs, and `git stash show`
    LIES by omission (it lists tracked changes only — the stash looked like
    one script file). Recovered because dropped stashes linger until gc:
    `git fsck --unreachable` → the "untracked files on main" commit →
    `git archive <sha> | tar -x`. Rules: NEVER `stash -u` or `git clean` in
    a server worktree; if a pull is blocked by an untracked file, move that
    one file aside by name. Production data dirs live in .gitignore (ignored
    files are untouchable by stash/clean) — keep them there. After ANY
    server file mishap, check the CDN too: edges cache the SPA-fallback HTML
    for missing media URLs (200 text/html, ~4KB) and keep serving it for 30
    days until a directory purge.

55. **The auto-margin that cancels flex stretch** — the store's V3 page reuses
    V2's `.storeMainV2` wrapper, which App.css makes `display: flex; column`;
    every section carries `margin: 0 auto`, and an auto CROSS-AXIS margin on a
    flex item disables `align-items: stretch` — each section silently sized to
    its intrinsic content (the mobile card carousel's ~1064px), pushing the
    centered headings past a 390px viewport where `overflow-x: clip` cut them
    off. Desktop looked perfect (content fit), so it shipped unseen. Rule: a
    centered child of a flex column gets `width: 100%` + its own `max-width`,
    never bare `margin: 0 auto`; and when reskinning a page over an old
    wrapper class (`*V2` under `*V3`), diff the wrapper's inherited layout
    properties (display/flex rules), not just the visual ones — same family
    as #18/#25, found only by measuring `getBoundingClientRect` at 390px.
    Corollary (content-calendar month view, 2026-09-08): a grid track of
    bare `1fr` is `minmax(auto, 1fr)` — its MINIMUM is the content's
    min-content width — so one long `white-space: nowrap` chip title
    stretched its weekday column to ~1100px and crushed the other six,
    while `text-overflow: ellipsis` never fired because no ancestor in the
    chain (track → cell → flex chip → title) had `min-width: 0`. Rule:
    equal-column grids are `repeat(n, minmax(0, 1fr))`, and every flex/grid
    child that must truncate carries `min-width: 0` all the way down. Verify
    by rendering the BUILT CSS chunk with a deliberately long title and
    asserting the column widths are equal, not by reading the stylesheet.

56. **The one serializer Feishu does not share** — Bitable's current create-field
    API expects `description: { text, disable_sync }`, while a field nested in
    create-table accepts a narrower shape and create-table has no `client_token`.
    Keep table creation minimal, then reconcile full fields through their own API.

57. **The migration the journal skipped** — drizzle-kit migrate applies only
    migrations whose `when` timestamp in `meta/_journal.json` is NEWER than
    the last applied one. An earlier entry with a hand-rounded FUTURE
    timestamp (0018 carried 1786480000000) made a freshly generated 0019
    silently skip on deploy while `migrate` printed "applied successfully" —
    prod inserts then failed on the missing wxpay columns during a live
    payment test. Rules: never hand-edit journal `when` values (and be
    suspicious of round ones — sort-check the journal when a migration
    misbehaves); and a deploy that includes a migration is verified by
    querying information_schema for the new column/table on PROD, never by
    the migrate step's exit code or its success line.

58. **The dashboard that summed its round-trips** — company-ops dashboard
    sections were each added as another sequential `await listOptional(...)`
    (by several agents over time), quietly growing to 7 serial Feishu
    round-trips = 15-23s loads, misread as "Thailand internet". Rule: a new
    dashboard/aggregate section joins the up-front parallel `prefetch` block
    (guards mirroring its use site), never a standalone await; and "page is
    slow" gets MEASURED server-side (time the assembly on the box) before
    blaming the network. MEASURED FLOOR (Shanghai box, 2026-08-12, so stop
    re-deriving it): one Bitable table read ≈1.3s, create one record 3.6s,
    delete one record 6.3s, tenant token 0.2s. So ~16 tables even fully
    parallel ≈2-3s, and resolvePrincipal is ANOTHER staff-table read paid on
    every request. Two consequences: (a) company-ops reads go through
    `server/companyOps/cache.ts` (wraps api/_cache.ts, so invalidation rides
    the LISTEN/NOTIFY bus to both forks) — dashboard 60s, principal 5min,
    cleared on every mutation, off under VITEST; (b) NEVER `await` a full
    dashboard refresh after a write in the client — the write already cost
    3.6s and the refresh stacks 2-3s more on top, so a save that finished
    reads as an 8s hang. Refresh in the background or update optimistically.
    The real cure for write latency is the Postgres migration; while the
    backend is Bitable, 3.6s per write is the floor, not a bug to hunt.
    RECURRED 2026-09-10, three lessons: (a) the "floor" is per TABLE, not
    per read — a per-read trace (monkey-patch client.listRecords, log start
    offset + duration) showed the dashboard fully parallel yet one
    commission-table page taking 28s, and the commission/payroll tables
    were EMPTY; an empty Bitable table still costs 2.5-7s a read. Trace
    before parallelising — hoisting phases won 3s, caching the four slow
    tables won 17s. (b) `api/_cache.setCached` refuses a bare empty array
    (so a transient [] can't be cached as "no data"), which silently made
    the record cache useless for exactly those empty tables — cache a
    `{ records }` wrapper written only on the success path. (c) The user
    saw "That action could not be saved" for a save that HAD landed: the
    toast came from the post-write dashboard reload hitting the client's
    30s timeout. A failure message must name the step that failed
    (`dashboardRefreshFailed`), never the step the user cares about.

59. **The commit that imports a ghost** — committing a SHARED file by name
    while another agent is mid-feature in it swept their `import ...
    "./CampaignsPage"` into the commit while the imported file stayed
    untracked: local gates pass (the file exists on disk), main is
    unbuildable everywhere else, and the server deploy dies on TS2307 —
    discovered one deploy LATER, when the breakage looked unrelated to the
    commit being shipped. Rule: staging by file name is not enough in shared
    files — before committing, grep the STAGED diff for `^\+import` and
    check every referenced local module is tracked (`git ls-files`); if it
    belongs to another agent's WIP, either leave the whole file out or
    commit their completed work as its own gate-passed commit.

60. **The exemplar copied on faith** — mirroring the war room's attachment
    flow onto goal comments exposed that the exemplar itself was broken:
    `respond_idea` spread a newline-joined STRING into its message array
    (`[messageText, ...replyFiles]` — JS spreads a string per character), so
    every war-room reply attachment had been written to the thread as
    one-char-per-line garbage, and no test covered any attachment path.
    Rule: before copying a pattern, check the exemplar has a passing test or
    a verified live use — "it shipped" is not evidence — and give the
    exemplar its missing regression test in the same pass as the copy.

61. **The state variable with two owners** — `workoutHistoryLogs` was meant
    to be the athlete's persistent lifetime training history (Trophy Case,
    PR charts, exercise-history modal all read it), populated once by a
    `[selectedClient]` effect. But `openWorkout`/`closeWorkoutPlayer` ALSO
    reset and refetched the same state, scoped to "history as of this one
    workout" — so opening or closing ANY workout wiped it for the rest of
    the portal session, and Trophy Case sat at 0/11 despite real completed
    sessions. The transient writes were pure redundancy: the local
    `historyData` var already served the one thing inside `openWorkout` that
    needed fresh data. Rule: before adding a reset/refetch of a state
    variable inside a narrow-scoped flow (a modal open/close), check whether
    something ELSE already owns that variable as persistent — grep every
    setter, not just the one you're touching. Same surface also had the
    classic sibling bug: `workoutFocusIndex` (which exercise a review shows)
    isn't reset when entering review mode, so a stale index from a longer
    session survives into a shorter one and renders as "Exercise 2/1" with a
    blank card — reset any such index explicitly on every new entry point,
    never assume it starts at a sane default just because `useState(0)` said so.

62. **The in-place rewrite under an immutable cache** — `optimizeVideos.sh`
    (10-min cron) recompresses uploaded videos IN PLACE (same URL, new
    bytes) while `/uploads` serves `Cache-Control: immutable, max-age=1yr` —
    so the CDN locked in whichever bytes it saw first: confirmed live with
    one URL serving 16.1MB from the CDN and 6.6MB from origin, surfacing as
    416 Range errors, refetch storms, and broken exercise videos (Mario's
    Aug-25/27 uploads). Rule: a URL is immutable only if its bytes are —
    any pipeline that rewrites a served file in place must either purge the
    CDN per rewrite (`scripts/purgeCdn.mjs`, needs cdn CAM permission on
    the COS key) or the origin must serve `no-cache` until the file is
    stable (server/index.ts does this for videos <30 min old). Twin fact
    rediscovered: an `/uploads` miss fell through to the SPA catch-all as
    200+HTML (mistake #54's poisoning class) — now a real 404 in
    server/index.ts; keep it that way. And when a "videos are slow/broken"
    report comes in: diff `curl -sI` origin vs media CDN for the same URL
    FIRST (Content-Length + Last-Modified) — a mismatch is this bug in one
    command.

63. **The backfill that wrote to the wrong database** (#45's data-script
    sibling) — integrate-exercise-library.mjs uploaded 62 videos to PROD
    (via the live HTTPS endpoint) but did its DB writes through
    `--env-file=.env`, whose DATABASE_URL is LOCALHOST on this repo. It
    reported "28 replaced, 34 created, 0 failed" — all true, all in the
    dev database. Prod showed nothing for 6 days; the finished videos sat
    as "orphaned files" until a video audit stumbled on the mismatch. The
    mixed transport is what made it invisible: the HTTP half really did
    hit prod, so spot-checking an uploaded file URL "worked". Rules: a
    script that mixes live-API calls with direct DB writes must point BOTH
    at the same environment, and a prod backfill is verified by READING
    PROD after the run (live endpoint or prod DB query for the exact rows
    written) — never by the script's own success output. Recovery
    procedure that worked: export the intended rows from the local DB,
    ship as JSON, apply server-side with per-row guards (file-exists on
    prod disk, never overwrite non-empty prod values, skip existing IDs)
    and a --dry mode first.
64. **The permissive gate used as proof** — `coachKeyOk()` deliberately
    returns TRUE while `COACH_ACCESS_KEY` is unset (so gating can roll out
    safely). Reused as "is this caller a coach?" to SKIP an athlete
    ownership check, it granted every keyless caller coach rights for as
    long as the key stayed unset — the 403 test failed with a 200 on the
    first run, which is the only reason it never shipped. Rule: a permissive
    default is for DENYING less, never for GRANTING more; anything that
    earns extra rights uses `isVerifiedCoach()` (key configured AND
    presented). Same family as #45: a default that decides who is trusted
    must fail closed.
65. **The category the library doesn't use** — the builder decided "is this
    cardio?" by `isCardioCategory` (/cardio|aerobic/), but the live library
    has NO Cardio category: Elliptical, Bike, Row/Ski Erg, Stairmaster and
    the treadmill/track runs are filed under "Conditioning" alongside
    burpees and thrusters. Every machine was therefore built as weight ×
    reps, and Kent reported it as "no heart-rate field on the elliptical"
    — a missing-field symptom whose cause was classification. Rule: before
    fixing a "missing field" in the builder, pull the exercise from
    `/api/exercises` and check its `category`; classification helpers must
    match the library's real taxonomy (`isCardioExercise(category, name)`
    in appCore — category OR machine/run name), never a label nobody
    assigns. Same family as #50 (two ways of computing one kind).

66. **The four reset lists that drifted** — "new program", "new session",
    post-save and `resetBuilder` each hand-listed the state to clear, and
    over a year each grew differently: sport/level/coach/one-off target
    survived from one program into the next, store price/category leaked
    into a fresh build, and Sport/Level were saved on every program without
    any input to edit them. Rule: a surface with N "start fresh" entry
    points has ONE reset helper per scope (`resetProgramFields`,
    `resetSessionFields`) that every entry point calls before applying its
    own values; adding a builder state variable means adding it to that
    helper, never to a call site. Capture anything the caller still needs
    (one-off assign target, return client) into locals BEFORE the reset.

67. **The hard timeout on a throttled link** — a 25 MB exercise video from
    outside mainland China "failed" twice over: nginx's DEFAULT
    `client_body_timeout` (60 s of silence) returned 408 on the first stall,
    and the modal's fixed 10-minute XHR timeout sat exactly where a 25 MB
    upload lands at the measured ~40 KB/s inbound. Measured 2026-09-20 from
    Kent's machine: download from trainnolimit.cn ~480 KB/s, upload ~43 KB/s
    to .cn, ~28 KB/s to .com (the HK hop buffers the whole body first), and
    a single 10 KB API read stalled 80 s once then took 0.5 s — while the
    box answered the same request in 3 ms. Rules: upload locations set
    `client_body_timeout` explicitly (600 s, both boxes); browser uploads
    time out on STALL (no progress for N min), never on total elapsed; and
    a "the app is slow" report from abroad is diagnosed by timing the same
    request on the box (`curl 127.0.0.1:3001`) vs from here BEFORE touching
    code — one stalled request out of three is the link, not the server.
    The real fix for uploads is direct-to-COS via the accelerate endpoint
    (see COS footage archive memory for the cost), not more timeout.

68. **The prop pruner that reached the neighbour** — after deleting a dead
    panel from CoachBuilderPage, a script removed every `name={...}` line
    tsc flagged as unused from App.tsx by regex at the shared 16-space
    indent, and silently stripped the SAME-NAMED passes from CoachTestsPage
    (its battery modal lost testItems/saveTestTemplate); tsc then reported
    those STATES as unused and the next "cleanup" nearly deleted the live
    test-battery save. Rule: mechanical prop removal in the monolith is
    scoped to the one `<Component …/>` block (match the element, then edit
    inside it), and any name tsc calls unused right after a bulk edit is
    checked against `git diff` for a removed pass before its declaration
    is touched — "unused" one round after your own edit is a symptom of the
    edit, not evidence. Same session, same file: the "first `)}` at this
    indent" closer for a JSX guard is wrong whenever an inner block shares
    the indent — match closers by paren depth.

69. **One door per job (builder cleanup 2026-09-21)** — a program could be
    edited from five buttons, "Duplicate" meant two different things, store
    price/visibility lived in both the builder and the Store tab (a builder
    save overwrote a Store edit because it sent the whole payload), one
    builder screen had four save verbs, and three panels were unreachable.
    Rules now in force: the program page (row click) is the only home for
    Edit / Duplicate / Assign / Delete; Duplicate is always the server
    clone; commerce fields live ONLY in Digital › Store and an in-place
    builder save sends none of them; the builder has two saves ("Done" for
    a day = local commit, "Save Program/Session" in the header = server)
    and leaves via the back link; pickers are named by outcome ("Assign
    from library" on the calendar, "Insert from library" in the builder).
    Before adding a second way to do any of these, delete the first.

70. **The copy the calendar reads** — `assigned_workouts` carries its own
    session_name/type/goal/intensity/duration, copied from the template at
    ASSIGN time; exercises are read live from `workout_templates`. So an
    in-place builder edit changed what the athlete trains but the calendar
    (and the mini program list) kept the old title ("still says Sunday's
    date program" after a rename to Accessory), and the coach concluded the
    save hadn't worked. Rule: any writer that replaces a program's templates
    (`createWorkoutTemplatesBulk` with `replaceExisting`) also updates the
    not-yet-completed assigned copies for the same program + week/day, in
    the same transaction, and invalidates `workouts`. When a "my edit didn't
    take" report names a CALENDAR surface, diff the assigned row against the
    template before touching the save path — and remember an open tab keeps
    running the chunks it loaded (#33): ask for a hard reload before
    debugging a flow that already passes on the current build.

71. **The gate that broke the phone in everyone's pocket** — switching the
    coach lock on (COACH_ACCESS_KEY set) also made `workoutDetails` demand
    `clientCode`, because `coachKeyOk()` had been permissive and the
    entitlement branch had never actually run in production. The RELEASED
    mini program (2026.9.17.4) calls that endpoint without a code, so every
    athlete's workout became a 403 the mini shows as "network not
    available" — reported by Kent the next morning, an athlete due to train
    that day. The 2026-09-18 lock-safety pass replayed the WEB portal's
    requests, not the mini program's. Rules: before turning on any gate,
    replay the exact request set of EVERY released client (mini program =
    grep `"/api/` in nolimit-miniprogram/src/services/api.ts) with the gate
    on and assert each still passes; and a handler that starts enforcing
    entitlement must keep serving what was never paid content (coached
    programs) so a client you cannot hot-fix keeps working while the proper
    client change goes through WeChat review. Fixed server-side in e8d80aa
    (`programIsPaidContent`); mini sends the code from 8b6c178 onward.

## Quality bar — checkable, per deliverable

**Any shipped code change**
- [ ] `npx tsc -b --force` exits clean in the changed repo
- [ ] `npm run build` (vite) exits clean
- [ ] every new user-visible string has `en` + `zh` via `t()`
- [ ] every new Feishu write invalidates the right cache keys
- [ ] commit message: one-line summary + bulleted what/why; ends with the Claude co-author line
- [ ] response to Kent ends with the deploy command (his standing preference)

**New API handler**
- [ ] imported + registered in `server/index.ts` handlers map
- [ ] missing env/config returns a 4xx/503 JSON with a `message`, never a crash
- [ ] Feishu fields parsed with the defensive helpers; write responses checked for `code !== 0`
- [ ] smoke-tested with curl against a locally started server (`npm run start`), including the error paths

**Data/seed script (`scripts/*.mjs`)**
- [ ] has a `--dry` mode printing counts before any write
- [ ] re-runnable: dedupes against what's already live (by normalized name/ID)
- [ ] validates records and reports per-record failures; a bad record can't sink the batch (fall back to one-by-one)
- [ ] chunked writes with pauses; tolerant of 1254607 retries

**Bilingual content (exercises, injuries, cues, notes)**
- [ ] Chinese reads like a Chinese physio/coach wrote it (口令-style cues, clinical register)
- [ ] numbers, angles, set/rep schemes, anatomical abbreviations preserved exactly
- [ ] safety watchouts included where clinically relevant (post-op limits, pain thresholds)
- [ ] Coaching-note edits preserve the metadata lines embedded in `coaching_notes` / `coaching_cues` (circuit, unilateral, fields, set JSON); patch existing rows rather than recreate sessions. Back up and compare prescriptions before/after.
- [ ] Match the actual exercise demonstration, save English and Chinese together, invalidate the cache bus, and verify both workout-detail and library readers. Ask the coach about ambiguous dosing instead of inferring a hold duration from a rep count.

**Deploy**
- [ ] built on the server (`tsc -b --force` + `vite build`), pm2 restarted
- [ ] live URL returns 200 AND one changed behavior verified via the live API
- [ ] Kent told exactly what is now live and what (if anything) still needs him

## When uncertain — exact escalation rules

Proceed without asking: reversible code changes in scope, additive Feishu fields,
new files, re-running idempotent seed scripts, committing completed work.

Ask Kent first, always:
- deleting or renaming existing Feishu tables/columns, or bulk-deleting records
- anything that messages real clients/patients (WeChat, email, notifications)
- anything that spends money or touches payments/Stripe/orders
- ~~deploying to production~~ — Kent granted standing auto-deploy permission
  2026-08-02 ("deploy automatically from now on"): after the full local gate
  passes, run the /deploy flow without asking and report what went live.
  Never deploy past a red gate; kangfu still requires an explicit ask.
- schema/architecture pivots (e.g. starting the Postgres cutover, merging
  `postgres-migration`)
- anything touching the other product's data or credentials

When blocked mid-task (missing key, suspended account, ambiguous spec): finish
everything not blocked, then report the blocker with the exact fix Kent must do
(e.g. "recharge DeepSeek at platform.deepseek.com") — don't stall the whole task.

When a screenshot arrives: it's a bug report. Locate the component, fix root cause,
sweep for the same class of bug nearby (one screenshot usually means a category,
not one string), verify, ship.

## After every non-trivial solved problem

Run the `/extract-approach` skill before reporting the problem as done — a
solution without its learnings note is unfinished work. It routes the insight to
exactly one home (a named mistake here, a skill edit, a memory file) and ends
the report with "Learnings filed: ...". Trivial mechanical fixes are exempt;
anything involving a wrong assumption, an external-system surprise, or an
invented procedure is not.

## Environment

- Windows 11; Bash tool = Git Bash. The shell cwd resets between commands — always
  `cd` explicitly in compound commands. PowerShell 5.1 silently shreds
  multi-line `git commit -m @'…'@` here-strings containing quotes/dashes (the
  commit "succeeds" as a pathspec error you can miss mid-pipeline, and a
  deploy then ships the OLD commit) — always write the message to a temp file
  and `git commit -F <file>`, and check the commit hash actually advanced.
  Never edit source files with a PowerShell `Get-Content -Raw | -replace |
  Set-Content` roundtrip: PS5.1 reads UTF-8 as ANSI and mangles EVERY
  non-ASCII char (em-dashes → â€", CJK too) with no error — cost App.css a
  145-line mojibake diff, caught only by `git diff --stat` looking too big.
  Use the Edit tool; after any scripted file rewrite, sanity-check the diff
  size and grep the diff for `â€|Â` before committing. Two PowerShell traps
  that each cost a run on 2026-09-08: variables are CASE-INSENSITIVE, so a
  `[int]$Rows` param and a `$rows` array, or `$R` and a `foreach ($r ...)`,
  are the SAME variable and silently clobber each other — never reuse a
  name in any casing; and a BOM-less UTF-8 `.ps1` is parsed as ANSI by PS
  5.1, where mojibake curly quotes become string delimiters and the parse
  error points at an unrelated line — keep scripts ASCII-only or save with
  a BOM. Also: killing "the script's" process by matching its command line
  matches your OWN tool shell too (it contains the same string) — filter by
  `-File <name>` or record the PID at launch. RECURRED 2026-09-17 with a
  path filter (`*微信web开发者工具*` matched the PowerShell running the kill):
  always add `-and $_.ProcessId -ne $PID -and $_.Name -ne 'powershell.exe'`
  to any command-line-matching kill. Python needs `PYTHONIOENCODING=utf-8` for
  CJK output. `curl -d "…中文…"` from Git Bash mangles CJK to literal `?` — send
  Chinese payloads with `--data-binary @file` (write the file server-side or via
  printf \x escapes), never inline in the command.
- Server: `ssh nolimit` (43.132.228.109). Node/npm on server via lighthouse paths.
- Feishu creds: kangfu's local `.env` has them; **nolimit's local `.env` has only
  `DATABASE_URL`** (Postgres work) — its Feishu creds live only in
  `/opt/nolimit-training/.env` on the server. Any nolimit Feishu admin op (add
  column, seed) = scp the script to the server and run it there; local
  `npm run start` can't serve nolimit's Feishu-backed handlers. `AI_API_KEY`
  exists only on the kangfu server.
- **Visual verification without deploying**: run `npx vite --port 5199` locally
  and drive it with Playwright whose context `route()`s `**/api/**` to
  `https://trainnolimit.com` — local frontend, live read-only data. Coach pages:
  `/?view=coach&page=<Name>`; portal: `/?portal=client&client=CL-0001`. Gotchas:
  full-page screenshots paint fixed bottom navs once mid-image (artifact, not a
  bug), `position:fixed` overlays capture only one viewport — scroll the
  overlay element and take viewport shots instead — and headless Chromium
  defaults to reduced motion: pass `reducedMotion: "no-preference"` in the
  context or every entrance/transition animation (and its bugs) is skipped.
  Video-frame extraction: a server without HTTP Range support (python
  `http.server`) makes `<video>` seeks silently NO-OP in Chromium — every
  "frame" you capture is the same first frame. Load clips via
  fetch→blob→objectURL, and pixel-diff two distant timestamps before trusting
  any extracted frames (cost an hour believing four jump clips were people
  standing still).
- Skills: `/deploy`, `/bilingual-sweep`, `/seed-feishu`, `/extract-approach` in
  `.claude/skills/` cover the recurring workflows — prefer them over improvising.
