// Ported from tests/unit/api/{assignContent,contentAssignments,
// submitContentResponse,updateContentAssignmentDate,contentResponses}.test.ts.
// This is the intake flow: after a purchase the athlete is assigned a
// questionnaire, fills it in, and the coach reads the answers before building
// their program. A dropped answer here means a coach programming blind.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import assignHandler from "../../../api/assignContent.ts";
import listHandler from "../../../api/contentAssignments.ts";
import submitHandler from "../../../api/submitContentResponse.ts";
import updateDateHandler from "../../../api/updateContentAssignmentDate.ts";
import responsesHandler from "../../../api/contentResponses.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

beforeEach(async () => {
  await resetDb();
  await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
  await pool.query(
    "insert into form_templates (form_id, name, type) values ($1, $2, $3)",
    ["FM-1001", "Intake Questionnaire", "Questionnaire"]
  );
});

afterAll(async () => {
  await closeDb();
});

async function call(handler: any, req: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq(req) as any, res as any);
  return res;
}

const assign = (body: Record<string, any> = {}) =>
  call(assignHandler, {
    method: "POST",
    body: {
      assignmentType: "Questionnaire",
      templateId: "FM-1001",
      clientId: "CL-9001",
      ...body,
    },
  });

describe("api/assignContent (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    expect((await call(assignHandler, { method: "GET" })).statusCode).toBe(405);
  });

  it("400s without the assignment identifiers", async () => {
    const res = await call(assignHandler, {
      method: "POST",
      body: { assignmentType: "Questionnaire" },
    });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from assigned_forms")).toHaveLength(0);
  });

  it("assigns a questionnaire to the athlete", async () => {
    const res = await assign();
    expect(res.statusCode).toBe(200);

    const [assigned] = await rows(
      "select assigned_form_id, form_id, client_id, status from assigned_forms"
    );
    expect(assigned.form_id).toBe("FM-1001");
    expect(assigned.client_id).toBe("CL-9001");
    // It has to start life as outstanding, or the onboarding gate that waits
    // on a pending questionnaire never fires.
    expect(String(assigned.status || "").toLowerCase()).not.toBe("completed");
  });

  it("records the due date the coach chose", async () => {
    const res = await assign({ dueDate: "2026-08-10" });
    expect(res.statusCode).toBe(200);

    const [assigned] = await rows("select assigned_date from assigned_forms");
    expect(assigned.assigned_date).toBeTruthy();
  });
});

describe("api/contentAssignments (postgres)", () => {
  it("rejects non-GET with 405", async () => {
    expect((await call(listHandler, { method: "POST" })).statusCode).toBe(405);
  });

  it("returns [] for an athlete with nothing assigned", async () => {
    const res = await call(listHandler, { method: "GET", query: { clientId: "CL-9001" } });
    expect(res.statusCode).toBe(200);
    expect(res.body.assignments).toEqual([]);
  });

  it("returns only the requested athlete's assignments", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });
    await assign();
    await assign({ clientId: "CL-9002" });

    const res = await call(listHandler, { method: "GET", query: { clientId: "CL-9001" } });
    expect(res.statusCode).toBe(200);
    expect(res.body.assignments).toHaveLength(1);
  });
});

