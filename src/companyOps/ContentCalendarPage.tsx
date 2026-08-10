// The editorial content calendar — Yumei's planning surface. Month / week /
// day views with drag-to-reschedule (the workout-calendar pattern), platform
// brand glyphs on every chip, publish time-of-day, a one-tap "went live"
// check, a magazine-style day view, and a collapsible archive rollup for
// monthly/yearly reporting. Follows PerformanceHome's local text() pattern.
import {
  Archive,
  CalendarDays,
  Clapperboard,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Scissors,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

type PlatformKind = "xhs" | "douyin" | "wechat" | "channels" | "website" | "multi";

const PLATFORM_TONES: Array<{ match: RegExp; tone: PlatformKind }> = [
  { match: /小红书|xhs/i, tone: "xhs" },
  { match: /抖音|douyin/i, tone: "douyin" },
  { match: /公众号|oa/i, tone: "wechat" },
  { match: /视频号|channels/i, tone: "channels" },
  { match: /网站|website/i, tone: "website" },
];

function platformTone(platform?: string): PlatformKind {
  if (!platform) return "multi";
  return PLATFORM_TONES.find((entry) => entry.match.test(platform))?.tone || "multi";
}

// Self-hosted brand-style glyphs — recognizable at chip size, no external
// assets (CSP + China networks), drawn as minimal inline SVG marks.
function PlatformBadge({ platform, size = 16 }: { platform?: string; size?: number }) {
  const kind = platformTone(platform);
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true as const };
  if (kind === "xhs") {
    return (
      <svg {...common} className="fopsPlatBadge fopsPlatBadge--xhs">
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#e0304e" />
        <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">红</text>
      </svg>
    );
  }
  if (kind === "douyin") {
    return (
      <svg {...common} className="fopsPlatBadge fopsPlatBadge--douyin">
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#111019" />
        <path
          d="M14.5 5.5c.4 1.9 1.7 3.2 3.7 3.5v2.5c-1.4 0-2.7-.5-3.7-1.2v4.9a4.6 4.6 0 1 1-4.6-4.6c.3 0 .6 0 .9.1v2.6a2.1 2.1 0 1 0 1.4 2V5.5h2.3Z"
          fill="#25f4ee"
        />
        <path
          d="M15 6c.4 1.9 1.7 3.2 3.7 3.5v2.5c-1.4 0-2.7-.5-3.7-1.2v4.9a4.6 4.6 0 1 1-4.6-4.6c.3 0 .6 0 .9.1v2.6a2.1 2.1 0 1 0 1.4 2V6H15Z"
          fill="#fe2c55"
          opacity="0.85"
        />
      </svg>
    );
  }
  if (kind === "wechat") {
    return (
      <svg {...common} className="fopsPlatBadge fopsPlatBadge--wechat">
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#10a54a" />
        <path
          d="M10.4 6.6c-2.9 0-5.2 1.9-5.2 4.3 0 1.4.8 2.6 2 3.4l-.5 1.6 1.9-1c.6.2 1.2.3 1.8.3h.3a4 4 0 0 1-.2-1.2c0-2.3 2.2-4.1 4.9-4.1h.3c-.5-1.9-2.6-3.3-5.3-3.3Zm5.2 4.2c-2.4 0-4.3 1.5-4.3 3.5 0 1.9 1.9 3.4 4.3 3.4.5 0 1-.1 1.5-.2l1.6.8-.4-1.3c1-.6 1.7-1.6 1.7-2.7 0-1.9-2-3.5-4.4-3.5Z"
          fill="#fff"
        />
      </svg>
    );
  }
  if (kind === "channels") {
    return (
      <svg {...common} className="fopsPlatBadge fopsPlatBadge--channels">
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#c9a84c" />
        <path d="M9.5 7.8 17 12l-7.5 4.2V7.8Z" fill="#fff" />
      </svg>
    );
  }
  if (kind === "website") {
    return (
      <svg {...common} className="fopsPlatBadge fopsPlatBadge--website">
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#2f6fdd" />
        <circle cx="12" cy="12" r="6" fill="none" stroke="#fff" strokeWidth="1.5" />
        <path d="M6 12h12M12 6c-2 2-2 10 0 12M12 6c2 2 2 10 0 12" fill="none" stroke="#fff" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg {...common} className="fopsPlatBadge fopsPlatBadge--multi">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#8352c9" />
      <circle cx="8.5" cy="12" r="2.2" fill="#fff" />
      <circle cx="15.5" cy="8.5" r="2.2" fill="#fff" opacity="0.85" />
      <circle cx="15.5" cy="15.5" r="2.2" fill="#fff" opacity="0.7" />
    </svg>
  );
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

const FOOTAGE_CHOICES = [
  "需拍摄 To Film",
  "拍摄中 Filming",
  "已有素材 Footage Ready",
  "无需拍摄 No Filming Needed",
] as const;

const footageClass = (value?: string): string =>
  !value
    ? "is-unset"
    : value.includes("需拍摄")
      ? "is-tofilm"
      : value.includes("拍摄中")
        ? "is-filming"
        : value.includes("已有素材")
          ? "is-ready"
          : "is-skip";

const footageDisplay = (language: CompanyOpsLanguage, value?: string): string => {
  if (!value) return language === "zh" ? "定素材状态" : "Set footage";
  const [zh, ...rest] = value.split(" ");
  return language === "zh" ? zh : rest.join(" ") || value;
};

const LIVE_STATUSES = new Set(["Published", "Analyzed", "Archived"]);

const dayKey = (value: string | number | Date): string => {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const timeOf = (iso?: string): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (date.getHours() === 0 && date.getMinutes() === 0) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const withDay = (day: string, existingIso?: string): string => {
  const time = timeOf(existingIso);
  return time ? `${day}T${time}` : day;
};

type CalendarView = "month" | "week" | "day" | "plan";

type EditorPatch = Record<string, string>;

function ItemChip({
  item,
  language,
  compact,
  onOpen,
  onDragStart,
  onContextMenu,
}: {
  item: OpsContentFullItem;
  language: CompanyOpsLanguage;
  compact?: boolean;
  onOpen: (item: OpsContentFullItem) => void;
  onDragStart: (item: OpsContentFullItem, event: React.DragEvent) => void;
  onContextMenu?: (item: OpsContentFullItem, event: React.MouseEvent) => void;
}) {
  const time = timeOf(item.publishDate);
  const live = LIVE_STATUSES.has(item.status || "");
  return (
    <button
      type="button"
      className={`fopsCalChip${compact ? " fopsCalChip--compact" : ""}${live ? " is-live" : ""}`}
      draggable
      onDragStart={(event) => onDragStart(item, event)}
      onClick={() => onOpen(item)}
      onContextMenu={onContextMenu ? (event) => onContextMenu(item, event) : undefined}
      title={item.title}
    >
      <PlatformBadge platform={item.platform} size={compact ? 14 : 16} />
      {time ? <span className="fopsCalChipTime">{time}</span> : null}
      <span className="fopsCalChipTitle">{item.title}</span>
      {live ? (
        <Check size={12} className="fopsCalChipLive" aria-hidden="true" />
      ) : !compact ? (
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
  const [publishTime, setPublishTime] = useState(() => timeOf(item.publishDate));
  const stringOf = (key: keyof OpsContentFullItem): string => {
    const raw = item[key];
    return typeof raw === "string" ? raw : "";
  };
  const value = (key: string): string => draft[key] ?? stringOf(key as keyof OpsContentFullItem);
  const set = (key: string, next: string) => setDraft((all) => ({ ...all, [key]: next }));
  const dirty = Object.keys(draft).length > 0 || publishTime !== timeOf(item.publishDate);

  const buildPatch = (): EditorPatch => {
    const patch = { ...draft };
    const day = (patch.publishDate ?? stringOf("publishDate")).slice(0, 10);
    if (day && (patch.publishDate !== undefined || publishTime !== timeOf(item.publishDate))) {
      patch.publishDate = publishTime ? `${day}T${publishTime}` : day;
    }
    return patch;
  };

  const fieldRow = (
    key: string,
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
    key: string,
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

  const isLive = LIVE_STATUSES.has((draft.status ?? item.status) || "");

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
          <button
            type="button"
            className={`fopsCalLiveToggle${isLive ? " is-live" : ""}`}
            onClick={() => set("status", isLive ? "Scheduled" : "Published")}
          >
            <Check size={16} />
            {isLive
              ? text(language, "Live — published", "已上线")
              : text(language, "Mark as live", "标记为已上线")}
          </button>
          {fieldRow("title", "Title", "标题")}
          <div className="fopsCalFieldRow">
            {selectRow("platform", "Platform", "平台", PLATFORM_CHOICES)}
            {selectRow("status", "Status", "状态", CONTENT_STATUSES, true)}
          </div>
          <div className="fopsCalFieldRow">
            {fieldRow("publishDate", "Publish date", "发布日期", "date")}
            <label className="fopsCalField">
              <span>{text(language, "Publish time", "发布时间")}</span>
              <input
                type="time"
                value={publishTime}
                onChange={(event) => setPublishTime(event.target.value)}
              />
            </label>
          </div>
          {fieldRow("shootDate", "Shoot date", "拍摄日期", "date")}
          <div className="fopsCalFieldRow">
            {selectRow("footageStatus", "Footage status", "素材状态", FOOTAGE_CHOICES)}
            {fieldRow("filmingNotes", "Filming notes — what to shoot", "拍摄需求——要拍什么", "textarea", 2)}
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
            onClick={() => onSave(buildPatch())}
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
  onDuplicate,
  onDelete,
  onQuickAction,
}: {
  items: OpsContentFullItem[];
  language: CompanyOpsLanguage;
  onUpdate: (contentId: string, patch: Record<string, unknown>) => Promise<void>;
  onDuplicate: (contentId: string, publishDate?: string) => Promise<void>;
  onDelete: (contentId: string) => Promise<void>;
  onQuickAction: (action: QuickActionKey) => void;
}) {
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(() => Date.now());
  const [editing, setEditing] = useState<OpsContentFullItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [menu, setMenu] = useState<
    | { x: number; y: number; kind: "item"; item: OpsContentFullItem }
    | { x: number; y: number; kind: "day"; day: string }
    | null
  >(null);
  const [clipboard, setClipboard] = useState<
    { mode: "cut" | "copy"; item: OpsContentFullItem } | null
  >(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const openItemMenu = (item: OpsContentFullItem) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 190),
      y: Math.min(event.clientY, window.innerHeight - 230),
      kind: "item",
      item,
    });
  };
  const openDayMenu = (day: string) => (event: React.MouseEvent) => {
    if (!clipboard) return;
    event.preventDefault();
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 190),
      y: Math.min(event.clientY, window.innerHeight - 120),
      kind: "day",
      day,
    });
  };
  const pasteInto = (day: string) => {
    if (!clipboard) return;
    const target = withDay(day, clipboard.item.publishDate);
    if (clipboard.mode === "cut") {
      void save(clipboard.item.id, { publishDate: target });
      setClipboard(null);
    } else {
      setBusy(true);
      void onDuplicate(clipboard.item.id, target).finally(() => setBusy(false));
    }
    setMenu(null);
  };
  const deleteItem = (item: OpsContentFullItem) => {
    setMenu(null);
    if (
      !window.confirm(
        text(
          language,
          `Delete "${item.title}"? This removes it from the calendar and the Base.`,
          `删除「${item.title}」？会同时从日历和多维表格中移除。`,
        ),
      )
    ) {
      return;
    }
    setBusy(true);
    void onDelete(item.id).finally(() => setBusy(false));
  };

  const byDay = useMemo(() => {
    const map = new Map<string, OpsContentFullItem[]>();
    for (const item of items) {
      if (!item.publishDate) continue;
      const key = dayKey(item.publishDate);
      map.set(key, [
        ...(map.get(key) || []),
        item,
      ]);
    }
    for (const list of map.values()) {
      list.sort((left, right) => (left.publishDate || "").localeCompare(right.publishDate || ""));
    }
    return map;
  }, [items]);

  const unscheduled = useMemo(
    () => items.filter((item) => !item.publishDate && !LIVE_STATUSES.has(item.status || "")),
    [items],
  );

  // The plan-ahead board: everything not yet live from this week forward,
  // grouped by week, so Yumei can flag what the coaches need to film.
  const planWeeks = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const groups = new Map<string, OpsContentFullItem[]>();
    for (const item of items) {
      if (!item.publishDate || LIVE_STATUSES.has(item.status || "")) continue;
      const date = new Date(item.publishDate);
      if (date < start) continue;
      const monday = new Date(date);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const key = dayKey(monday);
      groups.set(key, [...(groups.get(key) || []), item]);
    }
    for (const list of groups.values()) {
      list.sort((left, right) => (left.publishDate || "").localeCompare(right.publishDate || ""));
    }
    return [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  }, [items]);

  const save = async (contentId: string, patch: Record<string, unknown>) => {
    setBusy(true);
    try {
      await onUpdate(contentId, patch);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const cycleFootage = (item: OpsContentFullItem) => {
    const index = FOOTAGE_CHOICES.findIndex((choice) => choice === item.footageStatus);
    void save(item.id, { footageStatus: FOOTAGE_CHOICES[(index + 1) % FOOTAGE_CHOICES.length] });
  };

  const markLive = (item: OpsContentFullItem) =>
    void save(item.id, { status: LIVE_STATUSES.has(item.status || "") ? "Scheduled" : "Published" });

  const handleDrop = (day: string) => (event: React.DragEvent) => {
    event.preventDefault();
    setDragOverDay(null);
    const contentId = event.dataTransfer.getData("text/fops-content-id");
    if (!contentId) return;
    const item = items.find((entry) => entry.id === contentId);
    void save(contentId, { publishDate: withDay(day, item?.publishDate) });
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
    if (view === "month") date.setMonth(date.getMonth() + direction);
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
    start.setDate(1 - ((first.getDay() + 6) % 7));
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
      if (!LIVE_STATUSES.has(item.status || "") || !item.publishDate) continue;
      const key = dayKey(item.publishDate).slice(0, 7);
      groups.set(key, [...(groups.get(key) || []), item]);
    }
    return [...groups.entries()].sort((left, right) => right[0].localeCompare(left[0]));
  }, [items]);

  const heading =
    view === "day"
      ? anchorDate.toLocaleDateString(locale, { month: "long", year: "numeric" })
      : view === "week"
        ? `${weekDays[0].toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString(locale, { month: "short", day: "numeric" })}`
        : anchorDate.toLocaleDateString(locale, { year: "numeric", month: "long" });

  const weekdayNames = weekDays.map((date) =>
    date.toLocaleDateString(locale, { weekday: language === "zh" ? "narrow" : "short" }),
  );

  const dayItems = byDay.get(dayKey(anchorDate)) || [];

  return (
    <div className="fopsPage fopsCalendarPage">
      <header className="fopsPageHeader fopsPageHeader--actions">
        <div>
          <span className="fopsEyebrow">{text(language, "Editorial calendar", "内容排期")}</span>
          <h1>{text(language, "Content calendar", "内容日历")}</h1>
          <p>
            {text(
              language,
              "Plan the week, write the copy, drag to reschedule, check things off as they go live.",
              "规划一周、撰写文案、拖拽改期、上线后一键打勾。",
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
          {(["day", "week", "month", "plan"] as CalendarView[]).map((entry) => (
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
                    : text(language, "Plan ahead", "拍摄计划")}
            </button>
          ))}
        </div>
        {view !== "plan" ? (
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
        ) : null}
      </div>

      {view === "month" ? (
        <div className="fopsCalMonth">
          {weekdayNames.map((name, index) => (
            <span className="fopsCalWeekday" key={`${name}-${index}`}>{name}</span>
          ))}
          {monthCells.map((date) => {
            const key = dayKey(date);
            const inMonth = date.getMonth() === anchorDate.getMonth();
            const cellItems = byDay.get(key) || [];
            return (
              <div
                className={`fopsCalCell${inMonth ? "" : " is-outside"}${
                  key === todayKey ? " is-today" : ""
                }${dragOverDay === key ? " is-dragover" : ""}`}
                key={key}
                {...dragProps(key)}
                onContextMenu={openDayMenu(key)}
              >
                <span className="fopsCalCellDate">{date.getDate()}</span>
                <div className="fopsCalCellItems">
                  {cellItems.slice(0, 4).map((item) => (
                    <ItemChip item={item} language={language} compact onOpen={setEditing} onDragStart={startDrag} onContextMenu={(entry, event) => openItemMenu(entry)(event)} key={item.id} />
                  ))}
                  {cellItems.length > 4 ? (
                    <button
                      type="button"
                      className="fopsCalMore"
                      onClick={() => {
                        setAnchor(date.getTime());
                        setView("day");
                      }}
                    >
                      +{cellItems.length - 4}
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
            const cellItems = byDay.get(key) || [];
            return (
              <div
                className={`fopsCalWeekCol${key === todayKey ? " is-today" : ""}${
                  dragOverDay === key ? " is-dragover" : ""
                }`}
                key={key}
                {...dragProps(key)}
                onContextMenu={openDayMenu(key)}
              >
                <header>
                  <button
                    type="button"
                    className="fopsCalWeekDay"
                    onClick={() => {
                      setAnchor(date.getTime());
                      setView("day");
                    }}
                  >
                    <strong>{date.toLocaleDateString(locale, { weekday: "short" })}</strong>
                    <span>{date.getDate()}</span>
                  </button>
                </header>
                <div className="fopsCalWeekItems">
                  {cellItems.map((item) => (
                    <div className="fopsCalWeekItem" key={item.id}>
                      <ItemChip item={item} language={language} onOpen={setEditing} onDragStart={startDrag} onContextMenu={(entry, event) => openItemMenu(entry)(event)} />
                      <button
                        type="button"
                        className={`fopsCalLiveDot${LIVE_STATUSES.has(item.status || "") ? " is-live" : ""}`}
                        title={text(language, "Mark as live", "标记为已上线")}
                        onClick={() => markLive(item)}
                      >
                        <Check size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "day" ? (
        <div className="fopsCalDayLayout" {...dragProps(dayKey(anchorDate))} onContextMenu={openDayMenu(dayKey(anchorDate))}>
          <aside className="fopsCalDayHero">
            <span className="fopsCalDayWeekday">
              {anchorDate.toLocaleDateString(locale, { weekday: "long" })}
            </span>
            <strong className="fopsCalDayNumber">{anchorDate.getDate()}</strong>
            <span className="fopsCalDayMonth">
              {anchorDate.toLocaleDateString(locale, { month: "long", year: "numeric" })}
            </span>
            <div className="fopsCalDaySummary">
              <span>
                {dayItems.length} {text(language, "planned", "条内容")}
              </span>
              <span>
                {dayItems.filter((item) => LIVE_STATUSES.has(item.status || "")).length}{" "}
                {text(language, "live", "已上线")}
              </span>
            </div>
            <div className="fopsCalDayPlatforms">
              {[...new Set(dayItems.map((item) => item.platform))].map((platform) => (
                <PlatformBadge platform={platform} size={20} key={platform || "none"} />
              ))}
            </div>
          </aside>
          <div className="fopsCalDayRail">
            {dayItems.length ? (
              dayItems.map((item) => {
                const live = LIVE_STATUSES.has(item.status || "");
                return (
                  <article className={`fopsCalRailCard${live ? " is-live" : ""}`} key={item.id}>
                    <div className="fopsCalRailTime">
                      <span>{timeOf(item.publishDate) || text(language, "anytime", "全天")}</span>
                      <i aria-hidden="true" />
                    </div>
                    <div className="fopsCalRailBody">
                      <header>
                        <PlatformBadge platform={item.platform} size={18} />
                        <span className="fopsCalRailPlatform">{item.platform || "—"}</span>
                        <TonePill tone={live ? "success" : "gold"}>
                          {statusLabel(language, item.status)}
                        </TonePill>
                        {item.funnel ? <TonePill tone="purple">{item.funnel}</TonePill> : null}
                      </header>
                      <h3>{item.title}</h3>
                      {item.hook ? <p className="fopsCalHook">{item.hook}</p> : null}
                      {item.copy ? <p className="fopsCalCopy">{item.copy.slice(0, 300)}</p> : null}
                      {item.keywords || item.hashtags ? (
                        <div className="fopsCalTagRow">
                          {(item.keywords || "").split(/[,，]/).filter(Boolean).slice(0, 6).map((keyword) => (
                            <span className="fopsCalTag" key={keyword}>{keyword.trim()}</span>
                          ))}
                          {(item.hashtags || "").split(/\s+/).filter(Boolean).slice(0, 6).map((tag) => (
                            <span className="fopsCalTag fopsCalTag--hash" key={tag}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                      <footer>
                        <button
                          type="button"
                          className={`fopsCalLiveToggle fopsCalLiveToggle--small${live ? " is-live" : ""}`}
                          onClick={() => markLive(item)}
                        >
                          <Check size={14} />
                          {live
                            ? text(language, "Live", "已上线")
                            : text(language, "Mark live", "标记上线")}
                        </button>
                        <button
                          type="button"
                          className="fopsButton fopsButton--compact fopsButton--ghost"
                          onClick={() => setEditing(item)}
                        >
                          {text(language, "Open & edit", "打开编辑")}
                        </button>
                      </footer>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="fopsQuietText">
                {text(language, "Nothing planned this day — drag a card here or create new content.", "这一天还没有安排——把卡片拖过来，或新建内容。")}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {view === "plan" ? (
        <div className="fopsCalPlan">
          <p className="fopsCalPlanIntro">
            <Clapperboard size={15} aria-hidden="true" />
            {text(
              language,
              "Flag what the coaches need to film in the coming weeks — tap the pill to change footage status, open a card to describe the shots.",
              "标记未来几周需要教练拍摄的内容——点状态胶囊切换素材状态，打开卡片写清楚要拍什么。",
            )}
          </p>
          {planWeeks.length ? (
            planWeeks.map(([weekKey, weekItems]) => {
              const weekStart = new Date(`${weekKey}T00:00:00`);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              const isThisWeek = weekKey === dayKey(new Date(new Date().setDate(new Date().getDate() - ((new Date().getDay() + 6) % 7))));
              const needsFilming = weekItems.filter(
                (item) => !item.footageStatus || item.footageStatus.includes("需拍摄") || item.footageStatus.includes("拍摄中"),
              ).length;
              return (
                <section className="fopsCalPlanWeek" key={weekKey}>
                  <header>
                    <strong>
                      {weekStart.toLocaleDateString(locale, { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString(locale, { month: "short", day: "numeric" })}
                    </strong>
                    {isThisWeek ? (
                      <span className="fopsCalPlanNow">{text(language, "This week", "本周")}</span>
                    ) : null}
                    <span className="fopsCalPlanCount">
                      {needsFilming
                        ? `${needsFilming} ${text(language, "need footage", "待解决素材")}`
                        : text(language, "footage sorted", "素材已就绪")}
                    </span>
                  </header>
                  <div className="fopsCalPlanRows">
                    {weekItems.map((item) => (
                      <div className="fopsCalPlanRow" key={item.id}>
                        <PlatformBadge platform={item.platform} size={17} />
                        <div className="fopsCalPlanMain">
                          <strong>{item.title}</strong>
                          <span>
                            {[
                              item.format,
                              item.publishDate
                                ? new Date(item.publishDate).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" })
                                : "",
                              item.shootDate
                                ? `${text(language, "shoot", "拍摄")} ${new Date(item.shootDate).toLocaleDateString(locale, { month: "short", day: "numeric" })}`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          {item.filmingNotes ? <p>{item.filmingNotes}</p> : null}
                        </div>
                        <button
                          type="button"
                          className={`fopsFootagePill ${footageClass(item.footageStatus)}`}
                          disabled={busy}
                          title={text(language, "Click to change footage status", "点击切换素材状态")}
                          onClick={() => cycleFootage(item)}
                        >
                          {footageDisplay(language, item.footageStatus)}
                        </button>
                        <button
                          type="button"
                          className="fopsCalIconBtn"
                          onClick={() => setEditing(item)}
                          aria-label={text(language, "Open & edit", "打开编辑")}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <p className="fopsQuietText">
              {text(
                language,
                "Nothing scheduled in the coming weeks yet — plan content on the calendar first.",
                "未来几周还没有排期内容——先在日历上安排内容。",
              )}
            </p>
          )}
        </div>
      ) : null}

      {unscheduled.length ? (
        <section className="fopsCalBacklog">
          <header>
            <CalendarDays size={15} aria-hidden="true" />
            <strong>{text(language, "Unscheduled ideas — drag onto a day", "未排期的内容——拖到某一天即可安排")}</strong>
          </header>
          <div className="fopsCalBacklogItems">
            {unscheduled.map((item) => (
              <ItemChip item={item} language={language} onOpen={setEditing} onDragStart={startDrag} onContextMenu={(entry, event) => openItemMenu(entry)(event)} key={item.id} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="fopsCalArchiveToggleRow">
        <button
          type="button"
          className="fopsTextButton"
          onClick={() => setShowArchive((current) => !current)}
        >
          <Archive size={14} />
          {showArchive
            ? text(language, "Hide archive & monthly stats", "收起归档与月度统计")
            : text(language, "Archive & monthly stats", "归档与月度统计")}
        </button>
      </div>

      {showArchive ? (
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
                      <span className="fopsCalArchivePlat" key={platform}>
                        <PlatformBadge platform={platform} size={15} />
                        {platform} × {count}
                      </span>
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
                          <PlatformBadge platform={item.platform} size={15} />
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

      {menu ? (
        <>
          <div
            className="fopsCalMenuScrim"
            onClick={() => setMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu(null);
            }}
          />
          <div className="fopsCalMenu" style={{ left: menu.x, top: menu.y }} role="menu">
            {menu.kind === "item" ? (
              <>
                <button type="button" role="menuitem" onClick={() => { setEditing(menu.item); setMenu(null); }}>
                  <Pencil size={14} /> {text(language, "Edit", "编辑")}
                </button>
                <button type="button" role="menuitem" onClick={() => { setClipboard({ mode: "cut", item: menu.item }); setMenu(null); }}>
                  <Scissors size={14} /> {text(language, "Cut", "剪切")}
                </button>
                <button type="button" role="menuitem" onClick={() => { setClipboard({ mode: "copy", item: menu.item }); setMenu(null); }}>
                  <Copy size={14} /> {text(language, "Copy", "复制")}
                </button>
                <hr />
                <button type="button" role="menuitem" className="is-danger" onClick={() => deleteItem(menu.item)}>
                  <Trash2 size={14} /> {text(language, "Delete", "删除")}
                </button>
              </>
            ) : (
              <button type="button" role="menuitem" onClick={() => pasteInto(menu.day)}>
                <ClipboardPaste size={14} />{" "}
                {clipboard?.mode === "cut"
                  ? text(language, "Paste (move here)", "粘贴（移动到这里）")
                  : text(language, "Paste (duplicate here)", "粘贴（复制到这里）")}
              </button>
            )}
          </div>
        </>
      ) : null}

      {clipboard ? (
        <div className="fopsCalClipboardBar">
          {clipboard.mode === "cut" ? <Scissors size={13} /> : <Copy size={13} />}
          <span>
            {clipboard.mode === "cut"
              ? text(language, "Cut:", "已剪切：")
              : text(language, "Copied:", "已复制：")}{" "}
            {clipboard.item.title}
          </span>
          <em>{text(language, "right-click a day to paste", "右键某一天即可粘贴")}</em>
          <button type="button" onClick={() => setClipboard(null)} aria-label={text(language, "Clear", "清除")}>
            <X size={13} />
          </button>
        </div>
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
