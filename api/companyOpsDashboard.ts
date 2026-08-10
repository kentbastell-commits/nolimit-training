import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  assertCompanyOpsAuthConfigured,
  getCompanyOpsConfig,
  type CompanyOpsRole,
} from "../server/companyOps/config.ts";
import {
  noStore,
  requireRequestSession,
} from "../server/companyOps/auth.ts";
import {
  createCompanyOpsRepository,
  publicCompanyOpsError,
  type CompanyOpsDashboardItem,
} from "../server/companyOps/repository.ts";

const publicRole = (role: CompanyOpsRole) =>
  role === "staff" || role === "pending" ? "employee" : role;

const queueUrgency = (dueAt?: string): "overdue" | "today" | "soon" | "normal" => {
  if (!dueAt) return "normal";
  const due = Date.parse(dueAt);
  if (!Number.isFinite(due)) return "normal";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueDay = new Date(new Date(due).getFullYear(), new Date(due).getMonth(), new Date(due).getDate()).getTime();
  if (dueDay < today) return "overdue";
  if (dueDay === today) return "today";
  if (dueDay <= today + 3 * 86_400_000) return "soon";
  return "normal";
};

const asQueueItem = (
  item: CompanyOpsDashboardItem,
  kind: string
) => ({
  id: item.id,
  kind,
  title: item.title,
  description: item.subtitle,
  status: item.status,
  dueAt: item.dueAt,
  ownerName: item.owner,
  urgency: queueUrgency(item.dueAt),
  meta: [item.platform, item.priority].filter(Boolean),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const config = getCompanyOpsConfig();
    assertCompanyOpsAuthConfigured(config);
    const session = requireRequestSession(req, config);
    const repository = createCompanyOpsRepository(config);
    const principal = await repository.resolvePrincipal(session);
    const data = await repository.getDashboard(principal);

    const kinds = new Map<string, string>();
    data.contentPipeline.forEach((item) => kinds.set(item.id, "content"));
    data.leads.forEach((item) => kinds.set(item.id, "lead"));
    data.partners.forEach((item) => kinds.set(item.id, "partner"));
    data.campaigns.forEach((item) => kinds.set(item.id, "campaign"));
    data.experiments.forEach((item) => kinds.set(item.id, "other"));
    data.onboarding.forEach((item) => kinds.set(item.id, "onboarding"));
    data.approvals.forEach((item) => kinds.set(item.id, "approval"));
    data.supportIssues.forEach((item) => kinds.set(item.id, "other"));

    const contentItems = data.contentPipeline.map((item) => ({
      id: item.id,
      title: item.title,
      platform: item.platform,
      status: item.status || "Idea",
      publishAt: item.dueAt,
      ownerName: item.owner,
      objective: item.subtitle,
    }));
    const phaseDefinitions = [
      { id: "plan", label: "Plan", statuses: ["Idea", "Research", "Script"], tone: "blue" },
      { id: "produce", label: "Produce", statuses: ["Ready to Film", "Filmed", "Editing", "Review", "Approved"], tone: "gold" },
      { id: "publish", label: "Publish", statuses: ["Scheduled", "Published"], tone: "success" },
      { id: "learn", label: "Learn", statuses: ["Analyzed", "Archived"], tone: "purple" },
    ];
    const pipeline = phaseDefinitions.map((phase) => {
      const items = contentItems.filter((item) => phase.statuses.includes(item.status));
      return { ...phase, count: items.length, items };
    });
    const leads = data.leads.map((item) => ({
      id: item.id,
      name: item.title,
      source: item.subtitle,
      status: item.status,
      nextActionAt: item.dueAt,
      ownerName: item.owner,
    }));
    const partners = data.partners.map((item) => ({
      id: item.id,
      name: item.title,
      platform: item.platform,
      stage: item.status,
      nextFollowUpAt: item.dueAt,
      proposedCollaboration: item.subtitle,
      ownerName: item.owner,
    }));
    const campaigns = data.campaigns.map((item) => ({
      id: item.id,
      name: item.title,
      objective: item.subtitle,
      status: item.status,
      endAt: item.dueAt,
      budget: item.amount == null ? undefined : String(item.amount),
    }));
    const experiments = data.experiments.map((item) => ({
      id: item.id,
      name: item.title,
      hypothesis: item.subtitle,
      status: item.status,
    }));
    const decisions = data.approvals.map((item) => ({
      id: item.id,
      category:
        item.actionType === "expense"
          ? "finance"
          : item.actionType === "access_request"
            ? "people"
            : "other",
      actionType: item.actionType,
      title: item.title,
      summary: item.subtitle,
      requestedBy: item.owner,
      dueAt: item.dueAt,
      amount: item.amount == null
        ? undefined
        : `${item.currency || "CNY"} ${item.amount.toLocaleString()}`,
      status: item.status,
      // The reviewer's evidence: an expense's receipt URL, when present.
      href: item.link,
    }));
    // Timeline phase: derived from the onboarding case's start date and each
    // task's due date. Without a case/start date the task keeps its Feishu
    // category text and the UI groups those dynamically.
    const caseStart = data.myOnboardingCase?.startDate
      ? Date.parse(data.myOnboardingCase.startDate)
      : undefined;
    const phaseFor = (dueAt?: string): string | undefined => {
      if (!caseStart || !dueAt) return undefined;
      const due = Date.parse(dueAt);
      if (!Number.isFinite(due)) return undefined;
      const days = Math.round((due - caseStart) / 86_400_000);
      if (days <= 0) return "before_start";
      if (days <= 7) return "week_one";
      if (days <= 30) return "day_30";
      if (days <= 60) return "day_60";
      return "day_90";
    };
    const onboardingTasks = data.onboarding.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.subtitle,
      phase: phaseFor(item.dueAt) || item.subtitle || "onboarding",
      dueAt: item.dueAt,
      ownerName: item.owner,
      completed: item.status === "Done",
    }));
    const completed = onboardingTasks.filter((task) => task.completed).length;
    const revenueMetrics = data.founder?.revenue.map((item) => ({
      id: `revenue-${item.productType}-${item.currency}`,
      label: `${item.productType} collected`,
      value: `${item.currency} ${item.grossCollected.toLocaleString()}`,
      helper: `${item.orderCount} paid order${item.orderCount === 1 ? "" : "s"}`,
      tone: "success",
    })) || [];
    const financeSource = data.founder || data.finance;
    const finance = financeSource
      ? {
          metrics: [
            ...revenueMetrics,
            {
              id: "expenses-pending",
              label: "Expenses awaiting review",
              value: financeSource.expenses.filter((item) => item.status === "Pending").length,
              tone: "warning",
            },
          ],
          // Whole-table status glances are founder-only: for a finance user
          // the first row of the payroll table is an arbitrary employee's.
          payrollStatus: principal.role === "founder" ? financeSource.payroll[0]?.status : undefined,
          commissionStatus: principal.role === "founder" ? financeSource.commissions[0]?.status : undefined,
          expenseStatus: financeSource.expenses[0]?.status,
        }
      : undefined;
    const quickActions = principal.role === "pending"
      ? []
      : [
          ...(principal.role === "growth" || principal.role === "founder"
            ? [
                "content",
                "lead",
                "partner",
                "campaign",
                "experiment",
                "platform_metrics",
                "weekly_report",
              ]
            : []),
          // Founders don't ask themselves for decisions.
          ...(principal.role === "founder" ? [] : ["founder_decision"]),
          ...(principal.role === "founder" ? ["goal", "onboarding_setup"] : []),
          "internal_request",
          "support_issue",
          "expense",
        ].map((key) => ({
          key,
          enabled: true,
          ...(key === "expense" && data.links.expense
            ? { href: data.links.expense }
            : {}),
        }));

    const user = {
      id: principal.openId,
      openId: principal.openId,
      name: principal.name,
      avatarUrl: principal.avatarUrl,
      role: publicRole(principal.role),
      accessPending: principal.role === "pending",
    };
    const workQueue = data.workQueue.map((item) =>
      asQueueItem(item, kinds.get(item.id) || "other")
    );
    const policyState = data as typeof data & {
      acknowledgedPolicyIds?: string[];
    };
    const acknowledgedPolicies = new Set(policyState.acknowledgedPolicyIds || []);
    const policies: Array<{
      id: string;
      title: string;
      description: string;
      url: string;
      required: boolean;
      acknowledged: boolean;
    }> = [];
    if (config.links.expensePolicy) {
      policies.push({
        id: "expense-policy",
        title: "Expense Policy / 报销制度",
        description: "What can be reimbursed, approval limits, receipts and payment timing.",
        url: config.links.expensePolicy,
        required: true,
        acknowledged: acknowledgedPolicies.has("expense-policy"),
      });
    }
    if (config.links.commissionPolicy) {
      policies.push({
        id: "commission-structure",
        title: "Commission Structure / 提成制度",
        description: "Attribution rules, rates, monthly statements and the dispute window.",
        url: config.links.commissionPolicy,
        required: principal.role === "growth",
        acknowledged: acknowledgedPolicies.has("commission-structure"),
      });
    }
    if (config.links.employeeHandbook) {
      policies.push({
        id: "employee-handbook",
        title: "Employee Handbook / 员工手册",
        description: "Working hours, leave, pay, discipline and every company rule in one document.",
        url: config.links.employeeHandbook,
        required: true,
        acknowledged: acknowledgedPolicies.has("employee-handbook"),
      });
    }
    if (config.links.dataRules) {
      policies.push({
        id: "confidentiality-data-rules",
        title: "Confidentiality & Data Rules / 保密与数据规则",
        description: "Account security, client data handling and what must never leave company systems.",
        url: config.links.dataRules,
        required: true,
        acknowledged: acknowledgedPolicies.has("confidentiality-data-rules"),
      });
    }
    const onboarding = {
      employeeName: principal.name,
      roleTitle: data.myOnboardingCase?.roleTitle,
      startDate: data.myOnboardingCase?.startDate,
      confidentialDetailsComplete: data.myOnboardingCase?.confidentialDetailsComplete,
      progress: onboardingTasks.length
        ? Math.round((completed / onboardingTasks.length) * 100)
        : 0,
      nextTask: onboardingTasks.find((task) => !task.completed),
      tasks: onboardingTasks,
      policies,
      confidentialFormUrl: data.links.confidentialForm,
    };
    const links = {
      startHere: data.links.startHere,
      onboardingGuide: data.links.onboardingGuide,
      confidentialForm: data.links.confidentialForm,
      expensePolicy: data.links.expensePolicy,
      commissionPolicy: data.links.commissionPolicy,
      expenseApproval: data.links.expense,
      weeklyReportForm: data.links.weeklyReport,
      tasks: data.links.internalRequest,
      sharedAssets: data.links.sharedAssets,
      companyCalendar: data.links.companyCalendar,
      contentCalendar: data.links.contentCalendar,
    };

    const cny = (value?: number) =>
      value == null ? undefined : `CNY ${value.toLocaleString()}`;
    const compensationSource = data.myCompensation;
    const compensation = compensationSource
      ? {
          compensationId: compensationSource.commission?.id,
          payPeriod:
            compensationSource.commission?.period ||
            compensationSource.payroll?.period ||
            "Current period",
          payrollStatus: compensationSource.payroll?.status,
          baseSalary: cny(compensationSource.payroll?.baseSalary),
          performanceBonus: cny(compensationSource.payroll?.performance),
          reimbursements: cny(compensationSource.payroll?.reimbursements),
          deductions: cny(compensationSource.payroll?.deductions),
          netPay: cny(compensationSource.payroll?.netPay),
          commissionAmount:
            compensationSource.commission?.amount == null
              ? undefined
              : `CNY ${compensationSource.commission.amount.toLocaleString()}`,
          commissionStatus: compensationSource.commission?.status,
          disputeDeadline: compensationSource.commission?.disputeDeadline,
          acknowledged: compensationSource.commission?.acknowledged,
          locked: compensationSource.commission?.locked,
          actionsAvailable:
            Boolean(compensationSource.commission?.id) &&
            !compensationSource.commission?.locked,
        }
      : undefined;
    const performance = data.performance
      ? {
          cycles: data.performance.cycles,
          staff: principal.role === "founder" ? data.performance.staff : undefined,
          canManage: data.performance.canManage,
        }
      : { cycles: [], canManage: false };

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      user,
      summary: data.summary,
      focus: workQueue[0],
      workQueue,
      myWork: workQueue,
      metrics: finance?.metrics || [],
      quickActions,
      contentPipeline: { phases: pipeline, upcoming: contentItems.slice(0, 12), experiments },
      leads,
      campaigns,
      partners,
      experiments,
      goals: data.goals || [],
      onboarding,
      onboardingCases: data.founder?.onboardingCases || [],
      onboardingCandidates: data.founder?.onboardingCandidates || [],
      policies,
      approvals: decisions,
      decisions,
      supportIssues: data.supportIssues.map((item) => asQueueItem(item, "other")),
      links,
      growth: principal.role === "growth" || principal.role === "founder"
        ? {
            metrics: (data.growthMetrics || []).map((row) => ({
              id: `platform-${row.platform}`,
              label: row.platform,
              value: row.followers == null ? "—" : row.followers.toLocaleString(),
              helper: [row.period, row.views == null ? "" : `${row.views.toLocaleString()} views`]
                .filter(Boolean)
                .join(" · ") || undefined,
              tone: "blue",
            })),
            pipeline,
            upcomingContent: contentItems.slice(0, 12),
            leadsToFollowUp: leads,
            partnersToFollowUp: partners,
            activeCampaigns: campaigns,
            experiments,
            weeklyReportDue: data.weeklyReportDue ?? false,
          }
        : undefined,
      finance,
      myCompensation: compensation,
      performance,
      myPerformance: {
        cycles: principal.role === "founder" ? [] : performance.cycles,
      },
      myExpenses: (data.myExpenses || []).map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        submittedAt: item.dueAt,
        amount: item.amount == null
          ? undefined
          : `${item.currency || "CNY"} ${item.amount.toLocaleString()}`,
      })),
      founder: data.founder
        ? {
            decisions,
            finance,
            onboarding,
            onboardingCases: data.founder.onboardingCases || [],
            onboardingCandidates: data.founder.onboardingCandidates,
            performanceCycles: data.founder.performanceCycles,
          }
        : undefined,
    });
  } catch (error) {
    const safe = publicCompanyOpsError(error);
    return res.status(safe.status).json({ error: safe.message, message: safe.message });
  }
}
