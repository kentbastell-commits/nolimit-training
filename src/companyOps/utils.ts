import type {
  CompanyOpsCapability,
  CompanyOpsLanguage,
  CompanyOpsPage,
  CompanyOpsRole,
  CompanyOpsUser,
  OpsOnboardingTask,
  QuickActionKey,
} from "./types";

const roleCapabilities: Record<CompanyOpsRole, CompanyOpsCapability[]> = {
  founder: [
    "view_performance",
    "manage_performance",
    "view_growth",
    "edit_growth",
    "review_content",
    "view_decisions",
    "resolve_decisions",
    "view_finance",
    "manage_onboarding",
    "submit_expense",
  ],
  growth: ["view_performance", "view_growth", "edit_growth", "submit_expense"],
  finance: ["view_performance", "view_finance", "view_decisions", "submit_expense"],
  employee: ["view_performance", "submit_expense"],
};

export function capabilitiesFor(user: CompanyOpsUser) {
  return new Set(user.capabilities || roleCapabilities[user.role]);
}

export function canOpenPage(user: CompanyOpsUser, page: CompanyOpsPage) {
  const capabilities = capabilitiesFor(user);
  if (page === "performance") return user.accessStatus !== "pending";
  if (page === "warroom") return user.accessStatus !== "pending";
  if (page === "weekly") return user.accessStatus !== "pending";
  if (page === "inbox") return user.accessStatus !== "pending" && user.role !== "founder";
  if (page === "growth") return capabilities.has("view_growth");
  if (page === "campaigns") return capabilities.has("view_growth");
  if (page === "calendar") return capabilities.has("view_growth");
  if (page === "articles") return capabilities.has("view_growth");
  if (page === "decisions") return capabilities.has("view_decisions");
  return true;
}

export function defaultQuickActions(user: CompanyOpsUser): QuickActionKey[] {
  const capabilities = capabilitiesFor(user);
  const actions: QuickActionKey[] = [];
  if (capabilities.has("edit_growth")) {
    actions.push(
      "content",
      "lead",
      "partner",
      "campaign",
      "experiment",
      "platform_metrics",
      "weekly_report",
    );
  }
  if (user.role === "founder") actions.push("goal");
  actions.push("internal_request", "support_issue");
  if (capabilities.has("submit_expense")) actions.push("expense");
  if (user.role !== "founder") actions.push("founder_decision");
  return actions;
}

export function localeFor(language: CompanyOpsLanguage) {
  return language === "zh" ? "zh-CN" : "en-GB";
}

export function formatOpsDate(
  value: string | undefined,
  language: CompanyOpsLanguage,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  },
) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeFor(language), options).format(date);
}

export function formatOpsDateTime(
  value: string | undefined,
  language: CompanyOpsLanguage,
) {
  return formatOpsDate(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function onboardingPhaseLabelKey(phase: OpsOnboardingTask["phase"]) {
  if (phase === "before_start") return "phaseBeforeStart" as const;
  if (phase === "week_one") return "phaseWeekOne" as const;
  if (phase === "day_30") return "phaseDay30" as const;
  if (phase === "day_60") return "phaseDay60" as const;
  return "phaseDay90" as const;
}

export function isExternalUrl(url: string) {
  try {
    return new URL(url, window.location.origin).origin !== window.location.origin;
  } catch {
    return false;
  }
}
