// Ported from tests/unit/api/{inPersonEnquiry,enquiries,assignProgram,
// deleteRecord,athleteMetrics,exerciseResults,analytics,formTemplates,
// testTemplates}.test.ts — the remaining coach-console surface.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import enquiryHandler from "../../../api/inPersonEnquiry.ts";
import enquiriesHandler from "../../../api/enquiries.ts";
import assignProgramHandler from "../../../api/assignProgram.ts";
import deleteRecordHandler from "../../../api/deleteRecord.ts";
import metricsHandler from "../../../api/athleteMetrics.ts";
import exerciseResultsHandler from "../../../api/exerciseResults.ts";
import analyticsHandler from "../../../api/analytics.ts";
import formTemplatesHandler from "../../../api/formTemplates.ts";
import testTemplatesHandler from "../../../api/testTemplates.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

beforeEach(async () => {
  await resetDb();
  vi.unstubAllEnvs();
  vi.stubEnv("FEISHU_BOT_WEBHOOK_URL", "");
  await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
  await seedProgram({ program_id: "PR-1001", name: "Season 1" });
});

afterAll(async () => {
  await closeDb();
});

async function call(handler: any, req: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq(req) as any, res as any);
  return res;
}

const post = (handler: any, body: Record<string, any>) =>
  call(handler, { method: "POST", body });
const get = (handler: any, query: Record<string, any> = {}) =>
  call(handler, { method: "GET", query });

describe("api/inPersonEnquiry + enquiries (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    expect((await get(enquiryHandler)).statusCode).toBe(405);
  });

  it("400s without contact details", async () => {
    const res = await post(enquiryHandler, {
      contactPerson: "Coach Wu",
      privacyAccepted: true,
      crossBorderAccepted: true,
    });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from enquiries")).toHaveLength(0);
  });

  it("400s without privacy consent and writes nothing", async () => {
    const res = await post(enquiryHandler, {
      contactPerson: "Coach Wu",
      contact: "13800000005",
      privacyAccepted: false,
    });
    expect(res.statusCode).toBe(400);
    // Consent is collected before any personal data is stored, not after.
    expect(await rows("select 1 from enquiries")).toHaveLength(0);
  });

  it("stores an enquiry a coach can follow up", async () => {
    const res = await post(enquiryHandler, {
      contactPerson: "Coach Wu",
      contact: "13800000005",
      organization: "Guangzhou Climbing Team",
      athletes: "12",
      notes: "Pre-season block for the youth squad",
      privacyAccepted: true,
      crossBorderAccepted: true,
    });
    expect(res.statusCode).toBe(200);

    const [enquiry] = await rows(
      "select contact_person, contact, organization, notes from enquiries"
    );
    expect(enquiry.contact_person).toBe("Coach Wu");
    expect(enquiry.contact).toBe("13800000005");
    expect(enquiry.organization).toBe("Guangzhou Climbing Team");
    // Without the contact route the lead is worthless.
    expect(enquiry.notes).toContain("youth squad");

    const list = await get(enquiriesHandler);
    expect(list.statusCode).toBe(200);
    expect(list.body.enquiries).toHaveLength(1);
  });
});

describe("api/assignProgram (postgres)", () => {
  const workout = (week: number, day: number) => ({
    week,
    day,
    sessionName: `W${week}D${day}`,
    sessionType: "Strength",
    scheduledDate: "2026-08-03",
  });

  it("400s without a client or program", async () => {
    const res = await post(assignProgramHandler, { scheduledWorkouts: [workout(1, 1)] });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from assigned_workouts")).toHaveLength(0);
  });

  it("400s without any scheduled workouts", async () => {
    const res = await post(assignProgramHandler, {
      clientRecordId: "CL-9001",
      programRecordId: "PR-1001",
      scheduledWorkouts: [],
    });
    expect(res.statusCode).toBe(400);
  });

  it("assigns a program to one athlete", async () => {
    const res = await post(assignProgramHandler, {
      clientRecordId: "CL-9001",
      programRecordId: "PR-1001",
      scheduledWorkouts: [workout(1, 1), workout(1, 4)],
    });
    expect(res.statusCode).toBe(200);

    const assigned = await rows("select client_id, program_id, day from assigned_workouts order by day");
    expect(assigned).toHaveLength(2);
    expect(assigned.every((a) => a.client_id === "CL-9001")).toBe(true);
    // Day spacing survives a team assign the same way it must survive a save.
    expect(assigned.map((a) => a.day)).toEqual([1, 4]);
  });

  it("assigns to a whole team in one call", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });

    const res = await post(assignProgramHandler, {
      clientRecordIds: ["CL-9001", "CL-9002"],
      programRecordId: "PR-1001",
      scheduledWorkouts: [workout(1, 1)],
    });
    expect(res.statusCode).toBe(200);

    const assigned = await rows("select client_id from assigned_workouts");
    expect(assigned).toHaveLength(2);
    expect(new Set(assigned.map((a) => a.client_id))).toEqual(new Set(["CL-9001", "CL-9002"]));
  });
});

