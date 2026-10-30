import { test, expect } from "@playwright/test";
import fs from "node:fs";

// Every API request is mocked; copying/sharing here never contacts a customer
// or changes an order. Bank details remain absent until the coach opens them.
for (const [width, zh] of [[1440, false], [390, true]] as const) {
  test(`Orders bank transfer preview and remark at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(language => {
      localStorage.setItem("nl_public_lang", language);
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { (window as any).bankCopied = text; } } });
      Object.defineProperty(navigator, "share", { configurable: true, value: async (data: ShareData) => { (window as any).bankShared = data.text; } });
    }, zh ? "zh" : "en");
    const tr = (en: string, cn: string) => zh ? cn : en;
    const orders = [
      { recordId: "ORDER-JASON", orderId: "ORD-JASON", clientId: "CL-JASON", clientName: "Jason", productName: "November coaching", productType: "Online Coaching", paymentStatus: "Pending", paymentReference: "NL-JASON", amount: "1200", currency: "CNY", purchasedAt: "2026-10-19", intakeStatus: "Not Sent" },
      { recordId: "ORDER-CLAIRE", orderId: "ORD-CLAIRE", clientName: "Claire", productName: "Coaching", productType: "Online Coaching", paymentStatus: "Paid", amount: "1200", currency: "CNY", purchasedAt: "2026-10-19", intakeStatus: "Not Needed", assignedCoach: "Kent Bastell" },
    ];
    let bankReads = 0;
    const mutations: string[] = [], errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/api/**", async route => {
      const request = route.request(), endpoint = new URL(request.url()).pathname.split("/").pop()!;
      if (request.method() !== "GET") { mutations.push(endpoint); return route.fulfill({ status: 400, json: { error: "Unexpected write" } }); }
      const data: Record<string, unknown> = {
        clients: { clients: [] }, coaches: { coaches: [{ recordId: "COACH-KENT", coachId: "COACH-KENT", name: "Kent Bastell", role: "Admin", status: "Active" }] },
        productOrders: { orders }, teams: { teams: [] }, subscriptions: { subscriptions: [] }, programs: { programs: [] },
        coachingReview: { states: [] }, notifications: { notifications: [] }, coachDrafts: { drafts: [] },
        bankTransferDetails: { accountName: "广州跃燃体育信息咨询有限公司", accountNumber: "3602011009200555212", bankName: "中国工商银行股份有限公司广州建设六马路支行" },
      };
      if (endpoint === "bankTransferDetails") bankReads++;
      return route.fulfill({ json: data[endpoint] || {} });
    });
    await page.goto("/?view=coach&page=Orders");
    const card = page.locator(".copCard").filter({ has: page.getByRole("heading", { name: "Jason", exact: true }) });
    await expect(card).toBeVisible();
    expect(bankReads).toBe(0);
    await card.getByRole("button", { name: tr("Bank transfer", "银行转账"), exact: true }).click();
    const dialog = page.getByRole("dialog", { name: tr("Bank transfer instructions", "银行转账信息"), exact: true });
    await expect(dialog).toBeVisible();
    const preview = dialog.getByLabel(tr("Message preview", "信息预览"));
    await expect(preview).toContainText("3602011009200555212");
    await dialog.getByLabel(tr("Transfer reference", "转账备注"), { exact: true }).fill("Jason ORD-JASON");
    await dialog.getByLabel(tr("Remark (optional)", "补充说明（可选）")).fill("November coaching renewal / 十一月续费");
    await dialog.getByLabel(tr("Message language", "信息语言")).selectOption("zh");
    await expect(preview).toContainText("补充说明: November coaching renewal / 十一月续费");
    fs.mkdirSync("deliverables/bank-transfer-orders-2026-10-19", { recursive: true });
    await page.screenshot({ path: `deliverables/bank-transfer-orders-2026-10-19/${width}-preview.png` });
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dialog.getByRole("button", { name: tr("Copy message", "复制信息") }).click();
    await expect(dialog.getByRole("status")).toContainText(tr("Copied.", "已复制"));
    const copied = await page.evaluate(() => (window as any).bankCopied);
    expect(copied).toContain("Jason ORD-JASON");
    expect(copied).toContain("十一月续费");
    expect(copied).not.toContain("Claire");
    await dialog.getByRole("button", { name: tr("Share", "分享"), exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).bankShared)).toBe(copied);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await page.getByRole("button", { name: tr("Bank transfer", "银行转账"), exact: true }).first().click();
    await expect(dialog.getByLabel(tr("Remark (optional)", "补充说明（可选）"))).toHaveValue("");
    await dialog.getByLabel(tr("Order (optional)", "订单（可选）")).selectOption("ORDER-JASON");
    await expect(dialog.getByLabel(tr("Remark (optional)", "补充说明（可选）"))).toHaveValue("November coaching renewal / 十一月续费");
    expect(mutations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
