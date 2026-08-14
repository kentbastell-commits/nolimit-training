// Inbox — everything the founders have sent back, in one list.
//
// Yumei's counterpart to the founders' Decisions queue. Without it she has to
// open Goals, War Room, Performance and Content in turn to discover whether
// anyone replied. Assembled CLIENT-side from the dashboard already in memory,
// so it costs no extra Feishu reads.
//
// "Read" state lives in localStorage, not the Base: it's a per-person view
// preference, and writing it server-side would cost a 3.6s round trip per
// glance.
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Lightbulb,
  MessageSquare,
  Target,
  TrendingUp,
} from "lucide-react";
import { formatOpsDate } from "./utils";
import type {
  CompanyOpsDashboard,
  CompanyOpsLanguage,
  CompanyOpsPage,
  CompanyOpsUser,
} from "./types";

type InboxKind = "goal" | "idea" | "review" | "approval" | "policy";

type InboxItem = {
  id: string;
  kind: InboxKind;
  title: string;
  body?: string;
  who?: string;
  when?: string;
  goTo: CompanyOpsPage;
};

const ICON: Record<InboxKind, typeof Target> = {
  goal: Target,
  idea: Lightbulb,
  review: TrendingUp,
  approval: CheckCircle2,
  policy: ClipboardCheck,
};

/** Last entry of a "[yyyy-mm-dd hh:mm Name] text" thread. */
function lastEntry(thread?: string) {
  if (!thread?.trim()) return undefined;
  const chunks = thread.split(/\n(?=\[\d{4}-)/);
  const raw = chunks[chunks.length - 1];
  const match = raw.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s+([^\]]+)\]\s*([\s\S]*)$/);
  if (!match) return { stamp: "", author: "", body: raw.trim() };
  return { stamp: match[1], author: match[2].trim(), body: match[3].trim() };
}

