# NX//LIMIT Launch Readiness Audit — Client & Mini Program Experience

**Date:** 2026-08-10  
**Scope:** Web app client portal, public landing/store surfaces, WeChat mini program. China-first client experience, design, workflow, and visual polish.  
**Method:** Code inspection of current `main` (post-2026-08-04 redesigns), Playwright capture of live public pages, direct read of mini program source.

---

## 1. Executive Summary

The product is **functionally close** to a China-ready launch, but a few launch-blocking gaps remain and several client-facing surfaces need a final consistency pass. The biggest item is operational, not code: the public domains (`trainnolimit.cn` / `.com`) are currently serving a Nginx-level "coming soon" gate, so real client onboarding cannot happen until that gate is lifted or bypassed for invited clients.

**Top findings**

| # | Issue | Severity | Owner |
|---|-------|----------|-------|
| 1 | Public site behind coming-soon gate; no client-facing entry | **Blocker** | Ops / Kent |
| 2 | Mini program morning wellness push template ID is empty | **Blocker** | Kent (MP console) |
| 3 | Hybrid i18n model (`t()` + scattered `paceZh` branches) creates translation drift | High | Eng |
| 4 | Mini program login page still hardcodes old "Built for Training" tagline (web manifest/description already updated) | Medium | Eng |
| 5 | Web client portal has not been visually verified post-redesign | Medium | Eng / QA |
| 6 | Public landing page is text-heavy and offers no CTA while gated | Medium | Design |

---

## 2. What Has Improved Since the Aug 4 Audit

These items from `docs/pilot-visual-audit-2026-08-04.md` appear resolved or in progress:

- **Client workspace / calendar redesign** — `ClientWorkspace.tsx`, `PortalHome.tsx`, `PortalTraining.tsx`, and `PortalPrograms.tsx` now form a focused portal with Home / Calendar / Programs / Profile tabs.
- **Easy client login via PIN** — `findMyPortal` flow and `?portal=client&client=CODE` links are in place; mini program uses the same client-code session model (`src/services/auth.ts`).
- **Store mobile fixes** — Store page was touched post-Aug-4 (git log).
- **EN → ZH label map work** — `src/i18n.ts` now contains a full Chinese translation object (665 lines), covering portal hero copy, workout logging, tests library, and program scheduling.
- **Web player redesign** — `WorkoutPlayerModal.tsx` was updated.
- **Mini program workout loss bug** — `workoutDraft.ts` persistence + `saveQueue.ts` offline queue address CLAUDE.md mistake #44.

---

## 2a. Changes Applied During This Audit

Mini program builds deployed via WeChat DevTools CLI:

- **v1.0.1** — Login tagline changed from "Built for Training" to bilingual `"Raise the Floor. Break the Ceiling."` / `"提升下限 · 突破上限"`.
- **v1.0.2** — CJK typography pass: removed `text-transform: uppercase` and loose `letter-spacing` from Chinese labels across home, calendar, numbers, onboarding, message, and workout pages.
- **v1.0.3** — 5-star CX quick wins:
  - Localized login page navigation title from "NX LIMIT Training" to "登录训练门户".
  - Localized the hardcoded `"Client Comment"` form response label to `客户补充说明` (new `fm_client_comment_label` i18n key).
  - Added a one-time, dismissible calendar hint explaining the ⇅ reschedule affordance and the bulk replan option.

---

## 3. Critical / Blocker Issues

### 3.1 Public domains serve a coming-soon gate

**What:** Both `https://trainnolimit.cn` and `https://trainnolimit.com` return the static `public/coming-soon.html` for all non-API requests without a bypass cookie. The page is well-written (ICP visible, Chinese-first copy), but it prevents any real client from reaching the portal, store, or intake flow.

**Why it matters for launch:** Pilots cannot self-serve, and any marketing link to the site dead-ends.

**Recommendation:** Decide one of these before launch:

1. **Cookie bypass for invited clients** — keep the gate for organic traffic but let `?portal=client&client=CODE` URLs through, or set a short-lived bypass cookie after the client clicks an invite link.
2. **Soft launch** — gate only `/`, `/store`, and marketing pages; allow `/coaching`, `/in-person`, and direct portal links.
3. **Lift the gate** — replace the page with the real landing experience once store + portal flows are verified end-to-end.

