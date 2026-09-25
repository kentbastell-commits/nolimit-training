import type { ProgramExercise, ProgramSession } from "./appCore";

export type RecoveryChoice = "draft" | "latest";
export type RecoveryConflict = { key: string; label: string; draft: unknown; latest: unknown };
export type SessionRecovery = { base?: ProgramSession; draft: ProgramSession; latest: ProgramSession; version: string };

// Stable, value-based comparisons survive JSON drafts and new template record IDs.
function canonical(value: unknown): string {
  if (value === undefined || value === null || value === "") return '""';
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") return JSON.stringify(Object.entries(value as object)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return JSON.stringify(value);
}
function comparableExercise(exercise: ProgramExercise | undefined) {
  if (!exercise) return undefined;
  const { order: _order, exerciseRecordId: _record, ...prescription } = exercise;
  return { ...prescription, isLabelCustom: Boolean(prescription.isLabelCustom) };
}

/** Conservative three-way recovery. Unresolved choices always block publication. */
export function reconcileAssignedSession(recovery: SessionRecovery, choices: Record<string, RecoveryChoice> = {}) {
  const { base, draft, latest } = recovery;
  const conflicts: RecoveryConflict[] = [];
  function merge<T>(key: string, label: string, before: T, mine: T, saved: T, compare: (v: T) => unknown = v => v): T {
    const same = (a: T, b: T) => canonical(compare(a)) === canonical(compare(b));
    if (same(mine, saved)) return saved;
    if (base && same(mine, before)) return saved;
    if (base && same(saved, before)) return mine;
    conflicts.push({ key, label, draft: mine, latest: saved });
    return choices[key] === "draft" ? mine : saved;
  }
  const session = { ...latest, localId: draft.localId };
  const fields = ["sessionName", "sessionNameCn", "sessionType", "sessionGoal", "sessionGoalCn", "sessionNotes", "estimatedDuration", "intensity", "isSingleWorkout", "testTemplateId"] as const;
  for (const field of fields) {
    Object.assign(session, { [field]: merge(field, field, base?.[field], draft[field], latest[field]) });
  }
  const before = base?.exercises || [], mine = draft.exercises, saved = latest.exercises;
  const comparableList = (items: ProgramExercise[]) => items.map(comparableExercise);
  const unique = (items: ProgramExercise[]) => items.every(e => e.exerciseId) && new Set(items.map(e => e.exerciseId)).size === items.length;
  const originalIds = new Set(before.map(e => e.exerciseId));
  const relativeOrder = (items: ProgramExercise[]) => items.filter(e => originalIds.has(e.exerciseId)).map(e => e.exerciseId);
  const reordered = (items: ProgramExercise[]) => {
    const ids = new Set(items.map(e => e.exerciseId));
    return canonical(relativeOrder(items)) !== canonical(before.filter(e => ids.has(e.exerciseId)).map(e => e.exerciseId));
  };
  // Repeated exercises have no stable per-occurrence identity. Never guess which
  // one was edited/deleted, or silently combine incompatible circuit ordering.
  if (!base || ![before, mine, saved].every(unique) || (reordered(mine) && reordered(saved))) {
    session.exercises = merge("exercises", "exercises", before, mine, saved, comparableList);
  } else {
    const map = (items: ProgramExercise[]) => new Map(items.map(e => [e.exerciseId, e]));
    const b = map(before), d = map(mine), l = map(saved);
    const merged = new Map<string, ProgramExercise>();
    for (const id of new Set([...b.keys(), ...d.keys(), ...l.keys()])) {
      const exercise = merge(`exercise:${id}`, d.get(id)?.exerciseName || l.get(id)?.exerciseName || b.get(id)!.exerciseName,
        b.get(id), d.get(id), l.get(id), comparableExercise);
      if (exercise) merged.set(id, exercise);
    }
    const primary = reordered(mine) ? mine : saved, secondary = reordered(mine) ? saved : mine;
    const order = primary.map(e => e.exerciseId).filter(id => merged.has(id));
    // Keep additions beside their closest surviving predecessor.
    for (let i = 0; i < secondary.length; i++) {
      const id = secondary[i].exerciseId;
      if (!merged.has(id) || order.includes(id)) continue;
      const predecessor = secondary.slice(0, i).reverse().find(e => order.includes(e.exerciseId));
      const successor = secondary.slice(i + 1).find(e => order.includes(e.exerciseId));
      const at = predecessor ? order.indexOf(predecessor.exerciseId) + 1 : successor ? order.indexOf(successor.exerciseId) : order.length;
      order.splice(at, 0, id);
    }
    session.exercises = order.map(id => merged.get(id)!);
  }
  session.exercises = session.exercises.map((e, i) => ({ ...e, order: i + 1 }));
  return { session, conflicts, unresolved: conflicts.filter(c => !choices[c.key]).length };
}
