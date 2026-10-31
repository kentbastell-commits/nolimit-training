import { expect, test } from "@playwright/test";
for (const [width, portal] of [[1440, false], [390, false], [390, true]] as const) {
  test(`workout videos grouped at ${width}px ${portal ? "athlete" : "coach"}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.clock.setFixedTime(new Date("2026-10-28T12:00:00+08:00"));
    await page.addInitScript(() => { localStorage.setItem("nl_public_lang", "en"); localStorage.setItem("nl_coach_key", "fixture"); });
    const client = { id: "CL-9001", clientCode: "CL-9001", name: "Jason", initials: "J", status: "Active", program: "--", clientType: "Online Coaching", languagePreference: "English", tags: [], categories: [] };
    const base = { clientId: client.id, clientName: "Jason", workoutName: "Home Workout 1", workoutNameCn: "å±…å®¶è®­ç»ƒ1", submittedAt: Date.parse("2026-10-28T10:00:00+08:00"), videoUrl: "/uploads/fixture.mp4" };
    let videos = [
      { ...base, recordId: "V1", exerciseName: "Row", assignedWorkoutId: "AW-1", workoutDate: "2026-10-20", status: "Reviewed", coachReply: "Control the lowering" },
      { ...base, recordId: "V2", exerciseName: "Push-up", assignedWorkoutId: "AW-1", workoutDate: "2026-10-20", status: "New", coachReply: "" },
      { ...base, recordId: "V3", exerciseName: "Squat", assignedWorkoutId: "AW-2", workoutDate: "2026-10-27", status: "Reviewed", coachReply: "Good depth" },
    ];
    const writes: any[] = [], errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      const req = route.request(), path = new URL(req.url()).pathname.split("/").pop();
      if (req.method() !== "GET") {
        if (path === "recordLogin") return route.fulfill({ json: { success: true } });
        if (path !== "formVideos" || req.method() !== "PUT") throw Error(`Unexpected write ${path}`);
        const body = req.postDataJSON(); writes.push(body);
        videos = videos.map(v => v.recordId === body.recordId ? { ...v, coachReply: body.coachReply, status: "Reviewed" } : v);
        return route.fulfill({ json: { success: true } });
      }
      const data: Record<string, any> = { athleteSession: { authenticated: true, clientCode: client.id }, clients: { clients: [client] }, myProfile: { client }, coaches: { coaches: [] }, programs: { programs: [] }, teams: { teams: [] }, subscriptions: { subscriptions: [] }, productOrders: { orders: [] }, formVideos: { videos },
        workouts: { workouts: [] }, checkIns: { checkIns: [] }, coachingReview: { states: [] }, notifications: { notifications: [] }, contentAssignments: { assignments: [] }, contentResponses: { responses: [] }, athleteMetrics: { metrics: [] }, workoutComments: { comments: [] }, clientMessages: { messages: [] }, calendarSessions: { items: [] }, calendarDrafts: { items: [], version: "test" }, programmingBlocks: { blocks: [] }, coachDrafts: { drafts: [] }, exercises: { exercises: [] } };
      return route.fulfill({ json: data[path || ""] || {} });
    });
    await page.goto(portal ? "/?portal=client&client=CL-9001" : "/?view=coach&page=Review");
    if (portal) {
      await page.getByRole("button", { name: "Coach", exact: true }).last().click();
      await page.getByRole("button", { name: "Feedback & updates", exact: true }).first().click();
      await expect(page.locator(".workoutVideoGroup")).toHaveCount(2);
      await expect(page.getByText("Good depth")).toBeVisible();
      await expect(page.getByText("Control the lowering")).toBeVisible();
      expect(writes).toEqual([]);
    } else {
      const item = page.locator(".dailyItem").filter({ hasText: "Home Workout 1" });
      await expect(item).toHaveCount(1); await item.locator(".dailyItemOpen").click();
      await expect(page.locator(".workoutVideoGroup")).toHaveCount(1);
      await expect(page.locator(".workoutVideoCard")).toHaveCount(2);
      await expect(page.getByText("2026-10-20", { exact: true })).toBeVisible();
      await expect(page.locator("blockquote p").filter({ hasText: "Control the lowering" })).toBeVisible();
      await page.getByRole("textbox", { name: "Feedback: Push-up", exact: true }).fill("Keep the body long");
      await page.screenshot({ path: `deliverables/workout-video-groups-2026-10-28/${width}-coach.png` });
      await page.getByRole("button", { name: /Send reply & mark reviewed/ }).click();
      await expect.poll(() => writes.length).toBe(1); expect(writes[0]).toMatchObject({ recordId: "V2", coachReply: "Keep the body long" });
    }
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
    await page.screenshot({ path: `deliverables/workout-video-groups-2026-10-28/${width}-${portal ? "athlete" : "reviewed"}.png` });
    expect(errors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

