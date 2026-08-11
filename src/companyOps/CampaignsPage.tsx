import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clipboard,
  ExternalLink,
  FileCheck2,
  Flag,
  Link2,
  Megaphone,
  Play,
  Plus,
  QrCode,
  ShieldCheck,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EmptyState, SectionHeading, TonePill } from "./components";
import type {
  CompanyOpsActionName,
  CompanyOpsLanguage,
  CompanyOpsUser,
  OpsCampaignTrackingLink,
  OpsCampaignWorkflowItem,
} from "./types";
import { formatOpsDate, formatOpsDateTime } from "./utils";

const t = (language: CompanyOpsLanguage, english: string, chinese: string) =>
  language === "zh" ? chinese : english;

const workflowSteps = [
  ["Proposal", "提交方案"],
  ["Approval", "审批"],
  ["Tracking kit", "跟踪包"],
  ["Results", "结果"],
  ["Reconciled", "核对完成"],
] as const;

const stepForStatus = (status: string) => {
  if (["Planning", "Pending Approval", "Changes Requested", "Rejected"].includes(status)) return 1;
  if (status === "Approved") return 2;
  if (status === "Active") return 3;
  if (status === "Reconciliation") return 4;
  if (status === "Reconciled") return 5;
  return 1;
};

const statusTone = (status: string) => {
  if (["Approved", "Active", "Reconciled"].includes(status)) return "success" as const;
  if (["Changes Requested", "Reconciliation"].includes(status)) return "warning" as const;
  if (["Rejected", "Cancelled"].includes(status)) return "danger" as const;
  return "blue" as const;
};

const statusText = (language: CompanyOpsLanguage, status: string) => {
  const chinese: Record<string, string> = {
    Planning: "草稿",
    "Pending Approval": "待审批",
    "Changes Requested": "需修改",
    Approved: "已批准",
    Active: "进行中",
    Completed: "已完成",
    Reconciliation: "待核对",
    Reconciled: "已核对",
    Rejected: "已拒绝",
    Cancelled: "已取消",
  };
  return language === "zh" ? chinese[status] || status : status;
};

const money = (value: number | undefined, currency = "CNY") =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-CN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);

function TrackingQr({ link }: { link: OpsCampaignTrackingLink }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(link.url, { width: 176, margin: 1 })
      .then((value) => {
        if (active) setSrc(value);
      })
      .catch(() => {
        // The copyable URL remains usable if a browser blocks canvas output.
      });
    return () => {
      active = false;
    };
  }, [link.url]);
  return src ? <img src={src} alt={`QR code for ${link.channel}`} /> : <QrCode size={52} />;
}

function copyText(value: string) {
  return navigator.clipboard.writeText(value).catch(() => undefined);
}

type CampaignAction = (
  action: CompanyOpsActionName,
  payload: Record<string, unknown>,
) => Promise<void>;

