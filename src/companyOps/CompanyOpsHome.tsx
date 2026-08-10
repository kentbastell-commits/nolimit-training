import {
  ArrowRight,
  BarChart3,
  Banknote,
  BookOpenCheck,
  Bug,
  CalendarClock,
  ClipboardList,
  FileText,
  FlaskConical,
  Handshake,
  Lightbulb,
  Megaphone,
  MessageSquareMore,
  Receipt,
  UserPlus,
} from "lucide-react";
import {
  EmptyState,
  MetricGrid,
  QueueCard,
  ResourceLink,
  SectionHeading,
  TonePill,
} from "./components";
import { opsText, quickActionLabel, roleLabel, statusLabel } from "./copy";
import { TranslatableText } from "./TranslatableText";
import type {
  CompanyOpsDashboard,
  CompanyOpsLanguage,
  CompanyOpsPage,
  CompanyOpsUser,
  OpsQueueItem,
  QuickActionKey,
} from "./types";
import { defaultQuickActions, formatOpsDate } from "./utils";

const quickActionIcons = {
  content: Lightbulb,
  lead: UserPlus,
  partner: Handshake,
  campaign: Megaphone,
  experiment: FlaskConical,
  platform_metrics: BarChart3,
  support_issue: Bug,
  onboarding_setup: UserPlus,
  compensation_dispute: Banknote,
  weekly_report: FileText,
  expense: Banknote,
  internal_request: ClipboardList,
  founder_decision: MessageSquareMore,
} satisfies Record<QuickActionKey, typeof Lightbulb>;

