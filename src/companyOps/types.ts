export type CompanyOpsLanguage = "en" | "zh";

export type CompanyOpsRole = "founder" | "growth" | "employee" | "finance";

export type CompanyOpsPage =
  | "home"
  | "performance"
  | "growth"
  | "decisions"
  | "calendar"
  | "onboarding"
  | "policies";

export type CompanyOpsCapability =
  | "view_performance"
  | "manage_performance"
  | "view_growth"
  | "edit_growth"
  | "review_content"
  | "view_decisions"
  | "resolve_decisions"
  | "view_finance"
  | "manage_onboarding"
  | "submit_expense";

export type CompanyOpsActionName =
  | "create_content_idea"
  | "create_lead"
  | "create_partner"
  | "create_campaign"
  | "create_experiment"
  | "submit_platform_metrics"
  | "create_support_issue"
  | "submit_weekly_report"
  | "submit_expense"
  | "request_founder_decision"
  | "complete_onboarding_task"
  | "acknowledge_policy"
  | "approve_decision"
  | "request_decision_changes"
  | "request_access"
  | "submit_internal_request"
  | "update_status"
  | "update_content"
  | "delete_content"
  | "duplicate_content"
  | "create_goal"
  | "update_goal"
  | "respond_goal"
  | "generate_onboarding"
  | "acknowledge_compensation"
  | "dispute_compensation"
  | "performance.goals.set"
  | "performance.report.submit"
  | "performance.review.request_changes"
  | "performance.review.score"
  | "performance.review.respond"
  | "performance.finalize";

export type QuickActionKey =
  | "content"
  | "lead"
  | "partner"
  | "campaign"
  | "experiment"
  | "platform_metrics"
  | "support_issue"
  | "onboarding_setup"
  | "compensation_dispute"
  | "weekly_report"
  | "expense"
  | "internal_request"
  | "goal"
  | "founder_decision";

export type Tone =
  | "neutral"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "blue"
  | "purple";

export interface CompanyOpsUser {
  id: string;
  openId?: string;
  name: string;
  avatarUrl?: string;
  role: CompanyOpsRole;
  accessStatus?: "active" | "pending";
  preferredLanguage?: CompanyOpsLanguage;
  capabilities?: CompanyOpsCapability[];
}

export interface CompanyOpsSession {
  authenticated: boolean;
  user?: CompanyOpsUser;
  csrfToken?: string;
  loginUrl?: string;
}

export interface OpsLink {
  label?: string;
  url: string;
  external?: boolean;
}

export interface OpsMetric {
  id: string;
  label: string;
  value: string | number;
  helper?: string;
  trend?: string;
  tone?: Tone;
}

export interface OpsQueueItem {
  id: string;
  kind:
    | "content"
    | "lead"
    | "partner"
    | "campaign"
    | "report"
    | "onboarding"
    | "approval"
    | "task"
    | "other";
  title: string;
  description?: string;
  status?: string;
  dueAt?: string;
  ownerName?: string;
  urgency?: "overdue" | "today" | "soon" | "normal";
  tone?: Tone;
  href?: string;
  actionLabel?: string;
  meta?: string[];
}

export interface OpsWeekRhythm {
  dayLabel: string;
  phase: string;
  guidance: string;
  checklist?: string[];
}

export interface OpsContentItem {
  id: string;
  title: string;
  platform?: string;
  status: string;
  approvalStatus?: string;
  publishAt?: string;
  draftDueAt?: string;
  ownerName?: string;
  objective?: string;
  href?: string;
}

export interface OpsPipelinePhase {
  id: string;
  label: string;
  statuses?: string[];
  count: number;
  items: OpsContentItem[];
  tone?: Tone;
}

export interface OpsLeadItem {
  id: string;
  name: string;
  productInterest?: string;
  source?: string;
  status?: string;
  nextAction?: string;
  nextActionAt?: string;
  ownerName?: string;
  href?: string;
}

export interface OpsPartnerItem {
  id: string;
  name: string;
  platform?: string;
  handle?: string;
  stage?: string;
  nextFollowUpAt?: string;
  proposedCollaboration?: string;
  ownerName?: string;
  href?: string;
}

export interface OpsCampaignItem {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  startAt?: string;
  endAt?: string;
  budget?: string;
  leads?: number;
  collectedRevenue?: string;
  nextDecision?: string;
  href?: string;
}

export interface OpsExperimentItem {
  id: string;
  name: string;
  hypothesis?: string;
  metric?: string;
  status?: string;
  decision?: "scale" | "iterate" | "stop" | string;
  learning?: string;
}

export interface OpsGrowthDashboard {
  metrics: OpsMetric[];
  pipeline: OpsPipelinePhase[];
  upcomingContent: OpsContentItem[];
  leadsToFollowUp: OpsLeadItem[];
  partnersToFollowUp: OpsPartnerItem[];
  activeCampaigns: OpsCampaignItem[];
  experiments: OpsExperimentItem[];
  weeklyReportDue?: boolean;
}

export interface OpsDecisionItem {
  id: string;
  actionType?:
    | "founder_decision"
    | "access_request"
    | "expense"
    | "weekly_report";
  category:
    | "content"
    | "spend"
    | "partner"
    | "people"
    | "finance"
    | "filming"
    | "other";
  title: string;
  summary?: string;
  requestedBy?: string;
  dueAt?: string;
  amount?: string;
  status?: string;
  context?: string[];
  href?: string;
}

