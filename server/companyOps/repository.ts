import {
  CompanyOpsConfigurationError,
  baseTokenFor,
  type CompanyOpsConfig,
  type CompanyOpsResource,
  type CompanyOpsRole,
} from "./config.ts";
import {
  CompanyOpsHttpError,
  requireActionPermission,
  type CompanyOpsActionName,
  type CompanyOpsSession,
} from "./auth.ts";
import {
  FeishuApiError,
  FeishuClient,
  type FeishuField,
  type FeishuFields,
  type FeishuOAuthUser,
  type FeishuRecord,
} from "./feishuClient.ts";
import {
  campaignCommissionAmount,
  campaignCommissionFromOrders,
  campaignCommissionRule,
  campaignProductKind,
  type CampaignCommissionRule,
  type PaidOrderRow,
} from "./campaignPolicy.ts";
import { createHash } from "node:crypto";

export interface CompanyOpsPrincipal {
  openId: string;
  userId?: string;
  name: string;
  avatarUrl?: string;
  tenantKey?: string;
  role: CompanyOpsRole;
  staffRecordId?: string;
}

export interface CompanyOpsDashboardItem {
  id: string;
  title: string;
  status?: string;
  subtitle?: string;
  dueAt?: string;
  owner?: string;
  platform?: string;
  amount?: number;
  currency?: string;
  priority?: string;
  actionType?: "founder_decision" | "access_request" | "expense" | "weekly_report";
  /** Supporting link (e.g. an expense's receipt URL) for the reviewer. */
  link?: string;
}

export interface CompanyOpsCampaignTrackingLink {
  channel: string;
  source: string;
  attributionCode: string;
  url: string;
}

export interface CompanyOpsCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  audience?: string[];
  offer?: string;
  product?: string;
  channels?: string[];
  budget?: number;
  startAt?: string;
  endAt?: string;
  ownerName?: string;
  campaignCode?: string;
  staffAttributionCode?: string;
  trackingLinks: CompanyOpsCampaignTrackingLink[];
  submittedAt?: string;
  approverName?: string;
  approvedAt?: string;
  reviewNote?: string;
  revenueTarget?: number;
  successCriteria?: string;
  attributionSharePercent?: number;
  commissionRatePercent?: number;
  commissionRule?: string;
  commissionType?: "rate" | "flat_fee";
  flatFeeAmount?: number;
  ratePercentAboveThreshold?: number;
  thresholdAmount?: number;
  originatorName?: string;
  managerName?: string;
  closerName?: string;
  trackedCollectedRevenue: number;
  trackedOrderCount: number;
  currency: string;
  reportedManualRevenue?: number;
  reportedDiscounts?: number;
  reportedRefunds?: number;
  reportedChargebacks?: number;
  reportedVat?: number;
  reportedAdjustments?: number;
  netCollectedRevenue?: number;
  eligibleRevenue?: number;
  commissionAmount?: number;
  resultsSummary?: string;
  evidenceLinks?: string[];
  resultsSubmittedAt?: string;
  reconciledAt?: string;
  reconciliationNote?: string;
  reach?: number;
  clicks?: number;
  consultations?: number;
  canEdit: boolean;
  canReview: boolean;
  canActivate: boolean;
  canSubmitResults: boolean;
  canReconcile: boolean;
}

export interface CompanyOpsPerformanceGoal {
  index: number;
  title: string;
  measure: string;
  weight: number;
  result?: string;
  score?: number;
}

export interface CompanyOpsPerformanceCycle {
  id: string;
  month: string;
  employee: {
    staffRecordId: string;
    name: string;
  };
  managerName?: string;
  status: string;
  goals: CompanyOpsPerformanceGoal[];
  weightedScore?: number;
  approvedBonus?: number;
  personalFactor?: number;
  reportDue?: string;
  prioritiesConfirmedAt?: string;
  selfReview?: string;
  evidenceLinks?: string[];
  context?: string;
  reportSubmittedAt?: string;
  founderReview?: string;
  scoredAt?: string;
  employeeResponse?: string;
  employeeRespondedAt?: string;
  disputeStatus?: string;
  finalizedAt?: string;
  payrollStagedAt?: string;
  canSubmitReport: boolean;
  canRespond: boolean;
  canManage: boolean;
  canFinalize: boolean;
}

export interface CompanyOpsPerformanceStaffOption {
  staffRecordId: string;
  name: string;
  role: CompanyOpsRole;
}

export interface CompanyOpsIdeaItem {
  id: string;
  idea: string;
  detail?: string;
  category?: string;
  status?: string;
  raisedBy?: string;
  raisedByOpenId?: string;
  votes: number;
  hasVoted: boolean;
  thread: string;
  /** Absolute links to files uploaded into the shared assets folder. */
  attachments: string[];
  createdAt?: string;
}

export interface CompanyOpsDashboard {
  user: {
    name: string;
    avatarUrl?: string;
    role: CompanyOpsRole;
    accessPending: boolean;
  };
  summary: {
    headline: string;
    todayCount: number;
    waitingCount: number;
    overdueCount: number;
  };
  workQueue: CompanyOpsDashboardItem[];
  contentPipeline: CompanyOpsDashboardItem[];
  leads: CompanyOpsDashboardItem[];
  campaigns: CompanyOpsDashboardItem[];
  campaignWorkflow?: CompanyOpsCampaign[];
  partners: CompanyOpsDashboardItem[];
  experiments: CompanyOpsDashboardItem[];
  onboarding: CompanyOpsDashboardItem[];
  approvals: CompanyOpsDashboardItem[];
  supportIssues: CompanyOpsDashboardItem[];
  links: Record<string, string>;
  acknowledgedPolicyIds?: string[];
  /** The principal's own expense claims (non-finance roles), newest first. */
  myExpenses?: CompanyOpsDashboardItem[];
  /** growth role only: has this week's report (Shanghai Monday) been filed? */
  weeklyReportDue?: boolean;
  /** Latest platform-metrics rows, one per platform (growth-visible roles). */
  growthMetrics?: Array<{
    platform: string;
    period?: string;
    followers?: number;
    views?: number;
    leads?: number;
  }>;
  /** The principal's own onboarding case, when one exists. */
  myOnboardingCase?: {
    roleTitle?: string;
    startDate?: string;
    confidentialDetailsComplete?: boolean;
  };
  /** Full content records for the editorial calendar (growth-visible). */
  contentFull?: Array<{
    id: string;
    title: string;
    platform?: string;
    status?: string;
    publishDate?: string;
    shootDate?: string;
    hook?: string;
    copy?: string;
    keywords?: string;
    hashtags?: string;
    cta?: string;
    ideaNotes?: string;
    pillar?: string;
    audience?: string;
    funnel?: string;
    objective?: string;
    format?: string;
    featured?: string;
    footageStatus?: string;
    filmingNotes?: string;
    owner?: string;
    needsFounderReview?: boolean;
    publishedUrl?: string;
    views?: number;
    saves?: number;
    comments?: number;
    leads?: number;
    revenue?: number;
    learnings?: string;
  }>;
  /** Dates that bite - licences, probation, renewals (founders only). */
  keyDates?: Array<{
    id: string;
    item: string;
    date?: string;
    category?: string;
    owner?: string;
    warnDays?: number;
    notes?: string;
  }>;
  /** Founder goals & ideas — visible to every active role. */
  goals?: Array<{
    id: string;
    title: string;
    goalType?: string;
    status?: string;
    measure?: string;
    priority?: string;
    dueAt?: string;
    creator?: string;
    response?: string;
    respondedBy?: string;
    notes?: string;
  }>;
  /** War Room: free-form team ideas with discussion threads. */
  ideas?: CompanyOpsIdeaItem[];
  /** Long-form articles built in the block editor (growth-visible). */
  articles?: Array<{
    id: string;
    title: string;
    status?: string;
    summary?: string;
    blocks?: string;
    author?: string;
    updatedAt?: string;
  }>;
  performance?: {
    cycles: CompanyOpsPerformanceCycle[];
    staff?: CompanyOpsPerformanceStaffOption[];
    canManage: boolean;
  };
  founder?: {
    accessRequests: CompanyOpsDashboardItem[];
    expenses: CompanyOpsDashboardItem[];
    payroll: CompanyOpsDashboardItem[];
    commissions: CompanyOpsDashboardItem[];
    weeklyReports: CompanyOpsDashboardItem[];
    performanceCycles: CompanyOpsPerformanceCycle[];
    onboardingCases?: Array<{
      id: string;
      employeeName: string;
      progress: number;
      nextDueAt?: string;
      blocker?: string;
    }>;
    onboardingCandidates: Array<{
      openId: string;
      name: string;
      role: string;
      startDate?: string;
    }>;
    revenue: Array<{
      productType: string;
      currency: string;
      grossCollected: number;
      orderCount: number;
    }>;
  };
  finance?: {
    expenses: CompanyOpsDashboardItem[];
    payroll: CompanyOpsDashboardItem[];
    commissions: CompanyOpsDashboardItem[];
  };
  myCompensation?: {
    payroll?: {
      period: string;
      baseSalary?: number;
      performance?: number;
      commission?: number;
      bonus?: number;
      reimbursements?: number;
      deductions?: number;
      netPay?: number;
      status?: string;
    };
    commission?: {
      id: string;
      period: string;
      attributedRevenue?: number;
      rate?: number;
      amount?: number;
      growthBonus?: number;
      status?: string;
      acknowledged?: boolean;
      disputeDeadline?: string;
      locked?: boolean;
    };
  };
}

export interface CompanyOpsActionRequest {
  action: CompanyOpsActionName;
  payload: Record<string, unknown>;
}

export interface CompanyOpsActionResult {
  success: true;
  message: string;
  recordId?: string;
  recordIds?: string[];
  caseId?: string;
  taskIds?: string[];
  warning?: string;
}

interface ResolvedTarget {
  resource: CompanyOpsResource;
  appToken: string;
  tableId: string;
  fields: FeishuField[];
}

type ValueKind = "string" | "number" | "boolean" | "date" | "strings";

interface InputFieldSpec {
  key: string;
  aliases: readonly string[];
  kind: ValueKind;
  required?: boolean;
  primary?: boolean;
  minimum?: number;
  maximum?: number;
}

const FIELD = {
  title: ["Title", "Name", "名称", "标题"],
  status: ["状态 Status", "阶段 Stage", "Status", "Stage", "状态", "阶段"],
  createdByOpenId: [
    "Created By Open ID",
    "Submitted By Open ID",
    "Owner Open ID",
    "创建人 Open ID",
    "提交人 Open ID",
  ],
  submittedBy: [
    "员工 Employee",
    "负责人 Owner",
    "负责人 Owner (Feishu)",
    "负责人（飞书） Owner (Feishu)",
    "提出人（飞书） Requested By (Feishu)",
    "报告人 Reporter",
    "提交人 Author",
    "Submitted By",
    "Created By",
    "Owner",
    "提交人",
    "负责人",
  ],
  newHireOpenId: [
    "飞书用户 Feishu User",
    "负责人 Assignee",
    "New Hire Open ID",
    "Employee Open ID",
    "新员工 Open ID",
  ],
} as const;

const CONFIDENTIAL_FIELD = {
  employee: "员工 Employee",
  payroll: {
    month: "月份 Month",
    base: "基本工资 Base",
    performanceBonus: "月度绩效奖金 Perf Bonus",
    commission: "提成 Commission",
    bonus: "奖金 Bonus",
    reimbursements: "报销 Reimbursements",
    deductions: "扣款 Deductions",
    netPay: "实发 Net Pay",
    status: "状态 Status",
    locked: "已锁定 Locked",
  },
  commission: {
    month: "月份 Month",
    attributedRevenue: "归属销售额 Attributed Revenue",
    rate: "比例% Rate",
    amount: "提成金额 Amount",
    growthBonus: "季度增长奖金 Growth Bonus",
    status: "状态 Status",
    acknowledgedAt: "员工确认时间 Acknowledged At",
    disputeDeadline: "异议截止 Dispute Deadline",
    disputeStatus: "异议状态 Dispute Status",
    disputeNotes: "异议说明 Dispute Notes",
    locked: "已锁定 Locked",
  },
  policy: {
    acknowledgement: "确认记录 Acknowledgement",
    acknowledgedBy: "确认人 Acknowledged By",
    document: "文件 Document",
    version: "文件版本 Document Version",
    readAndAcknowledged: "已阅读并确认 Read & Acknowledged",
  },
  performance: {
    record: "记录 Record",
    month: "月份 Month",
    manager: "直属负责人 Manager",
    status: "状态 Status",
    reportDue: "报告截止 Report Due",
    prioritiesConfirmedAt: "目标确认时间 Priorities Confirmed At",
    selfReview: "员工自评 Self Review",
    evidenceLinks: "证据链接 Evidence Links",
    context: "问题与背景 Context",
    reportSubmittedAt: "报告提交时间 Report Submitted At",
    founderReview: "创始人评语 Founder Review",
    total: "总分 Total",
    bonus: "奖金 Bonus (税前)",
    personalFactor: "个人系数 Personal Factor",
    bonusFormula: "奖金计算规则 Bonus Formula",
    scoredAt: "初评时间 Scored At",
    employeeResponse: "员工异议/说明 Employee Response",
    employeeRespondedAt: "员工回应时间 Employee Responded At",
    disputeStatus: "异议状态 Dispute Status",
    finalizedAt: "定稿时间 Finalized At",
    payrollStagedAt: "工资入账时间 Payroll Staged At",
  },
} as const;

const performanceGoalField = (index: number): string => `目标 ${index} Goal ${index}`;
const performanceMeasureField = (index: number): string => `衡量标准 ${index} Measure ${index}`;
const performanceResultField = (index: number): string => `成果 ${index} Result ${index}`;

const PERFORMANCE_CATEGORIES = [
  { index: 1, weight: 25, scoreField: "内容规划与交付(25) Content & Delivery" },
  { index: 2, weight: 20, scoreField: "内容质量与优化(20) Quality" },
  { index: 3, weight: 20, scoreField: "活动与合作(20) Campaigns & Partners" },
  { index: 4, weight: 15, scoreField: "社群线索转化(15) Community & Leads" },
  { index: 5, weight: 20, scoreField: "组织与主人翁(20) Ownership" },
] as const;

const PERFORMANCE_FORMULA_VERSION = "handbook_v2_fixed_categories_thresholds_v1";

const POLICY_DOCUMENT_BY_ID = {
  "employee-handbook": "员工手册 Employee Handbook",
  "expense-policy": "报销制度 Expense Policy",
  "commission-structure": "提成制度 Commission Structure",
  "confidentiality-data-rules": "保密与数据规则 Confidentiality & Data Rules",
} as const;

const POLICY_ID_BY_DOCUMENT = new Map<string, string>(
  Object.entries(POLICY_DOCUMENT_BY_ID).map(([id, document]) => [document, id])
);

// Keys are normalize()d: lowercase, separators collapsed to single spaces.
const FOOTAGE_STATUS_OPTIONS: Record<string, string> = {
  "to film": "需拍摄 To Film",
  "需拍摄": "需拍摄 To Film",
  "需拍摄 to film": "需拍摄 To Film",
  "filming": "拍摄中 Filming",
  "拍摄中": "拍摄中 Filming",
  "拍摄中 filming": "拍摄中 Filming",
  "footage ready": "已有素材 Footage Ready",
  "已有素材": "已有素材 Footage Ready",
  "已有素材 footage ready": "已有素材 Footage Ready",
  "no filming needed": "无需拍摄 No Filming Needed",
  "无需拍摄": "无需拍摄 No Filming Needed",
  "无需拍摄 no filming needed": "无需拍摄 No Filming Needed",
};

