// The editorial content calendar — Yumei's planning surface. Month / week /
// day views with drag-to-reschedule (the workout-calendar pattern), a full
// per-item editor (copy, hook, SEO keywords, hashtags, CTA, audience,
// funnel), and an archive timeline that rolls published work up by month
// for reporting. Follows PerformanceHome's local text() i18n pattern.
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { TonePill } from "./components";
import { statusLabel } from "./copy";
import type {
  CompanyOpsLanguage,
  OpsContentFullItem,
  QuickActionKey,
} from "./types";

function text(language: CompanyOpsLanguage, en: string, zh: string) {
  return language === "zh" ? zh : en;
}

const PLATFORM_TONES: Array<{ match: RegExp; tone: string }> = [
  { match: /小红书|xhs/i, tone: "xhs" },
  { match: /抖音|douyin/i, tone: "douyin" },
  { match: /公众号|oa/i, tone: "wechat" },
  { match: /视频号|channels/i, tone: "channels" },
  { match: /网站|website/i, tone: "website" },
];

function platformTone(platform?: string) {
  if (!platform) return "multi";
  return PLATFORM_TONES.find((entry) => entry.match.test(platform))?.tone || "multi";
}

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

const PLATFORM_CHOICES = [
  "小红书 XHS",
  "抖音 Douyin",
  "公众号 WeChat OA",
  "视频号 Channels",
  "网站 Website",
  "多平台 Multi",
] as const;

const FUNNEL_CHOICES = [
  "认知 Awareness",
  "兴趣 Interest",
  "转化 Conversion",
  "复购/留存 Retention",
] as const;

const ARCHIVE_STATUSES = new Set(["Published", "Analyzed", "Archived"]);

