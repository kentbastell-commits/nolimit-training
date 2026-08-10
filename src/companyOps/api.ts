import type {
  CompanyOpsActionName,
  CompanyOpsActionResult,
  CompanyOpsApi,
  CompanyOpsDashboard,
  CompanyOpsSession,
  CompanyOpsUser,
  OpsAssetUploadResult,
  OpsGrowthDashboard,
  OpsPerformanceCycle,
  OpsPerformanceDashboard,
  OpsPipelinePhase,
} from "./types";

export class CompanyOpsApiError extends Error {
  status: number;
  code?: string;
  loginUrl?: string;

  constructor(
    message: string,
    options: { status: number; code?: string; loginUrl?: string },
  ) {
    super(message);
    this.name = "CompanyOpsApiError";
    this.status = options.status;
    this.code = options.code;
    this.loginUrl = options.loginUrl;
  }
}

async function readJson(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  return (await response.json()) as Record<string, unknown>;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new CompanyOpsApiError(
      String(data.message || data.error || "Company Operations request failed"),
      {
        status: response.status,
        code: typeof data.code === "string" ? data.code : undefined,
        loginUrl:
          typeof data.loginUrl === "string" ? data.loginUrl : undefined,
      },
    );
  }
  return data as T;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function array<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeUser(value: unknown): CompanyOpsUser | undefined {
  const raw = object(value);
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return undefined;
  const rawRole = typeof raw.role === "string" ? raw.role : "pending";
  const knownActiveRole = ["founder", "growth", "finance", "staff", "employee"].includes(
    rawRole,
  );
  const pending =
    raw.accessPending === true || rawRole === "pending" || !knownActiveRole;
  const role =
    rawRole === "founder" || rawRole === "growth" || rawRole === "finance"
      ? rawRole
      : "employee";
  return {
    id: raw.id,
    openId: typeof raw.openId === "string" ? raw.openId : undefined,
    name: raw.name,
    avatarUrl: typeof raw.avatarUrl === "string" ? raw.avatarUrl : undefined,
    role,
    accessStatus: pending ? "pending" : "active",
    preferredLanguage:
      raw.preferredLanguage === "zh" || raw.preferredLanguage === "en"
        ? raw.preferredLanguage
        : undefined,
    capabilities: pending
      ? []
      : Array.isArray(raw.capabilities)
        ? array(raw.capabilities)
        : undefined,
  };
}

function optionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizePerformanceCycle(value: unknown): OpsPerformanceCycle | undefined {
  const raw = object(value);
  const employee = object(raw.employee);
  const id = String(raw.id || raw.recordId || "").trim();
  const month = String(raw.month || "").trim();
  if (!id || !month) return undefined;
  const employeeName = String(employee.name || raw.employeeName || "").trim();
  const staffRecordId = String(
    employee.staffRecordId || raw.employeeStaffRecordId || "",
  ).trim();
  return {
    id,
    month,
    employee: { staffRecordId, name: employeeName || "Team member" },
    managerName:
      typeof raw.managerName === "string" ? raw.managerName : undefined,
    status: typeof raw.status === "string" ? raw.status : "Goals Set",
    goals: array(raw.goals).map((entry, position) => {
      const goal = object(entry);
      return {
        index: optionalNumber(goal.index) ?? position + 1,
        title: String(goal.title || `Goal ${position + 1}`),
        measure: String(goal.measure || ""),
        weight: optionalNumber(goal.weight) ?? 0,
        result: typeof goal.result === "string" ? goal.result : undefined,
        score: optionalNumber(goal.score),
      };
    }),
    personalFactor: optionalNumber(raw.personalFactor),
    weightedScore: optionalNumber(raw.weightedScore),
    approvedBonus: optionalNumber(raw.approvedBonus),
    reportDue: typeof raw.reportDue === "string" ? raw.reportDue : undefined,
    prioritiesConfirmedAt:
      typeof raw.prioritiesConfirmedAt === "string"
        ? raw.prioritiesConfirmedAt
        : undefined,
    selfReview: typeof raw.selfReview === "string" ? raw.selfReview : undefined,
    evidenceLinks: array<string>(raw.evidenceLinks).filter(
      (entry) => typeof entry === "string",
    ),
    context: typeof raw.context === "string" ? raw.context : undefined,
    reportSubmittedAt:
      typeof raw.reportSubmittedAt === "string"
        ? raw.reportSubmittedAt
        : undefined,
    founderReview:
      typeof raw.founderReview === "string" ? raw.founderReview : undefined,
    scoredAt: typeof raw.scoredAt === "string" ? raw.scoredAt : undefined,
    employeeResponse:
      typeof raw.employeeResponse === "string"
        ? raw.employeeResponse
        : undefined,
    employeeRespondedAt:
      typeof raw.employeeRespondedAt === "string"
        ? raw.employeeRespondedAt
        : undefined,
    disputeStatus:
      typeof raw.disputeStatus === "string" ? raw.disputeStatus : undefined,
    finalizedAt:
      typeof raw.finalizedAt === "string" ? raw.finalizedAt : undefined,
    payrollStagedAt:
      typeof raw.payrollStagedAt === "string" ? raw.payrollStagedAt : undefined,
    canSubmitReport: raw.canSubmitReport === true,
    canRespond: raw.canRespond === true,
    canManage: raw.canManage === true,
    canFinalize: raw.canFinalize === true,
  };
}

