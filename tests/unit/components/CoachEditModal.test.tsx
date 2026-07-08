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

describe("CoachEditModal", () => {
  it("renders the add-coach form", () => {
    render(<CoachEditModal {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "Add Coach" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Coach" })
    ).toBeInTheDocument();
  });

  it("renders edit mode when editing a coach", () => {
    render(<CoachEditModal {...baseProps} editingCoach={{ id: "C-1" }} />);
    expect(
      screen.getByRole("heading", { name: "Edit Coach" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Coach" })
    ).toBeInTheDocument();
  });

  it("calls closeCoachForm from the Cancel button", () => {
    const closeCoachForm = vi.fn();
    render(<CoachEditModal {...baseProps} closeCoachForm={closeCoachForm} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(closeCoachForm).toHaveBeenCalled();
  });
});