describe("api/submitContentResponse (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    expect((await call(submitHandler, { method: "GET" })).statusCode).toBe(405);
  });

  it("400s without the required identifiers", async () => {
    const res = await call(submitHandler, {
      method: "POST",
      body: { assignmentType: "Questionnaire" },
    });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from form_responses")).toHaveLength(0);
  });

  // Answers arrive as an array of {questionId, label, value}; the free-text
  // box rides along as a __client_comment entry rather than its own field.
  const answerList = [
    { questionId: "q1", label: "Training age", value: "3 years" },
    { questionId: "q2", label: "Injuries", value: "left shoulder impingement" },
    { questionId: "__client_comment", value: "Training around a shoulder issue" },
  ];

  async function assignedId(): Promise<string> {
    const [assigned] = await rows("select assigned_form_id from assigned_forms");
    return assigned.assigned_form_id;
  }

  it("stores the athlete's answers and their free-text comment", async () => {
    await assign();

    const res = await call(submitHandler, {
      method: "POST",
      body: {
        assignmentType: "Questionnaire",
        assignmentId: await assignedId(),
        templateId: "FM-1001",
        clientId: "CL-9001",
        clientName: "Bob Tan",
        responses: answerList,
      },
    });
    expect(res.statusCode).toBe(200);

    const [response] = await rows(
      "select client_id, form_id, answers, client_comment from form_responses"
    );
    expect(response.client_id).toBe("CL-9001");
    expect(response.form_id).toBe("FM-1001");
    // The answers are the entire point — a coach builds the program from
    // them. Losing them silently is the worst case here (#43).
    expect(JSON.stringify(response.answers)).toContain("shoulder impingement");
    expect(response.client_comment).toBe("Training around a shoulder issue");
  });

  it("marks the assignment completed so onboarding can move on", async () => {
    await assign();

    await call(submitHandler, {
      method: "POST",
      body: {
        assignmentType: "Questionnaire",
        assignmentRecordId: await assignedId(),
        templateId: "FM-1001",
        clientId: "CL-9001",
        responses: answerList,
      },
    });

    const [assigned] = await rows("select status, completed_at from assigned_forms");
    // The purchase-onboarding screen waits on this; if it never flips, the
    // athlete is stuck on "complete your intake" forever.
    expect(String(assigned.status || "").toLowerCase()).toContain("complet");
    expect(assigned.completed_at).toBeTruthy();
  });

  it("completion keys off assignmentRecordId specifically, not assignmentId", async () => {
    await assign();

    await call(submitHandler, {
      method: "POST",
      body: {
        assignmentType: "Questionnaire",
        assignmentId: await assignedId(), // the other id, on its own
        templateId: "FM-1001",
        clientId: "CL-9001",
        responses: answerList,
      },
    });

    // Sharp edge, pinned so it can't drift unnoticed: the response link
    // accepts either id, but the completion update reads only
    // assignmentRecordId. Both real callers (App.tsx and the mini program's
    // forms page) send both, so this is latent rather than live — a future
    // caller sending only assignmentId would file the answers correctly and
    // silently leave the athlete's intake showing as outstanding.
    const [assigned] = await rows("select status from assigned_forms");
    expect(String(assigned.status || "").toLowerCase()).not.toContain("complet");
    expect(await rows("select 1 from form_responses")).toHaveLength(1);
  });

  it("links the response to its assignment", async () => {
    await assign();
    const id = await assignedId();

    await call(submitHandler, {
      method: "POST",
      body: {
        assignmentType: "Questionnaire",
        assignmentId: id,
        templateId: "FM-1001",
        clientId: "CL-9001",
        responses: answerList,
      },
    });

    const [response] = await rows("select assigned_form_id from form_responses");
    // Without the link a coach sees answers with no way to tell which
    // questionnaire they belong to.
    expect(response.assigned_form_id).toBe(id);
  });
});

describe("api/updateContentAssignmentDate (postgres)", () => {
  it("rejects an unsupported method with 405", async () => {
    expect((await call(updateDateHandler, { method: "GET" })).statusCode).toBe(405);
  });

  it("400s without the identifiers", async () => {
    const res = await call(updateDateHandler, {
      method: "POST",
      body: { assignmentType: "Questionnaire" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("moves an assignment's date", async () => {
    await assign({ dueDate: "2026-08-01" });
    const [assigned] = await rows("select assigned_form_id, assigned_date from assigned_forms");

    const res = await call(updateDateHandler, {
      method: "POST",
      body: {
        assignmentType: "Questionnaire",
        recordId: assigned.assigned_form_id,
        scheduledDate: "2026-08-15",
      },
    });
    expect(res.statusCode).toBe(200);

    const [after] = await rows("select assigned_date from assigned_forms");
    expect(Number(after.assigned_date)).not.toBe(Number(assigned.assigned_date));
  });
});

describe("api/contentResponses (postgres)", () => {
  it("rejects non-GET with 405", async () => {
    expect((await call(responsesHandler, { method: "POST" })).statusCode).toBe(405);
  });

  it("returns the submitted responses for an athlete", async () => {
    await assign();
    const [assigned] = await rows("select assigned_form_id from assigned_forms");
    await call(submitHandler, {
      method: "POST",
      body: {
        assignmentType: "Questionnaire",
        assignmentId: assigned.assigned_form_id,
        templateId: "FM-1001",
        clientId: "CL-9001",
        responses: [{ questionId: "q1", label: "Training age", value: "3 years" }],
      },
    });

    const res = await call(responsesHandler, {
      method: "GET",
      query: { clientId: "CL-9001" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.responses.length).toBeGreaterThan(0);
  });
});
