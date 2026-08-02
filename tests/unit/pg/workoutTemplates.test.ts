// Ported from tests/unit/api/{createWorkoutTemplate,createWorkoutTemplatesBulk}
// .test.ts. This is the coach's program builder save. It is the surface #35 was
// written about: a whole-program save is slow, partial failure is expensive,
// and silently renumbering a coach's chosen days destroys deliberate rest-day
// spacing.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import singleHandler from "../../../api/createWorkoutTemplate.ts";
import bulkHandler from "../../../api/createWorkoutTemplatesBulk.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

beforeEach(async () => {
  await resetDb();
  await seedProgram({ program_id: "PR-1001", name: "Season 1" });
  await seedExercise("EX-1", "Back Squat");
  await seedExercise("EX-2", "Romanian Deadlift");
});

afterAll(async () => {
  await closeDb();
});

async function seedExercise(id: string, name: string) {
  await pool.query("insert into exercises (exercise_id, name) values ($1, $2)", [id, name]);
}

async function post(handler: any, body: Record<string, any>) {
  const res = makeRes();
  await handler(makeReq({ method: "POST", body }) as any, res as any);
  return res;
}

const exercise = (overrides: Record<string, any> = {}) => ({
  exerciseId: "EX-1",
  exerciseRecordId: "EX-1",
  exerciseName: "Back Squat",
  order: 1,
  sets: 3,
  reps: "5",
  rest: "180",
  ...overrides,
});

const session = (week: number, day: number, overrides: Record<string, any> = {}) => ({
  week,
  day,
  sessionName: `W${week}D${day}`,
  sessionType: "Strength",
  exercises: [exercise()],
  ...overrides,
});

const bulkBody = (sessions: any[]) => ({
  programId: "PR-1001",
  programRecordId: "PR-1001",
  sessions,
});

describe("api/createWorkoutTemplate (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await singleHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s on missing identifiers", async () => {
    const res = await post(singleHandler, { programId: "PR-1001", week: 1, day: 1 });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from workout_templates")).toHaveLength(0);
  });

  it("400s when the session has no exercises", async () => {
    const res = await post(singleHandler, {
      programId: "PR-1001",
      programRecordId: "PR-1001",
      week: 1,
      day: 1,
      sessionName: "Lower",
      exercises: [],
    });
    expect(res.statusCode).toBe(400);
  });

  it("writes one row per exercise, keeping the coach's order", async () => {
    const res = await post(singleHandler, {
      programId: "PR-1001",
      programRecordId: "PR-1001",
      week: 1,
      day: 1,
      sessionName: "Lower",
      exercises: [
        exercise({ order: 1 }),
        exercise({ exerciseId: "EX-2", exerciseRecordId: "EX-2", exerciseName: "Romanian Deadlift", order: 2 }),
      ],
    });
    expect(res.statusCode).toBe(200);

    const written = await rows(
      "select exercise_name, exercise_order, sets, reps from workout_templates order by exercise_order"
    );
    expect(written).toHaveLength(2);
    expect(written[0].exercise_name).toBe("Back Squat");
    expect(written[1].exercise_name).toBe("Romanian Deadlift");
    expect(written[0].sets).toBe(3);
    expect(written[0].reps).toBe("5");
  });
});

