import { db } from "../client.ts";
import { workoutTemplates } from "../schema.ts";
import { str } from "./_util.ts";
import type { TemplateRow } from "../dto.ts";

type Row = typeof workoutTemplates.$inferSelect;

export async function listAllTemplateRows(): Promise<TemplateRow[]> {
  const rows = await db.select().from(workoutTemplates);
  return rows.map(
    (r: Row): TemplateRow => ({
      recordId: r.templateId,
      programId: str(r.programId),
      programRecordIds: r.programId ? [r.programId] : [],
      week: r.week ?? 1,
      day: r.day ?? 1,
      sessionName: str(r.sessionName),
      sessionNameCn: str(r.sessionNameCn),
      sessionType: str(r.sessionType),
      sessionGoal: str(r.sessionGoal),
      estimatedDuration: str(r.estimatedDuration),
      intensity: str(r.intensity),
      isSingleWorkout: r.isSingleWorkout ?? false,
      exerciseName: str(r.exerciseName),
      exerciseId: str(r.exerciseId),
      order: r.exerciseOrder ?? 0,
    })
  );
}