function normalizePerformance(value: unknown): OpsPerformanceDashboard | undefined {
  const raw = object(value);
  if (!Object.keys(raw).length && !Array.isArray(value)) return undefined;
  const cycleValues = Array.isArray(value) ? value : array(raw.cycles);
  const cycles = cycleValues
    .map(normalizePerformanceCycle)
    .filter((cycle): cycle is OpsPerformanceCycle => Boolean(cycle));
  const staff = array(raw.staff)
    .map((entry) => {
      const person = object(entry);
      const staffRecordId = String(person.staffRecordId || person.id || "").trim();
      const name = String(person.name || "").trim();
      return staffRecordId && name
        ? {
            staffRecordId,
            name,
            role: typeof person.role === "string" ? person.role : undefined,
          }
        : undefined;
    })
    .filter((person): person is NonNullable<typeof person> => Boolean(person));
  return {
    cycles,
    canManage: raw.canManage === true,
    staff: staff.length ? staff : undefined,
  };
}

// The server intentionally returns domain-shaped sections instead of a raw
// Bitable response. Keep this normalizer tolerant while the live schema is
// being rolled out: an absent section becomes an empty, intentional state and
// never crashes the employee's whole workspace.
function normalizeDashboard(value: unknown): CompanyOpsDashboard {
  const raw = object(value);
  const summary = object(raw.summary);
  const content = Array.isArray(raw.contentPipeline)
    ? { phases: raw.contentPipeline }
    : object(raw.contentPipeline);
  const leads = Array.isArray(raw.leads) ? raw.leads : object(raw.leads).items;
  const partners = Array.isArray(raw.partners)
    ? raw.partners
    : object(raw.partners).items;
  const campaigns = Array.isArray(raw.campaigns)
    ? raw.campaigns
    : object(raw.campaigns).items;
  const founder = object(raw.founder);

  const growth: OpsGrowthDashboard | undefined =
    raw.growth || raw.contentPipeline || raw.leads || raw.partners || raw.campaigns
      ? {
          metrics: array(object(raw.growth).metrics || content.metrics),
          pipeline: array<OpsPipelinePhase>(
            object(raw.growth).pipeline || content.phases || content.pipeline,
          ),
          upcomingContent: array(
            object(raw.growth).upcomingContent || content.upcoming,
          ),
          leadsToFollowUp: array(
            object(raw.growth).leadsToFollowUp || leads,
          ),
          partnersToFollowUp: array(
            object(raw.growth).partnersToFollowUp || partners,
          ),
          activeCampaigns: array(
            object(raw.growth).activeCampaigns || campaigns,
          ),
          experiments: array(
            object(raw.growth).experiments || content.experiments,
          ),
          weeklyReportDue: Boolean(
            object(raw.growth).weeklyReportDue ?? content.weeklyReportDue,
          ),
        }
      : undefined;

  return {
    generatedAt:
      typeof raw.generatedAt === "string" ? raw.generatedAt : undefined,
    user: normalizeUser(raw.user),
    focus: (raw.focus || summary.focus) as CompanyOpsDashboard["focus"],
    myWork: array(raw.myWork || raw.workQueue),
    metrics: array(raw.metrics || summary.metrics),
    weekRhythm: (raw.weekRhythm || summary.weekRhythm) as CompanyOpsDashboard["weekRhythm"],
    quickActions: array(raw.quickActions || summary.quickActions),
    growth,
    decisions: array(raw.decisions || raw.approvals || founder.decisions),
    finance: (raw.finance || founder.finance) as CompanyOpsDashboard["finance"],
    myCompensation: (raw.myCompensation || summary.myCompensation) as CompanyOpsDashboard["myCompensation"],
    myPerformance: normalizePerformance(raw.myPerformance),
    performance: normalizePerformance(raw.performance || founder.performanceCycles),
    onboarding: (raw.onboarding || founder.onboarding) as CompanyOpsDashboard["onboarding"],
    onboardingCases: array(raw.onboardingCases || founder.onboardingCases),
    onboardingCandidates: array(
      raw.onboardingCandidates || founder.onboardingCandidates,
    ),
    policies: array(raw.policies),
    links: raw.links as CompanyOpsDashboard["links"],
  };
}

