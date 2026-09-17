import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, getTableColumns } from "drizzle-orm";
import { db, pool } from "../../../server/db/client.ts";
import { translationAreas, fillRowTranslations, drainTranslations, translationPatch, type TranslationArea } from "../../../server/db/contentTranslations.ts";
import { createFormTemplate, updateFormTemplate, listFormTemplates } from "../../../server/db/pg/formTemplates.ts";
import { createTestTemplate, updateTestTemplate, listTestTemplates } from "../../../server/db/pg/testTemplates.ts";
import { createProgram, updateProgram, listPrograms } from "../../../server/db/pg/programs.ts";
import { replyToMessage } from "../../../server/db/pg/clientMessages.ts";
import { getContentResponses } from "../../../server/db/repositories/contentResponses.ts";
import { createCheckIn } from "../../../server/db/pg/checkIns.ts";
import { getCached, setCached } from "../../../api/_cache.ts";
import { closeDb, resetDb, rows, seedClient } from "./helpers.ts";

const provider = vi.hoisted(() => vi.fn());
vi.mock("../../../server/db/translate.ts", () => ({
  translateText: provider,
  translationsConfigured: () => true,
}));

beforeEach(async () => {
  await drainTranslations();
  await resetDb();
  provider.mockReset().mockImplementation(async (text: string, target: string) => `${target}: ${text}`);
});
afterEach(async () => { await drainTranslations(); });
afterAll(closeDb);

