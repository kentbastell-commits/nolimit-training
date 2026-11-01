import { expect, test } from "@playwright/test";

for (const [width, zh] of [[1440, false], [390, false], [390, true]] as const) {
  test(`client overview exercise video history at ${width}px ${zh ? "Chinese" : "English"}`, async ({ page }) => {
    if (process.env.NL_GATE) await page.context().addCookies([{ name: "nl_gate", value: process.env.NL_GATE, url: process.env.BASE_URL || "https://trainnolimit.com" }]);
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(language => localStorage.setItem("nl_public_lang", language), zh ? "zh" : "en");
    const tr = (en: string, cn: string) => zh ? cn : en;
    const clients = ["A", "B"].map((letter, i) => ({ id: `CL-900${i + 1}`, clientCode: `CL-900${i + 1}`, name: `Audit ${letter}`, initials: letter, status: "Active", program: "--", clientType: "Online Coaching", coach: "Kent Bastell", languagePreference: "English", tags: [], categories: [] }));
    const videos = [
      { recordId: "V1", clientId: "CL-9001", clientName: "Audit A", exerciseName: "Row", workoutName: "Strength 1", workoutDate: "2026-10-01", videoUrl: "/uploads/fv-history-first.mp4", coachReply: "Keep your chest supported", status: "Reviewed" },
      { recordId: "V2", clientId: "CL-9001", clientName: "Audit A", exerciseName: "Row", workoutName: "Strength 1", workoutDate: "2026-10-10", videoUrl: "/uploads/fv-history-middle.mp4", clientNote: "Feels stronger", coachReply: "Steadier this week", status: "Reviewed" },
      { recordId: "V3", clientId: "CL-9001", clientName: "Audit A", exerciseName: "Row", workoutName: "Strength 2", workoutDate: "2026-10-20", videoUrl: "/uploads/fv-history-latest.mp4", coachReply: "Good control throughout", status: "Reviewed" },
      { recordId: "VS", clientId: "CL-9001", clientName: "Audit A", exerciseName: "Squat", workoutDate: "2026-10-12", videoUrl: "/uploads/fv-history-squat.mp4", status: "New" },
    ];
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.split("/").pop() || "";
      if (req.method() !== "GET") throw Error(`Unexpected mutation: ${endpoint}`);
      const responses: Record<string, unknown> = {
        clients: { clients }, coaches: { coaches: [] }, programs: { programs: [] }, teams: { teams: [] }, subscriptions: { subscriptions: [] }, productOrders: { orders: [] }, coachingReview: { states: [] }, notifications: { notifications: [] }, coachDrafts: { drafts: [] }, workouts: { workouts: [] }, workoutHistory: { logs: [] }, exerciseResults: { results: [] }, checkIns: { checkIns: [] }, contentAssignments: { assignments: [] }, contentResponses: { responses: [] }, athleteMetrics: { metrics: [] }, workoutComments: { comments: [] }, calendarSessions: { items: [] }, calendarDrafts: { items: [], version: "history" }, formVideos: { videos: url.searchParams.get("clientId") === "CL-9002" ? [] : videos },
      };
      await route.fulfill({ json: responses[endpoint] || {} });
    });
    await page.goto("/?view=coach&page=Clients");
    await page.getByRole("button", { name: tr("Calendar: Audit A", "日历: Audit A"), exact: true }).click();
    await page.locator(".coachClientTabs").getByRole("button", { name: tr("Overview", "概览"), exact: true }).click();
    const panel = page.locator(".clientExerciseVideos");
    await panel.getByRole("button", { name: tr("Browse videos", "浏览视频") }).click();
    await expect(panel.locator(".cevhClip")).toHaveCount(3);
    await expect(panel.locator("time")).toHaveText(["2026-10-01", "2026-10-10", "2026-10-20"]);
    await expect(panel.getByText("Steadier this week")).toBeVisible();
    await panel.getByRole("button", { name: tr("Compare first & latest", "对比最早与最新") }).click();
    await expect(panel.locator(".cevhClip")).toHaveCount(2);
    await expect(panel.locator("time")).toHaveText(["2026-10-01", "2026-10-20"]);
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({ path: `deliverables/client-video-history-2026-11-01/compare-${width}-${zh ? "zh" : "en"}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await panel.getByLabel(tr("Exercise", "动作"), { exact: true }).selectOption("squat");
    await expect(panel.locator(".cevhClip")).toHaveCount(1);
    await expect(panel.getByText("Keep your chest supported")).toHaveCount(0);
    await page.getByRole("button", { name: tr("Switch athlete", "切换运动员"), exact: true }).click();
    await page.getByRole("button", { name: "Audit B", exact: true }).click();
    await page.locator(".clientExerciseVideos").getByRole("button", { name: tr("Browse videos", "浏览视频") }).click();
    await expect(page.locator(".clientExerciseVideos")).toContainText(tr("No exercise videos yet", "暂无动作视频"));
    expect(errors).toEqual([]);
  });
}
