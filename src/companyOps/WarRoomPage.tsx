// War Room — where half-formed ideas land and get argued about.
//
// Design constraints that shaped this page:
//  - Capture must feel instant. A Feishu write costs ~3.6s, so every action
//    here updates the screen optimistically and reconciles on the next
//    dashboard refresh. An idea board that makes you wait is an idea board
//    nobody uses.
//  - Threads reuse the goal-thread convention ("[yyyy-mm-dd hh:mm Name] …"),
//    so a discussion reads the same here, on a goal, and in the Base.
//  - Everything is bilingual through opsText / TranslatableText: Yumei writes
//    Chinese, the founders write English, and each side reads its own.
import { useMemo, useState } from "react";
import { Flame, MessageSquare, Paperclip, Plus, Send, Trash2, TrendingUp, X } from "lucide-react";
import { companyOpsApi } from "./api";
import { AttachmentLink, ThreadBody, fileLabel } from "./components";
import { opsText } from "./copy";
import { TranslatableText } from "./TranslatableText";
import { formatOpsDate } from "./utils";
import { reportClientEvent } from "../telemetry";
import type {
  CompanyOpsLanguage,
  CompanyOpsUser,
  OpsIdeaItem,
} from "./types";

const CATEGORIES = [
  { value: "产品 Product", en: "Product", zh: "产品" },
  { value: "内容 Content", en: "Content", zh: "内容" },
  { value: "增长 Growth", en: "Growth", zh: "增长" },
  { value: "运营 Ops", en: "Ops", zh: "运营" },
  { value: "其他 Other", en: "Other", zh: "其他" },
];

const STATUSES = [
  { value: "新 New", en: "New", zh: "新" },
  { value: "讨论中 Discussing", en: "Discussing", zh: "讨论中" },
  { value: "采纳 Adopted", en: "Adopted", zh: "采纳" },
  { value: "搁置 Parked", en: "Parked", zh: "搁置" },
];

const label = (
  list: typeof CATEGORIES,
  value: string | undefined,
  language: CompanyOpsLanguage,
) => {
  const hit = list.find((entry) => entry.value === value);
  if (!hit) return value || "";
  return language === "zh" ? hit.zh : hit.en;
};

type ThreadEntry = { stamp: string; author: string; body: string };

/** "[2026-08-14 09:30 Yumei] text" per line — same shape as goal threads. */
function parseThread(raw: string): ThreadEntry[] {
  if (!raw.trim()) return [];
  return raw
    .split(/\n(?=\[\d{4}-)/)
    .map((chunk) => {
      const match = chunk.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s+([^\]]+)\]\s*([\s\S]*)$/);
      if (!match) return { stamp: "", author: "", body: chunk.trim() };
      return { stamp: match[1], author: match[2].trim(), body: match[3].trim() };
    })
    .filter((entry) => entry.body);
}

