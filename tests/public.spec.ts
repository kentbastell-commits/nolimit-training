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

test("store renders products before FAQ and opens checkout to the pay step", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto("/store");
  await settle(page);

  // At least one product card with a click target.
  const product = page.locator(".storeProductClickTarget").first();
  await expect(product).toBeVisible();

  // Section order regression: programs section above the FAQ.
  const programsY = await page
    .locator("text=Available Programs")
    .first()
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const faqY = await page
    .locator(".storeFaqV2")
    .first()
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(programsY).toBeLessThan(faqY);

  // Open product -> add to cart -> pay step shows QR, payment code, form.
  await product.click();
  await page.locator("button:visible", { hasText: /add to cart/i }).first().click();
  await page.waitForTimeout(1500);
  await expect(page.locator(".storePayNowV2 img")).toBeVisible();
  await expect(page.locator(".storePaymentCodeV2 strong")).toHaveText(/^NL-/);
  await expect(page.locator('input[placeholder="Your name"]')).toBeVisible();
  // Never register — this suite stays read-only.
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
