import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PortalWelcome from "../../../src/PortalWelcome";

const baseProps = {
  selectedClient: { id: "rec1", clientCode: "C-100", name: "Wei Chen" },
  toasts: [],
  useChineseClientText: false,
  portalAutoLoading: false,
  portalLoadedProgram: "Strength Base",
  setPortalPostIntake: vi.fn(),
  copyToClipboard: vi.fn(),
  setClientTab: vi.fn(),
};

describe("PortalWelcome", () => {
  it("renders the all-set welcome state", () => {
    render(<PortalWelcome {...baseProps} />);
    expect(screen.getByText("You're all set, Wei!")).toBeInTheDocument();
    expect(screen.getByText("Strength Base")).toBeInTheDocument();
    expect(
      screen.getByText("Open My Training Calendar →")
    ).toBeInTheDocument();
  });

  it("shows the loading state while the program is being built", () => {
    render(<PortalWelcome {...baseProps} portalAutoLoading={true} />);
    expect(screen.getByText("Loading your program...")).toBeInTheDocument();
  });

  it("opens the training calendar from the primary action", () => {
    const setPortalPostIntake = vi.fn();
    const setClientTab = vi.fn();
    render(
      <PortalWelcome
        {...baseProps}
        setPortalPostIntake={setPortalPostIntake}
        setClientTab={setClientTab}
      />
    );
    fireEvent.click(screen.getByText("Open My Training Calendar →"));
    expect(setPortalPostIntake).toHaveBeenCalledWith(false);
    expect(setClientTab).toHaveBeenCalledWith("Training");
  });
});
