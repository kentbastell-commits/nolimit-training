import { and, eq } from "drizzle-orm";
import { db } from "../client.ts";
import { workoutTemplates, exercises } from "../schema.ts";
import { str } from "./_util.ts";
import type { WorkoutDetailDTO } from "../dto.ts";

type ExRow = typeof exercises.$inferSelect;

export async function getWorkoutDetails(
  programId: string,
  week: string,
  day: string
): Promise<WorkoutDetailDTO[]> {
  const [templates, lib] = await Promise.all([
    db
      .select()
      .from(workoutTemplates)
      .where(
        and(
          eq(workoutTemplates.programId, String(programId)),
          eq(workoutTemplates.week, Number(week)),
          eq(workoutTemplates.day, Number(day))
        )
      ),
    db.select().from(exercises),
  ]);

  const byId = new Map<string, ExRow>();
  const byName = new Map<string, ExRow>();
  for (const e of lib) {
    if (e.exerciseId) byId.set(e.exerciseId, e);
    if (e.name) byName.set(e.name.trim().toLowerCase(), e);
  }

  return templates
    .map((t): WorkoutDetailDTO => {
      const e =
        (t.exerciseId ? byId.get(t.exerciseId) : undefined) ||
        (t.exerciseName ? byName.get(t.exerciseName.trim().toLowerCase()) : undefined);
      return {
        id: t.templateId,
        templateId: t.templateId,
        programId: str(t.programId),
        sessionType: str(t.sessionType),
        sessionGoal: str(t.sessionGoal),
        estimatedDuration: str(t.estimatedDuration),
        intensity: str(t.intensity),
        exerciseId: str(t.exerciseId),
        exerciseName: str(t.exerciseName),
        exerciseNameCn: str(e?.nameCn),
        videoUrl: str(t.videoUrl) || str(e?.shortVideoUrl),
        videoUrlCn: "",
        longVideoUrl: str(e?.longVideoUrl),
        category: str(e?.category),
        categoryCn: str(e?.categoryCn),
        equipment: (e?.equipment ?? []).join(", "),
        equipmentCn: "",
        movementPattern: str(e?.movementPattern),
        movementPatternCn: "",
        technicalInstructionsCn: str(e?.technicalCuesCn),
        coachingCuesCn: str(e?.coachingCuesCn),
        commonMistakesCn: str(e?.commonErrorsCn),
        cueNotes: str(e?.coachingCues),
        cueNotesCn: str(e?.coachingCuesCn),
        order: t.exerciseOrder ?? 0,
        sets: str(t.sets),
        reps: str(t.reps),
        tempo: str(t.tempo),
        rest: str(t.rest),
        notes: str(t.coachingNotes),
        notesCn: str(t.coachingNotesCn),
        sectionNameCn: "",
        targetSource: str(t.targetSource),
        targetMetric: str(t.targetMetric),
        targetPercent: str(t.targetPercent),
        targetAdjustment: str(t.targetAdjustment),
        autoTarget: t.autoTarget ?? false,
        displayTarget: str(t.displayTarget),
      };
    })
    .sort((a, b) => a.order - b.order);
}
