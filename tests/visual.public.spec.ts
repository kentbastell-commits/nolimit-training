import { expect, test } from "@playwright/test";

const publicRoutes = [
  { path: "/", root: ".lv3" },
  { path: "/store", root: ".storePageV3" },
  { path: "/privacy", root: ".legalPage" },
  { path: "/?invite=client&coach=1", root: ".invitePage" },
  { path: "/?invite=client", root: ".cfpWrap" },
  { path: "/?enquiry=inperson", root: ".invitePage" },
];

test("public routes never load coach-only review queues", async ({ page }) => {
  const internalRequests: string[] = [];
  page.on("request", (request) => {
    if (
      /\/(formVideos|contentResponses|workoutComments|checkIns|enquiries)(\?|$)/.test(
        request.url()
      )
    ) {
      internalRequests.push(request.url());
    }
  });

  for (const route of publicRoutes) {
    await page.goto(route.path);
    await expect(page.locator(route.root)).toBeVisible();
    await expect(page.locator(".toast-error")).toHaveCount(0);
  }

  expect(internalRequests).toEqual([]);
});

test("public surfaces resist dark-system theme leaks and expose keyboard focus", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });

  for (const route of publicRoutes) {
    await page.goto(route.path);
    const root = page.locator(route.root);
    await expect(root).toBeVisible();
    await expect(root).toHaveCSS("color-scheme", "light");

    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveCSS("outline-style", "solid");
    await expect(focused).toHaveCSS("outline-width", "3px");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow, `${route.path} should not overflow horizontally`).toBe(false);
  }
});

test("Chinese public layouts wrap cleanly", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("nl_public_lang", "zh"));

  for (const route of publicRoutes) {
    await page.goto(route.path);
    const root = page.locator(route.root);
    await expect(root).toBeVisible();

    const hasChineseClass = await root.evaluate((element) =>
      element.classList.contains("zh")
    );
    if (!hasChineseClass && route.root === ".invitePage") {
      await page.locator(".inviteLangToggle").click();
    }
    if (!hasChineseClass && route.root === ".cfpWrap") {
      await page.locator(".cfpLangToggle").click();
    }

    await expect(root).toHaveClass(/zh/);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow, `${route.path} Chinese layout should not overflow`).toBe(false);
  }
});

test("touch-facing primary controls meet the 44px target", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Touch-target check is mobile-only");

  const targets = [
    { path: "/", selector: ".lv3BtnPrimary" },
    { path: "/store", selector: ".storeNavEnterV3" },
    { path: "/privacy", selector: ".legalTabs a" },
    { path: "/?invite=client&coach=1", selector: ".inviteLangToggle" },
    { path: "/?invite=client", selector: ".cfpLangToggle" },
  ];

  for (const target of targets) {
    await page.goto(target.path);
    const control = page.locator(target.selector).first();
    await expect(control).toBeVisible();
    const height = await control.evaluate((element) =>
      element.getBoundingClientRect().height
    );
    expect(Math.round(height), `${target.path} ${target.selector}`).toBeGreaterThanOrEqual(44);
  }
});

test("cards and panels follow the shared shape hierarchy", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".lv3PathCard").first()).toHaveCSS("border-radius", "18px");

  await page.goto("/store");
  await expect(page.locator(".storeCategoryCardV2").first()).toHaveCSS(
    "border-radius",
    "18px"
  );

  await page.goto("/privacy");
  await expect(page.locator(".legalArticle")).toHaveCSS(
    "border-radius",
    testInfo.project.name === "mobile" ? "20px" : "24px"
  );
});
