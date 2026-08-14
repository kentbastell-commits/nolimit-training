// Weekly report builder.
//
// The premise: the hard part of a weekly report is remembering what you did,
// not writing it. Everything Yumei does already writes a record somewhere, so
// this page collects that week's work into a timeline she curates rather than
// a blank form she fills.
//
// Deliberately assembled CLIENT-side from the dashboard payload the page has
// already loaded — every Feishu table read costs ~1.3s, and this needs none.
import { useEffect, useMemo, useState } from "react";
import { companyOpsApi } from "./api";
import {
  CalendarDays,
  Check,
  FileText,
  Lightbulb,
  Megaphone,
  Paperclip,
  Plus,
  Send,
  TrendingUp,
  UserRoundSearch,
  X,
} from "lucide-react";
import type {
  CompanyOpsDashboard,
  CompanyOpsLanguage,
  CompanyOpsUser,
} from "./types";

type Kind = "published" | "article" | "idea" | "campaign" | "lead" | "data" | "manual";

type TimelineItem = {
  id: string;
  kind: Kind;
  title: string;
  detail?: string;
  date?: string;
  /** Significant work is pre-ticked; small stuff starts off so she subtracts. */
  defaultInclude: boolean;
};

const KIND_ICON: Record<Kind, typeof FileText> = {
  published: CalendarDays,
  article: FileText,
  idea: Lightbulb,
  campaign: Megaphone,
  lead: UserRoundSearch,
  data: TrendingUp,
  manual: Plus,
};

const KIND_LABEL: Record<Kind, { en: string; zh: string }> = {
  published: { en: "Published", zh: "已发布" },
  article: { en: "Article", zh: "文章" },
  idea: { en: "Idea", zh: "想法" },
  campaign: { en: "Campaign", zh: "活动" },
  lead: { en: "Lead", zh: "线索" },
  data: { en: "Data", zh: "数据" },
  manual: { en: "Added", zh: "手动添加" },
};

/** Monday-to-Sunday window containing `now`, in China time. */
function weekWindow(now = new Date()) {
  const china = new Date(now.getTime() + 8 * 3_600_000);
  const day = (china.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(china);
  monday.setUTCDate(china.getUTCDate() - day);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 7);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(monday), end: iso(sunday), label: `${iso(monday)} → ${iso(new Date(sunday.getTime() - 86_400_000))}` };
}

const inWeek = (value: string | undefined, start: string, end: string) => {
  if (!value) return false;
  const day = value.slice(0, 10);
  return day >= start && day < end;
};