const ARTICLE_SPECS: readonly InputFieldSpec[] = [
  { key: "title", aliases: ["标题 Title", "Title", "标题"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "summary", aliases: ["摘要 Summary", "Summary", "摘要"], kind: "string", maximum: 1_000 },
  { key: "blocks", aliases: ["内容块 Blocks", "Blocks", "内容块"], kind: "string", maximum: 300_000 },
];

const CONTENT_SPECS: readonly InputFieldSpec[] = [
  { key: "title", aliases: ["内容 Content", "Title", "Content Title", "内容标题"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "platform", aliases: ["平台 Platform", "Platform", "平台"], kind: "string", required: true, maximum: 50 },
  { key: "contentType", aliases: ["形式 Format", "Content Type", "内容类型"], kind: "string", maximum: 80 },
  { key: "status", aliases: FIELD.status, kind: "string", maximum: 50 },
  { key: "publishDate", aliases: ["发布日期 Publish Date", "Publish Date", "Planned Publish Date", "发布日期"], kind: "date" },
  { key: "draftDue", aliases: ["草稿截止 Draft Due", "Draft Due", "Draft Due Date", "初稿截止"], kind: "date" },
  { key: "hook", aliases: ["钩子/标题 Hook", "Hook / Title", "Hook", "开头钩子"], kind: "string", maximum: 500 },
  { key: "script", aliases: ["文案 Copy", "Script / Caption", "Script", "Caption", "脚本 / 文案"], kind: "string", maximum: 20_000 },
  { key: "cta", aliases: ["行动号召 CTA", "CTA", "Call to Action", "行动号召"], kind: "string", maximum: 500 },
  { key: "keywords", aliases: ["关键词 SEO Keywords", "SEO Keywords", "Keywords", "关键词"], kind: "string", maximum: 1_000 },
  { key: "hashtags", aliases: ["话题标签 Hashtags", "Hashtags", "话题标签"], kind: "string", maximum: 1_000 },
  { key: "ideaNotes", aliases: ["创意备注 Idea Notes", "Idea Notes", "创意备注"], kind: "string", maximum: 5_000 },
  { key: "shootDate", aliases: ["拍摄日期 Shoot Date", "Shoot Date", "拍摄日期"], kind: "date" },
  { key: "footageStatus", aliases: ["素材状态 Footage Status", "Footage Status", "素材状态"], kind: "string", maximum: 50 },
  { key: "filmingNotes", aliases: ["拍摄需求 Filming Notes", "Filming Notes", "拍摄需求"], kind: "string", maximum: 2_000 },
  { key: "funnel", aliases: ["漏斗阶段 Funnel", "Funnel", "漏斗阶段"], kind: "string", maximum: 80 },
  { key: "featured", aliases: ["出镜 Featured", "Featured", "出镜"], kind: "string", maximum: 200 },
  { key: "pillar", aliases: ["内容支柱分类 Pillar Category", "内容支柱 Pillar", "Content Pillar", "Pillar", "内容支柱"], kind: "string", maximum: 100 },
  { key: "audience", aliases: ["受众分类 Audience Segment", "受众 Audience", "Audience", "Target Audience", "目标人群"], kind: "string", maximum: 200 },
  { key: "objective", aliases: ["目标 Objective", "目标类型 Objective Type", "Objective", "目标"], kind: "string", maximum: 200 },
  { key: "approvalStatus", aliases: ["审核状态 Approval Status", "Approval Status", "Review Status", "审批状态"], kind: "string", maximum: 50 },
  { key: "needsFounderReview", aliases: ["需创始人审批 Needs Founder OK", "Needs Founder OK?", "Needs Founder Review", "需要创始人审核"], kind: "boolean" },
  { key: "notes", aliases: ["学习/下一步 Learnings", "Notes", "备注"], kind: "string", maximum: 5_000 },
];

const LEAD_SPECS: readonly InputFieldSpec[] = [
  { key: "name", aliases: ["线索 Lead", "Lead", "Lead / Contact", "Name", "Contact Name", "潜客姓名"], kind: "string", required: true, primary: true, maximum: 150 },
  { key: "source", aliases: ["来源 Source", "Source", "Lead Source", "来源"], kind: "string", maximum: 100 },
  { key: "platform", aliases: ["平台 Platform", "Platform", "平台"], kind: "string", maximum: 50 },
  { key: "contact", aliases: ["微信/联系 Contact", "Contact", "Contact Details", "联系方式"], kind: "string", required: true, maximum: 500 },
  { key: "stage", aliases: ["阶段 Stage", "Stage", "Status", "阶段"], kind: "string", maximum: 50 },
  { key: "nextFollowUp", aliases: ["Next Follow-up", "Next Follow Up", "下次跟进"], kind: "date" },
  { key: "consultationDate", aliases: ["Consultation Date", "咨询日期"], kind: "date" },
  { key: "consultationOutcome", aliases: ["Consultation Outcome", "咨询结果"], kind: "string", maximum: 1_000 },
  { key: "amountCollected", aliases: ["Amount Collected", "Collected Revenue", "实收金额"], kind: "number" },
  { key: "conversionDate", aliases: ["Conversion Date", "转化日期"], kind: "date" },
  { key: "lostReason", aliases: ["Lost Reason", "流失原因"], kind: "string", maximum: 1_000 },
  { key: "productInterest", aliases: ["意向产品 Interest", "Product Interest", "Interest", "意向产品"], kind: "string", maximum: 500 },
  { key: "nextAction", aliases: ["下一步 Next Action", "Next Action", "Next Step", "下一步"], kind: "string", maximum: 1_000 },
  { key: "notes", aliases: ["备注 Notes (无健康信息 no health data)", "Notes (no health data)", "Notes", "备注（禁止健康数据）"], kind: "string", maximum: 3_000 },
];

const IDEA_SPECS: readonly InputFieldSpec[] = [
  { key: "idea", aliases: ["想法 Idea", "Idea", "想法"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "detail", aliases: ["说明 Detail", "Detail", "说明"], kind: "string", maximum: 4_000 },
  { key: "category", aliases: ["类别 Category", "Category", "类别"], kind: "string", maximum: 40 },
  { key: "status", aliases: ["状态 Status", "Status", "状态"], kind: "string", maximum: 40 },
  { key: "attachments", aliases: ["附件 Attachments", "Attachments", "附件"], kind: "string", maximum: 4_000 },
];

// Attachment values are links produced by the shared-assets uploader. Store
// them newline-separated; reject anything that isn't an http(s) URL so a
// crafted payload can't push script or file:// links into the Base.
const normalizeAttachmentList = (value: unknown): string => {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(/\n+/);
  const links = raw
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => /^https?:\/\//i.test(entry))
    .slice(0, 10);
  return links.join("\n");
};

const IDEA_CATEGORIES: Record<string, string> = {
  "产品 product": "产品 Product",
  product: "产品 Product",
  "内容 content": "内容 Content",
  content: "内容 Content",
  "增长 growth": "增长 Growth",
  growth: "增长 Growth",
  "运营 ops": "运营 Ops",
  ops: "运营 Ops",
  "其他 other": "其他 Other",
  other: "其他 Other",
};

const IDEA_STATUSES: Record<string, string> = {
  "新 new": "新 New",
  new: "新 New",
  "讨论中 discussing": "讨论中 Discussing",
  discussing: "讨论中 Discussing",
  "采纳 adopted": "采纳 Adopted",
  adopted: "采纳 Adopted",
  "搁置 parked": "搁置 Parked",
  parked: "搁置 Parked",
};

const PARTNER_SPECS: readonly InputFieldSpec[] = [
  { key: "name", aliases: ["伙伴 Partner", "Partner", "Name", "KOL / Partner", "合作伙伴"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "type", aliases: ["Type", "Partner Type", "类型"], kind: "string", maximum: 80 },
  { key: "platform", aliases: ["Platform", "平台"], kind: "string", maximum: 50 },
  { key: "platformHandle", aliases: ["平台/账号 Platform & Handle"], kind: "string", maximum: 300 },
  { key: "profileUrl", aliases: ["Profile URL", "URL", "主页链接"], kind: "string", maximum: 1_000 },
  { key: "handle", aliases: ["Handle", "Account", "账号"], kind: "string", maximum: 200 },
  { key: "stage", aliases: ["阶段 Stage", "Stage", "Status", "阶段"], kind: "string", maximum: 50 },
  { key: "audienceFit", aliases: ["受众匹配 Audience Fit", "Audience Fit", "受众匹配"], kind: "string", maximum: 1_000 },
  { key: "source", aliases: ["来源 Source", "Source", "来源"], kind: "string", maximum: 100 },
  { key: "lastContact", aliases: ["Last Contact", "最近联系"], kind: "date" },
  { key: "nextFollowUp", aliases: ["下次跟进 Next Follow-up", "Next Follow-up", "Next Follow Up", "下次跟进"], kind: "date" },
  { key: "commercialModel", aliases: ["Commercial Model", "Paid / Barter / Affiliate", "合作模式"], kind: "string", maximum: 100 },
  { key: "proposedCollaboration", aliases: ["交付物与期限 Deliverables", "Proposed Collaboration", "Collaboration Idea", "拟议合作"], kind: "string", maximum: 2_000 },
  { key: "budget", aliases: ["Approved Budget", "Budget", "预算"], kind: "number" },
  { key: "dueDate", aliases: ["Due Date", "截止日期"], kind: "date" },
  { key: "notes", aliases: ["Notes", "备注"], kind: "string", maximum: 5_000 },
];

const CAMPAIGN_SPECS: readonly InputFieldSpec[] = [
  { key: "name", aliases: ["活动 Campaign", "Campaign", "Campaign Name", "Name", "活动名称"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "status", aliases: FIELD.status, kind: "string", maximum: 50 },
  { key: "objective", aliases: ["目标 Objective", "Objective", "目标"], kind: "string", required: true, maximum: 500 },
  { key: "audience", aliases: ["目标受众 Target Audience", "Target Audience", "Audience", "目标人群"], kind: "strings", maximum: 500 },
  { key: "offer", aliases: ["核心卖点 Offer", "Offer", "Value Proposition", "活动方案"], kind: "string", maximum: 2_000 },
  { key: "product", aliases: ["产品 Product"], kind: "string", required: true, maximum: 100 },
  { key: "channels", aliases: ["渠道 Channels"], kind: "strings", required: true, maximum: 300 },
  { key: "startDate", aliases: ["开始 Start", "Start Date", "开始日期"], kind: "date", required: true },
  { key: "endDate", aliases: ["结束 End", "End Date", "结束日期"], kind: "date", required: true },
  { key: "budget", aliases: ["预算 Budget", "Budget", "预算"], kind: "number", required: true, minimum: 0, maximum: 10_000_000 },
  { key: "reach", aliases: ["Reach", "触达"], kind: "number" },
  { key: "impressions", aliases: ["Impressions", "曝光"], kind: "number" },
  { key: "clicks", aliases: ["Clicks", "点击"], kind: "number" },
  { key: "consultations", aliases: ["Consultations", "咨询数"], kind: "number" },
  { key: "revenue", aliases: ["回款 Revenue", "Revenue", "Attributed Revenue", "归因收入"], kind: "number" },
  { key: "brief", aliases: ["活动简报 Brief", "Brief", "活动简报"], kind: "string", maximum: 10_000 },
  { key: "keyMessage", aliases: ["核心信息 Key Message", "Key Message", "核心信息"], kind: "string", maximum: 1_000 },
  { key: "audienceInsight", aliases: ["人群洞察 Audience Insight", "Audience Insight", "人群洞察"], kind: "string", maximum: 3_000 },
  { key: "successCriteria", aliases: ["成功标准 Success Criteria", "Success Criteria", "成功标准"], kind: "string", required: true, maximum: 1_000 },
  { key: "nextDecision", aliases: ["Next Decision", "Next Step", "下一决策"], kind: "string", maximum: 1_000 },
  { key: "revenueTarget", aliases: ["目标回款 Revenue Target", "Revenue Target", "目标回款"], kind: "number", required: true, minimum: 0, maximum: 1_000_000_000 },
  { key: "campaignCode", aliases: ["活动代码 Campaign Code", "Campaign Code", "活动代码"], kind: "string", maximum: 80 },
  { key: "staffAttributionCode", aliases: ["员工归因代码 Staff Attribution Code", "Staff Attribution Code", "员工归因代码"], kind: "string", maximum: 80 },
  { key: "trackingKit", aliases: ["跟踪包 Tracking Kit", "Tracking Kit", "跟踪包"], kind: "string", maximum: 20_000 },
  { key: "submittedAt", aliases: ["提交时间 Submitted At", "Submitted At", "提交时间"], kind: "date" },
  { key: "approver", aliases: ["审批人 Approver", "Approver", "审批人"], kind: "string", maximum: 200 },
  { key: "approvedAt", aliases: ["批准时间 Approved At", "Approved At", "批准时间"], kind: "date" },
  { key: "reviewNote", aliases: ["审核意见 Review Note", "Review Note", "审核意见"], kind: "string", maximum: 3_000 },
  { key: "attributionSharePercent", aliases: ["员工归因比例% Attribution Share", "Attribution Share %", "员工归因比例"], kind: "number", minimum: 0, maximum: 100 },
  { key: "commissionRatePercent", aliases: ["批准提成比例% Commission Rate", "Commission Rate %", "批准提成比例"], kind: "number", minimum: 0, maximum: 100 },
  { key: "commissionType", aliases: ["提成类型 Commission Type", "Commission Type", "提成类型"], kind: "string", maximum: 50 },
  { key: "commissionRule", aliases: ["提成规则快照 Commission Rule", "Commission Rule", "提成规则快照"], kind: "string", maximum: 2_000 },
  { key: "ratePercentAboveThreshold", aliases: ["超出区间提成比例% Rate Above Threshold", "Rate Above Threshold %", "超出区间提成比例"], kind: "number", minimum: 0, maximum: 100 },
  { key: "thresholdAmount", aliases: ["提成加速阈值 Threshold Amount", "Threshold Amount", "提成加速阈值"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "flatFeeAmount", aliases: ["固定费用金额 Flat Fee Amount", "Flat Fee Amount", "固定费用金额"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "originatorName", aliases: ["方案提出人 Originator", "Originator", "方案提出人"], kind: "string", maximum: 200 },
  { key: "managerName", aliases: ["活动负责人 Manager", "Manager", "活动负责人"], kind: "string", maximum: 200 },
  { key: "closerName", aliases: ["成交人 Closer", "Closer", "成交人"], kind: "string", maximum: 200 },
  { key: "manualRevenue", aliases: ["线下申报回款 Reported Offline Revenue", "Reported Offline Revenue", "线下申报回款"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "reportedDiscounts", aliases: ["申报折扣 Reported Discounts", "Reported Discounts", "申报折扣"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "reportedRefunds", aliases: ["申报退款 Reported Refunds", "Reported Refunds", "申报退款"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "reportedChargebacks", aliases: ["申报拒付 Reported Chargebacks", "Reported Chargebacks", "申报拒付"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "reportedVat", aliases: ["申报增值税 Reported VAT", "Reported VAT", "申报增值税"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "adjustments", aliases: ["退款与调整 Refunds & Adjustments", "Refunds & Adjustments", "退款与调整"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "netCollectedRevenue", aliases: ["净回款 Net Collected Revenue", "Net Collected Revenue", "净回款"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "eligibleRevenue", aliases: ["核准归因回款 Eligible Revenue", "Eligible Revenue", "核准归因回款"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "commissionAmount", aliases: ["活动提成金额 Campaign Commission", "Campaign Commission", "活动提成金额"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "resultsSummary", aliases: ["结果总结 Results Summary", "Results Summary", "结果总结"], kind: "string", maximum: 10_000 },
  { key: "evidenceLinks", aliases: ["证据链接 Evidence Links", "Evidence Links", "证据链接"], kind: "string", maximum: 10_000 },
  { key: "resultsSubmittedAt", aliases: ["结果提交时间 Results Submitted At", "Results Submitted At", "结果提交时间"], kind: "date" },
  { key: "reconciledAt", aliases: ["核对时间 Reconciled At", "Reconciled At", "核对时间"], kind: "date" },
  { key: "reconciliationNote", aliases: ["核对说明 Reconciliation Note", "Reconciliation Note", "核对说明"], kind: "string", maximum: 5_000 },
  { key: "notes", aliases: ["Notes", "备注"], kind: "string", maximum: 5_000 },
];

const EXPERIMENT_SPECS: readonly InputFieldSpec[] = [
  { key: "name", aliases: ["实验 Experiment", "Experiment", "Experiment Name", "Name", "实验名称"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "hypothesis", aliases: ["假设 Hypothesis", "Hypothesis", "假设"], kind: "string", required: true, maximum: 2_000 },
  { key: "variable", aliases: ["变量 Variable"], kind: "string", required: true, maximum: 500 },
  { key: "channel", aliases: ["渠道 Channel"], kind: "strings", maximum: 300 },
  { key: "metric", aliases: ["成功指标 Success Metric", "Primary Metric", "Metric", "核心指标"], kind: "string", required: true, maximum: 200 },
  { key: "baseline", aliases: ["基线 Baseline", "Baseline", "基线"], kind: "number", required: true, minimum: 0, maximum: 1_000_000_000 },
  { key: "target", aliases: ["目标 Target", "Target", "目标值"], kind: "number", required: true, minimum: 0, maximum: 1_000_000_000 },
  { key: "startDate", aliases: ["开始 Start", "Start Date", "开始日期"], kind: "date", required: true },
  { key: "endDate", aliases: ["结束 End", "End Date", "结束日期"], kind: "date", required: true },
  { key: "status", aliases: FIELD.status, kind: "string", maximum: 50 },
  { key: "result", aliases: ["Result", "结果"], kind: "string", maximum: 2_000 },
  { key: "decision", aliases: ["Decision", "Decision / Next Step", "结论 / 下一步"], kind: "string", maximum: 2_000 },
  { key: "notes", aliases: ["Notes", "备注"], kind: "string", maximum: 5_000 },
];

const WEEKLY_SPECS: readonly InputFieldSpec[] = [
  { key: "reportingWeek", aliases: ["报告 Report", "Reporting Week", "Week", "报告周"], kind: "string", required: true, primary: true, maximum: 100 },
  { key: "wins", aliases: ["A 完成事项 Completed", "A. Wins", "A — Wins", "A. 本周成果"], kind: "string", required: true, maximum: 5_000 },
  { key: "metrics", aliases: ["B 主要成果 Results", "B. Metrics", "B — Metrics", "B. 核心数据"], kind: "string", required: true, maximum: 5_000 },
  { key: "blockers", aliases: ["C 问题 Problems", "C. Problems", "D. Blockers", "D — Blockers", "D. 阻碍"], kind: "string", maximum: 5_000 },
  { key: "learning", aliases: ["D 学习 Learnings", "C. Learning", "C — Learning", "C. 学习与洞察"], kind: "string", required: true, maximum: 5_000 },
  { key: "decisionsNeeded", aliases: ["E 需要决策 Decisions Needed", "F. Founder Decisions Needed", "F — Decisions Needed", "F. 需要创始人决策"], kind: "string", maximum: 5_000 },
  { key: "nextWeek", aliases: ["F 下周优先级 Next Priorities", "E. Next Week", "E — Next Week", "E. 下周计划"], kind: "string", required: true, maximum: 5_000 },
  { key: "status", aliases: FIELD.status, kind: "string", maximum: 50 },
];

const METRICS_SPECS: readonly InputFieldSpec[] = [
  { key: "period", aliases: ["记录 Record", "Reporting Period", "Week", "Period", "统计周期"], kind: "string", required: true, primary: true, maximum: 100 },
  { key: "platform", aliases: ["平台 Platform", "Platform", "平台"], kind: "string", required: true, maximum: 50 },
  { key: "followersStart", aliases: ["期初粉丝 Start Followers", "Followers Start", "Opening Followers", "期初粉丝"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "followersEnd", aliases: ["期末粉丝 End Followers", "Followers End", "Closing Followers", "期末粉丝"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "posts", aliases: ["发布数 Posts"], kind: "number", minimum: 0, maximum: 1_000_000 },
  { key: "views", aliases: ["总播放/曝光 Views", "Views", "播放"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "engagement", aliases: ["互动 Engagement"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "profileVisits", aliases: ["主页访问 Profile Visits", "Profile Visits", "主页访问"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "clicks", aliases: ["点击 Clicks", "Clicks", "点击"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "leads", aliases: ["线索 Leads", "Leads", "潜客"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "consultations", aliases: ["Consultations", "咨询"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "purchases", aliases: ["Attributed Purchases", "Purchases", "归因购买"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "revenue", aliases: ["归因收入 Revenue", "Revenue", "Attributed Revenue", "归因收入"], kind: "number", minimum: 0, maximum: 1_000_000_000 },
  { key: "bestContent", aliases: ["最佳内容与原因 Best Content & Why", "Best Content", "最佳内容"], kind: "string", maximum: 1_000 },
  { key: "worstContent", aliases: ["最弱内容与原因 Weakest Content & Why", "Worst Content", "待改进内容"], kind: "string", maximum: 1_000 },
  { key: "learning", aliases: ["学习 Learning", "Learning", "Key Learning", "关键洞察"], kind: "string", maximum: 2_000 },
];

const EXPENSE_SPECS: readonly InputFieldSpec[] = [
  { key: "title", aliases: ["事项 Item", "Expense", "Title", "Expense Title", "费用名称"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "expenseDate", aliases: ["日期 Date", "Expense Date", "Date", "费用日期"], kind: "date", required: true },
  { key: "category", aliases: ["类别 Category", "Category", "费用类别"], kind: "string", required: true, maximum: 100 },
  { key: "amount", aliases: ["金额 Amount", "Amount", "金额"], kind: "number", required: true, minimum: 0.01, maximum: 10_000_000 },
  { key: "currency", aliases: ["币种 Currency", "Currency", "币种"], kind: "string", maximum: 10 },
  { key: "businessPurpose", aliases: ["业务目的 Business Purpose", "Business Purpose", "Purpose", "业务用途"], kind: "string", required: true, maximum: 2_000 },
  { key: "preapproved", aliases: ["事先审批 Pre-approved", "Pre-approved?", "Pre-approved", "已预批准"], kind: "boolean", required: true },
  { key: "vendor", aliases: ["供应商 Vendor", "Vendor", "Merchant", "商户"], kind: "string", maximum: 300 },
  { key: "receiptUrl", aliases: ["票据链接 Receipt URL", "Receipt URL", "Receipt Link", "票据链接"], kind: "string", required: true, maximum: 1_000 },
  { key: "relatedProject", aliases: ["关联项目 Related Project", "Related Project", "Project", "关联项目"], kind: "string", maximum: 300 },
  { key: "priorApprovalReference", aliases: ["事前审批参考 Pre-approval Ref", "Prior Approval Reference", "Approval Reference", "预批准凭证"], kind: "string", maximum: 500 },
  { key: "receiptNote", aliases: ["票据说明 Receipt Note", "备注 Notes", "Receipt Note", "Receipt Details", "票据说明"], kind: "string", maximum: 1_000 },
  { key: "notes", aliases: ["备注 Notes", "Notes", "备注"], kind: "string", maximum: 3_000 },
  { key: "status", aliases: FIELD.status, kind: "string", maximum: 50 },
];

const GOAL_SPECS: readonly InputFieldSpec[] = [
  { key: "title", aliases: ["目标 Goal", "Goal", "目标"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "goalType", aliases: ["类型 Type", "Type", "类型"], kind: "string", required: true, maximum: 50 },
  { key: "measure", aliases: ["衡量标准 Measure", "Measure", "衡量标准"], kind: "string", maximum: 1_000 },
  { key: "priority", aliases: ["优先级 Priority", "Priority", "优先级"], kind: "string", maximum: 50 },
  { key: "due", aliases: ["截止 Due", "Due", "截止"], kind: "date" },
  { key: "notes", aliases: ["备注 Notes", "Notes", "备注"], kind: "string", maximum: 3_000 },
  { key: "status", aliases: FIELD.status, kind: "string", maximum: 50 },
];

// choice() keys are normalize()d input → stored option value.
const GOAL_TYPE_OPTIONS: Record<string, string> = {
  quarterly: "季度目标 Quarterly",
  "季度目标 quarterly": "季度目标 Quarterly",
  monthly: "月度目标 Monthly",
  "月度目标 monthly": "月度目标 Monthly",
  "founder idea": "创始人想法 Founder Idea",
  idea: "创始人想法 Founder Idea",
  "创始人想法 founder idea": "创始人想法 Founder Idea",
};

const GOAL_PRIORITY_OPTIONS: Record<string, string> = {
  high: "高 High",
  "高 high": "高 High",
  medium: "中 Medium",
  "中 medium": "中 Medium",
  low: "低 Low",
  "低 low": "低 Low",
};

const REQUEST_SPECS: readonly InputFieldSpec[] = [
  { key: "title", aliases: ["请求 Request", "Request", "Title", "Request Title", "申请标题"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "requestType", aliases: ["类别 Category", "Request Type", "Type", "申请类型"], kind: "string", required: true, maximum: 100 },
  { key: "details", aliases: ["备注 Notes", "Details", "Description", "申请详情"], kind: "string", required: true, maximum: 5_000 },
  { key: "priority", aliases: ["优先级 Priority", "Priority", "优先级"], kind: "string", maximum: 50 },
  { key: "neededBy", aliases: ["截止 Due", "Needed By", "Due Date", "需要日期"], kind: "date" },
  { key: "status", aliases: FIELD.status, kind: "string", maximum: 50 },
];

const SUPPORT_SPECS: readonly InputFieldSpec[] = [
  { key: "title", aliases: ["问题编号/标题 Issue ID / Title", "Issue", "Issue Title", "Title", "问题标题"], kind: "string", required: true, primary: true, maximum: 200 },
  { key: "category", aliases: ["问题类型 Issue Type", "Category", "Issue Type", "问题类型"], kind: "string", required: true, maximum: 100 },
  { key: "description", aliases: ["问题描述 Description", "Description", "Details", "问题描述"], kind: "string", required: true, maximum: 5_000 },
  { key: "severity", aliases: ["严重级别 Severity", "Severity", "Priority", "严重程度"], kind: "string", maximum: 50 },
  { key: "area", aliases: ["功能模块 Feature", "Product Area", "Area", "产品模块"], kind: "string", maximum: 100 },
  { key: "device", aliases: ["设备/系统 Device / OS", "Device", "设备"], kind: "string", maximum: 200 },
  { key: "appVersion", aliases: ["App Version", "Version", "应用版本"], kind: "string", maximum: 100 },
  { key: "steps", aliases: ["复现步骤 Repro Steps", "Steps to Reproduce", "Reproduction Steps", "复现步骤"], kind: "string", maximum: 5_000 },
  { key: "expected", aliases: ["Expected Result", "期望结果"], kind: "string", maximum: 2_000 },
  { key: "affectedCount", aliases: ["受影响数量 Affected Count"], kind: "number", minimum: 0, maximum: 1_000_000 },
  { key: "workaround", aliases: ["临时方案 Workaround"], kind: "string", maximum: 2_000 },
  { key: "status", aliases: FIELD.status, kind: "string", maximum: 50 },
];

const STATUS_BY_RESOURCE: Partial<
  Record<CompanyOpsResource, Readonly<Record<string, string>>>
> = {
  content: {
    Idea: "想法 Idea",
    Research: "调研 Research",
    Script: "脚本 Script",
    "Ready to Film": "待拍摄 Ready to Film",
    Filmed: "已拍摄 Filmed",
    Editing: "剪辑中 Editing",
    Review: "待审核 Review",
    Approved: "已批准 Approved",
    Scheduled: "已排期 Scheduled",
    Published: "已发布 Published",
    Analyzed: "已复盘 Analyzed",
    Archived: "存档 Archived",
  },
  lead: {
    New: "新 New",
    Contacted: "已联系 Contacted",
    Qualified: "已确认意向 Qualified",
    "Consultation Booked": "已约咨询 Consult Booked",
    Consulted: "咨询完成 Consult Done",
    Deciding: "待决定 Deciding",
    Won: "成交 Won",
    Lost: "流失 Lost",
    Nurture: "培育 Nurture",
  },
  partner: {
    Research: "调研 Research",
    Priority: "优先 Priority",
    Contacted: "已联系 Contacted",
    Replied: "已回复 Replied",
    Negotiating: "洽谈中 Negotiating",
    Approved: "已批准 Approved",
    Active: "合作中 Active",
    Completed: "已完成 Completed",
    "Long-term": "长期伙伴 Long-term",
    "Not Fit": "不合适 Not Fit",
  },
  campaign: {
    Planning: "计划中 Planning",
    "Pending Approval": "待批准 Pending Approval",
    "Changes Requested": "需修改 Changes Requested",
    Approved: "已批准 Approved",
    Active: "进行中 Active",
    Completed: "已完成 Completed",
    Reconciliation: "待核对 Reconciliation",
    Reconciled: "已核对 Reconciled",
    Rejected: "已拒绝 Rejected",
    Cancelled: "已取消 Cancelled",
    Ended: "已完成 Completed",
    Reviewed: "已核对 Reconciled",
  },
  goal: {
    New: "新想法 New",
    Active: "进行中 Active",
    Done: "已完成 Done",
    Parked: "搁置 Parked",
  },
  article: {
    Draft: "草稿 Draft",
    Published: "已发布 Published",
    Archived: "已归档 Archived",
  },
  experiment: {
    Idea: "想法 Idea",
    "Pending Approval": "待批准 Pending Approval",
    Running: "运行中 Running",
    Analyzing: "分析中 Analyzing",
    Completed: "已完成 Completed",
    Cancelled: "已取消 Cancelled",
  },
  weeklyReport: {
    Submitted: "已提交 Submitted",
    Reviewed: "创始人已阅 Reviewed",
    Archived: "已归档 Archived",
  },
  expense: {
    Pending: "待审批 Pending",
    Approved: "已批准 Approved",
    Reimbursed: "已打款 Reimbursed",
    Rejected: "已拒绝 Rejected",
  },
  payroll: { Pending: "待发 Pending", Paid: "已发 Paid" },
  commission: {
    "To Review": "待审核 To Review",
    Confirmed: "已确认 Confirmed",
    Paid: "已支付 Paid",
  },
  performance: {
    "Goals Set": "目标已确认 Goals Set",
    "Report Submitted": "报告已提交 Report Submitted",
    "Changes Requested": "需补充 Changes Requested",
    Scoring: "评分中 Scoring",
    "Employee Review": "员工确认中 Employee Review",
    Confirmed: "已确认 Confirmed",
    Paid: "已随工资支付 Paid",
  },
  internalRequest: {
    Open: "待处理 Open",
    "In Progress": "进行中 Doing",
    Done: "完成 Done",
    Rejected: "拒绝 Declined",
  },
  onboarding: {
    Todo: "未开始 Todo",
    "In Progress": "进行中 Doing",
    Blocked: "受阻 Blocked",
    Review: "待复核 Review",
    Done: "已完成 Done",
    "N/A": "不适用 N/A",
  },
  support: {
    New: "新建 New",
    Triage: "待确认 Triage",
    "In Progress": "处理中 In Progress",
    "Ready to Verify": "待验证 Ready to Verify",
    Resolved: "已解决 Resolved",
    Closed: "已关闭 Closed",
    "Won't Fix": "不处理 Won't Fix",
  },
};

const decodeStatus = (
  resource: CompanyOpsResource,
  value: unknown
): string | undefined => {
  const raw = textValue(value);
  if (!raw) return undefined;
  const entries = Object.entries(STATUS_BY_RESOURCE[resource] || {});
  return entries.find(
    ([canonical, stored]) =>
      normalize(canonical) === normalize(raw) || normalize(stored) === normalize(raw)
  )?.[0] || raw;
};

const encodeStatus = (resource: CompanyOpsResource, value: unknown): string => {
  const decoded = decodeStatus(resource, value);
  const stored = decoded && STATUS_BY_RESOURCE[resource]?.[decoded];
  if (!stored) throw new CompanyOpsHttpError(400, "That status is not valid for this record");
  return stored;
};

const isTerminalWorkStatus = (status: string | undefined): boolean =>
  new Set([
    "Done",
    "N/A",
    "Completed",
    "Archived",
    "Analyzed",
    "Reviewed",
    "Resolved",
    "Closed",
    "Won",
    "Lost",
    "Not Fit",
    "Cancelled",
  ]).has(status || "");

const STATUS_RESOURCES_BY_ROLE: Record<CompanyOpsRole, ReadonlySet<CompanyOpsResource>> = {
  founder: new Set(
    (Object.keys(STATUS_BY_RESOURCE) as CompanyOpsResource[]).filter(
      (resource) => resource !== "performance"
    )
  ),
  finance: new Set(["expense", "payroll", "commission", "internalRequest", "support"]),
  growth: new Set(["content", "lead", "partner", "experiment", "weeklyReport", "internalRequest", "support"]),
  staff: new Set(["internalRequest", "onboarding", "support"]),
  pending: new Set(),
};

const objectInput = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CompanyOpsHttpError(400, "Action payload must be an object");
  }
  return value as Record<string, unknown>;
};

const textValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return textValue(item.text ?? item.name ?? item.value ?? item.id);
  }
  return "";
};

const numberValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const dateValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1_000 : value;
  }
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const boolValue = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
  }
  return undefined;
};

const normalize = (value: string): string =>
  value.trim().toLocaleLowerCase().replace(/[\s_&/·-]+/g, " ");

const fieldByAlias = (
  fields: readonly FeishuField[],
  aliases: readonly string[],
  primary = false
): FeishuField | undefined => {
  const names = new Set(aliases.map(normalize));
  return fields.find((field) => names.has(normalize(field.field_name))) ||
    (primary ? fields.find((field) => field.is_primary) : undefined);
};

const requiredField = (
  target: ResolvedTarget,
  aliases: readonly string[],
  allowedTypes?: readonly number[],
  primary = false
): FeishuField => {
  const result = fieldByAlias(target.fields, aliases, primary);
  if (!result || (allowedTypes && !allowedTypes.includes(result.type))) {
    throw new CompanyOpsConfigurationError(
      `The ${target.resource} table is missing required field ${aliases[0]}`
    );
  }
  return result;
};

const recordField = (fields: FeishuFields, aliases: readonly string[]): unknown => {
  const names = new Set(aliases.map(normalize));
  const entry = Object.entries(fields).find(([name]) => names.has(normalize(name)));
  return entry?.[1];
};

const stringListValue = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean);
  const text = textValue(value);
  return text
    ? text.split(/[,，\n]+/).map((item) => item.trim()).filter(Boolean)
    : [];
};

const stableOpaqueCode = (prefix: string, value: string, length = 8): string =>
  `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, length).toUpperCase()}`;

const campaignMonthCode = (timestamp = Date.now()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "00";
  return `${year}${month}`;
};

const campaignSource = (channel: string): string => {
  const value = normalize(channel);
  if (/xiaohongshu|xhs|小红书/.test(value)) return "xiaohongshu";
  if (/douyin|抖音/.test(value)) return "douyin";
  if (/official account|公众号/.test(value)) return "wechat-oa";
  if (/channels|视频号/.test(value)) return "wechat-channels";
  if (/website|网站/.test(value)) return "website";
  if (/offline|线下/.test(value)) return "offline";
  if (/kol/.test(value)) return "kol";
  return "other";
};

const campaignLandingPath = (product: string): string => {
  try {
    const kind = campaignCommissionRule({ product }).product;
    if (kind === "digital") return "/store";
    if (kind === "team") return "/business";
    return "/coaching";
  } catch {
    return "/";
  }
};

const campaignTrackingLinks = (input: {
  campaignCode: string;
  staffAttributionCode: string;
  channels: readonly string[];
  product: string;
}): CompanyOpsCampaignTrackingLink[] =>
  input.channels.map((channel, index) => {
    const source = campaignSource(channel);
    const attributionCode = `${input.campaignCode}-${source.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${index + 1}`;
    const url = new URL(campaignLandingPath(input.product), "https://trainnolimit.cn");
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", source === "offline" ? "offline-campaign" : "campaign");
    url.searchParams.set("utm_campaign", input.campaignCode);
    url.searchParams.set("staff", input.staffAttributionCode);
    url.searchParams.set("attribution", attributionCode);
    return { channel, source, attributionCode, url: url.toString() };
  });

const parseTrackingKit = (value: unknown): CompanyOpsCampaignTrackingLink[] => {
  const text = textValue(value);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const row = item as Record<string, unknown>;
      const channel = textValue(row.channel);
      const source = textValue(row.source);
      const attributionCode = textValue(row.attributionCode);
      const url = textValue(row.url);
      if (!channel || !source || !attributionCode || !/^https:\/\//.test(url)) return [];
      return [{ channel, source, attributionCode, url }];
    });
  } catch {
    return [];
  }
};

const idsFromValue = (value: unknown): string[] => {
  const results: string[] = [];
  const visit = (item: unknown): void => {
    if (typeof item === "string") {
      for (const match of item.matchAll(/ou_[A-Za-z0-9_-]+/g)) results.push(match[0]);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (item && typeof item === "object") {
      const object = item as Record<string, unknown>;
      visit(object.id ?? object.open_id ?? object.openId ?? object.value);
    }
  };
  visit(value);
  return [...new Set(results)];
};

const linkedRecordIds = (value: unknown): string[] => {
  const results: string[] = [];
  const visit = (item: unknown): void => {
    if (typeof item === "string") {
      for (const match of item.matchAll(/rec[A-Za-z0-9_-]+/g)) results.push(match[0]);
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (item && typeof item === "object") {
      const object = item as Record<string, unknown>;
      visit(
        object.record_id ??
          object.recordId ??
          object.record_ids ??
          object.linked_record_ids ??
          object.value
      );
    }
  };
  visit(value);
  return [...new Set(results)];
};

const normalizeRole = (value: unknown): CompanyOpsRole => {
  const role = normalize(textValue(value));
  if (/finance|account|payroll|财务|会计|薪酬/.test(role)) return "finance";
  if (/growth|content|brand|marketing|social|增长|内容|品牌|市场|运营/.test(role)) return "growth";
  return "staff";
};

const isActiveStaff = (record: FeishuRecord): boolean => {
  const status = normalize(textValue(recordField(record.fields, ["状态 Status", "Status", "Employment Status", "状态", "在职状态"])));
  return /^(在职 active|试用期 probation|active|probation)$/.test(status);
};

const validRecordId = (value: unknown): string => {
  const recordId = textValue(value);
  if (!/^[A-Za-z0-9_-]{3,128}$/.test(recordId)) {
    throw new CompanyOpsHttpError(400, "Invalid record identifier");
  }
  return recordId;
};

const isoDate = (value: unknown): string | undefined => {
  const timestamp = dateValue(value);
  if (!timestamp) return undefined;
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return undefined;
  }
};

const shanghaiDateKey = (timestamp: number): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));

const monthKey = (value: unknown, fieldName = "month"): string => {
  const raw = textValue(value);
  if (/^(?:20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(raw)) return raw;
  const timestamp = dateValue(value);
  if (timestamp !== undefined) return shanghaiDateKey(timestamp).slice(0, 7);
  throw new CompanyOpsHttpError(400, `${fieldName} must use YYYY-MM`);
};

const storedMonthValue = (month: string, field: FeishuField): string | number => {
  if (field.type !== 5) return month;
  const [year, monthNumber] = month.split("-").map(Number);
  return Date.UTC(year, monthNumber - 1, 1);
};

const rounded = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const boundedText = (
  value: unknown,
  fieldName: string,
  maximum: number,
  required = false
): string => {
  const result = textValue(value);
  if (required && !result) throw new CompanyOpsHttpError(400, `${fieldName} is required`);
  if (result.length > maximum) {
    throw new CompanyOpsHttpError(400, `${fieldName} is too long`);
  }
  return result;
};

const selectionValues = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(selectionValues);
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return selectionValues(item.name ?? item.text ?? item.value);
  }
  return [];
};

const ONBOARDING_ROLES = [
  "品牌增长 Brand & Growth",
  "教练 Coach",
  "运营 Operations",
  "行政 Admin",
  "其他 Other",
] as const;

type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

const onboardingRole = (value: unknown): OnboardingRole => {
  const role = normalize(textValue(value));
  if (/^(品牌增长 brand growth|brand growth|growth|品牌增长)$/.test(role)) {
    return "品牌增长 Brand & Growth";
  }
  if (/^(教练 coach|coach|coaching|教练)$/.test(role)) return "教练 Coach";
  if (/^(运营 operations|operations|operation|ops|运营)$/.test(role)) {
    return "运营 Operations";
  }
  if (/^(行政 admin|admin|administration|finance|行政)$/.test(role)) {
    return "行政 Admin";
  }
  if (/^(其他 other|other|其他)$/.test(role)) return "其他 Other";
  throw new CompanyOpsHttpError(
    400,
    `role must be one of: ${ONBOARDING_ROLES.join(", ")}`
  );
};

const ONBOARDING_CATEGORIES = new Set([
  "合同 Contract",
  "保密资料 Confidential",
  "制度 Policies",
  "账号 Accounts",
  "设备 Equipment",
  "培训 Training",
  "绩效 Performance",
  "行政 Admin",
]);

const ONBOARDING_OWNER_ROLES = new Set([
  "新员工 New Hire",
  "创始人 Founder",
  "行政 Admin",
  "直属负责人 Manager",
  "共同 Joint",
]);

const healthDataPattern = /diagnos|medical history|injur|disease|medication|病史|诊断|伤病|疾病|用药/i;

// Client/athlete health data must never land in company-ops records — the
// coaching app is its only home. Applied to every free-text create action,
// not just leads (the data-minimization rule is per-shape, not per-table).
const sharedTargetCache = new Map<
  string,
  { promise: Promise<ResolvedTarget>; expiresAt: number }
>();
const TARGET_CACHE_TTL_MS = 10 * 60_000;

const assertNoHealthData = (payload: Record<string, unknown>): void => {
  if (
    Object.values(payload).some((value) => healthDataPattern.test(textValue(value)))
  ) {
    throw new CompanyOpsHttpError(
      400,
      "Do not put health or medical information in company operations records"
    );
  }
};

// Article blocks arrive as JSON from the block editor. Validate the shape and
// strip unknown keys so arbitrary payloads can't be smuggled into the Base.
// Deliberately NOT health-data guarded: marketing articles legitimately write
// about training around injury; that guard protects client records, not prose.
const ARTICLE_BLOCK_TYPES = new Set(["heading", "text", "image", "video", "quote", "divider"]);
const normalizeArticleBlocks = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  if (raw.length > 300_000) {
    throw new CompanyOpsHttpError(400, "The article is too large to save");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CompanyOpsHttpError(400, "blocks must be valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length > 300) {
    throw new CompanyOpsHttpError(400, "blocks must be a list of at most 300 blocks");
  }
  const cleaned = parsed.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new CompanyOpsHttpError(400, "each block must be an object");
    }
    const block = entry as Record<string, unknown>;
    const type = typeof block.type === "string" ? block.type : "";
    if (!ARTICLE_BLOCK_TYPES.has(type)) {
      throw new CompanyOpsHttpError(400, `Unsupported block type: ${type || "(none)"}`);
    }
    const keep: Record<string, string> = { type };
    for (const key of ["text", "url", "caption", "alt", "level"] as const) {
      const item = block[key];
      if (typeof item === "string" && item) keep[key] = item.slice(0, 30_000);
    }
    return keep;
  });
  return JSON.stringify(cleaned);
};

const choice = (
  value: unknown,
  field: string,
  options: Record<string, string>,
  { optional = false }: { optional?: boolean } = {}
): string | undefined => {
  const raw = textValue(value);
  if (!raw && optional) return undefined;
  const selected = options[normalize(raw)];
  if (!selected) {
    throw new CompanyOpsHttpError(400, `${field} is not a supported option`);
  }
  return selected;
};

const PLATFORM_OPTIONS: Record<string, string> = {
  xiaohongshu: "小红书 XHS",
  xhs: "小红书 XHS",
  "小红书 xhs": "小红书 XHS",
  douyin: "抖音 Douyin",
  "抖音 douyin": "抖音 Douyin",
  "wechat official account": "公众号 WeChat OA",
  "wechat oa": "公众号 WeChat OA",
  wechat: "公众号 WeChat OA",
  "公众号 wechat oa": "公众号 WeChat OA",
  channels: "视频号 Channels",
  "wechat channels": "视频号 Channels",
  "视频号 channels": "视频号 Channels",
  website: "网站 Website",
  "网站 website": "网站 Website",
  "multi-platform": "多平台 Multi",
  multi: "多平台 Multi",
  "多平台 multi": "多平台 Multi",
};

const CAMPAIGN_PRODUCT_OPTIONS: Record<string, string> = {
  digital: "数字计划 Digital",
  "digital program": "数字计划 Digital",
  "digital training program": "数字计划 Digital",
  "数字计划 digital": "数字计划 Digital",
  "online coaching": "线上1:1 Online Coaching",
  "online 1:1 coaching": "线上1:1 Online Coaching",
  "线上1:1 online coaching": "线上1:1 Online Coaching",
  "in-person": "线下训练 In-person",
  "in-person coaching": "线下训练 In-person",
  "线下训练 in-person": "线下训练 In-person",
  team: "团队/机构 Team",
  institution: "团队/机构 Team",
  "team institution": "团队/机构 Team",
  "团队/机构 team": "团队/机构 Team",
  presentation: "演讲/分享 Presentation",
  "演讲/分享 presentation": "演讲/分享 Presentation",
  workshop: "工作坊 Workshop",
  "工作坊 workshop": "工作坊 Workshop",
  "small camp": "短期训练营 Small Camp",
  "small training camp": "短期训练营 Small Camp",
  "短期训练营 small camp": "短期训练营 Small Camp",
  "training camp": "训练营 Training Camp",
  "训练营 training camp": "训练营 Training Camp",
  brand: "品牌 Brand",
  "品牌 brand": "品牌 Brand",
};

const CHANNEL_OPTIONS: Record<string, string> = {
  ...PLATFORM_OPTIONS,
  offline: "线下 Offline",
  "线下 offline": "线下 Offline",
  kol: "KOL",
  other: "其他 Other",
  "其他 other": "其他 Other",
};

const SUPPORT_TYPE_OPTIONS: Record<string, string> = {
  bug: "故障 Bug",
  playback: "故障 Bug",
  "故障 bug": "故障 Bug",
  data: "数据问题 Data",
  "data issue": "数据问题 Data",
  access: "账号/权限 Access",
  account: "账号/权限 Access",
  performance: "性能 Performance",
  ux: "易用性 UX",
  usability: "易用性 UX",
  "feature request": "功能建议 Feature Request",
  feature: "功能建议 Feature Request",
  other: "其他 Other",
};

const SUPPORT_SEVERITY_OPTIONS: Record<string, string> = {
  p0: "P0 紧急 Critical",
  "p0 紧急 critical": "P0 紧急 Critical",
  p1: "P1 高 High",
  "p1 高 high": "P1 高 High",
  p2: "P2 中 Medium",
  "p2 中 medium": "P2 中 Medium",
  p3: "P3 低 Low",
  "p3 低 low": "P3 低 Low",
};

const EXPENSE_CATEGORY_OPTIONS: Record<string, string> = {
  transport: "交通 Transport",
  travel: "交通 Transport",
  "交通 transport": "交通 Transport",
  meals: "餐饮 Meals",
  meal: "餐饮 Meals",
  "餐饮 meals": "餐饮 Meals",
  equipment: "设备 Equipment",
  "设备 equipment": "设备 Equipment",
  marketing: "营销投放 Marketing",
  "marketing spend": "营销投放 Marketing",
  "营销投放 marketing": "营销投放 Marketing",
  venue: "场地 Venue",
  "场地 venue": "场地 Venue",
  software: "软件订阅 Software",
  "software subscription": "软件订阅 Software",
  "软件订阅 software": "软件订阅 Software",
  other: "其他 Other",
  "其他 other": "其他 Other",
};

const LEAD_SOURCE_OPTIONS: Record<string, string> = {
  ...PLATFORM_OPTIONS,
  referral: "转介绍 Referral",
  "转介绍 referral": "转介绍 Referral",
  partner: "KOL/伙伴 Partner",
  kol: "KOL/伙伴 Partner",
  "kol/伙伴 partner": "KOL/伙伴 Partner",
  offline: "线下 Offline",
  "线下 offline": "线下 Offline",
  organic: "自然流量 Organic",
  "自然流量 organic": "自然流量 Organic",
  other: "其他 Other",
  "其他 other": "其他 Other",
};

const PRODUCT_INTEREST_OPTIONS: Record<string, string> = {
  digital: "数字计划 Digital",
  "digital program": "数字计划 Digital",
  "数字计划 digital": "数字计划 Digital",
  "online coaching": "线上1:1 Online Coaching",
  "online 1:1 coaching": "线上1:1 Online Coaching",
  "线上1:1 online coaching": "线上1:1 Online Coaching",
  "in-person": "线下个训 In-person",
  "in-person coaching": "线下个训 In-person",
  "线下个训 in-person": "线下个训 In-person",
  team: "团队/机构 Team",
  institution: "团队/机构 Team",
  "团队/机构 team": "团队/机构 Team",
  unsure: "未定 Unsure",
  "未定 unsure": "未定 Unsure",
};

const AUDIENCE_OPTIONS: Record<string, string> = {
  climbers: "攀岩者 Climbers",
  "攀岩者 climbers": "攀岩者 Climbers",
  "youth parents": "青少年家长 Youth Parents",
  parents: "青少年家长 Youth Parents",
  "青少年家长 youth parents": "青少年家长 Youth Parents",
  "general fitness": "大众健身 General Fitness",
  "大众健身 general fitness": "大众健身 General Fitness",
  coaches: "教练 Coaches",
  "教练 coaches": "教练 Coaches",
  institutions: "机构/团队 Institutions",
  teams: "机构/团队 Institutions",
  "机构/团队 institutions": "机构/团队 Institutions",
  "existing clients": "现有客户 Existing Clients",
  clients: "现有客户 Existing Clients",
  "现有客户 existing clients": "现有客户 Existing Clients",
};

const CONTENT_PILLAR_OPTIONS: Record<string, string> = {
  education: "专业教育 Education",
  "professional education": "专业教育 Education",
  "专业教育 education": "专业教育 Education",
  founder: "创始人/品牌 Founder & Brand",
  brand: "创始人/品牌 Founder & Brand",
  "founder & brand": "创始人/品牌 Founder & Brand",
  "创始人/品牌 founder & brand": "创始人/品牌 Founder & Brand",
  community: "客户/社群 Client & Community",
  client: "客户/社群 Client & Community",
  "client & community": "客户/社群 Client & Community",
  "客户/社群 client & community": "客户/社群 Client & Community",
  product: "产品/服务 Product & Offer",
  offer: "产品/服务 Product & Offer",
  "product & offer": "产品/服务 Product & Offer",
  "产品/服务 product & offer": "产品/服务 Product & Offer",
  partner: "伙伴/KOL Partner & KOL",
  kol: "伙伴/KOL Partner & KOL",
  "partner & kol": "伙伴/KOL Partner & KOL",
  "伙伴/kol partner & kol": "伙伴/KOL Partner & KOL",
  campaign: "活动 Campaign",
  "活动 campaign": "活动 Campaign",
};

const CONTENT_OBJECTIVE_OPTIONS: Record<string, string> = {
  reach: "触达 Reach",
  "触达 reach": "触达 Reach",
  educate: "教育 Educate",
  education: "教育 Educate",
  "教育 educate": "教育 Educate",
  engage: "互动 Engage",
  engagement: "互动 Engage",
  "互动 engage": "互动 Engage",
  leads: "获取线索 Generate Leads",
  "generate leads": "获取线索 Generate Leads",
  "获取线索 generate leads": "获取线索 Generate Leads",
  convert: "转化 Convert",
  conversion: "转化 Convert",
  "转化 convert": "转化 Convert",
  retain: "留存 Retain",
  retention: "留存 Retain",
  "留存 retain": "留存 Retain",
};

const PARTNER_FIT_OPTIONS: Record<string, string> = {
  high: "高 High",
  "高 high": "高 High",
  medium: "中 Medium",
  "中 medium": "中 Medium",
  low: "低 Low",
  "低 low": "低 Low",
  tbd: "待评估 TBD",
  unknown: "待评估 TBD",
  "待评估 tbd": "待评估 TBD",
};

// Feishu-user column on the staff register — the one place a staff
// member's open_id lives (same aliases resolvePrincipal matches on).
const STAFF_FEISHU_USER_ALIASES = [
  "飞书用户 Feishu User",
  "Feishu Open ID",
  "Feishu OpenID",
  "飞书 Open ID",
  "飞书OpenID",
] as const;

const OPS_APP_URL = "https://trainnolimit.cn/company-ops";

export class CompanyOpsRepository {
  private readonly config: CompanyOpsConfig;
  private readonly client: FeishuClient;
  private readonly targetCache = new Map<CompanyOpsResource, Promise<ResolvedTarget>>();
  private appAdminCache?: {
    expiresAt: number;
    openIds: ReadonlySet<string>;
    userIds: ReadonlySet<string>;
  };

  constructor(config: CompanyOpsConfig, client = new FeishuClient(config)) {
    this.config = config;
    this.client = client;
  }

  private target(resource: CompanyOpsResource): Promise<ResolvedTarget> {
    const cached = this.targetCache.get(resource);
    if (cached) return cached;
    // Cross-request cache: the handler builds a fresh repository per request,
    // so without this every dashboard re-resolves ~15 tables' ids + field
    // schemas against Feishu (measured +3-9s per request). Table schemas
    // change rarely; 10 minutes staleness is fine. Off under vitest so
    // mock-client tests keep per-instance resolution.
    const shareable = !process.env.VITEST;
    const appToken = baseTokenFor(this.config, resource) || "";
    const sharedKey = `${appToken}:${resource}`;
    if (shareable) {
      const shared = sharedTargetCache.get(sharedKey);
      if (shared && shared.expiresAt > Date.now()) {
        this.targetCache.set(resource, shared.promise);
        return shared.promise;
      }
    }
    const promise = this.resolveTarget(resource).catch((error) => {
      this.targetCache.delete(resource);
      sharedTargetCache.delete(sharedKey);
      throw error;
    });
    this.targetCache.set(resource, promise);
    if (shareable) {
      sharedTargetCache.set(sharedKey, {
        promise,
        expiresAt: Date.now() + TARGET_CACHE_TTL_MS,
      });
    }
    return promise;
  }

  private async resolveTarget(resource: CompanyOpsResource): Promise<ResolvedTarget> {
    const appToken = baseTokenFor(this.config, resource);
    if (!appToken) {
      throw new CompanyOpsConfigurationError(
        `The ${this.config.tables[resource].base} Company Operations Base is not configured`
      );
    }
    let tableId = this.config.tables[resource].id || "";
    if (!tableId) {
      const names = new Set(this.config.tables[resource].names.map(normalize));
      const tables = await this.client.listTables(appToken);
      tableId = tables.find((table) => names.has(normalize(table.name)))?.table_id || "";
    }
    if (!tableId) {
      throw new CompanyOpsConfigurationError(
        `The ${resource} table is not configured in Company Operations`
      );
    }
    return {
      resource,
      appToken,
      tableId,
      fields: await this.client.listFields(appToken, tableId),
    };
  }

  private async appAdminIds(): Promise<{
    openIds: ReadonlySet<string>;
    userIds: ReadonlySet<string>;
  }> {
    if (!this.config.appAdminsAreFounders) {
      return { openIds: new Set(), userIds: new Set() };
    }
    if (this.appAdminCache && this.appAdminCache.expiresAt > Date.now()) {
      return this.appAdminCache;
    }
    try {
      const ids = await this.client.listApplicationAdminIds();
      this.appAdminCache = {
        expiresAt: Date.now() + 5 * 60_000,
        openIds: ids.openIds,
        userIds: ids.userIds,
      };
      return ids;
    } catch {
      return { openIds: new Set(), userIds: new Set() };
    }
  }

  // ---- Feishu DM pings ----------------------------------------------------
  // A submission or comment nobody sees is a silent drop, so the people who
  // must act on it get a bot DM. STRICTLY best-effort: callers fire-and-forget
  // (void this.ping...), every failure is swallowed — the app may lack the
  // im:message scope, a recipient may sit outside its availability range —
  // and a ping can never block or fail the write it announces.
  private async sendPings(
    recipients: Iterable<string>,
    actorOpenId: string,
    message: string
  ): Promise<void> {
    try {
      const unique = [...new Set(recipients)]
        .filter((id) => id && id.startsWith("ou_") && id !== actorOpenId)
        .slice(0, 10);
      await Promise.all(
        unique.map((id) =>
          this.client
            .sendTextMessage(id, `${message}\n${OPS_APP_URL}`)
            .catch((error) => {
              console.warn(
                "[companyOps] ping failed:",
                error instanceof Error ? error.message : error
              );
            })
        )
      );
    } catch (error) {
      console.warn(
        "[companyOps] ping batch failed:",
        error instanceof Error ? error.message : error
      );
    }
  }

  // Everyone on the team except whoever did the thing. Used for posts that
  // are genuinely company-wide — a new company goal, a new idea — so a
  // founder's post reaches staff and not only the other founder.
  private async pingTeam(
    principal: CompanyOpsPrincipal,
    message: string
  ): Promise<void> {
    try {
      const admins = await this.appAdminIds();
      const staff = await this.activeStaffOpenIds().catch(() => [] as string[]);
      await this.sendPings(
        [...this.config.founderOpenIds, ...admins.openIds, ...staff],
        principal.openId,
        message
      );
    } catch {
      /* best-effort */
    }
  }

  private async pingFounders(
    principal: CompanyOpsPrincipal,
    message: string
  ): Promise<void> {
    try {
      const admins = await this.appAdminIds();
      await this.sendPings(
        [...this.config.founderOpenIds, ...admins.openIds],
        principal.openId,
        message
      );
    } catch {
      /* best-effort */
    }
  }

  private async staffOpenIdsFromRecordIds(
    staffRecordIds: readonly string[]
  ): Promise<string[]> {
    const target = await this.target("staff");
    const ids: string[] = [];
    for (const staffRecordId of staffRecordIds.slice(0, 5)) {
      try {
        const record = await this.client.getRecord(
          target.appToken,
          target.tableId,
          staffRecordId
        );
        ids.push(
          ...idsFromValue(
            recordField(record.fields, STAFF_FEISHU_USER_ALIASES)
          ).filter((id) => id.startsWith("ou_"))
        );
      } catch {
        /* skip unresolvable rows */
      }
    }
    return ids;
  }

  private async pingStaffRecord(
    staffRecordId: string,
    principal: CompanyOpsPrincipal,
    message: string
  ): Promise<void> {
    try {
      const ids = await this.staffOpenIdsFromRecordIds([staffRecordId]);
      await this.sendPings(ids, principal.openId, message);
    } catch {
      /* best-effort */
    }
  }

  private async activeStaffOpenIds(): Promise<string[]> {
    const target = await this.target("staff");
    const records = await this.client.listRecords(target.appToken, target.tableId, {
      maxRecords: 500,
    });
    return records
      .filter(isActiveStaff)
      .flatMap((record) =>
        idsFromValue(recordField(record.fields, STAFF_FEISHU_USER_ALIASES))
      )
      .filter((id) => id.startsWith("ou_"));
  }

  // Founder commented on a goal/thread: the reply's audience is the goal's
  // stored owner ids plus every active staff member (threads don't store
  // participant ids, and at this team size staff are the non-founder party).
  private async pingGoalAudience(
    ownerIds: readonly string[],
    principal: CompanyOpsPrincipal,
    message: string
  ): Promise<void> {
    try {
      const staff = await this.activeStaffOpenIds().catch(() => [] as string[]);
      await this.sendPings([...ownerIds, ...staff], principal.openId, message);
    } catch {
      /* best-effort */
    }
  }

  // Resolve the employee behind a performance cycle row and DM them.
  // The employee column may hold person values (ou_...) or a link to the
  // staff register (rec...); handle both.
  private async pingPerformanceEmployee(
    performanceId: string,
    principal: CompanyOpsPrincipal,
    message: string
  ): Promise<void> {
    try {
      const target = await this.target("performance");
      const record = await this.client.getRecord(
        target.appToken,
        target.tableId,
        performanceId
      );
      const raw = idsFromValue(recordField(record.fields, FIELD.submittedBy));
      const direct = raw.filter((id) => id.startsWith("ou_"));
      const linked = raw.filter((id) => id.startsWith("rec"));
      const resolved = linked.length
        ? await this.staffOpenIdsFromRecordIds(linked)
        : [];
      await this.sendPings([...direct, ...resolved], principal.openId, message);
    } catch {
      /* best-effort */
    }
  }

  private projectIdea(record: FeishuRecord, principal: CompanyOpsPrincipal): CompanyOpsIdeaItem {
    const f = record.fields;
    const voters = textValue(recordField(f, ["支持者 Voters"]))
      .split(/[,\s]+/)
      .filter(Boolean);
    return {
      id: record.record_id,
      idea: textValue(recordField(f, ["想法 Idea", "Idea"])),
      detail: textValue(recordField(f, ["说明 Detail", "Detail"])) || undefined,
      category: textValue(recordField(f, ["类别 Category", "Category"])) || undefined,
      status: textValue(recordField(f, ["状态 Status", "Status"])) || "新 New",
      raisedBy: textValue(recordField(f, ["提出人 Raised By"])) || undefined,
      raisedByOpenId: textValue(recordField(f, ["提出人 Open ID"])) || undefined,
      votes: voters.length,
      hasVoted: voters.includes(principal.openId),
      thread: textValue(recordField(f, ["讨论 Thread"])),
      attachments: textValue(recordField(f, ["附件 Attachments"]))
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
      createdAt: isoDate(recordField(f, ["创建时间 Created"])),
    };
  }

  private async ideaRecord(recordId: string) {
    const target = await this.target("idea");
    const record = await this.client.getRecord(target.appToken, target.tableId, recordId);
    return { target, record };
  }

  // Same append-only convention as goal threads so both read identically in
  // the UI and in the Base: "[yyyy-mm-dd hh:mm Name] text" per line.
  private appendThreadEntry(existing: string, principal: CompanyOpsPrincipal, text: string): string {
    const stamp = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
    const entry = `[${stamp} ${principal.name}] ${text}`;
    const combined = existing.trim() ? `${existing.trim()}\n${entry}` : entry;
    if (combined.length > 12_000) {
      throw new CompanyOpsHttpError(400, "This discussion is full — summarise it into a new idea");
    }
    return combined;
  }

  async resolvePrincipal(
    identity: FeishuOAuthUser | CompanyOpsSession | CompanyOpsPrincipal
  ): Promise<CompanyOpsPrincipal> {
    const base: CompanyOpsPrincipal = {
      openId: identity.openId,
      userId: identity.userId,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
      tenantKey: identity.tenantKey,
      role: "pending",
    };
    const appAdmins = await this.appAdminIds();
    const trustedFounder =
      this.config.founderOpenIds.has(identity.openId) ||
      appAdmins.openIds.has(identity.openId) ||
      Boolean(identity.userId && appAdmins.userIds.has(identity.userId));

    let records: FeishuRecord[];
    try {
      const target = await this.target("staff");
      records = await this.client.listRecords(target.appToken, target.tableId, {
        maxRecords: 500,
      });
    } catch (error) {
      if (error instanceof CompanyOpsConfigurationError) {
        return trustedFounder ? { ...base, role: "founder" } : base;
      }
      throw error;
    }
    const staffMatches = records.filter((record) =>
      idsFromValue(
        recordField(record.fields, [
          "飞书用户 Feishu User",
          "Feishu Open ID",
          "Feishu OpenID",
          "飞书 Open ID",
          "飞书OpenID",
        ])
      ).includes(identity.openId)
    );
    const staff = staffMatches.length === 1 ? staffMatches[0] : undefined;
    if (!staff || !isActiveStaff(staff)) {
      return trustedFounder ? { ...base, role: "founder" } : base;
    }
    return {
      ...base,
      name: textValue(recordField(staff.fields, ["姓名 Name", "Name", "Employee", "姓名"])) || base.name,
      role: trustedFounder
        ? "founder"
        : normalizeRole(recordField(staff.fields, ["应用角色 App Role", "职位 Role", "App Role", "Role", "角色", "岗位"])),
      staffRecordId: staff.record_id,
    };
  }

  private serializeInput(
    value: unknown,
    spec: InputFieldSpec,
    field: FeishuField
  ): unknown {
    if (spec.kind === "string") {
      const result = textValue(value);
      if (result.length > (spec.maximum || 20_000)) {
        throw new CompanyOpsHttpError(400, `${spec.key} is too long`);
      }
      if (field.type === 15) {
        let parsed: URL;
        try {
          parsed = new URL(result);
        } catch {
          throw new CompanyOpsHttpError(400, `${spec.key} must be a valid link`);
        }
        if (parsed.protocol !== "https:") {
          throw new CompanyOpsHttpError(400, `${spec.key} must use HTTPS`);
        }
        return { link: parsed.toString(), text: parsed.toString() };
      }
      return result;
    }
    if (spec.kind === "number") {
      const result = numberValue(value);
      if (result === undefined) throw new CompanyOpsHttpError(400, `${spec.key} must be a number`);
      if (spec.minimum !== undefined && result < spec.minimum) {
        throw new CompanyOpsHttpError(400, `${spec.key} must be at least ${spec.minimum}`);
      }
      if (spec.maximum !== undefined && result > spec.maximum) {
        throw new CompanyOpsHttpError(400, `${spec.key} must be at most ${spec.maximum}`);
      }
      return result;
    }
    if (spec.kind === "boolean") {
      const result = boolValue(value);
      if (result === undefined) throw new CompanyOpsHttpError(400, `${spec.key} must be yes or no`);
      return result;
    }
    if (spec.kind === "date") {
      const result = dateValue(value);
      if (result === undefined) throw new CompanyOpsHttpError(400, `${spec.key} must be a valid date`);
      return result;
    }
    const values = Array.isArray(value)
      ? value.map(textValue).filter(Boolean)
      : textValue(value).split(",").map((item) => item.trim()).filter(Boolean);
    return field.type === 4 ? values : values.join(", ");
  }

  private mappedFields(
    inputValue: unknown,
    specs: readonly InputFieldSpec[],
    target: ResolvedTarget,
    principal: CompanyOpsPrincipal,
    defaults: Record<string, unknown> = {},
    allowedExtraKeys: readonly string[] = []
  ): FeishuFields {
    const input = objectInput(inputValue);
    const allowed = new Set([...specs.map((spec) => spec.key), ...allowedExtraKeys]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) {
      throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    }
    // Server defaults are authoritative workflow state. A crafted client must
    // never promote its own expense, request, campaign or content record.
    const values = { ...input, ...defaults };
    const result: FeishuFields = {};
    for (const spec of specs) {
      const value = values[spec.key];
      const empty = value === undefined || value === null || value === "";
      if (empty) {
        if (spec.required) throw new CompanyOpsHttpError(400, `${spec.key} is required`);
        continue;
      }
      const field = fieldByAlias(target.fields, spec.aliases, spec.primary);
      if (!field) {
        if (spec.primary || spec.required) {
          throw new CompanyOpsConfigurationError(
            `The ${target.resource} table is missing the required ${spec.key} field`
          );
        }
        continue;
      }
      result[field.field_name] = this.serializeInput(value, spec, field);
    }
    this.addActorFields(result, target.fields, principal);
    return result;
  }

  private addActorFields(
    output: FeishuFields,
    fields: readonly FeishuField[],
    principal: CompanyOpsPrincipal
  ): void {
    const openIdField = fieldByAlias(fields, FIELD.createdByOpenId);
    if (openIdField) output[openIdField.field_name] = principal.openId;
    const personField = fieldByAlias(fields, FIELD.submittedBy);
    if (personField) {
      if (personField.type === 11) {
        output[personField.field_name] = [{ id: principal.openId }];
      } else if (personField.type === 18 && principal.staffRecordId) {
        output[personField.field_name] = [principal.staffRecordId];
      } else if (personField.type === 1) {
        output[personField.field_name] = principal.name;
      }
    }
    const submittedAt = fieldByAlias(fields, ["Submitted At", "Created At", "提交时间"]);
    if (submittedAt && submittedAt.type < 1_000) {
      output[submittedAt.field_name] = Date.now();
    }
  }

  private async createMapped(
    resource: CompanyOpsResource,
    payload: unknown,
    specs: readonly InputFieldSpec[],
    principal: CompanyOpsPrincipal,
    defaults: Record<string, unknown> = {},
    allowedExtraKeys: readonly string[] = []
  ): Promise<FeishuRecord> {
    const target = await this.target(resource);
    const fields = this.mappedFields(
      payload,
      specs,
      target,
      principal,
      defaults,
      allowedExtraKeys
    );
    return this.client.createRecord(target.appToken, target.tableId, fields);
  }

  // PATCH-style sibling of createMapped: only the keys actually present in
  // the payload are written, so an editor that collects five fields can't
  // blank the ten it never showed (named mistake #43). Reuses the same specs
  // as create, so column aliases and validation can never drift apart.
  private async updateMapped(
    resource: CompanyOpsResource,
    recordId: string,
    payload: unknown,
    specs: readonly InputFieldSpec[]
  ): Promise<void> {
    const target = await this.target(resource);
    const input = objectInput(payload);
    const allowed = new Set(specs.map((spec) => spec.key));
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) {
      throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    }
    const updates: FeishuFields = {};
    for (const spec of specs) {
      if (!(spec.key in input)) continue;
      const field = fieldByAlias(target.fields, spec.aliases, spec.primary);
      if (!field) continue;
      const value = input[spec.key];
      const empty = value === undefined || value === null || value === "";
      if (empty) {
        if (spec.required || spec.primary) {
          throw new CompanyOpsHttpError(400, `${spec.key} cannot be empty`);
        }
        // Feishu rejects "" on typed columns and fails the WHOLE record write
        // (named mistake #3), so only text fields can be cleared this way;
        // clearing a date/number means editing it in the Base.
        if (spec.kind === "string") updates[field.field_name] = "";
        continue;
      }
      updates[field.field_name] = this.serializeInput(value, spec, field);
    }
    if (!Object.keys(updates).length) {
      throw new CompanyOpsHttpError(400, "No changes provided");
    }
    await this.client.updateRecord(target.appToken, target.tableId, recordId, updates);
  }

  private async list(resource: CompanyOpsResource, maximum = 100): Promise<FeishuRecord[]> {
    const target = await this.target(resource);
    return this.client.listRecords(target.appToken, target.tableId, {
      maxRecords: maximum,
    });
  }

  // NEVER rejects. Two reasons, both learned the hard way:
  //
  //  1. The dashboard's prefetch block creates these promises EAGERLY and
  //     awaits several of them only under a role condition. A promise that
  //     rejects before anything awaits it is an unhandled rejection, which
  //     takes the whole Node process down — the server was crash-looping on
  //     exactly this.
  //  2. Feishu answers 1254607 ("data not ready") when it is throttling after
  //     a burst of reads, and the dashboard now reads ~17 tables at once. That
  //     is transient by definition (named mistake #9), so it earns one retry.
  //
  // A section that is briefly empty is enormously better than a dead server.
  private async listOptional(
    resource: CompanyOpsResource,
    maximum = 100
  ): Promise<FeishuRecord[]> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await this.list(resource, maximum);
      } catch (error) {
        if (error instanceof CompanyOpsConfigurationError) return [];
        const code = (error as { code?: number }).code;
        const transient = code === 1254607 || code === 99991400;
        if (transient && attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 1_500));
          continue;
        }
        console.warn("[companyOps] optional read failed", {
          resource,
          code,
          message: error instanceof Error ? error.message : String(error),
        });
        return [];
      }
    }
    return [];
  }

  private belongsTo(record: FeishuRecord, principal: CompanyOpsPrincipal): boolean {
    const aliases = [
      "提出人 Open ID",
      ...FIELD.createdByOpenId,
      ...FIELD.newHireOpenId,
      ...FIELD.submittedBy,
      "飞书账号 Feishu User",
      "Feishu Open ID",
    ];
    const ids = idsFromValue(recordField(record.fields, aliases));
    return ids.length > 0 && ids.includes(principal.openId);
  }

  private project(
    record: FeishuRecord,
    options: {
      resource?: CompanyOpsResource;
      title: readonly string[];
      status?: readonly string[];
      subtitle?: readonly string[];
      due?: readonly string[];
      owner?: readonly string[];
      platform?: readonly string[];
      amount?: readonly string[];
      currency?: readonly string[];
      priority?: readonly string[];
    }
  ): CompanyOpsDashboardItem {
    return {
      id: record.record_id,
      title: textValue(recordField(record.fields, options.title)) || "Untitled",
      status: options.status
        ? options.resource
          ? decodeStatus(options.resource, recordField(record.fields, options.status))
          : textValue(recordField(record.fields, options.status)) || undefined
        : undefined,
      subtitle: options.subtitle ? textValue(recordField(record.fields, options.subtitle)) || undefined : undefined,
      dueAt: options.due ? isoDate(recordField(record.fields, options.due)) : undefined,
      owner: options.owner ? textValue(recordField(record.fields, options.owner)) || undefined : undefined,
      platform: options.platform ? textValue(recordField(record.fields, options.platform)) || undefined : undefined,
      amount: options.amount ? numberValue(recordField(record.fields, options.amount)) : undefined,
      currency: options.currency ? textValue(recordField(record.fields, options.currency)) || undefined : undefined,
      priority: options.priority ? textValue(recordField(record.fields, options.priority)) || undefined : undefined,
    };
  }

  private projectCampaignWorkflow(
    record: FeishuRecord,
    principal: CompanyOpsPrincipal,
    tracked: { grossCollected: number; orderCount: number; currency: string } | undefined,
  ): CompanyOpsCampaign {
    const status = this.campaignStatus(record);
    const product = textValue(recordField(record.fields, ["产品 Product", "Product"])) || undefined;
    const channels = stringListValue(recordField(record.fields, ["渠道 Channels", "Channels"]));
    const campaignCode = textValue(recordField(record.fields, [
      "活动代码 Campaign Code", "Campaign Code",
    ])) || undefined;
    const staffAttributionCode = textValue(recordField(record.fields, [
      "员工归因代码 Staff Attribution Code", "Staff Attribution Code",
    ])) || undefined;
    let trackingLinks = parseTrackingKit(recordField(record.fields, [
      "跟踪包 Tracking Kit", "Tracking Kit",
    ]));
    if (!trackingLinks.length && campaignCode && staffAttributionCode && product) {
      trackingLinks = campaignTrackingLinks({
        campaignCode,
        staffAttributionCode,
        channels,
        product,
      });
    }
    const ownsCampaign = this.belongsTo(record, principal);
    return {
      id: record.record_id,
      name: textValue(recordField(record.fields, [
        "活动 Campaign", "Campaign", "Campaign Name", "Name",
      ])) || "Untitled campaign",
      status,
      objective: textValue(recordField(record.fields, ["目标 Objective", "Objective"])) || undefined,
      audience: stringListValue(recordField(record.fields, ["目标受众 Target Audience", "Target Audience"])),
      offer: textValue(recordField(record.fields, ["核心卖点 Offer", "Offer"])) || undefined,
      product,
      channels,
      budget: numberValue(recordField(record.fields, ["预算 Budget", "Budget"])),
      startAt: isoDate(recordField(record.fields, ["开始 Start", "Start Date"])),
      endAt: isoDate(recordField(record.fields, ["结束 End", "End Date"])),
      ownerName: textValue(recordField(record.fields, ["负责人 Owner", "Owner"])) || undefined,
      campaignCode,
      staffAttributionCode,
      trackingLinks,
      submittedAt: isoDate(recordField(record.fields, ["提交时间 Submitted At", "Submitted At"])),
      approverName: textValue(recordField(record.fields, ["审批人 Approver", "Approver"])) || undefined,
      approvedAt: isoDate(recordField(record.fields, ["批准时间 Approved At", "Approved At"])),
      reviewNote: textValue(recordField(record.fields, ["审核意见 Review Note", "Review Note"])) || undefined,
      revenueTarget: numberValue(recordField(record.fields, ["目标回款 Revenue Target", "Revenue Target"])),
      successCriteria: textValue(recordField(record.fields, ["成功标准 Success Criteria", "Success Criteria"])) || undefined,
      attributionSharePercent: numberValue(recordField(record.fields, ["员工归因比例% Attribution Share", "Attribution Share %"])),
      commissionRatePercent: numberValue(recordField(record.fields, ["批准提成比例% Commission Rate", "Commission Rate %"])),
      commissionType: (textValue(recordField(record.fields, ["提成类型 Commission Type", "Commission Type"])) as "rate" | "flat_fee") || undefined,
      commissionRule: textValue(recordField(record.fields, ["提成规则快照 Commission Rule", "Commission Rule"])) || undefined,
      ratePercentAboveThreshold: numberValue(recordField(record.fields, ["超出区间提成比例% Rate Above Threshold", "Rate Above Threshold %"])),
      thresholdAmount: numberValue(recordField(record.fields, ["提成加速阈值 Threshold Amount", "Threshold Amount"])),
      flatFeeAmount: numberValue(recordField(record.fields, ["固定费用金额 Flat Fee Amount", "Flat Fee Amount"])),
      originatorName: textValue(recordField(record.fields, ["方案提出人 Originator", "Originator"])) || undefined,
      managerName: textValue(recordField(record.fields, ["活动负责人 Manager", "Manager"])) || undefined,
      closerName: textValue(recordField(record.fields, ["成交人 Closer", "Closer"])) || undefined,
      trackedCollectedRevenue: tracked?.grossCollected || 0,
      trackedOrderCount: tracked?.orderCount || 0,
      currency: tracked?.currency || "CNY",
      reportedManualRevenue: numberValue(recordField(record.fields, ["线下申报回款 Reported Offline Revenue", "Reported Offline Revenue"])),
      reportedDiscounts: numberValue(recordField(record.fields, ["申报折扣 Reported Discounts", "Reported Discounts"])),
      reportedRefunds: numberValue(recordField(record.fields, ["申报退款 Reported Refunds", "Reported Refunds"])),
      reportedChargebacks: numberValue(recordField(record.fields, ["申报拒付 Reported Chargebacks", "Reported Chargebacks"])),
      reportedVat: numberValue(recordField(record.fields, ["申报增值税 Reported VAT", "Reported VAT"])),
      reportedAdjustments: numberValue(recordField(record.fields, ["退款与调整 Refunds & Adjustments", "Refunds & Adjustments"])),
      netCollectedRevenue: numberValue(recordField(record.fields, ["净回款 Net Collected Revenue", "Net Collected Revenue"])),
      eligibleRevenue: numberValue(recordField(record.fields, ["核准归因回款 Eligible Revenue", "Eligible Revenue"])),
      commissionAmount: numberValue(recordField(record.fields, ["活动提成金额 Campaign Commission", "Campaign Commission"])),
      resultsSummary: textValue(recordField(record.fields, ["结果总结 Results Summary", "Results Summary"])) || undefined,
      evidenceLinks: stringListValue(recordField(record.fields, ["证据链接 Evidence Links", "Evidence Links"])),
      resultsSubmittedAt: isoDate(recordField(record.fields, ["结果提交时间 Results Submitted At", "Results Submitted At"])),
      reconciledAt: isoDate(recordField(record.fields, ["核对时间 Reconciled At", "Reconciled At"])),
      reconciliationNote: textValue(recordField(record.fields, ["核对说明 Reconciliation Note", "Reconciliation Note"])) || undefined,
      reach: numberValue(recordField(record.fields, ["触达/曝光 Reach", "Reach"])),
      clicks: numberValue(recordField(record.fields, ["点击 Clicks", "Clicks"])),
      consultations: numberValue(recordField(record.fields, ["咨询 Consultations", "Consultations"])),
      canEdit: principal.role === "growth" && ownsCampaign && ["Planning", "Changes Requested"].includes(status),
      canReview: principal.role === "founder" && status === "Pending Approval",
      canActivate: (principal.role === "founder" || ownsCampaign) && status === "Approved",
      canSubmitResults: (principal.role === "founder" || ownsCampaign) && status === "Active",
      canReconcile: principal.role === "founder" && status === "Reconciliation",
    };
  }

  private projectPerformanceCycle(
    record: FeishuRecord,
    principal: CompanyOpsPrincipal,
    staffNames: ReadonlyMap<string, string>
  ): CompanyOpsPerformanceCycle | undefined {
    const staffIds = linkedRecordIds(
      recordField(record.fields, [CONFIDENTIAL_FIELD.employee, "Employee"])
    );
    if (staffIds.length !== 1) return undefined;
    let month: string;
    try {
      month = monthKey(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.month, "Month"])
      );
    } catch {
      return undefined;
    }
    const goals: CompanyOpsPerformanceGoal[] = [];
    for (const category of PERFORMANCE_CATEGORIES) {
      const { index } = category;
      const title = textValue(recordField(record.fields, [performanceGoalField(index)]));
      if (!title) continue;
      goals.push({
        index,
        title,
        measure: textValue(recordField(record.fields, [performanceMeasureField(index)])),
        weight: category.weight,
        result: textValue(recordField(record.fields, [performanceResultField(index)])) || undefined,
        score: numberValue(recordField(record.fields, [category.scoreField])),
      });
    }
    const status = decodeStatus(
      "performance",
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.status, "Status"])
    ) || "Goals Set";
    const scoredAtValue = dateValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.scoredAt])
    );
    const respondedAtValue = dateValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.employeeRespondedAt])
    );
    const evidenceText = textValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.evidenceLinks])
    );
    const selfLinked = Boolean(
      principal.staffRecordId && staffIds[0] === principal.staffRecordId
    );
    const employeeResponse = textValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.employeeResponse])
    );
    const payrollStagedAt = dateValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.payrollStagedAt])
    );
    return {
      id: record.record_id,
      month,
      employee: {
        staffRecordId: staffIds[0],
        name: staffNames.get(staffIds[0]) || (selfLinked ? principal.name : "Employee"),
      },
      managerName: textValue(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.manager])
      ) || undefined,
      status,
      goals,
      weightedScore: numberValue(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.total])
      ),
      approvedBonus: numberValue(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.bonus])
      ),
      personalFactor: numberValue(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.personalFactor])
      ),
      reportDue: isoDate(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.reportDue])
      ),
      prioritiesConfirmedAt: isoDate(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.prioritiesConfirmedAt])
      ),
      selfReview: textValue(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.selfReview])
      ) || undefined,
      evidenceLinks: evidenceText
        ? evidenceText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
        : undefined,
      context: textValue(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.context])
      ) || undefined,
      reportSubmittedAt: isoDate(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.reportSubmittedAt])
      ),
      founderReview: textValue(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.founderReview])
      ) || undefined,
      scoredAt: scoredAtValue === undefined ? undefined : new Date(scoredAtValue).toISOString(),
      employeeResponse: employeeResponse || undefined,
      employeeRespondedAt: respondedAtValue === undefined
        ? undefined
        : new Date(respondedAtValue).toISOString(),
      disputeStatus: textValue(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.disputeStatus])
      ) || undefined,
      finalizedAt: isoDate(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.finalizedAt])
      ),
      payrollStagedAt: payrollStagedAt === undefined
        ? undefined
        : new Date(payrollStagedAt).toISOString(),
      canSubmitReport: selfLinked && new Set(["Goals Set", "Changes Requested"]).has(status),
      canRespond:
        selfLinked &&
        status === "Employee Review" &&
        scoredAtValue !== undefined &&
        (respondedAtValue === undefined || respondedAtValue < scoredAtValue),
      canManage: principal.role === "founder",
      canFinalize:
        principal.role === "founder" &&
        new Set(["Employee Review", "Confirmed"]).has(status) &&
        scoredAtValue !== undefined &&
        respondedAtValue !== undefined &&
        respondedAtValue >= scoredAtValue &&
        employeeResponse.startsWith("[Accepted]") &&
        payrollStagedAt === undefined,
    };
  }

  private async getPerformanceDashboard(
    principal: CompanyOpsPrincipal
  ): Promise<NonNullable<CompanyOpsDashboard["performance"]>> {
    const [records, staffRecords] = await Promise.all([
      principal.role === "founder" || principal.staffRecordId
        ? this.listOptional("performance", 500)
        : Promise.resolve([]),
      principal.role === "founder"
        ? this.listOptional("staff", 500)
        : Promise.resolve([]),
    ]);
    const activeStaff = staffRecords.filter(isActiveStaff);
    const staffNames = new Map<string, string>();
    for (const record of activeStaff) {
      const name = textValue(
        recordField(record.fields, ["姓名 Name", "Name", "Employee", "姓名"])
      );
      if (name) staffNames.set(record.record_id, name);
    }
    if (principal.staffRecordId) staffNames.set(principal.staffRecordId, principal.name);
    const visible = principal.role === "founder"
      ? records
      : records.filter((record) => this.linkedToStaff(record, principal.staffRecordId || ""));
    const cycles = visible
      .map((record) => this.projectPerformanceCycle(record, principal, staffNames))
      .filter((cycle): cycle is CompanyOpsPerformanceCycle => Boolean(cycle))
      .sort((left, right) =>
        right.month.localeCompare(left.month) || left.employee.name.localeCompare(right.employee.name)
      );
    return {
      cycles,
      canManage: principal.role === "founder",
      staff: principal.role === "founder"
        ? activeStaff
            .map((record) => ({
              staffRecordId: record.record_id,
              name: staffNames.get(record.record_id) || "Employee",
              role: normalizeRole(
                recordField(record.fields, ["应用角色 App Role", "职位 Role", "App Role", "Role"])
              ),
            }))
            .sort((left, right) => left.name.localeCompare(right.name))
        : undefined,
    };
  }

  async getDashboard(principal: CompanyOpsPrincipal): Promise<CompanyOpsDashboard> {
    if (principal.role === "pending") {
      return {
        user: { name: principal.name, avatarUrl: principal.avatarUrl, role: "pending", accessPending: true },
        summary: {
          headline: "Your Company Operations access is waiting for approval",
          todayCount: 0,
          waitingCount: 1,
          overdueCount: 0,
        },
        workQueue: [],
        contentPipeline: [],
        leads: [],
        campaigns: [],
        partners: [],
        experiments: [],
        onboarding: [],
        approvals: [],
        supportIssues: [],
        links: {},
      };
    }

    const growthVisible = principal.role === "founder" || principal.role === "growth";
    const financeVisible = principal.role === "founder" || principal.role === "finance";
    const [contentRecords, leadRecords, campaignRecords, partnerRecords, experimentRecords, onboardingAll, supportAll, ideaRecords] = await Promise.all([
      growthVisible ? this.listOptional("content", 150) : Promise.resolve([]),
      growthVisible ? this.listOptional("lead", 100) : Promise.resolve([]),
      growthVisible ? this.listOptional("campaign", 100) : Promise.resolve([]),
      growthVisible ? this.listOptional("partner", 100) : Promise.resolve([]),
      growthVisible ? this.listOptional("experiment", 100) : Promise.resolve([]),
      this.listOptional("onboarding", 150),
      this.listOptional("support", 150),
      this.listOptional("idea", 200),
    ]);

    // Kick off every remaining table read NOW. These used to be awaited one
    // by one further down, which made the dashboard the SUM of ~7 sequential
    // Feishu round-trips (measured 13-23s). Guards mirror the use sites
    // exactly, so each started promise is always awaited (no floating
    // rejections for skipped sections).
    const prefetch = {
      expense: !financeVisible
        ? this.listOptional("expense", 100)
        : Promise.resolve<FeishuRecord[]>([]),
      weeklyReport: principal.role === "growth"
        ? this.listOptional("weeklyReport", 60)
        : Promise.resolve<FeishuRecord[]>([]),
      metrics: growthVisible
        ? this.listOptional("metrics", 80)
        : Promise.resolve<FeishuRecord[]>([]),
      article: growthVisible
        ? this.listOptional("article", 100)
        : Promise.resolve<FeishuRecord[]>([]),
      keyDate: principal.role === "founder"
        ? this.listOptional("keyDate", 200)
        : Promise.resolve<FeishuRecord[]>([]),
      goal: this.listOptional("goal", 100),
      onboardingCase: this.listOptional("onboardingCase", 100),
    };

    const onboardingRecords = principal.role === "founder"
      ? onboardingAll
      : onboardingAll.filter((record) => this.belongsTo(record, principal));
    const supportRecords = (principal.role === "founder"
      ? supportAll
      : supportAll.filter((record) => this.belongsTo(record, principal)))
      .filter((record) => !/(resolved|closed|已解决|已关闭)/.test(
        normalize(textValue(recordField(record.fields, FIELD.status)))
      ));
    const contentPipeline = contentRecords.map((record) => this.project(record, {
      resource: "content",
      title: ["内容 Content", "Title", "Content Title", "内容标题"],
      status: FIELD.status,
      due: ["发布日期 Publish Date", "草稿截止 Draft Due", "Publish Date", "Draft Due", "发布日期"],
      owner: ["负责人 Owner (Feishu)", "Owner", "Submitted By", "负责人"],
      platform: ["平台 Platform", "Platform", "平台"],
    }));
    const leads = leadRecords.map((record) => this.project(record, {
      resource: "lead",
      title: ["线索 Lead", "Lead", "Lead / Contact", "Name", "潜客姓名"],
      status: FIELD.status,
      subtitle: ["来源 Source", "Source", "Lead Source", "来源"],
      due: ["下次跟进 Next Date", "Next Follow-up", "Next Follow Up", "下次跟进"],
      owner: ["负责人（飞书） Owner (Feishu)", "Owner", "Submitted By", "负责人"],
      platform: ["平台 Platform", "Platform", "平台"],
    }));
    const campaigns = campaignRecords.map((record) => this.project(record, {
      resource: "campaign",
      title: ["活动 Campaign", "Campaign", "Campaign Name", "Name", "活动名称"],
      status: FIELD.status,
      subtitle: ["目标 Objective", "Objective", "目标"],
      due: ["结束 End", "下次决策/复盘 Next Review", "End Date", "Next Decision Date", "结束日期"],
      owner: ["负责人 Owner", "Owner", "负责人"],
      amount: ["预算 Budget"],
      currency: ["币种 Currency"],
    }));
    const campaignCodes = campaignRecords
      .map((record) => textValue(recordField(record.fields, [
        "活动代码 Campaign Code", "Campaign Code",
      ])))
      .filter(Boolean);
    const campaignRevenue = await this.campaignRevenues(campaignCodes);
    const campaignWorkflow = campaignRecords.map((record) => {
      const code = textValue(recordField(record.fields, [
        "活动代码 Campaign Code", "Campaign Code",
      ]));
      return this.projectCampaignWorkflow(record, principal, campaignRevenue.get(code));
    });
    const partners = partnerRecords.map((record) => this.project(record, {
      resource: "partner",
      title: ["伙伴 Partner", "Partner", "Name", "KOL / Partner", "合作伙伴"],
      status: ["Stage", "Status", "阶段"],
      subtitle: ["受众匹配 Audience Fit", "Audience Fit", "受众匹配"],
      due: ["下次跟进 Next Follow-up", "Next Follow-up", "Due Date", "下次跟进"],
      owner: ["负责人 Owner", "Owner", "负责人"],
      platform: ["平台/账号 Platform & Handle", "Platform", "平台"],
    }));
    const experiments = experimentRecords.map((record) => this.project(record, {
      resource: "experiment",
      title: ["实验 Experiment", "Experiment", "Experiment Name", "Name", "实验名称"],
      status: FIELD.status,
      subtitle: ["假设 Hypothesis", "Hypothesis", "假设"],
      due: ["结束 End", "End Date", "结束日期"],
      owner: ["负责人 Owner", "Owner", "负责人"],
    }));
    const onboarding = onboardingRecords.map((record) => this.project(record, {
      resource: "onboarding",
      title: ["任务 Task", "Task", "Onboarding Task", "入职任务"],
      status: FIELD.status,
      subtitle: ["类别 Category", "Category", "类别"],
      due: ["截止日期 Due", "Due Date", "截止日期"],
      owner: ["负责人 Assignee", "New Hire", "Owner", "新员工"],
    }));
    const supportIssues = supportRecords.map((record) => this.project(record, {
      resource: "support",
      title: ["问题编号/标题 Issue ID / Title", "Issue", "Issue Title", "Title", "问题标题"],
      status: FIELD.status,
      subtitle: ["问题描述 Description", "Description", "Details", "问题描述"],
      due: ["Target Date", "Due Date", "目标日期"],
      owner: ["报告人 Reporter", "Submitted By", "Reporter", "提交人"],
      priority: ["严重级别 Severity", "Severity", "Priority", "严重程度"],
    }));

    const workQueue = [...contentPipeline, ...leads, ...partners, ...experiments, ...onboarding, ...supportIssues]
      .filter((item) => !isTerminalWorkStatus(item.status))
      .sort((left, right) => (left.dueAt || "9999").localeCompare(right.dueAt || "9999"))
      .slice(0, 20);
    const now = Date.now();
    const overdueCount = workQueue.filter((item) => item.dueAt && Date.parse(item.dueAt) < now).length;

    const links: Record<string, string> = {};
    if (this.config.links.startHere) links.startHere = this.config.links.startHere;
    if (this.config.links.expensePolicy) links.expensePolicy = this.config.links.expensePolicy;
    if (this.config.links.commissionPolicy) links.commissionPolicy = this.config.links.commissionPolicy;
    if (this.config.links.onboardingGuide) links.onboardingGuide = this.config.links.onboardingGuide;
    if (this.config.links.confidentialForm) links.confidentialForm = this.config.links.confidentialForm;
    if (this.config.links.expenseForm) links.expense = this.config.links.expenseForm;
    if (this.config.links.internalRequestForm) links.internalRequest = this.config.links.internalRequestForm;
    if (this.config.links.sharedAssets) links.sharedAssets = this.config.links.sharedAssets;
    if (growthVisible) {
      if (this.config.links.weeklyReportForm) links.weeklyReport = this.config.links.weeklyReportForm;
      if (this.config.links.metricsForm) links.metrics = this.config.links.metricsForm;
      if (this.config.links.companyCalendar) links.companyCalendar = this.config.links.companyCalendar;
      if (this.config.links.contentCalendar) links.contentCalendar = this.config.links.contentCalendar;
    }

    const dashboard: CompanyOpsDashboard = {
      user: { name: principal.name, avatarUrl: principal.avatarUrl, role: principal.role, accessPending: false },
      summary: {
        headline: principal.role === "founder"
          ? "Decisions and exceptions needing your attention"
          : principal.role === "finance"
            ? "Finance items ready for review"
            : principal.role === "growth"
              ? "Your growth priorities for today"
              : "Your company tasks and requests",
        todayCount: workQueue.filter((item) => item.dueAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
        waitingCount: workQueue.length,
        overdueCount,
      },
      workQueue,
      contentPipeline,
      leads,
      campaigns,
      campaignWorkflow,
      partners,
      experiments,
      onboarding,
      approvals: [],
      supportIssues,
      links,
    };

    if (financeVisible) {
      const [expenseRecords, payrollRecords, commissionRecords] = await Promise.all([
        this.listOptional("expense", 100),
        this.listOptional("payroll", 100),
        this.listOptional("commission", 100),
      ]);
      const expenses = expenseRecords.map((record) => ({
        ...this.project(record, {
          resource: "expense",
          title: ["事项 Item", "Expense", "Title", "费用名称"],
          status: FIELD.status,
          subtitle: ["业务目的 Business Purpose", "Business Purpose", "Purpose", "业务用途"],
          due: ["日期 Date", "提交时间 Submitted At", "Expense Date", "Submitted At", "费用日期"],
          owner: ["员工 Employee", "提交人 Submitted By", "Employee", "Submitted By", "员工", "提交人"],
          amount: ["金额 Amount", "Amount", "金额"],
          currency: ["币种 Currency", "Currency", "币种"],
        }),
        // The reviewer must be able to open the receipt before approving.
        link: textValue(recordField(record.fields, [
          "票据链接 Receipt URL",
          "Receipt URL",
          "票据 Receipt",
        ])) || undefined,
      }));
      const payroll = payrollRecords.map((record) => this.project(record, {
        resource: "payroll",
        title: ["月份 Month", "Month", "Payroll Month", "月份"],
        status: FIELD.status,
        subtitle: ["员工 Employee", "Employee", "员工"],
        due: ["发放日期 Paid Date", "Paid Date", "Payment Date", "发薪日期"],
        owner: ["员工 Employee", "Employee", "员工"],
        amount: ["实发 Net Pay", "Net Pay", "Net Payment", "实发工资"],
        currency: ["币种 Currency", "Currency", "币种"],
      }));
      const commissions = commissionRecords.map((record) => this.project(record, {
        resource: "commission",
        title: ["月份 Month", "季度 Quarter", "Quarter", "Month", "结算期"],
        status: FIELD.status,
        subtitle: ["员工 Employee", "Employee", "员工"],
        due: ["Paid Date", "Payment Date", "支付日期"],
        owner: ["员工 Employee", "Employee", "员工"],
        amount: ["提成金额 Amount", "Amount", "Commission Amount", "提成金额"],
        currency: ["Currency", "币种"],
      }));
      dashboard.approvals = expenses
        .filter((item) => item.status === "Pending")
        .map((item) => ({ ...item, actionType: "expense" as const }));
      if (principal.role === "finance") {
        dashboard.finance = { expenses, payroll, commissions };
      } else {
        const [requestRecords, weeklyRecords, staffRecords] = await Promise.all([
          this.listOptional("internalRequest", 150),
          this.listOptional("weeklyReport", 100),
          this.listOptional("staff", 500),
        ]);
        const accessRequests = requestRecords
          .filter((record) => /company operations access|权限/.test(
            normalize(textValue(recordField(record.fields, ["请求 Request", "Request", "Title"])))
          ))
          .map((record) => ({ ...this.project(record, {
            resource: "internalRequest",
            title: ["请求 Request", "Request", "Title", "申请标题"],
            status: FIELD.status,
            subtitle: ["备注 Notes", "Details", "Description", "申请详情"],
            due: ["提交时间 Submitted At", "Submitted At", "Created At", "提交时间"],
            owner: ["提出人（飞书） Requested By (Feishu)", "Submitted By", "提交人"],
          }), actionType: "access_request" as const }));
        const founderDecisionRequests = requestRecords
          .filter((record) => /\[founder decision:/.test(
            normalize(textValue(recordField(record.fields, ["备注 Notes", "Details", "Description"])))
          ))
          .map((record) => ({ ...this.project(record, {
            resource: "internalRequest",
            title: ["请求 Request", "Request", "Title", "申请标题"],
            status: FIELD.status,
            subtitle: ["备注 Notes", "Details", "Description", "申请详情"],
            due: ["截止 Due", "提交时间 Submitted At", "Submitted At", "Created At"],
            owner: ["提出人（飞书） Requested By (Feishu)", "Submitted By", "提交人"],
          }), actionType: "founder_decision" as const }));
        // The card used to show only "decisions needed", titled with the bare
        // week date — it read as a note from nobody about nothing. Carry the
        // whole report so a founder can read it without opening the Base.
        const weeklyReports = weeklyRecords.map((record) => {
          const base = this.project(record, {
            resource: "weeklyReport",
            title: ["报告 Report", "报告周 Reporting Week", "Reporting Week", "Week", "报告周"],
            status: FIELD.status,
            subtitle: ["E 需要决策 Decisions Needed", "F. Founder Decisions Needed", "F — Decisions Needed", "F. 需要创始人决策"],
            due: ["提交时间 Submitted At", "Submitted At", "Created At", "提交时间"],
            owner: ["提交人 Author", "Author", "Submitted By", "作者", "提交人"],
          });
          const section = (label: string, aliases: readonly string[]) => {
            const value = textValue(recordField(record.fields, aliases)).trim();
            return value ? `${label}\n${value}` : "";
          };
          const full = [
            section("完成事项 Completed", ["A 完成事项 Completed", "A. Wins", "A — Wins", "A. 本周成果"]),
            section("主要成果 Results", ["B 主要成果 Results", "B. Metrics", "B — Metrics", "B. 核心数据"]),
            section("问题 Problems", ["C 问题 Problems", "C. Problems", "D. Blockers", "D — Blockers", "D. 阻碍"]),
            section("学习 Learnings", ["D 学习 Learnings", "C. Learning", "C — Learning", "C. 学习与洞察"]),
            section("下周优先级 Next", ["F 下周优先级 Next Priorities", "E. Next Week", "E — Next Week", "E. 下周计划"]),
            section("需要决策 Decisions needed", ["E 需要决策 Decisions Needed", "F. Founder Decisions Needed", "F — Decisions Needed", "F. 需要创始人决策"]),
          ].filter(Boolean).join("\n\n");
          return {
            ...base,
            title: `周报 Weekly report — ${base.owner || "?"} · ${base.title}`,
            subtitle: full || base.subtitle,
            actionType: "weekly_report" as const,
          };
        });
        const onboardingCandidates = staffRecords.flatMap((record) => {
          if (!isActiveStaff(record)) return [];
          const openIds = idsFromValue(recordField(record.fields, [
            "飞书用户 Feishu User",
            "Feishu Open ID",
            "飞书 Open ID",
          ]));
          if (openIds.length !== 1) return [];
          const name = textValue(recordField(record.fields, [
            "姓名 Name",
            "Name",
            "姓名",
          ]));
          if (!name) return [];
          const roleText = textValue(recordField(record.fields, [
            "职位 Position",
            "职务 Title",
            "应用角色 App Role",
            "Position",
            "Role",
          ]));
          const normalizedRole = normalize(roleText);
          const role = /增长|growth|brand|marketing/.test(normalizedRole)
            ? "品牌增长 Brand & Growth"
            : /教练|coach/.test(normalizedRole)
              ? "教练 Coach"
              : /行政|admin/.test(normalizedRole)
                ? "行政 Admin"
                : /运营|operation/.test(normalizedRole)
                  ? "运营 Operations"
                  : "其他 Other";
          return [{
            openId: openIds[0],
            name,
            role,
            startDate: isoDate(recordField(record.fields, [
              "入职日期 Start Date",
              "Start Date",
              "入职日期",
            ]))?.slice(0, 10),
          }];
        });
        dashboard.founder = {
          accessRequests,
          expenses,
          payroll,
          commissions,
          weeklyReports,
          performanceCycles: [],
          onboardingCandidates,
          revenue: await this.currentMonthRevenue(),
        };
        dashboard.approvals = [
          ...dashboard.approvals,
          ...accessRequests.filter((item) => ["Open", "In Progress"].includes(item.status || "")),
          ...founderDecisionRequests.filter((item) => ["Open", "In Progress"].includes(item.status || "")),
          ...weeklyReports.filter((item) => item.status === "Submitted"),
        ];
      }
    }
    const [myCompensation, acknowledgedPolicyIds, performance] = await Promise.all([
      this.getMyCompensation(principal),
      this.getAcknowledgedPolicyIds(principal),
      this.getPerformanceDashboard(principal),
    ]);
    dashboard.myCompensation = myCompensation;
    dashboard.acknowledgedPolicyIds = acknowledgedPolicyIds;
    dashboard.performance = performance;
    if (dashboard.founder) dashboard.founder.performanceCycles = performance.cycles;

    // Submitters can see where their own claims stand (finance-visible roles
    // already see the full ledger above).
    if (!financeVisible) {
      const ownExpenseRecords = await prefetch.expense;
      dashboard.myExpenses = ownExpenseRecords
        .filter((record) => this.belongsTo(record, principal))
        .map((record) => this.project(record, {
          resource: "expense",
          title: ["事项 Item", "Expense", "Title", "费用名称"],
          status: FIELD.status,
          due: ["日期 Date", "提交时间 Submitted At", "Expense Date", "Submitted At", "费用日期"],
          amount: ["金额 Amount", "Amount", "金额"],
          currency: ["币种 Currency", "Currency", "币种"],
        }))
        .sort((left, right) => (right.dueAt || "").localeCompare(left.dueAt || ""))
        .slice(0, 8);
    }

    // "Weekly report due" reflects reality: due until a report of the
    // current Shanghai week (Monday-keyed) has been submitted by this person.
    if (principal.role === "growth") {
      const shanghaiNow = new Date(Date.now() + 8 * 3_600_000);
      const monday = new Date(shanghaiNow);
      monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
      const mondayKey = monday.toISOString().slice(0, 10);
      const reportRecords = await prefetch.weeklyReport;
      const filedThisWeek = reportRecords.some((record) => {
        if (!this.belongsTo(record, principal)) return false;
        const week = isoDate(recordField(record.fields, [
          "报告周 Reporting Week", "Reporting Week", "Week",
        ]))?.slice(0, 10);
        const submitted = isoDate(recordField(record.fields, [
          "提交时间 Submitted At", "Submitted At", "Created At",
        ]))?.slice(0, 10);
        return Boolean((week && week >= mondayKey) || (submitted && submitted >= mondayKey));
      });
      dashboard.weeklyReportDue = !filedThisWeek;
    }

    // Latest platform metrics, one row per platform, for the growth pulse.
    if (growthVisible) {
      const metricRecords = await prefetch.metrics;
      const byPlatform = new Map<string, NonNullable<CompanyOpsDashboard["growthMetrics"]>[number]>();
      const rows = metricRecords
        .map((record) => ({
          platform: textValue(recordField(record.fields, ["平台 Platform", "Platform", "平台"])),
          period: textValue(recordField(record.fields, ["周期 Period", "Period", "周期"])) || undefined,
          followers: numberValue(recordField(record.fields, [
            "期末粉丝 End Followers", "End Followers", "Followers",
          ])),
          views: numberValue(recordField(record.fields, [
            "总播放/曝光 Views", "总播放 Views", "Views",
          ])),
          leads: numberValue(recordField(record.fields, ["线索 Leads", "Leads"])),
        }))
        .filter((row) => row.platform)
        .sort((left, right) => (left.period || "").localeCompare(right.period || ""));
      for (const row of rows) byPlatform.set(row.platform, row);
      dashboard.growthMetrics = [...byPlatform.values()].slice(0, 6);
    }

    if (growthVisible) {
      const text = (record: FeishuRecord, alias: string) =>
        textValue(recordField(record.fields, [alias])) || undefined;
      dashboard.contentFull = contentRecords.map((record) => ({
        id: record.record_id,
        title: textValue(recordField(record.fields, ["内容 Content", "Title"])) || "Untitled",
        platform: text(record, "平台 Platform"),
        status: decodeStatus("content", recordField(record.fields, FIELD.status)),
        publishDate: isoDate(recordField(record.fields, ["发布日期 Publish Date"])),
        shootDate: isoDate(recordField(record.fields, ["拍摄日期 Shoot Date"])),
        hook: text(record, "钩子/标题 Hook"),
        copy: text(record, "文案 Copy"),
        keywords: text(record, "关键词 SEO Keywords"),
        hashtags: text(record, "话题标签 Hashtags"),
        cta: text(record, "行动号召 CTA"),
        ideaNotes: text(record, "创意备注 Idea Notes"),
        pillar: text(record, "内容支柱 Pillar"),
        audience: text(record, "受众 Audience"),
        funnel: text(record, "漏斗阶段 Funnel"),
        objective: text(record, "目标 Objective"),
        format: text(record, "形式 Format"),
        featured: text(record, "出镜 Featured"),
        footageStatus: text(record, "素材状态 Footage Status"),
        filmingNotes: text(record, "拍摄需求 Filming Notes"),
        owner: text(record, "负责人 Owner (Feishu)") || text(record, "Owner"),
        needsFounderReview: boolValue(recordField(record.fields, ["需创始人审批 Needs Founder OK"])) === true,
        publishedUrl: text(record, "发布链接 Published URL"),
        views: numberValue(recordField(record.fields, ["播放/曝光 Views"])),
        saves: numberValue(recordField(record.fields, ["收藏/点赞 Saves"])),
        comments: numberValue(recordField(record.fields, ["评论 Comments"])),
        leads: numberValue(recordField(record.fields, ["线索数 Leads"])),
        revenue: numberValue(recordField(record.fields, ["归因收入 Revenue"])),
        learnings: text(record, "学习/下一步 Learnings"),
      }));
    }

    if (growthVisible) {
      const articleRecords = await prefetch.article;
      dashboard.articles = articleRecords
        .map((record) => ({
          id: record.record_id,
          title: textValue(recordField(record.fields, ["标题 Title", "Title"])) || "Untitled",
          status: decodeStatus("article", recordField(record.fields, FIELD.status)),
          summary: textValue(recordField(record.fields, ["摘要 Summary"])) || undefined,
          blocks: textValue(recordField(record.fields, ["内容块 Blocks"])) || undefined,
          author: textValue(recordField(record.fields, ["提交人 Author"])) || undefined,
          updatedAt:
            isoDate(recordField(record.fields, ["更新时间 Updated At"])) ||
            isoDate(recordField(record.fields, ["Submitted At"])),
        }))
        .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""));
    }

    if (principal.role === "founder") {
      const keyDateRecords = await prefetch.keyDate;
      dashboard.keyDates = keyDateRecords
        .filter((record) => boolValue(recordField(record.fields, ["已处理 Resolved"])) !== true)
        .map((record) => ({
          id: record.record_id,
          item: textValue(recordField(record.fields, ["事项 Item"])) || "Untitled",
          date: isoDate(recordField(record.fields, ["日期 Date"])),
          category: textValue(recordField(record.fields, ["类别 Category"])) || undefined,
          owner: textValue(recordField(record.fields, ["负责人 Owner"])) || undefined,
          warnDays: numberValue(recordField(record.fields, ["提前提醒天数 Warn Days"])),
          notes: textValue(recordField(record.fields, ["备注 Notes"])) || undefined,
        }))
        .sort((left, right) => (left.date || "9999").localeCompare(right.date || "9999"));
    }

    // War Room: everyone's raw ideas, hottest first (votes, then recency).
    dashboard.ideas = ideaRecords
      .map((record) => this.projectIdea(record, principal))
      .filter((idea) => idea.idea)
      .sort((left, right) =>
        right.votes - left.votes ||
        (right.createdAt || "").localeCompare(left.createdAt || "")
      );

    // Founder goals & ideas: shared direction, visible to the whole team.
    const goalRecords = await prefetch.goal;
    dashboard.goals = goalRecords
      .map((record) => ({
        id: record.record_id,
        title: textValue(recordField(record.fields, ["目标 Goal", "Goal"])) || "Untitled",
        goalType: textValue(recordField(record.fields, ["类型 Type", "Type"])) || undefined,
        status: decodeStatus("goal", recordField(record.fields, FIELD.status)),
        measure: textValue(recordField(record.fields, ["衡量标准 Measure"])) || undefined,
        priority: textValue(recordField(record.fields, ["优先级 Priority"])) || undefined,
        dueAt: isoDate(recordField(record.fields, ["截止 Due"])),
        creator: textValue(recordField(record.fields, [
          "提出人（飞书） Requested By (Feishu)",
        ])) || undefined,
        response: textValue(recordField(record.fields, ["回应 Response"])) || undefined,
        respondedBy: textValue(recordField(record.fields, ["回应人 Responded By"])) || undefined,
        notes: textValue(recordField(record.fields, ["备注 Notes"])) || undefined,
      }))
      .sort((left, right) =>
        (left.status === "Done" ? 1 : 0) - (right.status === "Done" ? 1 : 0) ||
        (left.dueAt || "9999").localeCompare(right.dueAt || "9999")
      )
      .slice(0, 20);

    // Onboarding case data: the founder watches every active case; everyone
    // else gets their own case's role/start date/confidential status.
    const caseRecords = await prefetch.onboardingCase;
    const caseField = (record: FeishuRecord, alias: string) =>
      recordField(record.fields, [alias]);
    const myCase = caseRecords.find((record) =>
      idsFromValue(caseField(record, "飞书用户 Feishu User")).includes(principal.openId)
    );
    if (myCase) {
      const confidential = textValue(caseField(myCase, "保密资料 Confidential Details"));
      dashboard.myOnboardingCase = {
        roleTitle: textValue(caseField(myCase, "岗位 Role")) || undefined,
        startDate: isoDate(caseField(myCase, "入职日期 Start Date")),
        confidentialDetailsComplete: Boolean(
          confidential && !/未提交|missing/i.test(confidential)
        ),
      };
    }
    if (dashboard.founder) {
      const today = new Date().toISOString().slice(0, 10);
      dashboard.founder.onboardingCases = caseRecords
        .filter((record) => /进行中|active/i.test(
          textValue(caseField(record, "状态 Status"))
        ))
        .map((record) => {
          const reviews = [
            isoDate(caseField(record, "30天复盘 Day 30 Review")),
            isoDate(caseField(record, "60天复盘 Day 60 Review")),
            isoDate(caseField(record, "90天复盘 Day 90 Review")),
          ].filter((value): value is string => Boolean(value));
          const confidential = textValue(caseField(record, "保密资料 Confidential Details"));
          const policy = textValue(caseField(record, "制度确认 Policy Acknowledgement"));
          const blockers = [
            /未提交|missing/i.test(confidential) ? "保密资料未提交 Confidential details missing" : "",
            /未完成|missing/i.test(policy) ? "制度确认未完成 Policies not acknowledged" : "",
          ].filter(Boolean);
          return {
            id: record.record_id,
            employeeName: textValue(caseField(record, "员工姓名 Employee Name")) || "Employee",
            progress: Math.round(numberValue(caseField(record, "完成率 Progress %")) ?? 0),
            nextDueAt: reviews.filter((value) => value.slice(0, 10) >= today).sort()[0],
            blocker: blockers.join(" · ") || undefined,
          };
        });
    }
    return dashboard;
  }

  private async currentMonthRevenue(): Promise<
    NonNullable<CompanyOpsDashboard["founder"]>["revenue"]
  > {
    try {
      const { paidRevenueBetween } = await import(
        "../db/repositories/productOrders.ts"
      );
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
      }).formatToParts(new Date());
      const year = Number(parts.find((part) => part.type === "year")?.value);
      const month = Number(parts.find((part) => part.type === "month")?.value);
      if (!year || !month) return [];
      const shanghaiOffset = 8 * 60 * 60 * 1_000;
      const start = new Date(Date.UTC(year, month - 1, 1) - shanghaiOffset);
      const end = new Date(Date.UTC(year, month, 1) - shanghaiOffset);
      const revenue = await paidRevenueBetween(start, end);
      return revenue.sort((left, right) =>
        right.grossCollected - left.grossCollected
      );
    } catch {
      return [];
    }
  }

  async performAction(
    principal: CompanyOpsPrincipal,
    request: CompanyOpsActionRequest
  ): Promise<CompanyOpsActionResult> {
    requireActionPermission(principal.role, request.action);
    const payload = objectInput(request.payload);
    // Free-text create/submit actions all get the health-data guard; the
    // lead case keeps its own (more specific) message below.
    const freeTextCreates = new Set([
      "content.create", "create_content_idea",
      "partner.create", "create_partner",
      "campaign.create", "create_campaign",
      "experiment.create", "create_experiment",
      "support.create", "create_support_issue",
      "expense.submit", "submit_expense",
      "report.weekly.submit", "submit_weekly_report",
      "request.internal.submit", "submit_internal_request",
      "decision.request", "request_founder_decision",
    ]);
    if (freeTextCreates.has(request.action)) assertNoHealthData(payload);
    switch (request.action) {
      case "content.create":
      case "create_content_idea": {
        const normalizedPayload = request.action === "create_content_idea"
          ? {
              title: payload.workingTitle,
              platform: choice(payload.platform, "platform", PLATFORM_OPTIONS),
              pillar: choice(payload.contentPillar, "contentPillar", CONTENT_PILLAR_OPTIONS),
              objective: choice(payload.objective, "objective", CONTENT_OBJECTIVE_OPTIONS),
              publishDate: payload.plannedPublishDate,
              // Depth fields from the richer idea form — all optional.
              hook: payload.hook,
              script: payload.copyText,
              keywords: payload.keywords,
              hashtags: payload.hashtags,
              cta: payload.cta,
              ideaNotes: payload.ideaNotes,
            }
          : payload;
        const record = await this.createMapped("content", normalizedPayload, CONTENT_SPECS, principal, { status: "想法 Idea" });
        void this.pingFounders(
          principal,
          `📝 ${principal.name} 提交了新内容想法 New content idea: “${textValue(normalizedPayload.title).slice(0, 80)}”`
        );
        return { success: true, message: "Content idea added to the pipeline", recordId: record.record_id };
      }
      case "lead.create":
      case "create_lead": {
        if (
          Object.values(payload).some((value) =>
            healthDataPattern.test(textValue(value)),
          )
        ) {
          throw new CompanyOpsHttpError(400, "Do not put health or medical information in the leads CRM");
        }
        const normalizedPayload = request.action === "create_lead"
          ? {
              ...payload,
              source: choice(payload.source, "source", LEAD_SOURCE_OPTIONS, { optional: true }),
              productInterest: choice(
                payload.productInterest,
                "productInterest",
                PRODUCT_INTEREST_OPTIONS,
                { optional: true }
              ),
            }
          : payload;
        const record = await this.createMapped("lead", normalizedPayload, LEAD_SPECS, principal, { stage: "新 New" });
        return { success: true, message: "Lead captured and ready for follow-up", recordId: record.record_id };
      }
      case "partner.create":
      case "create_partner": {
        const normalizedPayload = request.action === "create_partner"
          ? {
              name: payload.name,
              platformHandle: [textValue(payload.platform), textValue(payload.handle)]
                .filter(Boolean)
                .join(" · "),
              audienceFit: choice(payload.audienceFit, "audienceFit", PARTNER_FIT_OPTIONS),
              proposedCollaboration: payload.proposedCollaboration,
              nextFollowUp: payload.nextFollowUpAt,
            }
          : payload;
        const record = await this.createMapped("partner", normalizedPayload, PARTNER_SPECS, principal, { stage: "调研 Research" });
        return { success: true, message: "Partner added to the outreach pipeline", recordId: record.record_id };
      }
      case "campaign.create":
      case "create_campaign": {
        const allowedCampaignCreate = new Set([
          "name", "objective", "targetAudience", "audience", "offer", "product",
          "channels", "budget", "start", "startDate", "end", "endDate",
          "revenueTarget", "successCriteria", "flatFeeAmount",
        ]);
        const unknownCampaignCreate = Object.keys(payload).filter(
          (key) => !allowedCampaignCreate.has(key),
        );
        if (unknownCampaignCreate.length) {
          throw new CompanyOpsHttpError(
            400,
            `Unknown fields: ${unknownCampaignCreate.join(", ")}`,
          );
        }
        const campaignStart = dateValue(payload.start ?? payload.startDate);
        const campaignEnd = dateValue(payload.end ?? payload.endDate);
        if (
          campaignStart === undefined ||
          campaignEnd === undefined ||
          campaignEnd < campaignStart
        ) {
          throw new CompanyOpsHttpError(
            400,
            "The campaign end date must be on or after its start date",
          );
        }
        const normalizedPayload = {
          name: payload.name,
          objective: payload.objective,
          audience: textValue(payload.targetAudience ?? payload.audience)
            .split(/[,，/]+/)
            .map((item) => choice(item, "targetAudience", AUDIENCE_OPTIONS)),
          offer: payload.offer,
          product: choice(payload.product, "product", CAMPAIGN_PRODUCT_OPTIONS),
          channels: textValue(payload.channels)
            .split(/[,，/]+/)
            .map((item) => choice(item, "channels", CHANNEL_OPTIONS)),
          budget: payload.budget,
          startDate: payload.start ?? payload.startDate,
          endDate: payload.end ?? payload.endDate,
          revenueTarget: payload.revenueTarget,
          successCriteria: payload.successCriteria,
          flatFeeAmount: payload.flatFeeAmount,
          submittedAt: Date.now(),
        };
        const record = await this.createMapped("campaign", normalizedPayload, CAMPAIGN_SPECS, principal, { status: "待批准 Pending Approval" });
        return { success: true, message: "Campaign proposal submitted for founder review", recordId: record.record_id };
      }
      case "campaign.update":
        return this.updateCampaignProposal(principal, payload);
      case "campaign.review":
        return this.reviewCampaign(principal, payload);
      case "campaign.activate":
        return this.activateCampaign(principal, payload);
      case "campaign.results.submit":
        return this.submitCampaignResults(principal, payload);
      case "campaign.reconcile":
        return this.reconcileCampaign(principal, payload);
      case "experiment.create":
      case "create_experiment": {
        const normalizedPayload = request.action === "create_experiment"
          ? {
              name: payload.name,
              hypothesis: payload.hypothesis,
              variable: payload.variable,
              channel: textValue(payload.channel)
                ? textValue(payload.channel)
                    .split(/[,，/]+/)
                    .map((item) => choice(item, "channel", CHANNEL_OPTIONS))
                : undefined,
              metric: payload.successMetric,
              baseline: payload.baseline,
              target: payload.target,
              startDate: payload.start,
              endDate: payload.end,
            }
          : payload;
        const record = await this.createMapped("experiment", normalizedPayload, EXPERIMENT_SPECS, principal, { status: "想法 Idea" });
        return { success: true, message: "Growth experiment created", recordId: record.record_id };
      }
      case "weeklyReport.submit":
      case "submit_weekly_report": {
        const normalizedPayload = request.action === "submit_weekly_report"
          ? {
              reportingWeek: payload.reportingWeek,
              wins: payload.completed,
              metrics: payload.results,
              blockers: payload.problems,
              learning: payload.learnings,
              decisionsNeeded: payload.decisionsNeeded,
              nextWeek: payload.nextWeek,
            }
          : payload;
        const record = await this.createMapped("weeklyReport", normalizedPayload, WEEKLY_SPECS, principal, { status: "已提交 Submitted" });
        void this.pingFounders(principal, `🗓 ${principal.name} 提交了周报 Weekly report submitted`);
        return { success: true, message: "Weekly report submitted for founder review", recordId: record.record_id };
      }
      case "metrics.submit":
      case "submit_metrics":
      case "submit_platform_metrics": {
        const normalizedPayload = request.action === "submit_platform_metrics"
          ? {
              period: payload.period,
              platform: choice(payload.platform, "platform", PLATFORM_OPTIONS),
              followersStart: payload.startFollowers,
              followersEnd: payload.endFollowers,
              posts: payload.posts,
              views: payload.views,
              engagement: payload.engagement,
              profileVisits: payload.profileVisits,
              clicks: payload.clicks,
              leads: payload.leads,
              revenue: payload.revenue,
              learning: payload.learning,
            }
          : payload;
        const record = await this.createMapped("metrics", normalizedPayload, METRICS_SPECS, principal);
        return { success: true, message: "Platform metrics saved", recordId: record.record_id };
      }
      case "expense.submit":
      case "submit_expense": {
        const normalizedPayload = request.action === "submit_expense"
          ? {
              ...payload,
              category: choice(payload.category, "category", EXPENSE_CATEGORY_OPTIONS),
              title: `${textValue(payload.category) || "Expense"} — ${textValue(payload.expenseDate) || new Date().toISOString().slice(0, 10)}`,
            }
          : payload;
        const record = await this.createMapped("expense", normalizedPayload, EXPENSE_SPECS, principal, { status: "待审批 Pending" });
        return { success: true, message: "Expense submitted for review", recordId: record.record_id };
      }
      case "internalRequest.submit":
      case "goal.create":
      case "create_goal": {
        if (principal.role !== "founder") {
          throw new CompanyOpsHttpError(403, "Only founders set company goals");
        }
        const normalizedPayload = {
          ...payload,
          goalType: choice(payload.goalType, "goalType", GOAL_TYPE_OPTIONS),
          priority: choice(payload.priority, "priority", GOAL_PRIORITY_OPTIONS, { optional: true }),
        };
        const record = await this.createMapped("goal", normalizedPayload, GOAL_SPECS, principal, {
          status: textValue(payload.goalType).includes("想法") ? "新想法 New" : "进行中 Active",
        });
        void this.pingTeam(
          principal,
          `🎯 ${principal.name} 发布了新的公司目标 New company goal: “${textValue(payload.title).slice(0, 80)}”`
        );
        return { success: true, message: "Goal shared with the team", recordId: record.record_id };
      }
      case "goal.update":
      case "update_goal": {
        if (principal.role !== "founder") {
          throw new CompanyOpsHttpError(403, "Only founders update company goals");
        }
        const allowed = new Set(["goalId", "title", "status", "measure", "priority", "due", "notes"]);
        const unknown = Object.keys(payload).filter((key) => !allowed.has(key));
        if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
        const goalId = validRecordId(payload.goalId);
        const target = await this.target("goal");
        await this.client.getRecord(target.appToken, target.tableId, goalId);
        const updates: FeishuFields = {};
        if (payload.title !== undefined) {
          const titleValue = textValue(payload.title).trim();
          if (!titleValue) throw new CompanyOpsHttpError(400, "title cannot be empty");
          const field = requiredField(target, ["目标 Goal", "Goal", "Title"]);
          updates[field.field_name] = titleValue.slice(0, 300);
        }
        if (payload.status !== undefined) {
          const statusField = requiredField(target, FIELD.status);
          updates[statusField.field_name] = encodeStatus("goal", textValue(payload.status));
        }
        if (payload.measure !== undefined) {
          const field = requiredField(target, ["衡量标准 Measure"]);
          updates[field.field_name] = textValue(payload.measure).slice(0, 1_000);
        }
        if (payload.priority !== undefined) {
          const field = requiredField(target, ["优先级 Priority"]);
          updates[field.field_name] = choice(payload.priority, "priority", GOAL_PRIORITY_OPTIONS);
        }
        if (payload.due !== undefined) {
          const field = requiredField(target, ["截止 Due"]);
          const due = dateValue(payload.due);
          if (due === undefined) throw new CompanyOpsHttpError(400, "due must be a date");
          updates[field.field_name] = due;
        }
        if (payload.notes !== undefined) {
          const field = requiredField(target, ["备注 Notes"]);
          updates[field.field_name] = textValue(payload.notes).slice(0, 3_000);
        }
        if (!Object.keys(updates).length) {
          throw new CompanyOpsHttpError(400, "Nothing to update");
        }
        await this.client.updateRecord(target.appToken, target.tableId, goalId, updates);
        return { success: true, message: "Goal updated", recordId: goalId };
      }
      case "idea.create":
      case "create_idea": {
        const allowedIdea = new Set(["idea", "detail", "category", "attachments"]);
        const unknownIdea = Object.keys(payload).filter((key) => !allowedIdea.has(key));
        if (unknownIdea.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownIdea.join(", ")}`);
        }
        assertNoHealthData(payload);
        const category = payload.category === undefined
          ? "其他 Other"
          : choice(payload.category, "category", IDEA_CATEGORIES);
        const target = await this.target("idea");
        const fields = this.mappedFields(
          {
            idea: payload.idea,
            detail: payload.detail,
            category,
            status: "新 New",
            ...(payload.attachments === undefined
              ? {}
              : { attachments: normalizeAttachmentList(payload.attachments) }),
          },
          IDEA_SPECS,
          target,
          principal
        );
        const raisedBy = fieldByAlias(target.fields, ["提出人 Raised By"]);
        if (raisedBy) fields[raisedBy.field_name] = principal.name;
        const raisedById = fieldByAlias(target.fields, ["提出人 Open ID"]);
        if (raisedById) fields[raisedById.field_name] = principal.openId;
        const created = fieldByAlias(target.fields, ["创建时间 Created"]);
        if (created) fields[created.field_name] = Date.now();
        const record = await this.client.createRecord(target.appToken, target.tableId, fields);
        void this.pingTeam(
          principal,
          `💡 ${principal.name} 提了个新想法 New idea: “${textValue(payload.idea).slice(0, 80)}”`
        );
        return { success: true, message: "Idea posted", recordId: record.record_id };
      }
      case "idea.respond":
      case "respond_idea": {
        const allowedReply = new Set(["ideaId", "message", "attachments"]);
        const unknownReply = Object.keys(payload).filter((key) => !allowedReply.has(key));
        if (unknownReply.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownReply.join(", ")}`);
        }
        const ideaId = validRecordId(payload.ideaId);
        const replyFiles = normalizeAttachmentList(payload.attachments);
        const messageText = textValue(payload.message).trim();
        // A reply may be just a picture — the file is the point.
        const message = [messageText, replyFiles].filter(Boolean).join("\n");
        if (!message) throw new CompanyOpsHttpError(400, "message is required");
        if (message.length > 3_000) throw new CompanyOpsHttpError(400, "message is too long");
        assertNoHealthData({ message });
        const { target, record } = await this.ideaRecord(ideaId);
        const threadField = requiredField(target, ["讨论 Thread"]);
        const combined = this.appendThreadEntry(
          textValue(recordField(record.fields, ["讨论 Thread"])),
          principal,
          message
        );
        const updates: FeishuFields = { [threadField.field_name]: combined };
        // First reply moves a new idea into discussion on its own.
        const statusField = fieldByAlias(target.fields, ["状态 Status"]);
        const currentStatus = textValue(recordField(record.fields, ["状态 Status"]));
        if (statusField && (!currentStatus || currentStatus === "新 New")) {
          updates[statusField.field_name] = "讨论中 Discussing";
        }
        await this.client.updateRecord(target.appToken, target.tableId, ideaId, updates);
        const title = textValue(recordField(record.fields, ["想法 Idea", "Idea"])).slice(0, 60);
        const ownerOpenId = textValue(recordField(record.fields, ["提出人 Open ID"]));
        const pingText = `💬 ${principal.name} 回复了想法「${title}」: ${message.slice(0, 100)}`;
        if (ownerOpenId && ownerOpenId !== principal.openId) {
          void this.sendPings([ownerOpenId], principal.openId, pingText);
        } else {
          void this.pingFounders(principal, pingText);
        }
        return { success: true, message: "Reply added", recordId: ideaId };
      }
      case "idea.vote":
      case "vote_idea": {
        const allowedVote = new Set(["ideaId"]);
        const unknownVote = Object.keys(payload).filter((key) => !allowedVote.has(key));
        if (unknownVote.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownVote.join(", ")}`);
        }
        const ideaId = validRecordId(payload.ideaId);
        const { target, record } = await this.ideaRecord(ideaId);
        const votersField = requiredField(target, ["支持者 Voters"]);
        const voters = textValue(recordField(record.fields, ["支持者 Voters"]))
          .split(/[,\s]+/)
          .filter(Boolean);
        // One vote per person, and clicking again takes it back.
        const next = voters.includes(principal.openId)
          ? voters.filter((id) => id !== principal.openId)
          : [...voters, principal.openId];
        const updates: FeishuFields = { [votersField.field_name]: next.join(",") };
        const countField = fieldByAlias(target.fields, ["支持 Votes"]);
        if (countField) updates[countField.field_name] = next.length;
        await this.client.updateRecord(target.appToken, target.tableId, ideaId, updates);
        return {
          success: true,
          message: next.includes(principal.openId) ? "Voted" : "Vote removed",
          recordId: ideaId,
        };
      }
      case "idea.status":
      case "update_idea_status": {
        if (principal.role !== "founder") {
          throw new CompanyOpsHttpError(403, "Only founders change an idea's status");
        }
        const allowedStatus = new Set(["ideaId", "status"]);
        const unknownStatus = Object.keys(payload).filter((key) => !allowedStatus.has(key));
        if (unknownStatus.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownStatus.join(", ")}`);
        }
        const ideaId = validRecordId(payload.ideaId);
        const status = choice(payload.status, "status", IDEA_STATUSES);
        const { target, record } = await this.ideaRecord(ideaId);
        const statusField = requiredField(target, ["状态 Status"]);
        await this.client.updateRecord(target.appToken, target.tableId, ideaId, {
          [statusField.field_name]: status,
        });
        const ownerOpenId = textValue(recordField(record.fields, ["提出人 Open ID"]));
        const title = textValue(recordField(record.fields, ["想法 Idea", "Idea"])).slice(0, 60);
        if (ownerOpenId) {
          void this.sendPings(
            [ownerOpenId],
            principal.openId,
            `📌 你的想法「${title}」状态更新为 ${status} / status changed to ${status}`
          );
        }
        return { success: true, message: "Status updated", recordId: ideaId };
      }
      case "goal.respond":
      case "respond_goal": {
        const allowed = new Set(["goalId", "response", "attachments"]);
        const unknown = Object.keys(payload).filter((key) => !allowed.has(key));
        if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
        const goalId = validRecordId(payload.goalId);
        // Attachment links ride in the same thread text, one URL per line —
        // the war-room convention, so the client renders them as file chips.
        const goalFiles = normalizeAttachmentList(payload.attachments);
        const response = [textValue(payload.response).trim(), goalFiles]
          .filter(Boolean)
          .join("\n");
        if (!response) throw new CompanyOpsHttpError(400, "response is required");
        if (response.length > 3_000) throw new CompanyOpsHttpError(400, "response is too long");
        assertNoHealthData({ response });
        const target = await this.target("goal");
        const record = await this.client.getRecord(target.appToken, target.tableId, goalId);
        const responseField = requiredField(target, ["回应 Response"]);
        const byField = fieldByAlias(target.fields, ["回应人 Responded By"]);
        // Comment THREAD, not a single reply: each entry is prefixed
        // "[yyyy-mm-dd hh:mm Name]" and appended, so founders and staff can
        // go back and forth on a goal. The client renders the prefix lines
        // as a chat-style list.
        const existingThread = textValue(
          recordField(record.fields, ["回应 Response", "Response"])
        ).trim();
        const stamp = new Date(Date.now() + 8 * 3_600_000)
          .toISOString()
          .slice(0, 16)
          .replace("T", " ");
        const entry = `[${stamp} ${principal.name}] ${response}`;
        const combined = existingThread ? `${existingThread}
${entry}` : entry;
        if (combined.length > 6_000) {
          throw new CompanyOpsHttpError(
            400,
            "This goal's comment thread is full — start a new goal or trim it in the Base"
          );
        }
        const updates: FeishuFields = { [responseField.field_name]: combined };
        if (byField) updates[byField.field_name] = principal.name;
        await this.client.updateRecord(target.appToken, target.tableId, goalId, updates);
        {
          const goalTitle =
            textValue(
              recordField(record.fields, ["目标 Goal", "Goal", ...FIELD.title])
            ).slice(0, 60) || "goal";
          const pingMessage = `💬 ${principal.name} 在「${goalTitle}」留言 commented: ${response.slice(0, 120)}`;
          if (principal.role === "founder") {
            const ownerIds = idsFromValue(
              recordField(record.fields, [
                ...FIELD.createdByOpenId,
                ...FIELD.submittedBy,
                "飞书账号 Feishu User",
                "Feishu Open ID",
              ])
            );
            void this.pingGoalAudience(ownerIds, principal, pingMessage);
          } else {
            void this.pingFounders(principal, pingMessage);
          }
        }
        return { success: true, message: "Comment added", recordId: goalId };
      }
      case "content.update":
      case "update_content": {
        const allowedContentEdits = new Set([
          "contentId", "title", "platform", "contentType", "status",
          "publishDate", "shootDate", "hook", "copy", "keywords", "hashtags",
          "cta", "ideaNotes", "pillar", "audience", "funnel", "objective",
          "featured", "footageStatus", "filmingNotes", "notes",
        ]);
        const unknownContentEdits = Object.keys(payload).filter(
          (key) => !allowedContentEdits.has(key)
        );
        if (unknownContentEdits.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownContentEdits.join(", ")}`);
        }
        assertNoHealthData(payload);
        const contentId = validRecordId(payload.contentId);
        const target = await this.target("content");
        await this.client.getRecord(target.appToken, target.tableId, contentId);
        const updates: FeishuFields = {};
        const setText = (key: string, aliases: readonly string[], maximum: number) => {
          if (payload[key] === undefined) return;
          const field = fieldByAlias(target.fields, aliases);
          if (field) updates[field.field_name] = textValue(payload[key]).slice(0, maximum);
        };
        const setDate = (key: string, aliases: readonly string[]) => {
          if (payload[key] === undefined) return;
          const field = fieldByAlias(target.fields, aliases);
          if (!field) return;
          const value = dateValue(payload[key]);
          if (value === undefined) throw new CompanyOpsHttpError(400, `${key} must be a date`);
          updates[field.field_name] = value;
        };
        setText("title", ["内容 Content", "Title", "Content Title"], 200);
        setText("platform", ["平台 Platform", "Platform"], 50);
        setText("contentType", ["形式 Format", "Content Type"], 80);
        setText("hook", ["钩子/标题 Hook", "Hook"], 500);
        setText("copy", ["文案 Copy", "Script / Caption", "Caption"], 20_000);
        setText("keywords", ["关键词 SEO Keywords", "SEO Keywords", "Keywords"], 1_000);
        setText("hashtags", ["话题标签 Hashtags", "Hashtags"], 1_000);
        setText("cta", ["行动号召 CTA", "CTA"], 500);
        setText("ideaNotes", ["创意备注 Idea Notes", "Idea Notes"], 5_000);
        setText("pillar", ["内容支柱 Pillar", "内容支柱分类 Pillar Category", "Content Pillar", "Pillar"], 100);
        setText("audience", ["受众 Audience", "受众分类 Audience Segment", "Audience"], 200);
        setText("funnel", ["漏斗阶段 Funnel", "Funnel"], 80);
        setText("objective", ["目标 Objective", "Objective"], 200);
        setText("featured", ["出镜 Featured", "Featured"], 200);
        setText("filmingNotes", ["拍摄需求 Filming Notes", "Filming Notes"], 2_000);
        if (payload.footageStatus !== undefined) {
          const footageField = requiredField(target, ["素材状态 Footage Status", "Footage Status"]);
          const footage = choice(payload.footageStatus, "footageStatus", FOOTAGE_STATUS_OPTIONS);
          if (footage) updates[footageField.field_name] = footage;
        }
        setText("notes", ["学习/下一步 Learnings", "Notes", "备注"], 5_000);
        setDate("publishDate", ["发布日期 Publish Date", "Publish Date"]);
        setDate("shootDate", ["拍摄日期 Shoot Date", "Shoot Date"]);
        if (payload.status !== undefined) {
          const statusField = requiredField(target, FIELD.status);
          updates[statusField.field_name] = encodeStatus("content", textValue(payload.status));
        }
        if (!Object.keys(updates).length) {
          throw new CompanyOpsHttpError(400, "Nothing to update");
        }
        await this.client.updateRecord(target.appToken, target.tableId, contentId, updates);
        return { success: true, message: "Content updated", recordId: contentId };
      }
      case "content.delete":
      case "delete_content": {
        const allowedDelete = new Set(["contentId"]);
        const unknownDelete = Object.keys(payload).filter((key) => !allowedDelete.has(key));
        if (unknownDelete.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownDelete.join(", ")}`);
        }
        const contentId = validRecordId(payload.contentId);
        const target = await this.target("content");
        await this.client.getRecord(target.appToken, target.tableId, contentId);
        await this.client.deleteRecord(target.appToken, target.tableId, contentId);
        return { success: true, message: "Content deleted", recordId: contentId };
      }
      case "content.duplicate":
      case "duplicate_content": {
        const allowedDup = new Set(["contentId", "publishDate"]);
        const unknownDup = Object.keys(payload).filter((key) => !allowedDup.has(key));
        if (unknownDup.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownDup.join(", ")}`);
        }
        const contentId = validRecordId(payload.contentId);
        const target = await this.target("content");
        const source = await this.client.getRecord(target.appToken, target.tableId, contentId);
        const copyFields: FeishuFields = {};
        const carry = (aliases: readonly string[]) => {
          const field = fieldByAlias(target.fields, aliases);
          if (!field) return;
          const raw = recordField(source.fields, aliases);
          const value = textValue(raw);
          if (value) copyFields[field.field_name] = value;
        };
        const titleField = fieldByAlias(target.fields, ["内容 Content", "Title"], true);
        if (titleField) {
          const title = textValue(recordField(source.fields, ["内容 Content", "Title"])) || "Untitled";
          copyFields[titleField.field_name] = `${title} (copy)`.slice(0, 200);
        }
        for (const aliases of [
          ["平台 Platform", "Platform"],
          ["形式 Format", "Content Type"],
          ["钩子/标题 Hook", "Hook"],
          ["文案 Copy", "Script / Caption"],
          ["关键词 SEO Keywords", "SEO Keywords"],
          ["话题标签 Hashtags", "Hashtags"],
          ["行动号召 CTA", "CTA"],
          ["创意备注 Idea Notes", "Idea Notes"],
          ["内容支柱 Pillar", "Content Pillar"],
          ["受众 Audience", "Audience"],
          ["漏斗阶段 Funnel", "Funnel"],
          ["目标 Objective", "Objective"],
          ["出镜 Featured", "Featured"],
          ["素材状态 Footage Status", "Footage Status"],
          ["拍摄需求 Filming Notes", "Filming Notes"],
        ] as const) {
          carry(aliases);
        }
        const statusField = fieldByAlias(target.fields, FIELD.status);
        if (statusField) copyFields[statusField.field_name] = "想法 Idea";
        if (payload.publishDate !== undefined) {
          const publishField = fieldByAlias(target.fields, ["发布日期 Publish Date", "Publish Date"]);
          const when = dateValue(payload.publishDate);
          if (when === undefined) throw new CompanyOpsHttpError(400, "publishDate must be a date");
          if (publishField) copyFields[publishField.field_name] = when;
        }
        this.addActorFields(copyFields, target.fields, principal);
        const record = await this.client.createRecord(target.appToken, target.tableId, copyFields);
        return { success: true, message: "Content duplicated", recordId: record.record_id };
      }
      case "article.create":
      case "create_article": {
        const allowedArticle = new Set(["title", "summary", "blocks"]);
        const unknownArticle = Object.keys(payload).filter((key) => !allowedArticle.has(key));
        if (unknownArticle.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownArticle.join(", ")}`);
        }
        const blocks = normalizeArticleBlocks(payload.blocks);
        const record = await this.createMapped(
          "article",
          {
            title: payload.title,
            ...(payload.summary === undefined ? {} : { summary: payload.summary }),
            ...(blocks ? { blocks } : {}),
          },
          ARTICLE_SPECS,
          principal,
          { status: "草稿 Draft" }
        );
        if (principal.role !== "founder") {
          void this.pingFounders(
            principal,
            `✍️ ${principal.name} 创建了新文章草稿 New article draft: “${textValue(payload.title).slice(0, 80)}”`
          );
        }
        return { success: true, message: "Article created", recordId: record.record_id };
      }
      case "article.update":
      case "update_article": {
        const allowedArticle = new Set(["articleId", "title", "summary", "blocks", "status"]);
        const unknownArticle = Object.keys(payload).filter((key) => !allowedArticle.has(key));
        if (unknownArticle.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownArticle.join(", ")}`);
        }
        const articleId = validRecordId(payload.articleId);
        const target = await this.target("article");
        await this.client.getRecord(target.appToken, target.tableId, articleId);
        const updates: FeishuFields = {};
        if (payload.title !== undefined) {
          const field = requiredField(target, ["标题 Title", "Title"]);
          const title = textValue(payload.title).trim();
          if (!title) throw new CompanyOpsHttpError(400, "title is required");
          updates[field.field_name] = title.slice(0, 200);
        }
        if (payload.summary !== undefined) {
          const field = requiredField(target, ["摘要 Summary", "Summary"]);
          updates[field.field_name] = textValue(payload.summary).slice(0, 1_000);
        }
        if (payload.blocks !== undefined) {
          const field = requiredField(target, ["内容块 Blocks", "Blocks"]);
          updates[field.field_name] = normalizeArticleBlocks(payload.blocks) || "[]";
        }
        if (payload.status !== undefined) {
          const statusField = requiredField(target, FIELD.status);
          updates[statusField.field_name] = encodeStatus("article", textValue(payload.status));
        }
        if (!Object.keys(updates).length) {
          throw new CompanyOpsHttpError(400, "Nothing to update");
        }
        const updatedAtField = fieldByAlias(target.fields, ["更新时间 Updated At", "Updated At"]);
        if (updatedAtField) updates[updatedAtField.field_name] = Date.now();
        await this.client.updateRecord(target.appToken, target.tableId, articleId, updates);
        return { success: true, message: "Article saved", recordId: articleId };
      }
      case "article.delete":
      case "delete_article": {
        const allowedArticle = new Set(["articleId"]);
        const unknownArticle = Object.keys(payload).filter((key) => !allowedArticle.has(key));
        if (unknownArticle.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownArticle.join(", ")}`);
        }
        const articleId = validRecordId(payload.articleId);
        const target = await this.target("article");
        await this.client.getRecord(target.appToken, target.tableId, articleId);
        await this.client.deleteRecord(target.appToken, target.tableId, articleId);
        return { success: true, message: "Article deleted", recordId: articleId };
      }
      case "record.update":
      case "update_record": {
        const allowedUpdate = new Set(["resource", "recordId", "fields"]);
        const unknownUpdate = Object.keys(payload).filter((key) => !allowedUpdate.has(key));
        if (unknownUpdate.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownUpdate.join(", ")}`);
        }
        const resourceName = textValue(payload.resource);
        // Only the follow-up records get free-form editing. Money, HR and
        // workflow-state records stay on their dedicated actions so their
        // server-authoritative status can't be edited around.
        const EDITABLE = { lead: LEAD_SPECS, partner: PARTNER_SPECS } as const;
        const specs = EDITABLE[resourceName as keyof typeof EDITABLE];
        if (!specs) {
          throw new CompanyOpsHttpError(400, "This record type cannot be edited here");
        }
        const resource = resourceName as CompanyOpsResource;
        const recordId = validRecordId(payload.recordId);
        const target = await this.target(resource);
        const record = await this.client.getRecord(target.appToken, target.tableId, recordId);
        if (principal.role !== "founder" && !this.belongsTo(record, principal)) {
          throw new CompanyOpsHttpError(403, "You can edit only your own records");
        }
        assertNoHealthData(objectInput(payload.fields));
        await this.updateMapped(resource, recordId, payload.fields, specs);
        return { success: true, message: "Saved", recordId };
      }
      case "record.delete":
      case "delete_record": {
        const allowedDelete = new Set(["resource", "recordId"]);
        const unknownDelete = Object.keys(payload).filter((key) => !allowedDelete.has(key));
        if (unknownDelete.length) {
          throw new CompanyOpsHttpError(400, `Unknown fields: ${unknownDelete.join(", ")}`);
        }
        const resourceName = textValue(payload.resource);
        // Which submissions can be deleted at all, and by whom: founders can
        // remove anything on this list; staff only their OWN rows, and never
        // goals (founder direction) or money/HR records (not listed).
        const DELETABLE: ReadonlySet<CompanyOpsResource> = new Set([
          "goal", "idea", "lead", "partner", "campaign", "experiment", "support",
          "internalRequest", "metrics", "weeklyReport",
        ] as CompanyOpsResource[]);
        if (!DELETABLE.has(resourceName as CompanyOpsResource)) {
          throw new CompanyOpsHttpError(400, "This record type cannot be deleted here");
        }
        const resource = resourceName as CompanyOpsResource;
        if (resource === "goal" && principal.role !== "founder") {
          throw new CompanyOpsHttpError(403, "Only founders delete company goals");
        }
        const recordId = validRecordId(payload.recordId);
        const target = await this.target(resource);
        const record = await this.client.getRecord(target.appToken, target.tableId, recordId);
        if (principal.role !== "founder" && !this.belongsTo(record, principal)) {
          throw new CompanyOpsHttpError(403, "You can delete only your own submissions");
        }
        await this.client.deleteRecord(target.appToken, target.tableId, recordId);
        return { success: true, message: "Deleted", recordId };
      }
      case "submit_internal_request": {
        const record = await this.createMapped("internalRequest", payload, REQUEST_SPECS, principal, { status: "待处理 Open" });
        void this.pingFounders(principal, `📮 ${principal.name} 提交了内部请求 Internal request submitted`);
        return { success: true, message: "Internal request submitted", recordId: record.record_id };
      }
      case "request_founder_decision": {
        const result = await this.requestFounderDecision(principal, payload);
        void this.pingFounders(
          principal,
          `🧭 ${principal.name} 请求创始人决策 Requested a founder decision: “${textValue(payload.title).slice(0, 80)}”`
        );
        return result;
      }
      case "onboarding.generate":
      case "generate_onboarding":
        return this.generateOnboarding(principal, payload);
      case "access.request":
      case "request_access":
        return this.requestAccess(principal, payload);
      case "access.approve":
      case "approve_access":
        return this.approveAccess(principal, payload);
      case "record.status.update":
      case "update_status":
        return this.updateStatus(principal, payload);
      case "complete_onboarding_task":
        return this.completeOnboardingTask(principal, payload);
      case "acknowledge_policy":
        return this.acknowledgePolicy(principal, payload);
      case "approve_decision":
        return this.resolveDecision(principal, payload, "Approved");
      case "request_decision_changes":
        return this.resolveDecision(principal, payload, "Changes Requested");
      case "create_support_issue": {
        const normalizedPayload = {
          title: payload.title,
          severity: choice(payload.severity, "severity", SUPPORT_SEVERITY_OPTIONS),
          category: choice(payload.issueType, "issueType", SUPPORT_TYPE_OPTIONS),
          area: payload.feature,
          device: payload.deviceOs,
          description: payload.description,
          steps: payload.reproductionSteps,
          affectedCount: payload.affectedCount,
          workaround: payload.workaround,
        };
        const record = await this.createMapped(
          "support",
          normalizedPayload,
          SUPPORT_SPECS,
          principal,
          { status: "新建 New" }
        );
        void this.pingFounders(
          principal,
          `🛠 ${principal.name} 提交了支持问题 Support issue: “${textValue(payload.title).slice(0, 80)}”`
        );
        return {
          success: true,
          message: "Support issue submitted",
          recordId: record.record_id,
        };
      }
      case "acknowledge_commission":
      case "acknowledge_compensation":
        return this.updateOwnCompensation(principal, payload, "acknowledge");
      case "raise_commission_dispute":
      case "dispute_compensation": {
        const result = await this.updateOwnCompensation(principal, payload, "dispute");
        void this.pingFounders(principal, `⚠️ ${principal.name} 对薪酬提出异议 Raised a compensation dispute`);
        return result;
      }
      case "performance.goals.set":
      case "set_performance_goals": {
        const result = await this.setPerformanceGoals(principal, payload);
        const employeeRecordId = textValue(payload.employeeStaffRecordId ?? payload.staffRecordId);
        if (employeeRecordId) {
          void this.pingStaffRecord(
            employeeRecordId,
            principal,
            `🎯 你的月度目标已发布，请查看并确认 Your monthly goals are ready — please review and confirm`
          );
        }
        return result;
      }
      case "performance.report.submit":
      case "submit_performance_report": {
        const result = await this.submitPerformanceReport(principal, payload);
        void this.pingFounders(principal, `📊 ${principal.name} 提交了月度绩效报告 Monthly performance report submitted`);
        return result;
      }
      case "performance.review.request_changes":
      case "request_performance_changes": {
        const result = await this.requestPerformanceChanges(principal, payload);
        void this.pingPerformanceEmployee(
          textValue(payload.performanceId),
          principal,
          `✏️ 你的月度报告需要修改，请查看反馈 Changes requested on your monthly report — please check the feedback`
        );
        return result;
      }
      case "performance.review.score":
      case "score_performance_review": {
        const result = await this.scorePerformanceReview(principal, payload);
        void this.pingPerformanceEmployee(
          textValue(payload.performanceId),
          principal,
          `🏁 你的月度评分已完成 Your monthly review has been scored`
        );
        return result;
      }
      case "performance.review.respond":
      case "respond_performance_review": {
        const result = await this.respondPerformanceReview(principal, payload);
        void this.pingFounders(principal, `💬 ${principal.name} 回应了绩效评审 Responded to their performance review`);
        return result;
      }
      case "performance.finalize":
      case "finalize_performance": {
        const result = await this.finalizePerformance(principal, payload);
        void this.pingPerformanceEmployee(
          textValue(payload.performanceId),
          principal,
          `✅ 你的月度绩效已定稿 Your monthly review is finalized`
        );
        return result;
      }
      default:
        throw new CompanyOpsHttpError(400, "Unknown Company Operations action");
    }
  }

  private performanceStatus(record: FeishuRecord): string {
    return decodeStatus(
      "performance",
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.status, "Status"])
    ) || "Goals Set";
  }

  private performanceMonth(record: FeishuRecord): string | undefined {
    try {
      return monthKey(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.month, "Month"])
      );
    } catch {
      return undefined;
    }
  }

  private async performanceRecord(
    principal: CompanyOpsPrincipal,
    performanceIdValue: unknown,
    founderOnly = false
  ): Promise<{ target: ResolvedTarget; record: FeishuRecord }> {
    if (founderOnly && principal.role !== "founder") {
      throw new CompanyOpsHttpError(403, "Only the founder can manage performance reviews");
    }
    const performanceId = validRecordId(performanceIdValue);
    const target = await this.target("performance");
    const record = await this.client.getRecord(
      target.appToken,
      target.tableId,
      performanceId
    );
    if (
      principal.role !== "founder" &&
      (!principal.staffRecordId || !this.linkedToStaff(record, principal.staffRecordId))
    ) {
      throw new CompanyOpsHttpError(403, "You can access only your own performance cycle");
    }
    return { target, record };
  }

  private parsePerformanceGoals(value: unknown): Array<{
    index: number;
    title: string;
    measure: string;
  }> {
    if (!Array.isArray(value) || value.length !== PERFORMANCE_CATEGORIES.length) {
      throw new CompanyOpsHttpError(400, "Exactly five fixed-category goals are required");
    }
    const goals = value.map((raw) => {
      const goal = objectInput(raw);
      const allowed = new Set(["index", "title", "measure"]);
      const unknown = Object.keys(goal).filter((key) => !allowed.has(key));
      if (unknown.length) {
        throw new CompanyOpsHttpError(400, `Unknown goal fields: ${unknown.join(", ")}`);
      }
      const index = numberValue(goal.index);
      if (!Number.isInteger(index) || index! < 1 || index! > 5) {
        throw new CompanyOpsHttpError(400, "Each goal requires a unique index from 1 to 5");
      }
      return {
        index: index!,
        title: boundedText(goal.title, `goal ${index} title`, 1_000, true),
        measure: boundedText(goal.measure, `goal ${index} measure`, 3_000, true),
      };
    });
    if (new Set(goals.map((goal) => goal.index)).size !== PERFORMANCE_CATEGORIES.length) {
      throw new CompanyOpsHttpError(400, "Goal indexes must include each fixed category once");
    }
    return goals.sort((left, right) => left.index - right.index);
  }

  private parsePerformanceScores(value: unknown): Array<{
    index: number;
    score: number;
  }> {
    if (!Array.isArray(value) || value.length !== PERFORMANCE_CATEGORIES.length) {
      throw new CompanyOpsHttpError(400, "A score is required for all five categories");
    }
    const scores = value.map((raw) => {
      const item = objectInput(raw);
      const allowed = new Set(["index", "score"]);
      const unknown = Object.keys(item).filter((key) => !allowed.has(key));
      if (unknown.length) {
        throw new CompanyOpsHttpError(400, `Unknown score fields: ${unknown.join(", ")}`);
      }
      const index = numberValue(item.index);
      const score = numberValue(item.score);
      if (!Number.isInteger(index) || index! < 1 || index! > 5) {
        throw new CompanyOpsHttpError(400, "Each score requires a unique index from 1 to 5");
      }
      if (score === undefined || score < 0 || score > 100) {
        throw new CompanyOpsHttpError(400, `score ${index} must be between 0 and 100`);
      }
      return { index: index!, score: rounded(score) };
    });
    if (new Set(scores.map((item) => item.index)).size !== PERFORMANCE_CATEGORIES.length) {
      throw new CompanyOpsHttpError(400, "Score indexes must include each fixed category once");
    }
    return scores.sort((left, right) => left.index - right.index);
  }

  private async setPerformanceGoals(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    if (principal.role !== "founder") {
      throw new CompanyOpsHttpError(403, "Only the founder can set monthly performance goals");
    }
    const allowed = new Set([
      "employeeStaffRecordId",
      "staffRecordId",
      "month",
      "goals",
      "reportDue",
    ]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const employeeStaffRecordId = validRecordId(
      input.employeeStaffRecordId ?? input.staffRecordId
    );
    const month = monthKey(input.month);
    const goals = this.parsePerformanceGoals(input.goals);
    const reportDue = dateValue(input.reportDue);
    if (reportDue === undefined) {
      throw new CompanyOpsHttpError(400, "reportDue must be a valid date");
    }

    const staffTarget = await this.target("staff");
    const staff = await this.client.getRecord(
      staffTarget.appToken,
      staffTarget.tableId,
      employeeStaffRecordId
    );
    if (!isActiveStaff(staff)) {
      throw new CompanyOpsHttpError(409, "Performance goals can be set only for active staff");
    }
    const employeeName = boundedText(
      recordField(staff.fields, ["姓名 Name", "Name", "Employee", "姓名"]),
      "employee name",
      200,
      true
    );
    const target = await this.target("performance");
    const existing = (await this.client.listRecords(target.appToken, target.tableId, {
      maxRecords: 500,
    })).filter((record) =>
      this.linkedToStaff(record, employeeStaffRecordId) &&
      this.performanceMonth(record) === month
    );
    if (existing.length > 1) {
      throw new CompanyOpsHttpError(409, "Duplicate performance cycles exist for this employee and month");
    }
    if (existing[0] && this.performanceStatus(existing[0]) !== "Goals Set") {
      throw new CompanyOpsHttpError(409, "Goals are locked after the employee submits the monthly report");
    }

    const primary = requiredField(target, [CONFIDENTIAL_FIELD.performance.record], [1], true);
    const employee = requiredField(target, [CONFIDENTIAL_FIELD.employee], [18]);
    const monthField = requiredField(target, [CONFIDENTIAL_FIELD.performance.month], [1, 5]);
    const manager = requiredField(target, [CONFIDENTIAL_FIELD.performance.manager], [11]);
    const status = requiredField(target, [CONFIDENTIAL_FIELD.performance.status], [3]);
    const due = requiredField(target, [CONFIDENTIAL_FIELD.performance.reportDue], [5]);
    const confirmedAt = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.prioritiesConfirmedAt],
      [5]
    );
    const formula = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.bonusFormula],
      [1]
    );
    const fields: FeishuFields = {
      [primary.field_name]: `${month} · ${employeeName}`,
      [employee.field_name]: [employeeStaffRecordId],
      [monthField.field_name]: storedMonthValue(month, monthField),
      [manager.field_name]: [{ id: principal.openId }],
      [status.field_name]: encodeStatus("performance", "Goals Set"),
      [due.field_name]: reportDue,
      [confirmedAt.field_name]: Date.now(),
      [formula.field_name]: PERFORMANCE_FORMULA_VERSION,
    };
    for (const goal of goals) {
      const title = requiredField(target, [performanceGoalField(goal.index)], [1]);
      const measure = requiredField(target, [performanceMeasureField(goal.index)], [1]);
      fields[title.field_name] = goal.title;
      fields[measure.field_name] = goal.measure;
    }
    const disputeStatus = fieldByAlias(target.fields, [
      CONFIDENTIAL_FIELD.performance.disputeStatus,
    ]);
    if (disputeStatus?.type === 3) fields[disputeStatus.field_name] = "无异议 None";
    const record = existing[0]
      ? await this.client.updateRecord(
          target.appToken,
          target.tableId,
          existing[0].record_id,
          fields
        )
      : await this.client.createRecord(target.appToken, target.tableId, fields);
    return {
      success: true,
      message: existing[0]
        ? `${employeeName}'s ${month} goals were updated`
        : `${employeeName}'s ${month} goals were confirmed`,
      recordId: record.record_id,
    };
  }

  private async submitPerformanceReport(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set([
      "performanceId",
      "selfReview",
      "results",
      "evidenceLinks",
      "context",
    ]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    if (!principal.staffRecordId) {
      throw new CompanyOpsHttpError(403, "Your staff identity is not linked unambiguously");
    }
    const { target, record } = await this.performanceRecord(
      principal,
      input.performanceId
    );
    const currentStatus = this.performanceStatus(record);
    if (!new Set(["Goals Set", "Changes Requested"]).has(currentStatus)) {
      throw new CompanyOpsHttpError(409, "This performance report is not open for submission");
    }
    const selfReview = boundedText(input.selfReview, "selfReview", 12_000, true);
    if (!Array.isArray(input.results) || input.results.length !== 5) {
      throw new CompanyOpsHttpError(400, "A result is required for all five goals");
    }
    const results = input.results.map((raw) => {
      const item = objectInput(raw);
      const allowedResult = new Set(["index", "result"]);
      const unknownResult = Object.keys(item).filter((key) => !allowedResult.has(key));
      if (unknownResult.length) {
        throw new CompanyOpsHttpError(400, `Unknown result fields: ${unknownResult.join(", ")}`);
      }
      const index = numberValue(item.index);
      if (!Number.isInteger(index) || index! < 1 || index! > 5) {
        throw new CompanyOpsHttpError(400, "Each result requires a unique index from 1 to 5");
      }
      return {
        index: index!,
        result: boundedText(item.result, `result ${index}`, 6_000, true),
      };
    });
    if (new Set(results.map((item) => item.index)).size !== 5) {
      throw new CompanyOpsHttpError(400, "Result indexes must include each fixed category once");
    }
    const evidenceValues = input.evidenceLinks === undefined
      ? []
      : Array.isArray(input.evidenceLinks)
        ? input.evidenceLinks
        : (() => { throw new CompanyOpsHttpError(400, "evidenceLinks must be a list"); })();
    if (evidenceValues.length > 20) {
      throw new CompanyOpsHttpError(400, "No more than 20 evidence links may be submitted");
    }
    const evidenceLinks = evidenceValues.map((value, index) => {
      const link = boundedText(value, `evidence link ${index + 1}`, 1_000, true);
      try {
        const parsed = new URL(link);
        if (parsed.protocol !== "https:") throw new Error("HTTPS required");
        return parsed.toString();
      } catch {
        throw new CompanyOpsHttpError(400, `evidence link ${index + 1} must be a valid HTTPS URL`);
      }
    });
    const context = boundedText(input.context, "context", 6_000);
    const status = requiredField(target, [CONFIDENTIAL_FIELD.performance.status], [3]);
    const selfReviewField = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.selfReview],
      [1]
    );
    const submittedAt = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.reportSubmittedAt],
      [5]
    );
    const fields: FeishuFields = {
      [status.field_name]: encodeStatus("performance", "Report Submitted"),
      [selfReviewField.field_name]: selfReview,
      [submittedAt.field_name]: Date.now(),
    };
    for (const result of results) {
      const resultField = requiredField(target, [performanceResultField(result.index)], [1]);
      fields[resultField.field_name] = result.result;
    }
    const evidenceField = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.evidenceLinks],
      [1]
    );
    const contextField = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.context],
      [1]
    );
    fields[evidenceField.field_name] = evidenceLinks.join("\n");
    fields[contextField.field_name] = context;
    await this.client.updateRecord(target.appToken, target.tableId, record.record_id, fields);
    return {
      success: true,
      message: "Monthly performance report submitted for founder review",
      recordId: record.record_id,
    };
  }

  private async requestPerformanceChanges(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["performanceId", "feedback"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const feedback = boundedText(input.feedback, "feedback", 6_000, true);
    const { target, record } = await this.performanceRecord(
      principal,
      input.performanceId,
      true
    );
    if (this.performanceStatus(record) !== "Report Submitted") {
      throw new CompanyOpsHttpError(409, "Changes can be requested only for a submitted report");
    }
    const status = requiredField(target, [CONFIDENTIAL_FIELD.performance.status], [3]);
    const review = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.founderReview],
      [1]
    );
    await this.client.updateRecord(target.appToken, target.tableId, record.record_id, {
      [status.field_name]: encodeStatus("performance", "Changes Requested"),
      [review.field_name]: feedback,
    });
    return { success: true, message: "Changes requested from the employee", recordId: record.record_id };
  }

  private async scorePerformanceReview(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["performanceId", "scores", "feedback"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const scores = this.parsePerformanceScores(input.scores);
    const feedback = boundedText(input.feedback, "feedback", 6_000, true);
    const { target, record } = await this.performanceRecord(
      principal,
      input.performanceId,
      true
    );
    const currentStatus = this.performanceStatus(record);
    if (!new Set(["Report Submitted", "Scoring"]).has(currentStatus)) {
      throw new CompanyOpsHttpError(409, "This report is not ready for scoring");
    }
    const weightedScore = rounded(scores.reduce((total, item) => {
      const category = PERFORMANCE_CATEGORIES.find((entry) => entry.index === item.index)!;
      return total + item.score * category.weight / 100;
    }, 0));
    const bonus = weightedScore >= 90
      ? 2_000
      : weightedScore >= 80
        ? 1_500
        : weightedScore >= 70
          ? 1_000
          : weightedScore >= 60
            ? 500
            : 0;
    const personalFactor = weightedScore >= 90
      ? 1
      : weightedScore >= 80
        ? 0.8
        : weightedScore >= 70
          ? 0.5
          : 0;
    const fields: FeishuFields = {};
    for (const item of scores) {
      const category = PERFORMANCE_CATEGORIES.find((entry) => entry.index === item.index)!;
      const scoreField = requiredField(target, [category.scoreField], [2]);
      fields[scoreField.field_name] = item.score;
    }
    const totalField = requiredField(target, [CONFIDENTIAL_FIELD.performance.total], [2]);
    const bonusField = requiredField(target, [CONFIDENTIAL_FIELD.performance.bonus], [2]);
    const factorField = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.personalFactor],
      [2]
    );
    const formulaField = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.bonusFormula],
      [1]
    );
    const scoredAt = requiredField(target, [CONFIDENTIAL_FIELD.performance.scoredAt], [5]);
    const review = requiredField(target, [CONFIDENTIAL_FIELD.performance.founderReview], [1]);
    const status = requiredField(target, [CONFIDENTIAL_FIELD.performance.status], [3]);
    fields[totalField.field_name] = weightedScore;
    fields[bonusField.field_name] = bonus;
    fields[factorField.field_name] = personalFactor;
    fields[formulaField.field_name] = PERFORMANCE_FORMULA_VERSION;
    fields[scoredAt.field_name] = Date.now();
    fields[review.field_name] = feedback;
    fields[status.field_name] = encodeStatus("performance", "Employee Review");
    const dispute = fieldByAlias(target.fields, [CONFIDENTIAL_FIELD.performance.disputeStatus]);
    if (dispute?.type === 3) {
      fields[dispute.field_name] = currentStatus === "Scoring"
        ? "复核中 Reviewing"
        : "无异议 None";
    }
    await this.client.updateRecord(target.appToken, target.tableId, record.record_id, fields);
    return {
      success: true,
      message: `Performance scored ${weightedScore}; handbook bonus CNY ${bonus}`,
      recordId: record.record_id,
    };
  }

  private async respondPerformanceReview(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["performanceId", "response", "comment"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const response = textValue(input.response).toLowerCase();
    if (!new Set(["accept", "challenge"]).has(response)) {
      throw new CompanyOpsHttpError(400, "response must be accept or challenge");
    }
    const comment = boundedText(input.comment, "comment", 3_000, response === "challenge");
    const { target, record } = await this.performanceRecord(principal, input.performanceId);
    if (this.performanceStatus(record) !== "Employee Review") {
      throw new CompanyOpsHttpError(409, "This score is not awaiting employee review");
    }
    const scoredAtValue = dateValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.scoredAt])
    );
    const respondedAtValue = dateValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.employeeRespondedAt])
    );
    if (scoredAtValue === undefined) {
      throw new CompanyOpsConfigurationError("The performance score is missing its review timestamp");
    }
    if (respondedAtValue !== undefined && respondedAtValue >= scoredAtValue) {
      throw new CompanyOpsHttpError(409, "You have already responded to this score");
    }
    const responseField = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.employeeResponse],
      [1]
    );
    const respondedAt = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.employeeRespondedAt],
      [5]
    );
    const dispute = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.disputeStatus],
      [3]
    );
    const fields: FeishuFields = {
      [responseField.field_name]: response === "accept"
        ? `[Accepted]${comment ? ` ${comment}` : ""}`
        : `[Challenged] ${comment}`,
      [respondedAt.field_name]: Date.now(),
      [dispute.field_name]: response === "accept"
        ? "无异议 None"
        : "员工说明 Submitted",
    };
    if (response === "challenge") {
      const status = requiredField(target, [CONFIDENTIAL_FIELD.performance.status], [3]);
      fields[status.field_name] = encodeStatus("performance", "Scoring");
    }
    await this.client.updateRecord(target.appToken, target.tableId, record.record_id, fields);
    return {
      success: true,
      message: response === "accept"
        ? "Performance score accepted"
        : "Performance challenge sent to the founder",
      recordId: record.record_id,
    };
  }

  private async stagePerformanceBonusInPayroll(
    target: ResolvedTarget,
    performanceRecord: FeishuRecord,
    bonus: number
  ): Promise<string> {
    const staffIds = linkedRecordIds(
      recordField(performanceRecord.fields, [CONFIDENTIAL_FIELD.employee])
    );
    if (staffIds.length !== 1) {
      throw new CompanyOpsConfigurationError("The performance cycle must link exactly one employee");
    }
    const month = this.performanceMonth(performanceRecord);
    if (!month) throw new CompanyOpsConfigurationError("The performance cycle has an invalid month");
    const payrollTarget = await this.target("payroll");
    const employee = requiredField(payrollTarget, [CONFIDENTIAL_FIELD.employee], [18]);
    const monthField = requiredField(payrollTarget, [CONFIDENTIAL_FIELD.payroll.month], [1, 5]);
    const bonusField = requiredField(
      payrollTarget,
      [CONFIDENTIAL_FIELD.payroll.performanceBonus],
      [2]
    );
    const statusField = requiredField(payrollTarget, [CONFIDENTIAL_FIELD.payroll.status], [3]);
    const payrollRecords = (await this.client.listRecords(
      payrollTarget.appToken,
      payrollTarget.tableId,
      { maxRecords: 1_000 }
    )).filter((record) =>
      this.linkedToStaff(record, staffIds[0]) && this.compensationPeriod(record).slice(0, 7) === month
    );
    if (payrollRecords.length > 1) {
      throw new CompanyOpsHttpError(409, "Duplicate payroll records exist for this employee and month");
    }
    const existing = payrollRecords[0];
    if (existing) {
      const locked = boolValue(
        recordField(existing.fields, [CONFIDENTIAL_FIELD.payroll.locked])
      );
      const status = normalize(
        textValue(recordField(existing.fields, [CONFIDENTIAL_FIELD.payroll.status]))
      );
      if (locked === true || /paid|已发|已支付|已打款/.test(status)) {
        throw new CompanyOpsHttpError(409, "The matching payroll record is already locked or paid");
      }
      const fields: FeishuFields = { [bonusField.field_name]: bonus };
      if (!status) fields[statusField.field_name] = "待发 Pending";
      await this.client.updateRecord(
        payrollTarget.appToken,
        payrollTarget.tableId,
        existing.record_id,
        fields
      );
      return existing.record_id;
    }
    const primary = requiredField(payrollTarget, ["记录 Record"], [1], true);
    const employeeName = textValue(
      recordField(performanceRecord.fields, [CONFIDENTIAL_FIELD.employee])
    ) || staffIds[0];
    const payroll = await this.client.createRecord(
      payrollTarget.appToken,
      payrollTarget.tableId,
      {
        [primary.field_name]: `${month} · ${employeeName}`,
        [employee.field_name]: [staffIds[0]],
        [monthField.field_name]: storedMonthValue(month, monthField),
        [bonusField.field_name]: bonus,
        [statusField.field_name]: "待发 Pending",
      }
    );
    if (!payroll.record_id) throw new FeishuApiError("Feishu did not return a payroll record ID");
    // `target` is intentionally part of the signature so the caller cannot
    // accidentally stage a bonus detached from the resolved performance table.
    void target;
    return payroll.record_id;
  }

  private async finalizePerformance(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["performanceId", "resolutionNote"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const resolutionNote = boundedText(input.resolutionNote, "resolutionNote", 3_000);
    const { target, record } = await this.performanceRecord(
      principal,
      input.performanceId,
      true
    );
    const statusValue = this.performanceStatus(record);
    const stagedAtValue = dateValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.payrollStagedAt])
    );
    if (statusValue === "Paid") {
      return { success: true, message: "Performance bonus was already paid", recordId: record.record_id };
    }
    if (statusValue === "Confirmed" && stagedAtValue !== undefined) {
      return { success: true, message: "Performance bonus was already staged in payroll", recordId: record.record_id };
    }
    if (!new Set(["Employee Review", "Confirmed"]).has(statusValue)) {
      throw new CompanyOpsHttpError(409, "This performance cycle is not ready to finalize");
    }
    const scoredAtValue = dateValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.scoredAt])
    );
    const respondedAtValue = dateValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.employeeRespondedAt])
    );
    const response = textValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.employeeResponse])
    );
    if (
      scoredAtValue === undefined ||
      respondedAtValue === undefined ||
      respondedAtValue < scoredAtValue ||
      !response.startsWith("[Accepted]")
    ) {
      throw new CompanyOpsHttpError(409, "The employee must accept the latest score before finalization");
    }
    const bonus = numberValue(
      recordField(record.fields, [CONFIDENTIAL_FIELD.performance.bonus])
    );
    if (bonus === undefined || bonus < 0) {
      throw new CompanyOpsConfigurationError("The performance cycle is missing its calculated bonus");
    }
    const payrollId = await this.stagePerformanceBonusInPayroll(target, record, bonus);
    const status = requiredField(target, [CONFIDENTIAL_FIELD.performance.status], [3]);
    const finalizedAt = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.finalizedAt],
      [5]
    );
    const stagedAt = requiredField(
      target,
      [CONFIDENTIAL_FIELD.performance.payrollStagedAt],
      [5]
    );
    const fields: FeishuFields = {
      [status.field_name]: encodeStatus("performance", "Confirmed"),
      [finalizedAt.field_name]: Date.now(),
      [stagedAt.field_name]: Date.now(),
    };
    const dispute = fieldByAlias(target.fields, [CONFIDENTIAL_FIELD.performance.disputeStatus]);
    if (dispute?.type === 3) fields[dispute.field_name] = "已解决 Resolved";
    if (resolutionNote) {
      const review = requiredField(
        target,
        [CONFIDENTIAL_FIELD.performance.founderReview],
        [1]
      );
      const existingReview = textValue(
        recordField(record.fields, [CONFIDENTIAL_FIELD.performance.founderReview])
      );
      fields[review.field_name] = [existingReview, `Final resolution: ${resolutionNote}`]
        .filter(Boolean)
        .join("\n\n");
    }
    await this.client.updateRecord(target.appToken, target.tableId, record.record_id, fields);
    return {
      success: true,
      message: `Performance finalized; CNY ${bonus} staged in pending payroll`,
      recordId: record.record_id,
      recordIds: [record.record_id, payrollId],
    };
  }

  private linkedToStaff(record: FeishuRecord, staffRecordId: string): boolean {
    const employeeValue = recordField(record.fields, [CONFIDENTIAL_FIELD.employee]);
    const links = linkedRecordIds(employeeValue);
    return links.length === 1 && links[0] === staffRecordId;
  }

  private compensationPeriod(record: FeishuRecord): string {
    const value = recordField(record.fields, [
      CONFIDENTIAL_FIELD.commission.month,
      CONFIDENTIAL_FIELD.payroll.month,
    ]);
    if (typeof value === "string") return textValue(value);
    const asDate = isoDate(value);
    return asDate?.slice(0, 10) || textValue(value);
  }

  private async getAcknowledgedPolicyIds(
    principal: CompanyOpsPrincipal
  ): Promise<string[] | undefined> {
    if (!principal.staffRecordId) return undefined;
    const records = await this.listOptional("policyAcknowledgement", 500);
    const acknowledged = new Set<string>();
    for (const record of records) {
      if (!this.linkedToStaff(record, principal.staffRecordId)) continue;
      const acknowledgedBy = idsFromValue(recordField(record.fields, [
        CONFIDENTIAL_FIELD.policy.acknowledgedBy,
      ]));
      if (acknowledgedBy.length !== 1 || acknowledgedBy[0] !== principal.openId) continue;
      if (boolValue(recordField(record.fields, [
        CONFIDENTIAL_FIELD.policy.readAndAcknowledged,
      ])) !== true) continue;
      const document = textValue(recordField(record.fields, [
        CONFIDENTIAL_FIELD.policy.document,
      ]));
      const policyId = POLICY_ID_BY_DOCUMENT.get(document);
      if (policyId) acknowledged.add(policyId);
    }
    return [...acknowledged];
  }

  private async getMyCompensation(
    principal: CompanyOpsPrincipal
  ): Promise<CompanyOpsDashboard["myCompensation"]> {
    if (!principal.staffRecordId) return undefined;
    const [payrollRecords, commissionRecords] = await Promise.all([
      this.listOptional("payroll", 200),
      this.listOptional("commission", 200),
    ]);
    const payroll = payrollRecords
      .filter((record) => this.linkedToStaff(record, principal.staffRecordId!))
      .sort((left, right) => this.compensationPeriod(right).localeCompare(this.compensationPeriod(left)))[0];
    const commission = commissionRecords
      .filter((record) => this.linkedToStaff(record, principal.staffRecordId!))
      .sort((left, right) => this.compensationPeriod(right).localeCompare(this.compensationPeriod(left)))[0];
    if (!payroll && !commission) return undefined;
    return {
      payroll: payroll
        ? {
            period: this.compensationPeriod(payroll),
            baseSalary: numberValue(recordField(payroll.fields, [CONFIDENTIAL_FIELD.payroll.base])),
            performance: numberValue(recordField(payroll.fields, [CONFIDENTIAL_FIELD.payroll.performanceBonus])),
            commission: numberValue(recordField(payroll.fields, [CONFIDENTIAL_FIELD.payroll.commission])),
            bonus: numberValue(recordField(payroll.fields, [CONFIDENTIAL_FIELD.payroll.bonus])),
            reimbursements: numberValue(recordField(payroll.fields, [CONFIDENTIAL_FIELD.payroll.reimbursements])),
            deductions: numberValue(recordField(payroll.fields, [CONFIDENTIAL_FIELD.payroll.deductions])),
            netPay: numberValue(recordField(payroll.fields, [CONFIDENTIAL_FIELD.payroll.netPay])),
            status: textValue(recordField(payroll.fields, [CONFIDENTIAL_FIELD.payroll.status])) || undefined,
          }
        : undefined,
      commission: commission
        ? {
            id: commission.record_id,
            period: this.compensationPeriod(commission),
            attributedRevenue: numberValue(recordField(commission.fields, [CONFIDENTIAL_FIELD.commission.attributedRevenue])),
            rate: numberValue(recordField(commission.fields, [CONFIDENTIAL_FIELD.commission.rate])),
            amount: numberValue(recordField(commission.fields, [CONFIDENTIAL_FIELD.commission.amount])),
            growthBonus: numberValue(recordField(commission.fields, [CONFIDENTIAL_FIELD.commission.growthBonus])),
            status: textValue(recordField(commission.fields, [CONFIDENTIAL_FIELD.commission.status])) || undefined,
            acknowledged: dateValue(recordField(commission.fields, [
              CONFIDENTIAL_FIELD.commission.acknowledgedAt,
            ])) !== undefined,
            disputeDeadline: isoDate(recordField(commission.fields, [
              CONFIDENTIAL_FIELD.commission.disputeDeadline,
            ])),
            locked: boolValue(recordField(commission.fields, [
              CONFIDENTIAL_FIELD.commission.locked,
            ])),
          }
        : undefined,
    };
  }

  private async updateOwnCompensation(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>,
    mode: "acknowledge" | "dispute"
  ): Promise<CompanyOpsActionResult> {
    if (!principal.staffRecordId) {
      throw new CompanyOpsHttpError(403, "Your staff identity is not linked unambiguously");
    }
    const allowed = new Set([
      "payPeriod",
      "compensationId",
      "statementId",
      "reason",
    ]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const payPeriod = textValue(input.payPeriod);
    const suppliedId = textValue(input.compensationId ?? input.statementId);
    if (!payPeriod && !suppliedId) {
      throw new CompanyOpsHttpError(400, "payPeriod or compensationId is required");
    }
    const target = await this.target("commission");
    const records = await this.client.listRecords(target.appToken, target.tableId, { maxRecords: 500 });
    const own = records.filter((record) => this.linkedToStaff(record, principal.staffRecordId!));
    const matches = own.filter((record) => {
      if (suppliedId && record.record_id !== suppliedId) return false;
      if (payPeriod && normalize(this.compensationPeriod(record)) !== normalize(payPeriod)) return false;
      return true;
    });
    if (matches.length !== 1) {
      throw new CompanyOpsHttpError(404, "A unique compensation statement could not be found");
    }
    const statement = matches[0];
    const fields: FeishuFields = {};
    if (mode === "acknowledge") {
      const acknowledgedAt = fieldByAlias(target.fields, [
        CONFIDENTIAL_FIELD.commission.acknowledgedAt,
      ]);
      if (!acknowledgedAt) {
        throw new CompanyOpsConfigurationError(
          `Commission Statements requires ${CONFIDENTIAL_FIELD.commission.acknowledgedAt}`
        );
      }
      if (dateValue(recordField(statement.fields, [acknowledgedAt.field_name])) !== undefined) {
        return {
          success: true,
          message: "Compensation statement already acknowledged",
          recordId: statement.record_id,
        };
      }
      fields[acknowledgedAt.field_name] = Date.now();
    } else {
      const reason = textValue(input.reason);
      if (!reason) throw new CompanyOpsHttpError(400, "reason is required");
      if (reason.length > 3_000) throw new CompanyOpsHttpError(400, "reason is too long");
      const disputeNotes = fieldByAlias(target.fields, [
        CONFIDENTIAL_FIELD.commission.disputeNotes,
      ]);
      const disputeStatus = fieldByAlias(target.fields, [
        CONFIDENTIAL_FIELD.commission.disputeStatus,
      ]);
      const disputeDeadline = fieldByAlias(target.fields, [
        CONFIDENTIAL_FIELD.commission.disputeDeadline,
      ]);
      const locked = fieldByAlias(target.fields, [
        CONFIDENTIAL_FIELD.commission.locked,
      ]);
      if (!disputeNotes || !disputeStatus || !disputeDeadline || !locked) {
        throw new CompanyOpsConfigurationError(
          "Commission Statements requires the exact dispute notes, status, deadline, and locked fields"
        );
      }
      if (boolValue(recordField(statement.fields, [locked.field_name])) === true) {
        throw new CompanyOpsHttpError(409, "This compensation statement is locked");
      }
      const deadlineValue = dateValue(recordField(statement.fields, [disputeDeadline.field_name]));
      if (deadlineValue !== undefined && shanghaiDateKey(deadlineValue) < shanghaiDateKey(Date.now())) {
        throw new CompanyOpsHttpError(409, "The dispute deadline has passed");
      }
      fields[disputeNotes.field_name] = reason;
      fields[disputeStatus.field_name] = "待处理 Raised";
    }
    await this.client.updateRecord(target.appToken, target.tableId, statement.record_id, fields);
    return {
      success: true,
      message: mode === "acknowledge"
        ? "Compensation statement acknowledged"
        : "Compensation dispute submitted",
      recordId: statement.record_id,
    };
  }

  private async requestFounderDecision(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["title", "category", "context", "neededBy"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const title = textValue(input.title);
    const category = textValue(input.category) || "Other";
    const context = textValue(input.context);
    if (!title) throw new CompanyOpsHttpError(400, "title is required");
    if (!context) throw new CompanyOpsHttpError(400, "context is required");
    const record = await this.createMapped(
      "internalRequest",
      {
        title,
        requestType: "其他 Other",
        details: `[Founder Decision: ${category}]\n${context}`,
        neededBy: input.neededBy,
        priority: "高 High",
      },
      REQUEST_SPECS,
      principal,
      { status: "待处理 Open" }
    );
    return {
      success: true,
      message: "Founder decision requested",
      recordId: record.record_id,
    };
  }

  private async completeOnboardingTask(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["taskId"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const taskId = validRecordId(input.taskId);
    const target = await this.target("onboarding");
    const record = await this.client.getRecord(target.appToken, target.tableId, taskId);
    if (principal.role !== "founder" && !this.belongsTo(record, principal)) {
      throw new CompanyOpsHttpError(403, "You can complete only your own onboarding tasks");
    }
    const status = fieldByAlias(target.fields, FIELD.status);
    if (!status) throw new CompanyOpsConfigurationError("The Onboarding table is missing its status field");
    const fields: FeishuFields = { [status.field_name]: "已完成 Done" };
    const completedAt = fieldByAlias(target.fields, ["完成时间 Completed At", "Completed At", "Completion Date", "完成时间"]);
    const completedBy = fieldByAlias(target.fields, ["Completed By", "完成人"]);
    if (completedAt) fields[completedAt.field_name] = Date.now();
    if (completedBy) {
      fields[completedBy.field_name] = completedBy.type === 11
        ? [{ id: principal.openId }]
        : principal.name;
    }
    await this.client.updateRecord(target.appToken, target.tableId, taskId, fields);
    return { success: true, message: "Onboarding task completed", recordId: taskId };
  }

  private async acknowledgePolicy(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["policyId", "version"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const policyId = textValue(input.policyId);
    const version = textValue(input.version);
    const document = POLICY_DOCUMENT_BY_ID[policyId as keyof typeof POLICY_DOCUMENT_BY_ID];
    if (!document) {
      throw new CompanyOpsHttpError(400, "Unsupported policy identifier");
    }
    if (version.length > 160) {
      throw new CompanyOpsHttpError(400, "version is too long");
    }
    if (!principal.staffRecordId) {
      throw new CompanyOpsHttpError(403, "Your staff identity is not linked unambiguously");
    }
    const target = await this.target("policyAcknowledgement");
    const acknowledgementField = fieldByAlias(target.fields, [
      CONFIDENTIAL_FIELD.policy.acknowledgement,
    ]);
    const employeeField = fieldByAlias(target.fields, [CONFIDENTIAL_FIELD.employee]);
    const acknowledgedByField = fieldByAlias(target.fields, [
      CONFIDENTIAL_FIELD.policy.acknowledgedBy,
    ]);
    const documentField = fieldByAlias(target.fields, [
      CONFIDENTIAL_FIELD.policy.document,
    ]);
    const versionField = fieldByAlias(target.fields, [
      CONFIDENTIAL_FIELD.policy.version,
    ]);
    const readField = fieldByAlias(target.fields, [
      CONFIDENTIAL_FIELD.policy.readAndAcknowledged,
    ]);
    if (
      !acknowledgementField ||
      !employeeField ||
      !acknowledgedByField ||
      !documentField ||
      !versionField ||
      !readField
    ) {
      throw new CompanyOpsConfigurationError(
        "The Policy Acknowledgements table does not match the required acknowledgement schema"
      );
    }
    const existing = (await this.client.listRecords(target.appToken, target.tableId, { maxRecords: 500 }))
      .find((record) =>
        this.linkedToStaff(record, principal.staffRecordId!) &&
        idsFromValue(recordField(record.fields, [acknowledgedByField.field_name])).includes(principal.openId) &&
        textValue(recordField(record.fields, [documentField.field_name])) === document &&
        boolValue(recordField(record.fields, [readField.field_name])) === true &&
        (!version || textValue(recordField(record.fields, [versionField.field_name])) === version)
      );
    if (existing) {
      return { success: true, message: "Policy acknowledgement already recorded", recordId: existing.record_id };
    }
    const fields: FeishuFields = {
      [acknowledgementField.field_name]: [
        principal.name,
        document,
        version,
      ].filter(Boolean).join(" · "),
      [employeeField.field_name]: [principal.staffRecordId],
      [acknowledgedByField.field_name]: [{ id: principal.openId }],
      [documentField.field_name]: document,
      [readField.field_name]: true,
    };
    if (versionField && version) fields[versionField.field_name] = version;
    const record = await this.client.createRecord(target.appToken, target.tableId, fields);
    return { success: true, message: "Policy acknowledgement recorded", recordId: record.record_id };
  }

  private async resolveDecision(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>,
    outcome: "Approved" | "Changes Requested"
  ): Promise<CompanyOpsActionResult> {
    if (principal.role !== "founder") {
      throw new CompanyOpsHttpError(403, "Only the founder can resolve decisions");
    }
    const allowed = new Set(["decisionId", "feedback", "actionType"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const decisionId = validRecordId(input.decisionId);
    const feedback = textValue(input.feedback);
    const actionType = textValue(input.actionType) || "founder_decision";
    if (feedback.length > 3_000) throw new CompanyOpsHttpError(400, "feedback is too long");
    if (actionType === "access_request") {
      if (outcome === "Approved") {
        return this.approveAccess(principal, { requestRecordId: decisionId });
      }
      const target = await this.target("internalRequest");
      const record = await this.client.getRecord(target.appToken, target.tableId, decisionId);
      if (!/company operations access|权限/.test(
        normalize(textValue(recordField(record.fields, ["请求 Request", "Request", "Title"])))
      )) {
        throw new CompanyOpsHttpError(400, "That record is not an access request");
      }
      const status = fieldByAlias(target.fields, FIELD.status);
      if (!status) throw new CompanyOpsConfigurationError("Internal Requests is missing its status field");
      await this.client.updateRecord(target.appToken, target.tableId, decisionId, {
        [status.field_name]: "拒绝 Declined",
      });
      return { success: true, message: "Access request declined", recordId: decisionId };
    }

    if (actionType === "expense") {
      const target = await this.target("expense");
      await this.client.getRecord(target.appToken, target.tableId, decisionId);
      const status = fieldByAlias(target.fields, FIELD.status);
      if (!status) throw new CompanyOpsConfigurationError("Expenses is missing its status field");
      await this.client.updateRecord(target.appToken, target.tableId, decisionId, {
        [status.field_name]: outcome === "Approved" ? "已批准 Approved" : "已拒绝 Rejected",
      });
      return {
        success: true,
        message: outcome === "Approved" ? "Expense approved" : "Expense rejected",
        recordId: decisionId,
      };
    }

    if (actionType === "weekly_report") {
      const target = await this.target("weeklyReport");
      await this.client.getRecord(target.appToken, target.tableId, decisionId);
      const status = fieldByAlias(target.fields, FIELD.status);
      if (!status) throw new CompanyOpsConfigurationError("Weekly Reports is missing its status field");
      const fields: FeishuFields = {
        [status.field_name]: outcome === "Approved" ? "创始人已阅 Reviewed" : "已提交 Submitted",
      };
      const founderFeedback = fieldByAlias(target.fields, ["创始人反馈 Founder Feedback", "Founder Feedback"]);
      if (founderFeedback) {
        fields[founderFeedback.field_name] = feedback ||
          (outcome === "Approved" ? "Reviewed" : "Changes requested");
      }
      await this.client.updateRecord(target.appToken, target.tableId, decisionId, fields);
      return {
        success: true,
        message: outcome === "Approved" ? "Weekly report reviewed" : "Changes requested",
        recordId: decisionId,
      };
    }

    if (actionType !== "founder_decision") {
      throw new CompanyOpsHttpError(400, "Unknown decision type");
    }
    const target = await this.target("internalRequest");
    const record = await this.client.getRecord(target.appToken, target.tableId, decisionId);
    const details = normalize(
      textValue(recordField(record.fields, ["备注 Notes", "Details", "Description", "申请详情"]))
    );
    if (!/\[founder decision:/.test(details)) {
      throw new CompanyOpsHttpError(400, "That record is not a founder decision request");
    }
    const status = fieldByAlias(target.fields, FIELD.status);
    if (!status) throw new CompanyOpsConfigurationError("Internal Requests is missing its status field");
    const fields: FeishuFields = {
      [status.field_name]: outcome === "Approved" ? "完成 Done" : "进行中 Doing",
    };
    const founderFeedback = fieldByAlias(target.fields, ["处理结果 Resolution", "Founder Feedback", "Decision Feedback", "创始人反馈"]);
    const reviewedBy = fieldByAlias(target.fields, ["Reviewed By", "Decision By", "审核人"]);
    const reviewedAt = fieldByAlias(target.fields, ["Reviewed At", "Decision Date", "审核时间"]);
    if (founderFeedback && feedback) fields[founderFeedback.field_name] = feedback;
    if (reviewedBy) {
      fields[reviewedBy.field_name] = reviewedBy.type === 11
        ? [{ id: principal.openId }]
        : principal.name;
    }
    if (reviewedAt) fields[reviewedAt.field_name] = Date.now();
    await this.client.updateRecord(target.appToken, target.tableId, decisionId, fields);
    return {
      success: true,
      message: outcome === "Approved" ? "Decision approved" : "Changes requested",
      recordId: decisionId,
    };
  }

  private async generateOnboarding(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["newHireOpenId", "newHireName", "role", "startDate"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const newHireOpenId = textValue(input.newHireOpenId);
    const newHireName = textValue(input.newHireName);
    const role = onboardingRole(input.role);
    const inputStartDate = dateValue(input.startDate);
    if (!/^ou_[A-Za-z0-9_-]+$/.test(newHireOpenId)) throw new CompanyOpsHttpError(400, "A valid new-hire Feishu Open ID is required");
    if (!newHireName) throw new CompanyOpsHttpError(400, "newHireName is required");
    if (newHireName.length > 200) throw new CompanyOpsHttpError(400, "newHireName is too long");
    if (inputStartDate === undefined) {
      throw new CompanyOpsHttpError(400, "startDate must be a valid date");
    }
    const startDateKey = shanghaiDateKey(inputStartDate);
    const startDate = Date.parse(`${startDateKey}T00:00:00+08:00`);

    const [caseTarget, templateTarget, taskTarget] = await Promise.all([
      this.target("onboardingCase"),
      this.target("onboardingTemplate"),
      this.target("onboarding"),
    ]);
    const exactField = (
      target: ResolvedTarget,
      fieldName: string,
      expectedType: number
    ): FeishuField => {
      const result = target.fields.find((field) => field.field_name === fieldName);
      if (!result || result.type !== expectedType) {
        throw new CompanyOpsConfigurationError(
          `${this.config.tables[target.resource].names[0]} requires ${fieldName}`
        );
      }
      return result;
    };

    const templateKeyField = exactField(templateTarget, "模板编号 Template Key", 1);
    const templateTaskField = exactField(templateTarget, "任务 Task", 1);
    const templateRolesField = exactField(templateTarget, "适用岗位 Roles", 4);
    const templateCategoryField = exactField(templateTarget, "类别 Category", 3);
    const templateRelativeDayField = exactField(templateTarget, "相对天数 Relative Day", 2);
    const templateOwnerRoleField = exactField(templateTarget, "负责人角色 Owner Role", 3);
    const templateRequiredField = exactField(templateTarget, "必做 Required", 7);
    const templateInstructionsField = exactField(templateTarget, "说明 Instructions", 1);
    const templateResourceField = exactField(templateTarget, "资料链接 Resource URL", 15);
    const templateActiveField = exactField(templateTarget, "启用 Active", 7);
    const templateSortField = exactField(templateTarget, "排序 Sort Order", 2);

    type SelectedTemplate = {
      recordId: string;
      key: string;
      task: string;
      category: string;
      relativeDay: number;
      ownerRole: string;
      required: boolean;
      instructions: string;
      resourceUrl?: string;
      sortOrder: number;
    };
    const templateRecords = await this.client.listRecords(
      templateTarget.appToken,
      templateTarget.tableId,
      { maxRecords: 1_000 }
    );
    const selectedTemplates: SelectedTemplate[] = [];
    const selectedKeys = new Set<string>();
    for (const template of templateRecords) {
      if (boolValue(template.fields[templateActiveField.field_name]) !== true) continue;
      const roles = selectionValues(template.fields[templateRolesField.field_name]);
      const applies = roles.some((candidate) => {
        const normalized = normalize(candidate);
        return normalized === normalize("全员 All") || normalized === normalize(role);
      });
      if (!applies) continue;

      const key = textValue(template.fields[templateKeyField.field_name]);
      const task = textValue(template.fields[templateTaskField.field_name]);
      const category = textValue(template.fields[templateCategoryField.field_name]);
      const relativeDay = numberValue(template.fields[templateRelativeDayField.field_name]);
      const ownerRole = textValue(template.fields[templateOwnerRoleField.field_name]);
      const required = boolValue(template.fields[templateRequiredField.field_name]);
      const instructions = textValue(template.fields[templateInstructionsField.field_name]);
      const resourceUrl = textValue(template.fields[templateResourceField.field_name]) || undefined;
      const sortOrder = numberValue(template.fields[templateSortField.field_name]) ?? 0;
      if (!key || !task) {
        throw new CompanyOpsConfigurationError(
          "Every active onboarding template requires a Template Key and Task"
        );
      }
      if (selectedKeys.has(normalize(key))) {
        throw new CompanyOpsConfigurationError(
          `Active onboarding template keys must be unique: ${key}`
        );
      }
      selectedKeys.add(normalize(key));
      if (!ONBOARDING_CATEGORIES.has(category)) {
        throw new CompanyOpsConfigurationError(
          `Onboarding template ${key} has an unsupported category`
        );
      }
      if (!Number.isInteger(relativeDay) || relativeDay! < -365 || relativeDay! > 3_650) {
        throw new CompanyOpsConfigurationError(
          `Onboarding template ${key} requires a valid Relative Day`
        );
      }
      if (!ONBOARDING_OWNER_ROLES.has(ownerRole)) {
        throw new CompanyOpsConfigurationError(
          `Onboarding template ${key} has an unsupported Owner Role`
        );
      }
      if (required === undefined) {
        throw new CompanyOpsConfigurationError(
          `Onboarding template ${key} requires the Required checkbox`
        );
      }
      if (resourceUrl) {
        try {
          if (new URL(resourceUrl).protocol !== "https:") throw new Error("HTTPS required");
        } catch {
          throw new CompanyOpsConfigurationError(
            `Onboarding template ${key} has an invalid Resource URL`
          );
        }
      }
      selectedTemplates.push({
        recordId: template.record_id,
        key,
        task,
        category,
        relativeDay: relativeDay!,
        ownerRole,
        required,
        instructions,
        resourceUrl,
        sortOrder,
      });
    }
    selectedTemplates.sort(
      (left, right) => left.sortOrder - right.sortOrder || left.key.localeCompare(right.key)
    );
    if (!selectedTemplates.length) {
      throw new CompanyOpsHttpError(
        409,
        `No active onboarding templates match 全员 All or ${role}`
      );
    }

    const casePrimary = exactField(caseTarget, "入职案例 Case", 1);
    const caseEmployeeName = exactField(caseTarget, "员工姓名 Employee Name", 1);
    const caseUser = exactField(caseTarget, "飞书用户 Feishu User", 11);
    const caseRole = exactField(caseTarget, "岗位 Role", 3);
    const caseStartDate = exactField(caseTarget, "入职日期 Start Date", 5);
    const caseStatus = exactField(caseTarget, "状态 Status", 3);
    const caseProgress = exactField(caseTarget, "完成率 Progress %", 2);
    const caseConfidential = exactField(caseTarget, "保密资料 Confidential Details", 3);
    const casePolicy = exactField(caseTarget, "制度确认 Policy Acknowledgement", 3);
    const caseDay30 = exactField(caseTarget, "30天复盘 Day 30 Review", 5);
    const caseDay60 = exactField(caseTarget, "60天复盘 Day 60 Review", 5);
    const caseDay90 = exactField(caseTarget, "90天复盘 Day 90 Review", 5);
    const cases = await this.client.listRecords(caseTarget.appToken, caseTarget.tableId, {
      maxRecords: 1_000,
    });
    const matchingCases = cases.filter((record) => {
      if (!idsFromValue(record.fields[caseUser.field_name]).includes(newHireOpenId)) {
        return false;
      }
      const storedStartDate = dateValue(record.fields[caseStartDate.field_name]);
      return storedStartDate !== undefined && shanghaiDateKey(storedStartDate) === startDateKey;
    });
    if (matchingCases.length > 1) {
      throw new CompanyOpsHttpError(
        409,
        "More than one onboarding case exists for this employee and start date"
      );
    }
    const existingCase = matchingCases[0];
    if (
      existingCase &&
      normalize(textValue(existingCase.fields[caseRole.field_name])) !== normalize(role)
    ) {
      throw new CompanyOpsHttpError(
        409,
        "The existing onboarding case has a different role"
      );
    }
    const caseRecord = existingCase || await this.client.createRecord(
      caseTarget.appToken,
      caseTarget.tableId,
      {
        [casePrimary.field_name]: `${newHireName} · ${startDateKey}`,
        [caseEmployeeName.field_name]: newHireName,
        [caseUser.field_name]: [{ id: newHireOpenId }],
        [caseRole.field_name]: role,
        [caseStartDate.field_name]: startDate,
        [caseStatus.field_name]: "进行中 Active",
        [caseProgress.field_name]: 0,
        [caseConfidential.field_name]: "未提交 Missing",
        [casePolicy.field_name]: "未完成 Missing",
        [caseDay30.field_name]: startDate + 30 * 86_400_000,
        [caseDay60.field_name]: startDate + 60 * 86_400_000,
        [caseDay90.field_name]: startDate + 90 * 86_400_000,
      }
    );
    const caseId = caseRecord.record_id;
    if (!caseId) throw new FeishuApiError("Feishu did not return an onboarding case ID");

    const taskPrimary = exactField(taskTarget, "任务 Task", 1);
    const taskCase = exactField(taskTarget, "入职案例 Case", 18);
    const taskTemplate = exactField(taskTarget, "任务模板 Template", 18);
    const taskCategory = exactField(taskTarget, "类别 Category", 3);
    const taskAssignee = exactField(taskTarget, "负责人 Assignee", 11);
    const taskDue = exactField(taskTarget, "截止日期 Due", 5);
    const taskStatus = exactField(taskTarget, "状态 Status", 3);
    const taskRequired = exactField(taskTarget, "必做 Required", 7);
    const taskInstructions = exactField(taskTarget, "说明 Instructions", 1);
    const taskResource = exactField(taskTarget, "资料链接 Resource URL", 15);
    const taskNotes = exactField(taskTarget, "备注 Notes", 1);
    const existingTasks = await this.client.listRecords(taskTarget.appToken, taskTarget.tableId, {
      maxRecords: 2_000,
    });
    const taskIdByTemplate = new Map<string, string>();
    for (const task of existingTasks) {
      if (!linkedRecordIds(task.fields[taskCase.field_name]).includes(caseId)) continue;
      const templateIds = linkedRecordIds(task.fields[taskTemplate.field_name]);
      if (templateIds.length !== 1) continue;
      const templateId = templateIds[0];
      if (taskIdByTemplate.has(templateId)) {
        throw new CompanyOpsHttpError(
          409,
          "Duplicate onboarding tasks exist for one case and template"
        );
      }
      taskIdByTemplate.set(templateId, task.record_id);
    }

    const createdTaskIds: string[] = [];
    const fallbackCounts = new Map<string, number>();
    for (const template of selectedTemplates) {
      if (taskIdByTemplate.has(template.recordId)) continue;
      const directOwner = template.ownerRole === "新员工 New Hire"
        ? newHireOpenId
        : principal.openId;
      const isFallback = !new Set(["新员工 New Hire", "创始人 Founder"]).has(
        template.ownerRole
      );
      const fields: FeishuFields = {
        [taskPrimary.field_name]: template.task,
        [taskCase.field_name]: [caseId],
        [taskTemplate.field_name]: [template.recordId],
        [taskCategory.field_name]: template.category,
        [taskAssignee.field_name]: [{ id: directOwner }],
        [taskDue.field_name]: startDate + template.relativeDay * 86_400_000,
        [taskStatus.field_name]: "未开始 Todo",
        [taskRequired.field_name]: template.required,
      };
      if (template.instructions) {
        fields[taskInstructions.field_name] = template.instructions;
      }
      if (template.resourceUrl) {
        fields[taskResource.field_name] = {
          link: template.resourceUrl,
          text: template.resourceUrl,
        };
      }
      if (isFallback) {
        fallbackCounts.set(
          template.ownerRole,
          (fallbackCounts.get(template.ownerRole) || 0) + 1
        );
        fields[taskNotes.field_name] =
          `负责人回退 Owner fallback: ${template.ownerRole} is not mapped to a specific ` +
          `Feishu user, so this task is temporarily assigned to founder ${principal.name}. ` +
          "Reassign it in Feishu; the new hire assignment was not overwritten.";
      }
      const task = await this.client.createRecord(
        taskTarget.appToken,
        taskTarget.tableId,
        fields
      );
      if (!task.record_id) throw new FeishuApiError("Feishu did not return an onboarding task ID");
      createdTaskIds.push(task.record_id);
      taskIdByTemplate.set(template.recordId, task.record_id);
    }
    const taskIds = selectedTemplates
      .map((template) => taskIdByTemplate.get(template.recordId))
      .filter((recordId): recordId is string => Boolean(recordId));
    const warning = fallbackCounts.size
      ? `Temporary founder assignment used for ${[...fallbackCounts.entries()]
          .map(([owner, count]) => `${count} ${owner}`)
          .join(", ")} task(s). Reassign these in Feishu when the responsible ` +
        "Manager/Admin owner is known; new-hire assignments were not overwritten."
      : undefined;
    return {
      success: true,
      message: createdTaskIds.length
        ? `${existingCase ? "Reused" : "Created"} ${newHireName}'s onboarding case and created ${createdTaskIds.length} task(s)`
        : `${newHireName}'s onboarding case and tasks were already present`,
      recordId: caseId,
      recordIds: taskIds,
      caseId,
      taskIds,
      warning,
    };
  }

  private async requestAccess(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["requestedRole", "reason"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const requestedRole = textValue(input.requestedRole) || "staff";
    if (!new Set(["growth", "staff", "finance"]).has(requestedRole)) {
      throw new CompanyOpsHttpError(400, "requestedRole must be growth, finance, or staff");
    }
    const reason = textValue(input.reason);
    if (reason.length > 1_000) throw new CompanyOpsHttpError(400, "reason is too long");

    const target = await this.target("internalRequest");
    const records = await this.client.listRecords(target.appToken, target.tableId, { maxRecords: 200 });
    const existing = records.find((record) =>
      this.belongsTo(record, principal) &&
      /company operations access|权限/.test(
        normalize(textValue(recordField(record.fields, ["请求 Request", "Request", "Title"])))
      ) &&
      !new Set(["Done", "Rejected"]).has(
        decodeStatus("internalRequest", recordField(record.fields, FIELD.status)) || ""
      )
    );
    if (existing) {
      return { success: true, message: "Your access request is already awaiting review", recordId: existing.record_id };
    }
    const record = await this.createMapped(
      "internalRequest",
      {
        title: `Company Operations access — ${principal.name}`,
        requestType: "IT/账号 IT & Accounts",
        details: `Requested role: ${requestedRole}${reason ? `\nReason: ${reason}` : ""}`,
        priority: "高 High",
      },
      REQUEST_SPECS,
      principal,
      { status: "待处理 Open" }
    );
    return { success: true, message: "Access request sent to the founder", recordId: record.record_id };
  }

  private async approveAccess(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    if (principal.role !== "founder") {
      throw new CompanyOpsHttpError(403, "Only the founder can approve access");
    }
    const allowed = new Set(["requestRecordId", "openId", "name", "role", "jobTitle"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const requestRecordId = validRecordId(input.requestRecordId);

    const requestTarget = await this.target("internalRequest");
    const request = await this.client.getRecord(
      requestTarget.appToken,
      requestTarget.tableId,
      requestRecordId
    );
    const requestTitle = textValue(
      recordField(request.fields, ["请求 Request", "Request", "Title"])
    );
    if (!/company operations access|权限/i.test(requestTitle)) {
      throw new CompanyOpsHttpError(400, "That record is not an access request");
    }
    const requesterValue = recordField(request.fields, [
      "提出人（飞书） Requested By (Feishu)",
      "Requested By",
      "Submitted By",
    ]);
    const requesterIds = idsFromValue(requesterValue);
    if (requesterIds.length !== 1) {
      throw new CompanyOpsConfigurationError(
        "The access request must contain one unambiguous Feishu requester"
      );
    }
    const openId = requesterIds[0];
    if (input.openId && textValue(input.openId) !== openId) {
      throw new CompanyOpsHttpError(400, "The requested identity does not match the access request");
    }
    const details = textValue(
      recordField(request.fields, ["备注 Notes", "Details", "Description"])
    );
    const requestedRole = details.match(/Requested role:\s*(growth|finance|staff)/i)?.[1]?.toLowerCase();
    const roleValue = textValue(input.role) || requestedRole;
    if (!new Set(["growth", "finance", "staff"]).has(roleValue || "")) {
      throw new CompanyOpsHttpError(400, "role must be growth, finance, or staff");
    }
    const role = roleValue as "growth" | "finance" | "staff";
    const name = textValue(input.name) || textValue(requesterValue);
    if (!name || name === openId) {
      throw new CompanyOpsConfigurationError("The access request is missing the employee name");
    }

    const staffTarget = await this.target("staff");
    const openIdField = fieldByAlias(staffTarget.fields, [
      "飞书用户 Feishu User",
      "Feishu Open ID",
      "Feishu OpenID",
      "飞书 Open ID",
      "飞书OpenID",
    ]);
    if (!openIdField) {
      throw new CompanyOpsConfigurationError("The Staff register requires a Feishu User field before access can be approved");
    }
    const staffRecords = await this.client.listRecords(staffTarget.appToken, staffTarget.tableId, { maxRecords: 500 });
    const existing = staffRecords.find((record) =>
      idsFromValue(recordField(record.fields, [openIdField.field_name])).includes(openId)
    );
    const primary = fieldByAlias(staffTarget.fields, ["姓名 Name", "Name", "Employee", "姓名"], true);
    if (!primary) throw new CompanyOpsConfigurationError("The Staff register is missing its employee-name field");
    const fields: FeishuFields = {
      [primary.field_name]: name,
      [openIdField.field_name]: openIdField.type === 11 ? [{ id: openId }] : openId,
    };
    const roleField = fieldByAlias(staffTarget.fields, ["应用角色 App Role", "App Role"]);
    const statusField = fieldByAlias(staffTarget.fields, ["状态 Status", "Status", "Employment Status", "状态"]);
    if (!roleField || !statusField) {
      throw new CompanyOpsConfigurationError("The Staff register requires App Role and Status fields");
    }
    fields[roleField.field_name] = {
      growth: "增长 Growth",
      finance: "财务 Finance",
      staff: "员工 Staff",
    }[role];
    fields[statusField.field_name] = "在职 Active";
    const staffRecord = existing
      ? await this.client.updateRecord(staffTarget.appToken, staffTarget.tableId, existing.record_id, fields)
      : await this.client.createRecord(staffTarget.appToken, staffTarget.tableId, fields);

    const requestStatus = fieldByAlias(requestTarget.fields, FIELD.status);
    if (requestStatus) {
      await this.client.updateRecord(requestTarget.appToken, requestTarget.tableId, requestRecordId, {
        [requestStatus.field_name]: "完成 Done",
      });
    }

    let warning: string | undefined;
    if (this.config.sharedAssetsFolderToken) {
      try {
        await this.client.addDriveMember(
          this.config.sharedAssetsFolderToken,
          "folder",
          openId,
          role === "growth" ? "edit" : "view"
        );
      } catch {
        warning = "Access was approved, but the private shared-assets folder could not be added automatically";
      }
    }
    return {
      success: true,
      message: `${name} now has ${role} access`,
      recordId: staffRecord.record_id,
      warning,
    };
  }

  private campaignStatus(record: FeishuRecord): string {
    return decodeStatus("campaign", recordField(record.fields, FIELD.status)) || "Planning";
  }

  private campaignField(
    target: ResolvedTarget,
    key: string,
    required = true,
  ): FeishuField | undefined {
    const spec = CAMPAIGN_SPECS.find((item) => item.key === key);
    if (!spec) throw new CompanyOpsConfigurationError(`Unknown campaign field ${key}`);
    const field = fieldByAlias(target.fields, spec.aliases, spec.primary);
    if (!field && required) {
      throw new CompanyOpsConfigurationError(
        `The campaign table is missing required workflow field ${spec.aliases[0]}`,
      );
    }
    return field;
  }

  private setCampaignValue(
    output: FeishuFields,
    target: ResolvedTarget,
    key: string,
    value: unknown,
    required = true,
  ): void {
    const spec = CAMPAIGN_SPECS.find((item) => item.key === key)!;
    const field = this.campaignField(target, key, required);
    if (!field) return;
    output[field.field_name] = this.serializeInput(value, spec, field);
  }

  private async campaignRevenues(campaignCodes: readonly string[]): Promise<Map<string, {
    grossCollected: number;
    orderCount: number;
    currency: string;
  }>> {
    const result = new Map<string, { grossCollected: number; orderCount: number; currency: string }>();
    if (!campaignCodes.length) return result;
    try {
      const { paidRevenueByCampaignCodes } = await import(
        "../db/repositories/productOrders.ts"
      );
      const rows = await paidRevenueByCampaignCodes(campaignCodes);
      for (const row of rows) {
        const current = result.get(row.campaignCode) || {
          grossCollected: 0,
          orderCount: 0,
          currency: row.currency || "CNY",
        };
        current.grossCollected += row.grossCollected;
        current.orderCount += row.orderCount;
        current.currency = row.currency || current.currency;
        result.set(row.campaignCode, current);
      }
    } catch {
      return result;
    }
    return result;
  }

  private async campaignOrderRows(campaignCode: string): Promise<PaidOrderRow[]> {
    if (!campaignCode) return [];
    try {
      const { paidOrderRowsByCampaignCode } = await import(
        "../db/repositories/productOrders.ts"
      );
      return await paidOrderRowsByCampaignCode(campaignCode);
    } catch {
      return [];
    }
  }

  private async updateCampaignProposal(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>,
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set([
      "campaignId", "name", "objective", "targetAudience", "offer", "product",
      "channels", "budget", "start", "end", "revenueTarget", "successCriteria",
    ]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    assertNoHealthData(input);
    const campaignId = validRecordId(input.campaignId);
    const target = await this.target("campaign");
    const record = await this.client.getRecord(target.appToken, target.tableId, campaignId);
    if (principal.role !== "growth" || !this.belongsTo(record, principal)) {
      throw new CompanyOpsHttpError(403, "Only the campaign owner can revise this proposal");
    }
    if (!["Planning", "Changes Requested"].includes(this.campaignStatus(record))) {
      throw new CompanyOpsHttpError(409, "Only a draft or change-requested campaign can be revised");
    }
    const start = dateValue(input.start);
    const end = dateValue(input.end);
    if (start === undefined || end === undefined || end < start) {
      throw new CompanyOpsHttpError(400, "The campaign end date must be on or after its start date");
    }
    const normalized = {
      name: input.name,
      objective: input.objective,
      audience: textValue(input.targetAudience)
        .split(/[,，/]+/)
        .map((item) => choice(item, "targetAudience", AUDIENCE_OPTIONS)),
      offer: input.offer,
      product: choice(input.product, "product", CAMPAIGN_PRODUCT_OPTIONS),
      channels: textValue(input.channels)
        .split(/[,，/]+/)
        .map((item) => choice(item, "channels", CHANNEL_OPTIONS)),
      budget: input.budget,
      startDate: input.start,
      endDate: input.end,
      revenueTarget: input.revenueTarget,
      successCriteria: input.successCriteria,
    };
    const fields = this.mappedFields(normalized, CAMPAIGN_SPECS, target, principal, {
      status: "待批准 Pending Approval",
      submittedAt: Date.now(),
    });
    await this.client.updateRecord(target.appToken, target.tableId, campaignId, fields);
    return { success: true, message: "Campaign proposal updated and resubmitted", recordId: campaignId };
  }

  private async reviewCampaign(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>,
  ): Promise<CompanyOpsActionResult> {
    if (principal.role !== "founder") {
      throw new CompanyOpsHttpError(403, "Only the founder can review campaigns");
    }
    const allowed = new Set([
      "campaignId", "decision", "feedback", "attributionSharePercent",
      "flatFeeAmount", "originatorName", "managerName", "closerName",
    ]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const campaignId = validRecordId(input.campaignId);
    const decision = textValue(input.decision).toLowerCase();
    if (!["approve", "changes", "reject"].includes(decision)) {
      throw new CompanyOpsHttpError(400, "decision must be approve, changes or reject");
    }
    const feedback = textValue(input.feedback);
    if ((decision === "changes" || decision === "reject") && !feedback) {
      throw new CompanyOpsHttpError(400, "Feedback is required when requesting changes or rejecting a campaign");
    }
    if (feedback.length > 3_000) throw new CompanyOpsHttpError(400, "feedback is too long");
    const target = await this.target("campaign");
    const record = await this.client.getRecord(target.appToken, target.tableId, campaignId);
    if (this.campaignStatus(record) !== "Pending Approval") {
      throw new CompanyOpsHttpError(409, "This campaign is not awaiting approval");
    }
    const fields: FeishuFields = {};
    this.setCampaignValue(fields, target, "status", decision === "approve"
      ? "已批准 Approved"
      : decision === "changes"
        ? "需修改 Changes Requested"
        : "已拒绝 Rejected");
    this.setCampaignValue(fields, target, "reviewNote", feedback || "Approved");
    const approver = this.campaignField(target, "approver");
    if (approver) {
      fields[approver.field_name] = approver.type === 11
        ? [{ id: principal.openId }]
        : principal.name;
    }
    if (decision !== "approve") {
      await this.client.updateRecord(target.appToken, target.tableId, campaignId, fields);
      return {
        success: true,
        message: decision === "changes" ? "Campaign returned for changes" : "Campaign rejected",
        recordId: campaignId,
      };
    }

    const product = textValue(recordField(record.fields, ["产品 Product", "Product"]));
    const requestedShare = input.attributionSharePercent === undefined || input.attributionSharePercent === ""
      ? 100
      : numberValue(input.attributionSharePercent);
    if (requestedShare === undefined || requestedShare < 0 || requestedShare > 100) {
      throw new CompanyOpsHttpError(400, "attributionSharePercent must be between 0 and 100");
    }
    const flatFeeAmount = input.flatFeeAmount === undefined || input.flatFeeAmount === ""
      ? undefined
      : numberValue(input.flatFeeAmount);
    if (flatFeeAmount !== undefined && flatFeeAmount < 0) {
      throw new CompanyOpsHttpError(400, "flatFeeAmount must be zero or greater");
    }
    const rule = campaignCommissionRule({
      product,
      flatFeeAmount,
      attributionSharePercent: requestedShare,
    });
    if (rule.requiresWrittenFee && !flatFeeAmount) {
      throw new CompanyOpsHttpError(
        400,
        "Team/institution, presentation, workshop and camp campaigns need a pre-approved written flat fee",
      );
    }
    const ownerIds = idsFromValue(recordField(record.fields, [
      "负责人 Owner", "Owner", ...FIELD.createdByOpenId,
    ]));
    if (ownerIds.length !== 1) {
      throw new CompanyOpsConfigurationError("The campaign must have exactly one Feishu owner before approval");
    }
    const campaignCode = textValue(recordField(record.fields, [
      "活动代码 Campaign Code", "Campaign Code",
    ])) || `CMP-${campaignMonthCode()}-${stableOpaqueCode("", campaignId, 6).replace(/^-/, "")}`;
    const staffCode = textValue(recordField(record.fields, [
      "员工归因代码 Staff Attribution Code", "Staff Attribution Code",
    ])) || stableOpaqueCode("STF", ownerIds[0], 7);
    const channels = stringListValue(recordField(record.fields, ["渠道 Channels", "Channels"]));
    const trackingLinks = campaignTrackingLinks({
      campaignCode,
      staffAttributionCode: staffCode,
      channels,
      product,
    });
    this.setCampaignValue(fields, target, "approvedAt", Date.now());
    this.setCampaignValue(fields, target, "campaignCode", campaignCode);
    this.setCampaignValue(fields, target, "staffAttributionCode", staffCode);
    this.setCampaignValue(fields, target, "trackingKit", JSON.stringify(trackingLinks));
    this.setCampaignValue(fields, target, "attributionSharePercent", rule.attributionSharePercent);
    this.setCampaignValue(fields, target, "commissionRatePercent", rule.ratePercent);
    this.setCampaignValue(fields, target, "commissionType", rule.commissionType);
    if (rule.ratePercentAboveThreshold !== undefined) {
      this.setCampaignValue(fields, target, "ratePercentAboveThreshold", rule.ratePercentAboveThreshold);
    }
    if (rule.thresholdAmount !== undefined) {
      this.setCampaignValue(fields, target, "thresholdAmount", rule.thresholdAmount);
    }
    if (rule.flatFeeAmount !== undefined) {
      this.setCampaignValue(fields, target, "flatFeeAmount", rule.flatFeeAmount);
    }
    this.setCampaignValue(fields, target, "commissionRule", rule.label);
    this.setCampaignValue(fields, target, "originatorName", textValue(input.originatorName) || undefined);
    this.setCampaignValue(fields, target, "managerName", textValue(input.managerName) || undefined);
    this.setCampaignValue(fields, target, "closerName", textValue(input.closerName) || undefined);
    await this.client.updateRecord(target.appToken, target.tableId, campaignId, fields);
    return {
      success: true,
      message: `Campaign approved and ${trackingLinks.length} tracking link${trackingLinks.length === 1 ? "" : "s"} generated`,
      recordId: campaignId,
    };
  }

  private async activateCampaign(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>,
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["campaignId"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const campaignId = validRecordId(input.campaignId);
    const target = await this.target("campaign");
    const record = await this.client.getRecord(target.appToken, target.tableId, campaignId);
    if (principal.role !== "founder" && !this.belongsTo(record, principal)) {
      throw new CompanyOpsHttpError(403, "Only the campaign owner can start this campaign");
    }
    if (this.campaignStatus(record) !== "Approved") {
      throw new CompanyOpsHttpError(409, "Only an approved campaign can be started");
    }
    const campaignCode = textValue(recordField(record.fields, ["活动代码 Campaign Code", "Campaign Code"]));
    if (!campaignCode) throw new CompanyOpsConfigurationError("Approved campaign is missing its tracking code");
    const fields: FeishuFields = {};
    this.setCampaignValue(fields, target, "status", "进行中 Active");
    await this.client.updateRecord(target.appToken, target.tableId, campaignId, fields);
    return { success: true, message: "Campaign is now active", recordId: campaignId };
  }

  private async submitCampaignResults(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>,
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set([
      "campaignId", "resultsSummary", "evidenceLinks", "manualRevenue", "adjustments",
      "reportedDiscounts", "reportedRefunds", "reportedChargebacks", "reportedVat",
      "reach", "clicks", "consultations",
    ]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    assertNoHealthData(input);
    const campaignId = validRecordId(input.campaignId);
    const target = await this.target("campaign");
    const record = await this.client.getRecord(target.appToken, target.tableId, campaignId);
    if (principal.role !== "founder" && !this.belongsTo(record, principal)) {
      throw new CompanyOpsHttpError(403, "Only the campaign owner can submit results");
    }
    if (this.campaignStatus(record) !== "Active") {
      throw new CompanyOpsHttpError(409, "Results can be submitted only for an active campaign");
    }
    const resultsSummary = textValue(input.resultsSummary);
    if (!resultsSummary) throw new CompanyOpsHttpError(400, "A results summary is required");
    const evidenceLinks = textValue(input.evidenceLinks)
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (evidenceLinks.some((item) => {
      try { return new URL(item).protocol !== "https:"; } catch { return true; }
    })) {
      throw new CompanyOpsHttpError(400, "Every evidence link must be a valid HTTPS URL");
    }
    const manualRevenue = numberValue(input.manualRevenue) || 0;
    if (manualRevenue > 0 && !evidenceLinks.length) {
      throw new CompanyOpsHttpError(400, "Offline or contract revenue needs at least one evidence link");
    }
    const fields: FeishuFields = {};
    this.setCampaignValue(fields, target, "resultsSummary", resultsSummary);
    this.setCampaignValue(fields, target, "evidenceLinks", evidenceLinks.join("\n"), false);
    this.setCampaignValue(fields, target, "manualRevenue", manualRevenue);
    this.setCampaignValue(fields, target, "reportedDiscounts", numberValue(input.reportedDiscounts) || 0);
    this.setCampaignValue(fields, target, "reportedRefunds", numberValue(input.reportedRefunds) || 0);
    this.setCampaignValue(fields, target, "reportedChargebacks", numberValue(input.reportedChargebacks) || 0);
    this.setCampaignValue(fields, target, "reportedVat", numberValue(input.reportedVat) || 0);
    this.setCampaignValue(fields, target, "adjustments", numberValue(input.adjustments) || 0);
    this.setCampaignValue(fields, target, "reach", numberValue(input.reach) || 0, false);
    this.setCampaignValue(fields, target, "clicks", numberValue(input.clicks) || 0, false);
    this.setCampaignValue(fields, target, "consultations", numberValue(input.consultations) || 0, false);
    this.setCampaignValue(fields, target, "resultsSubmittedAt", Date.now());
    this.setCampaignValue(fields, target, "status", "待核对 Reconciliation");
    await this.client.updateRecord(target.appToken, target.tableId, campaignId, fields);
    return { success: true, message: "Campaign results submitted for reconciliation", recordId: campaignId };
  }

  private async reconcileCampaign(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>,
  ): Promise<CompanyOpsActionResult> {
    if (principal.role !== "founder") {
      throw new CompanyOpsHttpError(403, "Only the founder can reconcile campaign revenue");
    }
    const allowed = new Set(["campaignId", "eligibleRevenue", "reconciliationNote"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const campaignId = validRecordId(input.campaignId);
    const requestedEligibleRevenue = input.eligibleRevenue === undefined || input.eligibleRevenue === ""
      ? undefined
      : numberValue(input.eligibleRevenue);
    if (requestedEligibleRevenue !== undefined && (requestedEligibleRevenue < 0 || !Number.isFinite(requestedEligibleRevenue))) {
      throw new CompanyOpsHttpError(400, "eligibleRevenue must be zero or greater");
    }
    const note = textValue(input.reconciliationNote);
    if (!note) throw new CompanyOpsHttpError(400, "A reconciliation note is required");
    const target = await this.target("campaign");
    const record = await this.client.getRecord(target.appToken, target.tableId, campaignId);
    if (this.campaignStatus(record) !== "Reconciliation") {
      throw new CompanyOpsHttpError(409, "This campaign is not awaiting reconciliation");
    }
    const campaignCode = textValue(recordField(record.fields, ["活动代码 Campaign Code", "Campaign Code"]));
    const orderRows = await this.campaignOrderRows(campaignCode);
    const manualRevenue = numberValue(recordField(record.fields, [
      "线下申报回款 Reported Offline Revenue", "Reported Offline Revenue",
    ])) || 0;
    const adjustments = numberValue(recordField(record.fields, [
      "退款与调整 Refunds & Adjustments", "Refunds & Adjustments",
    ])) || 0;
    const discounts = numberValue(recordField(record.fields, [
      "申报折扣 Reported Discounts", "Reported Discounts",
    ])) || 0;
    const refunds = numberValue(recordField(record.fields, [
      "申报退款 Reported Refunds", "Reported Refunds",
    ])) || 0;
    const chargebacks = numberValue(recordField(record.fields, [
      "申报拒付 Reported Chargebacks", "Reported Chargebacks",
    ])) || 0;
    const vat = numberValue(recordField(record.fields, [
      "申报增值税 Reported VAT", "Reported VAT",
    ])) || 0;
    const approvedShare = numberValue(recordField(record.fields, [
      "员工归因比例% Attribution Share", "Attribution Share %",
    ]));
    const approvedRate = numberValue(recordField(record.fields, [
      "批准提成比例% Commission Rate", "Commission Rate %",
    ]));
    const commissionType = textValue(recordField(record.fields, [
      "提成类型 Commission Type", "Commission Type",
    ])) as "rate" | "flat_fee" | undefined;
    const ratePercentAboveThreshold = numberValue(recordField(record.fields, [
      "超出区间提成比例% Rate Above Threshold", "Rate Above Threshold %",
    ]));
    const thresholdAmount = numberValue(recordField(record.fields, [
      "提成加速阈值 Threshold Amount", "Threshold Amount",
    ]));
    const flatFeeAmount = numberValue(recordField(record.fields, [
      "固定费用金额 Flat Fee Amount", "Flat Fee Amount",
    ]));
    const rule: CampaignCommissionRule = {
      product: campaignProductKind(textValue(recordField(record.fields, ["产品 Product", "Product"])) || "digital"),
      commissionType: commissionType || "rate",
      attributionSharePercent: Number.isFinite(approvedShare) ? approvedShare! : 100,
      ratePercent: Number.isFinite(approvedRate) ? approvedRate : undefined,
      ratePercentAboveThreshold: Number.isFinite(ratePercentAboveThreshold) ? ratePercentAboveThreshold : undefined,
      thresholdAmount: Number.isFinite(thresholdAmount) ? thresholdAmount : undefined,
      flatFeeAmount: Number.isFinite(flatFeeAmount) ? flatFeeAmount : undefined,
      label: textValue(recordField(record.fields, [
        "提成规则快照 Commission Rule", "Commission Rule",
      ])) || "Approved commission rule",
      requiresWrittenFee: commissionType === "flat_fee",
    };
    if (rule.commissionType === "flat_fee" && !rule.flatFeeAmount) {
      throw new CompanyOpsHttpError(400, "This flat-fee campaign is missing its approved fee amount");
    }
    const campaignStartMs = dateValue(recordField(record.fields, ["开始 Start", "Start Date"]));
    const campaignEndMs = dateValue(recordField(record.fields, ["结束 End", "End Date"]));
    const policyResult = campaignCommissionFromOrders({
      product: textValue(recordField(record.fields, ["产品 Product", "Product"])) || "digital",
      rule,
      orders: orderRows,
      manualRevenue,
      discounts,
      refunds,
      chargebacks,
      vat,
      adjustments,
      campaignStartAt: campaignStartMs !== undefined ? new Date(campaignStartMs) : undefined,
      campaignEndAt: campaignEndMs !== undefined ? new Date(campaignEndMs) : undefined,
    });
    const eligibleRevenue = requestedEligibleRevenue === undefined
      ? policyResult.eligibleRevenue
      : requestedEligibleRevenue;
    if (eligibleRevenue > policyResult.maximumEligibleRevenue + 0.01) {
      throw new CompanyOpsHttpError(
        400,
        `Eligible revenue cannot exceed net collected revenue after refunds, discounts, VAT and adjustments (CNY ${policyResult.maximumEligibleRevenue.toFixed(2)})`,
      );
    }
    if (requestedEligibleRevenue !== undefined && Math.abs(requestedEligibleRevenue - policyResult.eligibleRevenue) > 0.01) {
      throw new CompanyOpsHttpError(
        400,
        `The eligible revenue you entered (CNY ${requestedEligibleRevenue.toFixed(2)}) does not match the system-calculated eligible revenue (CNY ${policyResult.eligibleRevenue.toFixed(2)}). Leave the field blank to use the calculated amount.`,
      );
    }
    const commissionAmount = requestedEligibleRevenue === undefined
      ? policyResult.commission
      : campaignCommissionAmount({ eligibleRevenue, rule });
    const fields: FeishuFields = {};
    this.setCampaignValue(fields, target, "netCollectedRevenue", policyResult.netCollectedRevenue);
    this.setCampaignValue(fields, target, "eligibleRevenue", eligibleRevenue);
    this.setCampaignValue(fields, target, "commissionAmount", commissionAmount);
    this.setCampaignValue(fields, target, "reconciliationNote", note);
    this.setCampaignValue(fields, target, "reconciledAt", Date.now());
    this.setCampaignValue(fields, target, "status", "已核对 Reconciled");
    await this.client.updateRecord(target.appToken, target.tableId, campaignId, fields);
    return {
      success: true,
      message: `Campaign reconciled; CNY ${commissionAmount.toFixed(2)} is ready for the monthly commission statement`,
      recordId: campaignId,
    };
  }

  private async updateStatus(
    principal: CompanyOpsPrincipal,
    input: Record<string, unknown>
  ): Promise<CompanyOpsActionResult> {
    const allowed = new Set(["resource", "recordId", "status"]);
    const unknown = Object.keys(input).filter((key) => !allowed.has(key));
    if (unknown.length) throw new CompanyOpsHttpError(400, `Unknown fields: ${unknown.join(", ")}`);
    const resource = textValue(input.resource) as CompanyOpsResource;
    const recordId = validRecordId(input.recordId);
    const status = textValue(input.status);
    if (resource === "campaign") {
      throw new CompanyOpsHttpError(400, "Campaign status must use the approval and reconciliation workflow");
    }
    if (!STATUS_RESOURCES_BY_ROLE[principal.role].has(resource)) {
      throw new CompanyOpsHttpError(403, "You cannot update that type of record");
    }
    const storedStatus = encodeStatus(resource, status);
    const target = await this.target(resource);
    const record = await this.client.getRecord(target.appToken, target.tableId, recordId);
    const roleWideAccess =
      principal.role === "founder" ||
      (principal.role === "finance" &&
        new Set<CompanyOpsResource>(["expense", "payroll", "commission"]).has(resource)) ||
      (principal.role === "growth" &&
        new Set<CompanyOpsResource>([
          "content",
          "lead",
          "partner",
          "campaign",
          "experiment",
          "weeklyReport",
        ]).has(resource));
    if (!roleWideAccess && !this.belongsTo(record, principal)) {
      throw new CompanyOpsHttpError(403, "You can update only your own records");
    }
    const statusField = fieldByAlias(target.fields, FIELD.status);
    if (!statusField) throw new CompanyOpsConfigurationError(`The ${resource} table does not have a status field`);
    await this.client.updateRecord(target.appToken, target.tableId, recordId, {
      [statusField.field_name]: storedStatus,
    });
    return { success: true, message: `Status updated to ${decodeStatus(resource, storedStatus)}`, recordId };
  }
}

export function createCompanyOpsRepository(
  config: CompanyOpsConfig,
  client?: FeishuClient
): CompanyOpsRepository {
  return new CompanyOpsRepository(config, client);
}

export function publicCompanyOpsError(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof CompanyOpsHttpError) {
    return { status: error.status, message: error.message };
  }
  if (error instanceof CompanyOpsConfigurationError) {
    return { status: error.status, message: error.message };
  }
  if (error instanceof FeishuApiError) {
    return {
      status: error.status,
      message: error.status === 401 || error.status === 403
        ? "Feishu denied the Company Operations request"
        : "Company Operations could not reach Feishu",
    };
  }
  return { status: 500, message: "Company Operations request failed" };
}
