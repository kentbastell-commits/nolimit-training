import { db } from "../client.ts";
import { assignedWorkouts } from "../schema.ts";
import { str } from "./_util.ts";
import type { WorkoutDTO } from "../dto.ts";

type Row = typeof assignedWorkouts.$inferSelect;

export async function listAllWorkouts(): Promise<WorkoutDTO[]> {
  const rows = await db.select().from(assignedWorkouts);
  return rows.map(
    (r: Row): WorkoutDTO => ({
      id: r.assignedWorkoutId,
      assignedWorkoutId: r.assignedWorkoutId,
      clientId: str(r.clientId),
      programId: str(r.programId),
      week: str(r.week),
      day: str(r.day),
      sessionName: str(r.sessionName),
      sessionNameCn: str(r.sessionNameCn),
      sessionType: str(r.sessionType),
      sessionGoal: str(r.sessionGoal),
      estimatedDuration: str(r.estimatedDuration),
      intensity: str(r.intensity),
      scheduledDate: str(r.scheduledDate), // epoch-ms as text, matching Feishu
      completionStatus: str(r.completionStatus),
      coachNotes: str(r.coachNotes),
      coachNotesCn: str(r.coachNotesCn),
      clientNotes: str(r.clientNotes),
      workoutLogs: "",
      // TODO(schema-resync): Session RPE/Duration/Load + Coach Reviewed were
      // added to Assigned Workouts on Feishu after the June snapshot.
      sessionRpe: "",
      sessionDuration: "",
      sessionLoad: "",
      coachReviewed: false,
    })
  );
}
