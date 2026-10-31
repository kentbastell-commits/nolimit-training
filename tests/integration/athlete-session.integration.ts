import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  const session = await request.get("/api/athleteSession");
  expect(await session.json()).toMatchObject({ authenticated: false, required: true });
  await page.addInitScript(() => localStorage.setItem("nl_public_lang", "en"));
});
test("portal waits for proof, signs in with a host cookie, and server logout revokes it", async ({ page, context }) => {
  const privateReads: string[] = [], crashes: string[] = [];
  page.on("pageerror", error => crashes.push(error.message));
  page.on("request", req => { if (/\/api\/(clients|myProfile|workouts|athleteMetrics)\b/.test(req.url())) privateReads.push(req.url()); });
  await page.goto("/?portal=client&client=CL-9001");
  await expect(page.getByRole("heading", { name: "Sign in to your training" })).toBeVisible();
  expect(privateReads).toEqual([]);
  await page.getByLabel("Login code", { exact: true }).fill("123456");
  const loginResponse = page.waitForResponse(response => response.url().includes("/api/findMyPortal") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await (await loginResponse).allHeaders())["set-cookie"]).toContain("HttpOnly; SameSite=Lax");
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  const cookie = (await context.cookies()).find(c => c.name === "nl-athlete-session")!;
  expect(cookie.httpOnly).toBe(true); expect(cookie.domain).toBe("127.0.0.1");
  expect(await page.evaluate(() => document.cookie.includes("nl-athlete-session"))).toBe(false);
  const profile = await context.request.get("/api/myProfile?clientId=CL-9001"); expect(profile.status()).toBe(200);
  expect((await context.request.get("/api/myProfile?clientId=CL-9002")).status()).toBe(403);
  expect((await context.request.post("/api/saveWorkoutLog", { data: { assignedWorkoutRecordId: "AW-SESSION-B" } })).status()).toBe(404);
  expect((await context.request.post("/api/saveWorkoutLog", { data: { assignedWorkoutRecordId: "AW-SESSION-DRAFT" } })).status()).toBe(404);
  await expect(page.locator(".nlSplash")).toHaveCount(0);
  await expect(page.locator(".athleteSessionPage")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("signed-in.png"), fullPage: true });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your training" })).toBeVisible();
  const replay = await context.request.get("/api/myProfile?clientId=CL-9001", { headers: { cookie: `nl-athlete-session=${cookie.value}` } });
  expect(replay.status()).toBe(401);
  await page.reload(); await expect(page.getByLabel("Login code", { exact: true })).toBeVisible();
  expect(crashes).toEqual([]);
});
test("another athlete's URL never mounts or reads that profile", async ({ page, context }) => {
  expect((await context.request.post("/api/findMyPortal", { data: { pin: "123456" } })).status()).toBe(200);
  const reads: string[] = [];
  page.on("request", req => { if (/\/api\/(clients|myProfile|workouts)\b/.test(req.url())) reads.push(req.url()); });
  await page.goto("/?portal=client&client=CL-9002");
  await expect(page.getByText("You're signed in to a different account.", { exact: false })).toBeVisible();
  expect(reads).toEqual([]);
  await page.getByRole("button", { name: "Open my portal", exact: true }).click();
  await expect(page).toHaveURL(/client=CL-9001/);
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  expect(reads.some(url => url.includes("CL-9002"))).toBe(false);
});
test("Chinese login is usable on narrow screens and a guessed code cannot log in", async ({ page, context }) => {
  await page.goto("/?portal=client&client=CL-9001");
  await page.getByRole("button", { name: "切换为中文", exact: true }).click();
  await expect(page.getByRole("heading", { name: "登录你的训练账户" })).toBeVisible();
  await page.getByLabel("登录码", { exact: true }).fill("CL-9001");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("登录码不正确");
  expect((await context.cookies()).find(c => c.name === "nl-athlete-session")).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("chinese-login.png"), fullPage: true });
});
test("coach preview gets a read-only credential and writes fail on the real dispatcher", async ({ page, context }) => {
  await page.addInitScript(() => localStorage.setItem("nl_coach_key", "local-e2e-coach"));
  await page.goto("/?portal=client&client=CL-9001&preview=coach");
  await expect(page.getByText("Athlete preview · read-only", { exact: true })).toBeVisible();
  expect((await context.cookies()).find(c => c.name === "nl-athlete-session")).toBeUndefined();
  const issued = await context.request.post("/api/athleteSession", { data: { action: "preview", clientCode: "CL-9001" }, headers: { "x-coach-key": "local-e2e-coach" } });
  const token = (await issued.json()).sessionToken;
  expect((await context.request.post("/api/saveWorkloadLog", { data: { clientId: "CL-9001" }, headers: { authorization: `Bearer ${token}` } })).status()).toBe(403);
  expect((await context.request.get("/api/myProfile?clientId=CL-9001", { headers: { authorization: `Bearer ${token}` } })).status()).toBe(200);
});
for (const zh of [false, true]) {
  test(`WeChat QR landing verifies only a PIN in ${zh ? "Chinese" : "English"}`, async ({ page }) => {
    const bodies: Record<string, unknown>[] = [];
    await page.route("**/api/wxLogin", route => {
      const body = route.request().postDataJSON(); bodies.push(body);
      return route.fulfill({ json: body.action === "scan" ? { status: "needs_bind", openidToken: "fixture-proof" } : { status: "ok" } });
    });
    await page.goto(`/wx-login.html?t=fixture-handshake&code=fixture-oauth&lang=${zh ? "zh" : "en"}`);
    await expect(page.getByRole("heading", { name: zh ? "验证账户" : "Verify your account" })).toBeVisible();
    await expect(page.locator("input")).toHaveCount(1);
    expect(await page.locator("input").getAttribute("type")).toBe("password");
    await page.getByLabel(zh ? "登录密码 PIN" : "Login PIN").fill("123456");
    await page.getByRole("button", { name: zh ? "绑定并登录" : "Verify and log in" }).click();
    await expect(page.getByRole("heading", { name: zh ? "登录成功" : "Logged in" })).toBeVisible();
    expect(bodies[1]).toEqual({ action: "bind", t: "fixture-handshake", openidToken: "fixture-proof", pin: "123456" });
  });
}
