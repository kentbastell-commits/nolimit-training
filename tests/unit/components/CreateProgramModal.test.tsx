import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateProgramModal from "../../../src/CreateProgramModal";

const baseProps = {
  createDraft: {
    productType: "Digital Program",
    name: "",
    goal: "",
    phase: "",
    durationWeeks: 8,
  },
  setCreateDraft: vi.fn(),
  setCreateProgramOpen: vi.fn(),
  startProgramFromDraft: vi.fn(),
};

describe("CreateProgramModal", () => {
  it("renders the program details form", () => {
    render(<CreateProgramModal {...baseProps} />);
    expect(screen.getByText("New Program")).toBeInTheDocument();
    expect(screen.getByText("Program Details")).toBeInTheDocument();
    expect(screen.getByText("Create & Build")).toBeInTheDocument();
  });

  it("disables Create & Build until a name is entered", () => {
    render(<CreateProgramModal {...baseProps} />);
    expect(screen.getByText("Create & Build")).toBeDisabled();
  });

  it("closes when Cancel is clicked", () => {
    const setCreateProgramOpen = vi.fn();
    render(
      <CreateProgramModal {...baseProps} setCreateProgramOpen={setCreateProgramOpen} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(setCreateProgramOpen).toHaveBeenCalledWith(false);
  });
});