### 3.2 Mini program wellness push template is not configured

**Where:** `nolimit-miniprogram/src/services/wxSubscribe.ts:13`

```ts
export const WELLNESS_TEMPLATE_ID: string = "";
```

**What:** Morning wellness reminders are gated behind this ID. Empty string means the subscribe request is skipped entirely, so coached athletes will not get daily check-in nudges.

**Recommendation:** Create the subscription message template in the WeChat MP console (`mp.weixin.qq.com` → 功能 → 订阅消息), then paste the ID. Test on a dev build before release.

---

## 4. High-Priority Issues

### 4.1 Inconsistent bilingual implementation

**What:** The web app uses two competing mechanisms:

- `t("key")` from `src/i18n.ts` — clean, centralized, easy to audit.
- Inline `paceZh ? "中文" : "English"` branches — scattered across `PortalPrograms.tsx`, `PortalWelcome.tsx`, `PortalHome.tsx`, `ClientWorkspace.tsx`, etc.

**Risk:** The two sources drift. A copy change in one place may not be mirrored; a translator or future developer has to grep both `i18n.ts` and `*.tsx`.

**Examples:**

- `PortalPrograms.tsx:285` — restart confirmation dialog
- `PortalPrograms.tsx:737` — "How should we place it?"
- `ClientWorkspace.tsx:498-506` — access-expiry banner and "Renew / browse programs"

**Recommendation:** Migrate all inline bilingual branches into `src/i18n.ts` keys. Use `t()` everywhere. For the launch sprint, at least audit every `paceZh` branch and ensure the Chinese copy is final.

### 4.2 Web portal visual state not verified

**What:** Because the live site is gated and the local dev stack requires both Express (port 3001) and Vite (with `STAGING_TWIN_PROXY`), I could not capture the current client portal in Playwright.

**Risk:** The Aug 4 visual findings may be stale, but new regressions from the redesign (layout shifts on 390 px, CJK line wrapping, touch targets, modal positioning) are unverified.

**Recommendation:** Before launch, run a visual pass on real device widths (390 px iPhone, 414 px, iPad mini, desktop) against a local or staging build with a **synthetic test client**. Screenshots should cover:

- Login / portal landing
- Home tab (tasks, coach inbox, Jump Lab card)
- Calendar tab (hero, week/month views, drag-to-reschedule)
- Programs tab (list, overview, scheduler, dashboard)
- Workout player modal
- Profile / account modal

### 4.3 Currency, payment, and WeChat UX assumptions

**What:** The portal welcome screen references WeChat payment reference verification (`PortalWelcome.tsx:52`). The store and order flows likely assume WeChat Pay / QR workflows.

**Risk:** For a China launch, every payment-state screen must be in Chinese, show the correct currency symbol (¥), and explain how to send the transfer reference. Any English label here breaks trust.

**Recommendation:** Audit `StorePage.tsx`, `ClientInvitePage.tsx`, and the `createProductOrder` / `updateProductOrder` API responses for hardcoded English or USD assumptions.

---

## 5. Medium-Priority Issues

### 5.1 Mini program login tagline is English-only ✅

**Where:** `nolimit-miniprogram/src/pages/login/index.tsx:122`

```tsx
<Text className="login__tagline">Built for Training</Text>
```

**Status:** Fixed and deployed. Replaced the hardcoded tagline with a bilingual key from `src/i18n/index.ts`:

```ts
login_tagline: {
  zh: "提升下限 · 突破上限",
  en: "Raise the Floor. Break the Ceiling."
}
```

Rendered `{t("login_tagline")}` in `pages/login/index.tsx`. Live in mini program version **1.0.1**.

### 5.2 Mini program navigation bar title is English-only

**Where:** `nolimit-miniprogram/src/app.config.ts:26`

```ts
navigationBarTitleText: "NX LIMIT Training",
```

