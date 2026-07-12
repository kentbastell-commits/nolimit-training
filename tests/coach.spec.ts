import { test, expect } from "@playwright/test";
import { trackErrors, settle } from "./helpers";

const PAGES = [
  "Clients",
  "Teams",
  "Library",
  "Workouts",
  "Review",
  "Coaches",
  "Orders",
  "Revenue",
] as const;

for (const name of PAGES) {
  test(`coach page ${name} renders without crashing`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.goto(`/?view=coach&page=${name}`);
    await settle(page, 6000);
    // Sidebar always present in coach view.
    await expect(page.locator(".sidebar")).toBeVisible();
    errs.assertNoCrashes();
  });
}

test("program detail opens with meta grid and sessions", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto("/?view=coach&page=Workouts");
  await settle(page, 6000);
  const actions = page.locator(".programTableActions").first();
  test.skip(!(await actions.isVisible().catch(() => false)), "no programs on this environment");
  await actions.locator("button").first().click();
  await page.waitForTimeout(2500);
  await expect(page.locator(".programMetaGrid")).toBeVisible();
  await expect(page.locator("button", { hasText: "Open in Builder" })).toBeVisible();
  errs.assertNoCrashes();
});

test("builder opens with program grid and week duplication affordance", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto("/?view=coach&page=Workouts");
  await settle(page, 6000);
  const actions = page.locator(".programTableActions").first();
  test.skip(!(await actions.isVisible().catch(() => false)), "no programs on this environment");
  await actions.locator("button").first().click();
  await page.waitForTimeout(2000);
  await page.locator("button", { hasText: "Open in Builder" }).first().click();
  await page.waitForTimeout(3000);
  await expect(page.locator(".programGrid")).toBeVisible();
  await expect(page.locator(".programGridWeekLabel").first()).toBeVisible();
  errs.assertNoCrashes();
});

test("session editor opens with settings, presets and save action", async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto("/?view=coach&page=Workouts");
  await settle(page, 6000);
  const actions = page.locator(".programTableActions").first();
  test.skip(!(await actions.isVisible().catch(() => false)), "no programs on this environment");
  await actions.locator("button").first().click();
  await page.waitForTimeout(2000);
  await page.locator("button", { hasText: "Open in Builder" }).first().click();
  await page.waitForTimeout(3000);
  const sessionCard = page.locator(".programGrid .exerciseLabelBadge").first();
  test.skip(!(await sessionCard.isVisible().catch(() => false)), "program has no sessions");
  await sessionCard.click();
  await page.waitForTimeout(2500);
  await expect(page.getByText("Session Settings").first()).toBeVisible();
  await expect(page.locator(".sessionSaveButton").first()).toBeVisible();
  // The old preset bar was removed in the builder redesign; the session-type
  // select is the drawer's surviving settings control.
  await expect(page.locator(".sessionTypeField select").first()).toBeVisible();
  errs.assertNoCrashes();
});
