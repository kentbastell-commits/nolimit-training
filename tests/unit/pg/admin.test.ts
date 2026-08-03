// Ported from tests/unit/api/{exercises,upsertExercise,coaches,upsertCoach,
// teams,upsertTeam,subscriptions,upsertSubscription}.test.ts. The library and
// roster CRUD behind the coach console. Straightforward writes, but the
// exercise library is referenced by every program template, so an upsert that
// duplicates instead of updating quietly fragments the whole catalogue.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import exercisesHandler from "../../../api/exercises.ts";
import upsertExerciseHandler from "../../../api/upsertExercise.ts";
import coachesHandler from "../../../api/coaches.ts";
import upsertCoachHandler from "../../../api/upsertCoach.ts";
import teamsHandler from "../../../api/teams.ts";
import upsertTeamHandler from "../../../api/upsertTeam.ts";
import subscriptionsHandler from "../../../api/subscriptions.ts";
import upsertSubscriptionHandler from "../../../api/upsertSubscription.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient } from "./helpers.ts";

beforeEach(async () => {
  await resetDb();
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

describe("api/exercises + upsertExercise (postgres)", () => {
  it("rejects non-POST upserts with 405", async () => {
    expect((await call(upsertExerciseHandler, { method: "GET" })).statusCode).toBe(405);
  });

  it("400s without an exercise name", async () => {
    const res = await post(upsertExerciseHandler, { category: "Squat" });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from exercises")).toHaveLength(0);
  });

  it("creates an exercise with its coaching content", async () => {
    const res = await post(upsertExerciseHandler, {
      exerciseName: "Back Squat",
      category: "Lower Body",
      equipment: "Barbell",
      notes: "Brace, knees out",
    });
    expect(res.statusCode).toBe(200);

    const [exercise] = await rows(
      "select exercise_id, name, category, coaching_cues from exercises"
    );
    expect(exercise.exercise_id).toMatch(/^EX-/);
    expect(exercise.name).toBe("Back Squat");
    expect(exercise.category).toBe("Lower Body");
    expect(exercise.coaching_cues).toBe("Brace, knees out");
  });

  it("accepts CN name/category patches; cues stay translation-filled only", async () => {
    await post(upsertExerciseHandler, {
      exerciseName: "Back Squat",
      exerciseNameCn: "杠铃后深蹲",
      categoryCn: "深蹲",
      coachingCuesCn: "收紧核心，膝盖外推",
    });

    // exerciseNameCn/categoryCn became patch-style inputs (2026-08-03, the
    // bulk bilingual fill). coachingCuesCn still has no input — that column
    // is written by the translation pass only.
    const [exercise] = await rows(
      "select name_cn, category_cn, coaching_cues_cn from exercises"
    );
    expect(exercise.name_cn).toBe("杠铃后深蹲");
    expect(exercise.category_cn).toBe("深蹲");
    expect(exercise.coaching_cues_cn).toBeNull();
  });

  it("leaves CN fields untouched when the payload omits them", async () => {
    const created = await post(upsertExerciseHandler, {
      exerciseName: "Back Squat",
      exerciseNameCn: "杠铃后深蹲",
    });
    await post(upsertExerciseHandler, {
      recordId: created.body.recordId,
      exerciseName: "Back Squat",
      notes: "Brace hard",
    });

    // An editor that doesn't collect CN fields must never wipe them (#43).
    const [exercise] = await rows("select name_cn from exercises");
    expect(exercise.name_cn).toBe("杠铃后深蹲");
  });

  it("treats an explicit empty video URL as a clear", async () => {
    await post(upsertExerciseHandler, {
      exerciseName: "Back Squat",
      videoUrl: "https://example.com/wrong.mp4",
    });
    const [first] = await rows("select exercise_id from exercises");

    await post(upsertExerciseHandler, {
      recordId: first.exercise_id,
      exerciseName: "Back Squat",
      videoUrl: "",
    });

    // Skip-falsy made a wrong video URL un-removable: the UI showed it
    // cleared and the refetch put it back (#43).
    const [exercise] = await rows("select short_video_url from exercises");
    expect(exercise.short_video_url).toBeNull();
  });

  it("updates an existing exercise instead of duplicating it", async () => {
    const created = await post(upsertExerciseHandler, { exerciseName: "Back Squat" });
    const [first] = await rows("select exercise_id from exercises");

    const res = await post(upsertExerciseHandler, {
      recordId: first.exercise_id,
      exerciseId: first.exercise_id,
      exerciseName: "Back Squat",
      category: "Lower Body",
    });
    expect(res.statusCode).toBe(200);
    expect(created.statusCode).toBe(200);

    // Every program template points at an exercise id. A duplicate here
    // splits the catalogue and orphans half the references.
    const all = await rows("select exercise_id, category from exercises");
    expect(all).toHaveLength(1);
    expect(all[0].category).toBe("Lower Body");
  });

  it("lists the library", async () => {
    await post(upsertExerciseHandler, { exerciseName: "Back Squat" });

    const res = await call(exercisesHandler, { method: "GET" });
    expect(res.statusCode).toBe(200);
    expect(res.body.exercises).toHaveLength(1);
    expect(res.body.exercises[0].exerciseName).toBe("Back Squat");
  });

  it("omits the debug payload unless asked", async () => {
    const res = await call(exercisesHandler, { method: "GET" });
    expect(res.body.cueFieldCandidates).toBeUndefined();
  });
});

describe("api/coaches + upsertCoach (postgres)", () => {
  it("400s without a coach name", async () => {
    const res = await post(upsertCoachHandler, { email: "x@example.com" });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from coaches")).toHaveLength(0);
  });

  it("creates a coach and lists them", async () => {
    const res = await post(upsertCoachHandler, {
      name: "Kent Bastell",
      email: "kent@example.com",
      role: "Head Coach",
      qrCodeUrl: "https://example.com/qr.png",
    });
    expect(res.statusCode).toBe(200);

    const [coach] = await rows("select coach_id, name, role, qr_code_url from coaches");
    expect(coach.name).toBe("Kent Bastell");
    expect(coach.role).toBe("Head Coach");
    // The QR is what an athlete scans to reach their coach on WeChat — the
    // mini program profile card renders it.
    expect(coach.qr_code_url).toBe("https://example.com/qr.png");

    const list = await call(coachesHandler, { method: "GET" });
    expect(list.statusCode).toBe(200);
    expect(list.body.coaches).toHaveLength(1);
  });

  it("updates an existing coach rather than adding a second", async () => {
    await post(upsertCoachHandler, { name: "Kent Bastell", role: "Coach" });
    const [first] = await rows("select coach_id from coaches");

    await post(upsertCoachHandler, {
      recordId: first.coach_id,
      coachId: first.coach_id,
      name: "Kent Bastell",
      role: "Head Coach",
    });

    const all = await rows("select role from coaches");
    expect(all).toHaveLength(1);
    expect(all[0].role).toBe("Head Coach");
  });
});

describe("api/teams + upsertTeam (postgres)", () => {
  it("400s without a team name", async () => {
    const res = await post(upsertTeamHandler, { focus: "Climbing" });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from teams")).toHaveLength(0);
  });

  it("creates a team and lists it", async () => {
    const res = await post(upsertTeamHandler, {
      teamName: "Youth Squad",
      focus: "Climbing",
      coach: "Kent Bastell",
    });
    expect(res.statusCode).toBe(200);

    const [team] = await rows("select team_id, name, focus from teams");
    expect(team.name).toBe("Youth Squad");
    expect(team.focus).toBe("Climbing");

    const list = await call(teamsHandler, { method: "GET" });
    expect(list.statusCode).toBe(200);
    expect(list.body.teams).toHaveLength(1);
  });

  it("updates an existing team rather than adding a second", async () => {
    await post(upsertTeamHandler, { teamName: "Youth Squad", focus: "Climbing" });
    const [first] = await rows("select team_id from teams");

    await post(upsertTeamHandler, {
      recordId: first.team_id,
      teamId: first.team_id,
      teamName: "Youth Squad",
      focus: "Bouldering",
    });

    const all = await rows("select focus from teams");
    expect(all).toHaveLength(1);
    expect(all[0].focus).toBe("Bouldering");
  });
});

describe("api/subscriptions + upsertSubscription (postgres)", () => {
  it("400s without a client", async () => {
    const res = await post(upsertSubscriptionHandler, { plan: "Monthly" });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from subscriptions")).toHaveLength(0);
  });

  it("creates a subscription against the client", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });

    const res = await post(upsertSubscriptionHandler, {
      clientRecordId: "CL-9001",
      plan: "Online Coaching",
      price: "2500",
      billingCycle: "Monthly",
      status: "Active",
    });
    expect(res.statusCode).toBe(200);

    const [sub] = await rows(
      "select client_id, plan, price, billing_cycle, status from subscriptions"
    );
    expect(sub.client_id).toBe("CL-9001");
    expect(sub.plan).toBe("Online Coaching");
    expect(Number(sub.price)).toBe(2500);
    expect(sub.status).toBe("Active");
  });

  it("updates an existing subscription rather than adding a second", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
    await post(upsertSubscriptionHandler, {
      clientRecordId: "CL-9001",
      plan: "Online Coaching",
      status: "Active",
    });
    const [first] = await rows("select subscription_id from subscriptions");

    await post(upsertSubscriptionHandler, {
      recordId: first.subscription_id,
      subscriptionId: first.subscription_id,
      clientRecordId: "CL-9001",
      status: "Cancelled",
    });

    // A duplicate row would leave an Active subscription alongside the
    // cancelled one, and billing views read the wrong one.
    const all = await rows("select status from subscriptions");
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("Cancelled");
  });

  it("lists subscriptions", async () => {
    await seedClient({ client_id: "CL-9001", full_name: "Bob Tan" });
    await post(upsertSubscriptionHandler, { clientRecordId: "CL-9001", plan: "Online Coaching" });

    const res = await call(subscriptionsHandler, { method: "GET" });
    expect(res.statusCode).toBe(200);
    expect(res.body.subscriptions).toHaveLength(1);
  });
});
