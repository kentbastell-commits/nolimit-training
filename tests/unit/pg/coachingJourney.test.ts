import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";
import { markOrdersPaidByWxpay, updateProductOrder } from "../../../server/db/repositories/productOrders.ts";
import { getCoachingJourney } from "../../../server/db/pg/coachingJourney.ts";
import { submitContentResponse } from "../../../server/db/repositories/contentResponses.ts";

beforeEach(resetDb);
afterAll(closeDb);
async function order(id = "ORD-C1", trade = "NLCOACH1", client = "CL-9001") {
  await rows(`insert into product_orders (order_id, client_id, product_type, payment_status, wxpay_trade_no, assign_coach, purchased_at)
    values ($1,$2,'Online Coaching','Pending',$3,'Kent Bastell',100)`, [id, client, trade]);
}
describe("coaching purchase to first session", () => {
  it("upgrades an existing digital client only after confirmation, preserving their program", async () => {
    await seedClient({ client_type: "Digital Program", purchased_program_id: "OWNED-PROGRAM" });
    await order();
    expect(await getCoachingJourney("CL-9001")).toMatchObject({ stage: "payment_pending", coached: false });
    expect((await rows("select client_type from clients"))[0].client_type).toBe("Digital Program");
    await markOrdersPaidByWxpay("NLCOACH1", "wx-confirmed");
    expect((await rows("select client_type, purchased_program_id, coach_assigned from clients"))[0]).toMatchObject({
      client_type: "Online Coaching", purchased_program_id: "OWNED-PROGRAM", coach_assigned: "Kent Bastell",
    });
    expect(await getCoachingJourney("CL-9001")).toMatchObject({ stage: "intake", coached: true, pendingAssessments: 1 });
    // The athlete intake: ten optional questions (name, age, schedule, competition …).
    expect(await rows("select question_id from form_questions")).toHaveLength(10);
    expect(await markOrdersPaidByWxpay("NLCOACH1", "wx-confirmed")).toEqual([]);
    expect(await rows("select assigned_form_id from assigned_forms")).toHaveLength(1);
  });
  it("concurrent payments for the same new athlete assign intake once", async () => {
    await seedClient(); await order(); await order("ORD-C2", "NLCOACH2");
    await Promise.all([markOrdersPaidByWxpay("NLCOACH1", "wx-1"), markOrdersPaidByWxpay("NLCOACH2", "wx-2")]);
    expect(await rows("select assigned_form_id from assigned_forms")).toHaveLength(1);
  });
  it("a digital program and its old intake do not replace a new coaching intake", async () => {
    await seedClient({ client_type: "Digital Program", intake_status: "Submitted" }); await seedProgram();
    await rows("insert into assigned_workouts (assigned_workout_id,client_id,program_id) values ('AW-DIGITAL','CL-9001','PR-1001')");
    await rows("insert into form_templates (form_id,name) values ('DIGITAL-INTAKE','Digital intake')");
    await rows(`insert into assigned_forms (assigned_form_id,form_id,client_id,is_intake,product_type,status,completed_at)
      values ('AF-DIGITAL','DIGITAL-INTAKE','CL-9001',true,'Digital Program','Completed',100)`);
    await order(); await markOrdersPaidByWxpay("NLCOACH1", "wx-upgrade");
    expect(await rows("select assigned_form_id from assigned_forms where form_id='FORM-COACHING-INTAKE'")).toHaveLength(1);
    expect(await getCoachingJourney("CL-9001")).toMatchObject({ coached: true, pendingAssessments: 1 });
    expect((await getCoachingJourney("CL-9001"))!.intakeAssignmentId).toBeTruthy();
  });
  it("coach-verified orders use the same activation and completion recovers on a new device", async () => {
    await seedClient(); await order();
    await updateProductOrder({ recordId: "ORD-C1", paymentStatus: "Paid" });
    const [assignment] = await rows("select * from assigned_forms");
    const questions = await rows<{ question_id: string; question_type: string }>("select question_id, question_type from form_questions order by order_index");
    const answerFor = (type: string) => (/number/i.test(type) ? "14" : /select/i.test(type) ? "Yes" : "Training answer");
    const saved = await submitContentResponse({ assignmentType: "Questionnaire", assignmentId: assignment.assigned_form_id,
      templateId: assignment.form_id, clientId: "CL-9001", responses: questions.map(q => ({ questionId: q.question_id, value: answerFor(q.question_type) })) });
    expect(saved.status).toBe(200);
    expect(await getCoachingJourney("CL-9001")).toMatchObject({ stage: "preparing", pendingAssessments: 0, intakeAssignmentId: "" });
    await order("ORD-C2", "NLCOACH2"); await markOrdersPaidByWxpay("NLCOACH2", "wx-renewal");
    expect(await rows("select assigned_form_id from assigned_forms")).toHaveLength(1);
  });
  it("active athletes and previously completed intakes are not restarted", async () => {
    await seedClient({ client_type: "Online Coaching" }); await seedProgram();
    await rows("insert into assigned_workouts (assigned_workout_id,client_id,program_id) values ('AW-C','CL-9001','PR-1001')");
    await order(); await markOrdersPaidByWxpay("NLCOACH1", "wx-renewal");
    expect(await rows("select assigned_form_id from assigned_forms")).toHaveLength(0);
    expect(await getCoachingJourney("CL-9001")).toMatchObject({ stage: "active" });
  });
  it("resaving a paid order does not reactivate a deliberately paused client", async () => {
    await seedClient(); await order();
    await updateProductOrder({ recordId: "ORD-C1", paymentStatus: "Paid" });
    await rows("update clients set subscription_status='Paused'");
    await updateProductOrder({ recordId: "ORD-C1", paymentStatus: "Paid", clientRecordId: "CL-9001" });
    expect((await rows("select subscription_status from clients"))[0].subscription_status).toBe("Paused");
    expect(await rows("select assigned_form_id from assigned_forms")).toHaveLength(1);
  });
  it("does not assign online intake to in-person orders or return another athlete's tasks", async () => {
    await seedClient(); await order();
    await rows("update product_orders set product_type='In-Person Training'");
    await markOrdersPaidByWxpay("NLCOACH1", "wx-inperson");
    expect(await rows("select assigned_form_id from assigned_forms")).toHaveLength(0);
    await seedClient({ client_id: "CL-9002" });
    expect(await getCoachingJourney("CL-9002")).toMatchObject({ stage: "prospect", coached: false, pendingAssessments: 0 });
    expect(await getCoachingJourney("CL-9999")).toBeNull();
  });
  it("rolls back payment confirmation if intake cannot be assigned", async () => {
    await seedClient(); await order();
    await rows(`create function fail_coaching_intake() returns trigger language plpgsql as $$ begin raise exception 'intake unavailable'; end; $$`);
    await rows("create trigger fail_coaching_intake before insert on assigned_forms for each row execute function fail_coaching_intake()");
    try {
      await expect(markOrdersPaidByWxpay("NLCOACH1", "wx-retry")).rejects.toThrow();
      expect((await rows("select payment_status from product_orders"))[0].payment_status).toBe("Pending");
      expect((await rows("select client_type from clients"))[0].client_type).toBeNull();
    } finally {
      await rows("drop trigger fail_coaching_intake on assigned_forms");
      await rows("drop function fail_coaching_intake()");
    }
    await markOrdersPaidByWxpay("NLCOACH1", "wx-retry");
    expect(await getCoachingJourney("CL-9001")).toMatchObject({ stage: "intake" });
  });
});
