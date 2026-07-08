# store-redesign-notes.md — Public store cinematic redesign

Goal: restyle the public store (`src/StorePage.tsx`) to the dark-cinematic + gold
design that matches the landing page (`LandingPage.tsx`), as a **view-layer change
only** — every prop, handler, and data source stays wired.

## What changed

- **`src/StorePage.tsx`** — rewrote the nav, hero, sports catalog, coaches section,
  and footer; wrapped sections in framer-motion scroll reveals; added a category
  icon map. The program cards, search/season toolbar, how-it-works, showcase,
  testimonials, FAQ, and contact keep their existing markup/classes (restyled via
  CSS). The checkout / preview / launcher / find-portal modals and every derived
  helper are **untouched**.
- **`src/StorePageV3.css`** — new stylesheet imported after `StorePage.css`,
  scoped under a new `.storePageV3` root class. It overrides the redesigned
  sections while leaving the modal styles in `StorePage.css` fully intact.
- Motion mirrors the landing: `EASE = [0.16,1,0.3,1]`, `staggerParent`/`rise`
  variants, `whileInView` reveals, hero drift/bob/chip via CSS keyframes.
  Reduced-motion: framer variants are dropped (`sectionReveal = {}`) and the CSS
  animations are disabled via `@media (prefers-reduced-motion: reduce)`.

## Data stays real (no hardcoding)

All content still renders from props: `programs` → `filteredStorePrograms` cards
(price/duration/category/season/bundle logic unchanged), `coaches` → up to two
active coach cards, `storeReviews` → testimonials (empty-state guard kept). The
category filter, search, season select, program modal + checkout steps, add-ons,
find-my-portal, launcher, language toggle, and FAQ accordion all use their
original handlers.

## Two deviations from the design handoff (documented)

1. **Gold wordmark asset** — the handoff's `nl_wordmark_gold_t.png` wasn't in the
   repo, so the nav/footer use the existing `nl_wordmark_black.png` (gold on a
   black plate) with `mix-blend-mode: screen`, which drops the black into the dark
   nav/footer and shows a clean gold wordmark — same technique as the splash.
2. **Coach portraits** — the `Coach` record has no portrait/image field, so the two
   coach cards use the branded gold initials avatar (not a photo). When a photo
   field is added to coaches later, swap the avatar for an `<img>`.

## Gotcha fixed

`App.css` `.storePageV2 h1,h2,h3 { color: var(--public-ink) }` (and a bolder `.zh`
variant) loads on the public store and force dark ink on all headings. The dark
hero/coach/contact headings needed higher-specificity light-color rules
(`.storePageV3 .storeHeroV3 .storeHeroTitleV3`, etc.) to win — a plain
`.storeHeroTitleV3` (0,1,0) loses to `.storePageV2 h1` (0,1,1).

## Verification

- `npx tsc -b --force` clean, `npm run build` clean.
- Unit suite green (97 files, 511 tests); StorePage test updated for the new nav.
- Screenshotted hero, catalog, program cards, and coaches against **live prod
  data** (local build, `/api` proxied to production): dark cinematic hero with
  cream+gold Bebas headline + phone mockup + bilingual chip, icon category tiles,
  branded program cards with gold prices, dark coaches brand moment. Checkout /
  preview / launcher modals unaffected.

## Not yet deployed

Committed on `main`; deploy is Kent's call.
