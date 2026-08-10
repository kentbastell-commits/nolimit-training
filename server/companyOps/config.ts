export type CompanyOpsRole =
  | "founder"
  | "finance"
  | "growth"
  | "staff"
  | "pending";

export type CompanyOpsResource =
  | "staff"
  | "content"
  | "lead"
  | "partner"
  | "campaign"
  | "experiment"
  | "weeklyReport"
  | "metrics"
  | "goal"
  | "keyDate"
  | "expense"
  | "payroll"
  | "commission"
  | "performance"
  | "policyAcknowledgement"
  | "support"
  | "internalRequest"
  | "onboardingCase"
  | "onboardingTemplate"
  | "onboarding";

type CompanyOpsBase = "confidential" | "growth" | "teamOps";

export interface CompanyOpsTableConfig {
  base: CompanyOpsBase;
  id?: string;
  names: readonly string[];
}

export interface CompanyOpsConfig {
  appId: string;
  appSecret: string;
  sessionSecret: string;
  oauthRedirectUri: string;
  oauthScopes: readonly string[];
  afterLoginPath: string;
  allowedTenantKey?: string;
  cookieName: string;
  stateCookieName: string;
  cookieSecure: boolean;
  sessionTtlSeconds: number;
  stateTtlSeconds: number;
  founderOpenIds: ReadonlySet<string>;
  appAdminsAreFounders: boolean;
  sharedAssetsFolderToken?: string;
  baseTokens: Record<CompanyOpsBase, string>;
  tables: Record<CompanyOpsResource, CompanyOpsTableConfig>;
  links: {
    startHere?: string;
    expensePolicy?: string;
    commissionPolicy?: string;
    employeeHandbook?: string;
    dataRules?: string;
    onboardingGuide?: string;
    confidentialForm?: string;
    expenseForm?: string;
    weeklyReportForm?: string;
    metricsForm?: string;
    internalRequestForm?: string;
    companyCalendar?: string;
    contentCalendar?: string;
    sharedAssets?: string;
  };
}

type Env = Record<string, string | undefined>;

const clean = (value: string | undefined): string => (value || "").trim();

const csv = (value: string | undefined): string[] =>
  clean(value)
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const optional = (value: string | undefined): string | undefined => {
  const result = clean(value);
  return result || undefined;
};

const positiveInt = (
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    return fallback;
  }
  return parsed;
};

const booleanValue = (value: string | undefined, fallback: boolean): boolean => {
  const normalized = clean(value).toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const hasUnsafeInternalPathCharacters = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.codePointAt(0) || 0;
    return code <= 0x1f || code === 0x7f || character === "\\";
  });

const safeInternalPath = (value: string | undefined): string => {
  const path = clean(value) || "/company-ops";
  if (
    path.length > 4_096 ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    hasUnsafeInternalPathCharacters(path) ||
    /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(path)
  ) {
    return "/company-ops";
  }
  try {
    const base = new URL("https://company-ops.invalid");
    const parsed = new URL(path, base);
    return parsed.origin === base.origin ? path : "/company-ops";
  } catch {
    return "/company-ops";
  }
};

