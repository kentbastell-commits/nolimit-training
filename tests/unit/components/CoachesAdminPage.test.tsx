import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoachesAdminPage from "../../../src/CoachesAdminPage";

const coach = {
  recordId: "rc1",
  coachId: "C-1",
  name: "Kent Bastell",
  role: "Admin",
  status: "Active",
  email: "kent@example.com",
};

const baseProps = {
  activeCoaches: [coach],
  allCoaches: [coach],
  clientBelongsToCoach: () => false,
  clients: [],
  openEditCoachForm: vi.fn(),
  savingCoach: false,
  setActivePage: vi.fn(),
  setCoachScope: vi.fn(),
  updateCoachStatus: vi.fn(),
};

describe("CoachesAdminPage", () => {
  it("renders the KPI board and coach table row", () => {
    render(<CoachesAdminPage {...baseProps} />);
    // dark KPI board replaced the old "Total coaches" summary tile
    expect(screen.getByText("coaches on staff")).toBeInTheDocument();
    // name appears in the table row AND the board's "Busiest" line
    expect(screen.getAllByText("Kent Bastell").length).toBeGreaterThan(0);
    // role pill in the card-row table
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("kent@example.com")).toBeInTheDocument();
  });

  it("opens the edit slide-over when a coach row is clicked", () => {
    const openEditCoachForm = vi.fn();
    render(
      <CoachesAdminPage {...baseProps} openEditCoachForm={openEditCoachForm} />
    );
    // the per-row "Edit" button is gone; the whole row is clickable now
    // (click the row's unique contact cell — the name also appears on the board)
    fireEvent.click(screen.getByText("kent@example.com"));
    expect(openEditCoachForm).toHaveBeenCalledWith(coach);
  });

  it("opens a blank edit form from the Add coach button", () => {
    const openEditCoachForm = vi.fn();
    render(
      <CoachesAdminPage {...baseProps} openEditCoachForm={openEditCoachForm} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Add coach" }));
    expect(openEditCoachForm).toHaveBeenCalledWith(null);
  });
});
