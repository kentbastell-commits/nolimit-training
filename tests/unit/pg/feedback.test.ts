// Ported from tests/unit/api/{reviews,workoutComments,reviewWorkoutComment,
// setWorkoutReviewed,notifications,formVideos}.test.ts. The two-way feedback
// surface: testimonials shown on the storefront, the coach's review queue, and
// the messages an athlete sees in the mini program inbox.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import reviewsHandler from "../../../api/reviews.ts";
import commentsHandler from "../../../api/workoutComments.ts";
import reviewCommentHandler from "../../../api/reviewWorkoutComment.ts";
import setReviewedHandler from "../../../api/setWorkoutReviewed.ts";
import notificationsHandler from "../../../api/notifications.ts";
import formVideosHandler from "../../../api/formVideos.ts";
import { closeDb, makeReq, makeRes, resetDb, rows, seedClient, seedProgram } from "./helpers.ts";
import { pool } from "../../../server/db/client.ts";

beforeEach(async () => {
  await resetDb();
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

describe("api/reviews (postgres)", () => {
  it("400s a new review without a rating", async () => {
    const res = await post(reviewsHandler, { clientId: "CL-9001", quote: "Great" });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from reviews")).toHaveLength(0);
  });

  it("stores a submitted review unapproved and off the storefront", async () => {
    const res = await post(reviewsHandler, {
      clientId: "CL-9001",
      clientName: "Bob Tan",
      programId: "PR-1001",
      rating: 5,
      quote: "Best program I've done",
    });
    expect(res.statusCode).toBe(200);

    const [review] = await rows(
      "select rating, quote, approved, show_on_store from reviews"
    );
    expect(review.rating).toBe(5);
    expect(review.quote).toBe("Best program I've done");
    // A customer's words must not reach the public storefront until a coach
    // has actually approved them.
    expect(review.approved).not.toBe(true);
    expect(review.show_on_store).not.toBe(true);
  });

  it("lets a coach approve a review and publish it", async () => {
    await post(reviewsHandler, {
      clientId: "CL-9001",
      programId: "PR-1001",
      rating: 5,
      quote: "Great",
    });
    const [created] = await rows("select review_id from reviews");

    const res = await post(reviewsHandler, {
      recordId: created.review_id,
      approved: true,
      showOnStore: true,
    });
    expect(res.statusCode).toBe(200);

    const [review] = await rows("select approved, show_on_store from reviews");
    expect(review.approved).toBe(true);
    expect(review.show_on_store).toBe(true);
  });

  it("returns only store-visible reviews when storeOnly is set", async () => {
    await post(reviewsHandler, { clientId: "CL-9001", programId: "PR-1001", rating: 5, quote: "A" });
    const [first] = await rows("select review_id from reviews");
    await post(reviewsHandler, { clientId: "CL-9001", programId: "PR-1001", rating: 4, quote: "B" });
    await post(reviewsHandler, { recordId: first.review_id, approved: true, showOnStore: true });

    const res = await get(reviewsHandler, { storeOnly: "1" });
    expect(res.statusCode).toBe(200);
    // The storefront reads this — an unapproved review leaking through is a
    // customer's private feedback published without consent.
    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.reviews[0].quote).toBe("A");
  });
});

describe("api/notifications (postgres)", () => {
  it("400s without a client and title", async () => {
    const res = await post(notificationsHandler, { clientId: "CL-9001" });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from notifications")).toHaveLength(0);
  });

  it("creates a notification unread", async () => {
    const res = await post(notificationsHandler, {
      clientId: "CL-9001",
      title: "Your program is ready",
      body: "Week 1 starts Monday",
      type: "program",
    });
    expect(res.statusCode).toBe(200);

    const [note] = await rows("select client_id, title, body, read from notifications");
    expect(note.client_id).toBe("CL-9001");
    expect(note.title).toBe("Your program is ready");
    // The mini program inbox badge counts unread — a notification born read
    // is one the athlete never sees.
    expect(note.read).not.toBe(true);
  });

  it("returns only the requested athlete's notifications", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });
    await post(notificationsHandler, { clientId: "CL-9001", title: "Yours" });
    await post(notificationsHandler, { clientId: "CL-9002", title: "Theirs" });

    const res = await get(notificationsHandler, { clientId: "CL-9001" });
    expect(res.statusCode).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0].title).toBe("Yours");
  });
});

