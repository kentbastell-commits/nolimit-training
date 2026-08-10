import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompanyOpsApp from "../../../src/companyOps/CompanyOpsApp";
import type {
  CompanyOpsApi,
  CompanyOpsDashboard,
  CompanyOpsUser,
} from "../../../src/companyOps/types";

const growthUser: CompanyOpsUser = {
  id: "staff-1",
  name: "Yumei",
  role: "growth",
};

function dashboard(
  user: CompanyOpsUser,
  overrides: Partial<CompanyOpsDashboard> = {},
): CompanyOpsDashboard {
  return {
    user,
    metrics: [],
    myWork: [],
    growth: {
      metrics: [],
      pipeline: [],
      upcomingContent: [],
      leadsToFollowUp: [],
      partnersToFollowUp: [],
      activeCampaigns: [],
      experiments: [],
      weeklyReportDue: true,
    },
    ...overrides,
  };
}

function fakeApi(
  user: CompanyOpsUser | undefined,
  data?: CompanyOpsDashboard,
): CompanyOpsApi & {
  getSession: ReturnType<typeof vi.fn>;
  getDashboard: ReturnType<typeof vi.fn>;
  submitAction: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
} {
  return {
    getSession: vi.fn(async () => ({
      authenticated: Boolean(user),
      user,
      csrfToken: "csrf-test",
      loginUrl: "/feishu-login",
    })),
    getDashboard: vi.fn(async () => data || dashboard(user || growthUser)),
    submitAction: vi.fn(async () => ({ success: true })),
    logout: vi.fn(async () => undefined),
  };
}

describe("CompanyOpsApp", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/company-ops");
  });

  it("offers Feishu sign-in without requesting dashboard data first", async () => {
    const api = fakeApi(undefined);
    render(<CompanyOpsApp api={api} />);

    expect(
      await screen.findByRole("heading", { name: "Open Company Operations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue with Feishu" }),
    ).toHaveAttribute("href", "/feishu-login");
    expect(api.getDashboard).not.toHaveBeenCalled();
  });

  it("gives growth staff guided campaign, experiment, metrics and support workflows", async () => {
    const api = fakeApi(growthUser, dashboard(growthUser));
    const user = userEvent.setup();
    render(<CompanyOpsApp api={api} />);

    expect(await screen.findByText("Hello, Yumei")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Growth" })).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Decisions" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create a campaign" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create an experiment" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Record platform metrics" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Report a product issue" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Report a product or app issue",
    });
    await user.type(within(dialog).getByLabelText(/Issue title/), "Video freezes");
    await user.selectOptions(within(dialog).getByLabelText(/Severity/), "P1");
    await user.selectOptions(within(dialog).getByLabelText(/Issue type/), "bug");
    await user.type(within(dialog).getByLabelText(/Feature/), "Exercise video");
    await user.type(within(dialog).getByLabelText(/Device and OS/), "iPhone iOS 19");
    await user.type(within(dialog).getByLabelText(/What happened/), "The player stops.");
    await user.type(
      within(dialog).getByLabelText(/Steps to reproduce/),
      "Open workout and play video.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Submit" }));

    await waitFor(() =>
      expect(api.submitAction).toHaveBeenCalledWith(
        "create_support_issue",
        expect.objectContaining({
          title: "Video freezes",
          severity: "P1",
          feature: "Exercise video",
        }),
        "csrf-test",
      ),
    );
  });

  it("shows self-only compensation without exposing founder finance controls", async () => {
    const employee: CompanyOpsUser = {
      id: "staff-2",
      name: "Lin",
      role: "employee",
    };
    const api = fakeApi(
      employee,
      dashboard(employee, {
        growth: undefined,
        finance: {
          metrics: [{ id: "payroll", label: "Total payroll", value: "¥99,999" }],
          payrollStatus: "Draft",
        },
        myCompensation: {
          compensationId: "comp-1",
          payPeriod: "2026-08",
          payrollStatus: "Ready for review",
          commissionAmount: "¥1,200",
          commissionStatus: "Calculated",
          disputeDeadline: "2026-08-15",
          actionsAvailable: true,
        },
      }),
    );
    const user = userEvent.setup();
    render(<CompanyOpsApp api={api} />);

    expect(await screen.findByRole("heading", { name: "My pay" })).toBeInTheDocument();
    expect(screen.getByText("¥1,200")).toBeInTheDocument();
    expect(screen.queryByText("¥99,999")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Growth" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Decisions" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Acknowledge" }));
    await waitFor(() =>
      expect(api.submitAction).toHaveBeenCalledWith(
        "acknowledge_compensation",
        { compensationId: "comp-1", payPeriod: "2026-08" },
        "csrf-test",
      ),
    );
  });

  it("threads each founder decision type into the secure backend action", async () => {
    const founder: CompanyOpsUser = {
      id: "founder-1",
      name: "Kent",
      role: "founder",
    };
    const api = fakeApi(
      founder,
      dashboard(founder, {
        decisions: [
          {
            id: "recv-expense-1",
            actionType: "expense",
            category: "finance",
            title: "Travel receipt",
            status: "Pending",
          },
        ],
        finance: { metrics: [] },
      }),
    );
    const user = userEvent.setup();
    render(<CompanyOpsApp api={api} />);

    await screen.findByText("Hello, Kent");
    await user.click(screen.getAllByRole("button", { name: "Decisions" })[0]);
    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(api.submitAction).toHaveBeenCalledWith(
        "approve_decision",
        { decisionId: "recv-expense-1", actionType: "expense" },
        "csrf-test",
      ),
    );
  });

  it("lets a pending staff account request access without loading private data", async () => {
    const pending: CompanyOpsUser = {
      id: "pending-1",
      name: "New teammate",
      role: "employee",
      accessStatus: "pending",
      capabilities: [],
    };
    const api = fakeApi(pending);
    const user = userEvent.setup();
    render(<CompanyOpsApp api={api} />);

    expect(
      await screen.findByRole("heading", {
        name: "This account does not have access",
      }),
    ).toBeInTheDocument();
    expect(api.getDashboard).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Request access" }));
    await waitFor(() =>
      expect(api.submitAction).toHaveBeenCalledWith(
        "request_access",
        { requestedRole: "staff" },
        "csrf-test",
      ),
    );
    expect(api.getDashboard).not.toHaveBeenCalled();
  });
});