export interface OpsFinanceSummary {
  metrics: OpsMetric[];
  payrollStatus?: string;
  commissionStatus?: string;
  expenseStatus?: string;
  links?: OpsLink[];
}

export interface OpsOnboardingTask {
  id: string;
  title: string;
  description?: string;
  phase: "before_start" | "week_one" | "day_30" | "day_60" | "day_90" | string;
  dueAt?: string;
  ownerName?: string;
  completed: boolean;
  locked?: boolean;
  href?: string;
}

export interface OpsPolicyItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  acknowledged?: boolean;
  required?: boolean;
}

export interface OpsOnboardingDashboard {
  employeeName: string;
  roleTitle?: string;
  startDate?: string;
  progress: number;
  nextTask?: OpsOnboardingTask;
  tasks: OpsOnboardingTask[];
  policies: OpsPolicyItem[];
  confidentialDetailsComplete?: boolean;
  confidentialFormUrl?: string;
  helperContact?: string;
}

export interface OpsOnboardingCaseSummary {
  id: string;
  employeeName: string;
  progress: number;
  nextDueAt?: string;
  blocker?: string;
}

export interface OpsOnboardingCandidate {
  openId: string;
  name: string;
  role: string;
  startDate?: string;
}

export interface OpsContentFullItem {
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
  owner?: string;
  needsFounderReview?: boolean;
  publishedUrl?: string;
  views?: number;
  saves?: number;
  comments?: number;
  leads?: number;
  revenue?: number;
  learnings?: string;
}

export interface OpsKeyDateItem {
  id: string;
  item: string;
  date?: string;
  category?: string;
  owner?: string;
  warnDays?: number;
  notes?: string;
}

export interface OpsGoalItem {
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
}

export interface OpsCompensationSummary {
  compensationId?: string;
  payPeriod: string;
  payrollStatus?: string;
  baseSalary?: string;
  performanceBonus?: string;
  reimbursements?: string;
  deductions?: string;
  netPay?: string;
  commissionAmount?: string;
  commissionStatus?: string;
  disputeDeadline?: string;
  acknowledged?: boolean;
  actionsAvailable?: boolean;
  locked?: boolean;
}

export interface OpsPerformanceGoal {
  index: number;
  title: string;
  measure: string;
  weight: number;
  result?: string;
  score?: number;
}

export interface OpsPerformanceEmployee {
  staffRecordId: string;
  name: string;
  role?: string;
}

export interface OpsPerformanceCycle {
  id: string;
  month: string;
  employee: OpsPerformanceEmployee;
  managerName?: string;
  status: string;
  goals: OpsPerformanceGoal[];
  personalFactor?: number;
  weightedScore?: number;
  approvedBonus?: number;
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
  canSubmitReport?: boolean;
  canRespond?: boolean;
  canManage?: boolean;
  canFinalize?: boolean;
}

export interface OpsPerformanceDashboard {
  cycles: OpsPerformanceCycle[];
  canManage?: boolean;
  staff?: OpsPerformanceEmployee[];
}

export interface OpsAssetUploadResult extends CompanyOpsActionResult {
  fileToken?: string;
  fileName?: string;
  url?: string;
}

export interface OpsQuickActionConfig {
  key: QuickActionKey;
  enabled?: boolean;
  href?: string;
}

export interface CompanyOpsDashboard {
  generatedAt?: string;
  user?: CompanyOpsUser;
  focus?: OpsQueueItem;
  myWork: OpsQueueItem[];
  metrics: OpsMetric[];
  weekRhythm?: OpsWeekRhythm;
  quickActions?: OpsQuickActionConfig[];
  growth?: OpsGrowthDashboard;
  decisions?: OpsDecisionItem[];
  finance?: OpsFinanceSummary;
  goals?: OpsGoalItem[];
  contentCalendar?: OpsContentFullItem[];
  keyDates?: OpsKeyDateItem[];
  myCompensation?: OpsCompensationSummary;
  myExpenses?: Array<{
    id: string;
    title: string;
    status?: string;
    amount?: string;
    submittedAt?: string;
  }>;
  myPerformance?: OpsPerformanceDashboard;
  performance?: OpsPerformanceDashboard;
  onboarding?: OpsOnboardingDashboard;
  onboardingCases?: OpsOnboardingCaseSummary[];
  onboardingCandidates?: OpsOnboardingCandidate[];
  policies?: OpsPolicyItem[];
  links?: {
    startHere?: string;
    advancedGrowth?: string;
    onboardingGuide?: string;
    confidentialForm?: string;
    expensePolicy?: string;
    commissionPolicy?: string;
    expenseApproval?: string;
    weeklyReportForm?: string;
    tasks?: string;
    sharedAssets?: string;
    companyCalendar?: string;
    contentCalendar?: string;
  };
}

export interface CompanyOpsActionResult {
  success: boolean;
  message?: string;
  warning?: string;
  id?: string;
  redirectUrl?: string;
}

export interface CompanyOpsApi {
  getSession: () => Promise<CompanyOpsSession>;
  getDashboard: () => Promise<CompanyOpsDashboard>;
  submitAction: (
    action: CompanyOpsActionName,
    payload: Record<string, unknown>,
    csrfToken?: string,
  ) => Promise<CompanyOpsActionResult>;
  uploadAsset?: (
    file: File,
    csrfToken?: string,
  ) => Promise<OpsAssetUploadResult>;
  logout: (csrfToken?: string) => Promise<void>;
}
