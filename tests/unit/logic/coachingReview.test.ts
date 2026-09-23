import { describe, expect, it } from "vitest";
import { athleteFacts, buildCoachingItems, coachingDate, decisionStatus, type ReviewDecision } from "../../../src/coachingReview";
const client = { id: "CL-1", clientCode: "CL-1", name: "Athlete", status: "Active", clientType: "Online Coaching", program: "Old plan", lastLogin: "" };
const workout = (id: string, date: string, status = "Scheduled", clientId = "CL-1") => ({ id, assignedWorkoutId: id, clientId, scheduledDate: date, completionStatus: status, sessionName: "Strength" });
const today = "2026-09-23";
describe("coaching signals", () => {
  it("uses actual training/check-ins rather than a missing login and never matches a partial client code", () => {
    const facts = athleteFacts(client, [workout("A", "2026-09-22", "Completed"), workout("B", today, "Completed", "CL-10")], [{ clientId: "CL-1", submittedDate: today }], today);
    expect(facts.lastCompleted).toBe("2026-09-22"); expect(facts.lastActivity).toBe(today); expect(facts.inactive).toBe(false); expect(facts.done).toHaveLength(1);
  });
  it("flags expired programming despite an old program name; only future scheduled sessions supply coverage", () => {
    const rows = [workout("A", "2026-09-22", "Completed"), workout("B", "2026-09-30", "Cancelled")];
    expect(athleteFacts(client, rows, [], today).needsProgramming).toBe(true);
    const facts = athleteFacts(client, [...rows, workout("C", "2026-09-27")], [], today);
    expect(facts.end).toBe("2026-09-27"); expect(facts.ending).toBe(true); expect(facts.needsProgramming).toBe(false);
  });
  it("keeps unknown activity and adherence unknown; excludes cancelled/future work from adherence", () => {
    expect(athleteFacts(client, [], [], today)).toMatchObject({ compliance: null, lastActivity: null, inactive: false });
    const facts = athleteFacts(client, [workout("A", "2026-09-22", "Completed"), workout("B", "2026-09-22", "Cancelled"), workout("C", "2026-09-25")], [], today);
    expect(facts.compliance).toBe(100);
  });
  it("suppresses automatic training warnings for paused and digital-only athletes", () => {
    expect(athleteFacts({ ...client, status: "Paused" }, [workout("A", "2026-08-22", "Completed")], [], today)).toMatchObject({ inactive: false, needsProgramming: false, compliance: null });
    expect(athleteFacts({ ...client, clientType: "Digital Program" }, [], [], today).needsProgramming).toBe(false);
    expect(buildCoachingItems({ clients: [{ ...client, status: "Archived" }], workouts: [workout("A", "2026-09-22")], today })).toHaveLength(0);
  });
  it("anchors epoch and timestamp dates to China even while the coach travels", () => {
    expect(coachingDate("2026-09-22T16:30:00Z")).toBe(today);
    expect(coachingDate(Date.parse("2026-09-22T16:00:00Z"))).toBe(today);
    expect(coachingDate("nonsense")).toBe("");
  });
});
describe("action queue lifecycle", () => {
  const input = { clients: [client], today, checkIns: [{ recordId: "CI-1", clientId: "CL-1", submittedDate: today, energy: "3" }] };
  const item = buildCoachingItems(input).find(i => i.kind === "checkin")!;
  const state = (status: ReviewDecision["status"], until: number | null = null): ReviewDecision => ({ ...item, item, status, until, version: 1, updatedAt: 100, note: "" });
  it("orders replies, new training, coverage, then older follow-ups", () => {
    const items = buildCoachingItems({ ...input, messages: [{ messageId: "M", clientId: "CL-1", body: "Help", createdAt: today }], workouts: [workout("A", "2026-09-20", "Completed"), workout("B", "2026-08-15", "Completed"), workout("C", "2026-09-22")] });
    expect(items[0].kind).toBe("message"); expect(items.map(i => i.priority)).toEqual([0, 1, 1, 2, 3, 3]);
  });
  it("persists resolution but surfaces corrected wellness with the same record ID; translations do not reopen it", () => {
    expect(decisionStatus(item, [state("resolved")])).toBe("resolved");
    const corrected = buildCoachingItems({ ...input, checkIns: [{ ...input.checkIns[0], energy: "1" }] }).find(i => i.kind === "checkin")!;
    expect(decisionStatus(corrected, [state("resolved")])).toBe("open");
    const translated = buildCoachingItems({ ...input, checkIns: [{ ...input.checkIns[0], trainingNotesEn: "Translated" }] }).find(i => i.kind === "checkin")!;
    expect(decisionStatus(translated, [state("resolved")])).toBe("resolved");
  });
  it("expires snoozes and treats a successful native reply as resolved", () => {
    expect(decisionStatus(item, [state("snoozed", 200)], 199)).toBe("snoozed");
    expect(decisionStatus(item, [state("snoozed", 200)], 201)).toBe("open");
    expect(decisionStatus({ ...item, sourceDone: true }, [state("open")])).toBe("resolved");
  });
  it("limits athlete items to the selected coach roster", () => {
    const items = buildCoachingItems({ ...input, workouts: [workout("X", today, "Completed", "CL-10")] });
    expect(items.some(i => i.source.id === "X")).toBe(false);
  });
});
