import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgramPreviewModal from "../../../src/ProgramPreviewModal";

const baseProps = {
  buildGlanceChain: vi.fn(() => []),
  loadSavedProgramIntoBuilder: vi.fn(),
  previewLoading: false,
  previewProgram: {
    program: {
      programId: "PRG-1",
      recordId: "rec1",
      programName: "12-Week Strength Base",
    },
    sessions: [],
  },
  setPreviewProgram: vi.fn(),
  setSelectedSavedProgramId: vi.fn(),
};

describe("ProgramPreviewModal", () => {
  it("renders the program name with an empty-program message", () => {
    render(<ProgramPreviewModal {...baseProps} />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("12-Week Strength Base")).toBeInTheDocument();
    expect(
      screen.getByText("No sessions in this program.")
    ).toBeInTheDocument();
  });

  it("shows the loading state while sessions are being fetched", () => {
    render(<ProgramPreviewModal {...baseProps} previewLoading={true} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders week/day cards for loaded sessions", () => {
    render(
      <ProgramPreviewModal
        {...baseProps}
        previewProgram={{
          ...baseProps.previewProgram,
          sessions: [
            {
              localId: "s1",
              week: "1",
              day: "2",
              sessionName: "Lower Power",
              sessionType: "Strength",
              exercises: [],
            },
          ],
        }}
      />
    );
    expect(screen.getByText("Week 1")).toBeInTheDocument();
    expect(screen.getByText(/Day 2 ·\s*Lower Power/)).toBeInTheDocument();
  });
});
