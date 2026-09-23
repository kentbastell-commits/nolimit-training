import { describe, expect, it } from "vitest";
import { insertBlock, progressExerciseLoad } from "../../../src/programmingBlockData";
import type { ProgramExercise } from "../../../src/appCore";
const station = { exerciseId: "EX-1", exerciseName: "Hold", groupType: "Circuit", groupName: "Core", groupMode: "EMOM", groupMinutes: "12", sets: "3", coachingNotesCn: "脚掌均匀受力。", load: "20", setPrescriptions: [{ setNumber: 1, time: "30 s", load: "20", rest: "60 s" }] } as ProgramExercise;
describe("reusable programming prescriptions", () => {
  it("keeps repeated circuits independent without losing time, rest or Chinese notes", () => {
    const block = [station, { ...station, exerciseId: "EX-2" }];
    const first = insertBlock([], block); const second = insertBlock(first, block);
    expect(second[0].groupName).toBe(second[1].groupName);
    expect(second[2].groupName).toBe(second[3].groupName);
    expect(second[0].groupName).not.toBe(second[2].groupName);
    expect(second[2].groupName).toBe("Core (2)");
    second[2].setPrescriptions![0].time = "45 s";
    expect(first[0].setPrescriptions![0].time).toBe("30 s");
    expect(station.setPrescriptions![0].time).toBe("30 s");
    expect(second[2]).toMatchObject({ groupMode: "EMOM", groupMinutes: "12", coachingNotesCn: station.coachingNotesCn });
  });
  it("progresses numeric loads only, preserving units, percentages and all other fields", () => {
    expect(progressExerciseLoad(station, 5).setPrescriptions![0]).toMatchObject({ load: "21", time: "30 s", rest: "60 s" });
    for (const load of ["BW", "80%", "20 kg", "10-20", "", "BW+10"]) expect(progressExerciseLoad({ ...station, load }, 10).load).toBe(load);
    expect(progressExerciseLoad(station, -10).load).toBe("18");
    expect(station.load).toBe("20");
    expect(progressExerciseLoad({ ...station, autoTarget: true }, 10).load).toBe("20");
  });
});
