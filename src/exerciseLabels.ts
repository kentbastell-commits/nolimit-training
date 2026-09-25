import type { ExerciseNoteMeta, ProgramExercise } from "./appCore";

export function normalizeBuilderSection(sectionName?: string) {
  return String(sectionName || "Main").trim() || "Main";
}

export function isWarmupSection(sectionName?: string) {
  const clean = normalizeBuilderSection(sectionName).toLowerCase();
  return clean.includes("warm") || clean.includes("prep");
}

export function normalizeExerciseLabel(value: string) {
  return value.replace(/[\r\n\t]/g, " ").trim().slice(0, 6).toUpperCase();
}

// Automatic numbering keeps its existing section/order rules. A coach's
// explicit override survives moves, additions, duplicates and subsequent saves.
export function relabelProgramExercises(exercises: ProgramExercise[]): ProgramExercise[] {
  const sectionLetters = new Map<string, string>();
  const sectionCounts = new Map<string, number>();
  const lastMainLabelBySection = new Map<string, string>();
  return exercises.map((exercise, index) => {
    const sectionName = normalizeBuilderSection(exercise.sectionName);
    const sectionKey = sectionName.toLowerCase();
    const custom = exercise.isLabelCustom ? normalizeExerciseLabel(exercise.exerciseLabel) : "";
    const base = { ...exercise, sectionName, order: index + 1, isLabelCustom: Boolean(custom) };
    if (isWarmupSection(sectionName)) {
      return { ...base, exerciseLabel: custom, accessoryParentLabel: "" };
    }
    if (!sectionLetters.has(sectionKey)) {
      sectionLetters.set(sectionKey, String.fromCharCode(65 + Math.min(sectionLetters.size, 25)));
    }
    const letter = sectionLetters.get(sectionKey)!;
    if (exercise.isAccessory) {
      const parent = lastMainLabelBySection.get(sectionKey) || exercise.accessoryParentLabel || (!exercise.isLabelCustom && exercise.exerciseLabel) || `${letter}${Math.max(sectionCounts.get(sectionKey) || 1, 1)}`;
      return { ...base, exerciseLabel: custom || parent, accessoryParentLabel: parent };
    }
    const number = (sectionCounts.get(sectionKey) || 0) + 1;
    const label = custom || `${letter}${number}`;
    sectionCounts.set(sectionKey, number);
    lastMainLabelBySection.set(sectionKey, label);
    return { ...base, exerciseLabel: label, accessoryParentLabel: "" };
  });
}

export function changeExerciseLabel(exercises: ProgramExercise[], index: number, value: string) {
  const label = normalizeExerciseLabel(value);
  return relabelProgramExercises(exercises.map((ex, i) => i === index
    ? { ...ex, exerciseLabel: label, isLabelCustom: Boolean(label) } : ex));
}

export function exerciseLabelMetadata(exercise: ProgramExercise): string[] {
  return [exercise.exerciseLabel ? `Label: ${exercise.exerciseLabel}` : "",
    exercise.isLabelCustom && exercise.exerciseLabel ? "Label Mode: Custom" : ""].filter(Boolean);
}

// Labels are editable names, not group identities. Accessories still follow
// their preceding main exercise in the section, even with a different label.
export function accessoryGroupIndexes(exercises: ExerciseNoteMeta[], index: number): number[] {
  const focus = exercises[index];
  if (!focus) return [];
  const section = normalizeBuilderSection(focus.sectionName).toLowerCase();
  const sameSection = (ex: ExerciseNoteMeta) => normalizeBuilderSection(ex.sectionName).toLowerCase() === section;
  let parent = index;
  if (focus.isAccessory) {
    parent = -1;
    for (let i = index - 1; i >= 0; i--) {
      if (sameSection(exercises[i]) && !exercises[i].isAccessory) { parent = i; break; }
    }
  }
  if (parent < 0 || exercises[parent].groupName) return [index];
  const group = [parent];
  for (let i = parent + 1; i < exercises.length; i++) {
    const ex = exercises[i];
    if (!sameSection(ex)) continue;
    if (!ex.isAccessory) break;
    if (!ex.groupName) group.push(i);
  }
  return group;
}
