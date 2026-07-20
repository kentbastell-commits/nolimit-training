# CLAUDE.md — Operating manual for Kent's coaching platforms

Kent is a fitness coach and founder, not a programmer. He reads outcomes, not diffs.
Deliver working, verified software; explain in plain language; never hand him a list
of options when a recommendation will do. He often runs several AI agents on the
same repo at once — check `git status` before editing, stay off files another agent
is actively changing, and keep your diffs surgical in shared files.

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
- **Database is Feishu Bitable.** Table/column names in `docs/feishu-base-reference.md`.
  Handlers parse fields defensively (`fieldToText`-style helpers) because Feishu
  returns strings, numbers, arrays of `{text}`, or link objects depending on column type.
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
3. **The empty-field write bomb** — sending `""` to a Feishu Number/URL column fails
   the ENTIRE record write. Rule: omit empty values from `fields`; never send them.
4. **The link-field string** — writing a code like `"CL-1042"` to a DuplexLink
   column. Rule: DuplexLink fields take `[record_id]` arrays; always check the write
   response body, Feishu often returns 200 with `code != 0`.
5. **The stale cache** — adding a write path without invalidation. Rule: grep how
   sibling writers invalidate (`invalidateCache`) and mirror it, same keys.
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
9. **The fatal transient** — treating Feishu `code 1254607` ("Data not ready") as a
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
    it's driven by the machine's FREE RAM, not the config cap (it fired at
    `--maxWorkers=2` with 1.2GB free; other apps eat the RAM, not node). Rule:
    single file passes → check free RAM → step down `--maxWorkers`; `1` always
    fits (full 98-file suite ≈75s). Never touch test code off a phantom run.
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
    flow and made the nav overlap it — invisible from App.css.)
19. **The future-state privacy promise** — writing the privacy policy as if a
    planned mainland/Postgres migration is already complete. Rule: disclose the
    live data path until migration is verified, record temporary cross-border
    consent, then remove that consent and update the policy in the cutover pass.

20. **The invisible crawler head** — adding runtime or Express SEO metadata when
    production Nginx serves `dist` directly. Rule: inspect the live delivery path,
    emit static route HTML at build time, and verify raw HTML rather than the DOM.

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
32. **The phantom column** — writing a field name the Feishu table doesn't have
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
- deploying to production — **only deploy when he says deploy**; otherwise commit
  and end with the deploy command
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
  `cd` explicitly in compound commands. Python needs `PYTHONIOENCODING=utf-8` for
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
