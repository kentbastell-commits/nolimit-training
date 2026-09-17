import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { assignmentDraftKey, clearAssignmentDraft, readAssignmentDraft, writeAssignmentDraft } from "../../../src/assignmentDraft";
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());
it("restores drafts after a new module session, isolates athletes and clears confirmed saves", async () => {
  const key = assignmentDraftKey("C1", "A1"), draft = { answers: { Q: '["Recovery"]' }, comment: "Keep this" };
  expect(writeAssignmentDraft(key, draft)).toBe(true);
  vi.resetModules();
  const reloaded = await import("../../../src/assignmentDraft");
  expect(reloaded.readAssignmentDraft(key)).toEqual(draft);
  expect(readAssignmentDraft(assignmentDraftKey("C2", "A1"))).toBeNull();
  clearAssignmentDraft(key);
  expect(readAssignmentDraft(key)).toBeNull();
});
it("reports storage failure while retaining the current session draft", () => {
  const key = assignmentDraftKey("C1", "A2"), draft = { answers: { Q: "Retain me" }, comment: "" };
  const fail = vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw Error("Full"); });
  expect(writeAssignmentDraft(key, draft)).toBe(false);
  expect(readAssignmentDraft(key)).toEqual(draft);
  fail.mockRestore(); clearAssignmentDraft(key);
});
