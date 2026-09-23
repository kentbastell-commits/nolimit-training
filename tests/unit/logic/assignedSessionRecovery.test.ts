import { describe, expect, it } from "vitest";
import { reconcileAssignedSession } from "../../../src/assignedSessionRecovery";
import type { ProgramExercise, ProgramSession } from "../../../src/appCore";

const exercise = (id: string, sets = "3"): ProgramExercise => ({ exerciseId: id, exerciseName: id, exerciseRecordId: id,
  order: 1, sectionName: "Main", exerciseLabel: id, sets, reps: "10", rest: "45", load: "", tempo: "", coachingNotes: "Setup and execution",
  trackingType: "Weight", isUnilateral: false, groupType: "Straight", groupName: "" });
const session = (exercises: ProgramExercise[], notes = "Original notes"): ProgramSession => ({ localId: "local", week: "1", day: "1", sessionName: "Accessory", sessionNotes: notes, exercises });
const recover = (base: ProgramSession | undefined, draft: ProgramSession, latest: ProgramSession, choices = {}) => reconcileAssignedSession({ base, draft, latest, version: "v2" }, choices);

describe("assigned session draft recovery", () => {
  it("keeps the new Bike while accepting the untouched core's two-set correction and notes", () => {
    const base = session([exercise("A"), exercise("B"), exercise("C"), exercise("D")], "Three rounds");
    const bike = { ...exercise("Bike", "1"), reps: "30:00", trackingType: "Time" as const };
    const draft = session([...base.exercises, bike], base.sessionNotes);
    const latest = session(base.exercises.map(e => ({ ...e, sets: "2" })), "Two rounds");
    const before = JSON.stringify({ base, draft, latest });
    const result = recover(base, draft, latest);
    expect(result.unresolved).toBe(0);
    expect(result.session.exercises.map(e => e.sets)).toEqual(["2", "2", "2", "2", "1"]);
    expect(result.session.sessionNotes).toBe("Two rounds");
    expect(result.session.exercises[4].reps).toBe("30:00");
    expect(JSON.stringify({ base, draft, latest })).toBe(before);
  });
  it("requires a choice when both versions change the same exercise", () => {
    const base = session([exercise("A")]), draft = session([exercise("A", "4")]), latest = session([exercise("A", "2")]);
    expect(recover(base, draft, latest).unresolved).toBe(1);
    const result = recover(base, draft, latest, { "exercise:A": "draft" });
    expect(result.unresolved).toBe(0);
    expect(result.session.exercises[0].sets).toBe("4");
  });
  it("honors deletions of untouched exercises and flags deletion versus edits", () => {
    const base = session([exercise("A"), exercise("B")]), draft = session([exercise("B")]);
    expect(recover(base, draft, base).session.exercises.map(e => e.exerciseId)).toEqual(["B"]);
    expect(recover(base, base, draft).session.exercises.map(e => e.exerciseId)).toEqual(["B"]);
    expect(recover(base, draft, session([exercise("A", "2"), exercise("B")])).unresolved).toBe(1);
  });
  it("does not guess which duplicate occurrence to keep", () => {
    const base = session([exercise("A"), exercise("A")]), draft = session([exercise("A")]);
    const latest = session([exercise("A", "2"), exercise("A")]);
    expect(recover(base, draft, latest).conflicts[0].key).toBe("exercises");
    expect(recover(base, draft, latest, { exercises: "latest" }).session.exercises).toHaveLength(2);
  });
  it("preserves a draft reorder and a latest inserted exercise", () => {
    const base = session([exercise("A"), exercise("B"), exercise("C")]);
    const draft = session([exercise("C"), exercise("A"), exercise("B")]);
    const latest = session([exercise("A"), exercise("new"), exercise("B"), exercise("C")]);
    expect(recover(base, draft, latest).session.exercises.map(e => e.exerciseId)).toEqual(["C", "A", "new", "B"]);
  });
  it("requires review for simultaneous reorders or missing original data", () => {
    const base = session([exercise("A"), exercise("B"), exercise("C")]);
    expect(recover(base, session([exercise("C"), exercise("A"), exercise("B")]), session([exercise("B"), exercise("C"), exercise("A")])).unresolved).toBe(1);
    expect(recover(undefined, base, session([exercise("A", "2")])).unresolved).toBe(1);
  });
  it("accepts independently equal edits despite record IDs, object key order and empty values", () => {
    const base = session([exercise("A")]);
    const draft = session([{ ...exercise("A", "2"), coachingNotesCn: undefined }]);
    const latest = session([{ ...exercise("A", "2"), order: 9, exerciseRecordId: "new-record", coachingNotesCn: "" }]);
    expect(recover(base, draft, latest).unresolved).toBe(0);
  });
  it("requires explicit decisions on conflicting session notes", () => {
    const base = session([exercise("A")]);
    const result = recover(base, session(base.exercises, "Mine"), session(base.exercises, "Latest"));
    expect(result.conflicts.map(c => c.key)).toEqual(["sessionNotes"]);
  });
});