export default function CampaignsPage({
  campaigns,
  language,
  user,
  onCreate,
  onAction,
}: {
  campaigns: OpsCampaignWorkflowItem[];
  language: CompanyOpsLanguage;
  user: CompanyOpsUser;
  onCreate: () => void;
  onAction: CampaignAction;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(() =>
    new URLSearchParams(window.location.search).get("campaign") || undefined,
  );
  const [filter, setFilter] = useState<"all" | "attention" | "live" | "closed">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState<string>();
  const [feedback, setFeedback] = useState("");
  const selected = campaigns.find((campaign) => campaign.id === selectedId);
  const [share, setShare] = useState("100");
  const [customRate, setCustomRate] = useState("");
  const [revision, setRevision] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [reconciliation, setReconciliation] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selected) return;
    const timeoutId = window.setTimeout(() => {
      setFeedback(selected.reviewNote || "");
      setShare(String(selected.attributionSharePercent ?? (/digital/i.test(selected.product || "") ? 100 : 80)));
      setCustomRate("");
      setRevision({
        name: selected.name,
        objective: selected.objective || "",
        targetAudience: (selected.audience || []).join(", "),
        offer: selected.offer || "",
        product: selected.product || "",
        channels: (selected.channels || []).join(", "),
        budget: String(selected.budget ?? ""),
        revenueTarget: String(selected.revenueTarget ?? ""),
        successCriteria: selected.successCriteria || "",
        start: selected.startAt?.slice(0, 10) || "",
        end: selected.endAt?.slice(0, 10) || "",
      });
      setResults({
        resultsSummary: selected.resultsSummary || "",
        evidenceLinks: (selected.evidenceLinks || []).join("\n"),
        manualRevenue: String(selected.reportedManualRevenue ?? 0),
        adjustments: String(selected.reportedAdjustments ?? 0),
        reach: String(selected.reach ?? 0),
        clicks: String(selected.clicks ?? 0),
        consultations: String(selected.consultations ?? 0),
      });
      const defaultEligible = Math.max(
        0,
        selected.trackedCollectedRevenue +
          (selected.reportedManualRevenue || 0) -
          (selected.reportedAdjustments || 0),
      );
      setReconciliation({
        eligibleRevenue: String(selected.eligibleRevenue ?? defaultEligible),
        reconciliationNote: selected.reconciliationNote || "",
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selected]);

  const openCampaign = (campaignId: string) => {
    setError(undefined);
    setSelectedId(campaignId);
    const url = new URL(window.location.href);
    url.searchParams.set("campaign", campaignId);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const closeCampaign = () => {
    setSelectedId(undefined);
    const url = new URL(window.location.href);
    url.searchParams.delete("campaign");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const run = async (action: CompanyOpsActionName, payload: Record<string, unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await onAction(action, payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t(language, "The action failed.", "操作失败。"));
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(
    () => campaigns.filter((campaign) => {
      if (filter === "attention") {
        return user.role === "founder"
          ? campaign.canReview || campaign.canReconcile
          : campaign.canEdit || campaign.canActivate || campaign.canSubmitResults;
      }
      if (filter === "live") return ["Approved", "Active"].includes(campaign.status);
      if (filter === "closed") return ["Reconciled", "Rejected", "Cancelled"].includes(campaign.status);
      return true;
    }),
    [campaigns, filter, user.role],
  );

  const attentionCount = campaigns.filter((campaign) =>
    user.role === "founder"
      ? campaign.canReview || campaign.canReconcile
      : campaign.canEdit || campaign.canActivate || campaign.canSubmitResults,
  ).length;
  const trackedTotal = campaigns.reduce((sum, campaign) => sum + campaign.trackedCollectedRevenue, 0);
  const liveCount = campaigns.filter((campaign) => ["Approved", "Active"].includes(campaign.status)).length;
  const reconciledCommission = campaigns.reduce((sum, campaign) => sum + (campaign.commissionAmount || 0), 0);

  return (
    <div className="fopsPage fopsCampaignWorkspace">
      <header className="fopsPageHeader fopsPageHeader--actions">
        <div>
          <span className="fopsEyebrow">{t(language, "Revenue campaign workflow", "营收活动工作流")}</span>
          <h1>{t(language, "Campaigns & attribution", "活动与归因")}</h1>
          <p>{t(
            language,
            "Propose, approve, launch and reconcile every revenue campaign with one visible audit trail.",
            "用一条清晰的审计记录完成方案、审批、执行与回款核对。",
          )}</p>
        </div>
        <button type="button" className="fopsButton fopsButton--primary" onClick={onCreate}>
          <Plus size={17} />
          {t(language, "Propose campaign", "提交活动方案")}
        </button>
      </header>

      <section className="fopsCampaignWorkflowRail" aria-label={t(language, "Campaign workflow", "活动流程")}>
        {workflowSteps.map(([english, chinese], index) => (
          <div key={english}>
            <span>{index + 1}</span>
            <strong>{t(language, english, chinese)}</strong>
            {index < workflowSteps.length - 1 ? <ArrowRight size={16} /> : null}
          </div>
        ))}
      </section>

      <section className="fopsCampaignMetricGrid">
        <article><Flag size={18} /><span>{t(language, "Needs your action", "需要你处理")}</span><strong>{attentionCount}</strong></article>
        <article><Megaphone size={18} /><span>{t(language, "Approved / live", "已批准／进行中")}</span><strong>{liveCount}</strong></article>
        <article><WalletCards size={18} /><span>{t(language, "Tracked paid revenue", "已跟踪实付回款")}</span><strong>{money(trackedTotal)}</strong></article>
        <article><BadgeCheck size={18} /><span>{t(language, "Reconciled commission", "已核对提成")}</span><strong>{money(reconciledCommission)}</strong></article>
      </section>

      <section className="fopsSection">
        <SectionHeading
          title={t(language, "Campaign workspace", "活动工作区")}
          hint={t(language, "Cards show the next decision—not a raw database table.", "卡片只显示下一步行动，而不是原始数据表。")}
        />
        <div className="fopsCampaignFilters" role="group" aria-label={t(language, "Filter campaigns", "筛选活动")}>
          {([
            ["all", t(language, "All", "全部")],
            ["attention", t(language, "Needs action", "需要处理")],
            ["live", t(language, "Approved / live", "已批准／进行中")],
            ["closed", t(language, "Closed", "已结束")],
          ] as const).map(([key, label]) => (
            <button type="button" className={filter === key ? "is-active" : ""} onClick={() => setFilter(key)} key={key}>
              {label}
            </button>
          ))}
        </div>

        {filtered.length ? (
          <div className="fopsCampaignWorkspaceGrid">
            {filtered.map((campaign) => {
              const step = stepForStatus(campaign.status);
              const nextAction = campaign.canReview
                ? t(language, "Review proposal", "审批方案")
                : campaign.canEdit
                  ? t(language, "Revise & resubmit", "修改并重新提交")
                  : campaign.canActivate
                    ? t(language, "Open tracking kit", "打开跟踪包")
                    : campaign.canSubmitResults
                      ? t(language, "Submit results", "提交结果")
                      : campaign.canReconcile
                        ? t(language, "Reconcile revenue", "核对回款")
                        : t(language, "View campaign", "查看活动");
              return (
                <article className="fopsCampaignWorkspaceCard" key={campaign.id}>
                  <header>
                    <div className="fopsCampaignCardIcon"><Megaphone size={19} /></div>
                    <div>
                      <TonePill tone={statusTone(campaign.status)}>{statusText(language, campaign.status)}</TonePill>
                      <h3>{campaign.name}</h3>
                      <p>{campaign.objective || t(language, "No objective recorded", "尚未记录目标")}</p>
                    </div>
                  </header>
                  <div className="fopsCampaignStepDots" aria-label={`${step} / 5`}>
                    {workflowSteps.map(([label], index) => <span className={index < step ? "is-done" : ""} key={label} />)}
                  </div>
                  <dl>
                    <div><dt>{t(language, "Product", "产品")}</dt><dd>{campaign.product || "—"}</dd></div>
                    <div><dt>{t(language, "Dates", "日期")}</dt><dd>{formatOpsDate(campaign.startAt, language)} – {formatOpsDate(campaign.endAt, language)}</dd></div>
                    <div><dt>{t(language, "Revenue", "回款")}</dt><dd>{money(campaign.trackedCollectedRevenue, campaign.currency)}</dd></div>
                    <div><dt>{t(language, "Owner", "负责人")}</dt><dd>{campaign.ownerName || "—"}</dd></div>
                  </dl>
                  {campaign.reviewNote && campaign.status === "Changes Requested" ? (
                    <p className="fopsCampaignReviewNote"><strong>{t(language, "Founder feedback", "创始人意见")}:</strong> {campaign.reviewNote}</p>
                  ) : null}
                  <button type="button" className="fopsButton fopsButton--compact" onClick={() => openCampaign(campaign.id)}>
                    {nextAction}<ArrowRight size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Megaphone size={23} />}
            title={t(language, "No campaigns in this view", "此视图中没有活动")}
            body={t(language, "Create a complete proposal to start the workflow.", "提交完整方案即可启动流程。")}
          />
        )}
      </section>

      {selected ? (
        <div className="fopsCampaignDialogBackdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeCampaign();
        }}>
          <section className="fopsCampaignDialog" role="dialog" aria-modal="true" aria-labelledby="campaign-dialog-title">
            <header className="fopsCampaignDialogHeader">
              <div>
                <TonePill tone={statusTone(selected.status)}>{statusText(language, selected.status)}</TonePill>
                <h2 id="campaign-dialog-title">{selected.name}</h2>
                <p>{selected.objective}</p>
              </div>
              <button type="button" aria-label={t(language, "Close", "关闭")} onClick={closeCampaign}><X size={20} /></button>
            </header>

            <div className="fopsCampaignDialogBody">
              <section className="fopsCampaignAuditBanner">
                <ShieldCheck size={20} />
                <div>
                  <strong>{t(language, "Fair attribution is locked at approval", "公平归因在审批时锁定")}</strong>
                  <p>{t(
                    language,
                    "Originator 40% + campaign manager 40% + closer 20%. Unassigned roles are redistributed to assigned contributors. The approved employee share below is the controlling snapshot.",
                    "方案提出人40%＋活动负责人40%＋成交人20%。未分配角色的份额按比例分配给已分配贡献者；以下审批份额为最终控制快照。",
                  )}</p>
                </div>
              </section>

              <div className="fopsCampaignDetailGrid">
                <section className="fopsCampaignPanel">
                  <h3><Target size={17} />{t(language, "Approved brief", "活动方案")}</h3>
                  <dl>
                    <div><dt>{t(language, "Audience", "受众")}</dt><dd>{selected.audience?.join(" · ") || "—"}</dd></div>
                    <div><dt>{t(language, "Offer", "卖点")}</dt><dd>{selected.offer || "—"}</dd></div>
                    <div><dt>{t(language, "Channels", "渠道")}</dt><dd>{selected.channels?.join(" · ") || "—"}</dd></div>
                    <div><dt>{t(language, "Budget", "预算")}</dt><dd>{money(selected.budget)}</dd></div>
                    <div><dt>{t(language, "Revenue target", "目标回款")}</dt><dd>{money(selected.revenueTarget)}</dd></div>
                    <div><dt>{t(language, "Success criteria", "成功标准")}</dt><dd>{selected.successCriteria || "—"}</dd></div>
                  </dl>
                </section>
                <section className="fopsCampaignPanel">
                  <h3><FileCheck2 size={17} />{t(language, "Approval snapshot", "审批快照")}</h3>
                  <dl>
                    <div><dt>{t(language, "Submitted", "提交时间")}</dt><dd>{formatOpsDateTime(selected.submittedAt, language) || "—"}</dd></div>
                    <div><dt>{t(language, "Approved", "批准时间")}</dt><dd>{formatOpsDateTime(selected.approvedAt, language) || "—"}</dd></div>
                    <div><dt>{t(language, "Employee share", "员工归因份额")}</dt><dd>{selected.attributionSharePercent == null ? "—" : `${selected.attributionSharePercent}%`}</dd></div>
                    <div><dt>{t(language, "Approved starting rate", "批准起始提成比例")}</dt><dd>{selected.commissionRatePercent == null ? "—" : `${selected.commissionRatePercent}%`}</dd></div>
                    <div className="fopsCampaignDlWide"><dt>{t(language, "Rule", "规则")}</dt><dd>{selected.commissionRule || t(language, "Set when approved", "批准时确定")}</dd></div>
                  </dl>
                </section>
              </div>

              {selected.canReview ? (
                <section className="fopsCampaignActionPanel fopsCampaignActionPanel--review">
                  <h3>{t(language, "Founder review", "创始人审批")}</h3>
                  <p>{t(language, "Check the commercial promise, spend, dates, success measure and attribution before approving.", "批准前检查对外承诺、支出、日期、成功指标与归因份额。")}</p>
                  <div className="fopsCampaignActionFields">
                    <label><span>{t(language, "Employee attribution share (%)", "员工归因份额（%）")}</span><input type="number" min="0" max="100" value={share} onChange={(event) => setShare(event.target.value)} /></label>
                    <label><span>{t(language, "Custom written rate (%) — only when required", "书面自定义比例（%）—仅在需要时")}</span><input type="number" min="0" max="100" step="0.01" value={customRate} onChange={(event) => setCustomRate(event.target.value)} /></label>
                    <label className="fopsFieldWide"><span>{t(language, "Decision note", "审批意见")}</span><textarea rows={3} value={feedback} onChange={(event) => setFeedback(event.target.value)} /></label>
                  </div>
                  <div className="fopsCampaignActionButtons">
                    <button type="button" className="fopsButton fopsButton--ghost" disabled={busy || !feedback.trim()} onClick={() => void run("campaign.review", { campaignId: selected.id, decision: "reject", feedback })}>{t(language, "Reject", "拒绝")}</button>
                    <button type="button" className="fopsButton fopsButton--ghost" disabled={busy || !feedback.trim()} onClick={() => void run("campaign.review", { campaignId: selected.id, decision: "changes", feedback })}>{t(language, "Request changes", "要求修改")}</button>
                    <button type="button" className="fopsButton fopsButton--primary" disabled={busy} onClick={() => void run("campaign.review", { campaignId: selected.id, decision: "approve", feedback, attributionSharePercent: share, ...(customRate ? { customRatePercent: customRate } : {}) })}><Check size={16} />{busy ? t(language, "Saving…", "保存中…") : t(language, "Approve & generate codes", "批准并生成代码")}</button>
                  </div>
                </section>
              ) : null}

              {selected.canEdit ? (
                <form className="fopsCampaignActionPanel" onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  void run("campaign.update", { campaignId: selected.id, ...revision });
                }}>
                  <h3>{t(language, "Revise and resubmit", "修改并重新提交")}</h3>
                  {selected.reviewNote ? <p className="fopsCampaignReviewNote"><strong>{t(language, "Founder feedback", "创始人意见")}:</strong> {selected.reviewNote}</p> : null}
                  <div className="fopsCampaignActionFields">
                    {([
                      ["name", t(language, "Campaign name", "活动名称")],
                      ["product", t(language, "Product", "产品")],
                      ["targetAudience", t(language, "Audience", "受众")],
                      ["channels", t(language, "Channels", "渠道")],
                      ["budget", t(language, "Budget", "预算")],
                      ["revenueTarget", t(language, "Revenue target", "目标回款")],
                      ["start", t(language, "Start", "开始")],
                      ["end", t(language, "End", "结束")],
                    ] as const).map(([key, label]) => (
                      <label key={key}><span>{label}</span><input required type={["budget", "revenueTarget"].includes(key) ? "number" : ["start", "end"].includes(key) ? "date" : "text"} value={revision[key] || ""} onChange={(event) => setRevision((all) => ({ ...all, [key]: event.target.value }))} /></label>
                    ))}
                    {(["objective", "offer", "successCriteria"] as const).map((key) => (
                      <label className="fopsFieldWide" key={key}><span>{key === "objective" ? t(language, "Objective", "目标") : key === "offer" ? t(language, "Offer", "卖点") : t(language, "Success criteria", "成功标准")}</span><textarea required rows={3} value={revision[key] || ""} onChange={(event) => setRevision((all) => ({ ...all, [key]: event.target.value }))} /></label>
                    ))}
                  </div>
                  <button className="fopsButton fopsButton--primary" disabled={busy} type="submit">{t(language, "Resubmit for approval", "重新提交审批")}</button>
                </form>
              ) : null}

              {selected.trackingLinks.length ? (
                <section className="fopsCampaignPanel fopsCampaignTrackingPanel">
                  <div className="fopsCampaignPanelHeading">
                    <div><h3><Link2 size={17} />{t(language, "Tracking kit", "跟踪包")}</h3><p>{t(language, "These are attribution codes, not customer discount codes.", "这些是归因代码，不是客户折扣码。")}</p></div>
                    <button type="button" className="fopsButton fopsButton--ghost" onClick={() => {
                      void copyText(selected.trackingLinks.map((link) => `${link.channel}: ${link.url}`).join("\n"));
                      setCopied("all");
                    }}><Clipboard size={15} />{copied === "all" ? t(language, "Copied", "已复制") : t(language, "Copy all links", "复制全部链接")}</button>
                  </div>
                  <div className="fopsTrackingIdentity">
                    <div><span>{t(language, "Campaign code", "活动代码")}</span><strong>{selected.campaignCode}</strong></div>
                    <div><span>{t(language, "Staff code", "员工归因代码")}</span><strong>{selected.staffAttributionCode}</strong></div>
                  </div>
                  <div className="fopsTrackingLinkGrid">
                    {selected.trackingLinks.map((link) => (
                      <article key={link.attributionCode}>
                        <TrackingQr link={link} />
                        <div><strong>{link.channel}</strong><code>{link.attributionCode}</code><p>{link.url}</p></div>
                        <div>
                          <button type="button" onClick={() => { void copyText(link.url); setCopied(link.attributionCode); }}><Clipboard size={14} />{copied === link.attributionCode ? t(language, "Copied", "已复制") : t(language, "Copy link", "复制链接")}</button>
                          <a href={link.url} target="_blank" rel="noreferrer"><ExternalLink size={14} />{t(language, "Test", "测试")}</a>
                        </div>
                      </article>
                    ))}
                  </div>
                  {selected.canActivate ? <button type="button" className="fopsButton fopsButton--primary" disabled={busy} onClick={() => void run("campaign.activate", { campaignId: selected.id })}><Play size={16} />{t(language, "Start campaign", "启动活动")}</button> : null}
                </section>
              ) : null}

              {selected.canSubmitResults ? (
                <form className="fopsCampaignActionPanel" onSubmit={(event) => {
                  event.preventDefault();
                  void run("campaign.results.submit", { campaignId: selected.id, ...results });
                }}>
                  <h3>{t(language, "Submit campaign results", "提交活动结果")}</h3>
                  <p>{t(language, "Postgres-paid orders are already counted below. Report offline or contract cash only after it has actually been collected.", "Postgres中的已支付订单已自动计入。线下或机构合同只有实际回款后才能申报。")}</p>
                  <div className="fopsCampaignLiveRevenue"><span>{t(language, "Automatically tracked", "自动跟踪")}</span><strong>{money(selected.trackedCollectedRevenue, selected.currency)}</strong><small>{selected.trackedOrderCount} {t(language, "paid orders", "笔已支付订单")}</small></div>
                  <div className="fopsCampaignActionFields">
                    {(["reach", "clicks", "consultations", "manualRevenue", "adjustments"] as const).map((key) => (
                      <label key={key}><span>{key === "reach" ? t(language, "Reach", "触达") : key === "clicks" ? t(language, "Clicks", "点击") : key === "consultations" ? t(language, "Qualified leads / consultations", "合格线索／咨询") : key === "manualRevenue" ? t(language, "Collected offline / contract revenue", "线下／合同实际回款") : t(language, "Refunds & adjustments", "退款与调整")}</span><input type="number" min="0" step={key === "reach" || key === "clicks" || key === "consultations" ? "1" : "0.01"} value={results[key]} onChange={(event) => setResults((all) => ({ ...all, [key]: event.target.value }))} /></label>
                    ))}
                    <label className="fopsFieldWide"><span>{t(language, "Results summary", "结果总结")}</span><textarea required rows={4} value={results.resultsSummary} onChange={(event) => setResults((all) => ({ ...all, resultsSummary: event.target.value }))} /></label>
                    <label className="fopsFieldWide"><span>{t(language, "Evidence links — one HTTPS link per line", "证据链接—每行一个HTTPS链接")}</span><textarea rows={3} value={results.evidenceLinks} onChange={(event) => setResults((all) => ({ ...all, evidenceLinks: event.target.value }))} /></label>
                  </div>
                  <button type="submit" className="fopsButton fopsButton--primary" disabled={busy}>{t(language, "Send for reconciliation", "提交核对")}</button>
                </form>
              ) : null}

              {selected.canReconcile ? (
                <form className="fopsCampaignActionPanel fopsCampaignActionPanel--reconcile" onSubmit={(event) => {
                  event.preventDefault();
                  void run("campaign.reconcile", { campaignId: selected.id, ...reconciliation });
                }}>
                  <h3>{t(language, "Founder revenue reconciliation", "创始人回款核对")}</h3>
                  <div className="fopsReconciliationMath">
                    <span>{money(selected.trackedCollectedRevenue)} {t(language, "tracked", "自动跟踪")}</span>
                    <b>+</b><span>{money(selected.reportedManualRevenue || 0)} {t(language, "reported", "申报回款")}</span>
                    <b>−</b><span>{money(selected.reportedAdjustments || 0)} {t(language, "adjustments", "调整")}</span>
                  </div>
                  <div className="fopsCampaignActionFields">
                    <label><span>{t(language, "Approved eligible revenue", "核准归因回款")}</span><input required type="number" min="0" step="0.01" value={reconciliation.eligibleRevenue} onChange={(event) => setReconciliation((all) => ({ ...all, eligibleRevenue: event.target.value }))} /></label>
                    <label className="fopsFieldWide"><span>{t(language, "Reconciliation note", "核对说明")}</span><textarea required rows={3} value={reconciliation.reconciliationNote} onChange={(event) => setReconciliation((all) => ({ ...all, reconciliationNote: event.target.value }))} /></label>
                  </div>
                  <button type="submit" className="fopsButton fopsButton--primary" disabled={busy}><BadgeCheck size={16} />{t(language, "Reconcile & stage for monthly statement", "核对并进入月度结算")}</button>
                </form>
              ) : null}

              {selected.status === "Reconciled" ? (
                <section className="fopsCampaignReconciled">
                  <BadgeCheck size={30} />
                  <div><strong>{t(language, "Reconciliation complete", "核对完成")}</strong><p>{t(language, "This amount is ready for the monthly commission statement. It has not been paid automatically.", "该金额已可进入月度提成结算单，但尚未自动支付。")}</p></div>
                  <dl><div><dt>{t(language, "Eligible revenue", "核准回款")}</dt><dd>{money(selected.eligibleRevenue)}</dd></div><div><dt>{t(language, "Campaign commission", "活动提成")}</dt><dd>{money(selected.commissionAmount)}</dd></div></dl>
                </section>
              ) : null}

              {error ? <p className="fopsFormError" role="alert">{error}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
