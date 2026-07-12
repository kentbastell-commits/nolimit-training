import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
      screen.getByRole("heading", { name: "Revenue — last 6 months" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("No paid orders yet.")).toHaveLength(2);
  });

  it("shows the coach earnings card when scoped to a single coach", () => {
    render(<CoachRevenuePage {...baseProps} coachScope="Kent" />);
    expect(
      screen.getByRole("heading", { name: "Kent — earnings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Est. payout · 50%")).toBeInTheDocument();
  });

  it("opens a subscription client from a labelled keyboard-accessible control", () => {
    const client = {
      id: "client-record-1",
      clientCode: "NL-1001",
      name: "Wei Chen",
    };
    const openAccountModal = vi.fn();
    render(
      <CoachRevenuePage
        {...baseProps}
        clients={[client]}
        openAccountModal={openAccountModal}
        subscriptions={[
          {
            id: "sub-1",
            clientId: "NL-1001",
            clientRecordIds: ["client-record-1"],
            plan: "Online Coaching",
            price: 1200,
            currency: "CNY",
            billingCycle: "Monthly",
            nextBillingDate: "2026-07-14",
            status: "Active",
          },
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open account for Wei Chen" }),
    );
    expect(openAccountModal).toHaveBeenCalledWith(client);
  });

  it("does not show the unsupported zero deposit balance", () => {
    render(<CoachRevenuePage {...baseProps} />);
    expect(screen.queryByText(/deposit balances/i)).not.toBeInTheDocument();
  });
});
