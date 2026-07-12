import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CoachRevenuePage from "../../../src/CoachRevenuePage";

const baseProps = {
  clients: [],
  coachScope: "All Coaches",
  coachSharePercent: 50,
  coachVisibleClients: [],
  openAccountModal: vi.fn(),
  orderBelongsToCoachScope: () => true,
  productOrders: [],
  relativeDue: () => "",
  setCoachSharePercent: vi.fn(),
  subEffectiveStatus: () => "Active",
  subscriptions: [],
  todayValue: "2026-07-07",
};

describe("CoachRevenuePage", () => {
  it("renders the revenue board and chart card with no orders", () => {
    render(<CoachRevenuePage {...baseProps} />);
    // the "Total Revenue" tile became a hero-board breakdown line, and the
    // injected RevenueChart component was replaced by inline bars
    expect(screen.getByText("total revenue")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Revenue — last 6 months" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("No paid orders yet.")).toHaveLength(2);
  });

  it("shows the coach earnings card when scoped to a single coach", () => {
    render(<CoachRevenuePage {...baseProps} coachScope="Kent" />);
    expect(
      screen.getByRole("heading", { name: "Kent — earnings" })
    ).toBeInTheDocument();
    expect(screen.getByText("Est. payout · 50%")).toBeInTheDocument();
  });
});
