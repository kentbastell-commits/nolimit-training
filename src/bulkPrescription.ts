import type { ProgramExercise } from "./appCore";

/** Blank bulk fields leave existing targets intact, including varied set targets. */
export function applyBulkTargets(exercise: ProgramExercise, input: { sets: string; reps: string; rest: string }): ProgramExercise {
  const count = input.sets.trim() ? Number(input.sets) : Math.max(1, Number(exercise.sets) || 1);
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error("Sets must be a whole number from 1 to 100.");
  const existing = exercise.setPrescriptions || [];
  const targets = {
    ...(input.reps.trim() ? { reps: input.reps.trim() } : {}),
    ...(input.rest.trim() ? { rest: input.rest.trim() } : {}),
  };
  return { ...exercise, ...targets, sets: String(count), setPrescriptions: Array.from({ length: count }, (_, i) => ({
    ...(existing[i] || existing.at(-1) || { reps: exercise.reps || "", load: exercise.load || "", tempo: exercise.tempo || "", rest: exercise.rest || "",
    percent: "", percentMas: "", intensityMode: "", intensityValue: "", rpe: "", rir: "", time: "", distance: "",
    }), ...targets, setNumber: i + 1,
  })) };
}
