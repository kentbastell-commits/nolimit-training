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
  it("shows Chinese choices while submitting the stable original value", () => {
    const update = vi.fn();
    render(<ContentAssignmentModal {...baseProps}
      localizeText={(en: string, zh?: string) => zh || en}
      activeFormTemplate={{ name: "Intake", nameCn: "训练问卷", questions: [
        { questionId: "q1", label: "Ready?", labelCn: "准备好了吗？", questionType: "Choice", options: "Yes, No", optionsCn: '["是","否"]' },
      ] }} setContentAssignmentAnswers={update} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Yes" } });
    expect(screen.getByRole("option", { name: "是" })).toHaveValue("Yes");
    expect(update.mock.calls[0][0]({})).toEqual({ q1: "Yes" });
  });
  it("renders the questionnaire modal with template name", () => {
    render(<ContentAssignmentModal {...baseProps} />);
    expect(screen.getByText("Weekly Check-in")).toBeInTheDocument();
    expect(
      screen.getByText("Answer the assigned questionnaire.")
    ).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
  });

  it("closes without discarding the persisted draft", () => {
    const setActiveContentAssignment = vi.fn();
    const setContentAssignmentComment = vi.fn();
    render(
      <ContentAssignmentModal
        {...baseProps}
        setActiveContentAssignment={setActiveContentAssignment}
        setContentAssignmentComment={setContentAssignmentComment}
      />
    );
    fireEvent.click(screen.getByText("Save & close"));
    expect(setActiveContentAssignment).toHaveBeenCalledWith(null);
    expect(setContentAssignmentComment).toHaveBeenCalledWith("");
  });

  it("shows completed answers without offering another submission", () => {
    render(<ContentAssignmentModal {...baseProps} contentAssignmentReview savedResponses={[
      { recordId: "R", itemId: "Q", label: "Recovery", answer: "Good" },
    ]} />);
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("renders Chinese test input labels", () => {
    render(<ContentAssignmentModal {...baseProps} activeAssignmentIsTest localizeText={(en: string, zh: string) => zh || en}
      getTestInputMode={() => "weightReps"} activeTestTemplate={{ name: "Squat", items: [{ testItemId: "T", testName: "Squat", unit: "kg" }] }} />);
    expect(screen.getByText("重量")).toBeInTheDocument();
    expect(screen.getByText("次数")).toBeInTheDocument();
    expect(screen.getByText("备注")).toBeInTheDocument();
    expect(screen.queryByText("Weight")).not.toBeInTheDocument();
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