export default function WarRoomPage({
  ideas,
  language,
  user,
  csrfToken,
  onCreate,
  onReply,
  onVote,
  onStatus,
  onDelete,
}: {
  ideas: OpsIdeaItem[];
  language: CompanyOpsLanguage;
  user?: CompanyOpsUser;
  csrfToken?: string;
  onCreate: (
    idea: string,
    category: string,
    detail?: string,
    attachments?: string[],
  ) => Promise<void>;
  onReply: (ideaId: string, message: string, attachments?: string[]) => Promise<void>;
  onVote: (ideaId: string) => Promise<void>;
  onStatus: (ideaId: string, status: string) => Promise<void>;
  onDelete: (ideaId: string) => void;
}) {
  const isFounder = user?.role === "founder";
  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] = useState(CATEGORIES[0].value);
  const [detail, setDetail] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [replyFiles, setReplyFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [actionError, setActionError] = useState("");

  // Reuses the shared-assets uploader the Article Builder already uses, so
  // attachments land in the same Feishu folder the team browses.
  const upload = async (file: File, target: "idea" | "reply") => {
    setUploading(true);
    setUploadError("");
    try {
      const result = await companyOpsApi.uploadAsset?.(file, csrfToken);
      const url = result?.url;
      if (!url) throw new Error("no url");
      if (target === "idea") setFiles((current) => [...current, url]);
      else setReplyFiles((current) => [...current, url]);
    } catch {
      setUploadError(opsText(language, "warRoomAttachFailed"));
    } finally {
      setUploading(false);
    }
  };
  const [filter, setFilter] = useState<string>("all");
  const [openIdea, setOpenIdea] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  // Optimistic layers: the dashboard refresh is seconds behind every write.
  const [localVotes, setLocalVotes] = useState<Record<string, boolean>>({});
  const [localReplies, setLocalReplies] = useState<Record<string, ThreadEntry[]>>({});
  const [justPosted, setJustPosted] = useState<OpsIdeaItem[]>([]);
  const [busyVotes, setBusyVotes] = useState<Set<string>>(() => new Set());
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

  const showActionError = (event: string, error: unknown, message: string) => {
    setActionError(message);
    reportClientEvent("api_fail", event, {
      message: error instanceof Error ? error.message : String(error || message),
    });
  };

  const merged = useMemo(() => {
    const known = new Set(ideas.map((item) => item.id));
    return [...justPosted.filter((item) => !known.has(item.id)), ...ideas];
  }, [ideas, justPosted]);

  const visible = useMemo(() => {
    if (filter === "all") return merged;
    if (filter === "mine") return merged.filter((item) => item.raisedByOpenId === user?.openId);
    return merged.filter((item) => item.category === filter);
  }, [merged, filter, user?.openId]);

  const counts = useMemo(() => {
    const open = merged.filter((item) => item.status !== "采纳 Adopted" && item.status !== "搁置 Parked");
    return { total: merged.length, open: open.length };
  }, [merged]);

  const submitIdea = async () => {
    const text = draft.trim();
    if (!text || posting) return;
    const submittedDetail = detail.trim();
    const submittedFiles = [...files];
    setPosting(true);
    setActionError("");
    const optimistic: OpsIdeaItem = {
      id: `pending-${Date.now()}`,
      idea: text,
      detail: submittedDetail || undefined,
      attachments: submittedFiles,
      category: draftCategory,
      status: "新 New",
      raisedBy: user?.name,
      raisedByOpenId: user?.openId,
      votes: 0,
      hasVoted: false,
      thread: "",
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setJustPosted((current) => [optimistic, ...current]);
    setDraft("");
    setDetail("");
    setDetailOpen(false);
    try {
      await onCreate(text, draftCategory, optimistic.detail, submittedFiles);
      setFiles([]);
    } catch (error) {
      setJustPosted((current) => current.filter((item) => item.id !== optimistic.id));
      setDraft(text);
      setDetail(submittedDetail);
      setDetailOpen(Boolean(submittedDetail));
      setFiles(submittedFiles);
      showActionError("company_ops_warroom_create_failed", error, opsText(language, "warRoomPostFailed"));
    } finally {
      setPosting(false);
    }
  };

  const submitReply = async (ideaId: string) => {
    const text = reply.trim();
    if ((!text && !replyFiles.length) || replying) return;
    const submittedFiles = [...replyFiles];
    const optimisticReply: ThreadEntry = {
      stamp: new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " "),
      author: user?.name || "",
      body: text,
    };
    setReplying(true);
    setActionError("");
    setLocalReplies((current) => ({
      ...current,
      [ideaId]: [...(current[ideaId] || []), optimisticReply],
    }));
    setReply("");
    try {
      await onReply(ideaId, text, submittedFiles);
      setReplyFiles([]);
    } catch (error) {
      setLocalReplies((current) => ({
        ...current,
        [ideaId]: (current[ideaId] || []).filter((entry) => entry !== optimisticReply),
      }));
      setReply(text);
      setReplyFiles(submittedFiles);
      showActionError("company_ops_warroom_reply_failed", error, opsText(language, "warRoomReplyFailed"));
    } finally {
      setReplying(false);
    }
  };

  const toggleVote = async (item: OpsIdeaItem) => {
    if (item.pending || busyVotes.has(item.id)) return;
    const previous = localVotes[item.id] ?? item.hasVoted;
    setActionError("");
    setBusyVotes((current) => new Set(current).add(item.id));
    setLocalVotes((current) => ({
      ...current,
      [item.id]: !previous,
    }));
    try {
      await onVote(item.id);
    } catch (error) {
      setLocalVotes((current) => ({ ...current, [item.id]: previous }));
      showActionError("company_ops_warroom_vote_failed", error, opsText(language, "warRoomVoteFailed"));
    } finally {
      setBusyVotes((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  };

  const changeStatus = async (ideaId: string, status: string) => {
    if (statusBusy === ideaId) return;
    setActionError("");
    setStatusBusy(ideaId);
    try {
      await onStatus(ideaId, status);
    } catch (error) {
      showActionError("company_ops_warroom_status_failed", error, opsText(language, "warRoomStatusFailed"));
    } finally {
      setStatusBusy(null);
    }
  };

  return (
    <div className="fopsWarRoom">
      <section className="fopsSection">
        <header className="fopsWarHeader">
          <div>
            <span className="fopsEyebrow">{opsText(language, "navWarRoom")}</span>
            <h2>{opsText(language, "warRoomTitle")}</h2>
            <p className="fopsQuietText">{opsText(language, "warRoomBlurb")}</p>
          </div>
          <div className="fopsWarCounts">
            <div><b>{counts.total}</b><span>{opsText(language, "warRoomIdeas")}</span></div>
            <div><b>{counts.open}</b><span>{opsText(language, "warRoomOpen")}</span></div>
          </div>
        </header>

        {actionError ? (
          <p className="fopsInlineNotice fopsInlineNotice--error" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="fopsWarCapture">
          <div className="fopsWarCaptureRow">
            <Plus size={17} aria-hidden="true" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitIdea();
                }
              }}
              placeholder={opsText(language, "warRoomPlaceholder")}
              aria-label={opsText(language, "warRoomPlaceholder")}
              disabled={posting}
            />
            <label
              className="fopsWarAttachIcon"
              title={opsText(language, "warRoomAttach")}
              aria-label={opsText(language, "warRoomAttach")}
            >
              <Paperclip size={16} aria-hidden="true" />
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xlsx,.mp4,.mov"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file, "idea");
                  event.target.value = "";
                }}
                disabled={uploading || posting}
              />
            </label>
            <select
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
              aria-label={opsText(language, "warRoomCategory")}
              disabled={posting}
            >
              {CATEGORIES.map((entry) => (
                <option value={entry.value} key={entry.value}>
                  {language === "zh" ? entry.zh : entry.en}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="fopsButton fopsButton--primary fopsButton--compact"
              onClick={() => void submitIdea()}
              disabled={!draft.trim() || posting || uploading}
            >
              {opsText(language, "warRoomPost")}
            </button>
          </div>
          {files.length || uploadError ? (
            <div className="fopsWarAttachRow">
            {files.map((url) => (
              <span className="fopsWarChipFile" key={url}>
                <a href={url} target="_blank" rel="noreferrer">{fileLabel(url)}</a>
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((item) => item !== url))}
                  aria-label="remove"
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ))}
              {uploadError ? <small className="fopsWarAttachError">{uploadError}</small> : null}
            </div>
          ) : null}
          {detailOpen ? (
            <textarea
              className="fopsWarDetail"
              rows={3}
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder={opsText(language, "warRoomDetailPlaceholder")}
              disabled={posting}
            />
          ) : (
            <button type="button" className="fopsWarDetailToggle" onClick={() => setDetailOpen(true)}>
              {opsText(language, "warRoomAddDetail")}
            </button>
          )}
        </div>

        <div className="fopsWarFilters">
          <button
            type="button"
            className={`fopsWarChip${filter === "all" ? " is-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            {opsText(language, "warRoomAll")}
          </button>
          <button
            type="button"
            className={`fopsWarChip${filter === "mine" ? " is-active" : ""}`}
            onClick={() => setFilter("mine")}
          >
            {opsText(language, "warRoomMine")}
          </button>
          {CATEGORIES.map((entry) => (
            <button
              type="button"
              key={entry.value}
              className={`fopsWarChip${filter === entry.value ? " is-active" : ""}`}
              onClick={() => setFilter(entry.value)}
            >
              {language === "zh" ? entry.zh : entry.en}
            </button>
          ))}
        </div>

        <div className="fopsWarGrid">
          {visible.length ? (
            visible.map((item) => {
              const voted = localVotes[item.id] ?? item.hasVoted;
              const voteCount = item.votes + (voted === item.hasVoted ? 0 : voted ? 1 : -1);
              const thread = [...parseThread(item.thread), ...(localReplies[item.id] || [])];
              const isOpen = openIdea === item.id;
              const mine = item.raisedByOpenId === user?.openId;
              return (
                <article
                  className={`fopsWarCard${item.pending ? " is-pending" : ""}${isOpen ? " is-open" : ""}`}
                  key={item.id}
                >
                  <div className="fopsWarCardTop">
                    <button
                      type="button"
                      className={`fopsWarVote${voted ? " is-voted" : ""}`}
                      onClick={() => void toggleVote(item)}
                      aria-label={opsText(language, "warRoomVote")}
                      disabled={item.pending || busyVotes.has(item.id)}
                    >
                      <TrendingUp size={14} aria-hidden="true" />
                      <b>{voteCount}</b>
                    </button>
                    <div className="fopsWarCardBody">
                      <button
                        type="button"
                        className="fopsWarCardTitle"
                        onClick={() => setOpenIdea(isOpen ? null : item.id)}
                      >
                        <TranslatableText text={item.idea} language={language} as="span" bare />
                      </button>
                      <div className="fopsWarMeta">
                        {item.category ? (
                          <span className="fopsWarTag">{label(CATEGORIES, item.category, language)}</span>
                        ) : null}
                        <span className={`fopsWarStatus is-${(item.status || "").split(" ")[1]?.toLowerCase() || "new"}`}>
                          {label(STATUSES, item.status, language)}
                        </span>
                        {item.raisedBy ? <small>{item.raisedBy}</small> : null}
                        {item.createdAt ? <small>{formatOpsDate(item.createdAt, language)}</small> : null}
                        {thread.length ? (
                          <small className="fopsWarThreadCount">
                            <MessageSquare size={12} aria-hidden="true" />
                            {thread.length}
                          </small>
                        ) : null}
                        {voteCount >= 3 ? (
                          <small className="fopsWarHot">
                            <Flame size={12} aria-hidden="true" />
                            {opsText(language, "warRoomHot")}
                          </small>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="fopsWarThread">
                      {item.detail ? (
                        <TranslatableText text={item.detail} language={language} className="fopsWarDetailText" />
                      ) : null}
                      {item.attachments?.length ? (
                        <div className="fopsWarAttachList">
                          {item.attachments.map((url) => (
                            <AttachmentLink url={url} key={url} />
                          ))}
                        </div>
                      ) : null}
                      {thread.length ? (
                        <ul className="fopsWarThreadList">
                          {thread.map((entry, index) => (
                            <li key={`${item.id}-${index}`}>
                              <div className="fopsWarThreadHead">
                                <strong>{entry.author}</strong>
                                <small>{entry.stamp}</small>
                              </div>
                              <ThreadBody body={entry.body} language={language} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="fopsQuietText">{opsText(language, "warRoomNoReplies")}</p>
                      )}

                      <div className="fopsWarReply">
                        <input
                          value={openIdea === item.id ? reply : ""}
                          onChange={(event) => setReply(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              void submitReply(item.id);
                            }
                          }}
                          placeholder={opsText(language, "warRoomReplyPlaceholder")}
                          aria-label={opsText(language, "warRoomReplyPlaceholder")}
                          disabled={replying}
                        />
                        <label className="fopsWarAttachBtn fopsWarAttachBtn--inline">
                          <Paperclip size={14} aria-hidden="true" />
                          <input
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xlsx,.mp4,.mov"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void upload(file, "reply");
                              event.target.value = "";
                            }}
                            disabled={uploading || replying}
                          />
                        </label>
                        <button
                          type="button"
                          className="fopsButton fopsButton--compact"
                          onClick={() => void submitReply(item.id)}
                          disabled={(!reply.trim() && !replyFiles.length) || replying}
                        >
                          <Send size={14} aria-hidden="true" />
                        </button>
                      </div>

                      <div className="fopsWarActions">
                        {isFounder ? (
                          <select
                            value={item.status || "新 New"}
                            onChange={(event) => void changeStatus(item.id, event.target.value)}
                            aria-label={opsText(language, "warRoomStatus")}
                            disabled={statusBusy === item.id}
                          >
                            {STATUSES.map((entry) => (
                              <option value={entry.value} key={entry.value}>
                                {language === "zh" ? entry.zh : entry.en}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        {isFounder || mine ? (
                          <button
                            type="button"
                            className="fopsMiniDelete"
                            onClick={() => onDelete(item.id)}
                            aria-label={opsText(language, "goalDelete")}
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="fopsQuietText">{opsText(language, "warRoomEmpty")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
