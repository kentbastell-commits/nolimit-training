# NX//LIMIT Pilot Visual Audit

Date: 2026-08-04  
Scope: coaching web app (desktop and mobile) and WeChat Mini Program  
Purpose: identify visual, interaction, content, and consistency risks before the pilot

## Executive verdict

The product already has a recognizable premium visual system: warm off-white surfaces, black and gold brand colors, strong cards, clear borders, and consistent spacing. It does not need a redesign before the pilot.

The biggest threat to tomorrow's pilot is not the base aesthetic. It is the combination of:

1. unsafe or confusing pilot state;
2. stale/test data that makes polished screens feel unfinished;
3. excessive information scale on the coaching site's mobile layout;
4. Chinese/English mixing inside the Mini Program;
5. a few long or ambiguous mobile flows.

Subjective readiness scores from the tested build:

| Area | Score | Assessment |
|---|---:|---|
| Brand identity | 8/10 | Distinctive and cohesive |
| Desktop coaching UI | 8/10 | Polished, dense, operational |
| Mobile coaching UI | 5.5/10 | Attractive but substantially oversized |
| Mini Program visual system | 7.5/10 | Consistent and touch-friendly |
| Mini Program content consistency | 5/10 | Stale values and mixed language undermine trust |
| Pilot readiness | 5.5/10 | Fix the critical state/data items first |

## What was verified

### Coaching web app

Playwright rendered 11 routes at desktop (1440 × 900) and mobile (390 × 664):

- Clients
- Review
- Teams
- Coaches
- Orders
- Revenue
- Library
- Workouts
- Digital
- Tests
- Check-ins deep link

Result: all genuine routes returned HTTP 200, produced no browser console errors, and had no document-level horizontal overflow.

### WeChat Mini Program

The production-shaped WeChat build completed successfully. Because a native Mini Program is not a browser DOM, its pages were rendered and captured through the official WeChat DevTools automation runtime. Nineteen routes/flows were checked, including login, home, onboarding, calendar, workout, check-in, workload, inbox, forms, history, numbers, profile, messaging, the store, program browsing, coaching checkout, and enquiry.

Result: all requested pages opened in the WeChat simulator and the automation run recorded no runtime exceptions.

## Critical before the pilot

### P0 — Arm coaching access protection

An unauthenticated request to the coaching clients API currently returns HTTP 200. The public holding page does not secure `/api/` routes. This is not an aesthetic defect, but it is the highest-risk pilot issue because the expected coaching-key gate is not active.

Recommendation: set and verify the production `COACH_ACCESS_KEY`, restart the service, then confirm an unauthenticated `/api/clients` request is rejected and the coach UI asks for the key.

### P0 — Clean the pilot account and staging content

Several visible values make the product look broken or synthetic:

- Calendar labels a past workout as the “next” workout and offers to jump to that week.
- Pending forms show dates that have already passed.
- Training history includes `Unnamed Exercise` and an implausible `46307 × 5kg` entry.
- Store stages are listed in the order 1, 2, 4, 3.
- A four-stage bundle is labelled as one week.
- A completed, locked workout shows `0/3` sets completed.
- Coaching Review contains obvious battery/test records and a large stale queue.
- The workout library includes a program named `bb`.

Recommendation: use one intentionally curated pilot client with a current week, realistic history, one active program, translated content, and a nearly empty coach-review queue. Add server-side validation for impossible reps and weights, missing exercise names, stage ordering, and completed-workout/log mismatch.

### P0 — Make the pilot language internally consistent

Chinese mode still contains English content in high-attention areas:

- workout overview and section names (`Test`, `Strength`);
- prescriptions such as `/side`;
- coach responses;
- form names and categories;
- some exercise names and performance labels.

Recommendation: define one locale rule: every user-facing label and server-supplied content should use the selected language, with an explicit bilingual fallback only where translation is unavailable. A bilingual fallback should use a consistent two-line pattern, not an accidental mixture within a sentence or card.

### P0 — Verify coaching entry before sending the pilot link

The `.com` coaching surface is currently behind the launch holding page, while the `.cn` root is a coming-soon page. The app itself is reachable internally, but the pilot coach needs a deliberate, tested entry path.

Recommendation: test the exact mobile link in a private browser session after enabling the coaching key. The expected sequence should be: secure URL → key prompt → coaching dashboard. Do not send a link until that exact flow works outside the server session.

## High-impact aesthetic and flow improvements

### P1 — Reduce the coaching site's mobile scale

The mobile coaching UI looks like a desktop dashboard magnified for a phone. Titles, descriptions, summary boards, and buttons occupy several screens before the operator reaches the primary task.

Examples:

- Clients delays search and roster content behind the title, actions, summary cards, tabs, and filters.
- Review delays review items behind a large hero and two-column statistics.
- Library places large `610` and `131` boards before the exercise list.
- Workouts places the program selector near the bottom of the first viewport.
- Orders, Revenue, Coaches, Teams, and Tests repeat the same oversized pattern.

Recommendation:

- cap mobile page titles around 36–44 px rather than the current poster-like scale;
- compress descriptions to one or two lines;
- replace large summary boards with a single horizontal KPI strip or collapsible summary;
- put the page's main action/search/filter within the first viewport;
- use sticky search/filter controls on roster and library pages;
- keep a 48 px minimum touch target without making every component visually dominant.

### P1 — Simplify the wellness check-in

The check-in repeats a two-row 1–10 grid for each wellness dimension. The result is roughly 50 visually identical tap cells and an unnecessarily long form.

Recommendation: use a compact one-line scale, five labelled states, or one question per step. Always show the selected value and its meaning, for example `7 — good`, so the user is not choosing an unexplained number.

