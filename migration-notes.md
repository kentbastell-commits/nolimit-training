# migration-notes.md — Full test coverage migration

Goal: every module in this repo has a test file; the full suite (unit + e2e)
passes. This file documents every change made to get there.

## What "module" means here

| Module group | Count | Test location | Runner |
|---|---|---|---|
| `api/*.ts` handlers (57) + `api/_*.ts` helpers (5) | 62 | `tests/unit/api/<name>.test.ts` | vitest (node env) |
| `src/*.tsx` components (34) + `src/main.tsx` | 35 | `tests/unit/components/<Name>.test.tsx` | vitest (jsdom env) |
| `src/appCore.ts`, `src/i18n.ts` (pure logic) | 2 | `tests/unit/logic/<name>.test.ts` | vitest (node env) |
| `server/index.ts` | 1 | `tests/unit/server/index.test.ts` (static registration checks — importing it binds a port) | vitest (node env) |
| End-to-end flows | — | `tests/*.spec.ts` (pre-existing) | Playwright vs live prod (read-only) |
| `scripts/*.mjs` | excluded | operational one-off tools with `--dry` modes; not app modules | — |

## Changes made

### New dev dependencies (`package.json`)
- `vitest`, `@vitest/coverage-v8` — unit test runner (Vite-native, reuses the app's transform pipeline)
- `jsdom` — DOM environment for component tests
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` — component render/assert/interact

### New npm scripts (`package.json`)
- `test:unit` → `vitest run`
- `test` → `vitest run && playwright test` (the full suite)
- `test:e2e` unchanged

### New config: `vitest.config.ts`
Two projects:
- **node**: `tests/unit/{api,logic,server}/**/*.test.ts` — handlers and pure logic, no DOM
- **dom**: `tests/unit/components/**/*.test.tsx` — jsdom + `tests/unit/setup.dom.ts`

### Changed config: `playwright.config.ts`
Added `testMatch: /.*\.spec\.ts/` so Playwright ignores the new `tests/unit/**/*.test.ts*`
files (its default pattern would have tried to run them). Playwright behavior for the
existing four spec files is unchanged.

### New shared test infrastructure
- `tests/unit/helpers.ts` — `makeReq`/`makeRes` fakes for the Vercel-style handlers;
  `stubFetch(routes)` scripted global fetch that **throws on any unmatched URL** so a
  unit test can never silently hit real Feishu; `stubFeishuEnv()` for the env vars
  handlers read.
- `tests/unit/setup.dom.ts` — jest-dom matchers; default safe fetch stub (components
  fetch on mount); jsdom shims for `matchMedia`, `ResizeObserver`,
  `IntersectionObserver`, `scrollTo`, `scrollIntoView`; auto `cleanup()` +
  `unstubAllGlobals()` after each test.

### New test files
One per module per the table above (written by parallel agents against shared
exemplars `tests/unit/api/exercises.test.ts` and
`tests/unit/components/ExerciseModal.test.tsx`). Conventions:
- Handler tests assert at minimum the method/param validation path AND one real
  behavior (happy-path Feishu mapping with stubbed fetch, or error JSON shape).
- Component tests render with minimal `any`-bag props and assert visible output;
  interactions tested where cheap.
- `api/_cache.ts` is module-level shared state: tests use unique keys, handler
  cache-bypass query params (`debug=1`), or explicit `invalidateCache` between tests.
- No source file under `api/`, `src/`, or `server/` was modified — tests adapt to
  the code, not the reverse. (Any exceptions are listed in "Caveats" below.)

## How to run

```bash
npm run test:unit    # all unit tests (fast, no network)
npm run test:e2e     # Playwright vs https://trainnolimit.com (read-only)
npm test             # both
```

## Results

(Filled in at completion — see the green run pasted in the session chat.)

## Caveats

(Filled in at completion.)