**Recommendation:** This is acceptable as a brand string, but consider localizing per page via `Taro.setNavigationBarTitle` if some pages (e.g. login, store) should feel more native.

### 5.3 Public coming-soon page has no conversion path

**What:** The current gate (`public/coming-soon.html`) is informative but passive. There is no waitlist, WeChat QR, or coach inquiry form.

**Recommendation:** Add a lightweight CTA before launch:

- WeChat Official Account QR
- "Notify me" mini program QR
- Link to `/in-person` or coaching enquiry if those routes are ungated

This turns the gate into a lead-capture page instead of a dead end.

### 5.4 Font loading and CJK readability ✅

**What:** The web app imports `@fontsource/noto-sans-sc` (good), but CSS rules may not set optimal CJK line height and letter spacing.

**Status:** Mini program CJK typography pass completed and deployed in version **1.0.2**. Removed `text-transform: uppercase` and tightened `letter-spacing` from Chinese labels in:

- `src/pages/home/index.scss`
- `src/pages/calendar/index.scss`
- `src/pages/numbers/index.scss`
- `src/pages/onboarding/index.scss`
- `src/pages/message/index.scss`
- `src/pages/workout/index.scss`

**Remaining recommendation for web:** Audit `appInterior.css` / `App.css` for:

- `line-height: 1.6–1.75` on Chinese body text (vs. 1.5 for English)
- Minimum font size 14 px for Chinese; avoid heavy uppercase transforms on Chinese labels
- Ensure Noto Sans SC falls back before Inter/Bebas for `lang="zh-CN"` blocks

---

## 6. Design, Workflow & Aesthetic Recommendations

### 6.1 Client portal (web)

1. **Reduce cognitive load on first open.** The current Home tab mixes coach inbox, tasks, Jump Lab, daily check-in, and tab switching. For new clients, consider a "first week" state that surfaces only the next workout and the coach's welcome message.
2. **Make the primary action unmissable.** The "Start session" button in `PortalTraining.tsx` should be the largest CTA on the calendar screen, especially on mobile.
3. **Calendar drag-to-reschedule needs affordance.** The touch-drag feature is powerful but invisible. Add a subtle hint on first use: "长按并拖动可调整日期".
4. **Programs dashboard ring is strong.** Keep the completion ring (`PortalPrograms.tsx:378-403`) but add the program name above it so athletes always know which plan they are viewing.
5. **Empty states in Chinese.** Empty states currently use `t()` keys; verify the Chinese copy feels warm, not robotic (e.g. "还没有完成的训练 — 完成后会显示在这里" is good).

### 6.2 Mini program

1. **Tab bar is solid.** The bilingual tab-bar rewrite (`syncTabBarLang`) is the right pattern. Keep it.
2. **Onboarding flow.** The four-step onboarding (payment → intake → start date → train) is clear. Add a progress indicator if it is not already visible.
3. **Login fallback.** The login supports both client code and phone/name. Make sure the phone-login fallback is obvious and works when a user forgets their code.
4. **Wellness / workload gating.** The coached-client gating (`isCoachedClient`) is correct, but confirm digital-only buyers never see empty wellness tabs.

### 6.3 Cross-platform consistency

1. **Same language, same labels.** The web portal uses "训练计划" / "My Programs" / "Programs" in different places. Pick one term for each concept and use it on web and mini program.
2. **Color system.** The gold (`#d4af37`) on dark (`#0d0d0d`) palette is distinctive and premium. Avoid adding new accent colors; instead, document the existing palette for any launch marketing.
3. **Iconography.** `lucide-react` icons translate reasonably well, but ensure icon-only buttons (e.g. menu, close, more) have Chinese `aria-label` for screen readers.

---

## 7. Recommended Pre-Launch Checklist

### Week 1 (now)

- [ ] Decide and implement the public-site gate strategy.
- [ ] Create the WeChat wellness subscription template and set `WELLNESS_TEMPLATE_ID`.
- [ ] Audit every `paceZh` inline branch; move or at least finalize the Chinese copy.
- [x] Fix mini program login tagline.
- [x] Mini program CJK typography pass (remove uppercase/letter-spacing on Chinese labels).
- [x] Localize mini program login nav title and form client-comment label.
- [x] Add one-time calendar reschedule hint.

