import {
  ChevronDown,
  ArrowRight,
  BarChart3,
  Banknote,
  BookOpenCheck,
  Bug,
  CalendarClock,
  ClipboardList,
  FileText,
  FlaskConical,
  Handshake,
  Lightbulb,
  Megaphone,
  MessageSquareMore,
  Paperclip,
  Plus,
  Receipt,
  Send,
  Target,
  UserPlus,
  X,
} from "lucide-react";
import {
  EmptyState,
  MetricGrid,
  QueueCard,
  ResourceLink,
  SectionHeading,
  ThreadBody,
  TonePill,
  fileLabel,
} from "./components";
import { companyOpsApi } from "./api";
import { opsText, quickActionLabel, roleLabel, statusLabel } from "./copy";
import { TranslatableText } from "./TranslatableText";
import { useState } from "react";
import type {
  CompanyOpsDashboard,
  CompanyOpsLanguage,
  CompanyOpsPage,
  CompanyOpsUser,
  OpsGoalItem,
  OpsQueueItem,
  QuickActionKey,
} from "./types";
import { defaultQuickActions, formatOpsDate } from "./utils";

const quickActionIcons = {
  content: Lightbulb,
  lead: UserPlus,
  partner: Handshake,
  campaign: Megaphone,
  experiment: FlaskConical,
  platform_metrics: BarChart3,
  support_issue: Bug,
  onboarding_setup: UserPlus,
  compensation_dispute: Banknote,
  weekly_report: FileText,
  expense: Banknote,
  internal_request: ClipboardList,
  goal: Target,
  founder_decision: MessageSquareMore,
} satisfies Record<QuickActionKey, typeof Lightbulb>;

/** Parses the goal's response column into a comment thread. Entries are
 *  "[yyyy-mm-dd hh:mm Name] text"; anything before the first prefix is a
 *  legacy single response. */
