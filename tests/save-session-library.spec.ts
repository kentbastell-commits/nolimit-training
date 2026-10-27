import { expect, test } from "@playwright/test";

// Every API request is mocked. Saving here never creates a real client session.
for (const [width, zh] of [[1440, false], [390, false], [360, true]] as const) {
  test(`save calendar session to library at ${width}px ${zh ? "Chinese" : "English"}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.clock.setFixedTime(new Date("2026-10-27T12:00:00+08:00"));
    await page.addInitScript(language => localStorage.setItem("nl_public_lang", language), zh ? "zh" : "en");
    const tr = (en: string, cn: string) => zh ? cn : en;
    const client = { id: "CL-9001", clientCode: "CL-9001", name: "Jason", initials: "J", status: "Active", program: "--", clientType: "Online Coaching", languagePreference: "English", tags: [], categories: [] };
    const workout = { id: "AW-WARMUP", assignedWorkoutId: "AW-WARMUP", clientId: client.id, programId: "PR-WARMUP", week: "1", day: "1", sessionName: "Climbing Warmup 1", sessionNameCn: "攀岩热身1", sessionType: "Strength", scheduledDate: "2026-10-27", completionStatus: "Scheduled", coachNotes: "", clientNotes: "", workoutLogs: "", isDraft: false };
    const templates = [{ exerciseName: "Scapular Pull-Up" }, { exerciseName: "Push-Up" }];
    const writes: Record<string, unknown>[] = [], crashes: string[] = []; let programsLoaded = 0;
    page.on("pageerror", e => crashes.push(e.message));
    await page.route("**/api/**", async route => {
      const req = route.request(), endpoint = new URL(req.url()).pathname.split("/").pop();
      const data: Record<string, unknown> = {
        clients: { clients: [client] }, coaches: { coaches: [] }, programs: { programs: [] }, teams: { teams: [] }, subscriptions: { subscriptions: [] }, productOrders: { orders: [] },
        workouts: { workouts: [workout] }, coachingReview: { states: [] }, notifications: { notifications: [] }, contentAssignments: { assignments: [] }, contentResponses: { responses: [] }, athleteMetrics: { metrics: [] }, workoutComments: { comments: [] }, clientMessages: { messages: [] }, calendarSessions: { items: [] }, calendarDrafts: { items: [], version: "test" }, programmingBlocks: { blocks: [] }, coachDrafts: { drafts: [] }, exercises: { exercises: [] },
        assignedSession: { workout, templates, version: "a".repeat(64), hasRevision: false, conflicted: false, publishedSnapshot: null }, workoutDetails: { exercises: [] },
      };
      if (endpoint === "programs") programsLoaded++;
      if (endpoint === "saveSessionToLibrary") {
        writes.push(req.postDataJSON());
        if (writes.length === 1) return route.fulfill({ status: 503, json: { error: "Temporary failure" } });
        return route.fulfill({ json: { success: true, programId: "PR-SAVED", name: req.postDataJSON().name, exerciseCount: 2 } });
      }
      if (req.method() !== "GET") throw Error(`Unexpected write: ${endpoint}`);
      return route.fulfill({ json: data[endpoint || ""] || {} });
    });
    await page.goto("/?view=coach&page=Clients");
    await page.getByRole("button", { name: `${tr("Calendar", "日历")}: Jason`, exact: true }).click();
    const card = page.locator('[data-client-calendar-workout-id="AW-WARMUP"]').first();
    await expect(card).toBeVisible();
    if (width > 700) {
      await page.getByRole("button", { name: `${tr("Session actions", "训练操作")}: ${zh ? workout.sessionNameCn : workout.sessionName}`, exact: true }).first().click();
      await page.getByRole("menuitem", { name: tr("Save session", "保存训练课"), exact: true }).click();
    } else {
      await card.click();
      await page.getByRole("button", { name: tr("Save session", "保存训练课"), exact: true }).click();
    }
    const dialog = page.getByRole("dialog", { name: tr("Save session", "保存训练课"), exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel(tr("Session name", "训练课名称"))).toHaveValue("Climbing Warmup 1");
    await dialog.getByLabel(tr("Session name", "训练课名称")).fill("Climbing Warmup — reusable");
    await page.screenshot({ path: `deliverables/save-session-library-2026-10-27/${width}-dialog.png` });
    await dialog.getByRole("button", { name: tr("Save to Sessions", "保存到训练课库"), exact: true }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByLabel(tr("Session name", "训练课名称"))).toHaveValue("Climbing Warmup — reusable");
    await dialog.getByRole("button", { name: tr("Save to Sessions", "保存到训练课库"), exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(writes).toHaveLength(2); expect(writes[1]).toEqual(writes[0]);
    expect(writes[0]).toMatchObject({ assignedWorkoutId: workout.id, name: "Climbing Warmup — reusable", source: "published" });
    expect(programsLoaded).toBeGreaterThan(0); expect(crashes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
