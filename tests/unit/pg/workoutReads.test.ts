// Ported from tests/unit/api/{workouts,workoutDetails,workoutHistory,
// programTemplates}.test.ts. Every read the athlete's calendar and workout
// player depend on, in both the portal and the mini program. A wrong filter
// here shows someone another athlete's training.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import workoutsHandler from "../../../api/workouts.ts";
import detailsHandler from "../../../api/workoutDetails.ts";
import historyHandler from "../../../api/workoutHistory.ts";
import templatesHandler from "../../../api/programTemplates.ts";
import { closeDb, makeReq, makeRes, resetDb, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

beforeEach(async () => {
  await resetDb();
  await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
  await seedProgram({ program_id: "PR-1001", name: "Season 1" });
  await pool.query("insert into exercises (exercise_id, name) values ('EX-1', 'Back Squat')");
});

afterAll(async () => {
  await closeDb();
});

async function get(handler: any, query: Record<string, any> = {}) {
  const res = makeRes();
  await handler(makeReq({ method: "GET", query }) as any, res as any);
  return res;
}

async function seedAssigned(id: string, overrides: Record<string, any> = {}) {
  const values = {
    assigned_workout_id: id,
    client_id: "CL-9001",
    program_id: "PR-1001",
    session_name: "Lower Body",
    week: 1,
    day: 1,
    scheduled_date: Date.parse("2026-08-03T00:00:00Z"),
    completion_status: "Scheduled",
    ...overrides,
  };
  const keys = Object.keys(values);
  await pool.query(
    `insert into assigned_workouts (${keys.map((k) => `"${k}"`).join(", ")})
     values (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
    Object.values(values)
  );
}

async function seedTemplate(id: string, week: number, day: number) {
  await pool.query(
    `insert into workout_templates
       (template_id, program_id, exercise_id, week, day, session_name, session_type,
        exercise_name, exercise_order, sets, reps, rest)
     values ($1, 'PR-1001', 'EX-1', $2, $3, $4, 'Strength', 'Back Squat', 1, 3, '5', '180')`,
    [id, week, day, `W${week}D${day}`]
  );
}

describe("api/workouts (postgres)", () => {
  it("returns [] for an athlete with nothing scheduled", async () => {
    const res = await get(workoutsHandler, { clientCode: "CL-9001" });
    expect(res.statusCode).toBe(200);
    expect(res.body.workouts).toEqual([]);
  });

  it("returns the athlete's scheduled sessions", async () => {
    await seedAssigned("AW-1");
    await seedAssigned("AW-2", { week: 1, day: 3, session_name: "Upper Body" });

    const res = await get(workoutsHandler, { clientCode: "CL-9001" });
    expect(res.statusCode).toBe(200);
    expect(res.body.workouts).toHaveLength(2);
  });

  it("never returns another athlete's sessions", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });
    await seedAssigned("AW-1");
    await seedAssigned("AW-2", { client_id: "CL-9002" });

    const res = await get(workoutsHandler, { clientCode: "CL-9001" });

    // The portal and mini program both key off the client code alone, so a
    // leaky filter here shows one athlete another's training.
    expect(res.body.workouts).toHaveLength(1);
    expect(res.body.workouts[0].assignedWorkoutId).toBe("AW-1");
  });

  it("carries completion status through so the calendar can grey out done days", async () => {
    await seedAssigned("AW-1", { completion_status: "Completed" });

    const res = await get(workoutsHandler, { clientCode: "CL-9001" });
    expect(res.body.workouts[0].completionStatus).toBe("Completed");
  });
});

describe("api/workoutDetails (postgres)", () => {
  it("400s without programId, week and day", async () => {
    expect((await get(detailsHandler, { programId: "PR-1001" })).statusCode).toBe(400);
  });

  it("returns the session's exercises with their prescription", async () => {
    await seedTemplate("WT-1", 1, 1);

    const res = await get(detailsHandler, { programId: "PR-1001", week: "1", day: "1" });
    expect(res.statusCode).toBe(200);
    expect(res.body.exercises).toHaveLength(1);

    const [exercise] = res.body.exercises;
    expect(exercise.exerciseName).toBe("Back Squat");
    // These drive the player's set rows; missing sets/reps turns a
    // prescribed session into a guess.
    expect(Number(exercise.sets)).toBe(3);
    expect(exercise.reps).toBe("5");
    expect(exercise.rest).toBe("180");
  });

  it("returns only the requested day, not the whole program", async () => {
    await seedTemplate("WT-1", 1, 1);
    await seedTemplate("WT-2", 1, 3);
    await seedTemplate("WT-3", 2, 1);

    const res = await get(detailsHandler, { programId: "PR-1001", week: "1", day: "1" });
    // Three sessions exist in the program; only the requested day comes back.
    expect(res.body.exercises).toHaveLength(1);
    expect(res.body.exercises[0].exerciseName).toBe("Back Squat");
  });

  it("returns [] for a day with no sessions rather than erroring", async () => {
    await seedTemplate("WT-1", 1, 1);

    const res = await get(detailsHandler, { programId: "PR-1001", week: "9", day: "9" });
    expect(res.statusCode).toBe(200);
    expect(res.body.exercises).toEqual([]);
  });
});

describe("api/workoutHistory (postgres)", () => {
  async function seedLog(overrides: Record<string, any> = {}) {
    const values = {
      log_id: `LOG-${Math.random().toString(36).slice(2, 10)}`,
      client_id: "CL-9001",
      client_code: "CL-9001",
      exercise_name: "Back Squat",
      date: Date.parse("2026-08-03T00:00:00Z"),
      set_number: 1,
      actual_reps: 5,
      actual_weight: "100",
      completed: true,
      ...overrides,
    };
    const keys = Object.keys(values);
    await pool.query(
      `insert into workout_logs (${keys.map((k) => `"${k}"`).join(", ")})
       values (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
      Object.values(values)
    );
  }

  it("returns an empty history for an athlete who has logged nothing", async () => {
    const res = await get(historyHandler, { clientCode: "CL-9001" });
    expect(res.statusCode).toBe(200);
    expect(res.body.history ?? []).toEqual([]);
  });

  it("summarises what the athlete last lifted", async () => {
    await seedLog({ actual_weight: "100" });
    await seedLog({ actual_weight: "110", date: Date.parse("2026-08-10T00:00:00Z") });

    const res = await get(historyHandler, { clientCode: "CL-9001" });
    expect(res.statusCode).toBe(200);

    const entry = (res.body.history || []).find((h: any) => h.exerciseName === "Back Squat");
    // This is the "Last 5 × 110kg · Best 110kg" line in the player — it has
    // to reflect the most recent session, not the first one found.
    expect(entry).toBeTruthy();
    expect(Number(entry.bestWeight)).toBe(110);
  });

  it("never mixes in another athlete's lifts", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });
    await seedLog({ actual_weight: "100" });
    await seedLog({ client_id: "CL-9002", client_code: "CL-9002", actual_weight: "200" });

    const res = await get(historyHandler, { clientCode: "CL-9001" });
    const entry = (res.body.history || []).find((h: any) => h.exerciseName === "Back Squat");
    // A leak here would show someone a personal record they never set.
    expect(Number(entry.bestWeight)).toBe(100);
  });
});

describe("api/programTemplates (postgres)", () => {
  it("400s without a programId", async () => {
    expect((await get(templatesHandler, {})).statusCode).toBe(400);
  });

  it("returns every session row for the program", async () => {
    await seedTemplate("WT-1", 1, 1);
    await seedTemplate("WT-2", 1, 4);
    await seedTemplate("WT-3", 2, 1);

    const res = await get(templatesHandler, { programId: "PR-1001" });
    expect(res.statusCode).toBe(200);
    expect(res.body.templates).toHaveLength(3);
  });

  it("preserves the coach's day numbering", async () => {
    await seedTemplate("WT-1", 1, 1);
    await seedTemplate("WT-2", 1, 4);
    await seedTemplate("WT-3", 1, 6);

    const res = await get(templatesHandler, { programId: "PR-1001" });
    const days = (res.body.templates || []).map((t: any) => Number(t.day)).sort((a, b) => a - b);
    // The builder reloads a program through this endpoint, so a read that
    // renumbers is as destructive as a write that does (#35).
    expect(days).toEqual([1, 4, 6]);
  });
});