### P1 — Fix checkout and legal affordances

The fixed coaching checkout CTA sits over the bottom of a long consent area. The enquiry page displays the legal address as literal parenthesized text instead of a recognizable link.

Recommendation: add enough bottom safe-area padding that the final consent control can sit fully above the fixed CTA. Render privacy and terms as underlined/tappable links with a visible checkbox and validation message. Verify this on a real iPhone-sized viewport and a device with a home indicator.

### P1 — Replace the store's weakest imagery

The digital-program card uses a small, blurry screenshot of the coaching dashboard. Its text is microscopic and the visual treatment does not match the stronger photographic card beside it.

Recommendation: replace it with purpose-built program artwork or a clean mobile workout mockup. Use one consistent image ratio, crop treatment, and overlay system across every store card.

### P1 — Repair the completed-workout visual state

The workout player can show all of these at once: completed, locked, `0/3`, and an empty progress bar. Even if caused by data, the UI should not render a contradictory state.

Recommendation: derive the headline state from the same source as set completion. If the assignment says completed but logs are unavailable, show `Completed — details unavailable` and hide the numeric progress instead of displaying zero.

## Secondary consistency improvements

### P2 — Standardize disabled controls

Disabled buttons on Login, Workload, Message, Onboarding, and checkout use pale/gray treatments with weak contrast. They can look unavailable without explaining why.

Recommendation: use one disabled token with accessible contrast, reduced emphasis, and nearby helper text describing what is required to enable the action.

### P2 — Remove off-brand emoji as status icons

Green checks, fire, stars, and other emoji introduce inconsistent platform-dependent colors into an otherwise controlled black/gold system.

Recommendation: use a small monochrome brand icon set. Reserve emoji for conversational coach messages, not structural status or pricing controls.

### P2 — Reduce dead space in sparse Mini Program states

Login, Home, Message, and Store Categories leave a very large empty lower canvas. The spacing is clean, but these views can feel unfinished.

Recommendation: do not fill space decoratively. Tighten the vertical rhythm, add one useful contextual element where appropriate, and keep primary content closer to the upper third. Useful examples include the next action, response expectation, recent item, or category description.

### P2 — Hide technical identifiers

Profile exposes a raw client code such as `CL-0001`. This is useful for support but looks internal.

Recommendation: move it into a collapsed `Account details` or `Support information` area with a copy button.

### P2 — Clarify technical training terms

`RPE`, `estimated 1RM`, and similar terms are useful but not universally understood.

Recommendation: add a small tappable explanation and keep the plain-language meaning beside the abbreviation on first use.

### P2 — Tighten desktop action targets and truncation

The coaching desktop layout contains many 20–38 px icon buttons and dense row actions. Workout focus text is visibly truncated in several rows.

Recommendation: use at least 40 × 40 px for frequently used icon actions, always provide a tooltip/accessibility label, and let the workout focus column wrap to two lines before truncating.

### P2 — Normalize page-header structure

Digital places its tab switcher above the page header, visually detached from the rest of the screen. Other sections put title and actions first.

Recommendation: use one shared page-header component in this order: eyebrow, title/action row, one-line description, local tabs, compact KPIs, content.

### P2 — Make horizontal scrolling discoverable

The Library category strip works horizontally on mobile, but discovery relies on a partially cut-off chip.

Recommendation: add a subtle fade/edge mask and ensure the selected category scrolls fully into view.

### P2 — Remove or support the stale Check-ins deep link

`?view=coach&page=Check-ins` silently opens Clients because Check-ins is not in the allowed page list.

Recommendation: either add a real Check-ins route or redirect explicitly to Review with the Check-ins queue selected. Silent fallback makes links feel unreliable.

## Recommended design rules

1. **First viewport rule:** every mobile page must expose its primary action or primary data within the first screen.
2. **One locale per layer:** navigation, server content, exercises, forms, coaching messages, and units follow the selected language; bilingual fallback uses one shared component.
3. **One state source:** completed, pending, locked, progress, and CTA state must derive from a consistent record.
4. **One mobile density tier:** compact operational UI for coaches; generous but task-focused UI for clients.
5. **One icon language:** monochrome brand icons for product states; no platform emoji in structural UI.
6. **One empty-state pattern:** short explanation, one next action, no unexplained dead space.
7. **One content-quality gate:** reject or flag impossible values, missing names, expired pending items, raw test labels, and inconsistent durations before they reach clients.

## Suggested order of work

### Before the pilot

1. Enable and verify coaching authentication.
2. Curate one clean pilot account and remove stale/test content from every screen it can reach.
3. Fix the past-date calendar behavior and completed-workout `0/3` contradiction.
4. Translate the workout, forms, messages, and exercise labels visible to the pilot client.
5. Verify the checkout consent area and the exact coaching mobile entry link on physical devices.

### Immediately after the pilot starts

1. Compress coaching mobile headers and KPI blocks.
2. Redesign the check-in scale.
3. Replace store imagery and normalize card order/duration.
4. Standardize disabled controls, icons, empty states, and page headers.
5. Add automated visual snapshots for the clean pilot account to prevent regressions.

## Evidence

- Coaching Playwright screenshots and measurements: `test-results/pilot-visual-audit`
- Mini Program screenshots: `C:\Users\kentb\nolimit-miniprogram\test-results\pilot-visual-audit`
- Coaching audit runner: `scripts/visual-audit-playwright.mjs`
- Mini Program audit runner: `C:\Users\kentb\nolimit-miniprogram\scripts\pilot-visual-audit.cjs`

