// Ported from tests/unit/api/{checkIns,saveWorkloadLog,workloadLogs}.test.ts.
// These are the coached-athlete feedback loop: the weekly check-in the coach
// reviews, and the daily training-load log that feeds workload monitoring.
// Both are written from the mini program as well as the portal.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import checkInsHandler from "../../../api/checkIns.ts";
import saveWorkloadHandler from "../../../api/saveWorkloadLog.ts";
import listWorkloadHandler from "../../../api/workloadLogs.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
  await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
});

afterAll(async () => {
  await closeDb();
});

async function call(handler: any, req: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq(req) as any, res as any);
  return res;
}

describe("api/checkIns (postgres)", () => {
  it("rejects an unsupported method with 405", async () => {
    const res = await call(checkInsHandler, { method: "DELETE" });
    expect(res.statusCode).toBe(405);
  });

  it("400s a create without any client reference", async () => {
    const res = await call(checkInsHandler, {
      method: "POST",
      body: { sleepQuality: 7 },
    });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from check_ins")).toHaveLength(0);
  });

  it("stores a submitted check-in with its readiness score", async () => {
    const res = await call(checkInsHandler, {
      method: "POST",
      body: {
        clientId: "CL-9001",
        submittedDate: "2026-07-26",
        sleepQuality: 8,
        energy: 7,
        mood: 8,
        soreness: 3,
        stress: 4,
        readinessScore: 76,
        wins: "hit a new 5RM",
        problemsPain: "left knee tight",
      },
    });
    expect(res.statusCode).toBe(200);

    const [checkIn] = await rows(
      "select client_id, sleep_quality, soreness, readiness_score, wins, problems_pain from check_ins"
    );
    expect(checkIn.client_id).toBe("CL-9001");
    expect(checkIn.sleep_quality).toBe(8);
    expect(checkIn.soreness).toBe(3);
    expect(checkIn.readiness_score).toBe(76);
    // Free-text answers are the part a coach actually reads — they must not
    // be dropped on the way in (#43).
    expect(checkIn.wins).toBe("hit a new 5RM");
    expect(checkIn.problems_pain).toBe("left knee tight");
  });

  it("returns only the requested athlete's check-ins", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });
    await call(checkInsHandler, {
      method: "POST",
      body: { clientId: "CL-9001", submittedDate: "2026-07-26", energy: 7 },
    });
    await call(checkInsHandler, {
      method: "POST",
      body: { clientId: "CL-9002", submittedDate: "2026-07-26", energy: 5 },
    });

    const res = await call(checkInsHandler, {
      method: "GET",
      query: { clientId: "CL-9001" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.checkIns).toHaveLength(1);
    expect(res.body.checkIns[0].clientId).toBe("CL-9001");
  });

  it("lets a coach attach a response to an existing check-in", async () => {
    const created = await call(checkInsHandler, {
      method: "POST",
      body: { clientId: "CL-9001", submittedDate: "2026-07-26", energy: 7 },
    });
    const [before] = await rows("select checkin_id from check_ins");

    const res = await call(checkInsHandler, {
      method: "POST",
      body: { recordId: before.checkin_id, coachResponse: "Back off volume this week." },
    });
    expect(res.statusCode).toBe(200);

    // A review updates the existing row — a second row would show the athlete
    // a duplicate check-in in their history.
    const all = await rows("select checkin_id, coach_notes from check_ins");
    expect(all).toHaveLength(1);
    expect(all[0].coach_notes).toBe("Back off volume this week.");
    expect(created.statusCode).toBe(200);
  });
});

describe("api/saveWorkloadLog (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = await call(saveWorkloadHandler, { method: "GET" });
    expect(res.statusCode).toBe(405);
  });

  it("400s without a clientId", async () => {
    const res = await call(saveWorkloadHandler, {
      method: "POST",
      body: { date: "2026-07-26", cardioRpe: 6 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("stores the day's technical and cardio load", async () => {
    const res = await call(saveWorkloadHandler, {
      method: "POST",
      body: {
        clientId: "CL-9001",
        date: "2026-07-26",
        techAmRpe: 7,
        techAmMin: 90,
        cardioRpe: 5,
        cardioMin: 30,
        notes: "felt good",
      },
    });
    expect(res.statusCode).toBe(200);

    const [log] = await rows(
      "select client_id, tech_am_rpe, tech_am_min, cardio_rpe, cardio_min, notes from workload_logs"
    );
    expect(log.client_id).toBe("CL-9001");
    expect(log.tech_am_rpe).toBe(7);
    expect(log.tech_am_min).toBe(90);
    expect(log.cardio_rpe).toBe(5);
    expect(log.cardio_min).toBe(30);
    expect(log.notes).toBe("felt good");
  });

  it("updates the same day rather than creating a second entry", async () => {
    const body = { clientId: "CL-9001", date: "2026-07-26" };
    await call(saveWorkloadHandler, { method: "POST", body: { ...body, cardioRpe: 5, cardioMin: 30 } });
    const second = await call(saveWorkloadHandler, {
      method: "POST",
      body: { ...body, cardioRpe: 8, cardioMin: 45 },
    });
    expect(second.statusCode).toBe(200);

    // One row per athlete per day: duplicates would double-count in the
    // coach's workload totals.
    const logs = await rows("select cardio_rpe, cardio_min from workload_logs");
    expect(logs).toHaveLength(1);
    expect(logs[0].cardio_rpe).toBe(8);
    expect(logs[0].cardio_min).toBe(45);
  });

  it("keeps separate rows for separate days", async () => {
    await call(saveWorkloadHandler, {
      method: "POST",
      body: { clientId: "CL-9001", date: "2026-07-26", cardioRpe: 5 },
    });
    await call(saveWorkloadHandler, {
      method: "POST",
      body: { clientId: "CL-9001", date: "2026-07-27", cardioRpe: 6 },
    });

    expect(await rows("select 1 from workload_logs")).toHaveLength(2);
  });
});

describe("api/workloadLogs list (postgres)", () => {
  it("returns [] when the athlete has logged nothing", async () => {
    const res = await call(listWorkloadHandler, {
      method: "GET",
      query: { clientId: "CL-9001" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.logs).toEqual([]);
  });

  it("returns only the requested athlete's logs", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });
    await call(saveWorkloadHandler, {
      method: "POST",
      body: { clientId: "CL-9001", date: "2026-07-26", cardioRpe: 5 },
    });
    await call(saveWorkloadHandler, {
      method: "POST",
      body: { clientId: "CL-9002", date: "2026-07-26", cardioRpe: 9 },
    });

    const res = await call(listWorkloadHandler, {
      method: "GET",
      query: { clientId: "CL-9001" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.logs).toHaveLength(1);
  });
});
