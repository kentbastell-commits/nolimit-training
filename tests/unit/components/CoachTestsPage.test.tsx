import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
// Initializes the i18next singleton that CoachTestsPage's useTranslation uses.
import "../../../src/i18n";
import CoachTestsPage from "../../../src/CoachTestsPage";

const makeTest = (overrides: any = {}) => ({
  recordId: overrides.recordId || "rec1",
  testTemplateId: overrides.testTemplateId || "TEST-1",
  name: overrides.name || "Strength Battery",
  description: "",
  category: overrides.category ?? "Strength",
  status: overrides.status || "Active",
  createdAt: "",
  items: overrides.items || [
    {
      testItemId: "TI-1",
      testTemplateId: overrides.testTemplateId || "TEST-1",
      order: "1",
      testName: "Back Squat 3RM",
      metricType: "Weight",
      unit: "kg",
    },
  ],
  ...overrides,
});

const baseProps: any = {
  savedTestTemplates: [],
  testTemplatesLoading: false,
  loadTestTemplates: vi.fn(),
  testLibraryTests: [],
  testLibraryLoading: false,
  loadTestLibrary: vi.fn(),
  onCreateTest: vi.fn(),
  onEditTest: vi.fn(),
  onDuplicateTest: vi.fn(),
  deleteSavedTestTemplate: vi.fn(),
};

// The page opens in canonical-library mode; the coach's saved batteries live
// behind the "My Test Batteries" toggle.
const openBatteries = () => fireEvent.click(screen.getByText("My Test Batteries"));

describe("CoachTestsPage", () => {
  it("shows the empty state and loads templates on mount", () => {
    render(<CoachTestsPage {...baseProps} />);
    expect(baseProps.loadTestTemplates).toHaveBeenCalled();
    expect(baseProps.loadTestLibrary).toHaveBeenCalled();
    expect(screen.getByText("Tests")).toBeInTheDocument();
    openBatteries();
    expect(
      screen.getByText("No saved tests yet. Create one to track performance.")
    ).toBeInTheDocument();
  });

  it("groups tests into category cards and drills into a category", () => {
    const tests = [
      makeTest({ recordId: "r1", testTemplateId: "T1", category: "Strength" }),
      makeTest({
        recordId: "r2",
        testTemplateId: "T2",
        name: "5-min Bike Test",
        category: "Energy Systems",
      }),
      // Legacy record with no category lands in Other.
      makeTest({
        recordId: "r3",
        testTemplateId: "T3",
        name: "Misc Checkpoint",
        category: "",
      }),
    ];
    render(<CoachTestsPage {...baseProps} savedTestTemplates={tests} />);
    openBatteries();

    // Directory level: one card per non-empty category.
    expect(screen.getByText("Strength")).toBeInTheDocument();
    expect(screen.getByText("Energy Systems")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();

    // Drill into Energy Systems: only its test shows.
    fireEvent.click(screen.getByText("Energy Systems"));
    expect(screen.getByText("5-min Bike Test")).toBeInTheDocument();
    expect(screen.queryByText("Strength Battery")).not.toBeInTheDocument();
  });

  it("opens the detail view with items and hands edit off to the builder", () => {
    const test = makeTest({ category: "Power", name: "Jump Testing" });
    render(<CoachTestsPage {...baseProps} savedTestTemplates={[test]} />);
    openBatteries();

    fireEvent.click(screen.getByText("Power"));
    fireEvent.click(screen.getByText("Jump Testing"));
    expect(screen.getByText("Test Items")).toBeInTheDocument();
    expect(screen.getByText("Back Squat 3RM")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Edit"));
    expect(baseProps.onEditTest).toHaveBeenCalledWith(
      expect.objectContaining({ testTemplateId: "TEST-1" })
    );
  });

  it("searches across all categories by test name", () => {
    const tests = [
      makeTest({ recordId: "r1", testTemplateId: "T1" }),
      makeTest({
        recordId: "r2",
        testTemplateId: "T2",
        name: "Sit and Reach",
        category: "Mobility & Flexibility",
      }),
    ];
    render(<CoachTestsPage {...baseProps} savedTestTemplates={tests} />);
    openBatteries();
    fireEvent.change(screen.getByPlaceholderText("Search tests..."), {
      target: { value: "sit and" },
    });
    expect(screen.getByText("Sit and Reach")).toBeInTheDocument();
    expect(screen.queryByText("Strength Battery")).not.toBeInTheDocument();
  });
});
