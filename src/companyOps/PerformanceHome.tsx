import {
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ExternalLink,
  FileVideo2,
  Flag,
  Link2,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { EmptyState, SectionHeading, TonePill } from "./components";
import type {
  CompanyOpsActionName,
  CompanyOpsLanguage,
  CompanyOpsUser,
  OpsAssetUploadResult,
  OpsPerformanceCycle,
  OpsPerformanceDashboard,
  OpsPerformanceGoal,
} from "./types";
import { formatOpsDate } from "./utils";

const MAX_ASSET_BYTES = 500 * 1024 * 1024;
const DEFAULT_GOALS: Array<Pick<OpsPerformanceGoal, "title" | "weight">> = [
  { title: "Content & Delivery", weight: 25 },
  { title: "Quality & Optimization", weight: 20 },
  { title: "Campaigns & Partners", weight: 20 },
  { title: "Community & Leads", weight: 15 },
  { title: "Organization & Ownership", weight: 20 },
];

function text(language: CompanyOpsLanguage, en: string, zh: string) {
  return language === "zh" ? zh : en;
}

function money(value: number | undefined, language: CompanyOpsLanguage) {
  if (value == null) return "—";
  return new Intl.NumberFormat(language === "zh" ? "zh-CN" : "en-GB", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

function bonusForScore(score: number) {
  if (score >= 90) return 2_000;
  if (score >= 80) return 1_500;
  if (score >= 70) return 1_000;
  if (score >= 60) return 500;
  return 0;
}

function monthLabel(value: string, language: CompanyOpsLanguage) {
  if (!/^\d{4}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

function statusTone(status: string) {
  if (/final|paid|confirm|accepted|已确认|已支付/i.test(status)) return "success" as const;
  if (/change|challenge|异议|补充/i.test(status)) return "danger" as const;
  if (/report|review|scor|提交|评分/i.test(status)) return "blue" as const;
  return "gold" as const;
}

function validHttpsLinks(value: string) {
  const values = value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return {
    values,
    valid: values.every((entry) => {
      try {
        return new URL(entry).protocol === "https:";
      } catch {
        return false;
      }
    }),
  };
}

function CycleTimeline({
  cycle,
  language,
}: {
  cycle: OpsPerformanceCycle;
  language: CompanyOpsLanguage;
}) {
  const stages = [
    {
      label: text(language, "Goals confirmed", "目标确认"),
      at: cycle.prioritiesConfirmedAt,
      done: Boolean(cycle.prioritiesConfirmedAt || cycle.goals.length),
    },
    {
      label: text(language, "Monthly report", "月度报告"),
      at: cycle.reportSubmittedAt,
      done: Boolean(cycle.reportSubmittedAt),
    },
    {
      label: text(language, "Founder review", "负责人评审"),
      at: cycle.scoredAt,
      done: Boolean(cycle.scoredAt),
    },
    {
      label: text(language, "Finalised", "完成定稿"),
      at: cycle.finalizedAt,
      done: Boolean(cycle.finalizedAt),
    },
  ];
  const active = Math.min(
    stages.findIndex((stage) => !stage.done),
    stages.length - 1,
  );
  return (
    <ol className="fopsPerformanceTimeline" aria-label={text(language, "Review progress", "评审进度")}>
      {stages.map((stage, index) => (
        <li
          className={stage.done ? "is-done" : index === active ? "is-active" : ""}
          key={stage.label}
        >
          <span>{stage.done ? <Check size={14} /> : <CircleDot size={14} />}</span>
          <div>
            <strong>{stage.label}</strong>
            <small>
              {stage.at
                ? formatOpsDate(stage.at, language)
                : index === active
                  ? text(language, "Current step", "当前步骤")
                  : text(language, "Not started", "尚未开始")}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}

function GoalCards({
  cycle,
  language,
}: {
  cycle: OpsPerformanceCycle;
  language: CompanyOpsLanguage;
}) {
  return (
    <div className="fopsPerformanceGoals">
      {cycle.goals.map((goal) => (
        <article className="fopsPerformanceGoal" key={`${cycle.id}-${goal.index}`}>
          <header>
            <span>{String(goal.index).padStart(2, "0")}</span>
            <TonePill tone="gold">{goal.weight}%</TonePill>
          </header>
          <h3>{goal.title}</h3>
          <div className="fopsPerformanceMeasure">
            <Flag size={16} aria-hidden="true" />
            <div>
              <small>{text(language, "Success measure", "成功标准")}</small>
              <p>{goal.measure || text(language, "To be confirmed", "待确认")}</p>
            </div>
          </div>
          {goal.result ? (
            <div className="fopsPerformanceResult">
              <small>{text(language, "Reported result", "汇报结果")}</small>
              <p>{goal.result}</p>
            </div>
          ) : null}
          {goal.score != null ? (
            <strong className="fopsPerformanceScore">{goal.score}/100</strong>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function AssetDropzone({
  language,
  driveUrl,
  onUpload,
  onUploaded,
}: {
  language: CompanyOpsLanguage;
  driveUrl?: string;
  onUpload?: (file: File) => Promise<OpsAssetUploadResult>;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const upload = async (file?: File) => {
    if (!file) return;
    setError(undefined);
    setMessage(undefined);
    if (!file.type.startsWith("video/")) {
      setError(text(language, "Choose a video file.", "请选择视频文件。"));
      return;
    }
    if (file.size > MAX_ASSET_BYTES) {
      setError(
        text(
          language,
          "This file is over the 500 MB Company Operations upload limit.",
          "文件超过公司运营工作区 500 MB 的上传上限。",
        ),
      );
      return;
    }
    if (!onUpload) {
      setError(text(language, "Direct upload is not available yet. Open Drive instead.", "暂时无法直接上传，请改用飞书云盘。"));
      return;
    }
    setBusy(true);
    try {
      const result = await onUpload(file);
      if (result.url) onUploaded(result.url);
      setMessage(
        result.url
          ? text(language, "Uploaded and added to your evidence links.", "上传成功，并已加入证明链接。")
          : text(language, "Uploaded to the Company Operations Drive.", "已上传至公司运营云盘。"),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : text(language, "Upload failed. Please try again.", "上传失败，请重试。"),
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files[0]);
  };

  return (
    <section className="fopsSection fopsAssetSection">
      <SectionHeading
        eyebrow={text(language, "Feishu Drive", "飞书云盘")}
        title={text(language, "Video evidence & working files", "视频证明与工作文件")}
        hint={text(
          language,
          "Keep source videos in the Company Operations folder, then attach the link to your report.",
          "请将源视频存入公司运营文件夹，并把链接附在月度报告中。",
        )}
        action={
          driveUrl ? (
            <a className="fopsButton fopsButton--ghost" href={driveUrl} target="_blank" rel="noreferrer">
              {text(language, "Open Drive", "打开云盘")}
              <ExternalLink size={16} />
            </a>
          ) : undefined
        }
      />
      {onUpload ? (
        <div
          className={`fopsAssetDropzone ${dragging ? "is-dragging" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <span><FileVideo2 size={24} /></span>
          <div>
            <strong>{text(language, "Drop a video here", "拖入视频文件")}</strong>
            <p>{text(language, "MP4/MOV and other video files · up to 500 MB", "支持 MP4、MOV 等视频 · 最大 500 MB")}</p>
          </div>
          <button
            className="fopsButton fopsButton--ghost"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <UploadCloud size={16} />
            {busy ? text(language, "Uploading…", "上传中…") : text(language, "Choose video", "选择视频")}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="fopsAssetReadOnly">
          <ShieldCheck size={20} />
          <div>
            <strong>{text(language, "Company files are available in Feishu Drive", "公司文件可在飞书云盘查看")}</strong>
            <p>{text(language, "Only Brand & Growth and founders can upload from this workspace.", "只有品牌与增长岗位及创始人可从此工作区上传。")}</p>
          </div>
        </div>
      )}
      {message ? <p className="fopsInlineNotice fopsInlineNotice--success" role="status">{message}</p> : null}
      {error ? <p className="fopsInlineNotice fopsInlineNotice--error" role="alert">{error}</p> : null}
      <small className="fopsAssetPrivacy">
        <ShieldCheck size={14} />
        {text(language, "Use the dedicated Company Operations folder—not the retired training-app storage.", "请使用专用的公司运营文件夹，不要使用已停用的训练应用存储。")}
      </small>
    </section>
  );
}

function EmployeeReportForm({
  cycle,
  language,
  uploadedLinks,
  onAction,
}: {
  cycle: OpsPerformanceCycle;
  language: CompanyOpsLanguage;
  uploadedLinks: string[];
  onAction: (action: CompanyOpsActionName, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [summary, setSummary] = useState(cycle.selfReview || "");
  const [context, setContext] = useState(cycle.context || "");
  const [results, setResults] = useState<Record<number, string>>(
    Object.fromEntries(cycle.goals.map((goal) => [goal.index, goal.result || ""])),
  );
  const [evidence, setEvidence] = useState((cycle.evidenceLinks || []).join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const evidenceWithUploads = useMemo(() => {
    const existing = evidence
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return [...new Set([...existing, ...uploadedLinks])].join("\n");
  }, [evidence, uploadedLinks]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const links = validHttpsLinks(evidenceWithUploads);
    if (!summary.trim() || cycle.goals.some((goal) => !results[goal.index]?.trim())) {
      setError(text(language, "Complete the summary and every goal result.", "请填写总结和每项目标的结果。"));
      return;
    }
    if (!links.valid) {
      setError(text(language, "Every evidence link must begin with https://", "所有证明链接必须以 https:// 开头。"));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onAction("performance.report.submit", {
        performanceId: cycle.id,
        selfReview: summary.trim(),
        results: cycle.goals.map((goal) => ({ index: goal.index, result: results[goal.index].trim() })),
        evidenceLinks: links.values,
        context: context.trim() || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text(language, "The report could not be submitted.", "报告提交失败。"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fopsSection fopsPerformanceFormSection">
      <SectionHeading
        eyebrow={text(language, "Your evidence", "你的证明")}
        title={text(language, "Submit your monthly report", "提交月度报告")}
        hint={text(language, "Explain the result against each agreed goal. Clear facts and links are stronger than a long narrative.", "请按每项已确认目标说明成果。清晰事实与链接比冗长叙述更有说服力。")}
      />
      <form className="fopsPerformanceReportForm" onSubmit={submit}>
        <label className="fopsPerformanceField fopsPerformanceField--wide">
          <span>{text(language, "Month in one paragraph", "本月总结")}</span>
          <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={4} placeholder={text(language, "What changed because of your work?", "你的工作带来了哪些变化？")} />
        </label>
        <div className="fopsPerformanceResultFields">
          {cycle.goals.map((goal) => (
            <label className="fopsPerformanceField" key={goal.index}>
              <span><em>{goal.index}</em>{goal.title}</span>
              <small>{goal.measure}</small>
              <textarea value={results[goal.index] || ""} onChange={(event) => setResults((current) => ({ ...current, [goal.index]: event.target.value }))} rows={4} placeholder={text(language, "Result, metric and your contribution", "结果、数据和你的贡献")} />
            </label>
          ))}
        </div>
        <label className="fopsPerformanceField fopsPerformanceField--wide">
          <span><Link2 size={15} />{text(language, "Evidence links", "证明链接")}</span>
          <textarea value={evidenceWithUploads} onChange={(event) => setEvidence(event.target.value)} rows={3} placeholder="https://…" />
          <small>{text(language, "One HTTPS link per line. Use the video area below to upload a small file first.", "每行一个 HTTPS 链接。小文件可先使用下方视频区上传。")}</small>
        </label>
        <label className="fopsPerformanceField fopsPerformanceField--wide">
          <span>{text(language, "Context, constraints or support needed (optional)", "背景、限制或所需支持（选填）")}</span>
          <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={3} />
        </label>
        {error ? <p className="fopsInlineNotice fopsInlineNotice--error" role="alert">{error}</p> : null}
        <footer>
          <span><ShieldCheck size={15} />{text(language, "You can review everything before sending.", "提交前可检查所有内容。")}</span>
          <button className="fopsButton fopsButton--primary" type="submit" disabled={busy}>
            <Send size={16} />
            {busy ? text(language, "Submitting…", "提交中…") : text(language, "Submit report", "提交报告")}
          </button>
        </footer>
      </form>
    </section>
  );
}

function EmployeeResponse({
  cycle,
  language,
  onAction,
}: {
  cycle: OpsPerformanceCycle;
  language: CompanyOpsLanguage;
  onAction: (action: CompanyOpsActionName, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<"accept" | "challenge">();
  const [error, setError] = useState<string>();
  const respond = async (response: "accept" | "challenge") => {
    if (response === "challenge" && !comment.trim()) {
      setError(text(language, "Explain what you would like reviewed.", "请说明希望复核的内容。"));
      return;
    }
    setBusy(response);
    setError(undefined);
    try {
      await onAction("performance.review.respond", {
        performanceId: cycle.id,
        response,
        comment: comment.trim() || undefined,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text(language, "Your response could not be saved.", "无法保存你的回应。"));
    } finally {
      setBusy(undefined);
    }
  };
  return (
    <section className="fopsSection fopsPerformanceResponse">
      <SectionHeading
        eyebrow={text(language, "Your confirmation", "你的确认")}
        title={text(language, "Review the founder's assessment", "查看负责人评审")}
        hint={text(language, "Accept if the assessment is accurate, or ask for a specific point to be reviewed.", "如评审准确请确认；如有问题，请明确提出需要复核的事项。")}
      />
      <div className="fopsReviewSummary">
        <div><span>{text(language, "Weighted score", "加权得分")}</span><strong>{cycle.weightedScore == null ? "—" : `${cycle.weightedScore}/100`}</strong></div>
        <div><span>{text(language, "Approved bonus", "核准奖金")}</span><strong>{money(cycle.approvedBonus, language)}</strong></div>
      </div>
      {cycle.founderReview ? <blockquote>{cycle.founderReview}</blockquote> : null}
      <label className="fopsPerformanceField">
        <span>{text(language, "Comment (required only for a challenge)", "说明（提出异议时必填）")}</span>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} />
      </label>
      {error ? <p className="fopsInlineNotice fopsInlineNotice--error" role="alert">{error}</p> : null}
      <div className="fopsPerformanceResponseActions">
        <button className="fopsButton fopsButton--ghost" type="button" onClick={() => void respond("challenge")} disabled={Boolean(busy)}>
          <MessageSquareText size={16} />
          {busy === "challenge" ? text(language, "Sending…", "发送中…") : text(language, "Ask for review", "申请复核")}
        </button>
        <button className="fopsButton fopsButton--primary" type="button" onClick={() => void respond("accept")} disabled={Boolean(busy)}>
          <CheckCircle2 size={16} />
          {busy === "accept" ? text(language, "Saving…", "保存中…") : text(language, "Accept assessment", "确认评审")}
        </button>
      </div>
    </section>
  );
}

function GoalSetter({
  language,
  staff,
  onAction,
}: {
  language: CompanyOpsLanguage;
  staff: OpsPerformanceDashboard["staff"];
  onAction: (action: CompanyOpsActionName, payload: Record<string, unknown>) => Promise<void>;
}) {
  const now = new Date();
  const [employeeId, setEmployeeId] = useState(staff?.[0]?.staffRecordId || "");
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [reportDue, setReportDue] = useState("");
  const [goals, setGoals] = useState(
    DEFAULT_GOALS.map((goal) => ({ ...goal, measure: "" })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const totalWeight = goals.reduce((sum, goal) => sum + Number(goal.weight || 0), 0);
  const selectedEmployeeId = employeeId || staff?.[0]?.staffRecordId || "";

  const updateMeasure = (index: number, value: string) => {
    setGoals((current) => current.map((goal, position) => position === index ? { ...goal, measure: value } : goal));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedEmployeeId || !month || !reportDue || goals.some((goal) => !goal.measure.trim())) {
      setError(text(language, "Complete the employee, month, deadline and success measure for all five categories.", "请填写员工、月份、截止日期及全部五项成功标准。"));
      return;
    }
    if (totalWeight !== 100) {
      setError(text(language, "Goal weights must add up to 100%.", "目标权重合计必须为 100%。"));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onAction("performance.goals.set", {
        employeeStaffRecordId: selectedEmployeeId,
        month,
        goals: goals.map((goal, index) => ({ index: index + 1, title: goal.title, measure: goal.measure.trim() })),
        reportDue,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text(language, "Goals could not be saved.", "无法保存目标。"));
    } finally {
      setBusy(false);
    }
  };

  if (!staff?.length) {
    return (
      <section className="fopsSection">
        <SectionHeading title={text(language, "Set monthly goals", "设定月度目标")} />
        <EmptyState
          icon={<UserRound size={24} />}
          title={text(language, "No active staff are ready yet", "暂无可设置目标的在职员工")}
          body={text(language, "Ask Yumei to sign in and request Growth access, then approve her request. She will appear here without exposing payroll or identity details.", "请让 Yumei 登录并申请“增长”权限，批准后她会显示在这里，且不会暴露薪资或身份信息。")}
        />
      </section>
    );
  }

  return (
    <section className="fopsSection fopsGoalSetter">
      <SectionHeading
        eyebrow={text(language, "Before the month starts", "月初确认")}
        title={text(language, "Set five clear bonus goals", "设定五项清晰奖金目标")}
        hint={text(language, "Agree the outcome, how it will be measured and its weight before work begins.", "开始工作前确认成果、衡量标准与权重。")}
      />
      <form onSubmit={submit}>
        <div className="fopsBonusScale">
          <Award size={18} />
          <div>
            <strong>{text(language, "Fixed monthly bonus scale", "固定月度奖金档位")}</strong>
            <span>90–100: ¥2,000 · 80–89: ¥1,500 · 70–79: ¥1,000 · 60–69: ¥500 · &lt;60: ¥0</span>
          </div>
        </div>
        <div className="fopsGoalSetupMeta">
          <label><span>{text(language, "Employee", "员工")}</span><select value={selectedEmployeeId} onChange={(event) => setEmployeeId(event.target.value)}>{staff.map((person) => <option value={person.staffRecordId} key={person.staffRecordId}>{person.name}{person.role ? ` · ${person.role}` : ""}</option>)}</select></label>
          <label><span>{text(language, "Month", "月份")}</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          <label><span>{text(language, "Report due", "报告截止日")}</span><input type="date" value={reportDue} onChange={(event) => setReportDue(event.target.value)} /></label>
        </div>
        <div className="fopsGoalEditorList">
          {goals.map((goal, index) => (
            <article className="fopsGoalEditor" key={index}>
              <span className="fopsGoalNumber">{index + 1}</span>
              <div className="fopsGoalFixedCategory"><span>{text(language, "Category", "类别")}</span><strong>{goal.title}</strong></div>
              <label className="fopsGoalMeasureInput"><span>{text(language, "Success measure", "成功标准")}</span><input value={goal.measure} onChange={(event) => updateMeasure(index, event.target.value)} placeholder={text(language, "Specific number, deliverable or observable result", "明确数据、交付物或可验证结果")} /></label>
              <div className="fopsGoalFixedWeight"><span>{text(language, "Fixed weight", "固定权重")}</span><strong>{goal.weight}%</strong></div>
            </article>
          ))}
        </div>
        {error ? <p className="fopsInlineNotice fopsInlineNotice--error" role="alert">{error}</p> : null}
        <footer className="fopsGoalSetterFooter">
          <span className={totalWeight === 100 ? "is-valid" : "is-invalid"}>{text(language, "Total weight", "总权重")}: <strong>{totalWeight}%</strong></span>
          <button className="fopsButton fopsButton--primary" type="submit" disabled={busy}>
            <Plus size={16} />{busy ? text(language, "Confirming…", "确认中…") : text(language, "Confirm goals", "确认目标")}
          </button>
        </footer>
      </form>
    </section>
  );
}

function FounderReview({
  cycle,
  language,
  onAction,
}: {
  cycle: OpsPerformanceCycle;
  language: CompanyOpsLanguage;
  onAction: (action: CompanyOpsActionName, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [scores, setScores] = useState<Record<number, number>>(
    Object.fromEntries(cycle.goals.map((goal) => [goal.index, goal.score ?? 0])),
  );
  const [feedback, setFeedback] = useState(cycle.founderReview || "");
  const [resolutionNote, setResolutionNote] = useState("");
  const [busy, setBusy] = useState<"changes" | "score" | "finalize">();
  const [error, setError] = useState<string>();
  const calculatedScore = Math.round(
    cycle.goals.reduce((sum, goal) => sum + goal.weight * (scores[goal.index] || 0), 0) / 100,
  );
  const calculatedBonus = bonusForScore(calculatedScore);

  const run = async (kind: "changes" | "score" | "finalize") => {
    if ((kind === "changes" || kind === "score") && !feedback.trim()) {
      setError(text(language, "Add clear feedback before continuing.", "请先填写清晰反馈。"));
      return;
    }
    setBusy(kind);
    setError(undefined);
    try {
      if (kind === "changes") {
        await onAction("performance.review.request_changes", { performanceId: cycle.id, feedback: feedback.trim() });
      } else if (kind === "score") {
        await onAction("performance.review.score", {
          performanceId: cycle.id,
          scores: cycle.goals.map((goal) => ({ index: goal.index, score: scores[goal.index] || 0 })),
          feedback: feedback.trim(),
        });
      } else {
        await onAction("performance.finalize", { performanceId: cycle.id, resolutionNote: resolutionNote.trim() || undefined });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text(language, "The review could not be saved.", "无法保存评审。"));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <section className="fopsSection fopsFounderReview">
      <SectionHeading
        eyebrow={text(language, "Founder review", "负责人评审")}
        title={text(language, `Review ${cycle.employee.name}'s month`, `评审 ${cycle.employee.name} 的月度表现`)}
        hint={text(language, "Score only against the goals confirmed at the start of the month.", "仅按月初已确认目标评分。")}
      />
      {!cycle.reportSubmittedAt ? (
        <EmptyState title={text(language, "Waiting for the monthly report", "等待月度报告")} body={text(language, "The scoring form opens after the employee submits results and evidence.", "员工提交成果与证明后即可开始评分。")}/>
      ) : (
        <>
          <div className="fopsFounderScoreList">
            {cycle.goals.map((goal) => (
              <article key={goal.index}>
                <div><span>{goal.index}</span><div><strong>{goal.title}</strong><small>{goal.weight}% · {goal.measure}</small></div></div>
                {goal.result ? <p>{goal.result}</p> : null}
                <label><span>{text(language, "Score / 100", "得分 / 100")}</span><input type="number" min="0" max="100" value={scores[goal.index] ?? 0} onChange={(event) => setScores((current) => ({ ...current, [goal.index]: Math.max(0, Math.min(100, Number(event.target.value))) }))} /></label>
              </article>
            ))}
          </div>
          <div className="fopsReviewCalculation">
            <div><span>{text(language, "Calculated weighted score", "加权总分")}</span><strong>{calculatedScore}/100</strong></div>
            <ChevronRight size={20} />
            <div><span>{text(language, "Calculated bonus", "计算奖金")}</span><strong>{money(calculatedBonus, language)}</strong></div>
          </div>
          <label className="fopsPerformanceField"><span>{text(language, "Assessment and specific feedback", "评审与具体反馈")}</span><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} /></label>
          {cycle.evidenceLinks?.length ? <div className="fopsEvidenceLinks"><strong>{text(language, "Evidence", "证明")}</strong>{cycle.evidenceLinks.map((link) => <a href={link} target="_blank" rel="noreferrer" key={link}><Link2 size={14} />{link}<ExternalLink size={13} /></a>)}</div> : null}
          {cycle.employeeResponse ? <div className="fopsEmployeeResponseNote"><strong>{text(language, "Employee response", "员工回应")}</strong><p>{cycle.employeeResponse}</p></div> : null}
          <label className="fopsPerformanceField"><span>{text(language, "Resolution note (optional when finalising)", "定稿说明（选填）")}</span><textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} rows={2} /></label>
          {error ? <p className="fopsInlineNotice fopsInlineNotice--error" role="alert">{error}</p> : null}
          <div className="fopsFounderReviewActions">
            <button className="fopsButton fopsButton--ghost" type="button" onClick={() => void run("changes")} disabled={Boolean(busy) || Boolean(cycle.finalizedAt)}><X size={16} />{busy === "changes" ? text(language, "Sending…", "发送中…") : text(language, "Request changes", "要求补充")}</button>
            <button className="fopsButton fopsButton--ghost" type="button" onClick={() => void run("score")} disabled={Boolean(busy) || Boolean(cycle.finalizedAt)}><Award size={16} />{busy === "score" ? text(language, "Scoring…", "评分中…") : text(language, "Save score & send", "保存评分并发送")}</button>
            <button className="fopsButton fopsButton--primary" type="button" onClick={() => void run("finalize")} disabled={Boolean(busy) || !cycle.canFinalize || Boolean(cycle.finalizedAt)}><CheckCircle2 size={16} />{busy === "finalize" ? text(language, "Finalising…", "定稿中…") : text(language, "Finalise & stage bonus", "定稿并生成奖金")}</button>
          </div>
        </>
      )}
    </section>
  );
}

function CycleSummary({ cycle, language }: { cycle: OpsPerformanceCycle; language: CompanyOpsLanguage }) {
  return (
    <section className="fopsPerformanceHero">
      <div className="fopsPerformanceHeroTop">
        <div><span>{monthLabel(cycle.month, language)}</span><h2>{cycle.employee.name}</h2></div>
        <TonePill tone={statusTone(cycle.status)}>{cycle.status}</TonePill>
      </div>
      <div className="fopsPerformanceHeroMetrics">
        <div><span>{text(language, "Bonus scale", "奖金档位")}</span><strong>¥0–¥2,000</strong></div>
        <div><span>{text(language, "Report due", "报告截止")}</span><strong>{cycle.reportDue ? formatOpsDate(cycle.reportDue, language) : "—"}</strong></div>
        <div><span>{text(language, "Weighted score", "加权得分")}</span><strong>{cycle.weightedScore == null ? "—" : `${cycle.weightedScore}/100`}</strong></div>
        <div><span>{text(language, "Approved bonus", "核准奖金")}</span><strong>{money(cycle.approvedBonus, language)}</strong></div>
      </div>
      <CycleTimeline cycle={cycle} language={language} />
    </section>
  );
}

export default function PerformanceHome({
  user,
  language,
  myPerformance,
  performance,
  sharedAssetsUrl,
  onAction,
  onUploadAsset,
}: {
  user: CompanyOpsUser;
  language: CompanyOpsLanguage;
  myPerformance?: OpsPerformanceDashboard;
  performance?: OpsPerformanceDashboard;
  sharedAssetsUrl?: string;
  onAction: (action: CompanyOpsActionName, payload: Record<string, unknown>) => Promise<void>;
  onUploadAsset?: (file: File) => Promise<OpsAssetUploadResult>;
}) {
  const founder = user.role === "founder" || performance?.canManage;
  const sortedCycles = useMemo(
    () => [
      ...(founder
        ? performance?.cycles || []
        : myPerformance?.cycles || performance?.cycles || []),
    ].sort((a, b) => b.month.localeCompare(a.month)),
    [founder, myPerformance?.cycles, performance?.cycles],
  );
  const [selectedId, setSelectedId] = useState(sortedCycles[0]?.id || "");
  const [uploadedLinks, setUploadedLinks] = useState<Record<string, string[]>>({});
  const selected = sortedCycles.find((cycle) => cycle.id === selectedId) || sortedCycles[0];

  return (
    <div className="fopsPage fopsPerformancePage">
      <header className="fopsPageHeader">
        <div>
          <span className="fopsEyebrow">{text(language, founder ? "People & performance" : "My performance", founder ? "员工与绩效" : "我的绩效")}</span>
          <h1>{text(language, founder ? "Monthly goals & bonus reviews" : "My month", founder ? "月度目标与奖金评审" : "我的月度")}</h1>
          <p>{text(language, founder ? "Set expectations before the month, review evidence fairly, and keep a clear decision record." : "See exactly what success means, report your results, and review the bonus assessment in one place.", founder ? "月初设定预期，基于证明公平评审，并保留清晰决策记录。" : "在一个地方查看成功标准、汇报成果并确认奖金评审。")}</p>
        </div>
      </header>

      {founder ? <GoalSetter language={language} staff={performance?.staff} onAction={onAction} /> : null}

      {sortedCycles.length ? (
        <>
          <section className="fopsCyclePicker" aria-label={text(language, "Choose month", "选择月份")}>
            {sortedCycles.map((cycle) => (
              <button type="button" className={cycle.id === selected?.id ? "is-active" : ""} onClick={() => setSelectedId(cycle.id)} key={cycle.id}>
                <span>{monthLabel(cycle.month, language)}</span>
                {founder ? <strong>{cycle.employee.name}</strong> : null}
                <small>{cycle.status}</small>
              </button>
            ))}
          </section>
          {selected ? (
            <>
              <CycleSummary cycle={selected} language={language} />
              <section className="fopsSection">
                <SectionHeading eyebrow={text(language, "Agreed at the start", "月初约定")} title={text(language, "Five goals for this month", "本月五项目标")} hint={text(language, "These goals and weights are locked into the monthly review record.", "这些目标和权重会保存在月度评审记录中。")}/>
                <GoalCards cycle={selected} language={language} />
              </section>
              {!founder && selected.canSubmitReport ? <EmployeeReportForm cycle={selected} language={language} uploadedLinks={uploadedLinks[selected.id] || []} onAction={onAction} /> : null}
              {!founder && selected.reportSubmittedAt && !selected.canSubmitReport ? (
                <section className="fopsSection fopsSubmittedReport">
                  <SectionHeading eyebrow={text(language, "Submitted", "已提交")} title={text(language, "Your monthly report", "你的月度报告")} hint={selected.reportSubmittedAt ? `${text(language, "Sent", "提交于")} ${formatOpsDate(selected.reportSubmittedAt, language)}` : undefined}/>
                  {selected.selfReview ? <p>{selected.selfReview}</p> : null}
                  {selected.evidenceLinks?.length ? <div className="fopsEvidenceLinks">{selected.evidenceLinks.map((link) => <a href={link} target="_blank" rel="noreferrer" key={link}><Link2 size={14}/>{link}<ExternalLink size={13}/></a>)}</div> : null}
                </section>
              ) : null}
              {!founder && selected.canRespond ? <EmployeeResponse cycle={selected} language={language} onAction={onAction} /> : null}
              {!founder && selected.employeeRespondedAt ? (
                <p className="fopsInlineNotice fopsInlineNotice--success"><CheckCircle2 size={16}/>{text(language, "Your review response is recorded.", "你的评审回应已记录。")}</p>
              ) : null}
              {founder ? <FounderReview cycle={selected} language={language} onAction={onAction} /> : null}
            </>
          ) : null}
        </>
      ) : !founder ? (
        <section className="fopsSection">
          <EmptyState icon={<CalendarDays size={24}/>} title={text(language, "Your goals have not been confirmed yet", "你的目标尚未确认")} body={text(language, "Once the founder confirms this month's five goals, they will appear here. You do not need to build a separate spreadsheet.", "负责人确认本月五项目标后，它们会显示在这里，无需另建表格。")}/>
        </section>
      ) : null}

      <AssetDropzone language={language} driveUrl={sharedAssetsUrl} onUpload={onUploadAsset} onUploaded={(url) => {
        const cycleId = selected?.id;
        if (!cycleId) return;
        setUploadedLinks((current) => ({
          ...current,
          [cycleId]: [...new Set([...(current[cycleId] || []), url])],
        }));
      }}/>
    </div>
  );
}
