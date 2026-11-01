import { expect, test } from "@playwright/test";

for (const width of [1440, 1024, 768, 390]) {
  test(`calendar previews keep readable text columns at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.clock.setFixedTime(new Date("2026-11-02T12:00:00+08:00"));
    await page.addInitScript(() => localStorage.setItem("nl_public_lang", "en"));
    const client = { id: "CL-LAYOUT", clientCode: "CL-LAYOUT", name: "Calendar Layout", initials: "CL", status: "Active", program: "--", clientType: "Online Coaching", coach: "Kent Bastell", primaryCoach: "COACH-KENT", languagePreference: "English", startDate: "2026-10-01", tags: [], categories: [] };
    const workouts = ["Strength 1", "Climbing Warmup", "Strength 2"].map((sessionName, i) => ({ id: `AW-LAYOUT-${i}`, assignedWorkoutId: `AW-LAYOUT-${i}`, clientId: client.id, programId: `PR-LAYOUT-${i}`, week: "1", day: "1", sessionName, sessionType: "Strength", scheduledDate: `2026-11-0${i + 2}`, completionStatus: "Scheduled", isDraft: i === 2 }));
    const names = ["Barbell Hip Thrust", "Elevated Push-up on Box", "Mini-Band Hip Flexor Raise (Wall-Supported)"];
    await page.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.split("/").pop() || "";
      if (request.method() !== "GET") throw new Error(`Unexpected write: ${endpoint}`);
      const responses: Record<string, unknown> = {
        clients: { clients: [client] }, coaches: { coaches: [{ recordId: "COACH-KENT", coachId: "COACH-KENT", name: "Kent Bastell", role: "Admin", status: "Active" }] }, workouts: { workouts },
        programs: { programs: [] }, teams: { teams: [] }, subscriptions: { subscriptions: [] }, productOrders: { orders: [] }, coachingReview: { states: [] }, notifications: { notifications: [] }, contentAssignments: { assignments: [] }, contentResponses: { responses: [] }, athleteMetrics: { metrics: [] }, workoutComments: { comments: [] }, clientMessages: { messages: [] }, calendarSessions: { items: [] }, calendarDrafts: { items: [], version: "layout" }, programmingBlocks: { blocks: [] }, coachDrafts: { drafts: [] }, exercises: { exercises: [] },
        programTemplates: { templates: names.map((exerciseName, i) => ({ recordId: `WT-${i}`, programId: url.searchParams.get("programId"), week: 1, day: 1, sessionName: workouts.find(w => w.programId === url.searchParams.get("programId"))?.sessionName, sessionType: "Strength", exerciseId: `EX-${i}`, exerciseRecordId: `EX-${i}`, exerciseName, order: i + 1, sets: "2", reps: "12", rest: "120 sec", notes: `Section: Strength\n\nLabel: A${i + 1}\n\nTracking: Weight\n\nUnilateral: No` })) },
      };
      await route.fulfill({ json: responses[endpoint] || {} });
    });
    await page.goto("/?view=coach&page=Clients");
    await page.getByRole("button", { name: "Calendar: Calendar Layout", exact: true }).click();
    const card = page.locator('[data-client-calendar-workout-id="AW-LAYOUT-0"]').first();
    await expect(card).toBeVisible();
    await expect(card.locator(".glanceText")).toHaveCount(3);
    if (width > 720) {
      for (const view of ["Week", "Full"]) {
        await page.getByRole("button", { name: view, exact: true }).click();
        await expect(card.locator(".calCardGlance")).toBeVisible();
        const layout = await card.evaluate(el => {
          const main = el.querySelector(".workoutBlockMain")!.getBoundingClientRect();
          const chain = el.querySelector(".calCardGlance")!.getBoundingClientRect();
          const text = el.querySelector(".glanceText")!.getBoundingClientRect();
          return { cardWidth: el.getBoundingClientRect().width, textWidth: text.width, headerBottom: main.bottom, chainTop: chain.top, chainWidth: chain.width, mainWidth: main.width };
        });
        expect(layout.cardWidth).toBeGreaterThanOrEqual(175);
        expect(layout.textWidth).toBeGreaterThanOrEqual(115);
        expect(layout.chainTop).toBeGreaterThanOrEqual(layout.headerBottom);
        expect(layout.chainWidth).toBeGreaterThanOrEqual(layout.mainWidth - 1);
        await card.scrollIntoViewIfNeeded();
        await page.locator(".calendarGrid:visible").screenshot({ path: `deliverables/calendar-card-width-2026-11-01/${width}-${view}.png` });
      }
    } else {
      await expect(card.locator(".calCardGlance")).toBeHidden();
      expect((await card.boundingBox())!.height).toBeLessThan(160);
    }
    await card.locator(".coachSessionActions").click();
    await expect(page.getByRole("menuitem", { name: "Copy", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}