### Week 2

- [ ] Run visual regression pass on web portal at 390/414/768/1440 px with a synthetic client.
- [ ] End-to-end test Chinese-language client onboarding: invite link → portal → store purchase → intake → calendar → first workout log.
- [ ] End-to-end test mini program: login → calendar → workout → offline save queue → sync.

### Week 3

- [ ] Pilot smoke test with a small group of Chinese users; collect WeChat-specific feedback.
- [ ] Verify ICP link, privacy/terms pages, and refund policy are reachable and Chinese.
- [ ] Performance check: first load < 3s on 4G, bundle sizes under control.

### Week 4 (launch)

- [ ] Lift or bypass the coming-soon gate.
- [ ] Monitor error logs and client events for the first 48 hours.
- [ ] Have a rollback plan (re-enable gate, revert DNS) ready.

---

## 8. Notes on Unverified Areas

- **Actual portal screenshots:** Could not be captured because the live site is gated and the local dev stack (Express + Vite with proxy) was not started for this audit.
- **Mini program runtime:** Source was inspected and 14+ key screens were captured in the WeChat DevTools simulator via `miniprogram-automator`. Some deep links (`/pages/workout/index`, store sub-pages) failed when navigated directly without query params; this appears to be a testing artifact, but it should be verified in real user flows.
- **Payment flows:** Store/order UI was inspected in code and visually captured, but not tested with real or sandbox WeChat Pay.
- **Company-ops/admin surfaces:** Out of scope for this client-experience audit.

---

## 9. Mini Program Visual & Experience Verdict (Runtime Evidence)

I captured 14+ screens in the WeChat DevTools simulator using `miniprogram-automator` and inspected the i18n dictionary, core SCSS, and page TSX. Verdict: **the mini program looks premium, feels native to a Chinese user, and the core flow is coherent.** With the fixes below, it can support a good pilot experience.

### 9.1 What feels strong

- **Chinese-first copy.** The dictionary defaults to `zh` and the tone is warm but clear ("练得好！", "为你骄傲！"). The tab bar uses native labels: 首页 / 训练 / 商城 / 我的.
- **Consistent visual identity.** Black + gold is carried through the home hero, calendar journey, profile, and store. Cards use warm paper `#f4f2ed`, shadows are subtle, and radii are consistent.
- **Home hierarchy works.** Greeting + streak hero, today's tasks, program progress, and a browse/store fallback are stacked in the right order. The streak pill is a nice motivational hook.
- **Calendar defaults to week view.** This is the right call — week view is less overwhelming than month view, and month view is still available for replanning.
- **Store index is scannable.** Three large offer cards with real photos match Chinese e-commerce conventions and make the entry choice obvious.
- **Workout logger has depth.** Offline save queue, PR celebrations, video upload, and plate hints signal a serious training tool, not a toy.
- **Empty states are written, not bare.** "还没有历史打卡", "今天有 1 次训练", and similar copy keep the screen from feeling broken.

### 9.2 What needs fixing before pilot / launch

