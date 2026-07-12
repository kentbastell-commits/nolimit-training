import { test, expect } from "@playwright/test";
import { trackErrors, settle } from "./helpers";

test("landing page renders hero and store links", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto("/");
  await settle(page);
  await expect(page.locator(".lv3HeroTitle")).toBeVisible();
  await expect(page.locator(".lv3BtnPrimary").first()).toBeVisible();
  errs.assertNoCrashes();
});

test("all legal policies keep readable headings in dark system mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });

  for (const route of ["/privacy", "/terms", "/refund", "/business"]) {
    await page.goto(route);
    const title = page.locator(".legalHero h1");
    const sectionTitle = page.locator(".legalArticle h2").first();

    await expect(title).toBeVisible();
    await expect(sectionTitle).toBeVisible();
    await expect(title).toHaveCSS("color", "rgb(23, 22, 16)");
    await expect(sectionTitle).toHaveCSS("color", "rgb(40, 37, 31)");
  }
});

test("store renders the catalog before FAQ and opens checkout to the pay step", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto("/store");
  await settle(page);

  // Category-first catalog: at least one sport/category card.
  const category = page.locator(".storeCategoryCardV2").first();
  await expect(category).toBeVisible();

  // Section order regression: catalog section above the FAQ.
  const catalogY = await page
    .locator("#catalog")
    .first()
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const faqY = await page
    .locator(".storeFaqV2")
    .first()
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(catalogY).toBeLessThan(faqY);

  // Category -> sport popup -> program row -> detail popup -> "Get this
  // program" -> pay step shows QR, payment code, form.
  await category.click();
  const programRow = page.locator(".storeSportRow").first();
  await expect(programRow).toBeVisible();
  await programRow.click();
  await page
    .locator("button:visible", { hasText: /Get this program/i })
    .first()
    .click();
  await page.waitForTimeout(1500);
  await expect(page.locator(".storePayNowV2 img")).toBeVisible();
  await expect(page.locator(".storePaymentCodeV2 strong")).toHaveText(/^NL-/);
  await expect(page.locator('input[placeholder="Your name"]')).toBeVisible();
  // Never register — this suite stays read-only.
  errs.assertNoCrashes();
});

// Guards the route-level code-splitting: these pages are now lazy-loaded
// (React.lazy + Suspense), so a broken chunk config would surface here as a
// blank page or a ChunkLoadError (caught as a page crash).
test("client invite route lazy-loads and renders", async ({ page }) => {
  const errs = trackErrors(page);
  // /?invite=client is now the PAID 1:1 coaching flow (CoachingFlowPage).
  await page.goto("/?invite=client");
  await settle(page);
  await expect(page.locator(".cfpShell")).toBeVisible();
  errs.assertNoCrashes();
});

test("coach onboarding invite still reaches the free intake", async ({ page }) => {
  const errs = trackErrors(page);
  // Coach-generated links carry &coach=1 and keep the free intake form, so a
  // coach can add someone who paid offline without forcing a fresh payment.
  await page.goto("/?invite=client&coach=1");
  await settle(page);
  await expect(page.locator(".inviteShell")).toBeVisible();
  errs.assertNoCrashes();
});

test("in-person enquiry route lazy-loads and renders", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto("/?enquiry=inperson");
  await settle(page);
  await expect(page.locator(".inviteShell")).toBeVisible();
  errs.assertNoCrashes();
});

test("find-my-portal modal opens and validates", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto("/store");
  await settle(page);
  const trigger = page.getByText(/Find my portal|Open my portal/).first();
  await trigger.click();
  // "Open my portal" (remembered device) navigates instead of opening the modal.
  const modalVisible = await page
    .locator(".findPortalModal")
    .isVisible()
    .catch(() => false);
  if (modalVisible) {
    await expect(page.locator(".findPortalModal input")).toHaveCount(2);
  }
  errs.assertNoCrashes();
});