export default function InboxPage({
  dashboard,
  language,
  user,
  onOpenPage,
}: {
  dashboard: CompanyOpsDashboard;
  language: CompanyOpsLanguage;
  user?: CompanyOpsUser;
  onOpenPage: (page: CompanyOpsPage) => void;
}) {
  const t = (en: string, zh: string) => (language === "zh" ? zh : en);

  const items = useMemo<InboxItem[]>(() => {
    const out: InboxItem[] = [];

    // Founder replies on company goals she can see.
    for (const goal of dashboard.goals || []) {
      const entry = lastEntry(goal.response);
      if (!entry?.body) continue;
      if (user?.name && entry.author === user.name) continue; // her own comment
      out.push({
        id: `goal-${goal.id}-${entry.stamp}`,
        kind: "goal",
        title: goal.title,
        body: entry.body,
        who: entry.author,
        when: entry.stamp,
        goTo: "home",
      });
    }

    // Replies and status moves on ideas she raised.
    for (const idea of dashboard.ideas || []) {
      const mine = !user?.openId || idea.raisedByOpenId === user.openId;
      if (!mine) continue;
      const entry = lastEntry(idea.thread);
      if (entry?.body && entry.author !== user?.name) {
        out.push({
          id: `idea-${idea.id}-${entry.stamp}`,
          kind: "idea",
          title: idea.idea,
          body: entry.body,
          who: entry.author,
          when: entry.stamp,
          goTo: "warroom",
        });
      }
      if (idea.status === "采纳 Adopted" || idea.status === "搁置 Parked") {
        out.push({
          id: `idea-status-${idea.id}-${idea.status}`,
          kind: "idea",
          title: idea.idea,
          body:
            idea.status === "采纳 Adopted"
              ? t("Your idea was adopted.", "你的想法已被采纳。")
              : t("Your idea was parked for now.", "你的想法暂时搁置。"),
          goTo: "warroom",
        });
      }
    }

    // Monthly review: new goals, scores, requested changes, founder feedback.
    for (const cycle of dashboard.myPerformance?.cycles || []) {
      if (cycle.founderReview) {
        out.push({
          id: `review-${cycle.id}-feedback`,
          kind: "review",
          title: t("Feedback on your monthly review", "月度评审反馈"),
          body: cycle.founderReview,
          when: cycle.month,
          goTo: "performance",
        });
      }
      if (cycle.status === "Goals Set") {
        out.push({
          id: `review-${cycle.id}-goals`,
          kind: "review",
          title: t("Your monthly goals are ready", "你的月度目标已发布"),
          body: t("Review them and confirm.", "请查看并确认。"),
          when: cycle.month,
          goTo: "performance",
        });
      }
      if (cycle.status === "Changes Requested") {
        out.push({
          id: `review-${cycle.id}-changes`,
          kind: "review",
          title: t("Changes requested on your report", "你的报告需要修改"),
          body: t("Open it to see what to adjust.", "打开查看需要调整的内容。"),
          when: cycle.month,
          goTo: "performance",
        });
      }
    }

    // Content the founders approved or sent back.
    for (const item of dashboard.growth?.upcomingContent || []) {
      const status = (item as { approvalStatus?: string }).approvalStatus;
      if (!status) continue;
      out.push({
        id: `content-${item.id}-${status}`,
        kind: "approval",
        title: item.title,
        body: /approve|批准|通过/i.test(status)
          ? t("Approved to publish.", "已批准发布。")
          : t(`Needs changes: ${status}`, `需要修改：${status}`),
        goTo: "calendar",
      });
    }

    // Policies still waiting on her acknowledgement.
    for (const policy of dashboard.policies || []) {
      if (policy.acknowledged) continue;
      out.push({
        id: `policy-${policy.id}`,
        kind: "policy",
        title: policy.title,
        body: t("Please read and acknowledge.", "请阅读并确认。"),
        goTo: "resources",
      });
    }

    return out.sort((a, b) => (b.when || "").localeCompare(a.when || ""));
  }, [dashboard, user, language]);

  const [read, setRead] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setRead(JSON.parse(window.localStorage.getItem("nl_ops_inbox_read") || "{}"));
    } catch {
      /* storage may be blocked */
    }
  }, []);
  const markRead = (id: string) => {
    setRead((current) => {
      const next = { ...current, [id]: true };
      try {
        window.localStorage.setItem("nl_ops_inbox_read", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const unread = items.filter((item) => !read[item.id]);

  return (
    <section className="fopsSection fopsInbox">
      <header className="fopsInboxHead">
        <div>
          <span className="fopsEyebrow">{t("Inbox", "收件箱")}</span>
          <h2>{t("Everything sent back to you", "所有需要你看的回复")}</h2>
          <p className="fopsQuietText">
            {t(
              "Replies, decisions and new goals from the founders — in one place, so you don't have to check each page.",
              "创始人的回复、决定和新目标都在这里，不用一个个页面去翻。",
            )}
          </p>
        </div>
        <div className="fopsInboxCount">
          <b>{unread.length}</b>
          <span>{t("unread", "未读")}</span>
        </div>
      </header>

      {items.length ? (
        <div className="fopsInboxList">
          {items.map((item) => {
            const Icon = ICON[item.kind];
            const isRead = Boolean(read[item.id]);
            return (
              <article className={`fopsInboxItem${isRead ? " is-read" : ""}`} key={item.id}>
                <span className="fopsInboxIcon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div className="fopsInboxBody">
                  <div className="fopsInboxTop">
                    <strong>{item.title}</strong>
                    {item.who ? <small>{item.who}</small> : null}
                    {item.when ? <small>{formatOpsDate(item.when, language)}</small> : null}
                  </div>
                  {item.body ? <p>{item.body}</p> : null}
                  <div className="fopsInboxActions">
                    <button
                      type="button"
                      className="fopsButton fopsButton--compact"
                      onClick={() => {
                        markRead(item.id);
                        onOpenPage(item.goTo);
                      }}
                    >
                      {t("Open", "打开")}
                    </button>
                    {!isRead ? (
                      <button
                        type="button"
                        className="fopsInboxDismiss"
                        onClick={() => markRead(item.id)}
                      >
                        {t("Mark read", "标为已读")}
                      </button>
                    ) : null}
                  </div>
                </div>
                {!isRead ? <i className="fopsInboxDot" aria-hidden="true" /> : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="fopsInboxEmpty">
          <MessageSquare size={24} aria-hidden="true" />
          <p>{t("Nothing waiting on you. All clear.", "没有待处理的内容，一切都清空了。")}</p>
        </div>
      )}
    </section>
  );
}
