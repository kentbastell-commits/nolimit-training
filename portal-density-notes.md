# portal-density-notes.md — Client portal "de-chunking" pass

Goal: the client (athlete) portal looked visually "chunky" — oversized fonts,
thick padding, large border-radius, big gaps — so an athlete on a phone had to
scroll a long way to see anything. This pass tightens the portal's visual
density without touching the coach app or changing any behavior.

## Result (measured)

Full-page mobile screenshot (iPhone 13, live data via CL-0001):

| Screen | Before height | After height | Reduction |
|---|---|---|---|
| Portal Home (首页) | 3423 px | 2433 px | ~29% |

Everything on the first viewport now fits with far less scrolling. Bottom-nav
touch targets were deliberately left at their existing size (≥46 px) for
accessibility.

## Method

The portal has **no spacing/radius/font design tokens** — every size is a
hardcoded literal. All portal markup is scoped under `.clientPortalApp` and the
target classes (`clientTop`, `wellnessCard`, `portalHomeTabs`, `clientHomePanel`,
`clientProgramCard`, `clientPortalTrainingHero`, `coachInbox*`) render **only**
in the client portal — the coach app never mounts these components — so editing
the literals in place is safe for the coach UI.

Applied a consistent ~20–25% cut to the oversized values (headings, card
padding, CTA, gaps), verified visually with before/after screenshots served from
a local `vite preview` build with `/api` routed to production for real data.

## Every value changed

### `src/App.css`
| Selector | Property | Before | After |
|---|---|---|---|
| `.clientPortalApp .clientTop` | gap | 16px | 10px |
| `.clientPortalApp .clientTop` | padding-bottom | 12px | 8px |
| `.clientPortalApp .clientTop h1` (greeting) | font-size | 34px | 26px |
| `.clientPortalApp .clientTop h1` (≤720px, new rule) | font-size | 34px (scope won over the 28px coach rule) | 23px |
| `.clientHomeGrid` | gap | 16px | 11px |
| `.clientHomeGrid` | margin-top | 18px | 12px |
| `.clientPortalApp .clientPortalTrainingHero` | padding | 16px 18px | 14px 16px |
| `.clientPortalApp .clientPortalTrainingHero h2` | font-size | 28px | 22px |

### `src/appInterior.css`
| Selector | Property | Before | After |
|---|---|---|---|
| `.portalHomeTabs` | padding / margin-bottom | 4px / 14px | 3px / 8px |
| `.portalHomeTab` | padding / font-size | 10px 8px / 14px | 7px 8px / 13px |
| `.wellnessCard` (readiness card) | padding / radius / margin-bottom | 16px / 16px / 14px | 13px 14px / 12px / 8px |
| `.wellnessPrompt strong` | font-size | 17px | 15px |
| `.wellnessCta` (gold CTA) | margin-top / padding / font-size | 12px / 11px 18px / 15px | 10px / 9px 16px / 14px |
| `.clientHomePanel` (all home cards) | padding | 18px | 13px 14px |
| `.clientHomePanelHeader` | margin-bottom | 14px | 9px |
| `.clientHomePanelHeader h2` (card headings) | font-size / line-height | 24px / 1.05 | 18px / 1.1 |
| `.clientProgramCard` | padding | 16px | 14px |
| `.clientProgramCard h3` | font-size / line-height | 24px / 1.05 | 19px / 1.1 |
| `.coachInboxList` | gap | 10px | 8px |
| `.coachInboxItem` | radius / padding | 12px / 12px 14px | 10px / 10px 12px |

## Untouched on purpose

- Bottom tab bar (`.mobileClientBottomNav`) — kept at min-height 46px for touch.
- EN/中文 language toggle — already proportionate (13px / 34px).
- Colors, weights, fonts, and all coach-app styles — no changes.

## Verification

- `npx tsc -b --force` clean, `npm run build` clean.
- Unit suite green (95 files, 503 tests) — CSS-only change, no test impact.
- Before/after full-page screenshots on iPhone 13 width, Home + My Plan tabs,
  with real production data.

## Not yet deployed

Committed on `main`; deploy is Kent's call.
