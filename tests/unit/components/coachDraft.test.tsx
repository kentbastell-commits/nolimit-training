import { beforeEach, describe, expect, it, vi } from "vitest";
import { coachDraftKey, readCoachDrafts, removeCoachDraft, writeCoachDraft } from "../../../src/coachDraft";

beforeEach(() => {
  vi.restoreAllMocks();
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    get length() { return data.size; }, key: (i: number) => [...data.keys()][i] || null,
    getItem: (key: string) => data.get(key) || null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  });
});
const draft = { schema: 1 as const, id: "athlete:AW-1", revision: "r1", title: "Lower body", updatedAt: 123,
  snapshot: { programName: "Lower body", programSessions: [], selectedProgramExercises: [{ exerciseId: "EX-1" }] } };
describe("coach device drafts", () => {
  it("recovers after refresh, separated from other coaches and athlete logging", () => {
    expect(writeCoachDraft("coach-a", draft, null)).toBe("saved");
    localStorage.setItem("nl-assignment-draft:CL-1:AW-1", "{}");
    expect(readCoachDrafts("coach-a")).toEqual([{ ...draft, cloudRevision: null }]);
    expect(readCoachDrafts("coach-b")).toEqual([]);
    expect(removeCoachDraft("coach-a", draft.id, "r1")).toBe(true);
    expect(localStorage.getItem("nl-assignment-draft:CL-1:AW-1")).toBe("{}");
  });
  it("does not overwrite or discard a newer tab's draft", () => {
    writeCoachDraft("a", draft, null);
    expect(writeCoachDraft("a", { ...draft, revision: "r2" }, null)).toBe("conflict");
    expect(writeCoachDraft("a", { ...draft, revision: "r2" }, "r1")).toBe("saved");
    expect(removeCoachDraft("a", draft.id, "r1")).toBe(false);
  });
  it("ignores damaged drafts and reports storage failure honestly", () => {
    localStorage.setItem(coachDraftKey("a", "bad"), "broken json");
    expect(readCoachDrafts("a")).toEqual([]);
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(writeCoachDraft("a", draft, null)).toBe("unavailable");
    expect(readCoachDrafts("a")).toEqual([]);
  });
});
