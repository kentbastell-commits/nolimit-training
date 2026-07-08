import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CoachRevenuePage from "../../../src/CoachRevenuePage";

const StubChart = () => <div data-testid="revenue-chart" />;

const baseProps = {
  RevenueChart: StubChart,
  t: (k: string) => k,
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
  it("renders the revenue stats and chart card with no orders", () => {
    render(<CoachRevenuePage {...baseProps} />);
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("Revenue — Last 6 Months")).toBeInTheDocument();
    expect(screen.getAllByText("No paid orders yet.")).toHaveLength(2);
    expect(screen.getByTestId("revenue-chart")).toBeInTheDocument();
  });

  it("shows the coach earnings card when scoped to a single coach", () => {
    render(<CoachRevenuePage {...baseProps} coachScope="Kent" />);
    expect(screen.getByText("Kent — Earnings")).toBeInTheDocument();
    expect(screen.getByText("Est. Payout (50%)")).toBeInTheDocument();
  });
});
