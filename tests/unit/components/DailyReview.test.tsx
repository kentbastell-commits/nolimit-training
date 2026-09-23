import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DailyReview, { initialReviewView } from "../../../src/DailyReview";
import CoachAthleteSummary from "../../../src/CoachAthleteSummary";
import { previousExerciseSets } from "../../../src/AthletePrescriptionHistory";
import { buildCoachingItems } from "../../../src/coachingReview";
import "../../../src/i18n";
const client = { clientCode: "CL-1", name: "Athlete", status: "Active" };
const items = buildCoachingItems({ clients: [client], today: "2026-09-23", workouts: [{ id: "AW-1", clientId: "CL-1", scheduledDate: "2026-09-22", completionStatus: "Completed", sessionName: "Lower strength" }] });
function Queue({ save = vi.fn(), ready = true }: any) {
  const [view, setView] = useState(initialReviewView); const [decisions, setDecisions] = useState<any[]>([]);
  return <DailyReview items={items} clients={[client]} decisions={decisions} decisionReady={ready} view={view} setView={setView} saveDecision={async (item: any, status: string, until: number, note: string) => { await save(item, status, until, note); setDecisions([{ ...item, item, status, until, note, version: 1 }]); }} />;
}
describe("daily review", () => {
  it("resolves one item, updates the count, retains history and supports reopening", async () => {
    render(<Queue />); fireEvent.click(screen.getByRole("button", { name: /Athlete.*Completed workout.*Lower strength/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Private follow-up note/ }), { target: { value: "Follow-up complete" } });
    fireEvent.click(screen.getByRole("button", { name: "Resolve", exact: true }));
    await waitFor(() => expect(screen.queryByText("Lower strength")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "History 1" }));
    fireEvent.click(screen.getByRole("button", { name: /Athlete.*Completed workout.*Lower strength/ }));
    expect(screen.getByRole("textbox", { name: /Private follow-up note/ })).toHaveValue("Follow-up complete");
    fireEvent.click(screen.getByRole("button", { name: "Reopen", exact: true }));
    await waitFor(() => expect(screen.queryByText("Lower strength")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Priority 2" })); expect(screen.getByText("Lower strength")).toBeInTheDocument();
  });
  it("leaves failed decisions and typed notes available to retry", async () => {
    render(<Queue save={vi.fn().mockRejectedValue(new Error("offline"))} />);
    fireEvent.click(screen.getByRole("button", { name: /Athlete.*Completed workout.*Lower strength/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Private follow-up note/ }), { target: { value: "Keep this" } });
    fireEvent.click(screen.getByRole("button", { name: "Resolve", exact: true }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save"); expect(screen.getByRole("textbox", { name: /Private follow-up note/ })).toHaveValue("Keep this");
  });
  it("does not allow writes when the persisted state could not load", () => {
    render(<Queue ready={false} />); fireEvent.click(screen.getByRole("button", { name: /Athlete.*Completed workout.*Lower strength/ }));
    expect(screen.getByRole("button", { name: "Resolve", exact: true })).toBeDisabled();
  });
  it("shows missing results as unknown and exposes calendar, progress and notes", () => {
    const calendar = vi.fn(), progress = vi.fn(), notes = vi.fn();
    render(<CoachAthleteSummary client={client} workouts={[]} checkIns={[]} checkInsReady items={[]} decisions={[]} videos={[]} openCalendar={calendar} openProgress={progress} openNotes={notes} workoutName={(w: any) => w.sessionName} />);
    expect(screen.getByText("No completed session recorded")).toBeInTheDocument(); expect(screen.getByText("No check-in recorded")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Plan training" })); fireEvent.click(screen.getByRole("button", { name: "Progress" })); fireEvent.click(screen.getByRole("button", { name: "Profile & notes" }));
    expect(calendar).toHaveBeenCalledOnce(); expect(progress).toHaveBeenCalledOnce(); expect(notes).toHaveBeenCalledOnce();
  });
  it("keeps previous performance scoped to the exercise and a single completed session", () => {
    const log = { recordId: "L1", exerciseId: "E1", exerciseName: "Hold", date: "2026-09-21", assignedWorkoutId: "A", setNumber: "1", actualTime: "30" };
    const sets = previousExerciseSets({ exerciseId: "E1", exerciseName: "Renamed hold" }, [log, { ...log, recordId: "L2", exerciseId: "E2" }, { ...log, recordId: "L3", date: "2026-09-24" }, { ...log, recordId: "L4", completed: false, date: "2026-09-22" }], "2026-09-23");
    expect(sets).toEqual([log]);
  });
});
