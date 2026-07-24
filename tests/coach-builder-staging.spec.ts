import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { trackErrors, settle } from "./helpers";

const stagingOrigin =
  process.env.STAGING_TWIN_ORIGIN || "https://trainnolimit.com:8443";
const apiOrigin =
  process.env.STAGING_TWIN_VITE_PROXY === "1"
    ? process.env.BASE_URL || "http://127.0.0.1:5199"
    : stagingOrigin;

test.describe("coach builder against the throwaway staging twin", () => {
  test.skip(
    process.env.STAGING_TWIN_AUDIT !== "1",
    "Set STAGING_TWIN_AUDIT=1 to route API traffic to the throwaway staging database."
  );

  const routeApiToStaging = async (page: Page) => {
    // The coach shell blocks its splash on /api/clients and the access probe.
    // Prime those entry payloads so first paint cannot get stuck behind several
    // simultaneous staging round-trips; later reloads still hit staging.
    const primed = new Map<
      string,
      { status: number; headers: Record<string, string>; body: Buffer }
    >();
    for (const path of [
      "/api/clients",
      "/api/enquiries",
      "/api/programs",
    ]) {
      try {
        const response = await page.request.get(`${apiOrigin}${path}`, {
          maxRetries: 2,
          timeout: 30_000,
        });
        if (response.ok()) {
          primed.set(path, {
            status: response.status(),
            headers: response.headers(),
            body: await response.body(),
          });
        }
      } catch {
        // The normal route below remains the fallback for a transient staging
        // TLS/network failure while priming.
      }
    }

    await page.route("**/api/**", async (route) => {
      const source = new URL(route.request().url());
      const cached = primed.get(source.pathname);
      if (route.request().method() === "GET" && cached) {
        primed.delete(source.pathname);
        await route.fulfill(cached);
        return;
      }
      if (process.env.STAGING_TWIN_VITE_PROXY === "1") {
        await route.continue();
        return;
      }
      const response = await route.fetch({
        url: `${stagingOrigin}${source.pathname}${source.search}`,
      });
      await route.fulfill({ response });
    });
  };

  const removeQaProgram = async (
    request: APIRequestContext,
    programName: string
  ) => {
    const programsResponse = await request.get(`${apiOrigin}/api/programs`);
    if (!programsResponse.ok()) return;
    const programsData = await programsResponse.json();
    const program = (programsData.programs || []).find(
      (item: { programName?: string }) => item.programName === programName
    );
    if (!program?.recordId) return;

    const templatesResponse = await request.get(
      `${apiOrigin}/api/programTemplates?programId=${encodeURIComponent(
        program.programId || program.recordId
      )}&programRecordId=${encodeURIComponent(program.recordId)}`
    );
    if (templatesResponse.ok()) {
      const templatesData = await templatesResponse.json();
      for (const template of templatesData.templates || []) {
        if (!template.recordId) continue;
        await request.post(`${apiOrigin}/api/deleteRecord`, {
          data: {
            resource: "workoutTemplate",
            recordId: template.recordId,
          },
        });
      }
    }
    await request.post(`${apiOrigin}/api/deleteRecord`, {
      data: { resource: "program", recordId: program.recordId },
    });
  };

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("desktop edit path reaches the calendar and session editor", async ({
    page,
  }) => {
    const errs = trackErrors(page);
    await routeApiToStaging(page);
    await page.goto("/?view=coach&page=Workouts");
    await settle(page, 6000);

    const row = page
      .locator(".programTableRow")
      .filter({ hasText: "Ankle Rocker" })
      .first();
    await expect(row).toBeVisible({ timeout: 45_000 });
    const programName = (await row.locator(".programTableName strong").textContent())?.trim();
    await row.locator(".programTableActions button").first().click();
    await expect(page.locator(".pdpMeta")).toBeVisible();
    const editProgram = page.getByRole("button", { name: "Edit" }).first();
    await expect(editProgram).toBeEnabled({ timeout: 45_000 });
    await editProgram.click();

    await expect(page.locator(".programGrid")).toBeVisible();
    await expect(page.locator(".programGridCard").first()).toBeVisible();
    await expect(page.locator(".builderEditorWrap.asDrawer.open")).toBeVisible();
    await expect(page.locator(".drawerHeroSave")).toHaveText("Save Day");
    await expect(page.locator(".pbSaveBar button")).toHaveText(
      "Save Program + Exit"
    );
    if (programName) {
      await expect(
        page.getByRole("textbox", { name: "Program Name" })
      ).toHaveValue(programName);
    }

    const exercise = page.locator(".builderExerciseSummaryButton").first();
    await expect(exercise).toBeVisible();
    await exercise.click();
    const editor = page.locator(".builderEditModal");
    await expect(editor).toBeVisible();

    const cue = `QA cue ${Date.now()}`;
    await editor.getByRole("button", { name: "+ Cue" }).click();
    await editor.getByPlaceholder("Cue for the athlete...").fill(cue);
    await editor.getByRole("button", { name: "+ Tempo" }).click();
    const tempo = editor.locator('.exEditReveal[placeholder^="Tempo"]');
    await tempo.fill("3-1-1");
    await editor.getByRole("checkbox", { name: "Each side" }).check();
    await editor.getByRole("button", { name: "Done editing" }).click();
    await expect(editor).toBeHidden();

    // Exercise edits are local until Save Day. Reopening before and after the
    // day save proves the cue/prescription form does not discard the popup.
    await exercise.click();
    await expect(editor.getByPlaceholder("Cue for the athlete...")).toHaveValue(cue);
    await expect(tempo).toHaveValue("3-1-1");
    await expect(editor.getByRole("checkbox", { name: "Each side" })).toBeChecked();
    await editor.getByRole("button", { name: "Done editing" }).click();
    await page.locator(".drawerHeroSave").click();
    await expect(page.locator(".builderEditorWrap.asDrawer.open")).toBeHidden();

    const savedCard = page.locator(".programGridCard").filter({ hasText: cue }).first();
    // The compact card does not print cues, so reopen the same session by its
    // explicit edit action and verify the local day snapshot.
    const card = (await savedCard.count())
      ? savedCard
      : page.locator(".programGridCard").first();
    await card.getByTitle("Edit session").click();
    await page.locator(".builderExerciseSummaryButton").first().click();
    await expect(editor.getByPlaceholder("Cue for the athlete...")).toHaveValue(cue);
    await editor.getByRole("button", { name: "Done editing" }).click();
    errs.assertNoCrashes();
  });

  test("mobile edit path reaches program overview and day editor", async ({
    page,
  }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await routeApiToStaging(page);
    await page.goto("/?view=coach&page=Workouts");
    await settle(page, 6000);

    const row = page
      .locator(".programTableRow")
      .filter({ hasText: "Ankle Rocker" })
      .first();
    await expect(row).toBeVisible({ timeout: 45_000 });
    await row.locator(".programTableActions button").first().click();
    await expect(page.locator(".pdpMeta")).toBeVisible();
    const editProgram = page.getByRole("button", { name: "Edit" }).first();
    await expect(editProgram).toBeEnabled({ timeout: 45_000 });
    await editProgram.click();

    await expect(page.locator(".mbOverview")).toBeVisible();
    await expect(page.locator(".mbOvDay").first()).toBeVisible();
    await page.locator(".mbOvDay").first().click();
    await expect(page.locator(".mobileBuilderActionBar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Day" })).toBeVisible();
    errs.assertNoCrashes();
  });

  test("mobile Save Day does not leave an invalid empty day", async ({
    page,
  }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await routeApiToStaging(page);
    await page.goto("/?view=coach&page=Workouts");
    await expect(
      page.getByRole("button", { name: "Create Program" })
    ).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "Create Program" }).click();

    await expect(
      page.getByRole("heading", { name: "Program Details" })
    ).toBeVisible();
    await page
      .getByPlaceholder("e.g. 8-Week Hypertrophy")
      .fill("QA unsaved program");
    await page.getByRole("button", { name: "Create & Build" }).click();
    await expect(page.getByRole("heading", { name: "New Program" })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Add Exercises" })).toBeVisible();
    await page.getByRole("button", { name: "Save Day" }).click();

    await expect(page.getByRole("heading", { name: "Add Exercises" })).toBeVisible();
    await expect(page.locator(".mbOverview")).toHaveCount(0);
    errs.assertNoCrashes();
  });

  test("mobile create, cue, Save Day, Save Program and delete round-trip", async ({
    page,
    request,
  }) => {
    const errs = trackErrors(page);
    const programName = `QA Builder ${Date.now()}`;
    await page.setViewportSize({ width: 390, height: 844 });
    await routeApiToStaging(page);

    try {
      await page.goto("/?view=coach&page=Workouts");
      await expect(
        page.getByRole("button", { name: "Create Program" })
      ).toBeVisible({ timeout: 45_000 });
      await page.getByRole("button", { name: "Create Program" }).click();
      await page
        .getByPlaceholder("e.g. 8-Week Hypertrophy")
        .fill(programName);
      await page.getByRole("button", { name: "Create & Build" }).click();
      await page.getByRole("button", { name: "Next" }).click();

      await page.getByRole("button", { name: "Add Exercise" }).click();
      const picker = page.getByRole("dialog", { name: "Select exercises" });
      await expect(picker.locator(".mobilePickerRow").first()).toBeVisible({
        timeout: 45_000,
      });
      await picker.locator(".mobilePickerRow").first().click();
      await picker.getByRole("button", { name: "Add 1" }).click();

      await page
        .locator("textarea.mbNote")
        .first()
        .fill("Keep ribs stacked and move with control.");
      await page.getByRole("button", { name: "Save Day" }).click();
      await expect(page.locator(".mbOverview")).toBeVisible();
      await page.getByRole("button", { name: "Save Program" }).click();
      await expect(
        page.getByRole("heading", { name: "New Program" })
      ).toBeVisible({ timeout: 120_000 });

      await page.getByRole("button", { name: "Programs", exact: true }).click();
      const savedRow = page.locator(".programTableRow").filter({
        hasText: programName,
      });
      await expect(savedRow).toBeVisible({ timeout: 45_000 });
      page.once("dialog", (dialog) => dialog.accept());
      await savedRow.getByTitle("Delete program").click();
      await expect(savedRow).toHaveCount(0, { timeout: 45_000 });
      errs.assertNoCrashes();
    } finally {
      await removeQaProgram(request, programName);
    }
  });
});