const safeLink = (value: string | undefined): string | undefined => {
  const link = optional(value);
  if (!link) return undefined;
  try {
    const parsed = new URL(link);
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

export function getCompanyOpsConfig(env: Env = process.env): CompanyOpsConfig {
  const cookieSecure = booleanValue(env.FEISHU_ADMIN_COOKIE_SECURE, true);
  const configuredCookie = clean(env.FEISHU_ADMIN_COOKIE_NAME);
  const cookieName = configuredCookie ||
    (cookieSecure ? "__Host-nl-company-ops" : "nl-company-ops");

  return {
    appId: clean(env.FEISHU_ADMIN_APP_ID),
    appSecret: clean(env.FEISHU_ADMIN_APP_SECRET),
    sessionSecret: clean(env.FEISHU_ADMIN_SESSION_SECRET),
    oauthRedirectUri: clean(env.FEISHU_ADMIN_OAUTH_REDIRECT_URI),
    oauthScopes: csv(env.FEISHU_ADMIN_OAUTH_SCOPES),
    afterLoginPath: safeInternalPath(env.FEISHU_ADMIN_AFTER_LOGIN_PATH),
    allowedTenantKey: optional(env.FEISHU_ADMIN_TENANT_KEY),
    cookieName,
    stateCookieName: `${cookieName}.oauth-state`,
    cookieSecure,
    sessionTtlSeconds: positiveInt(
      env.FEISHU_ADMIN_SESSION_TTL_SECONDS,
      8 * 60 * 60,
      5 * 60,
      24 * 60 * 60
    ),
    stateTtlSeconds: positiveInt(
      env.FEISHU_ADMIN_OAUTH_STATE_TTL_SECONDS,
      10 * 60,
      60,
      15 * 60
    ),
    founderOpenIds: new Set(csv(env.FEISHU_ADMIN_FOUNDER_OPEN_IDS)),
    appAdminsAreFounders: booleanValue(
      env.FEISHU_ADMIN_APP_ADMINS_ARE_FOUNDERS,
      false
    ),
    sharedAssetsFolderToken: optional(
      env.FEISHU_ADMIN_SHARED_ASSETS_FOLDER_TOKEN
    ),
    baseTokens: {
      confidential: clean(env.FEISHU_ADMIN_BASE_APP_TOKEN),
      growth: clean(
        env.FEISHU_GROWTH_BASE_APP_TOKEN ||
          env.FEISHU_ADMIN_GROWTH_BASE_APP_TOKEN
      ),
      teamOps: clean(
        env.FEISHU_TEAMOPS_BASE_APP_TOKEN ||
          env.FEISHU_ADMIN_TEAMOPS_BASE_APP_TOKEN
      ),
    },
    tables: {
      staff: {
        base: "confidential",
        id: optional(env.FEISHU_ADMIN_STAFF_TABLE_ID),
        names: ["员工名册 Staff", "Staff register", "Staff Register", "员工名册", "员工登记"],
      },
      content: {
        base: "growth",
        id: optional(env.FEISHU_ADMIN_CONTENT_TABLE_ID),
        names: ["内容日历 Content Calendar", "Content Calendar", "内容日历"],
      },
      lead: {
        base: "growth",
        id: optional(env.FEISHU_ADMIN_LEADS_TABLE_ID),
        names: ["线索 Leads CRM", "Leads CRM", "Leads", "潜客 CRM", "潜客"],
      },
      partner: {
        base: "growth",
        id: optional(env.FEISHU_ADMIN_PARTNERS_TABLE_ID),
        names: ["合作伙伴 KOL & Partners", "KOL & Partners", "KOL and Partners", "KOL 与合作伙伴"],
      },
      campaign: {
        base: "growth",
        id: optional(env.FEISHU_ADMIN_CAMPAIGNS_TABLE_ID),
        names: ["营销活动 Campaigns", "Campaigns", "营销活动"],
      },
      experiment: {
        base: "growth",
        id: optional(env.FEISHU_ADMIN_EXPERIMENTS_TABLE_ID),
        names: ["增长实验 Growth Experiments", "Growth Experiments", "增长实验"],
      },
      weeklyReport: {
        base: "growth",
        id: optional(env.FEISHU_ADMIN_WEEKLY_REPORTS_TABLE_ID),
        names: [
          "周报与里程碑 Weekly Reports & Milestones",
          "Weekly Reports & Milestones",
          "Weekly Reports",
          "周报与里程碑",
          "周报",
        ],
      },
      metrics: {
        base: "growth",
        id: optional(env.FEISHU_ADMIN_METRICS_TABLE_ID),
        names: ["平台数据 Platform Metrics", "Platform Metrics", "平台数据"],
      },
      goal: {
        base: "growth",
        id: optional(env.FEISHU_ADMIN_GOALS_TABLE_ID),
        names: ["公司目标 Company Goals", "Company Goals", "公司目标"],
      },
      keyDate: {
        base: "teamOps",
        id: optional(env.FEISHU_ADMIN_KEY_DATES_TABLE_ID),
        names: ["重要日期 Key Dates", "Key Dates", "重要日期"],
      },
      expense: {
        base: "confidential",
        id: optional(env.FEISHU_ADMIN_EXPENSES_TABLE_ID),
        names: ["报销记录 Expenses", "Expenses", "Expense ledger", "费用报销", "报销"],
      },
      payroll: {
        base: "confidential",
        id: optional(env.FEISHU_ADMIN_PAYROLL_TABLE_ID),
        names: ["工资台账 Payroll", "Payroll", "Payroll ledger", "工资台账", "薪资"],
      },
      commission: {
        base: "confidential",
        id: optional(env.FEISHU_ADMIN_COMMISSION_TABLE_ID),
        names: ["提成月结 Commission Statements", "Commission Statements", "Commission Statement", "提成结算单"],
      },
      performance: {
        base: "confidential",
        id: optional(env.FEISHU_ADMIN_PERFORMANCE_TABLE_ID),
        names: ["月度绩效 Monthly Performance", "Monthly Performance", "月度绩效"],
      },
      policyAcknowledgement: {
        base: "confidential",
        id: optional(env.FEISHU_ADMIN_POLICY_ACKNOWLEDGEMENTS_TABLE_ID),
        names: ["制度确认 Policy Acknowledgements", "Policy Acknowledgements", "Policy Acknowledgments", "政策确认记录"],
      },
      internalRequest: {
        base: "teamOps",
        id: optional(env.FEISHU_ADMIN_INTERNAL_REQUESTS_TABLE_ID),
        names: ["内部请求 Internal Requests", "Internal Requests", "内部申请"],
      },
      onboardingCase: {
        base: "teamOps",
        id: optional(env.FEISHU_ADMIN_ONBOARDING_CASES_TABLE_ID),
        names: ["入职案例 Onboarding Cases", "Onboarding Cases", "入职案例"],
      },
      onboardingTemplate: {
        base: "teamOps",
        id: optional(env.FEISHU_ADMIN_ONBOARDING_TEMPLATES_TABLE_ID),
        names: [
          "入职任务模板 Onboarding Templates",
          "Onboarding Templates",
          "入职任务模板",
        ],
      },
      onboarding: {
        base: "teamOps",
        id: optional(env.FEISHU_ADMIN_ONBOARDING_TABLE_ID),
        names: ["入职任务 Onboarding Tasks", "Onboarding Tasks", "Onboarding", "入职清单", "入职"],
      },
      support: {
        base: "teamOps",
        id: optional(env.FEISHU_ADMIN_SUPPORT_TABLE_ID),
        names: ["产品与应用支持 Product & App Support", "Product & App Support", "Product and App Support", "产品与应用支持"],
      },
    },
    links: {
      startHere: safeLink(env.FEISHU_ADMIN_START_HERE_URL),
      expensePolicy: safeLink(env.FEISHU_ADMIN_EXPENSE_POLICY_URL),
      commissionPolicy: safeLink(env.FEISHU_ADMIN_COMMISSION_POLICY_URL),
      employeeHandbook: safeLink(env.FEISHU_ADMIN_HANDBOOK_URL),
      dataRules: safeLink(env.FEISHU_ADMIN_DATA_RULES_URL),
      onboardingGuide: safeLink(env.FEISHU_ADMIN_ONBOARDING_GUIDE_URL),
      confidentialForm: safeLink(env.FEISHU_ADMIN_CONFIDENTIAL_FORM_URL),
      expenseForm: safeLink(env.FEISHU_ADMIN_EXPENSE_FORM_URL),
      weeklyReportForm: safeLink(env.FEISHU_ADMIN_WEEKLY_REPORT_FORM_URL),
      metricsForm: safeLink(env.FEISHU_ADMIN_METRICS_FORM_URL),
      internalRequestForm: safeLink(env.FEISHU_ADMIN_INTERNAL_REQUEST_FORM_URL),
      companyCalendar: safeLink(env.FEISHU_ADMIN_COMPANY_CALENDAR_URL),
      contentCalendar: safeLink(env.FEISHU_ADMIN_CONTENT_CALENDAR_URL),
      sharedAssets: safeLink(env.FEISHU_ADMIN_SHARED_ASSETS_FOLDER_URL),
    },
  };
}

export class CompanyOpsConfigurationError extends Error {
  readonly status = 503;

  constructor(message: string) {
    super(message);
    this.name = "CompanyOpsConfigurationError";
  }
}

export function assertCompanyOpsAuthConfigured(config: CompanyOpsConfig): void {
  const missing: string[] = [];
  if (!config.appId) missing.push("FEISHU_ADMIN_APP_ID");
  if (!config.appSecret) missing.push("FEISHU_ADMIN_APP_SECRET");
  if (!config.oauthRedirectUri) missing.push("FEISHU_ADMIN_OAUTH_REDIRECT_URI");
  if (config.sessionSecret.length < 32) {
    missing.push("FEISHU_ADMIN_SESSION_SECRET (at least 32 characters)");
  }
  if (missing.length) {
    throw new CompanyOpsConfigurationError(
      `Company Operations authentication is not configured: ${missing.join(", ")}`
    );
  }
  try {
    const redirect = new URL(config.oauthRedirectUri);
    if (redirect.protocol !== "https:" && config.cookieSecure) {
      throw new Error("secure cookies require HTTPS");
    }
  } catch {
    throw new CompanyOpsConfigurationError(
      "FEISHU_ADMIN_OAUTH_REDIRECT_URI must be a valid HTTPS URL"
    );
  }
}

export function baseTokenFor(
  config: CompanyOpsConfig,
  resource: CompanyOpsResource
): string {
  return config.baseTokens[config.tables[resource].base];
}
