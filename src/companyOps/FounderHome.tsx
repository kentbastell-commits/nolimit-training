import {
  Banknote,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  MessageSquareWarning,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import {
  EmptyState,
  MetricGrid,
  ResourceLink,
  SectionHeading,
  TonePill,
} from "./components";
import { opsText } from "./copy";
import type {
  CompanyOpsLanguage,
  OpsDecisionItem,
  OpsFinanceSummary,
  OpsMetric,
  OpsOnboardingCaseSummary,
} from "./types";
import { formatOpsDate } from "./utils";

const categoryIcons = {
  content: FileCheck2,
  spend: CircleDollarSign,
  partner: ShieldCheck,
  people: UserRoundCheck,
  finance: Banknote,
  filming: MessageSquareWarning,
  other: MessageSquareWarning,
} satisfies Record<OpsDecisionItem["category"], typeof FileCheck2>;

export default function FounderHome({
  language,
  decisions,
  finance,
  onboardingCases,
  growthMetrics,
  canResolve,
  busyDecisionId,
  onDecision,
}: {
  language: CompanyOpsLanguage;
  decisions: OpsDecisionItem[];
  finance?: OpsFinanceSummary;
  onboardingCases: OpsOnboardingCaseSummary[];
  growthMetrics: OpsMetric[];
  canResolve: boolean;
  busyDecisionId?: string;
  onDecision: (
    decision: OpsDecisionItem,
    outcome: "approve" | "changes",
  ) => void;
}) {
  const categoryCounts = decisions.reduce<Record<string, number>>((all, item) => {
    all[item.category] = (all[item.category] || 0) + 1;
    return all;
  }, {});

  return (
    <div className="fopsPage fopsFounderPage">
      <header className="fopsPageHeader">
        <div>
          <span className="fopsEyebrow">
            {opsText(language, "founderEyebrow")}
          </span>
          <h1>{opsText(language, "founderTitle")}</h1>
          <p>{opsText(language, "founderIntro")}</p>
        </div>
      </header>

      <section className="fopsFounderHero">
        <div className="fopsFounderHeroGlow" />
        <span>{opsText(language, "decisionCount", { count: decisions.length })}</span>
        <strong>{decisions.length}</strong>
        <p>{opsText(language, "founderIntro")}</p>
      </section>

      {decisions.length ? (
        <div className="fopsDecisionSummary">
          {Object.entries(categoryCounts).map(([category, count]) => {
            const Icon = categoryIcons[category as OpsDecisionItem["category"]];
            return (
              <div className="fopsDecisionSummaryItem" key={category}>
                <Icon size={17} />
                <span>{category}</span>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
      ) : null}

      <section className="fopsSection">
        <SectionHeading
          title={opsText(language, "founderTitle")}
          hint={opsText(language, "founderIntro")}
        />
        {decisions.length ? (
          <div className="fopsDecisionGrid">
            {decisions.map((decision) => {
              const Icon = categoryIcons[decision.category];
              const busy = busyDecisionId === decision.id;
              return (
                <article className="fopsDecisionCard" key={decision.id}>
                  <header>
                    <span className="fopsDecisionIcon">
                      <Icon size={19} />
                    </span>
                    <div>
                      <TonePill tone="warning">{decision.category}</TonePill>
                      <h3>{decision.title}</h3>
                    </div>
                  </header>
                  {decision.summary ? <p>{decision.summary}</p> : null}
                  {decision.context?.length ? (
                    <ul>
                      {decision.context.map((context) => (
                        <li key={context}>{context}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="fopsDecisionMeta">
                    {decision.requestedBy ? (
                      <span>
                        {opsText(language, "requestedBy")}: {decision.requestedBy}
                      </span>
                    ) : null}
                    {decision.dueAt ? (
                      <span>{formatOpsDate(decision.dueAt, language)}</span>
                    ) : null}
                    {decision.amount ? <strong>{decision.amount}</strong> : null}
                  </div>
                  <footer>
                    {decision.href ? (
                      <a href={decision.href} className="fopsButton fopsButton--ghost">
                        {opsText(language, "viewContext")}
                        <ChevronRight size={16} />
                      </a>
                    ) : null}
                    {canResolve ? (
                      <>
                        <button
                          type="button"
                          className="fopsButton fopsButton--ghost"
                          onClick={() => onDecision(decision, "changes")}
                          disabled={Boolean(busyDecisionId)}
                        >
                          <X size={16} />
                          {opsText(language, "requestChanges")}
                        </button>
                        <button
                          type="button"
                          className="fopsButton fopsButton--primary"
                          onClick={() => onDecision(decision, "approve")}
                          disabled={Boolean(busyDecisionId)}
                        >
                          <Check size={16} />
                          {busy ? opsText(language, "saving") : opsText(language, "approve")}
                        </button>
                      </>
                    ) : null}
                  </footer>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={opsText(language, "noDecisionsTitle")}
            body={opsText(language, "noDecisionsBody")}
          />
        )}
      </section>

      <div className="fopsFounderColumns">
        <section className="fopsSection fopsFinanceSection">
          <SectionHeading
            eyebrow={opsText(language, "restrictedFinance")}
            title={opsText(language, "restrictedFinance")}
            hint={opsText(language, "financeHint")}
          />
          {finance ? (
            <>
              <MetricGrid metrics={finance.metrics || []} />
              <div className="fopsFinanceStatuses">
                <div>
                  <span>{opsText(language, "payroll")}</span>
                  <strong>{finance.payrollStatus || "—"}</strong>
                </div>
                <div>
                  <span>{opsText(language, "commissions")}</span>
                  <strong>{finance.commissionStatus || "—"}</strong>
                </div>
                <div>
                  <span>{opsText(language, "expenses")}</span>
                  <strong>{finance.expenseStatus || "—"}</strong>
                </div>
              </div>
              {finance.links?.length ? (
                <div className="fopsResourceList">
                  {finance.links.map((link) => (
                    <ResourceLink
                      href={link.url}
                      title={link.label || opsText(language, "openResource")}
                      restricted
                      key={link.url}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title={opsText(language, "restrictedFinance")}
              body={opsText(language, "financeHint")}
              icon={<ShieldCheck size={23} />}
            />
          )}
        </section>

        <section className="fopsSection">
          <SectionHeading title={opsText(language, "onboardingWatch")} />
          {onboardingCases.length ? (
            <div className="fopsOnboardingWatchList">
              {onboardingCases.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.employeeName}</strong>
                    {item.blocker ? <p>{item.blocker}</p> : null}
                    {item.nextDueAt ? (
                      <small>{formatOpsDate(item.nextDueAt, language)}</small>
                    ) : null}
                  </div>
                  <span>{item.progress}%</span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title={opsText(language, "noOnboardingBlockers")} />
          )}
        </section>
      </div>

      {growthMetrics.length ? (
        <section className="fopsSection">
          <SectionHeading title={opsText(language, "growthPulse")} />
          <MetricGrid metrics={growthMetrics} />
        </section>
      ) : null}
    </div>
  );
}
