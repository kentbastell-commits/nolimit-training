import { afterAll, beforeEach, expect, it } from "vitest";
import { closeDb, resetDb, rows, seedClient } from "./helpers";
import { createFormVideo, listFormVideos } from "../../../server/db/pg/formVideos";
beforeEach(resetDb); afterAll(closeDb);
it("snapshots the owned session name/date, preserves late-upload association and rejects another client's workout", async () => {
  await seedClient(); await seedClient({ client_id: "CL-9002", phone: "13900000000" });
  await rows("insert into assigned_workouts (assigned_workout_id,client_id,session_name,session_name_cn,scheduled_date) values ('AW-1','CL-9001','Home Workout 1','居家训练1',$1)", [Date.parse("2026-10-20T00:00:00+08:00")]);
  const bad = await createFormVideo({ clientId: "CL-9002", assignedWorkoutId: "AW-1", note: "wrong client" });
  expect(bad.success).toBe(false); expect(await rows("select * from form_videos")).toHaveLength(0);
  const saved = await createFormVideo({ clientId: "CL-9001", assignedWorkoutId: "AW-1", workoutName: "untrusted title", exerciseName: "Row", note: "Check this" });
  expect(saved.success).toBe(true);
  expect((await listFormVideos())[0]).toMatchObject({ assignedWorkoutId: "AW-1", workoutDate: "2026-10-20", workoutName: "Home Workout 1", workoutNameCn: "居家训练1" });
  await rows("update assigned_workouts set session_name='Renamed',scheduled_date=$1 where assigned_workout_id='AW-1'", [Date.now()]);
  expect((await listFormVideos())[0]).toMatchObject({ workoutDate: "2026-10-20", workoutName: "Home Workout 1" });
});
it("continues accepting old-client submissions without an assignment and resolves only unambiguous historical matches", async () => {
  await seedClient(); const now = Date.now();
  await rows("insert into assigned_workouts (assigned_workout_id,client_id,session_name,scheduled_date) values ('AW-1','CL-9001','Home Workout 1',$1)", [now]);
  expect((await createFormVideo({ clientId: "CL-9001", workoutName: "Home Workout 1", note: "Old app" })).success).toBe(true);
  expect((await listFormVideos())[0].assignedWorkoutId).toBe("AW-1");
  await rows("insert into assigned_workouts (assigned_workout_id,client_id,session_name,scheduled_date) values ('AW-2','CL-9001','Home Workout 1',$1)", [now]);
  expect((await listFormVideos())[0].assignedWorkoutId).toBe("");
});