export const companyOpsApi: CompanyOpsApi = {
  async getSession() {
    const data = await request<
      CompanyOpsSession | { session: CompanyOpsSession }
    >("/api/companyOpsSession");
    const session = "session" in data ? data.session : data;
    return { ...session, user: normalizeUser(session.user) };
  },

  async getDashboard() {
    const data = await request<Record<string, unknown>>(
      "/api/companyOpsDashboard",
    );
    return normalizeDashboard(data.dashboard || data);
  },

  async submitAction(action, payload, csrfToken) {
    const data = await request<
      CompanyOpsActionResult | { result: CompanyOpsActionResult }
    >("/api/companyOpsActions", {
      method: "POST",
      headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      body: JSON.stringify({ action, payload }),
    });
    const result = "result" in data ? data.result : data;
    return {
      ...result,
      id:
        result.id ||
        ((result as CompanyOpsActionResult & { recordId?: string }).recordId ??
          undefined),
    };
  },

  async uploadAsset(file, csrfToken) {
    const url = new URL("/api/company-ops/assets/upload", window.location.origin);
    url.searchParams.set("fileName", file.name);
    const response = await fetch(`${url.pathname}${url.search}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": file.type || "application/octet-stream",
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      },
      body: file,
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new CompanyOpsApiError(
        String(data.message || data.error || "The file could not be uploaded"),
        {
          status: response.status,
          code: typeof data.code === "string" ? data.code : undefined,
        },
      );
    }
    return (data.result || data) as OpsAssetUploadResult;
  },

  async logout(csrfToken) {
    await request<Record<string, unknown>>("/api/companyOpsLogout", {
      method: "POST",
      headers: csrfToken ? { "x-csrf-token": csrfToken } : {},
      body: JSON.stringify({}),
    });
  },
};

export const quickActionApiNames: Record<
  import("./types").QuickActionKey,
  CompanyOpsActionName
> = {
  content: "create_content_idea",
  lead: "create_lead",
  partner: "create_partner",
  weekly_report: "submit_weekly_report",
  expense: "submit_expense",
  internal_request: "submit_internal_request",
  founder_decision: "request_founder_decision",
  campaign: "create_campaign",
  experiment: "create_experiment",
  platform_metrics: "submit_platform_metrics",
  support_issue: "create_support_issue",
  onboarding_setup: "generate_onboarding",
  compensation_dispute: "dispute_compensation",
};
