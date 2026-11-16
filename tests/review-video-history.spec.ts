import { expect, test } from "@playwright/test";

for (const [width, zh] of [[1440, false], [390, false], [390, true]] as const) {
  test(`reopen and edit reviewed session videos at ${width}px ${zh ? "Chinese" : "English"}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.addInitScript(language => {
      localStorage.setItem("nl_public_lang", language);
      localStorage.setItem("nl_coach_key", "fixture");
    }, zh ? "zh" : "en");
    const tr = (en: string, cn: string) => zh ? cn : en;
    const client = { id: "CL-9001", clientCode: "CL-9001", name: "Audit Young", initials: "Y", status: "Active", program: "--", clientType: "Online Coaching", languagePreference: "English", tags: [], categories: [] };
    const base = { clientId: client.id, workoutName: "Strength 1", assignedWorkoutId: "AW-1", workoutDate: "2026-11-12", status: "Reviewed", videoUrl: "/uploads/fixture.mp4" };
    let videos = [
      { ...base, recordId: "V1", exerciseName: "Row", coachReply: "Keep the chest supported" },
      { ...base, recordId: "V2", exerciseName: "Wrist rotation", coachReply: "Use a lighter weight" },
    ];
    const writes: any[] = [], errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.split("/").pop() || "";
      if (request.method() !== "GET") {
        if (endpoint !== "formVideos" || request.method() !== "PUT") throw Error(`Unexpected write: ${endpoint}`);
        const body = request.postDataJSON(); writes.push(body);
        videos = videos.map(video => video.recordId === body.recordId ? { ...video, coachReply: body.coachReply } : video);
        return route.fulfill({ json: { success: true } });
      }
      const responses: Record<string, unknown> = {
        clients: { clients: [client] }, coaches: { coaches: [] }, programs: { programs: [] }, teams: { teams: [] }, subscriptions: { subscriptions: [] }, productOrders: { orders: [] }, coachingReview: { states: [] }, notifications: { notifications: [] }, coachDrafts: { drafts: [] }, workouts: { workouts: [] }, workoutHistory: { logs: [] }, exerciseResults: { results: [] }, checkIns: { checkIns: [] }, contentAssignments: { assignments: [] }, contentResponses: { responses: [] }, athleteMetrics: { metrics: [] }, workoutComments: { comments: [] }, clientMessages: { messages: [] }, calendarSessions: { items: [] }, calendarDrafts: { items: [], version: "history" }, formVideos: { videos },
      };
      return route.fulfill({ json: responses[endpoint] || {} });
    });
    await page.goto("/?view=coach&page=Clients");
    await page.getByRole("button", { name: tr("Calendar: Audit Young", "日历: Audit Young"), exact: true }).click();
    await page.locator(".coachClientTabs").getByRole("button", { name: tr("Overview", "概览"), exact: true }).click();
    const history = page.locator(".clientExerciseVideos");
    await history.getByRole("button", { name: tr("Browse videos", "浏览视频") }).click();
    await history.getByLabel(tr("Exercise", "动作"), { exact: true }).selectOption("wrist rotation");
    await history.getByRole("button", { name: tr("Open feedback", "打开反馈") }).click();
    // V2 is not the first clip: its link must resolve to the session's queue item.
    const selected = page.locator(".dailyItem.isOpen");
    await expect(selected).toContainText("Strength 1");
    await expect(selected.locator(".workoutVideoCard")).toHaveCount(2);
    const feedback = page.getByRole("textbox", { name: tr("Feedback: Wrist rotation", "反馈: Wrist rotation"), exact: true });
    await expect(feedback).toHaveValue("Use a lighter weight");
    await feedback.fill("Use a lighter weight and move slowly");
    await selected.locator(".workoutVideoCard").filter({ hasText: "Wrist rotation" }).getByRole("button", { name: tr("Update feedback", "更新反馈"), exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ recordId: "V2", coachReply: "Use a lighter weight and move slowly", status: "Reviewed" });
    // A fresh visit to History must retain both playback controls and the saved edit.
    await page.goto("/?view=coach&page=Review");
    await page.getByRole("button", { name: new RegExp(`^${tr("History", "处理记录")} `) }).click();
    await page.getByRole("textbox", { name: tr("Search athlete or session", "搜索学员或训练课") }).fill("Strength 1");
    await page.locator(".dailyItemOpen").click();
    await expect(page.locator(".workoutVideoCard")).toHaveCount(2);
    await expect(feedback).toHaveValue("Use a lighter weight and move slowly");
    await expect(page.locator(".reviewVideoPoster")).toHaveCount(2);
    await page.locator(".dailyDetail").screenshot({ path: `deliverables/review-video-history-2026-11-16/history-${width}-${zh ? "zh" : "en"}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
  });
}
