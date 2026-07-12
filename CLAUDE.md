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
  CJK output.
- Server: `ssh nolimit` (43.132.228.109). Node/npm on server via lighthouse paths.
- Feishu creds: kangfu's local `.env` has them; **nolimit's local `.env` has only
  `DATABASE_URL`** (Postgres work) — its Feishu creds live only in
  `/opt/nolimit-training/.env` on the server. Any nolimit Feishu admin op (add
  column, seed) = scp the script to the server and run it there; local
  `npm run start` can't serve nolimit's Feishu-backed handlers. `AI_API_KEY`
  exists only on the kangfu server.
- Skills: `/deploy`, `/bilingual-sweep`, `/seed-feishu`, `/extract-approach` in
  `.claude/skills/` cover the recurring workflows — prefer them over improvising.
