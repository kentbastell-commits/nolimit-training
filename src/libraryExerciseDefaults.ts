import {
  parseExerciseNotes,
  stripLocalizedExerciseMeta,
  type LibraryExercise,
  type ProgramExercise,
} from "./appCore";

// Explicit library set rows opt an exercise into reusable protocol defaults.
// Ordinary library items keep the builder's existing category defaults.
export function libraryExerciseDefaults(exercise: LibraryExercise): Partial<ProgramExercise> | null {
  const meta = parseExerciseNotes(exercise.notes || "");
  if (!meta.setPrescriptions.length) return null;

  const sets = meta.setPrescriptions.map((set, index) => ({ ...set, setNumber: index + 1 }));
  const first = sets[0];
  return {
    sets: String(sets.length),
    reps: first.reps,
    load: first.load,
    tempo: first.tempo,
    rest: first.rest,
    setPrescriptions: sets,
    trackingType: meta.trackingType,
    trackingFields: meta.trackingFields ? [...meta.trackingFields] : undefined,
    isUnilateral: meta.isUnilateral,
    coachingNotes: meta.coachingNotes,
    coachingNotesCn: stripLocalizedExerciseMeta(
      exercise.notesCn || exercise.coachingCuesCn || exercise.technicalInstructionsCn || ""
    ),
  };
}

export function repeatedHoldDurationSeconds(exercise: Pick<ProgramExercise, "trackingFields" | "setPrescriptions">): number | null {
  if (!exercise.trackingFields?.includes("Reps") || !exercise.trackingFields.includes("Time") || !exercise.setPrescriptions?.length) return null;
  const seconds = (value: string) => {
    const clock = value.trim().match(/^(\d+):(\d+(?:\.\d+)?)$/);
    return clock ? Number(clock[1]) * 60 + Number(clock[2]) : parseFloat(value) * (/min/i.test(value) ? 60 : 1);
  };
  let total = 0;
  for (const set of exercise.setPrescriptions) {
    const reps = Number(set.reps), work = seconds(set.time), rest = set.rest.trim() ? seconds(set.rest) : 0;
    if (!(reps > 0) || !(work > 0) || !Number.isFinite(rest) || rest < 0) return null;
    total += reps * (work + rest);
  }
  return total;
}
