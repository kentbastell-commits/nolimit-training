import { test, expect } from "@playwright/test";
import { trackErrors, settle, TEST_CLIENT } from "./helpers";

const portalUrl = `/?portal=client&client=${TEST_CLIENT}`;

test("portal home renders greeting, tabs and check-in card", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto(portalUrl);
  await settle(page, 6000);
  await expect(page.getByText(/Hi, |，你好/).first()).toBeVisible();
  await expect(page.locator(".mobileClientBottomNav")).toBeVisible();
  errs.assertNoCrashes();
});

for (const tab of ["Records", "Metrics", "Workload"] as const) {
  test(`portal ${tab} tab renders`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.goto(portalUrl);
    await settle(page, 6000);
    await page.getByText(tab, { exact: true }).first().click();
    await page.waitForTimeout(2500);
    errs.assertNoCrashes();
  });
}

test("portal calendar renders with training calendar", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto(portalUrl);
  await settle(page, 6000);
  await page.getByText("Calendar", { exact: true }).last().click();
  await page.waitForTimeout(2500);
  await expect(page.getByText(/Training Calendar|训练日历/).first()).toBeVisible();
  errs.assertNoCrashes();
});

test("portal my-programs renders purchased programs", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto(portalUrl);
  await settle(page, 6000);
  await page.getByText("My Programs", { exact: true }).first().click();
  await page.waitForTimeout(2500);
  errs.assertNoCrashes();
});

test("workout player opens At-a-Glance and logging view (no submit)", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto(portalUrl);
  await settle(page, 6000);
  await page.getByText("Calendar", { exact: true }).last().click();
  await page.waitForTimeout(2500);
  const start = page.getByText("Start", { exact: true }).first();
  test.skip(
    !(await start.isVisible().catch(() => false)),
    "no scheduled workout for the test client today"
  );
  await start.click();
  await page.waitForTimeout(4000);
  await expect(page.locator(".workoutGlancePanel")).toBeVisible();
  const rows = page.locator(".workoutGlanceRow");
  expect(await rows.count()).toBeGreaterThan(0);
  // Enter logging (focus mode) then leave without saving anything.
  await rows.first().click();
  await page.waitForTimeout(2000);
  await page.getByText("Got it", { exact: true }).first().click({ timeout: 3000 }).catch(() => {});
  await expect(page.locator(".workout-modal input:visible").first()).toBeVisible();
  errs.assertNoCrashes();
});
