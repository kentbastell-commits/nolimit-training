import { expect, test } from "@playwright/test";

// All requests are intercepted: copying in this test never changes an account.
for (const [width, zh] of [[1440, false], [390, false], [390, true]] as const) {
  test(`calendar copy survives switching clients and a failed paste at ${width}px ${zh ? "Chinese" : "English"}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.clock.setFixedTime(new Date("2026-10-19T12:00:00+08:00"));
    await page.addInitScript(language => localStorage.setItem("nl_public_lang", language), zh ? "zh" : "en");
    const tr = (en: string, cn: string) => zh ? cn : en;
    const clients = ["William", "Jason"].map(name => ({
      id: `CL-${name.toUpperCase()}`, clientCode: `CL-${name.toUpperCase()}`, name, initials: name[0],
      status: "Active", program: "--", clientType: "Online Coaching", coach: "Kent Bastell",
      primaryCoach: "COACH-KENT", languagePreference: "English", startDate: "2026-10-01", tags: [], categories: [],
    }));
    const source = { id: "AW-WILLIAM", assignedWorkoutId: "AW-WILLIAM", clientId: "CL-WILLIAM", programId: "PR-WARMUP",
      week: "1", day: "1", sessionName: "Climbing warm-up", sessionType: "Warmup", scheduledDate: "2026-10-19",
      completionStatus: "Scheduled", coachNotes: "", clientNotes: "", workoutLogs: "", isDraft: false };
    const destination: typeof source[] = [];
    const writes: Record<string, unknown>[] = [];
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", async route => {
      const req = route.request(), url = new URL(req.url());
      const endpoint = url.pathname.split("/").pop();
      const data: Record<string, unknown> = {
        clients: { clients }, coaches: { coaches: [{ recordId: "COACH-KENT", coachId: "COACH-KENT", name: "Kent Bastell", role: "Admin", status: "Active" }] },
        programs: { programs: [] }, teams: { teams: [] }, subscriptions: { subscriptions: [] }, productOrders: { orders: [] },
        coachingReview: { states: [] }, notifications: { notifications: [] }, contentAssignments: { assignments: [] },
        contentResponses: { responses: [] }, athleteMetrics: { metrics: [] }, workoutComments: { comments: [] },
        clientMessages: { messages: [] }, calendarSessions: { items: [] }, calendarDrafts: { items: [], version: "test" },
        programmingBlocks: { blocks: [] }, coachDrafts: { drafts: [] }, exercises: { exercises: [] },
      };
      if (endpoint === "workouts") data.workouts = { workouts: url.searchParams.get("clientCode") === "CL-WILLIAM" ? [source] : destination };
      if (endpoint === "duplicateAssignedWorkout") {
        writes.push(req.postDataJSON());
        if (writes.length === 1) return route.fulfill({ status: 503, json: { success: false, error: "Temporary copy failure. Retry." } });
        destination.push({ ...source, id: "AW-JASON", assignedWorkoutId: "AW-JASON", clientId: "CL-JASON", isDraft: true });
        return route.fulfill({ json: { success: true, recordId: "AW-JASON", isDraft: true } });
      }
      if (req.method() !== "GET") throw new Error(`Unexpected mutation: ${endpoint}`);
      await route.fulfill({ json: data[endpoint || ""] || {} });
    });
    await page.goto("/?view=coach&page=Clients");
    await page.getByRole("button", { name: tr("Calendar: William", "日历: William"), exact: true }).click();
    await page.getByRole("button", { name: tr("Session actions: Climbing warm-up", "训练操作: Climbing warm-up"), exact: true }).first().click();
    await page.getByRole("menuitem", { name: tr("Copy", "复制"), exact: true }).click();
    await page.locator(".coachClientBack").click();
    await page.getByRole("button", { name: tr("Calendar: Jason", "日历: Jason"), exact: true }).click();
    await expect(page.locator('[data-client-calendar-workout-id="AW-WILLIAM"]')).toHaveCount(0);
    const paste = page.getByRole("button", { name: /Paste Climbing warm-up on/ }).first();
    await paste.click();
    await expect(page.getByText(tr("Could not copy workout. Please try again.", "无法复制训练，请重试。"), { exact: true })).toBeVisible();
    await expect(paste).toBeVisible();
    await paste.click();
    await expect(page.getByText(tr("Workout copied as a draft. Review and publish when ready.", "训练已复制为草稿，请检查后发布。"), { exact: true })).toBeVisible();
    await expect(page.locator('[data-client-calendar-workout-id="AW-JASON"]').first()).toBeVisible();
    expect(writes).toHaveLength(2);
    expect(writes[0]).toMatchObject({ assignedWorkoutRecordId: "AW-WILLIAM", targetClientId: "CL-JASON" });
    expect(writes[1]).toEqual(writes[0]);
    expect(errors).toEqual([]);
  });
}
