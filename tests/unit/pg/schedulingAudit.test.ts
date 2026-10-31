import { afterAll, beforeEach, expect, it } from "vitest";
import { getAnalytics } from "../../../server/db/repositories/analytics.ts";
import { duplicateAssignedWorkout } from "../../../server/db/repositories/workouts.ts";
import { closeDb, resetDb, rows, seedClient } from "./helpers.ts";
beforeEach(resetDb);afterAll(closeDb);
it("a copied completed workout starts with no previous performance or athlete note",async()=>{
  await seedClient();
  await rows("insert into assigned_workouts(assigned_workout_id,client_id,completion_status,client_notes,coach_reviewed,session_rpe,session_duration,session_load,session_avg_hr,session_max_hr) values('AW-COMPLETED','CL-9001','Completed','Previous knee discomfort',true,8,90,720,140,180)");
  const made=await duplicateAssignedWorkout({assignedWorkoutRecordId:"AW-COMPLETED",scheduledDate:"2026-11-01"});
  expect(made.success).toBe(true);
  const [copy]=await rows("select completion_status,client_notes,coach_reviewed,session_rpe,session_duration,session_load,session_avg_hr,session_max_hr from assigned_workouts where assigned_workout_id=$1",[made.recordId]);
  expect(copy).toMatchObject({completion_status:"Scheduled",client_notes:null,coach_reviewed:false,session_rpe:null,session_duration:null,session_load:null,session_avg_hr:null,session_max_hr:null});
  expect((await rows("select client_notes,session_load from assigned_workouts where assigned_workout_id='AW-COMPLETED'"))[0]).toMatchObject({client_notes:"Previous knee discomfort",session_load:720});
});
it("dashboard activity matches whole client IDs and does not count Inactive as Active",async()=>{
  await seedClient({package_type:"Active"});
  await seedClient({client_id:"CL-90010",full_name:"Another athlete",package_type:"Inactive"});
  await rows("insert into assigned_workouts(assigned_workout_id,client_id,completion_status,scheduled_date) values('AW-OTHER','CL-90010','Completed',$1)",[Date.now()]);
  const data=await getAnalytics();
  expect(data.summary.activeClients).toBe(1);
  expect(data.clientActivity?.find(c=>c.clientId==="CL-9001")?.completed7d).toBe(0);
  expect(data.clientActivity?.find(c=>c.clientId==="CL-90010")?.completed7d).toBe(1);
});
