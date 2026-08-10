import {
  BookOpenCheck,
  CalendarDays,
  Gavel,
  Home,
  Languages,
  LogOut,
  Newspaper,
  RefreshCw,
  Target,
  TrendingUp,
  UserRoundCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { BRAND_MONOGRAM_BLACK, BRAND_WORDMARK_BLACK } from "../brandAssets";
import { CompanyOpsApiError, companyOpsApi, quickActionApiNames } from "./api";
import CompanyOpsHome from "./CompanyOpsHome";
import ArticleBuilderPage from "./ArticleBuilderPage";
import ContentCalendarPage from "./ContentCalendarPage";
import { SkeletonPage } from "./components";
import { opsText, roleLabel, type OpsCopyKey } from "./copy";
import FounderHome from "./FounderHome";
import GrowthHome from "./GrowthHome";
import OnboardingHome from "./OnboardingHome";
import PerformanceHome from "./PerformanceHome";
import PoliciesPage from "./PoliciesPage";
import QuickActionDrawer from "./QuickActionDrawer";
import type {
  CompanyOpsActionName,
  CompanyOpsApi,
  CompanyOpsDashboard,
  CompanyOpsLanguage,
  CompanyOpsPage,
  CompanyOpsSession,
  CompanyOpsUser,
  OpsDecisionItem,
  OpsOnboardingTask,
  OpsPolicyItem,
  OpsQueueItem,
  QuickActionKey,
} from "./types";
import { canOpenPage, capabilitiesFor } from "./utils";
import "./companyOps.css";

type LoadState = "loading" | "ready" | "unauthenticated" | "denied" | "error";
type Toast = { id: number; message: string; tone: "success" | "error" };

const navItems: Array<{
  page: CompanyOpsPage;
  label: OpsCopyKey;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}> = [
  { page: "home", label: "navHome", icon: Home },
  { page: "performance", label: "navPerformance", icon: Target },
  { page: "growth", label: "navGrowth", icon: TrendingUp },
  { page: "calendar", label: "navCalendar", icon: CalendarDays },
  { page: "articles", label: "navArticles", icon: Newspaper },
  { page: "decisions", label: "navDecisions", icon: Gavel },
  { page: "onboarding", label: "navOnboarding", icon: UserRoundCheck },
  { page: "policies", label: "navPolicies", icon: BookOpenCheck },
];

function readInitialPage(): CompanyOpsPage {
  const page = new URLSearchParams(window.location.search).get("page");
  return navItems.some((item) => item.page === page)
    ? (page as CompanyOpsPage)
    : "home";
}

function readInitialLanguage(): CompanyOpsLanguage {
  try {
    const saved = window.localStorage.getItem("nl_company_ops_language");
    if (saved === "en" || saved === "zh") return saved;
  } catch {
    // A privacy-restricted browser may disable local storage.
  }
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function safeDashboardForUser(
  dashboard: CompanyOpsDashboard,
  user: CompanyOpsUser,
): CompanyOpsDashboard {
  const capabilities = capabilitiesFor(user);
  return {
    ...dashboard,
    user,
    growth: capabilities.has("view_growth") ? dashboard.growth : undefined,
    myPerformance: dashboard.myPerformance,
    performance: user.role === "founder" ? dashboard.performance : undefined,
    decisions: capabilities.has("view_decisions")
      ? dashboard.decisions
      : undefined,
    finance: capabilities.has("view_finance") ? dashboard.finance : undefined,
    onboardingCases: capabilities.has("manage_onboarding")
      ? dashboard.onboardingCases
      : undefined,
    onboardingCandidates: capabilities.has("manage_onboarding")
      ? dashboard.onboardingCandidates
      : undefined,
    links: {
      ...dashboard.links,
      advancedGrowth: capabilities.has("view_growth")
        ? dashboard.links?.advancedGrowth
        : undefined,
    },
  };
}

function loginHref(session: CompanyOpsSession | null) {
  if (session?.loginUrl) return session.loginUrl;
  const returnTo = `${window.location.pathname}${window.location.search}`;
  return `/api/companyOpsLogin?returnTo=${encodeURIComponent(returnTo)}`;
}

function StatusScreen({
  kind,
  language,
  loginUrl,
  onRetry,
  onRequestAccess,
  requestingAccess = false,
  requestMessage,
}: {
  kind: "unauthenticated" | "denied" | "error";
  language: CompanyOpsLanguage;
  loginUrl?: string;
  onRetry?: () => void;
  onRequestAccess?: (requestedRole: "growth" | "staff" | "finance") => void;
  requestingAccess?: boolean;
  requestMessage?: string;
}) {
  const [requestedRole, setRequestedRole] = useState<"growth" | "staff" | "finance">("growth");
  const title =
    kind === "unauthenticated"
      ? opsText(language, "loginTitle")
      : kind === "denied"
        ? opsText(language, "noAccessTitle")
        : opsText(language, "loadErrorTitle");
  const body =
    kind === "unauthenticated"
      ? opsText(language, "loginBody")
      : kind === "denied"
        ? opsText(language, "noAccessBody")
        : opsText(language, "loadErrorBody");

  return (
    <main className="fopsStatusPage">
      <section className="fopsStatusCard">
        <img
          className="fopsStatusLogo"
          src={BRAND_WORDMARK_BLACK}
          alt="NX Limit"
        />
        <div className="fopsStatusIcon" aria-hidden="true">
          {kind === "unauthenticated" ? (
            <img src={BRAND_MONOGRAM_BLACK} alt="" />
          ) : kind === "denied" ? (
            <UserRoundCheck size={27} />
          ) : (
            <RefreshCw size={27} />
          )}
        </div>
        <span className="fopsEyebrow">{opsText(language, "appName")}</span>
        <h1>{title}</h1>
        <p>{body}</p>
        {kind === "unauthenticated" ? (
          <a className="fopsButton fopsButton--primary" href={loginUrl}>
            {opsText(language, "continueWithFeishu")}
          </a>
        ) : kind === "error" ? (
          <button
            className="fopsButton fopsButton--primary"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw size={17} aria-hidden="true" />
            {opsText(language, "retry")}
          </button>
        ) : kind === "denied" && onRequestAccess ? (
          <div className="fopsAccessRequestControls">
            <label>
              <span>{language === "zh" ? "申请岗位权限" : "Access needed"}</span>
              <select
                value={requestedRole}
                onChange={(event) => setRequestedRole(event.target.value as typeof requestedRole)}
                disabled={requestingAccess}
              >
                <option value="growth">{language === "zh" ? "品牌与增长" : "Brand & Growth"}</option>
                <option value="staff">{language === "zh" ? "普通员工" : "Staff"}</option>
                <option value="finance">{language === "zh" ? "财务" : "Finance"}</option>
              </select>
            </label>
            <button
              className="fopsButton fopsButton--primary"
              type="button"
              onClick={() => onRequestAccess(requestedRole)}
              disabled={requestingAccess}
            >
              {requestingAccess
                ? opsText(language, "requestingAccess")
                : requestMessage || opsText(language, "requestAccess")}
            </button>
          </div>
        ) : null}
        {requestMessage ? <p role="status">{requestMessage}</p> : null}
        <small>{opsText(language, "loginPrivacy")}</small>
      </section>
    </main>
  );
}

function mergePolicies(dashboard: CompanyOpsDashboard) {
  const policies = [
    ...(dashboard.policies || []),
    ...(dashboard.onboarding?.policies || []),
  ];
  return [...new Map(policies.map((policy) => [policy.id, policy])).values()];
}

export default function CompanyOpsApp({
  api = companyOpsApi,
}: {
  api?: CompanyOpsApi;
}) {
  const [language, setLanguage] = useState<CompanyOpsLanguage>(
    readInitialLanguage,
  );
  const [page, setPage] = useState<CompanyOpsPage>(readInitialPage);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [session, setSession] = useState<CompanyOpsSession | null>(null);
  const [dashboard, setDashboard] = useState<CompanyOpsDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerAction, setDrawerAction] = useState<QuickActionKey | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [busyDecisionId, setBusyDecisionId] = useState<string>();
  const [busyTaskId, setBusyTaskId] = useState<string>();
  const [busyPolicyId, setBusyPolicyId] = useState<string>();
  const [compensationBusy, setCompensationBusy] = useState(false);
  const [toast, setToast] = useState<Toast>();
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [accessRequestMessage, setAccessRequestMessage] = useState<string>();

  const user = session?.user || dashboard?.user;

  const showToast = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      setToast({ id: Date.now(), message, tone });
    },
    [],
  );

  const applyDashboard = useCallback(
    (nextDashboard: CompanyOpsDashboard, nextUser: CompanyOpsUser) => {
      setDashboard(safeDashboardForUser(nextDashboard, nextUser));
    },
    [],
  );

  const loadWorkspace = useCallback(async () => {
    setLoadState("loading");
    try {
      const nextSession = await api.getSession();
      setSession(nextSession);
      if (!nextSession.authenticated) {
        setDashboard(null);
        setLoadState("unauthenticated");
        return;
      }
      if (nextSession.user?.accessStatus === "pending") {
        setDashboard(null);
        setLoadState("denied");
        return;
      }
      const nextDashboard = await api.getDashboard();
      const nextUser = nextSession.user || nextDashboard.user;
      if (!nextUser || nextUser.accessStatus === "pending") {
        setDashboard(null);
        setLoadState("denied");
        return;
      }
      if (nextUser.preferredLanguage) {
        setLanguage(nextUser.preferredLanguage);
      }
      setSession({ ...nextSession, user: nextUser });
      applyDashboard(nextDashboard, nextUser);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof CompanyOpsApiError && error.status === 401) {
        setSession({ authenticated: false, loginUrl: error.loginUrl });
        setDashboard(null);
        setLoadState("unauthenticated");
      } else if (error instanceof CompanyOpsApiError && error.status === 403) {
        setDashboard(null);
        setLoadState("denied");
      } else {
        setLoadState("error");
      }
    }
  }, [api, applyDashboard]);

  const refreshDashboard = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const nextDashboard = await api.getDashboard();
      applyDashboard(nextDashboard, user);
    } catch {
      showToast(opsText(language, "actionFailed"), "error");
    } finally {
      setRefreshing(false);
    }
  }, [api, applyDashboard, language, showToast, user]);

  useEffect(() => {
    // Initializing server-backed client state is the purpose of this mount effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    try {
      window.localStorage.setItem("nl_company_ops_language", language);
    } catch {
      // Language still works for the current session.
    }
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = `${opsText(language, "appName")} | NX Limit`;
  }, [language]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 4_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibleNav = useMemo(
    () => (user ? navItems.filter((item) => canOpenPage(user, item.page)) : []),
    [user],
  );

  const activePage = user && !canOpenPage(user, page) ? "home" : page;

  useEffect(() => {
    if (activePage === page) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("page");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [activePage, page]);

  useEffect(() => {
    const onPopState = () => {
      const next = readInitialPage();
      setPage(user && !canOpenPage(user, next) ? "home" : next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [user]);

  const navigate = useCallback(
    (nextPage: CompanyOpsPage) => {
      if (user && !canOpenPage(user, nextPage)) return;
      setPage(nextPage);
      const url = new URL(window.location.href);
      if (nextPage === "home") url.searchParams.delete("page");
      else url.searchParams.set("page", nextPage);
      window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [user],
  );

  const submitQuickAction = async (payload: Record<string, unknown>) => {
    if (!drawerAction) return;
    setActionBusy(true);
    setActionError(undefined);
    try {
      const compensation = dashboard?.myCompensation;
      const actionPayload =
        drawerAction === "compensation_dispute" && compensation
          ? {
              ...payload,
              payPeriod: compensation.payPeriod,
              compensationId: compensation.compensationId,
            }
          : payload;
      const result = await api.submitAction(
        quickActionApiNames[drawerAction],
        actionPayload,
        session?.csrfToken,
      );
      setDrawerAction(null);
      showToast(
        [result.message || opsText(language, "actionSuccess"), result.warning]
          .filter(Boolean)
          .join(" · "),
      );
      await refreshDashboard();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : opsText(language, "actionFailed"),
      );
    } finally {
      setActionBusy(false);
    }
  };

  const runRecordAction = async (
    action: CompanyOpsActionName,
    payload: Record<string, unknown>,
  ) => {
    const result = await api.submitAction(action, payload, session?.csrfToken);
    showToast(
      [result.message || opsText(language, "actionSuccess"), result.warning]
        .filter(Boolean)
        .join(" · "),
    );
    await refreshDashboard();
  };

  const handleDecision = async (
    decision: OpsDecisionItem,
    outcome: "approve" | "changes",
    feedback?: string,
  ) => {
    setBusyDecisionId(decision.id);
    try {
      await runRecordAction(
        outcome === "approve"
          ? "approve_decision"
          : "request_decision_changes",
        {
          decisionId: decision.id,
          actionType: decision.actionType,
          ...(feedback ? { feedback } : {}),
        },
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : opsText(language, "actionFailed"),
        "error",
      );
    } finally {
      setBusyDecisionId(undefined);
    }
  };

  const handleCompleteTask = async (task: OpsOnboardingTask) => {
    setBusyTaskId(task.id);
    try {
      await runRecordAction("complete_onboarding_task", { taskId: task.id });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : opsText(language, "actionFailed"),
        "error",
      );
    } finally {
      setBusyTaskId(undefined);
    }
  };

  const handleAcknowledgePolicy = async (policy: OpsPolicyItem) => {
    setBusyPolicyId(policy.id);
    try {
      await runRecordAction("acknowledge_policy", { policyId: policy.id });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : opsText(language, "actionFailed"),
        "error",
      );
    } finally {
      setBusyPolicyId(undefined);
    }
  };

  const handleAcknowledgeCompensation = async () => {
    if (!dashboard?.myCompensation) return;
    setCompensationBusy(true);
    try {
      await runRecordAction("acknowledge_compensation", {
        payPeriod: dashboard.myCompensation.payPeriod,
        compensationId: dashboard.myCompensation.compensationId,
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : opsText(language, "actionFailed"),
        "error",
      );
    } finally {
      setCompensationBusy(false);
    }
  };

  const handleOpenItem = (item: OpsQueueItem) => {
    if (item.kind === "approval" && user && canOpenPage(user, "decisions")) {
      navigate("decisions");
    } else if (item.kind === "onboarding") {
      navigate("onboarding");
    } else if (
      ["content", "lead", "partner", "campaign", "report"].includes(
        item.kind,
      ) &&
      user &&
      canOpenPage(user, "growth")
    ) {
      navigate("growth");
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout(session?.csrfToken);
    } finally {
      setSession({ authenticated: false });
      setDashboard(null);
      setLoadState("unauthenticated");
    }
  };

  const handleRequestAccess = async (requestedRole: "growth" | "staff" | "finance") => {
    if (!session?.authenticated || !session.csrfToken) return;
    setRequestingAccess(true);
    setAccessRequestMessage(undefined);
    try {
      const result = await api.submitAction(
        "request_access",
        { requestedRole },
        session.csrfToken,
      );
      setAccessRequestMessage(
        result.message || opsText(language, "accessRequestSent"),
      );
    } catch (error) {
      setAccessRequestMessage(
        error instanceof Error
          ? error.message
          : opsText(language, "actionFailed"),
      );
    } finally {
      setRequestingAccess(false);
    }
  };

  if (loadState === "loading") {
    return (
      <div className="companyOpsApp fopsLoadingShell">
        <header>
          <img src={BRAND_WORDMARK_BLACK} alt="NX Limit" />
          <span>{opsText(language, "loadingTitle")}</span>
        </header>
        <main>
          <p>{opsText(language, "loadingBody")}</p>
          <SkeletonPage />
        </main>
      </div>
    );
  }

  if (loadState !== "ready" || !dashboard || !user) {
    return (
      <div className="companyOpsApp">
        <StatusScreen
          kind={
            loadState === "unauthenticated"
              ? "unauthenticated"
              : loadState === "denied"
                ? "denied"
                : "error"
          }
          language={language}
          loginUrl={loginHref(session)}
          onRetry={() => void loadWorkspace()}
          onRequestAccess={
            loadState === "denied" ? (requestedRole) => void handleRequestAccess(requestedRole) : undefined
          }
          requestingAccess={requestingAccess}
          requestMessage={accessRequestMessage}
        />
      </div>
    );
  }

  const capabilities = capabilitiesFor(user);
  const policies = mergePolicies(dashboard);

  return (
    <div className="companyOpsApp">
      <a className="fopsSkipLink" href="#company-ops-main">
        {opsText(language, "navHome")}
      </a>

      <aside className="fopsSidebar">
        <div className="fopsBrand">
          <img src={BRAND_WORDMARK_BLACK} alt="NX Limit" />
          <span>{opsText(language, "appName")}</span>
        </div>
        <nav aria-label={opsText(language, "appName")}>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                className={activePage === item.page ? "is-active" : ""}
                aria-current={activePage === item.page ? "page" : undefined}
                onClick={() => navigate(item.page)}
                key={item.page}
              >
                <Icon size={19} aria-hidden={true} />
                <span>{opsText(language, item.label)}</span>
              </button>
            );
          })}
        </nav>
        <div className="fopsSidebarProfile">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" />
          ) : (
            <span aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
          )}
          <div>
            <strong>{user.name}</strong>
            <small>{roleLabel(language, user.role)}</small>
          </div>
        </div>
      </aside>

      <div className="fopsShell">
        <header className="fopsTopbar">
          <div>
            <img src={BRAND_MONOGRAM_BLACK} alt="" />
            <span>{opsText(language, "appName")}</span>
          </div>
          <div className="fopsTopbarActions">
            <button
              className="fopsIconButton"
              type="button"
              aria-label={
                language === "en"
                  ? opsText(language, "switchToChinese")
                  : opsText(language, "switchToEnglish")
              }
              onClick={() => setLanguage((current) => (current === "en" ? "zh" : "en"))}
            >
              <Languages size={18} aria-hidden="true" />
              <span>
                {language === "en"
                  ? opsText(language, "switchToChinese")
                  : opsText(language, "switchToEnglish")}
              </span>
            </button>
            <button
              className="fopsIconButton"
              type="button"
              aria-label={opsText(language, "refresh")}
              onClick={() => void refreshDashboard()}
              disabled={refreshing}
            >
              <RefreshCw
                className={refreshing ? "is-spinning" : ""}
                size={18}
                aria-hidden="true"
              />
              <span>
                {refreshing
                  ? opsText(language, "refreshing")
                  : opsText(language, "refresh")}
              </span>
            </button>
            <button
              className="fopsIconButton"
              type="button"
              aria-label={opsText(language, "signOut")}
              onClick={() => void handleLogout()}
            >
              <LogOut size={18} aria-hidden="true" />
              <span>{opsText(language, "signOut")}</span>
            </button>
          </div>
        </header>

        <main id="company-ops-main" className="fopsMain" tabIndex={-1}>
          {activePage === "home" ? (
            <CompanyOpsHome
              user={user}
              dashboard={dashboard}
              language={language}
              onQuickAction={setDrawerAction}
              onNavigate={navigate}
              onOpenItem={handleOpenItem}
              onAcknowledgeCompensation={() =>
                void handleAcknowledgeCompensation()
              }
              onDisputeCompensation={() =>
                setDrawerAction("compensation_dispute")
              }
              onRespondGoal={async (goal, response) => {
                try {
                  await runRecordAction("respond_goal", {
                    goalId: goal.id,
                    response,
                  });
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : opsText(language, "actionFailed"),
                    "error",
                  );
                }
              }}
              onUpdateGoalStatus={async (goal, status) => {
                try {
                  await runRecordAction("update_goal", {
                    goalId: goal.id,
                    status,
                  });
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : opsText(language, "actionFailed"),
                    "error",
                  );
                }
              }}
              compensationBusy={compensationBusy}
            />
          ) : null}
          {activePage === "calendar" && capabilities.has("view_growth") ? (
            <ContentCalendarPage
              items={dashboard.contentCalendar || []}
              language={language}
              onQuickAction={setDrawerAction}
              onDuplicate={async (contentId, publishDate) => {
                try {
                  await runRecordAction("duplicate_content", {
                    contentId,
                    ...(publishDate ? { publishDate } : {}),
                  });
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : opsText(language, "actionFailed"),
                    "error",
                  );
                }
              }}
              onDelete={async (contentId) => {
                try {
                  await runRecordAction("delete_content", { contentId });
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : opsText(language, "actionFailed"),
                    "error",
                  );
                }
              }}
              onUpdate={async (contentId, patch) => {
                try {
                  await runRecordAction("update_content", {
                    contentId,
                    ...patch,
                  });
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : opsText(language, "actionFailed"),
                    "error",
                  );
                  throw error;
                }
              }}
            />
          ) : null}
          {activePage === "articles" && capabilities.has("view_growth") ? (
            <ArticleBuilderPage
              articles={dashboard.articles || []}
              language={language}
              onCreate={async (title) => {
                try {
                  await runRecordAction("create_article", { title });
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : opsText(language, "actionFailed"),
                    "error",
                  );
                }
              }}
              onSave={async (articleId, patch) => {
                try {
                  await runRecordAction("update_article", { articleId, ...patch });
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : opsText(language, "actionFailed"),
                    "error",
                  );
                  throw error;
                }
              }}
              onDelete={async (articleId) => {
                try {
                  await runRecordAction("delete_article", { articleId });
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : opsText(language, "actionFailed"),
                    "error",
                  );
                }
              }}
            />
          ) : null}
          {activePage === "growth" && capabilities.has("view_growth") ? (
            <GrowthHome
              growth={dashboard.growth}
              language={language}
              onQuickAction={setDrawerAction}
              onUpdateContentStatus={async (contentId, status) => {
                try {
                  await runRecordAction("update_status", {
                    resource: "content",
                    recordId: contentId,
                    status,
                  });
                } catch (error) {
                  showToast(
                    error instanceof Error
                      ? error.message
                      : opsText(language, "actionFailed"),
                    "error",
                  );
                }
              }}
            />
          ) : null}
          {activePage === "performance" ? (
            <PerformanceHome
              user={user}
              language={language}
              myPerformance={dashboard.myPerformance}
              performance={dashboard.performance}
              sharedAssetsUrl={dashboard.links?.sharedAssets}
              onAction={runRecordAction}
              onUploadAsset={
                (user.role === "founder" || user.role === "growth") && api.uploadAsset
                  ? (file) => api.uploadAsset!(file, session?.csrfToken)
                  : undefined
              }
            />
          ) : null}
          {activePage === "decisions" && capabilities.has("view_decisions") ? (
            <FounderHome
              language={language}
              decisions={dashboard.decisions || []}
              finance={
                capabilities.has("view_finance") ? dashboard.finance : undefined
              }
              onboardingCases={dashboard.onboardingCases || []}
              growthMetrics={dashboard.growth?.metrics || []}
              canResolve={capabilities.has("resolve_decisions")}
              busyDecisionId={busyDecisionId}
              onDecision={(decision, outcome) =>
                void handleDecision(decision, outcome)
              }
            />
          ) : null}
          {activePage === "onboarding" ? (
            <OnboardingHome
              onboarding={dashboard.onboarding}
              language={language}
              busyTaskId={busyTaskId}
              busyPolicyId={busyPolicyId}
              onCompleteTask={(task) => void handleCompleteTask(task)}
              onAcknowledgePolicy={(policy) =>
                void handleAcknowledgePolicy(policy)
              }
            />
          ) : null}
          {activePage === "policies" ? (
            <PoliciesPage
              language={language}
              policies={policies}
              busyPolicyId={busyPolicyId}
              onAcknowledge={(policy) =>
                void handleAcknowledgePolicy(policy)
              }
            />
          ) : null}
        </main>
      </div>

      <nav className="fopsMobileNav" aria-label={opsText(language, "appName")}>
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              className={activePage === item.page ? "is-active" : ""}
              aria-current={activePage === item.page ? "page" : undefined}
              onClick={() => navigate(item.page)}
              key={item.page}
            >
              <Icon size={19} aria-hidden={true} />
              <span>{opsText(language, item.label)}</span>
            </button>
          );
        })}
      </nav>

      {drawerAction ? (
        <QuickActionDrawer
          action={drawerAction}
          language={language}
          busy={actionBusy}
          error={actionError}
          onboardingCandidates={dashboard.onboardingCandidates}
          onClose={() => {
            setDrawerAction(null);
            setActionError(undefined);
          }}
          onSubmit={submitQuickAction}
        />
      ) : null}

      {toast ? (
        <div
          className={`fopsToast fopsToast--${toast.tone}`}
          role={toast.tone === "error" ? "alert" : "status"}
          key={toast.id}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
