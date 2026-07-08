import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContentAssignmentModal from "../../../src/ContentAssignmentModal";

const baseProps = {
  t: (k: string) => k,
  activeAssignmentIsTest: false,
  activeContentAssignment: { templateName: "Weekly Check-in" },
  activeFormTemplate: null,
  activeTestTemplate: null,
  contentAssignmentAnswers: {},
  contentAssignmentComment: "",
  getAssignmentDisplayName: (a: any) => a.templateName || "Assignment",
  getTestAnswerKey: vi.fn(() => ""),
  getTestInputMode: vi.fn(() => "single"),
  isTwoKilometerTest: () => false,
  localizeText: (en: string) => en,
  setActiveContentAssignment: vi.fn(),
  setContentAssignmentAnswers: vi.fn(),
  setContentAssignmentComment: vi.fn(),
  submitActiveContentAssignment: vi.fn(),
  submittingContentAssignment: false,
};

describe("ContentAssignmentModal", () => {
  it("renders the questionnaire modal with template name", () => {
    render(<ContentAssignmentModal {...baseProps} />);
    expect(screen.getByText("Weekly Check-in")).toBeInTheDocument();
    expect(
      screen.getByText("Answer the assigned questionnaire.")
    ).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("closes when Cancel is clicked", () => {
    const setActiveContentAssignment = vi.fn();
    const setContentAssignmentComment = vi.fn();
    render(
      <ContentAssignmentModal
        {...baseProps}
        setActiveContentAssignment={setActiveContentAssignment}
        setContentAssignmentComment={setContentAssignmentComment}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(setActiveContentAssignment).toHaveBeenCalledWith(null);
    expect(setContentAssignmentComment).toHaveBeenCalledWith("");
  });

  it("renders test fields when the assignment is a physical test", () => {
    render(
      <ContentAssignmentModal
        {...baseProps}
        activeAssignmentIsTest={true}
        activeTestTemplate={{
          name: "Strength Test",
          description: "Record your test results.",
          items: [{ testItemId: "t1", testName: "Squat 1RM", unit: "kg" }],
        }}
      />
    );
    expect(screen.getByText("Strength Test")).toBeInTheDocument();
    expect(screen.getByText("Squat 1RM (kg)")).toBeInTheDocument();
  });
});
