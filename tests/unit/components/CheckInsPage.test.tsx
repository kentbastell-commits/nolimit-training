import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CheckInsPage from "../../../src/CheckInsPage";

const baseProps = {
  checkInFilter: "Due",
  checkInSearch: "",
  checkInStats: { due: 2, recent: 1, missing: 3 },
  clientNeedsCheckIn: () => false,
  filteredCheckInClients: [],
  getCheckInAgeDays: () => null,
  loadClients: vi.fn(),
  loading: false,
  markClientCheckedInToday: vi.fn(),
  openCheckInQuestionnaire: vi.fn(),
  savingCheckInClientId: "",
  setCheckInFilter: vi.fn(),
  setCheckInSearch: vi.fn(),
  setClientTab: vi.fn(),
  setSelectedClient: vi.fn(),
};

const client = {
  id: "CL-1",
  initials: "AL",
  name: "Ada Lovelace",
  status: "Active",
};

describe("CheckInsPage", () => {
  it("renders stats and the empty state", () => {
    render(<CheckInsPage {...baseProps} />);
    expect(screen.getByText("Due Now")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(
      screen.getByText("No clients match this check-in view.")
    ).toBeInTheDocument();
  });

  it("renders a check-in card and marks a client checked in", () => {
    const markClientCheckedInToday = vi.fn();
    render(
      <CheckInsPage
        {...baseProps}
        filteredCheckInClients={[client]}
        markClientCheckedInToday={markClientCheckedInToday}
      />
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("No check-in recorded")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark Today" }));
    expect(markClientCheckedInToday).toHaveBeenCalledWith(client);
  });
});