function parseGoalThread(goal: OpsGoalItem): Array<{ meta: string; body: string }> {
  const raw = (goal.response || "").trim();
  if (!raw) return [];
  return raw
    .split(/\n(?=\[\d{4}-)/)
    .map((chunk) => {
      const match = chunk.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
      if (match) return { meta: match[1], body: match[2].trim() };
      return { meta: goal.respondedBy || "", body: chunk.trim() };
    })
    .filter((entry) => entry.body);
}

function GoalRow({
  goal,
  language,
  isFounder,
  open,
  onToggle,
  onRespond,
  onUpdateStatus,
  onEdit,
  onDelete,
  csrfToken,
}: {
  goal: OpsGoalItem;
  language: CompanyOpsLanguage;
  isFounder: boolean;
  open: boolean;
  onToggle: () => void;
  onRespond?: (goal: OpsGoalItem, response: string, attachments?: string[]) => void;
  onUpdateStatus?: (goal: OpsGoalItem, status: string) => void;
  onEdit?: (goal: OpsGoalItem, patch: Record<string, string>) => void;
  onDelete?: (goal: OpsGoalItem) => void;
  csrfToken?: string;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  // Same shared-assets uploader the war room uses, so goal attachments land
  // in the Feishu folder the team already browses.
  const upload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const result = await companyOpsApi.uploadAsset?.(file, csrfToken);
      const url = result?.url;
      if (!url) throw new Error("no url");
      setFiles((current) => [...current, url]);
    } catch {
      setUploadError(opsText(language, "warRoomAttachFailed"));
    } finally {
      setUploading(false);
    }
  };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", measure: "", priority: "", due: "", notes: "" });
  const beginEdit = () => {
    setDraft({
      title: goal.title || "",
      measure: goal.measure || "",
      priority: goal.priority || "",
      due: (goal.dueAt || "").slice(0, 10),
      notes: goal.notes || "",
    });
    setEditing(true);
  };
  const saveEdit = () => {
    if (!onEdit) return;
    const patch: Record<string, string> = {};
    if (draft.title.trim() && draft.title.trim() !== (goal.title || "")) patch.title = draft.title.trim();
    if (draft.measure !== (goal.measure || "")) patch.measure = draft.measure;
    if (draft.priority && draft.priority !== (goal.priority || "")) patch.priority = draft.priority;
    if (draft.due && draft.due !== (goal.dueAt || "").slice(0, 10)) patch.due = draft.due;
    if (draft.notes !== (goal.notes || "")) patch.notes = draft.notes;
    if (Object.keys(patch).length) onEdit(goal, patch);
    setEditing(false);
  };
  const thread = parseGoalThread(goal);
  const isIdea = /想法|idea/i.test(goal.goalType || "");
  return (
    <article className={`fopsGoalRow${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="fopsGoalRowHead"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span
          className={`fopsGoalDot${
            goal.status === "Done"
              ? " is-done"
              : goal.status === "Parked"
                ? " is-parked"
                : ""
          }`}
          aria-hidden="true"
        />
        <strong className="fopsGoalRowTitle">
          <TranslatableText text={goal.title} language={language} as="span" bare />
        </strong>
        {isIdea ? (
          <TonePill tone="purple">{goal.goalType}</TonePill>
        ) : goal.priority ? (
          <TonePill tone="warning">{goal.priority}</TonePill>
        ) : null}
        {goal.status ? (
          <TonePill
            tone={
              goal.status === "Done"
                ? "success"
                : goal.status === "Parked"
                  ? "neutral"
                  : "blue"
            }
          >
            {statusLabel(language, goal.status)}
          </TonePill>
        ) : null}
        {thread.length ? (
          <span className="fopsGoalCommentCount">
            <MessageSquareMore size={13} aria-hidden="true" />
            {thread.length}
          </span>
        ) : null}
        <ChevronDown size={16} className="fopsGoalChevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="fopsGoalRowBody">
          <div className="fopsGoalMetaRow">
            {goal.creator ? (
              <small>{opsText(language, "goalFrom", { name: goal.creator })}</small>
            ) : null}
            {goal.dueAt ? (
              <small className="fopsGoalDue">{formatOpsDate(goal.dueAt, language)}</small>
            ) : null}
            {isFounder && onEdit && !editing ? (
              <button type="button" className="fopsGoalToolBtn" onClick={beginEdit}>
                {opsText(language, "goalEdit")}
              </button>
            ) : null}
            {isFounder && onDelete ? (
              <button
                type="button"
                className="fopsGoalToolBtn is-danger"
                onClick={() => onDelete(goal)}
              >
                {opsText(language, "goalDelete")}
              </button>
            ) : null}
            {isFounder && onUpdateStatus ? (
              <select
                className="fopsStatusSelect fopsGoalStatusSelect"
                value={goal.status || "Active"}
                aria-label={opsText(language, "moveStatus")}
                onChange={(event) => onUpdateStatus(goal, event.target.value)}
              >
                {["New", "Active", "Done", "Parked"].map((status) => (
                  <option value={status} key={status}>
                    {statusLabel(language, status)}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {editing ? (
            <div className="fopsGoalEditForm">
              <label>
                <span>{opsText(language, "goalEditTitle")}</span>
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <label>
                <span>{opsText(language, "goalEditMeasure")}</span>
                <input value={draft.measure} onChange={(event) => setDraft({ ...draft, measure: event.target.value })} />
              </label>
              <div className="fopsGoalEditRow">
                <label>
                  <span>{opsText(language, "goalEditPriority")}</span>
                  <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
                    <option value="">—</option>
                    {["高 High", "中 Medium", "低 Low"].map((option) => (
                      <option value={option} key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{opsText(language, "goalEditDue")}</span>
                  <input type="date" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} />
                </label>
              </div>
              <label>
                <span>{opsText(language, "goalEditNotes")}</span>
                <textarea rows={2} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
              </label>
              <div className="fopsGoalEditActions">
                <button type="button" className="fopsButton fopsButton--compact fopsButton--ghost" onClick={() => setEditing(false)}>
                  {opsText(language, "cancel")}
                </button>
                <button type="button" className="fopsButton fopsButton--compact" onClick={saveEdit}>
                  {opsText(language, "goalEditSave")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {goal.measure ? (
                <TranslatableText text={goal.measure} language={language} />
              ) : null}
              {goal.notes ? (
                <div className="fopsGoalNotes">
                  <TranslatableText text={goal.notes} language={language} />
                </div>
              ) : null}
            </>
          )}
          {thread.length ? (
            <div className="fopsGoalThread">
              {thread.map((entry, index) => (
                <div className="fopsGoalThreadEntry" key={index}>
                  <small>{entry.meta}</small>
                  <ThreadBody body={entry.body} language={language} />
                </div>
              ))}
            </div>
          ) : null}
          {onRespond ? (
            <>
              <div className="fopsGoalRespond">
                <textarea
                  rows={1}
                  value={text}
                  placeholder={opsText(language, "goalRespondPlaceholder")}
                  onChange={(event) => setText(event.target.value)}
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
                      if (file) void upload(file);
                      event.target.value = "";
                    }}
                    disabled={uploading}
                  />
                </label>
                <button
                  type="button"
                  className="fopsButton fopsButton--compact"
                  disabled={(!text.trim() && !files.length) || uploading}
                  onClick={() => {
                    onRespond(goal, text.trim(), files);
                    setText("");
                    setFiles([]);
                  }}
                >
                  <Send size={14} />
                  {opsText(language, "goalRespondSend")}
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
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function CompanyOpsHome({
  user,
  dashboard,
  language,
  onQuickAction,
  onNavigate,
  onOpenItem,
  onAcknowledgeCompensation,
  onDisputeCompensation,
  onRespondGoal,
  onUpdateGoalStatus,
  onEditGoal,
  onDeleteGoal,
  compensationBusy,
  csrfToken,
}: {
  user: CompanyOpsUser;
  dashboard: CompanyOpsDashboard;
  language: CompanyOpsLanguage;
  onQuickAction: (action: QuickActionKey) => void;
  onNavigate: (page: CompanyOpsPage) => void;
  onOpenItem: (item: OpsQueueItem) => void;
  onAcknowledgeCompensation: () => void;
  onDisputeCompensation: () => void;
  onRespondGoal?: (goal: OpsGoalItem, response: string, attachments?: string[]) => void;
  onUpdateGoalStatus?: (goal: OpsGoalItem, status: string) => void;
  onEditGoal?: (goal: OpsGoalItem, patch: Record<string, string>) => void;
  onDeleteGoal?: (goal: OpsGoalItem) => void;
  compensationBusy: boolean;
  csrfToken?: string;
}) {
  const [openGoalId, setOpenGoalId] = useState("");
  const configured = dashboard.quickActions?.filter(
    (action) => action.enabled !== false,
  );
  const actions = configured?.length
    ? configured.map((action) => action.key)
    : defaultQuickActions(user);
  const focus = dashboard.focus;

  return (
    <div className="fopsPage fopsHomePage">
      <header className="fopsPageHeader">
        <div>
          <span className="fopsEyebrow">{roleLabel(language, user.role)}</span>
          <h1>{opsText(language, "welcome", { name: user.name })}</h1>
          <p>{opsText(language, "welcomeSub")}</p>
        </div>
        {dashboard.generatedAt ? (
          <span className="fopsUpdatedAt">
            {opsText(language, "generatedAt", {
              time: formatOpsDate(dashboard.generatedAt, language, {
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
          </span>
        ) : null}
      </header>

      <section className="fopsFocus" aria-labelledby="fops-focus-title">
        <div className="fopsFocusGlow" aria-hidden="true" />
        <span className="fopsFocusEyebrow" id="fops-focus-title">
          {opsText(language, "todayFocus")}
        </span>
        {focus ? (
          <div className="fopsFocusBody">
            <div>
              <div className="fopsFocusPills">
                {focus.urgency ? (
                  <TonePill
                    tone={focus.urgency === "overdue" ? "danger" : "warning"}
                  >
                    {focus.urgency === "overdue"
                      ? opsText(language, "overdue")
                      : focus.urgency === "today"
                        ? opsText(language, "dueToday")
                        : opsText(language, "dueSoon")}
                  </TonePill>
                ) : null}
                {focus.status ? (
                  <TonePill tone={focus.tone}>{statusLabel(language, focus.status)}</TonePill>
                ) : null}
              </div>
              <h2>{focus.title}</h2>
              <TranslatableText text={focus.description} language={language} />
              <div className="fopsFocusMeta">
                {focus.dueAt ? (
                  <span>
                    <CalendarClock size={15} />
                    {formatOpsDate(focus.dueAt, language, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ) : null}
                {focus.ownerName ? <span>{focus.ownerName}</span> : null}
              </div>
            </div>
            {focus.href ? (
              <a className="fopsFocusAction" href={focus.href}>
                {focus.actionLabel || opsText(language, "openItem")}
                <ArrowRight size={18} />
              </a>
            ) : (
              <button
                type="button"
                className="fopsFocusAction"
                onClick={() => onOpenItem(focus)}
              >
                {focus.actionLabel || opsText(language, "openItem")}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        ) : (
          <div className="fopsFocusBody">
            <div>
              <h2>{opsText(language, "quietFocusTitle")}</h2>
              <p>{opsText(language, "quietFocusBody")}</p>
            </div>
          </div>
        )}
      </section>

      <MetricGrid metrics={dashboard.metrics || []} />

      {dashboard.myCompensation ? (
        <section className="fopsMyPay" aria-labelledby="fops-my-pay-title">
          <header>
            <span className="fopsMyPayIcon" aria-hidden="true">
              <Banknote size={20} />
            </span>
            <div>
              <h2 id="fops-my-pay-title">{opsText(language, "myPay")}</h2>
              <p>{opsText(language, "privatePayHint")}</p>
            </div>
            <TonePill tone="success">{dashboard.myCompensation.payPeriod}</TonePill>
          </header>
          <div className="fopsMyPayGrid">
            <div>
              <span>{opsText(language, "payrollStatus")}</span>
              <strong>{statusLabel(language, dashboard.myCompensation.payrollStatus) || "—"}</strong>
            </div>
            {dashboard.myCompensation.baseSalary ? (
              <div>
                <span>{opsText(language, "payBase")}</span>
                <strong>{dashboard.myCompensation.baseSalary}</strong>
              </div>
            ) : null}
            {dashboard.myCompensation.performanceBonus ? (
              <div>
                <span>{opsText(language, "payPerformanceBonus")}</span>
                <strong>{dashboard.myCompensation.performanceBonus}</strong>
              </div>
            ) : null}
            {dashboard.myCompensation.reimbursements ? (
              <div>
                <span>{opsText(language, "payReimbursements")}</span>
                <strong>{dashboard.myCompensation.reimbursements}</strong>
              </div>
            ) : null}
            {dashboard.myCompensation.deductions ? (
              <div>
                <span>{opsText(language, "payDeductions")}</span>
                <strong>{dashboard.myCompensation.deductions}</strong>
              </div>
            ) : null}
            {dashboard.myCompensation.netPay ? (
              <div>
                <span>{opsText(language, "payNet")}</span>
                <strong>{dashboard.myCompensation.netPay}</strong>
              </div>
            ) : null}
            <div>
              <span>{opsText(language, "commissionAmount")}</span>
              <strong>{dashboard.myCompensation.commissionAmount || "—"}</strong>
            </div>
            <div>
              <span>{opsText(language, "commissionStatus")}</span>
              <strong>{statusLabel(language, dashboard.myCompensation.commissionStatus) || "—"}</strong>
            </div>
            <div>
              <span>{opsText(language, "disputeDeadline")}</span>
              <strong>
                {formatOpsDate(
                  dashboard.myCompensation.disputeDeadline,
                  language,
                ) || "—"}
              </strong>
            </div>
          </div>
          {dashboard.myCompensation.locked ||
          dashboard.myCompensation.actionsAvailable === false ? (
            <p className="fopsMyPayLocked">{opsText(language, "payLocked")}</p>
          ) : (
            <footer>
              {dashboard.myCompensation.acknowledged ? (
                <TonePill tone="success">
                  {opsText(language, "payAcknowledged")}
                </TonePill>
              ) : (
                <button
                  type="button"
                  className="fopsButton fopsButton--primary"
                  onClick={onAcknowledgeCompensation}
                  disabled={compensationBusy}
                >
                  {compensationBusy
                    ? opsText(language, "saving")
                    : opsText(language, "acknowledgePay")}
                </button>
              )}
              <button
                type="button"
                className="fopsButton fopsButton--ghost"
                onClick={onDisputeCompensation}
                disabled={compensationBusy}
              >
                {opsText(language, "disputePay")}
              </button>
            </footer>
          )}
        </section>
      ) : null}

      {user.role === "founder" && dashboard.keyDates?.length ? (
        <section className="fopsSection fopsKeyDates">
          <SectionHeading
            title={opsText(language, "keyDatesTitle")}
            hint={opsText(language, "keyDatesHint")}
          />
          <div className="fopsKeyDateList">
            {dashboard.keyDates
              .filter((entry) => {
                if (!entry.date) return true;
                const days = Math.round(
                  (Date.parse(entry.date) - Date.now()) / 86_400_000,
                );
                return days <= (entry.warnDays ?? 30) + 30;
              })
              .slice(0, 6)
              .map((entry) => {
                const days = entry.date
                  ? Math.round((Date.parse(entry.date) - Date.now()) / 86_400_000)
                  : undefined;
                const urgent = days != null && days <= (entry.warnDays ?? 30);
                return (
                  <article
                    className={`fopsKeyDateRow${urgent ? " is-urgent" : ""}`}
                    key={entry.id}
                  >
                    <CalendarClock size={15} aria-hidden="true" />
                    <strong>{entry.item}</strong>
                    {entry.category ? <span>{entry.category}</span> : null}
                    {entry.date ? (
                      <TonePill
                        tone={
                          days != null && days < 0
                            ? "danger"
                            : urgent
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {formatOpsDate(entry.date, language)}
                        {days != null ? ` · ${days}d` : ""}
                      </TonePill>
                    ) : null}
                  </article>
                );
              })}
          </div>
        </section>
      ) : null}

      {dashboard.goals?.length || user.role === "founder" ? (
        <section className="fopsSection fopsGoals">
          <SectionHeading
            title={opsText(language, "goalsTitle")}
            hint={opsText(language, "goalsHint")}
            action={
              user.role === "founder" ? (
                <button
                  type="button"
                  className="fopsButton fopsButton--compact"
                  onClick={() => onQuickAction("goal")}
                >
                  <Plus size={15} />
                  {opsText(language, "goalAction")}
                </button>
              ) : undefined
            }
          />
          {dashboard.goals?.length ? (
            <div className="fopsGoalList">
              {dashboard.goals.map((goal) => (
                <GoalRow
                  goal={goal}
                  language={language}
                  isFounder={user.role === "founder"}
                  open={openGoalId === goal.id}
                  onToggle={() =>
                    setOpenGoalId((current) => (current === goal.id ? "" : goal.id))
                  }
                  onRespond={onRespondGoal}
                  onUpdateStatus={onUpdateGoalStatus}
                  onEdit={onEditGoal}
                  onDelete={onDeleteGoal}
                  csrfToken={csrfToken}
                  key={goal.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={opsText(language, "noGoalsTitle")}
              body={opsText(language, "noGoalsBody")}
            />
          )}
        </section>
      ) : null}

      {dashboard.myExpenses?.length ? (
        <section className="fopsSection fopsMyExpenses">
          <SectionHeading
            title={opsText(language, "myExpensesTitle")}
            hint={opsText(language, "myExpensesHint")}
          />
          <div className="fopsMyExpenseList">
            {dashboard.myExpenses.slice(0, 5).map((expense) => (
              <article className="fopsMyExpenseRow" key={expense.id}>
                <span className="fopsMyExpenseIcon" aria-hidden="true">
                  <Receipt size={16} />
                </span>
                <strong>{expense.title}</strong>
                {expense.amount ? <span>{expense.amount}</span> : null}
                {expense.status ? (
                  <TonePill
                    tone={
                      /approved|reimbursed/i.test(expense.status)
                        ? "success"
                        : /rejected/i.test(expense.status)
                          ? "danger"
                          : "warning"
                    }
                  >
                    {statusLabel(language, expense.status)}
                  </TonePill>
                ) : null}
                {expense.submittedAt ? (
                  <small>{formatOpsDate(expense.submittedAt, language)}</small>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fopsSection">
        <SectionHeading
          title={opsText(language, "quickActions")}
          hint={opsText(language, "quickActionsHint")}
        />
        <div className="fopsQuickGrid">
          {actions.map((action) => {
            const Icon = quickActionIcons[action];
            // A key this build doesn't know (newer server, older chunk) must
            // degrade to a missing tile, never crash the whole app.
            if (!Icon) return null;
            const config = configured?.find((item) => item.key === action);
            if (config?.href) {
              return (
                <a className="fopsQuickAction" href={config.href} key={action}>
                  <span className="fopsQuickIcon">
                    <Icon size={20} />
                  </span>
                  <strong>{quickActionLabel(language, action)}</strong>
                  <ArrowRight size={17} />
                </a>
              );
            }
            return (
              <button
                className="fopsQuickAction"
                type="button"
                key={action}
                onClick={() => onQuickAction(action)}
              >
                <span className="fopsQuickIcon">
                  <Icon size={20} />
                </span>
                <strong>{quickActionLabel(language, action)}</strong>
                <ArrowRight size={17} />
              </button>
            );
          })}
        </div>
      </section>

      <div className="fopsHomeColumns">
        <section className="fopsSection fopsWorkSection">
          <SectionHeading
            title={opsText(language, "myWork")}
            hint={opsText(language, "myWorkHint")}
          />
          <div className="fopsQueueList">
            {dashboard.myWork?.length ? (
              dashboard.myWork.slice(0, 8).map((item) => (
                <QueueCard
                  item={item}
                  language={language}
                  onOpen={onOpenItem}
                  key={item.id}
                />
              ))
            ) : (
              <EmptyState
                title={opsText(language, "noWorkTitle")}
                body={opsText(language, "noWorkBody")}
              />
            )}
          </div>
        </section>

        <aside className="fopsSideStack">
          {dashboard.weekRhythm ? (
            <section className="fopsRhythmCard">
              <span className="fopsEyebrow">
                {opsText(language, "weeklyRhythm")}
              </span>
              <h2>{dashboard.weekRhythm.phase}</h2>
              <p>{dashboard.weekRhythm.guidance}</p>
              {dashboard.weekRhythm.checklist?.length ? (
                <div className="fopsRhythmChecklist">
                  <strong>{opsText(language, "weekChecklist")}</strong>
                  {dashboard.weekRhythm.checklist.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="fopsResourceCard">
            <SectionHeading title={opsText(language, "companyResources")} />
            <div className="fopsResourceList">
              {dashboard.links?.startHere ? (
                <ResourceLink
                  href={dashboard.links.startHere}
                  title={opsText(language, "policiesAndGuides")}
                  description={opsText(language, "policiesHint")}
                />
              ) : (
                <button
                  className="fopsResourceButton"
                  type="button"
                  onClick={() => onNavigate("resources")}
                >
                  <span className="fopsResourceIcon">
                    <BookOpenCheck size={18} />
                  </span>
                  <span>
                    <strong>{opsText(language, "policiesAndGuides")}</strong>
                    <small>{opsText(language, "policiesHint")}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              )}
              {dashboard.links?.advancedGrowth && user.role === "founder" ? (
                <ResourceLink
                  href={dashboard.links.advancedGrowth}
                  title={opsText(language, "advancedRecords")}
                  description={opsText(language, "advancedRecordsHint")}
                  restricted
                />
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
