import { expect, type Page } from "@playwright/test";

export const TEST_CLIENT = process.env.TEST_CLIENT || "CL-0001";

// Collect page crashes for the duration of a test; call assertNoCrashes() at
// the end. Console errors are tolerated (third-party noise); real JS
// exceptions are not.
export function trackErrors(page: Page) {
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message.slice(0, 200)));
  return {
    assertNoCrashes: () => {
      expect(crashes, `JS exceptions on page:\n${crashes.join("\n")}`).toEqual([]);
    },
  };
}

export async function settle(page: Page, ms = 4000) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(ms);
}
