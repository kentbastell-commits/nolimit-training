import {
  Trash2,
  ArrowRight,
  BarChart3,
  CalendarDays,
  FlaskConical,
  Handshake,
  Lightbulb,
  Megaphone,
  Plus,
  UserRoundSearch,
} from "lucide-react";
import { EmptyState, MetricGrid, SectionHeading, TonePill } from "./components";
import { opsText, statusLabel } from "./copy";
import { TranslatableText } from "./TranslatableText";
import type {
  CompanyOpsLanguage,
  OpsContentItem,
  OpsGrowthDashboard,
  QuickActionKey,
} from "./types";
import { formatOpsDate } from "./utils";

// Canonical content statuses (decode names) the server's update_status
// accepts for the content resource — the pipeline's drag-equivalent.
const CONTENT_STATUSES = [
  "Idea",
  "Research",
  "Script",
  "Ready to Film",
  "Filmed",
  "Editing",
  "Review",
  "Approved",
  "Scheduled",
  "Published",
  "Analyzed",
  "Archived",
] as const;

function ContentCard({
  item,
  language,
  onUpdateStatus,
}: {
  item: OpsContentItem;
  language: CompanyOpsLanguage;
  onUpdateStatus?: (contentId: string, status: string) => void;
}) {
  const inner = (
    <>
      <div className="fopsContentCardTop">
        <TonePill tone="blue">{item.platform || "—"}</TonePill>
        {item.approvalStatus ? (
          <TonePill
            tone={
              /approved|批准|通过/i.test(item.approvalStatus)
                ? "success"
                : "warning"
            }
          >
            {statusLabel(language, item.approvalStatus)}
          </TonePill>
        ) : null}
      </div>
      <strong>{item.title}</strong>
      <TranslatableText text={item.objective} language={language} />
      <div className="fopsContentMeta">
        {item.publishAt ? (
          <span>
            <CalendarDays size={14} />
            {formatOpsDate(item.publishAt, language, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : null}
        {item.ownerName ? <span>{item.ownerName}</span> : null}
      </div>
      {onUpdateStatus ? (
        <select
          className="fopsStatusSelect"
          value={item.status}
          aria-label={opsText(language, "moveStatus")}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            if (event.target.value !== item.status) {
              onUpdateStatus(item.id, event.target.value);
            }
          }}
        >
          {CONTENT_STATUSES.map((status) => (
            <option value={status} key={status}>
              {statusLabel(language, status)}
            </option>
          ))}
        </select>
      ) : null}
    </>
  );
  return item.href ? (
    <a className="fopsContentCard" href={item.href}>
      {inner}
    </a>
  ) : (
    <article className="fopsContentCard">{inner}</article>
  );
}

export default function GrowthHome({
  growth,
  language,
  onQuickAction,
  onUpdateContentStatus,
  onDeleteRecord,
}: {
  growth?: OpsGrowthDashboard;
  language: CompanyOpsLanguage;
  onQuickAction: (action: QuickActionKey) => void;
  onUpdateContentStatus?: (contentId: string, status: string) => void;
  onDeleteRecord?: (resource: string, recordId: string) => void;
}) {
  const pipeline = growth?.pipeline || [];
  const upcoming = growth?.upcomingContent || [];
  const leads = growth?.leadsToFollowUp || [];
  const partners = growth?.partnersToFollowUp || [];
  const campaigns = growth?.activeCampaigns || [];
  const experiments = growth?.experiments || [];

  return (
    <div className="fopsPage fopsGrowthPage">
      <header className="fopsPageHeader fopsPageHeader--actions">
        <div>
          <span className="fopsEyebrow">
            {opsText(language, "growthEyebrow")}
          </span>
          <h1>{opsText(language, "growthTitle")}</h1>
          <p>{opsText(language, "growthIntro")}</p>
        </div>
        <button
          className="fopsButton fopsButton--primary"
          type="button"
          onClick={() => onQuickAction("content")}
        >
          <Plus size={17} />
          {opsText(language, "contentAction")}
        </button>
      </header>

      <section className="fopsGrowthHero">
        <div>
          <span className="fopsGrowthHeroEyebrow">
            {opsText(language, "thisWeekPulse")}
          </span>
          <strong>
            {growth?.weeklyReportDue
              ? opsText(language, "weeklyReportDue")
              : opsText(language, "weeklyReportReady")}
          </strong>
        </div>
        {growth?.weeklyReportDue ? (
          <button
            type="button"
            onClick={() => onQuickAction("weekly_report")}
          >
            {opsText(language, "reportAction")}
            <ArrowRight size={17} />
          </button>
        ) : null}
      </section>

      <div className="fopsGrowthActions" aria-label={opsText(language, "quickActions")}>
        <button
          type="button"
          className="fopsButton fopsButton--ghost"
          onClick={() => onQuickAction("platform_metrics")}
        >
          <BarChart3 size={16} />
          {opsText(language, "platformMetricsAction")}
        </button>
        <button
          type="button"
          className="fopsButton fopsButton--ghost"
          onClick={() => onQuickAction("campaign")}
        >
          <Megaphone size={16} />
          {opsText(language, "campaignAction")}
        </button>
        <button
          type="button"
          className="fopsButton fopsButton--ghost"
          onClick={() => onQuickAction("experiment")}
        >
          <FlaskConical size={16} />
          {opsText(language, "experimentAction")}
        </button>
      </div>

      <MetricGrid metrics={growth?.metrics || []} />

      <section className="fopsSection">
        <SectionHeading
          eyebrow={opsText(language, "nextToPublish")}
          title={opsText(language, "contentPipeline")}
          hint={opsText(language, "contentPipelineHint")}
        />
        {pipeline.length ? (
          <div className="fopsPipeline" aria-label={opsText(language, "contentPipeline")}>
            {pipeline.map((phase) => (
              <section className="fopsPipelinePhase" key={phase.id}>
                <header>
                  <span className={`fopsPhaseDot fopsTone--${phase.tone || "gold"}`} />
                  <strong>{phase.label}</strong>
                  <em>{phase.count}</em>
                </header>
                <div className="fopsPipelineCards">
                  {phase.items?.length ? (
                    phase.items.slice(0, 3).map((item) => (
                      <ContentCard item={item} language={language} onUpdateStatus={onUpdateContentStatus} key={item.id} />
                    ))
                  ) : (
                    <p>{opsText(language, "noContentTitle")}</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            title={opsText(language, "noContentTitle")}
            body={opsText(language, "noContentBody")}
            icon={<Lightbulb size={24} />}
            action={
              <button
                className="fopsButton fopsButton--compact"
                type="button"
                onClick={() => onQuickAction("content")}
              >
                {opsText(language, "contentAction")}
              </button>
            }
          />
        )}
      </section>

      <div className="fopsGrowthTwoCol">
        <section className="fopsSection">
          <SectionHeading
            eyebrow={opsText(language, "nextToPublish")}
            title={opsText(language, "nextToPublish")}
          />
          <div className="fopsScheduleList">
            {upcoming.length ? (
              upcoming.slice(0, 6).map((item) => (
                <ContentCard item={item} language={language} onUpdateStatus={onUpdateContentStatus} key={item.id} />
              ))
            ) : (
              <EmptyState title={opsText(language, "noUpcomingContent")} />
            )}
          </div>
        </section>

        <section className="fopsSection">
          <SectionHeading title={opsText(language, "followUps")} />
          <div className="fopsFollowColumns">
            <div>
              <h3>
                <UserRoundSearch size={17} />
                {opsText(language, "leads")}
              </h3>
              <div className="fopsMiniList">
                {leads.length ? (
                  leads.slice(0, 5).map((lead) => {
                    const body = (
                      <>
                        <strong>{lead.name}</strong>
                        <span>{lead.productInterest || lead.status || "—"}</span>
                        {lead.nextAction ? (
                          <p>
                            <b>{opsText(language, "nextAction")}:</b>{" "}
                            {lead.nextAction}
                          </p>
                        ) : null}
                        {lead.nextActionAt ? (
                          <small>{formatOpsDate(lead.nextActionAt, language)}</small>
                        ) : null}
                        {onDeleteRecord ? (
                          <button
                            type="button"
                            className="fopsMiniDelete"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onDeleteRecord("lead", lead.id);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </>
                    );
                    return lead.href ? (
                      <a className="fopsMiniCard" href={lead.href} key={lead.id}>
                        {body}
                      </a>
                    ) : (
                      <article className="fopsMiniCard" key={lead.id}>
                        {body}
                      </article>
                    );
                  })
                ) : (
                  <p className="fopsQuietText">
                    {opsText(language, "noLeadFollowUps")}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="fopsTextButton"
                onClick={() => onQuickAction("lead")}
              >
                <Plus size={15} /> {opsText(language, "leadAction")}
              </button>
            </div>

            <div>
              <h3>
                <Handshake size={17} />
                {opsText(language, "partners")}
              </h3>
              <div className="fopsMiniList">
                {partners.length ? (
                  partners.slice(0, 5).map((partner) => {
                    const body = (
                      <>
                        <strong>{partner.name}</strong>
                        <span>{partner.stage || partner.platform || "—"}</span>
                        {partner.proposedCollaboration ? (
                          <p>{partner.proposedCollaboration}</p>
                        ) : null}
                        {partner.nextFollowUpAt ? (
                          <small>
                            {opsText(language, "nextFollowUp")}: {" "}
                            {formatOpsDate(partner.nextFollowUpAt, language)}
                          </small>
                        ) : null}
                        {onDeleteRecord ? (
                          <button
                            type="button"
                            className="fopsMiniDelete"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onDeleteRecord("partner", partner.id);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </>
                    );
                    return partner.href ? (
                      <a className="fopsMiniCard" href={partner.href} key={partner.id}>
                        {body}
                      </a>
                    ) : (
                      <article className="fopsMiniCard" key={partner.id}>
                        {body}
                      </article>
                    );
                  })
                ) : (
                  <p className="fopsQuietText">
                    {opsText(language, "noPartnerFollowUps")}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="fopsTextButton"
                onClick={() => onQuickAction("partner")}
              >
                <Plus size={15} /> {opsText(language, "partnerAction")}
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="fopsGrowthTwoCol">
        <section className="fopsSection">
          <SectionHeading
            eyebrow={opsText(language, "activeCampaigns")}
            title={opsText(language, "activeCampaigns")}
            action={
              <button
                type="button"
                className="fopsButton fopsButton--compact"
                onClick={() => onQuickAction("campaign")}
              >
                <Plus size={15} />
                {opsText(language, "campaignAction")}
              </button>
            }
          />
          <div className="fopsCampaignGrid">
            {campaigns.length ? (
              campaigns.slice(0, 4).map((campaign) => (
                <article className="fopsCampaignCard" key={campaign.id}>
                  <span className="fopsCampaignIcon">
                    <Megaphone size={18} />
                  </span>
                  <div>
                    <strong>{campaign.name}</strong>
                    {campaign.objective ? <p>{campaign.objective}</p> : null}
                    <div>
                      {campaign.status ? (
                        <TonePill tone="blue">{statusLabel(language, campaign.status)}</TonePill>
                      ) : null}
                      {campaign.leads != null ? (
                        <span>
                          {campaign.leads} {opsText(language, "leads")}
                        </span>
                      ) : null}
                      {campaign.collectedRevenue ? (
                        <span>{campaign.collectedRevenue}</span>
                      ) : null}
                    </div>
                  </div>
                  {onDeleteRecord ? (
                    <button
                      type="button"
                      className="fopsMiniDelete fopsMiniDelete--corner"
                      onClick={() => onDeleteRecord("campaign", campaign.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </article>
              ))
            ) : (
              <EmptyState title={opsText(language, "noActiveCampaigns")} />
            )}
          </div>
        </section>

        <section className="fopsSection">
          <SectionHeading
            eyebrow={opsText(language, "experiments")}
            title={opsText(language, "experiments")}
            action={
              <button
                type="button"
                className="fopsButton fopsButton--compact"
                onClick={() => onQuickAction("experiment")}
              >
                <Plus size={15} />
                {opsText(language, "experimentAction")}
              </button>
            }
          />
          <div className="fopsExperimentList">
            {experiments.length ? (
              experiments.slice(0, 5).map((experiment) => (
                <article className="fopsExperimentCard" key={experiment.id}>
                  <span>
                    <FlaskConical size={18} />
                  </span>
                  <div>
                    <strong>{experiment.name}</strong>
                    {experiment.hypothesis ? <p>{experiment.hypothesis}</p> : null}
                    <div>
                      {experiment.status ? (
                        <TonePill tone="purple">{statusLabel(language, experiment.status)}</TonePill>
                      ) : null}
                      {experiment.decision ? (
                        <TonePill
                          tone={
                            experiment.decision === "scale"
                              ? "success"
                              : experiment.decision === "stop"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {experiment.decision}
                        </TonePill>
                      ) : null}
                    </div>
                  </div>
                  {onDeleteRecord ? (
                    <button
                      type="button"
                      className="fopsMiniDelete fopsMiniDelete--corner"
                      onClick={() => onDeleteRecord("experiment", experiment.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </article>
              ))
            ) : (
              <EmptyState title={opsText(language, "noExperiments")} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
