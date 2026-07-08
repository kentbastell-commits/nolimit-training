import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AccountModal from "../../../src/AccountModal";

const baseProps = {
  relativeDue: () => "in 3 days",
  accountCategoryInput: "",
  accountClient: {
    id: "CL-1",
    initials: "AL",
    name: "Ada Lovelace",
    email: "ada@example.com",
  },
  accountClientId: "CL-1",
  accountDraft: { categories: [], tags: [] },
  accountProgramId: "",
  accountStartDate: "2026-07-07",
  accountSubscription: null,
  accountTagInput: "",
  addAccountChip: vi.fn(),
  assignProgramFromAccount: vi.fn(),
  clients: [],
  deleteSubscription: vi.fn(),
  openAthleteCalendar: vi.fn(),
  programs: [],
  removeAccountChip: vi.fn(),
  saveAccountTagsCategories: vi.fn(),
  saveAccountTeamPosition: vi.fn(),
  savingAccount: false,
  savingSub: false,
  setAccountCategoryInput: vi.fn(),
  setAccountClientId: vi.fn(),
  setAccountProgramId: vi.fn(),
  setAccountStartDate: vi.fn(),
  setAccountTagInput: vi.fn(),
  setSubDraft: vi.fn(),
  subDraft: {
    plan: "Online Coaching",
    status: "Active",
    price: "",
    currency: "CNY",
    billingCycle: "1 Month",
    startDate: "",
    nextBillingDate: "",
    autoRenew: false,
  },
  subEffectiveStatus: () => "Active",
  teams: [],
  toggleAccountTeam: vi.fn(),
  updateAccountTeamPositionLocal: vi.fn(),
};

describe("AccountModal", () => {
  it("renders the client identity and account sections", () => {
    render(<AccountModal {...baseProps} />);
    expect(
      screen.getByRole("heading", { name: "Ada Lovelace" })
    ).toBeInTheDocument();
    expect(screen.getByText("No teams created yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Tags & Categories" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Subscription" })
    ).toBeInTheDocument();
  });

  it("closes via the drawer close button", () => {
    const setAccountClientId = vi.fn();
    render(
      <AccountModal {...baseProps} setAccountClientId={setAccountClientId} />
    );
    fireEvent.click(screen.getByRole("button", { name: "x" }));
    expect(setAccountClientId).toHaveBeenCalledWith("");
  });
});