export default function CompanyOpsHome({
  user,
  dashboard,
  language,
  onQuickAction,
  onNavigate,
  onOpenItem,
  onAcknowledgeCompensation,
  onDisputeCompensation,
  compensationBusy,
}: {
  user: CompanyOpsUser;
  dashboard: CompanyOpsDashboard;
  language: CompanyOpsLanguage;
  onQuickAction: (action: QuickActionKey) => void;
  onNavigate: (page: CompanyOpsPage) => void;
  onOpenItem: (item: OpsQueueItem) => void;
  onAcknowledgeCompensation: () => void;
  onDisputeCompensation: () => void;
  compensationBusy: boolean;
}) {
  const configured = dashboard.quickActions?.filter(
    (action) => action.enabled !== false,
  );
  const actions = configured?.length
    ? configured.map((action) => action.key)
    : defaultQuickActions(user);
  const focus = dashboard.focus;

  return (
    <div className="fopsPage fopsHomePage">
      <header className="fopsPageHeader">
        <div>
          <span className="fopsEyebrow">{roleLabel(language, user.role)}</span>
          <h1>{opsText(language, "welcome", { name: user.name })}</h1>
          <p>{opsText(language, "welcomeSub")}</p>
        </div>
        {dashboard.generatedAt ? (
          <span className="fopsUpdatedAt">
            {opsText(language, "generatedAt", {
              time: formatOpsDate(dashboard.generatedAt, language, {
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
          </span>
        ) : null}
      </header>

      <section className="fopsFocus" aria-labelledby="fops-focus-title">
        <div className="fopsFocusGlow" aria-hidden="true" />
        <span className="fopsFocusEyebrow" id="fops-focus-title">
          {opsText(language, "todayFocus")}
        </span>
        {focus ? (
          <div className="fopsFocusBody">
            <div>
              <div className="fopsFocusPills">
                {focus.urgency ? (
                  <TonePill
                    tone={focus.urgency === "overdue" ? "danger" : "warning"}
                  >
                    {focus.urgency === "overdue"
                      ? opsText(language, "overdue")
                      : focus.urgency === "today"
                        ? opsText(language, "dueToday")
                        : opsText(language, "dueSoon")}
                  </TonePill>
                ) : null}
                {focus.status ? (
                  <TonePill tone={focus.tone}>{statusLabel(language, focus.status)}</TonePill>
                ) : null}
              </div>
              <h2>{focus.title}</h2>
              <TranslatableText text={focus.description} language={language} />
              <div className="fopsFocusMeta">
                {focus.dueAt ? (
                  <span>
                    <CalendarClock size={15} />
                    {formatOpsDate(focus.dueAt, language, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ) : null}
                {focus.ownerName ? <span>{focus.ownerName}</span> : null}
              </div>
            </div>
            {focus.href ? (
              <a className="fopsFocusAction" href={focus.href}>
                {focus.actionLabel || opsText(language, "openItem")}
                <ArrowRight size={18} />
              </a>
            ) : (
              <button
                type="button"
                className="fopsFocusAction"
                onClick={() => onOpenItem(focus)}
              >
                {focus.actionLabel || opsText(language, "openItem")}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        ) : (
          <div className="fopsFocusBody">
            <div>
              <h2>{opsText(language, "quietFocusTitle")}</h2>
              <p>{opsText(language, "quietFocusBody")}</p>
            </div>
          </div>
        )}
      </section>

      <MetricGrid metrics={dashboard.metrics || []} />

      {dashboard.myCompensation ? (
        <section className="fopsMyPay" aria-labelledby="fops-my-pay-title">
          <header>
            <span className="fopsMyPayIcon" aria-hidden="true">
              <Banknote size={20} />
            </span>
            <div>
              <h2 id="fops-my-pay-title">{opsText(language, "myPay")}</h2>
              <p>{opsText(language, "privatePayHint")}</p>
            </div>
            <TonePill tone="success">{dashboard.myCompensation.payPeriod}</TonePill>
          </header>
          <div className="fopsMyPayGrid">
            <div>
              <span>{opsText(language, "payrollStatus")}</span>
              <strong>{statusLabel(language, dashboard.myCompensation.payrollStatus) || "—"}</strong>
            </div>
            {dashboard.myCompensation.baseSalary ? (
              <div>
                <span>{opsText(language, "payBase")}</span>
                <strong>{dashboard.myCompensation.baseSalary}</strong>
              </div>
            ) : null}
            {dashboard.myCompensation.performanceBonus ? (
              <div>
                <span>{opsText(language, "payPerformanceBonus")}</span>
                <strong>{dashboard.myCompensation.performanceBonus}</strong>
              </div>
            ) : null}
            {dashboard.myCompensation.reimbursements ? (
              <div>
                <span>{opsText(language, "payReimbursements")}</span>
                <strong>{dashboard.myCompensation.reimbursements}</strong>
              </div>
            ) : null}
            {dashboard.myCompensation.deductions ? (
              <div>
                <span>{opsText(language, "payDeductions")}</span>
                <strong>{dashboard.myCompensation.deductions}</strong>
              </div>
            ) : null}
            {dashboard.myCompensation.netPay ? (
              <div>
                <span>{opsText(language, "payNet")}</span>
                <strong>{dashboard.myCompensation.netPay}</strong>
              </div>
            ) : null}
            <div>
              <span>{opsText(language, "commissionAmount")}</span>
              <strong>{dashboard.myCompensation.commissionAmount || "—"}</strong>
            </div>
            <div>
              <span>{opsText(language, "commissionStatus")}</span>
              <strong>{statusLabel(language, dashboard.myCompensation.commissionStatus) || "—"}</strong>
            </div>
            <div>
              <span>{opsText(language, "disputeDeadline")}</span>
              <strong>
                {formatOpsDate(
                  dashboard.myCompensation.disputeDeadline,
                  language,
                ) || "—"}
              </strong>
            </div>
          </div>
          {dashboard.myCompensation.locked ||
          dashboard.myCompensation.actionsAvailable === false ? (
            <p className="fopsMyPayLocked">{opsText(language, "payLocked")}</p>
          ) : (
            <footer>
              {dashboard.myCompensation.acknowledged ? (
                <TonePill tone="success">
                  {opsText(language, "payAcknowledged")}
                </TonePill>
              ) : (
                <button
                  type="button"
                  className="fopsButton fopsButton--primary"
                  onClick={onAcknowledgeCompensation}
                  disabled={compensationBusy}
                >
                  {compensationBusy
                    ? opsText(language, "saving")
                    : opsText(language, "acknowledgePay")}
                </button>
              )}
              <button
                type="button"
                className="fopsButton fopsButton--ghost"
                onClick={onDisputeCompensation}
                disabled={compensationBusy}
              >
                {opsText(language, "disputePay")}
              </button>
            </footer>
          )}
        </section>
      ) : null}

      {dashboard.myExpenses?.length ? (
        <section className="fopsSection fopsMyExpenses">
          <SectionHeading
            title={opsText(language, "myExpensesTitle")}
            hint={opsText(language, "myExpensesHint")}
          />
          <div className="fopsMyExpenseList">
            {dashboard.myExpenses.slice(0, 5).map((expense) => (
              <article className="fopsMyExpenseRow" key={expense.id}>
                <span className="fopsMyExpenseIcon" aria-hidden="true">
                  <Receipt size={16} />
                </span>
                <strong>{expense.title}</strong>
                {expense.amount ? <span>{expense.amount}</span> : null}
                {expense.status ? (
                  <TonePill
                    tone={
                      /approved|reimbursed/i.test(expense.status)
                        ? "success"
                        : /rejected/i.test(expense.status)
                          ? "danger"
                          : "warning"
                    }
                  >
                    {statusLabel(language, expense.status)}
                  </TonePill>
                ) : null}
                {expense.submittedAt ? (
                  <small>{formatOpsDate(expense.submittedAt, language)}</small>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fopsSection">
        <SectionHeading
          title={opsText(language, "quickActions")}
          hint={opsText(language, "quickActionsHint")}
        />
        <div className="fopsQuickGrid">
          {actions.map((action) => {
            const Icon = quickActionIcons[action];
            const config = configured?.find((item) => item.key === action);
            if (config?.href) {
              return (
                <a className="fopsQuickAction" href={config.href} key={action}>
                  <span className="fopsQuickIcon">
                    <Icon size={20} />
                  </span>
                  <strong>{quickActionLabel(language, action)}</strong>
                  <ArrowRight size={17} />
                </a>
              );
            }
            return (
              <button
                className="fopsQuickAction"
                type="button"
                key={action}
                onClick={() => onQuickAction(action)}
              >
                <span className="fopsQuickIcon">
                  <Icon size={20} />
                </span>
                <strong>{quickActionLabel(language, action)}</strong>
                <ArrowRight size={17} />
              </button>
            );
          })}
        </div>
      </section>

      <div className="fopsHomeColumns">
        <section className="fopsSection fopsWorkSection">
          <SectionHeading
            title={opsText(language, "myWork")}
            hint={opsText(language, "myWorkHint")}
          />
          <div className="fopsQueueList">
            {dashboard.myWork?.length ? (
              dashboard.myWork.slice(0, 8).map((item) => (
                <QueueCard
                  item={item}
                  language={language}
                  onOpen={onOpenItem}
                  key={item.id}
                />
              ))
            ) : (
              <EmptyState
                title={opsText(language, "noWorkTitle")}
                body={opsText(language, "noWorkBody")}
              />
            )}
          </div>
        </section>

        <aside className="fopsSideStack">
          {dashboard.weekRhythm ? (
            <section className="fopsRhythmCard">
              <span className="fopsEyebrow">
                {opsText(language, "weeklyRhythm")}
              </span>
              <h2>{dashboard.weekRhythm.phase}</h2>
              <p>{dashboard.weekRhythm.guidance}</p>
              {dashboard.weekRhythm.checklist?.length ? (
                <div className="fopsRhythmChecklist">
                  <strong>{opsText(language, "weekChecklist")}</strong>
                  {dashboard.weekRhythm.checklist.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="fopsResourceCard">
            <SectionHeading title={opsText(language, "companyResources")} />
            <div className="fopsResourceList">
              {dashboard.links?.startHere ? (
                <ResourceLink
                  href={dashboard.links.startHere}
                  title={opsText(language, "policiesAndGuides")}
                  description={opsText(language, "policiesHint")}
                />
              ) : (
                <button
                  className="fopsResourceButton"
                  type="button"
                  onClick={() => onNavigate("policies")}
                >
                  <span className="fopsResourceIcon">
                    <BookOpenCheck size={18} />
                  </span>
                  <span>
                    <strong>{opsText(language, "policiesAndGuides")}</strong>
                    <small>{opsText(language, "policiesHint")}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              )}
              {dashboard.links?.advancedGrowth && user.role === "founder" ? (
                <ResourceLink
                  href={dashboard.links.advancedGrowth}
                  title={opsText(language, "advancedRecords")}
                  description={opsText(language, "advancedRecordsHint")}
                  restricted
                />
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