describe("translation persistence coverage", () => {
  it("fills every registered area and preserves original text", async () => {
    for (const [name, config] of Object.entries(translationAreas)) {
      const columns = getTableColumns(config.table);
      const record: Record<string, any> = { [config.id]: `fixture-${name}` };
      for (const [key, col] of Object.entries(columns)) {
        if (col.notNull && !col.hasDefault && !record[key]) record[key] = `Fixture ${key}`;
      }
      for (const f of config.fields) {
        record[f.source] = f.kind === "answers" ? [{ questionId: "q-1", label: "感受", value: "感觉很好", unit: "kg" }] :
          f.source === "equipment" ? ["Barbell", "Bench"] : f.kind === "options" ? ["Yes", "No"] : `${name} ${f.source}: 3 x 5, 80 kg`;
      }
      await db.insert(config.table).values(record);
      const result = await fillRowTranslations(name as TranslationArea, [record[config.id]]);
      expect(result, name).toEqual({ filled: config.fields.length, unavailable: 0 });
      const [saved] = await db.select().from(config.table).where(eq(columns[config.id], record[config.id]));
      for (const f of config.fields) {
        expect(saved[f.source], `${name}.${f.source}`).toEqual(record[f.source]);
        expect(saved[f.mirror], `${name}.${f.mirror}`).toBeTruthy();
      }
    }
  });

  it("automatically translates new forms, help text and choices through the write path", async () => {
    const result = await createFormTemplate({ name: "Training intake", description: "Tell your coach", questions: [
      { label: "Experience", helpText: "Choose one", questionType: "Choice", options: "Beginner, Experienced" },
    ] });
    await drainTranslations();
    const form = (await listFormTemplates()).body.forms[0];
    expect(form.nameCn).toBe("zh: Training intake");
    expect(form.descriptionCn).toBe("zh: Tell your coach");
    expect(JSON.parse(form.questions[0].optionsCn)).toEqual(["zh: Beginner", "zh: Experienced"]);
    expect(form.questions[0].helpTextCn).toBe("zh: Choose one");
    await updateFormTemplate({ recordId: result.body.formId, formId: result.body.formId, name: "Updated intake", questions: [
      { label: "Experience", helpText: "Choose carefully", options: "First, Second" },
    ] });
    await drainTranslations();
    const updated = (await listFormTemplates()).body.forms[0];
    expect(updated.nameCn).toBe("zh: Updated intake");
    expect(updated.questions[0].helpTextCn).toBe("zh: Choose carefully");
    expect(JSON.parse(updated.questions[0].optionsCn)).toEqual(["zh: First", "zh: Second"]);
  });

  it("translates test instructions again when the protocol changes", async () => {
    const result = await createTestTemplate({ name: "Jump test", description: "Measure your jump", items: [
      { testName: "CMJ", instructions: "Jump 3 times", unit: "cm" },
    ] });
    await drainTranslations();
    let test = (await listTestTemplates()).body.tests[0];
    expect(test.nameCn).toBe("zh: Jump test");
    expect(test.items[0].instructionsCn).toBe("zh: Jump 3 times");
    await updateTestTemplate({ recordId: result.body.testTemplateId, testTemplateId: result.body.testTemplateId,
      name: "Jump test", items: [{ testName: "CMJ", instructions: "Jump 5 times", unit: "cm" }] });
    await drainTranslations();
    test = (await listTestTemplates()).body.tests[0];
    expect(test.items[0].instructionsCn).toBe("zh: Jump 5 times");
  });

  it("translates all storefront fields, invalidates cached reads and protects explicit Chinese", async () => {
    const result = await createProgram({ programName: "Strength", programNameCn: "教练审核名称", goal: "Get stronger",
      phase: "Base", salesDescription: "Build strength", storeDescription: "Four weeks", storeCategory: "Training" });
    setCached("programs", [{ programName: "stale" }], 600_000);
    await drainTranslations();
    const program = (await listPrograms())[0];
    expect(program.programNameCn).toBe("教练审核名称");
    expect(program.salesDescriptionCn).toBe("zh: Build strength");
    expect(program.storeDescriptionCn).toBe("zh: Four weeks");
    expect(program.phaseCn).toBe("zh: Base");
    expect(getCached("programs")).toBeNull();
    await updateProgram({ programRecordId: result.body.programId, goal: "Improve power", programNameCn: "新审核名称" });
    await drainTranslations();
    const updated = (await listPrograms())[0];
    expect(updated.programNameCn).toBe("新审核名称");
    expect(updated.goalCn).toBe("zh: Improve power");
    expect(provider.mock.calls.some(([text]) => text === "Strength")).toBe(false);
  });

  it("does not let an older delayed coach reply replace the newest translation", async () => {
    await pool.query("insert into client_messages(message_id, body, body_en) values ('MSG-race', 'original', 'original')");
    const waiting = new Map<string, (text: string) => void>();
    provider.mockImplementation((text) => new Promise((resolve) => waiting.set(text, resolve)));
    await replyToMessage("MSG-race", "First reply");
    await vi.waitFor(() => expect(waiting.has("First reply")).toBe(true));
    await replyToMessage("MSG-race", "Second reply");
    await vi.waitFor(() => expect(waiting.has("Second reply")).toBe(true));
    waiting.get("Second reply")!("最新回复");
    await vi.waitFor(async () => expect((await rows("select coach_reply_cn from client_messages"))[0].coach_reply_cn).toBe("最新回复"));
    waiting.get("First reply")!("旧回复");
    await drainTranslations();
    expect((await rows("select coach_reply_cn from client_messages"))[0].coach_reply_cn).toBe("最新回复");
  });

  it("retains athlete data when translation is unavailable and can fill it later", async () => {
    await seedClient();
    provider.mockResolvedValue(null);
    const response = await createCheckIn({ clientId: "CL-9001", submittedDate: "2026-09-11", clientNotes: "今天感觉很好" });
    await drainTranslations();
    const saved = (await rows("select * from check_ins"))[0];
    expect(response.success).toBe(true);
    expect(saved.client_notes).toBe("今天感觉很好");
    expect(saved.client_notes_en).toBeNull();
    provider.mockResolvedValue("Feeling good today");
    await fillRowTranslations("checkIns", [saved.checkin_id]);
    expect((await rows("select client_notes_en from check_ins"))[0].client_notes_en).toBe("Feeling good today");
  });

  it("exposes translated questionnaire answers without changing IDs, units or zero values", async () => {
    await pool.query("insert into form_responses(response_id, answers) values ($1, $2)", ["FR-text", JSON.stringify([
      { questionId: "q-1", label: "训练感受", value: "今天感觉很好", unit: "kg" },
      { questionId: "q-2", label: "Pain score", value: 0 },
    ])]);
    await fillRowTranslations("formResponses", ["FR-text"]);
    const responses = await getContentResponses();
    expect(responses[0].answer).toBe("今天感觉很好");
    expect(responses[0].answerEn).toBe("en: 今天感觉很好");
    expect(responses[0].itemId).toBe("q-1");
    expect(responses[0].unit).toBe("kg");
    expect(responses[1].answer).toBe("0");
    expect(responses[1].answerEn).toBe("0");
  });

  it("keeps a saved translation for an unchanged source and clears it atomically on edits", async () => {
    const config = translationAreas.programs;
    await db.insert(config.table).values({ programId: "PR-edit", name: "Base", nameCn: "基础" });
    await db.update(config.table).set(translationPatch("programs", { name: "Base" })).where(eq(config.table.programId, "PR-edit"));
    expect((await rows("select name_cn from programs"))[0].name_cn).toBe("基础");
    await db.update(config.table).set(translationPatch("programs", { name: "Power" })).where(eq(config.table.programId, "PR-edit"));
    expect((await rows("select name_cn from programs"))[0].name_cn).toBeNull();
  });
});
