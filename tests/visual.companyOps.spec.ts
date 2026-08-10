import { expect, test } from "@playwright/test";

const dashboard = {
  generatedAt: "2026-08-10T12:00:00.000Z",
  user: { id: "ou_founder", name: "Kent", role: "founder" },
  myWork: [
    {
      id: "rec-content",
      kind: "content",
      title: "August campaign brief",
      status: "Review",
      dueAt: "2026-08-11T00:00:00.000Z",
      urgency: "soon",
    },
  ],
  metrics: [
    { id: "revenue", label: "Digital collected", value: "CNY 25,000", tone: "success" },
    { id: "expenses", label: "Expenses awaiting review", value: 1, tone: "warning" },
  ],
  quickActions: [
    { key: "content", enabled: true },
    { key: "campaign", enabled: true },
    { key: "support_issue", enabled: true },
    { key: "expense", enabled: true, href: "https://example.feishu.cn/expense-form" },
  ],
  growth: {
    metrics: [],
    pipeline: [],
    upcomingContent: [],
    leadsToFollowUp: [],
    partnersToFollowUp: [],
    activeCampaigns: [],
    experiments: [],
    weeklyReportDue: true,
  },
  decisions: [
    {
      id: "rec-expense",
      actionType: "expense",
      category: "finance",
      title: "Travel claim",
      requestedBy: "Yumei",
      amount: "CNY 320",
      status: "Pending",
    },
  ],
  finance: { metrics: [] },
  onboarding: {
    employeeName: "Kent",
    progress: 50,
    tasks: [],
    policies: [
      {
        id: "expense-policy",
        title: "Expense Policy / 报销制度",
        url: "https://example.feishu.cn/expense-policy",
        required: true,
        acknowledged: false,
      },
    ],
  },
  links: { startHere: "https://example.feishu.cn/start-here" },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/companyOpsSession", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        csrfToken: "csrf-visual",
        user: {
          id: "ou_founder",
          openId: "ou_founder",
          name: "Kent",
          role: "founder",
          capabilities: [
            "view_growth",
            "edit_growth",
            "view_decisions",
            "resolve_decisions",
            "view_finance",
            "manage_onboarding",
            "submit_expense",
          ],
        },
      }),
    });
  });
  await page.route("**/api/companyOpsDashboard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(dashboard),
    });
  });
});

test("Company Operations stays guided and responsive", async ({ page }) => {
  await page.goto("/company-ops");
  await expect(page.getByRole("heading", { name: "Hello, Kent" })).toBeVisible();
  await expect(page.getByText("Your next priority", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You are clear for now" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create a campaign" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Submit an expense" })).toHaveAttribute(
    "href",
    "https://example.feishu.cn/expense-form",
  );

  await page.getByRole("button", { name: "Create a campaign" }).click();
  await expect(page.getByRole("dialog", { name: "Create a campaign" })).toBeVisible();
  await expect(page.getByLabel(/^Product/)).toHaveRole("combobox");
  await expect(page.getByLabel(/^Target audience/)).toHaveRole("combobox");
  await page.getByRole("button", { name: "Close" }).click();

  const overflow = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
    window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
