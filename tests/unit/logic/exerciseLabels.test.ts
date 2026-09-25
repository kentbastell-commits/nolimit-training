// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { accessoryGroupIndexes, changeExerciseLabel, exerciseLabelMetadata, relabelProgramExercises } from "../../../src/exerciseLabels";
import { parseExerciseNotes, type ProgramExercise } from "../../../src/appCore";
import { humanTranslationText } from "../../../server/db/contentTranslations";

const ex = (id: string, sectionName = "Strength", extra: Partial<ProgramExercise> = {}): ProgramExercise => ({
  exerciseRecordId: id, exerciseId: id, exerciseName: id, order: 1, sectionName, exerciseLabel: "",
  sets: "3", reps: "10", load: "", tempo: "", rest: "60", coachingNotes: "Keep control.",
  trackingType: "Weight", isUnilateral: false, groupType: "Straight", groupName: "", ...extra,
});
const labels = (list: ProgramExercise[]) => list.map(e => e.exerciseLabel);

describe("editable exercise labels", () => {
  it("keeps automatic numbering for existing sessions, warmups and accessories", () => {
    const result = relabelProgramExercises([ex("warm", "Warmup"), ex("one"), ex("accessory", "Strength", { isAccessory: true }), ex("two"), ex("bike", "Cardio")]);
    expect(labels(result)).toEqual(["", "A1", "A1", "A2", "B1"]);
    expect(result[2].accessoryParentLabel).toBe("A1");
  });
  it("retains overrides across reorder, section changes, additions and removals", () => {
    const original = relabelProgramExercises([ex("one"), ex("two")]);
    const edited = changeExerciseLabel(original, 0, "c4");
    const result = relabelProgramExercises([edited[1], ex("three", "Cardio"), { ...edited[0], sectionName: "Cardio" }]);
    expect(labels(result)).toEqual(["A1", "B1", "C4"]);
    expect(labels(relabelProgramExercises(result.slice(1)))).toEqual(["A1", "C4"]);
    expect(edited[0].sets).toBe("3");expect(original[0].isLabelCustom).toBe(false);
  });
  it("persists an explicit label even when it matches the current automatic one", () => {
    const edited = changeExerciseLabel([ex("one")], 0, "A1");
    const notes = [...exerciseLabelMetadata(edited[0]), edited[0].coachingNotes].join("\n\n");
    const parsed = parseExerciseNotes(notes);
    expect(parsed).toMatchObject({ exerciseLabel: "A1", isLabelCustom: true, coachingNotes: "Keep control." });
    const reopened = ex("one", "Cardio", { exerciseLabel: parsed.exerciseLabel, isLabelCustom: parsed.isLabelCustom });
    expect(labels(relabelProgramExercises([ex("other"), reopened]))).toEqual(["A1", "A1"]);
    expect(humanTranslationText(notes, "notes")).toBe("Keep control.");
  });
  it("reset resumes automatic labels and keeps accessory references on their parent", () => {
    let list = changeExerciseLabel([ex("one"), ex("accessory", "Strength", { isAccessory: true })], 0, "D1");
    expect(labels(list)).toEqual(["D1", "D1"]);
    list = changeExerciseLabel(list, 1, "D2");
    expect(list[1].accessoryParentLabel).toBe("D1");
    list = changeExerciseLabel(list, 0, "");
    expect(labels(list)).toEqual(["A1", "D2"]);expect(list[1].accessoryParentLabel).toBe("A1");
    expect(exerciseLabelMetadata(list[0])).toEqual(["Label: A1"]);
    expect(labels(changeExerciseLabel(list, 1, ""))).toEqual(["A1", "A1"]);
  });
  it("supports warmup overrides and preserves grouping separately from labels", () => {
    const source = [ex("warm", "Warmup", { groupType: "Circuit", groupName: "Activation" })];
    const result = changeExerciseLabel(source, 0, "P1");
    expect(result[0]).toMatchObject({ exerciseLabel: "P1", groupType: "Circuit", groupName: "Activation" });
    expect(labels(changeExerciseLabel(result, 0, ""))).toEqual([""]);
  });
  it("prevents pasted labels from injecting extra metadata", () => {
    const result = changeExerciseLabel([ex("one")], 0, "A1\nCircuit: X");
    expect(result[0].exerciseLabel).not.toMatch(/[\r\n]/);
    expect(result[0].exerciseLabel.length).toBeLessThanOrEqual(6);
  });
  it("never turns matching labels into a circuit or disconnects a renamed accessory", () => {
    const main = parseExerciseNotes("Section: Strength\nLabel: A1");
    const accessory = parseExerciseNotes("Section: Strength\nLabel: C9\nAccessory: Yes\nAccessory Parent: A1");
    const list = [main, accessory, { ...main }];
    expect(accessoryGroupIndexes(list, 0)).toEqual([0, 1]);
    expect(accessoryGroupIndexes(list, 1)).toEqual([0, 1]);
    expect(accessoryGroupIndexes(list, 2)).toEqual([2]);
  });
});
