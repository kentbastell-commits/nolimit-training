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
  performance: {
    canManage: true,
    staff: [{ staffRecordId: "rec-yumei", name: "Yumei", role: "growth" }],
    cycles: [
      {
        id: "perf-august",
        month: "2026-08",
        employee: { staffRecordId: "rec-yumei", name: "Yumei", role: "growth" },
        status: "Report Submitted",
        reportDue: "2026-08-31",
        prioritiesConfirmedAt: "2026-08-01T02:00:00.000Z",
        reportSubmittedAt: "2026-08-31T02:00:00.000Z",
        selfReview: "Delivered the agreed campaign and content plan.",
        evidenceLinks: ["https://example.feishu.cn/file/demo"],
        canManage: true,
        canFinalize: false,
        goals: [
          { index: 1, title: "Content & Delivery", measure: "Publish 12 approved posts", weight: 25, result: "Published 13" },
          { index: 2, title: "Quality & Optimization", measure: "Average completion rate above 35%", weight: 20, result: "Reached 39%" },
          { index: 3, title: "Campaigns & Partners", measure: "Launch the August campaign", weight: 20, result: "Launched on schedule" },
          { index: 4, title: "Community & Leads", measure: "Generate 30 qualified leads", weight: 15, result: "Generated 34" },
          { index: 5, title: "Organization & Ownership", measure: "Submit every report on time", weight: 20, result: "All reports on time" },
        ],
      },
    ],
  },
  campaignWorkflow: [
    {
      id: "campaign-pending",
      name: "Back-to-school digital program launch",
      status: "Pending Approval",
      objective: "Sell the eight-week digital strength program.",
      audience: ["Adult recreational athletes"],
      offer: "Eight-week training plan with launch-week onboarding call.",
      product: "数字计划 Digital",
      channels: ["Douyin", "Xiaohongshu"],
      budget: 2500,
      revenueTarget: 50000,
      successCriteria: "At least 50 paid programs and a positive contribution margin.",
      startAt: "2026-08-18T00:00:00.000Z",
      endAt: "2026-09-18T00:00:00.000Z",
      submittedAt: "2026-08-12T02:00:00.000Z",
      ownerName: "Yumei",
      currency: "CNY",
      trackingLinks: [],
      trackedCollectedRevenue: 0,
      trackedOrderCount: 0,
      canEdit: false,
      canReview: true,
      canActivate: false,
      canSubmitResults: false,
      canReconcile: false,
    },
  ],
  myPerformance: { cycles: [] },
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
            "view_performance",
            "manage_performance",
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

test("founder performance review is legible without exposing a raw table", async ({ page }) => {
  await page.goto("/company-ops?page=performance");
  await expect(page.getByRole("heading", { name: "Monthly goals & bonus reviews" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review Yumei's month" })).toBeVisible();
  await expect(page.getByText("Bonus scale", { exact: true })).toBeVisible();
  await expect(page.getByText("Published 13").first()).toBeVisible();
  await expect(page.getByText("MP4/MOV and other video files · up to 500 MB")).toBeVisible();
  await expect(page.getByRole("button", { name: "Finalise & stage bonus" })).toBeDisabled();

  const overflow = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
    window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("founder reviews a complete campaign brief and submits the approval snapshot", async ({ page }) => {
  await page.route("**/api/companyOpsActions", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.action).toBe("campaign.review");
    expect(body.payload).toMatchObject({
      campaignId: "campaign-pending",
      decision: "approve",
      attributionSharePercent: "100",
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ id: "campaign-pending", message: "Campaign approved and tracking kit generated" }),
    });
  });

  await page.goto("/company-ops?page=performance");
  await expect(page.getByRole("tab", { name: /^Monthly Goals/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: /^Campaigns/ }).click();
  await expect(page).toHaveURL(/page=performance&view=campaigns/);
  await expect(page.getByRole("heading", { name: "Campaigns & attribution" })).toBeVisible();
  await expect(page.getByText("Cards show the next decision—not a raw database table.")).toBeVisible();
  await page.getByRole("button", { name: "Review proposal" }).click();
  await expect(page.getByRole("dialog", { name: "Back-to-school digital program launch" })).toBeVisible();
  await expect(page.getByText("Fair attribution is locked at approval")).toBeVisible();
  await expect(page.getByText("At least 50 paid programs and a positive contribution margin.")).toBeVisible();
  await page.getByLabel("Decision note").fill("Approved for launch under the recorded digital-program tiers.");
  await page.getByRole("button", { name: "Approve & generate codes" }).click();
  await expect(page.getByText("Campaign approved and tracking kit generated")).toBeVisible();
});

test("growth sees revision and tracking actions on a phone without finance controls", async ({ page }) => {
  await page.unroute("**/api/companyOpsSession");
  await page.unroute("**/api/companyOpsDashboard");
  await page.route("**/api/companyOpsSession", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        csrfToken: "csrf-growth",
        user: {
          id: "ou_yumei",
          openId: "ou_yumei",
          name: "Yumei",
          role: "growth",
          capabilities: ["view_growth", "edit_growth", "view_performance", "submit_expense"],
        },
      }),
    });
  });
  await page.route("**/api/companyOpsDashboard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ...dashboard,
        user: { id: "ou_yumei", name: "Yumei", role: "growth" },
        decisions: [],
        finance: undefined,
        campaignWorkflow: [
          {
            ...dashboard.campaignWorkflow[0],
            id: "campaign-changes",
            status: "Changes Requested",
            reviewNote: "Clarify the customer promise and lower the test budget.",
            canEdit: true,
            canReview: false,
          },
          {
            ...dashboard.campaignWorkflow[0],
            id: "campaign-approved",
            name: "Approved Xiaohongshu coaching campaign",
            status: "Approved",
            canReview: false,
            canActivate: true,
            campaignCode: "CMP-202608-A1B2C3",
            staffAttributionCode: "STF-D4E5F6A",
            attributionSharePercent: 80,
            commissionRatePercent: 8,
            commissionRule: "8% of the first three paid months",
            trackingLinks: [
              {
                channel: "Xiaohongshu",
                attributionCode: "SRC-8F0A12",
                url: "https://trainnolimit.cn/coaching?utm_source=xiaohongshu&utm_campaign=CMP-202608-A1B2C3&staff=STF-D4E5F6A&attribution=SRC-8F0A12",
              },
            ],
          },
        ],
      }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/company-ops?page=performance");
  await page.getByRole("tab", { name: /^Campaigns/ }).click();
  await expect(page.getByRole("heading", { name: "Campaigns & attribution" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revise & resubmit" })).toBeVisible();
  await page.getByRole("button", { name: "Open tracking kit" }).click();
  await expect(page.getByText("CMP-202608-A1B2C3", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start campaign" })).toBeVisible();
  await expect(page.getByText("Founder revenue reconciliation")).toHaveCount(0);
  const overflow = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