export default function WeeklyReportPage({
  dashboard,
  language,
  user,
  csrfToken,
  onSubmit,
}: {
  dashboard: CompanyOpsDashboard;
  language: CompanyOpsLanguage;
  user?: CompanyOpsUser;
  csrfToken?: string;
  onSubmit: (payload: Record<string, string>) => Promise<void>;
}) {
  const week = useMemo(() => weekWindow(), []);
  const t = (en: string, zh: string) => (language === "zh" ? zh : en);

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    const mine = (owner?: string) =>
      !owner || !user?.name || owner.toLowerCase().includes(user.name.toLowerCase());

    for (const item of dashboard.contentCalendar || []) {
      if (!inWeek(item.publishDate, week.start, week.end)) continue;
      const live = /publish|analy|已发布/i.test(item.status || "");
      items.push({
        id: `content-${item.id}`,
        kind: "published",
        title: item.title,
        detail: [item.platform, item.status].filter(Boolean).join(" · "),
        date: item.publishDate,
        defaultInclude: live,
      });
    }
    for (const item of dashboard.articles || []) {
      if (!inWeek(item.updatedAt, week.start, week.end)) continue;
      items.push({
        id: `article-${item.id}`,
        kind: "article",
        title: item.title,
        detail: item.status,
        date: item.updatedAt,
        defaultInclude: true,
      });
    }
    for (const item of dashboard.ideas || []) {
      if (!inWeek(item.createdAt, week.start, week.end)) continue;
      if (user?.openId && item.raisedByOpenId && item.raisedByOpenId !== user.openId) continue;
      items.push({
        id: `idea-${item.id}`,
        kind: "idea",
        title: item.idea,
        detail: item.category,
        date: item.createdAt,
        defaultInclude: false,
      });
    }
    for (const item of dashboard.campaigns || []) {
      items.push({
        id: `campaign-${item.id}`,
        kind: "campaign",
        title: item.name,
        detail: [item.status, item.objective].filter(Boolean).join(" · "),
        defaultInclude: true,
      });
    }
    for (const item of dashboard.growth?.leadsToFollowUp || []) {
      if (!inWeek(item.nextActionAt, week.start, week.end)) continue;
      if (!mine(item.ownerName)) continue;
      items.push({
        id: `lead-${item.id}`,
        kind: "lead",
        title: item.name,
        detail: [item.status, item.source].filter(Boolean).join(" · "),
        date: item.nextActionAt,
        defaultInclude: false,
      });
    }
    for (const metric of dashboard.growth?.metrics || []) {
      items.push({
        id: `metric-${metric.id}`,
        kind: "data",
        title: `${metric.label}: ${metric.value}`,
        detail: metric.helper,
        defaultInclude: false,
      });
    }
    return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [dashboard, user, week]);

  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [manual, setManual] = useState<
    Array<{ id: string; title: string; comment: string; files: string[] }>
  >([]);
  const [formOpen, setFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newFiles, setNewFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Same shared-assets uploader the War Room uses, so a photo of a whiteboard
  // or a planning doc lands in the folder the team already browses.
  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const result = await companyOpsApi.uploadAsset?.(file, csrfToken);
      if (!result?.url) throw new Error("no url");
      setNewFiles((current) => [...current, result.url as string]);
    } catch {
      setUploadError(t("That file could not be uploaded", "文件上传失败"));
    } finally {
      setUploading(false);
    }
  };

  const addManual = () => {
    const title = newTitle.trim();
    if (!title) return;
    setManual((current) => [
      ...current,
      { id: `manual-${Date.now()}`, title, comment: newComment.trim(), files: newFiles },
    ]);
    setNewTitle("");
    setNewComment("");
    setNewFiles([]);
    setFormOpen(false);
  };
  const [narrative, setNarrative] = useState("");
  const [blockers, setBlockers] = useState("");
  const [learning, setLearning] = useState("");
  const [nextWeek, setNextWeek] = useState("");
  const [decisions, setDecisions] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Seed the tick-boxes once the timeline is known.
  useEffect(() => {
    setIncluded((current) => {
      if (Object.keys(current).length) return current;
      const seed: Record<string, boolean> = {};
      for (const item of timeline) seed[item.id] = item.defaultInclude;
      return seed;
    });
  }, [timeline]);

  // Draft survives a closed tab — she builds this across the week.
  const draftKey = `nl_ops_weekly_${week.start}`;
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setIncluded(parsed.included || {});
      setComments(parsed.comments || {});
      setManual(parsed.manual || []);
      setNarrative(parsed.narrative || "");
      setBlockers(parsed.blockers || "");
      setLearning(parsed.learning || "");
      setNextWeek(parsed.nextWeek || "");
      setDecisions(parsed.decisions || "");
    } catch {
      /* a privacy-restricted browser may block storage */
    }
  }, [draftKey]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({ included, comments, manual, narrative, blockers, learning, nextWeek, decisions }),
        );
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draftKey, included, comments, manual, narrative, blockers, learning, nextWeek, decisions]);

  const chosen = timeline.filter((item) => included[item.id]);
  const chosenCount = chosen.length + manual.length;

  const submit = async () => {
    if (busy) return;
    const lines: string[] = [];
    for (const item of chosen) {
      const note = (comments[item.id] || "").trim();
      const label = language === "zh" ? KIND_LABEL[item.kind].zh : KIND_LABEL[item.kind].en;
      lines.push(`• [${label}] ${item.title}${note ? ` — ${note}` : ""}`);
    }
    for (const item of manual) {
      const label = language === "zh" ? KIND_LABEL.manual.zh : KIND_LABEL.manual.en;
      lines.push(`• [${label}] ${item.title}${item.comment.trim() ? ` — ${item.comment.trim()}` : ""}`);
      for (const url of item.files) lines.push(`    ${url}`);
    }
    const wins = lines.join("\n") || t("(nothing selected)", "（未选择）");
    const dataLines = chosen
      .filter((item) => item.kind === "data")
      .map((item) => `• ${item.title}${item.detail ? ` (${item.detail})` : ""}`)
      .join("\n");

    setBusy(true);
    try {
      await onSubmit({
        reportingWeek: week.label,
        completed: [narrative.trim(), "", wins].filter(Boolean).join("\n"),
        results: dataLines || t("No platform data logged this week.", "本周未记录平台数据。"),
        problems: blockers.trim(),
        learnings: learning.trim() || t("—", "—"),
        nextWeek: nextWeek.trim() || t("—", "—"),
        decisionsNeeded: decisions.trim(),
      });
      setDone(true);
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section className="fopsSection">
        <div className="fopsWeeklyDone">
          <Check size={26} aria-hidden="true" />
          <h2>{t("Weekly report sent", "周报已提交")}</h2>
          <p className="fopsQuietText">
            {t("The founders have been notified.", "创始人已收到通知。")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="fopsSection fopsWeekly">
      <header className="fopsWeeklyHead">
        <div>
          <span className="fopsEyebrow">{t("Weekly report", "周报")}</span>
          <h2>{t("Here's your week", "这是你这周做的事")}</h2>
          <p className="fopsQuietText">
            {t(
              "Everything below came from your own work in the app. Untick what doesn't matter, add a note to what does.",
              "以下内容自动来自你在系统里的工作记录。去掉不重要的，给重要的加一句说明。",
            )}
          </p>
        </div>
        <div className="fopsWeeklyWeek">
          <b>{week.label}</b>
          <span>{chosenCount} {t("selected", "项已选")}</span>
        </div>
      </header>

      <label className="fopsWeeklyNarrative">
        <span>{t("What changed because of your work this week?", "这周你的工作带来了什么变化？")}</span>
        <textarea
          rows={3}
          value={narrative}
          onChange={(event) => setNarrative(event.target.value)}
          placeholder={t("One honest paragraph — this is what gets read first.", "一段实话——这是最先被阅读的部分。")}
        />
      </label>

      <div className="fopsWeeklyList">
        {timeline.length ? (
          timeline.map((item) => {
            const Icon = KIND_ICON[item.kind];
            const on = included[item.id] ?? item.defaultInclude;
            return (
              <article className={`fopsWeeklyItem${on ? " is-on" : ""}`} key={item.id}>
                <button
                  type="button"
                  className="fopsWeeklyToggle"
                  aria-pressed={on}
                  onClick={() => setIncluded((current) => ({ ...current, [item.id]: !on }))}
                >
                  {on ? <Check size={14} aria-hidden="true" /> : null}
                </button>
                <div className="fopsWeeklyBody">
                  <div className="fopsWeeklyTop">
                    <Icon size={14} aria-hidden="true" />
                    <strong>{item.title}</strong>
                    <span className="fopsWeeklyKind">
                      {language === "zh" ? KIND_LABEL[item.kind].zh : KIND_LABEL[item.kind].en}
                    </span>
                    {item.date ? <small>{item.date.slice(5, 10)}</small> : null}
                  </div>
                  {item.detail ? <small className="fopsQuietText">{item.detail}</small> : null}
                  {on ? (
                    <input
                      className="fopsWeeklyComment"
                      value={comments[item.id] || ""}
                      onChange={(event) =>
                        setComments((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                      placeholder={t("Add a note — what happened, what you learned", "加一句说明——结果如何、学到什么")}
                    />
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <p className="fopsQuietText">
            {t(
              "Nothing recorded in the app this week — add anything you did below.",
              "本周系统里没有记录——在下面手动添加你做的事。",
            )}
          </p>
        )}
      </div>

      <div className="fopsWeeklyManual">
        {manual.map((item) => (
          <article className="fopsWeeklyItem is-on" key={item.id}>
            <button
              type="button"
              className="fopsWeeklyToggle"
              onClick={() => setManual((current) => current.filter((entry) => entry.id !== item.id))}
              aria-label={t("Remove", "移除")}
            >
              <X size={13} aria-hidden="true" />
            </button>
            <div className="fopsWeeklyBody">
              <div className="fopsWeeklyTop">
                <Plus size={14} aria-hidden="true" />
                <strong>{item.title}</strong>
                <span className="fopsWeeklyKind">
                  {language === "zh" ? KIND_LABEL.manual.zh : KIND_LABEL.manual.en}
                </span>
              </div>
              {item.comment ? <small className="fopsQuietText">{item.comment}</small> : null}
              {item.files.length ? (
                <div className="fopsWeeklyFiles">
                  {item.files.map((url) => (
                    <a href={url} target="_blank" rel="noreferrer" key={url}>
                      <Paperclip size={12} aria-hidden="true" />
                      {decodeURIComponent(url.split("/").pop() || url).slice(0, 28)}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}

        {formOpen ? (
          <div className="fopsWeeklyForm">
            <label>
              <span>{t("What was it?", "是什么事？")}</span>
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder={t("Shoot with Mario at the gym", "和 Mario 在场馆拍摄")}
                autoFocus
              />
            </label>
            <label>
              <span>{t("Notes", "说明")}</span>
              <textarea
                rows={3}
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                placeholder={t("What came of it, what you learned", "结果如何、学到什么")}
              />
            </label>
            <div className="fopsWeeklyFormFoot">
              <label className="fopsWeeklyAttach">
                <Paperclip size={14} aria-hidden="true" />
                {uploading ? t("Uploading…", "上传中…") : t("Attach file or photo", "添加文件或照片")}
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xlsx,.mp4,.mov"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadFile(file);
                    event.target.value = "";
                  }}
                  disabled={uploading}
                />
              </label>
              {newFiles.map((url) => (
                <span className="fopsWeeklyFileChip" key={url}>
                  <Paperclip size={11} aria-hidden="true" />
                  {decodeURIComponent(url.split("/").pop() || url).slice(0, 22)}
                  <button
                    type="button"
                    onClick={() => setNewFiles((current) => current.filter((item) => item !== url))}
                    aria-label={t("Remove", "移除")}
                  >
                    <X size={10} aria-hidden="true" />
                  </button>
                </span>
              ))}
              {uploadError ? <small className="fopsWeeklyError">{uploadError}</small> : null}
              <div className="fopsWeeklyFormActions">
                <button
                  type="button"
                  className="fopsButton fopsButton--compact fopsButton--ghost"
                  onClick={() => {
                    setFormOpen(false);
                    setNewTitle("");
                    setNewComment("");
                    setNewFiles([]);
                  }}
                >
                  {t("Cancel", "取消")}
                </button>
                <button
                  type="button"
                  className="fopsButton fopsButton--compact"
                  onClick={addManual}
                  disabled={!newTitle.trim()}
                >
                  {t("Add to report", "加入周报")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" className="fopsWeeklyAddBtn" onClick={() => setFormOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            {t("Add something the app didn't record", "添加系统没记录的事")}
          </button>
        )}
      </div>

      <div className="fopsWeeklyFields">
        <label>
          <span>{t("Anything blocking you?", "有什么阻碍？")}</span>
          <textarea rows={2} value={blockers} onChange={(event) => setBlockers(event.target.value)} />
        </label>
        <label>
          <span>{t("What did you learn?", "学到了什么？")}</span>
          <textarea rows={2} value={learning} onChange={(event) => setLearning(event.target.value)} />
        </label>
        <label>
          <span>{t("Next week's priorities", "下周优先事项")}</span>
          <textarea rows={2} value={nextWeek} onChange={(event) => setNextWeek(event.target.value)} />
        </label>
        <label>
          <span>{t("Need a founder decision?", "需要创始人决策的事？")}</span>
          <textarea rows={2} value={decisions} onChange={(event) => setDecisions(event.target.value)} />
        </label>
      </div>

      <footer className="fopsWeeklyFooter">
        <small className="fopsQuietText">
          {t("Saved as you type.", "输入内容会自动保存。")}
        </small>
        <button
          type="button"
          className="fopsButton fopsButton--primary"
          onClick={() => void submit()}
          disabled={busy || !narrative.trim()}
        >
          <Send size={15} aria-hidden="true" />
          {busy ? t("Sending…", "提交中…") : t("Send weekly report", "提交周报")}
        </button>
      </footer>
    </section>
  );
}
