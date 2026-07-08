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
  it("renders the summary and coach table row", () => {
    render(<CoachesAdminPage {...baseProps} />);
    expect(screen.getByText("Total coaches")).toBeInTheDocument();
    expect(screen.getByText("Kent Bastell")).toBeInTheDocument();
    expect(screen.getByText("Deactivate")).toBeInTheDocument();
  });

  it("opens the edit form for a coach", () => {
    const openEditCoachForm = vi.fn();
    render(
      <CoachesAdminPage {...baseProps} openEditCoachForm={openEditCoachForm} />
    );
    fireEvent.click(screen.getByText("Edit"));
    expect(openEditCoachForm).toHaveBeenCalledWith(coach);
  });
});
