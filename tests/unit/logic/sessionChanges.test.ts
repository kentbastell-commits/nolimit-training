// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sessionChanges, snapshotFromSession } from "../../../src/sessionChanges";
import type { SessionSnapshot } from "../../../src/SessionSnapshotPreview";
import type { ProgramSession } from "../../../src/appCore";

const snapshot = (): SessionSnapshot => ({ workout: { sessionName: "Accessory", scheduledDate: 1790092800000 }, templates: [
  { recordId: "old", exerciseId: "A", exerciseName: "Hold", exerciseNameCn: "静态支撑", order: 1, sets: "3", reps: "10", rest: "45", notes: "Circuit: A\nSetup\nBrace your abdomen.", setPrescriptions: [1, 2, 3].map(setNumber => ({ setNumber, time: "30", rest: "45", load: "0" })) },
] });
describe("publication comparison", () => {
  it("compares values across immutable IDs and string/number representations", () => {
    const before = snapshot(), after = structuredClone(before);
    after.templates[0].recordId = "new"; after.templates[0].sets = 3;
    after.templates[0].setPrescriptions[0].load = 0;
    expect(sessionChanges(before, after)).toEqual({ changes: [], exercises: [] });
  });
  it("shows reduced circuit rounds and changed per-set heart-rate/time targets", () => {
    const before = snapshot(), after = structuredClone(before);
    after.templates[0].sets = "2"; after.templates[0].setPrescriptions.pop();
    Object.assign(after.templates[0].setPrescriptions[0], { time: "60", intensityMode: "hrRange", intensityValue: "130-145" });
    const changes = sessionChanges(before, after).exercises[0].changes;
    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Sets / rounds", before: "3", after: "2" }),
      expect.objectContaining({ label: "Set 1 · Time (sec)", before: "30", after: "60" }),
      expect.objectContaining({ label: "Set 1 · Intensity target", after: "130-145" }),
    ]));
  });
  it("separates added/removed exercises from a reorder and exposes note changes", () => {
    const before = snapshot(), after = structuredClone(before);
    before.templates.push({ ...before.templates[0], exerciseId: "B", exerciseName: "Crunch", order: 2 });
    after.templates.push({ ...after.templates[0], exerciseId: "C", exerciseName: "Bike", order: 2 });
    after.templates[0].notes = "Circuit: B\nSetup\nDifferent cue.";
    const result = sessionChanges(before, after);
    expect(result.changes).toHaveLength(0);
    expect(result.exercises.map(e => [e.name, e.kind])).toEqual([["Hold", "changed"], ["Crunch", "removed"], ["Bike", "added"]]);
    expect(result.exercises[0].changes).toContainEqual(expect.objectContaining({ label: "Coaching cues", long: true }));
  });
  it("compares repeat occurrences as a group without guessing which was deleted", () => {
    const before = snapshot(), after = structuredClone(before);
    before.templates.push({ ...before.templates[0], order: 2, reps: "20" });
    const result = sessionChanges(before, after);
    expect(result.exercises[0].kind).toBe("changed");
    expect(result.exercises[0].changes[0].label).toBe("Repeated exercise (in order)");
  });
  it("uses China calendar dates even when timestamps cross UTC midnight", () => {
    const before = snapshot(), after = structuredClone(before);
    after.workout.scheduledDate = "2026-09-25";
    expect(sessionChanges(before, after, true).changes).toContainEqual(expect.objectContaining({ label: "日期", before: "2026-09-23", after: "2026-09-25" }));
  });
  it("keeps the published date when preparing the builder preview", () => {
    const source = snapshot();
    const session = { sessionName: "Accessory", sessionNotes: "Two rounds", exercises: [{ exerciseId: "A", exerciseName: "Hold", sets: "2", coachingNotes: "Hold" }] } as ProgramSession;
    const after = snapshotFromSession(session, source, e => e.coachingNotes);
    expect(after.workout.scheduledDate).toBe(source.workout.scheduledDate);
    expect(after.templates[0].notes).toBe("Hold");
    expect(sessionChanges(source, after, true).exercises[0].changes).toContainEqual(expect.objectContaining({ label: "组数 / 轮数", after: "2" }));
  });
});