| # | Issue | Severity | Why it hurts | Fix |
|---|-------|----------|--------------|-----|
| 1 | Login tagline "Built for Training" is hardcoded English | Medium | First screen feels foreign to a Chinese-first launch | Use `login_tagline`: zh "提升下限 · 突破上限", en "Raise the Floor. Break the Ceiling." — web manifest already updated; mini program source is in a separate repo |
| 2 | Global navigation title is "NX LIMIT Training" on every page | Low-Medium | Does not match the Chinese-first promise | Use `Taro.setNavigationBarTitle` per page (训练日历, 商城, 我的, etc.) |
| 3 | Chinese labels use `text-transform: uppercase; letter-spacing: 0.14em` | Medium | `text-transform` does nothing for CJK, and letter-spacing hurts readability in labels like 今日待办 | Remove or localize: drop letter-spacing for Chinese, keep it only for English |
| 4 | Global `line-height` is not set; default ~1.2 is tight for Chinese body copy | Medium | Dense store intro and onboarding paragraphs are harder to read | Set `page { line-height: 1.6; }` and headings to `1.2–1.3`; override only where necessary |
| 5 | Gold `#d4af37` on white / light paper for small text | Medium | Contrast is ~2.8:1, below WCAG 2.1 AA for small text | Use darker gold `#b5731a` or black for small labels; reserve bright gold for dark backgrounds |
| 6 | Store offer cards lock a 240rpx × 200rpx image to the left of text | Low | On narrow devices the subtitle can wrap awkwardly | Consider stacking image above text below ~375 rpx, or reduce image width to 200rpx |
| 7 | Workout page loaded nearly blank when opened without query params | High (testing) | A shared or deep link missing `programId/week/day` shows no exercises | Redirect to calendar/home when params are missing, or render a "选择训练" empty state |
| 8 | Inbox / workload screenshots are very low-contrast and mostly white | Medium | Empty-state text may be rendering but visually lost, or content may have failed to load | Verify `ib_empty` and `wl_empty` render inside a card with an icon and a darker muted color |
| 9 | Calendar month-grid day cells are ~96rpx high; dots are 10rpx | Low | Month-view tap targets for reschedule are small | Keep week view as the default; in month view make the whole cell tappable with a minimum 44rpx hit area |
| 10 | Onboarding pending-payment screen relies on WeChat transfer reference | High (ops) | Users do not know how long verification takes | Add expected-time copy (e.g. "通常 1–3 小时内核实") and a "联系教练" quick action |

### 9.3 Recommended design tweaks (not blockers)

- **Home greeting size.** `40px` is large; clamp or ellipsis long names so mixed English/Chinese names do not overflow the hero.
- **Calendar move affordance.** The icon-only "改期" button on day cards is invisible to some users. Add a text label or a tooltip on first use.
- **Profile language switcher.** The 中文 / English pills are clear; add a subtle checkmark or background fill on the active language.
- **Store pricing preview.** Show a starting-from price on each offer card so users know the entry point before tapping.
- **Numbers empty state.** If 我的数据 is empty, link it back to the calendar with "去完成一次训练" so it does not feel like a dead end.

### 9.4 Bottom-line opinion

**Will a Chinese client have a good experience?** Yes — once the login tagline is localized and the handful of contrast/typography fixes are in. The mini program looks like a polished, native WeChat app, not a translated foreign product. The biggest remaining risks are operational (payment verification speed, the coming-soon gate, and the empty wellness template ID) and ensuring the workout logger always loads with real data rather than an empty shell. For a one-month launch, prioritize the blockers and the five Medium items above; the aesthetic refinements can ship in a follow-up release.

---

## 10. Files Referenced

- `public/coming-soon.html`
- `src/App.tsx`
- `src/i18n.ts`
- `src/PortalHome.tsx`
- `src/PortalPrograms.tsx`
- `src/PortalTraining.tsx`
- `src/PortalWelcome.tsx`
- `src/ClientWorkspace.tsx`
- `nolimit-miniprogram/src/app.config.ts`
- `nolimit-miniprogram/src/app.scss`
- `nolimit-miniprogram/src/i18n/index.ts`
- `nolimit-miniprogram/src/pages/home/index.scss`
- `nolimit-miniprogram/src/pages/calendar/index.scss`
- `nolimit-miniprogram/src/pages/store/index/index.scss`
- `nolimit-miniprogram/src/pages/profile/index.scss`
- `nolimit-miniprogram/src/pages/login/index.tsx`
- `nolimit-miniprogram/src/pages/inbox/index.tsx`
- `nolimit-miniprogram/src/pages/workload/index.tsx`
- `nolimit-miniprogram/src/pages/workout/index.tsx`
- `nolimit-miniprogram/src/services/auth.ts`
- `nolimit-miniprogram/src/services/wxSubscribe.ts`
- `nolimit-miniprogram/capture-pages.js`
- `miniprogram-screenshots/`
- `docs/pilot-visual-audit-2026-08-04.md`
- `docs/client-mobile-experience-audit-2026-07-13.md`