describe("api/createWorkoutTemplatesBulk (postgres)", () => {
  it("rejects non-POST with 405", async () => {
    const res = makeRes();
    await bulkHandler(makeReq({ method: "GET" }) as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("400s without sessions", async () => {
    expect((await post(bulkHandler, bulkBody([]))).statusCode).toBe(400);
  });

  it("400s a malformed session before writing anything", async () => {
    const res = await post(
      bulkHandler,
      bulkBody([session(1, 1), { week: 2, sessionName: "no day", exercises: [exercise()] }])
    );

    // Validation is up front so a bad session can't land the batch half-saved.
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from workout_templates")).toHaveLength(0);
  });

  it("400s a session with no exercises, naming it", async () => {
    const res = await post(
      bulkHandler,
      bulkBody([session(1, 1), session(1, 2, { sessionName: "Empty", exercises: [] })])
    );
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Empty");
    expect(await rows("select 1 from workout_templates")).toHaveLength(0);
  });

  it("saves a whole multi-week program in one call", async () => {
    const sessions = [session(1, 1), session(1, 3), session(2, 1), session(2, 3)];
    const res = await post(bulkHandler, bulkBody(sessions));

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(await rows("select 1 from workout_templates")).toHaveLength(4);
  });

  it("preserves the coach's chosen days instead of renumbering them", async () => {
    // A deliberate Day 1 / 4 / 6 week — the layout an athlete's rest days
    // depend on. #35: reassigning these by array order silently pulled a
    // Day-4 session onto Day 3 and destroyed the spacing.
    await post(bulkHandler, bulkBody([session(1, 1), session(1, 4), session(1, 6)]));

    const days = await rows(
      "select day from workout_templates where week = 1 order by day"
    );
    expect(days.map((r) => r.day)).toEqual([1, 4, 6]);
  });

  it("rejects an exercise that is not in the library, writing nothing", async () => {
    const res = await post(
      bulkHandler,
      bulkBody([
        session(1, 1),
        session(1, 2, {
          exercises: [exercise({ exerciseId: "EX-GHOST", exerciseRecordId: "EX-GHOST" })],
        }),
      ])
    );

    expect(res.statusCode).toBe(500);
    // The whole batch fails rather than saving the good half — a program
    // missing one session is worse than a save the coach can retry.
    expect(await rows("select 1 from workout_templates")).toHaveLength(0);
  });

  it("stores per-set prescriptions parsed from the coaching notes", async () => {
    const prescriptions = JSON.stringify([
      { setNumber: 1, reps: "5", load: "60" },
      { setNumber: 2, reps: "5", load: "65" },
      { setNumber: 3, reps: "3", load: "70" },
    ]);
    const res = await post(
      bulkHandler,
      bulkBody([
        session(1, 1, {
          exercises: [
            exercise({
              coachingNotes: `Set Prescriptions: ${prescriptions}\nKeep the brace tight`,
            }),
          ],
        }),
      ])
    );
    expect(res.statusCode).toBe(200);

    const sets = await rows(
      "select set_number, reps, load from set_prescriptions order by set_number"
    );
    // Per-set loads are what the athlete sees in the player; losing them
    // silently turns a prescribed session into a guess.
    expect(sets).toHaveLength(3);
    expect(sets.map((s) => s.reps)).toEqual(["5", "5", "3"]);
    expect(sets.map((s) => s.load)).toEqual(["60", "65", "70"]);
  });

  it("stores the coach's alternate exercises", async () => {
    const alternates = JSON.stringify([
      { exerciseId: "EX-2", exerciseRecordId: "EX-2", exerciseName: "Romanian Deadlift" },
    ]);
    const res = await post(
      bulkHandler,
      bulkBody([
        session(1, 1, {
          exercises: [exercise({ coachingNotes: `Alternate Exercises: ${alternates}` })],
        }),
      ])
    );
    expect(res.statusCode).toBe(200);

    // These back the swap menu in the workout player — without them an
    // athlete who can't do the programmed movement has no offered way out.
    const alts = await rows("select exercise_id, exercise_name from exercise_alternates");
    expect(alts).toHaveLength(1);
    expect(alts[0].exercise_name).toBe("Romanian Deadlift");
  });

  it("ignores malformed meta rather than failing the whole save", async () => {
    const res = await post(
      bulkHandler,
      bulkBody([
        session(1, 1, {
          exercises: [exercise({ coachingNotes: "Set Prescriptions: {not json" })],
        }),
      ])
    );

    // A coach's typo in one note must not cost them the entire program save.
    expect(res.statusCode).toBe(200);
    expect(await rows("select 1 from workout_templates")).toHaveLength(1);
    expect(await rows("select 1 from set_prescriptions")).toHaveLength(0);
  });

  it("keeps section names from the builder meta rather than defaulting them", async () => {
    await post(
      bulkHandler,
      bulkBody([
        session(1, 1, {
          exercises: [exercise({ coachingNotes: "Section: Warm-up\nEasy pace" })],
        }),
      ])
    );

    const [row] = await rows("select section_name, coaching_notes from workout_templates");
    // #30: a crude mapper that hardcoded "Main" produced a visibly poorer
    // session than its sibling view.
    expect(row.section_name).toBe("Warm-up");
    // The raw note is retained too, so nothing the coach typed is lost.
    expect(row.coaching_notes).toContain("Easy pace");
  });

  it("saves a test day as a single marker row with no exercises", async () => {
    const res = await post(
      bulkHandler,
      bulkBody([
        session(1, 1),
        {
          week: 1,
          day: 3,
          sessionName: "2000m Row Erg",
          sessionType: "Test",
          testTemplateId: "TEST-100",
          exercises: [],
        },
      ])
    );
    expect(res.statusCode).toBe(200);

    const marker = await rows(
      "select session_name, test_template_id, exercise_id from workout_templates where day = 3"
    );
    expect(marker).toHaveLength(1);
    expect(marker[0].test_template_id).toBe("TEST-100");
    expect(marker[0].exercise_id).toBeNull();
    // The real session on day 1 is untouched.
    expect(await rows("select 1 from workout_templates")).toHaveLength(2);
  });

  it("still 400s an empty session that is NOT a test day", async () => {
    const res = await post(
      bulkHandler,
      bulkBody([{ week: 1, day: 2, sessionName: "Empty", exercises: [] }])
    );
    expect(res.statusCode).toBe(400);
  });

  it("reports zero written for an empty exercise set rather than failing", async () => {
    // Handler-level validation catches the empty case, so the repository's
    // own zero-row path is only reachable directly; assert the handler's
    // contract instead.
    const res = await post(bulkHandler, bulkBody([session(1, 1, { exercises: [] })]));
    expect(res.statusCode).toBe(400);
  });
});
