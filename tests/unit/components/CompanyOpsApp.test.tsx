import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompanyOpsApp from "../../../src/companyOps/CompanyOpsApp";
import type {
  CompanyOpsApi,
  CompanyOpsDashboard,
  CompanyOpsUser,
  OpsPerformanceCycle,
} from "../../../src/companyOps/types";

const growthUser: CompanyOpsUser = {
  id: "staff-1",
  name: "Yumei",
  role: "growth",
};

function performanceCycle(
  overrides: Partial<OpsPerformanceCycle> = {},
): OpsPerformanceCycle {
  return {
    id: "performance-2026-08-yumei",
    month: "2026-08",
    employee: {
      staffRecordId: "staff-1",
      name: "Yumei",
      role: "Brand & Growth",
    },
    status: "Goals confirmed",
    reportDue: "2026-08-31",
    prioritiesConfirmedAt: "2026-08-01T08:00:00.000Z",
    canSubmitReport: true,
    goals: [
      {
        index: 1,
        title: "Content & Delivery",
        measure: "Publish 12 approved videos",
        weight: 25,
      },
      {
        index: 2,
        title: "Quality & Optimization",
        measure: "Improve qualified-view rate by 10%",
        weight: 20,
      },
      {
        index: 3,
        title: "Campaigns & Partners",
        measure: "Launch two partner campaigns",
        weight: 20,
      },
      {
        index: 4,
        title: "Community & Leads",
        measure: "Generate 30 qualified leads",
        weight: 15,
      },
      {
        index: 5,
        title: "Organization & Ownership",
        measure: "Submit weekly reporting on time",
        weight: 20,
      },
    ],
    ...overrides,
  };
}

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

  it("lets Yumei submit her own monthly performance report with per-goal evidence", async () => {
    const cycle = performanceCycle();
    const api = fakeApi(
      growthUser,
      dashboard(growthUser, {
        myPerformance: { cycles: [cycle] },
        links: { sharedAssets: "https://example.feishu.cn/drive/folder/company-ops" },
      }),
    );
    const user = userEvent.setup();
    render(<CompanyOpsApp api={api} />);

    await screen.findByText("Hello, Yumei");
    await user.click(screen.getAllByRole("button", { name: "Performance" })[0]);

    expect(
      screen.getByRole("heading", { name: "Submit your monthly report" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Month in one paragraph"), {
      target: {
        value: "This month delivered stronger reach and a repeatable campaign process.",
      },
    });

    const reportedResults = [
      "Published 13 approved videos.",
      "Qualified-view rate improved by 12%.",
      "Launched two partner campaigns.",
      "Generated 34 qualified leads.",
      "Submitted every weekly report on time.",
    ];
    for (const [index, goal] of cycle.goals.entries()) {
      fireEvent.change(screen.getByLabelText(new RegExp(goal.title)), {
        target: { value: reportedResults[index] },
      });
    }
    fireEvent.change(screen.getByLabelText(/Evidence links/), {
      target: { value: "https://example.feishu.cn/file/video-evidence" },
    });
    fireEvent.change(screen.getByLabelText(/Context, constraints or support needed/), {
      target: { value: "One filming day was moved because of weather." },
    });
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() =>
      expect(api.submitAction).toHaveBeenCalledWith(
        "performance.report.submit",
        {
          performanceId: cycle.id,
          selfReview:
            "This month delivered stronger reach and a repeatable campaign process.",
          results: cycle.goals.map((goal, index) => ({
            index: goal.index,
            result: reportedResults[index],
          })),
          evidenceLinks: ["https://example.feishu.cn/file/video-evidence"],
          context: "One filming day was moved because of weather.",
        },
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

  it("defaults a pending teammate's access request to Brand & Growth", async () => {
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
        { requestedRole: "growth" },
        "csrf-test",
      ),
    );
    expect(api.getDashboard).not.toHaveBeenCalled();
  });

  it("lets a pending teammate select a different access role", async () => {
    const pending: CompanyOpsUser = {
      id: "pending-2",
      name: "Finance teammate",
      role: "employee",
      accessStatus: "pending",
      capabilities: [],
    };
    const api = fakeApi(pending);
    const user = userEvent.setup();
    render(<CompanyOpsApp api={api} />);

    await screen.findByRole("heading", {
      name: "This account does not have access",
    });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Access needed" }),
      "finance",
    );
    await user.click(screen.getByRole("button", { name: "Request access" }));

    await waitFor(() =>
      expect(api.submitAction).toHaveBeenCalledWith(
        "request_access",
        { requestedRole: "finance" },
        "csrf-test",
      ),
    );
    expect(api.getDashboard).not.toHaveBeenCalled();
  });

  it("lets the founder define Yumei's five fixed monthly bonus goals", async () => {
    const founder: CompanyOpsUser = {
      id: "founder-1",
      name: "Kent",
      role: "founder",
    };
    const cycle = performanceCycle({ canSubmitReport: false });
    const api = fakeApi(
      founder,
      dashboard(founder, {
        performance: {
          canManage: true,
          cycles: [cycle],
          staff: [cycle.employee],
        },
      }),
    );
    const user = userEvent.setup();
    render(<CompanyOpsApp api={api} />);

    await screen.findByText("Hello, Kent");
    await user.click(screen.getAllByRole("button", { name: "Performance" })[0]);
    expect(
      screen.getByRole("heading", { name: "Set five clear bonus goals" }),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Month"));
    await user.type(screen.getByLabelText("Month"), "2026-09");
    await user.type(screen.getByLabelText("Report due"), "2026-09-30");

    const measures = [
      "Publish 14 approved videos",
      "Improve qualified-view rate by 15%",
      "Launch three partner campaigns",
      "Generate 40 qualified leads",
      "Submit every weekly report by Friday",
    ];
    const measureInputs = screen.getAllByLabelText("Success measure");
    for (const [index, input] of measureInputs.entries()) {
      await user.type(input, measures[index]);
    }
    await user.click(screen.getByRole("button", { name: "Confirm goals" }));

    await waitFor(() =>
      expect(api.submitAction).toHaveBeenCalledWith(
        "performance.goals.set",
        {
          employeeStaffRecordId: "staff-1",
          month: "2026-09",
          goals: cycle.goals.map((goal, index) => ({
            index: goal.index,
            title: goal.title,
            measure: measures[index],
          })),
          reportDue: "2026-09-30",
        },
        "csrf-test",
      ),
    );
  });
});
