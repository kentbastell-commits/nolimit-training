import { useState } from "react";
import {
  Pencil,
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
      <strong>
        <TranslatableText text={item.title} language={language} as="span" bare />
      </strong>
      <TranslatableText text={item.objective} language={language} bare />
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

// Inline editor for a follow-up record. Deliberately a PATCH: only the
// fields shown here are sent, so the many columns the Base holds for a lead
// or partner survive an edit made from this compact card.
function MiniEditForm({
  language,
  fields,
  initial,
  onCancel,
  onSave,
}: {
  language: CompanyOpsLanguage;
  fields: readonly { key: string; label: string; type?: "text" | "date" }[];
  initial: Record<string, string>;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const changed: Record<string, string> = {};
    for (const field of fields) {
      const next = (draft[field.key] ?? "").trim();
      if (next !== (initial[field.key] ?? "")) changed[field.key] = next;
    }
    if (!Object.keys(changed).length) {
      onCancel();
      return;
    }
    setBusy(true);
    try {
      await onSave(changed);
      onCancel();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fopsMiniEdit">
      {fields.map((field) => (
        <label key={field.key}>
          <span>{field.label}</span>
          <input
            type={field.type === "date" ? "date" : "text"}
            value={draft[field.key] ?? ""}
            onChange={(event) =>
              setDraft((current) => ({ ...current, [field.key]: event.target.value }))
            }
          />
        </label>
      ))}
      <div className="fopsMiniEditActions">
        <button type="button" className="fopsButton fopsButton--compact fopsButton--ghost" onClick={onCancel}>
          {opsText(language, "cancel")}
        </button>
        <button type="button" className="fopsButton fopsButton--compact" onClick={() => void submit()} disabled={busy}>
          {busy ? opsText(language, "saving") : opsText(language, "goalEditSave")}
        </button>
      </div>
    </div>
  );
}

export default function GrowthHome({
  growth,
  language,
  onQuickAction,
  onUpdateContentStatus,
  onDeleteRecord,
  onEditRecord,
}: {
  growth?: OpsGrowthDashboard;
  language: CompanyOpsLanguage;
  onQuickAction: (action: QuickActionKey) => void;
  onUpdateContentStatus?: (contentId: string, status: string) => void;
  onDeleteRecord?: (resource: string, recordId: string) => void;
  onEditRecord?: (
    resource: string,
    recordId: string,
    fields: Record<string, string>,
  ) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
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
                            <TranslatableText text={lead.nextAction} language={language} as="span" bare />
                          </p>
                        ) : null}
                        {lead.nextActionAt ? (
                          <small>{formatOpsDate(lead.nextActionAt, language)}</small>
                        ) : null}
                        <div className="fopsMiniTools">
                          {onEditRecord ? (
                            <button
                              type="button"
                              className="fopsMiniEditBtn"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setEditing(editing === `lead:${lead.id}` ? null : `lead:${lead.id}`);
                              }}
                            >
                              <Pencil size={13} />
                            </button>
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
                        </div>
                        {onEditRecord && editing === `lead:${lead.id}` ? (
                          <MiniEditForm
                            language={language}
                            fields={[
                              { key: "name", label: opsText(language, "leadName") },
                              { key: "contact", label: opsText(language, "leadContact") },
                              { key: "stage", label: opsText(language, "leadStage") },
                              { key: "productInterest", label: opsText(language, "leadInterest") },
                              { key: "nextFollowUp", label: opsText(language, "nextAction"), type: "date" },
                            ]}
                            initial={{
                              name: lead.name || "",
                              contact: "",
                              stage: lead.status || "",
                              productInterest: lead.productInterest || "",
                              nextFollowUp: (lead.nextActionAt || "").slice(0, 10),
                            }}
                            onCancel={() => setEditing(null)}
                            onSave={(values) => onEditRecord("lead", lead.id, values)}
                          />
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
                        <div className="fopsMiniTools">
                          {onEditRecord ? (
                            <button
                              type="button"
                              className="fopsMiniEditBtn"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setEditing(editing === `partner:${partner.id}` ? null : `partner:${partner.id}`);
                              }}
                            >
                              <Pencil size={13} />
                            </button>
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
                        </div>
                        {onEditRecord && editing === `partner:${partner.id}` ? (
                          <MiniEditForm
                            language={language}
                            fields={[
                              { key: "name", label: opsText(language, "partnerName") },
                              { key: "platform", label: opsText(language, "partnerPlatform") },
                              { key: "stage", label: opsText(language, "leadStage") },
                              { key: "proposedCollaboration", label: opsText(language, "partnerCollab") },
                              { key: "nextFollowUp", label: opsText(language, "nextAction"), type: "date" },
                            ]}
                            initial={{
                              name: partner.name || "",
                              platform: partner.platform || "",
                              stage: partner.stage || "",
                              proposedCollaboration: partner.proposedCollaboration || "",
                              nextFollowUp: (partner.nextFollowUpAt || "").slice(0, 10),
                            }}
                            onCancel={() => setEditing(null)}
                            onSave={(values) => onEditRecord("partner", partner.id, values)}
                          />
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
                    <strong>
                      <TranslatableText text={campaign.name} language={language} as="span" />
                    </strong>
                    {campaign.objective ? (
                      <TranslatableText text={campaign.objective} language={language} />
                    ) : null}
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
                    <strong>
                      <TranslatableText text={experiment.name} language={language} as="span" />
                    </strong>
                    {experiment.hypothesis ? (
                      <TranslatableText text={experiment.hypothesis} language={language} />
                    ) : null}
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