describe("api/formVideos (postgres)", () => {
  it("400s a submission missing its video", async () => {
    const res = await post(formVideosHandler, {
      clientId: "CL-9001",
      exerciseName: "Back Squat",
    });
    expect(res.statusCode).toBe(400);
    expect(await rows("select 1 from form_videos")).toHaveLength(0);
  });

  it("queues an athlete's form video for coach review", async () => {
    const res = await post(formVideosHandler, {
      clientId: "CL-9001",
      clientName: "Bob Tan",
      exerciseName: "Back Squat",
      workoutName: "Lower Body",
      videoUrl: "https://trainnolimit.com/uploads/ex-123.mp4",
      note: "Does my depth look ok?",
    });
    expect(res.statusCode).toBe(200);

    const [video] = await rows(
      "select client_id, exercise_name, video_url, client_note, status, coach_reply from form_videos"
    );
    expect(video.client_id).toBe("CL-9001");
    expect(video.exercise_name).toBe("Back Squat");
    expect(video.video_url).toBe("https://trainnolimit.com/uploads/ex-123.mp4");
    expect(video.client_note).toBe("Does my depth look ok?");
    // It has to land unanswered, or it never appears in the coach's queue.
    expect(video.coach_reply).toBeFalsy();
  });

  it("lets a coach reply, which is what the athlete's inbox reads", async () => {
    await post(formVideosHandler, {
      clientId: "CL-9001",
      exerciseName: "Back Squat",
      videoUrl: "https://trainnolimit.com/uploads/ex-123.mp4",
    });
    const [created] = await rows("select video_id from form_videos");

    // The coach reply is a PUT, not a POST — POST is reserved for the
    // athlete's submission.
    const res = await call(formVideosHandler, {
      method: "PUT",
      body: {
        recordId: created.video_id,
        coachReply: "Depth is good — slow the descent.",
        status: "Reviewed",
      },
    });
    expect(res.statusCode).toBe(200);

    const [video] = await rows("select coach_reply, status from form_videos");
    expect(video.coach_reply).toBe("Depth is good — slow the descent.");
    expect(video.status).toBe("Reviewed");
  });

  it("returns only the requested athlete's videos", async () => {
    await seedClient({ client_id: "CL-9002", full_name: "Mei Lin" });
    await post(formVideosHandler, {
      clientId: "CL-9001",
      exerciseName: "Back Squat",
      videoUrl: "https://example.com/a.mp4",
    });
    await post(formVideosHandler, {
      clientId: "CL-9002",
      exerciseName: "Deadlift",
      videoUrl: "https://example.com/b.mp4",
    });

    const res = await get(formVideosHandler, { clientId: "CL-9001" });
    expect(res.statusCode).toBe(200);
    expect(res.body.videos).toHaveLength(1);
  });
});

describe("api/workoutComments + review flags (postgres)", () => {
  async function seedLogWithNote(note: string, overrides: Record<string, any> = {}) {
    const values = {
      log_id: `LOG-${Math.random().toString(36).slice(2, 10)}`,
      client_id: "CL-9001",
      client_code: "CL-9001",
      exercise_name: "Back Squat",
      date: Date.parse("2026-08-03T00:00:00Z"),
      set_number: 1,
      completed: true,
      athlete_notes: note,
      ...overrides,
    };
    const keys = Object.keys(values);
    await pool.query(
      `insert into workout_logs (${keys.map((k) => `"${k}"`).join(", ")})
       values (${keys.map((_, i) => `$${i + 1}`).join(", ")})`,
      Object.values(values)
    );
    return values.log_id;
  }

  it("rejects a non-GET comment fetch with 405", async () => {
    expect((await post(commentsHandler, {})).statusCode).toBe(405);
  });

  it("surfaces an athlete's note to the coach queue", async () => {
    await seedLogWithNote("left knee tight");

    const res = await get(commentsHandler, { clientId: "CL-9001" });
    expect(res.statusCode).toBe(200);
    // A note the athlete typed that never reaches the coach is the whole
    // point of the feature lost.
    expect(JSON.stringify(res.body)).toContain("left knee tight");
  });

  it("400s marking comments reviewed without ids", async () => {
    const res = await post(reviewCommentHandler, { recordIds: [] });
    expect(res.statusCode).toBe(400);
  });

  it("marks a comment reviewed so it leaves the queue", async () => {
    const logId = await seedLogWithNote("left knee tight");

    const res = await post(reviewCommentHandler, { recordIds: [logId] });
    expect(res.statusCode).toBe(200);

    const [log] = await rows("select coach_reviewed from workout_logs");
    expect(log.coach_reviewed).toBe(true);
  });

  it("400s setWorkoutReviewed without a workout id", async () => {
    const res = await post(setReviewedHandler, { reviewed: true });
    expect(res.statusCode).toBe(400);
  });

  it("flags a whole session as reviewed", async () => {
    await pool.query(
      `insert into assigned_workouts (assigned_workout_id, client_id, session_name, completion_status)
       values ('AW-1', 'CL-9001', 'Lower Body', 'Completed')`
    );

    const res = await post(setReviewedHandler, {
      assignedWorkoutRecordId: "AW-1",
      reviewed: true,
    });
    expect(res.statusCode).toBe(200);

    const [workout] = await rows("select coach_reviewed from assigned_workouts");
    expect(workout.coach_reviewed).toBe(true);
  });
});