describe("api/deleteRecord (postgres)", () => {
  it("400s without a resource or id", async () => {
    expect((await post(deleteRecordHandler, { resource: "client" })).statusCode).toBe(400);
  });

  it("refuses an unsupported resource", async () => {
    const res = await post(deleteRecordHandler, { resource: "everything", recordId: "x" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Unsupported delete resource");
  });

  it("deletes a scheduled workout", async () => {
    await pool.query(
      `insert into assigned_workouts (assigned_workout_id, client_id, session_name)
       values ('AW-1', 'CL-9001', 'Lower Body')`
    );

    const res = await post(deleteRecordHandler, {
      resource: "workout",
      recordId: "AW-1",
      clientCode: "CL-9001",
    });
    expect(res.statusCode).toBe(200);
    expect(await rows("select 1 from assigned_workouts")).toHaveLength(0);
  });

  it("deletes a client who has messaged their coach (client_messages FK)", async () => {
    await pool.query(
      `insert into client_messages (message_id, client_id, client_name, body, status)
       values ('MSG-1', 'CL-9001', 'Bob Tan', 'hello coach', 'new')`
    );

    const res = await post(deleteRecordHandler, {
      resource: "client",
      recordId: "CL-9001",
      clientCode: "CL-9001",
    });
    expect(res.statusCode).toBe(200);
    expect(await rows("select 1 from clients")).toHaveLength(0);
    expect(await rows("select 1 from client_messages")).toHaveLength(0);
  });
});

describe("api/athleteMetrics + exerciseResults + analytics (postgres)", () => {
  it("rejects a non-GET metrics read with 405", async () => {
    expect((await post(metricsHandler, {})).statusCode).toBe(405);
  });

  it("returns an empty metrics set for a new athlete", async () => {
    const res = await get(metricsHandler, { clientId: "CL-9001" });
    expect(res.statusCode).toBe(200);
    expect(res.body.metrics ?? []).toEqual([]);
  });

  it("returns only the requested athlete's exercise results", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });
    await pool.query("insert into exercises (exercise_id, name) values ('EX-1', 'Back Squat')");
    for (const [id, client] of [
      ["ER-1", "CL-9001"],
      ["ER-2", "CL-9002"],
    ]) {
      await pool.query(
        `insert into exercise_results (result_id, client_id, exercise_id, exercise_name, date)
         values ($1, $2, 'EX-1', 'Back Squat', $3)`,
        [id, client, Date.parse("2026-08-03T00:00:00Z")]
      );
    }

    const res = await get(exerciseResultsHandler, { clientId: "CL-9001" });
    expect(res.statusCode).toBe(200);
    // A leak here would show one athlete another's test numbers.
    expect(res.body.results).toHaveLength(1);
  });

  it("serves analytics without a client filter", async () => {
    const res = await get(analyticsHandler);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeTruthy();
  });
});

describe("api/formTemplates + testTemplates (postgres)", () => {
  it("lists form templates", async () => {
    await pool.query(
      "insert into form_templates (form_id, name, type) values ('FM-1', 'Intake', 'Questionnaire')"
    );

    const res = await get(formTemplatesHandler);
    expect(res.statusCode).toBe(200);
    expect(res.body.forms).toHaveLength(1);
    expect(res.body.forms[0].name).toBe("Intake");
  });

  it("400s a form template delete without an id", async () => {
    const res = await call(formTemplatesHandler, { method: "DELETE", body: {} });
    expect(res.statusCode).toBe(400);
  });

  it("deletes a form template", async () => {
    await pool.query(
      "insert into form_templates (form_id, name, type) values ('FM-1', 'Intake', 'Questionnaire')"
    );

    const res = await call(formTemplatesHandler, {
      method: "DELETE",
      body: { recordId: "FM-1", formId: "FM-1" },
    });
    expect(res.statusCode).toBe(200);
    expect(await rows("select 1 from form_templates")).toHaveLength(0);
  });

  it("lists test templates", async () => {
    const res = await get(testTemplatesHandler);
    expect(res.statusCode).toBe(200);
    expect(res.body.tests ?? []).toEqual([]);
  });

  it("400s a test template delete without an id", async () => {
    const res = await call(testTemplatesHandler, { method: "DELETE", body: {} });
    expect(res.statusCode).toBe(400);
  });
});
