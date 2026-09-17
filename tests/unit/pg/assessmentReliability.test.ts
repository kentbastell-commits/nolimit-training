import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDb, resetDb, rows, seedClient, makeReq, makeRes } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";
import { submitContentResponse } from "../../../server/db/repositories/contentResponses.ts";
import { getContentResponses } from "../../../server/db/repositories/contentResponses.ts";
import reviewHandler from "../../../api/reviewContentSubmission.ts";

beforeEach(async () => {
  await resetDb();
  await seedClient();
  await pool.query("insert into form_templates(form_id,name) values('F','Weekly reflection')");
  await pool.query("insert into form_questions(question_id,form_id,label,question_type,required,options) values('Q','F','Needs','Multi Choice',true,'[\"Recovery\",\"Technique\"]')");
  await pool.query("insert into assigned_forms(assigned_form_id,form_id,client_id,client_code,status) values('A','F','CL-9001','CL-9001','Assigned')");
});
afterAll(closeDb);
const form = (id = "A", value = '["Recovery"]') => ({ assignmentType: "Questionnaire", assignmentId: id, templateId: "F", clientId: "CL-9001", responses: [{ questionId: "Q", label: "Needs", value }] });
async function seedTest() {
  await pool.query("insert into test_templates(test_template_id,name) values('T','Strength test')");
  await pool.query("insert into test_items(test_item_id,test_template_id,test_name,unit,creates_metric,calculation_method) values('I1','T','Squat','kg',true,'Epley'),('I2','T','Jump','cm',false,'Direct Value')");
  await pool.query("insert into assigned_tests(assigned_test_id,test_template_id,client_id,client_code) values('AT','T','CL-9001','CL-9001')");
  return { assignmentType: "Physical Test", assignmentId: "AT", templateId: "T", clientId: "CL-9001", responses: [{ itemId: "I1", value: "80 kg x 5 reps" }, { itemId: "I2", value: "40" }] };
}
describe("assessment submission reliability", () => {
  it("accepts 40 distinct submissions in the same millisecond", async () => {
    await pool.query("insert into assigned_forms(assigned_form_id,form_id,client_id,client_code,status) select 'BURST-' || n,'F','CL-9001','CL-9001','Assigned' from generate_series(1,40) n");
    const now = vi.spyOn(Date, "now").mockReturnValue(1789100000000);
    try {
      const results = await Promise.all(Array.from({ length: 40 }, (_, i) => submitContentResponse(form(`BURST-${i + 1}`))));
      expect(results.every(r => r.status === 200)).toBe(true);
      expect(await rows("select 1 from form_responses")).toHaveLength(40);
    } finally { now.mockRestore(); }
  });
  it("coalesces concurrent retries and lost acknowledgements into one answer", async () => {
    const results = await Promise.all([submitContentResponse(form()), submitContentResponse(form())]);
    expect(results.map(r => r.status)).toEqual([200, 200]);
    expect(results.filter(r => r.body.alreadySubmitted)).toHaveLength(1);
    expect((await submitContentResponse(form())).body.alreadySubmitted).toBe(true);
    expect(await rows("select 1 from form_responses")).toHaveLength(1);
  });
  it.each(["[]", '["Invented"]', " ", "not json"])("rejects empty or invalid required choices: %s", async value => {
    expect((await submitContentResponse(form("A", value))).status).toBe(400);
    expect(await rows("select 1 from form_responses")).toHaveLength(0);
    expect((await rows("select completed_at from assigned_forms"))[0].completed_at).toBeNull();
  });
  it("rolls back every result and metric when the second test result fails", async () => {
    const input = await seedTest();
    await pool.query("create function assessment_test_fail() returns trigger language plpgsql as $$ begin if NEW.test_item_id='I2' then raise exception 'injected result failure'; end if; return NEW; end $$");
    await pool.query("create trigger assessment_test_failure before insert on test_results for each row execute function assessment_test_fail()");
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await submitContentResponse(input)).status).toBe(500);
      expect(await rows("select 1 from test_results")).toHaveLength(0);
      expect(await rows("select 1 from athlete_metrics")).toHaveLength(0);
      expect((await rows("select completed_at from assigned_tests"))[0].completed_at).toBeNull();
    } finally {
      quiet.mockRestore();
      await pool.query("drop trigger assessment_test_failure on test_results");
      await pool.query("drop function assessment_test_fail()");
    }
    expect((await submitContentResponse(input)).status).toBe(200);
    expect((await submitContentResponse(input)).body.alreadySubmitted).toBe(true);
    expect(await rows("select 1 from test_results")).toHaveLength(2);
    expect(await rows("select 1 from athlete_metrics")).toHaveLength(1);
  });
  it("rejects an incomplete test before writing its first result", async () => {
    const input = await seedTest(); input.responses[1].value = "";
    expect((await submitContentResponse(input)).status).toBe(400);
    expect(await rows("select 1 from test_results")).toHaveLength(0);
  });
  it("uses an explicit intake flag and leaves routine questionnaire completion in place", async () => {
    expect((await submitContentResponse(form())).body.isIntake).toBe(false);
    await pool.query("insert into assigned_forms(assigned_form_id,form_id,client_id,is_intake) values('INTAKE','F','CL-9001',true)");
    expect((await submitContentResponse(form("INTAKE"))).body.isIntake).toBe(true);
    expect((await rows("select intake_status from clients"))[0].intake_status).toBe("Submitted");
  });
  it("persists review status and exposes the assessment title without dropping answers", async () => {
    await submitContentResponse(form());
    const res = makeRes();
    await reviewHandler(makeReq({ method: "POST", body: { assignmentId: "A", assignmentType: "Questionnaire" } }) as any, res as any);
    expect(res.statusCode).toBe(200);
    const responses = await getContentResponses("CL-9001");
    expect(responses[0]).toMatchObject({ templateName: "Weekly reflection", answer: '["Recovery"]' });
    expect(responses[0].reviewedAt).toBeGreaterThan(0);
    const undo = makeRes();
    await reviewHandler(makeReq({ method: "POST", body: { assignmentId: "A", assignmentType: "Questionnaire", reviewed: false } }) as any, undo as any);
    expect((await getContentResponses("CL-9001"))[0].reviewedAt).toBeNull();
  });
});
