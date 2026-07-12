import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CoachEditModal from "../../../src/CoachEditModal";

const baseProps = {
  closeCoachForm: vi.fn(),
  coachForm: {
    name: "",
    role: "Coach",
    status: "Active",
    email: "",
    phoneWechat: "",
    bio: "",
  },
  editingCoach: null,
  saveCoachForm: vi.fn(),
  savingCoach: false,
  setCoachForm: vi.fn(),
};

// Redesign: the modal is now a right-hand slide-over. The heading is the
// coach's name ("New coach" fallback) instead of "Add Coach"/"Edit Coach";
// mode is distinguished by the footer save button ("Create coach" vs
// "Save coach") and the edit-only Assigned-clients section.
describe("CoachEditModal", () => {
  it("renders the add-coach form", () => {
    render(<CoachEditModal {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "New coach" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create coach" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "New coach" })
    ).toBeInTheDocument();
  });

  it("renders edit mode when editing a coach", () => {
    render(
      <CoachEditModal
        {...baseProps}
        coachForm={{ ...baseProps.coachForm, name: "Jane Doe" }}
        editingCoach={{ id: "C-1" }}
      />
    );
    expect(
      screen.getByRole("heading", { name: "Jane Doe" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save coach" })
    ).toBeInTheDocument();
    expect(screen.getByText("Assigned clients (0)")).toBeInTheDocument();
  });

  it("calls closeCoachForm from the close button and Escape", () => {
    const closeCoachForm = vi.fn();
    render(<CoachEditModal {...baseProps} closeCoachForm={closeCoachForm} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Close coach editor" })
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeCoachForm).toHaveBeenCalledTimes(2);
  });
});
