import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CoachAssignmentModal from "../../../src/CoachAssignmentModal";

const coaches = [
  { coachId: "COACH-KENT", name: "Kent Bastell", status: "Active" },
  { coachId: "COACH-MARIO", name: "Mario Artukovic", status: "Active" },
  { coachId: "COACH-OLD", name: "Former coach", status: "Inactive" },
];
const athletes = [{ id: "CL-0002", name: "Mei Lin", coach: "Kent Bastell", secondaryCoach: "Mario Artukovic" }, { id: "CL-0003", name: "Ava" }];

describe("coach assignment", () => {
  it("resolves existing names to coach IDs and prevents duplicate roles", () => {
    render(<CoachAssignmentModal athletes={athletes} coaches={coaches} athlete={athletes[0]} close={vi.fn()} save={vi.fn()} />);
    expect(screen.getByLabelText("Primary coach")).toHaveValue("COACH-KENT");
    expect(screen.getByLabelText("Supporting coach")).toHaveValue("COACH-MARIO");
    fireEvent.change(screen.getByLabelText("Primary coach"), { target: { value: "COACH-MARIO" } });
    expect(screen.getByLabelText("Supporting coach")).toHaveValue("");
  });
  it("clears all primary fields when choosing Unassigned", async () => {
    const save = vi.fn().mockResolvedValue(undefined), close = vi.fn();
    render(<CoachAssignmentModal athletes={athletes} coaches={coaches} athlete={athletes[0]} close={close} save={save} />);
    fireEvent.change(screen.getByLabelText("Primary coach"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Supporting coach"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(save).toHaveBeenCalledWith({ clientRecordId: "CL-0002", primaryCoachId: "", secondaryCoachId: "", coach: "" });
  });
  it("assigns a searched athlete from a coach's page with that coach preselected", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<CoachAssignmentModal athletes={athletes} coaches={coaches} presetCoach={coaches[1]} close={vi.fn()} save={save} />);
    expect(screen.getByRole("button", { name: "Save assignment" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Find athlete"), { target: { value: "ava" } });
    expect(screen.queryByRole("option", { name: /Mei Lin/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Athlete"), { target: { value: "CL-0003" } });
    fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ clientRecordId: "CL-0003", primaryCoachId: "COACH-MARIO", secondaryCoachId: "", coach: "Mario Artukovic" }));
  });
  it("retains the selection and shows the failure when saving fails", async () => {
    const close = vi.fn();
    render(<CoachAssignmentModal athletes={athletes} coaches={coaches} athlete={athletes[1]} close={close} save={vi.fn().mockRejectedValue(new Error("Connection lost"))} />);
    fireEvent.change(screen.getByLabelText("Primary coach"), { target: { value: "COACH-KENT" } });
    fireEvent.click(screen.getByRole("button", { name: "Save assignment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Primary coach")).toHaveValue("COACH-KENT");
    expect(screen.getByRole("button", { name: "Save assignment" })).toBeEnabled();
  });
  it("preserves an inactive coach on an existing athlete", () => {
    render(<CoachAssignmentModal athletes={athletes} coaches={coaches} athlete={{ id: "CL-0004", name: "Ethan", primaryCoach: "COACH-OLD" }} close={vi.fn()} save={vi.fn()} />);
    expect(screen.getByLabelText("Primary coach")).toHaveValue("COACH-OLD");
    expect(screen.getByRole("option", { name: "Former coach (inactive)" })).toBeInTheDocument();
  });
  it("starts an unassigned athlete without defaulting to Kent", () => {
    render(<CoachAssignmentModal athletes={athletes} coaches={coaches} athlete={athletes[1]} close={vi.fn()} save={vi.fn()} />);
    expect(screen.getByLabelText("Primary coach")).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Former coach (inactive)" })).not.toBeInTheDocument();
  });
});
