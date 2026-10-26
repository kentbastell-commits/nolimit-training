import { test, expect } from "@playwright/test";

// Every API call is intercepted: these flows cannot write to real athletes.
for (const width of [1440, 390]) {
  test(`coach assignments work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const coaches = [
      { recordId: "COACH-KENT", coachId: "COACH-KENT", name: "Kent Bastell", role: "Admin", status: "Active" },
      { recordId: "COACH-MARIO", coachId: "COACH-MARIO", name: "Mario Artukovic", role: "Coach", status: "Active" },
    ];
    const clients = [
      { id: "CL-0002", clientCode: "CL-0002", name: "Mei Lin", initials: "ML", status: "Active", program: "--", coach: "", primaryCoach: "", secondaryCoach: "" },
      { id: "CL-0003", clientCode: "CL-0003", name: "Ava Miller", initials: "AM", status: "Active", program: "--", coach: "Kent Bastell", primaryCoach: "COACH-KENT", secondaryCoach: "" },
    ];
    const crashes: string[] = [];
    page.on("pageerror", e => crashes.push(e.message));
    const writes: Record<string, string>[] = [];
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      const endpoint = url.pathname.split("/").pop();
      let body: unknown = {};
      if (endpoint === "clients") body = { clients };
      if (endpoint === "coaches") body = { coaches };
      if (endpoint === "coachingReview") body = { states: [] };
      if (endpoint === "notifications") body = { notifications: [] };
      if (endpoint === "updateClient") {
        const payload = route.request().postDataJSON();
        writes.push(payload);
        const athlete = clients.find(c => c.id === payload.clientRecordId)!;
        Object.assign(athlete, { coach: payload.coach, primaryCoach: payload.primaryCoachId, secondaryCoach: payload.secondaryCoachId });
        body = { success: true };
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/?view=coach&page=Clients");
    await page.getByRole("button", { name: "Assign coaches: Mei Lin", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Assign coaches", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Primary coach")).toHaveValue("");
    await dialog.getByLabel("Primary coach").selectOption("COACH-MARIO");
    await dialog.getByLabel("Supporting coach").selectOption("COACH-KENT");
    await page.screenshot({ path: `test-results/coach-assignment-${width}.png`, fullPage: true });
    await dialog.getByRole("button", { name: "Save assignment" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Assign coaches: Mei Lin", exact: true })).toContainText("Mario Artukovic + Kent Bastell");
    expect(writes[0]).toMatchObject({ clientRecordId: "CL-0002", coach: "Mario Artukovic", primaryCoachId: "COACH-MARIO", secondaryCoachId: "COACH-KENT" });

    const coachFilter = page.locator(".crpCoachSelect");
    if (width < 600) await page.locator(".crpMobileFiltersButton").click();
    await coachFilter.selectOption("Unassigned");
    await expect(page.locator(".crpRow")).toHaveCount(0);
    await coachFilter.selectOption("All Coaches");
    await page.getByRole("button", { name: "Assign coaches: Mei Lin", exact: true }).click();
    await dialog.getByLabel("Primary coach").selectOption("");
    await dialog.getByLabel("Supporting coach").selectOption("");
    await dialog.getByRole("button", { name: "Save assignment" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Assign coaches: Mei Lin", exact: true })).toContainText("Unassigned");
    await expect(page.locator(".clientWorkspace")).toHaveCount(0);

    await page.goto("/?view=coach&page=Coaches");
    await page.getByRole("button", { name: "Assign athlete to Mario Artukovic", exact: true }).click();
    await expect(dialog.getByLabel("Primary coach")).toHaveValue("COACH-MARIO");
    await dialog.getByLabel("Find athlete").fill("Ava");
    await dialog.getByRole("combobox", { name: "Athlete", exact: true }).selectOption("CL-0003");
    await page.screenshot({ path: `test-results/coach-assign-athlete-${width}.png`, fullPage: true });
    await dialog.getByRole("button", { name: "Save assignment" }).click();
    await expect(dialog).not.toBeVisible();
    expect(writes[2]).toMatchObject({ clientRecordId: "CL-0003", primaryCoachId: "COACH-MARIO", coach: "Mario Artukovic" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(crashes).toEqual([]);
  });
}