const dayKey = (value: string | number | Date): string => {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const monthKeyOf = (iso: string): string => iso.slice(0, 7);

type CalendarView = "month" | "week" | "day" | "archive";

type EditorPatch = Partial<
  Pick<
    OpsContentFullItem,
    | "title"
    | "platform"
    | "status"
    | "publishDate"
    | "shootDate"
    | "hook"
    | "copy"
    | "keywords"
    | "hashtags"
    | "cta"
    | "ideaNotes"
    | "pillar"
    | "audience"
    | "funnel"
    | "objective"
    | "format"
    | "featured"
    | "learnings"
  >
>;

function ItemChip({
  item,
  language,
  compact,
  onOpen,
  onDragStart,
}: {
  item: OpsContentFullItem;
  language: CompanyOpsLanguage;
  compact?: boolean;
  onOpen: (item: OpsContentFullItem) => void;
  onDragStart: (item: OpsContentFullItem, event: React.DragEvent) => void;
}) {
  return (
    <button
      type="button"
      className={`fopsCalChip fopsCalChip--${platformTone(item.platform)}${
        compact ? " fopsCalChip--compact" : ""
      }`}
      draggable
      onDragStart={(event) => onDragStart(item, event)}
      onClick={() => onOpen(item)}
      title={item.title}
    >
      <span className="fopsCalChipDot" aria-hidden="true" />
      <span className="fopsCalChipTitle">{item.title}</span>
      {!compact ? (
        <span className="fopsCalChipStatus">{statusLabel(language, item.status)}</span>
      ) : null}
    </button>
  );
}

function Editor({
  item,
  language,
  busy,
  onSave,
  onClose,
}: {
  item: OpsContentFullItem;
  language: CompanyOpsLanguage;
  busy: boolean;
  onSave: (patch: EditorPatch) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<EditorPatch>({});
  const value = <K extends keyof EditorPatch>(key: K): string =>
    String((draft[key] ?? item[key] ?? "") as string);
  const set = <K extends keyof EditorPatch>(key: K, next: string) =>
    setDraft((all) => ({ ...all, [key]: next }));
  const dirty = Object.keys(draft).length > 0;

  const fieldRow = (
    key: keyof EditorPatch,
    labelEn: string,
    labelZh: string,
    kind: "input" | "textarea" | "date" = "input",
    rows = 3,
    placeholderEn = "",
    placeholderZh = "",
  ) => (
    <label className="fopsCalField">
      <span>{text(language, labelEn, labelZh)}</span>
      {kind === "textarea" ? (
        <textarea
          rows={rows}
          value={value(key)}
          placeholder={text(language, placeholderEn, placeholderZh)}
          onChange={(event) => set(key, event.target.value)}
        />
      ) : (
        <input
          type={kind === "date" ? "date" : "text"}
          value={kind === "date" ? value(key).slice(0, 10) : value(key)}
          placeholder={text(language, placeholderEn, placeholderZh)}
          onChange={(event) => set(key, event.target.value)}
        />
      )}
    </label>
  );

  const selectRow = (
    key: keyof EditorPatch,
    labelEn: string,
    labelZh: string,
    options: readonly string[],
    translate = false,
  ) => (
    <label className="fopsCalField">
      <span>{text(language, labelEn, labelZh)}</span>
      <select value={value(key)} onChange={(event) => set(key, event.target.value)}>
        <option value="">—</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {translate ? statusLabel(language, option) : option}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="fopsCalEditorScrim" role="dialog" aria-modal="true">
      <aside className="fopsCalEditor">
        <header>
          <div>
            <span className="fopsEyebrow">
              {text(language, "Content detail", "内容详情")}
            </span>
            <h2>{item.title}</h2>
          </div>
          <button type="button" className="fopsCalIconBtn" onClick={onClose} aria-label={text(language, "Close", "关闭")}>
            <X size={18} />
          </button>
        </header>
        <div className="fopsCalEditorBody">
          {fieldRow("title", "Title", "标题")}
          <div className="fopsCalFieldRow">
            {selectRow("platform", "Platform", "平台", PLATFORM_CHOICES)}
            {selectRow("status", "Status", "状态", CONTENT_STATUSES, true)}
          </div>
          <div className="fopsCalFieldRow">
            {fieldRow("publishDate", "Publish date", "发布日期", "date")}
            {fieldRow("shootDate", "Shoot date", "拍摄日期", "date")}
          </div>
          {fieldRow("hook", "Hook / opening line", "钩子/开头", "input", 3, "The first 3 seconds…", "前3秒抓住人的那句话…")}
          {fieldRow("copy", "Copy / caption", "文案", "textarea", 6, "Full caption or script", "完整文案或脚本")}
          <div className="fopsCalFieldRow">
            {fieldRow("keywords", "SEO keywords", "SEO关键词", "input", 3, "comma, separated, keywords", "逗号分隔的关键词")}
            {fieldRow("hashtags", "Hashtags", "话题标签", "input", 3, "#tag #tag", "#话题 #话题")}
          </div>
          {fieldRow("cta", "Call to action", "行动号召")}
          <div className="fopsCalFieldRow">
            {fieldRow("pillar", "Content pillar", "内容支柱")}
            {selectRow("funnel", "Funnel stage", "漏斗阶段", FUNNEL_CHOICES)}
          </div>
          <div className="fopsCalFieldRow">
            {fieldRow("audience", "Audience", "受众")}
            {fieldRow("featured", "Featured (who's on camera)", "出镜")}
          </div>
          {fieldRow("objective", "Objective", "目标")}
          {fieldRow("ideaNotes", "Idea notes / references", "创意备注/参考", "textarea", 4)}
          {fieldRow("learnings", "Learnings (after publishing)", "学习/复盘", "textarea", 3)}
          {item.publishedUrl ? (
            <a className="fopsCalPublished" href={item.publishedUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
              {text(language, "Open published post", "查看已发布内容")}
            </a>
          ) : null}
          {item.views != null || item.leads != null || item.revenue != null ? (
            <div className="fopsCalStats">
              {item.views != null ? (
                <span>{item.views.toLocaleString()} {text(language, "views", "播放")}</span>
              ) : null}
              {item.saves != null ? (
                <span>{item.saves.toLocaleString()} {text(language, "saves", "收藏")}</span>
              ) : null}
              {item.leads != null ? (
                <span>{item.leads.toLocaleString()} {text(language, "leads", "线索")}</span>
              ) : null}
              {item.revenue != null ? <span>CNY {item.revenue.toLocaleString()}</span> : null}
            </div>
          ) : null}
        </div>
        <footer>
          <button type="button" className="fopsButton fopsButton--ghost" onClick={onClose}>
            {text(language, "Close", "关闭")}
          </button>
          <button
            type="button"
            className="fopsButton fopsButton--primary"
            disabled={!dirty || busy}
            onClick={() => onSave(draft)}
          >
            {busy ? text(language, "Saving…", "保存中…") : text(language, "Save changes", "保存修改")}
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default function ContentCalendarPage({
  items,
  language,
  onUpdate,
  onQuickAction,
}: {
  items: OpsContentFullItem[];
  language: CompanyOpsLanguage;
  onUpdate: (contentId: string, patch: Record<string, unknown>) => Promise<void>;
  onQuickAction: (action: QuickActionKey) => void;
}) {
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(() => Date.now());
  const [editing, setEditing] = useState<OpsContentFullItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, OpsContentFullItem[]>();
    for (const item of items) {
      if (!item.publishDate) continue;
      const key = dayKey(item.publishDate);
      map.set(key, [...(map.get(key) || []), item]);
    }
    return map;
  }, [items]);

  const unscheduled = useMemo(
    () => items.filter((item) => !item.publishDate && !ARCHIVE_STATUSES.has(item.status || "")),
    [items],
  );

  const save = async (contentId: string, patch: Record<string, unknown>) => {
    setBusy(true);
    try {
      await onUpdate(contentId, patch);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = (day: string) => (event: React.DragEvent) => {
    event.preventDefault();
    setDragOverDay(null);
    const contentId = event.dataTransfer.getData("text/fops-content-id");
    if (contentId) void save(contentId, { publishDate: day });
  };

  const dragProps = (day: string) => ({
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      setDragOverDay(day);
    },
    onDragLeave: () => setDragOverDay((current) => (current === day ? null : current)),
    onDrop: handleDrop(day),
  });

  const startDrag = (item: OpsContentFullItem, event: React.DragEvent) => {
    event.dataTransfer.setData("text/fops-content-id", item.id);
    event.dataTransfer.effectAllowed = "move";
  };

  const shift = (direction: -1 | 1) => {
    const date = new Date(anchor);
    if (view === "month" || view === "archive") date.setMonth(date.getMonth() + direction);
    else if (view === "week") date.setDate(date.getDate() + 7 * direction);
    else date.setDate(date.getDate() + direction);
    setAnchor(date.getTime());
  };

  const locale = language === "zh" ? "zh-CN" : "en-GB";
  const anchorDate = new Date(anchor);
  const todayKey = dayKey(new Date());

  const monthCells = useMemo(() => {
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7)); // Monday-first grid
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [anchorDate.getFullYear(), anchorDate.getMonth()]);

  const weekDays = useMemo(() => {
    const start = new Date(anchorDate);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [anchor]);

  const archive = useMemo(() => {
    const groups = new Map<string, OpsContentFullItem[]>();
    for (const item of items) {
      if (!ARCHIVE_STATUSES.has(item.status || "") || !item.publishDate) continue;
      const key = monthKeyOf(dayKey(item.publishDate));
      groups.set(key, [...(groups.get(key) || []), item]);
    }
    return [...groups.entries()].sort((left, right) => right[0].localeCompare(left[0]));
  }, [items]);

  const heading =
    view === "day"
      ? anchorDate.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })
      : view === "week"
        ? `${weekDays[0].toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString(locale, { month: "short", day: "numeric" })}`
        : anchorDate.toLocaleDateString(locale, { year: "numeric", month: "long" });

  const weekdayNames = weekDays.map((date) =>
    date.toLocaleDateString(locale, { weekday: language === "zh" ? "narrow" : "short" }),
  );

  return (
    <div className="fopsPage fopsCalendarPage">
      <header className="fopsPageHeader fopsPageHeader--actions">
        <div>
          <span className="fopsEyebrow">{text(language, "Editorial calendar", "内容排期")}</span>
          <h1>{text(language, "Content calendar", "内容日历")}</h1>
          <p>
            {text(
              language,
              "Plan the week, write the copy, drag to reschedule. Published work rolls into the archive for reports.",
              "规划一周、撰写文案、拖拽改期。发布后的内容自动进入归档，用于月度/年度复盘。",
            )}
          </p>
        </div>
        <button
          type="button"
          className="fopsButton fopsButton--primary"
          onClick={() => onQuickAction("content")}
        >
          <Plus size={16} />
          {text(language, "New content", "新建内容")}
        </button>
      </header>

      <div className="fopsCalToolbar">
        <div className="fopsCalViews" role="tablist">
          {(["day", "week", "month", "archive"] as CalendarView[]).map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={view === entry}
              className={view === entry ? "is-active" : ""}
              onClick={() => setView(entry)}
            >
              {entry === "day"
                ? text(language, "Day", "日")
                : entry === "week"
                  ? text(language, "Week", "周")
                  : entry === "month"
                    ? text(language, "Month", "月")
                    : text(language, "Archive", "归档")}
            </button>
          ))}
        </div>
        <div className="fopsCalNav">
          <button type="button" className="fopsCalIconBtn" onClick={() => shift(-1)} aria-label={text(language, "Previous", "上一个")}>
            <ChevronLeft size={17} />
          </button>
          <strong>{heading}</strong>
          <button type="button" className="fopsCalIconBtn" onClick={() => shift(1)} aria-label={text(language, "Next", "下一个")}>
            <ChevronRight size={17} />
          </button>
          <button type="button" className="fopsTextButton" onClick={() => setAnchor(Date.now())}>
            {text(language, "Today", "今天")}
          </button>
        </div>
      </div>

      {view === "month" ? (
        <div className="fopsCalMonth">
          {weekdayNames.map((name, index) => (
            <span className="fopsCalWeekday" key={`${name}-${index}`}>{name}</span>
          ))}
          {monthCells.map((date) => {
            const key = dayKey(date);
            const inMonth = date.getMonth() === anchorDate.getMonth();
            const dayItems = byDay.get(key) || [];
            return (
              <div
                className={`fopsCalCell${inMonth ? "" : " is-outside"}${
                  key === todayKey ? " is-today" : ""
                }${dragOverDay === key ? " is-dragover" : ""}`}
                key={key}
                {...dragProps(key)}
              >
                <span className="fopsCalCellDate">{date.getDate()}</span>
                <div className="fopsCalCellItems">
                  {dayItems.slice(0, 4).map((item) => (
                    <ItemChip item={item} language={language} compact onOpen={setEditing} onDragStart={startDrag} key={item.id} />
                  ))}
                  {dayItems.length > 4 ? (
                    <button
                      type="button"
                      className="fopsCalMore"
                      onClick={() => {
                        setAnchor(date.getTime());
                        setView("day");
                      }}
                    >
                      +{dayItems.length - 4}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "week" ? (
        <div className="fopsCalWeek">
          {weekDays.map((date) => {
            const key = dayKey(date);
            const dayItems = byDay.get(key) || [];
            return (
              <div
                className={`fopsCalWeekCol${key === todayKey ? " is-today" : ""}${
                  dragOverDay === key ? " is-dragover" : ""
                }`}
                key={key}
                {...dragProps(key)}
              >
                <header>
                  <strong>
                    {date.toLocaleDateString(locale, { weekday: "short" })}
                  </strong>
                  <span>{date.toLocaleDateString(locale, { month: "short", day: "numeric" })}</span>
                </header>
                <div className="fopsCalWeekItems">
                  {dayItems.map((item) => (
                    <ItemChip item={item} language={language} onOpen={setEditing} onDragStart={startDrag} key={item.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "day" ? (
        <div className="fopsCalDay" {...dragProps(dayKey(anchorDate))}>
          {(byDay.get(dayKey(anchorDate)) || []).map((item) => (
            <article className="fopsCalDayCard" key={item.id}>
              <header>
                <TonePill tone="blue">{item.platform || "—"}</TonePill>
                <TonePill tone={ARCHIVE_STATUSES.has(item.status || "") ? "success" : "gold"}>
                  {statusLabel(language, item.status)}
                </TonePill>
                {item.funnel ? <TonePill tone="purple">{item.funnel}</TonePill> : null}
              </header>
              <h3>{item.title}</h3>
              {item.hook ? <p className="fopsCalHook">{item.hook}</p> : null}
              {item.copy ? <p className="fopsCalCopy">{item.copy.slice(0, 400)}</p> : null}
              {item.keywords ? (
                <p className="fopsCalKeywords">
                  <strong>{text(language, "Keywords", "关键词")}:</strong> {item.keywords}
                </p>
              ) : null}
              <footer>
                <button
                  type="button"
                  className="fopsButton fopsButton--compact"
                  onClick={() => setEditing(item)}
                >
                  {text(language, "Open & edit", "打开编辑")}
                </button>
              </footer>
            </article>
          ))}
          {!(byDay.get(dayKey(anchorDate)) || []).length ? (
            <p className="fopsQuietText">
              {text(language, "Nothing planned this day — drag a card here or create new content.", "这一天还没有安排——把卡片拖过来，或新建内容。")}
            </p>
          ) : null}
        </div>
      ) : null}

      {view === "archive" ? (
        <div className="fopsCalArchive">
          {archive.length ? (
            archive.map(([month, monthItems]) => {
              const views = monthItems.reduce((sum, item) => sum + (item.views || 0), 0);
              const leads = monthItems.reduce((sum, item) => sum + (item.leads || 0), 0);
              const revenue = monthItems.reduce((sum, item) => sum + (item.revenue || 0), 0);
              const platforms = new Map<string, number>();
              for (const item of monthItems) {
                const key = item.platform || "—";
                platforms.set(key, (platforms.get(key) || 0) + 1);
              }
              return (
                <section className="fopsCalArchiveMonth" key={month}>
                  <header>
                    <span className="fopsCalArchiveDot" aria-hidden="true">
                      <Archive size={14} />
                    </span>
                    <h2>
                      {new Date(`${month}-01T00:00:00`).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "long",
                      })}
                    </h2>
                    <div className="fopsCalArchiveStats">
                      <span>{monthItems.length} {text(language, "published", "篇")}</span>
                      {views ? <span>{views.toLocaleString()} {text(language, "views", "播放")}</span> : null}
                      {leads ? <span>{leads.toLocaleString()} {text(language, "leads", "线索")}</span> : null}
                      {revenue ? <span>CNY {revenue.toLocaleString()}</span> : null}
                    </div>
                  </header>
                  <div className="fopsCalArchivePlatforms">
                    {[...platforms.entries()].map(([platform, count]) => (
                      <TonePill tone="neutral" key={platform}>
                        {platform} × {count}
                      </TonePill>
                    ))}
                  </div>
                  <div className="fopsCalArchiveList">
                    {monthItems
                      .sort((left, right) => (right.publishDate || "").localeCompare(left.publishDate || ""))
                      .map((item) => (
                        <button
                          type="button"
                          className="fopsCalArchiveRow"
                          onClick={() => setEditing(item)}
                          key={item.id}
                        >
                          <span className={`fopsCalChipDot fopsCalChip--${platformTone(item.platform)}`} aria-hidden="true" />
                          <strong>{item.title}</strong>
                          {item.publishDate ? (
                            <span>{new Date(item.publishDate).toLocaleDateString(locale, { month: "short", day: "numeric" })}</span>
                          ) : null}
                          {item.views != null ? <em>{item.views.toLocaleString()}</em> : null}
                          {item.learnings ? <small>{item.learnings.slice(0, 90)}</small> : null}
                        </button>
                      ))}
                  </div>
                </section>
              );
            })
          ) : (
            <p className="fopsQuietText">
              {text(language, "Published content will build the archive month by month.", "内容发布后会按月进入归档，用于复盘与年度报告。")}
            </p>
          )}
        </div>
      ) : null}

      {view !== "archive" && unscheduled.length ? (
        <section className="fopsCalBacklog">
          <header>
            <CalendarDays size={15} aria-hidden="true" />
            <strong>{text(language, "Unscheduled ideas — drag onto a day", "未排期的内容——拖到某一天即可安排")}</strong>
          </header>
          <div className="fopsCalBacklogItems">
            {unscheduled.map((item) => (
              <ItemChip item={item} language={language} onOpen={setEditing} onDragStart={startDrag} key={item.id} />
            ))}
          </div>
        </section>
      ) : null}

      {editing ? (
        <Editor
          item={editing}
          language={language}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(patch) => void save(editing.id, patch)}
        />
      ) : null}
    </div>
  );
}
