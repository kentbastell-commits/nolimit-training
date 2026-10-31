import { expect, test } from "@playwright/test";

test("explicit compatibility preserves old portals and mini reads without relaxing coach-only access", async ({ page, request, context }) => {
  expect(await (await request.get("/api/athleteSession")).json()).toMatchObject({ authenticated: false, required: false });
  expect((await request.get("/api/myProfile?clientId=CL-9001")).status()).toBe(200);
  expect((await request.get("/api/teams")).status()).toBe(401);
  await page.addInitScript(() => localStorage.setItem("nl_public_lang", "en"));
  await page.goto("/?portal=client&client=CL-9001");
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await expect(page.locator(".nlSplash")).toHaveCount(0);
  await expect(page.getByText("Hi, Session Athlete A", { exact: false })).toBeVisible();
  await expect(page.locator(".athleteSessionPage")).toHaveCount(0);
  expect((await context.cookies()).some(c => c.name === "nl-athlete-session")).toBe(false);
  // This is intentionally still an OPEN security exception until cutover.
  expect((await request.get("/api/myProfile?clientId=CL-9002")).status()).toBe(200);
});
