import { test, expect } from "@playwright/test";

// Entire API is mocked. Mutations in this suite never reach a real account.
for (const [width, zh] of [[1440, false], [390, false], [360, true]] as const) {
  test(`athlete profile flow at ${width}px ${zh ? "Chinese" : "English"}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(language => localStorage.setItem("nl_public_lang", language), zh ? "zh" : "en");
    const tr = (en: string, cn: string) => zh ? cn : en;
    const client = { id: "CL-0002", clientCode: "CL-0002", name: "闫俊祎", initials: "闫", status: "Active", program: "--", clientType: "Online Coaching", coach: "Kent Bastell", primaryCoach: "COACH-KENT", secondaryCoach: "", phone: "15320062628", email: "athlete@example.com", startDate: "2026-09-01", languagePreference: "Chinese", intakeStatus: "Reviewed", paymentStatus: "Paid", source: "Mini program", notes: "Climbing athlete. Keep Monday clear for technical training.", tags: ["Climbing"], categories: ["Youth"] };
    const coaches = [{ recordId: "COACH-KENT", coachId: "COACH-KENT", name: "Kent Bastell", role: "Admin", status: "Active" }, { recordId: "COACH-MARIO", coachId: "COACH-MARIO", name: "Mario Artukovic", role: "Coach", status: "Active" }];
    const subscription = { id: "SUB-1", clientId: client.id, clientRecordIds: [client.id], plan: "Online Coaching", price: 1200, currency: "CNY", billingCycle: "1 Month", startDate: "2026-09-01", nextBillingDate: "2026-11-12", status: "Active", autoRenew: false, paymentId: "" };
    const orders = [
      { recordId: "ORD-1", orderId: "ORD-1", clientId: client.id, clientName: client.name, productName: "October coaching", paymentStatus: "Paid", amount: "1200", currency: "CNY", purchasedAt: "2026-10-01", paidAt: "2026-10-12T10:30:00+08:00", paymentProvider: "WeChat Pay" },
      { recordId: "ORD-2", orderId: "ORD-2", clientId: client.id, clientName: client.name, productName: "September coaching", paymentStatus: "Paid", amount: "1200", currency: "CNY", purchasedAt: "2026-09-01", paidAt: "", paymentProvider: "Bank transfer" },
      { recordId: "ORD-3", orderId: "ORD-3", clientId: "CL-0003", clientName: client.name, productName: "Other athlete's payment", paymentStatus: "Paid", amount: "9999", currency: "CNY", purchasedAt: "2026-10-15", paidAt: "2026-10-15" },
    ];
    const teams = [{ id: "TEAM-1", name: "Climbing squad", memberIds: [] as string[], positions: {} as Record<string, string>, groups: ["Youth"], coach: "Kent Bastell" }];
    const writes: { endpoint: string; body: Record<string, unknown> }[] = [];
    const crashes: string[] = [];
    page.on("pageerror", e => crashes.push(e.message));
    await page.route("**/api/**", async route => {
      const endpoint = new URL(route.request().url()).pathname.split("/").pop()!;
      let body: unknown = {};
      if (endpoint === "clients") body = { clients: [client] };
      if (endpoint === "coaches") body = { coaches };
      if (endpoint === "subscriptions") body = { subscriptions: [subscription] };
      if (endpoint === "productOrders") body = { orders };
      if (endpoint === "teams") body = { teams };
      if (endpoint === "coachingReview") body = { states: [] };
      if (endpoint === "notifications") body = { notifications: [] };
      if (["updateClient", "updateProductOrder", "upsertSubscription", "upsertTeam"].includes(endpoint)) {
        const payload = route.request().postDataJSON(); writes.push({ endpoint, body: payload });
        if (endpoint === "updateClient") Object.assign(client, payload, { primaryCoach: payload.primaryCoachId, secondaryCoach: payload.secondaryCoachId, status: payload.packageType });
        if (endpoint === "updateProductOrder") Object.assign(orders.find(o => o.recordId === payload.recordId)!, { paidAt: payload.paidAt });
        if (endpoint === "upsertSubscription") Object.assign(subscription, payload);
        if (endpoint === "upsertTeam") Object.assign(teams[0], { memberIds: payload.memberRecordIds, positions: payload.positions });
        body = { success: true, recordId: endpoint === "upsertSubscription" ? "SUB-1" : payload.recordId };
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/?view=coach&page=Clients");
    const row = page.locator('[data-client-id="CL-0002"]');
    if (width > 700) await row.click({ button: "right" });
    else await row.getByRole("button", { name: `${tr("Client actions", "运动员操作")}: ${client.name}`, exact: true }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(page.locator(".cpPanel")).toHaveCount(0);
    await page.screenshot({ path: `deliverables/client-profile-2026-10-15/${width}-actions.png` });
    await menu.getByRole("menuitem", { name: tr("View profile", "查看资料"), exact: true }).click();
    const profile = page.getByRole("dialog", { name: client.name, exact: true });
    await expect(profile).toBeVisible();
    await expect(profile.locator(".cpSummary")).toContainText("Kent Bastell");
    await expect(profile.locator(".cpSummary")).toContainText(zh ? "2026年10月12日" : "12 Oct 2026");
    await expect(profile).toContainText("15320062628");
    await expect(page.locator(".crpSlide, .accountModal")).toHaveCount(0);
    await page.screenshot({ path: `deliverables/client-profile-2026-10-15/${width}-overview.png` });
    expect(await profile.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    expect(await profile.locator(".cpScroll").evaluate(el => getComputedStyle(el).overflowY)).toBe("auto");
    await profile.getByRole("button", { name: tr("Coaching & access", "教练与服务"), exact: true }).click();
    await profile.getByRole("button", { name: tr("Edit profile", "编辑资料"), exact: true }).click();
    await profile.getByRole("button", { name: tr("Overview", "概览"), exact: true }).click();
    await profile.getByLabel(tr("Coach alias", "教练端别名"), { exact: true }).fill("Jason");
    await profile.getByRole("button", { name: tr("Coaching & access", "教练与服务"), exact: true }).click();
    await profile.getByLabel(tr("Primary coach", "主教练"), { exact: true }).selectOption("COACH-MARIO");
    await profile.getByLabel(tr("Supporting coach", "辅助教练"), { exact: true }).selectOption("COACH-KENT");
    await profile.getByLabel(tr("Package", "服务套餐"), { exact: true }).fill("Monthly coaching");
    await profile.getByLabel(tr("Access starts", "访问开始"), { exact: true }).fill("2026-10-12");
    await profile.getByLabel(tr("Access ends", "访问结束"), { exact: true }).fill("2026-11-12");
    await profile.getByRole("button", { name: tr("Save changes", "保存修改"), exact: true }).click();
    await expect(profile.getByText(tr("Profile saved", "资料已保存"), { exact: true })).toBeVisible();
    expect(writes.find(w => w.endpoint === "updateClient")?.body.coachAlias).toBe("Jason");
    expect(writes.find(w => w.endpoint === "updateClient")?.body).toMatchObject({ clientRecordId: client.id, coach: "Mario Artukovic", primaryCoachId: "COACH-MARIO", secondaryCoachId: "COACH-KENT", accessEndDate: "2026-11-12" });
    await profile.getByRole("button", { name: tr("Payments", "付款"), exact: true }).click();
    await expect(profile.getByText("October coaching", { exact: true })).toBeVisible();
    await expect(profile.getByText("Other athlete's payment", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `deliverables/client-profile-2026-10-15/${width}-payments.png` });
    await profile.getByRole("button", { name: tr("Add date", "添加日期"), exact: true }).click();
    await profile.getByLabel(tr("Payment date", "付款日期"), { exact: true }).fill("2026-09-12");
    await profile.getByRole("button", { name: tr("Save date", "保存日期"), exact: true }).click();
    await expect(profile.getByText(tr("Payment date saved", "付款日期已保存"), { exact: true })).toBeVisible();
    expect(writes.find(w => w.endpoint === "updateProductOrder")?.body).toMatchObject({ recordId: "ORD-2", paidAt: "2026-09-12T12:00:00+08:00" });
    await profile.getByRole("button", { name: tr("Edit subscription", "编辑订阅"), exact: true }).click();
    await profile.getByLabel(tr("Price", "价格"), { exact: true }).fill("1500");
    await profile.getByLabel(tr("Billing cycle", "付款周期"), { exact: true }).selectOption("3 Month");
    await profile.getByRole("button", { name: tr("Save subscription", "保存订阅"), exact: true }).click();
    await expect(profile.getByText(tr("Subscription saved", "订阅已保存"), { exact: true })).toBeVisible();
    expect(writes.find(w => w.endpoint === "upsertSubscription")?.body).toMatchObject({ recordId: "SUB-1", clientRecordId: client.id, price: "1500", billingCycle: "3 Month" });
    await profile.getByRole("button", { name: tr("Teams & tags", "团队与标签"), exact: true }).click();
    await profile.getByLabel("Climbing squad", { exact: true }).click();
    await expect(profile.getByLabel("Climbing squad", { exact: true })).toBeChecked();
    await expect(profile.getByText(tr("Team saved", "团队已保存"), { exact: true })).toBeVisible();
    await profile.getByRole("button", { name: tr("Edit profile", "编辑资料"), exact: true }).click();
    await profile.getByLabel(tr("New tag", "新标签"), { exact: true }).fill("Competition prep");
    await profile.getByLabel(tr("New tag", "新标签"), { exact: true }).press("Enter");
    await profile.getByLabel(`${tr("Colour for", "标签颜色")} Youth`, { exact: true }).fill("#223344");
    await expect(profile.getByText(tr("Sports & categories", "运动与分类"), { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `deliverables/client-profile-2026-10-15/${width}-tags.png` });
    await profile.getByRole("button", { name: tr("Save changes", "保存修改"), exact: true }).click();
    await expect(profile.getByText(tr("Profile saved", "资料已保存"), { exact: true })).toBeVisible();
    await profile.getByRole("button", { name: tr("Calendar", "日历"), exact: true }).click();
    await expect(profile).not.toBeVisible();
    await expect(page.locator(".coachClientContext")).toBeVisible();
    await page.locator(".coachClientBack").click();
    await expect(row).toBeVisible();
    await expect(row).toContainText("Jason");
    await page.locator(".crpSearch input").fill("Jason");
    await expect(row).toBeVisible();
    await page.locator(".crpSearch input").fill("");
    await row.click();
    await expect(profile).toBeVisible();
    await expect(profile.locator(".cpSummary")).toContainText("Mario Artukovic");
    await profile.getByRole("button", { name: tr("Edit profile", "编辑资料"), exact: true }).click();
    await profile.getByLabel(tr("Name", "姓名"), { exact: true }).fill("Unsaved name");
    await page.goBack();
    await expect(profile.getByRole("button", { name: tr("Keep editing", "继续编辑"), exact: true })).toBeVisible();
    await profile.getByRole("button", { name: tr("Keep editing", "继续编辑"), exact: true }).click();
    await expect(profile.getByLabel(tr("Name", "姓名"), { exact: true })).toHaveValue("Unsaved name");
    await profile.getByRole("button", { name: tr("Close profile", "关闭资料"), exact: true }).click();
    await profile.getByRole("button", { name: tr("Discard changes", "放弃修改"), exact: true }).click();
    await expect(profile).not.toBeVisible();
    await row.focus();
    await page.keyboard.press("Shift+F10");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(crashes).toEqual([]);
  });
}
