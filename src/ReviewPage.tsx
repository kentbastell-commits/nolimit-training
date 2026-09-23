// Coach review workspace — the "needs-a-decision" inbox. Restyle only: all
// state/handlers arrive as props (threaded from App.tsx). Layout: header +
// dark KPI hero + 6-card summary grid + stacked collapsible sections + a
// right slide-over for a check-in's full detail. The only local state is the
// presentational check-in slide-over selection; every business handler
// (drafts, replies, mark-reviewed, open-client/order/workout/submission) is a
// prop and stays wired.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import PortalToApp from "./PortalToApp";
import { useTranslation } from "react-i18next";
import { CheckSquare, ChevronDown, X } from "lucide-react";
import "./ReviewPage.css";
import { normalizeDate, toMediaCdnUrl } from "./appCore";
import CountUp from "./CountUp";
import ReviewPager, { reviewPageNumber, REVIEW_PAGE_SIZE } from "./ReviewPager";

export default function ReviewPage({
  embeddedSection = "",
  refreshReviewQueue,
  updateProductOrder,
  coachReviewLoading,
  reviewFlashColumn,
  checkInReplyDrafts,
  checkInReplySaving,
  clientLabel,
  // Defaults guard the loose prop-bag idiom: a call site that misses one of
  // these still compiles (props are `[key: string]: any`), so without a
  // default the first render would throw, not the build.
  clientMessages = [],
  messageReplyDrafts = {},
  setMessageReplyDrafts = () => {},
  messageReplySaving = "",
  respondToClientMessage = () => {},
  coachReviewCheckIns,
  coachReviewError,
  focusReviewColumn,
  formVideoReplies,
  getOrderPipelineStatus,
  globalMissedWorkouts,
  globalReviewOrders,
  globalReviewSubmissionItems,
  globalUnreviewedWorkoutComments,
  markGlobalWorkoutCommentReviewed,
  newEnquiries,
  openOrderReview,
  openReviewClient,
  openReviewSections,
  openReviewWorkout,
  respondToCheckIn,
  reviewFormVideo,
  reviewFormVideos,
  reviewingWorkoutCommentKey,
  setActivePage,
  setCheckInReplyDrafts,
  setFormVideoReplies,
  setSelectedContentSubmission,
  toggleReviewSection,
}: { [key: string]: any }) {
  const { t } = useTranslation();
  // Presentational only: which check-in is expanded in the slide-over.
  const [selectedCheckIn, setSelectedCheckIn] = useState<any>(null);
  const checkInPanel = useRef<HTMLElement>(null);
  const [pages, setPages] = useState<Record<string, number>>({});
  // Order card whose Done/Archive write is in flight (Review page).
  const [savingOrderKey, setSavingOrderKey] = useState("");
  const [submissionQuery, setSubmissionQuery] = useState("");
  const [submissionFilter, setSubmissionFilter] = useState(embeddedSection ? "all" : "pending");
  const pageRows = (key: string, rows: any[]) => {
    const page = reviewPageNumber(pages[key] || 0, rows.length);
    return rows.slice(page * REVIEW_PAGE_SIZE, (page + 1) * REVIEW_PAGE_SIZE);
  };
  const pager = (key: string, label: string, rows: any[]) => <ReviewPager label={label} total={rows.length} page={pages[key] || 0}
    onPage={page => setPages(previous => ({ ...previous, [key]: page }))} />;
  const pendingSubmissions = globalReviewSubmissionItems.filter((g: any) => !g.answers?.[0]?.reviewedAt);
  const filteredSubmissions = globalReviewSubmissionItems.filter((group: any) => {
    const reviewed = Boolean(group.answers?.[0]?.reviewedAt);
    if (submissionFilter === "pending" && reviewed || submissionFilter === "reviewed" && !reviewed) return false;
    const first = group.answers?.[0];
    return `${group.title} ${clientLabel(first?.clientName || first?.clientId)}`.toLowerCase().includes(submissionQuery.toLowerCase().trim());
  });

  // Auto-close the slide-over once its check-in leaves the queue (resolved via
  // respondToCheckIn) so we never show a stale panel.
  useEffect(() => {
    if (
      selectedCheckIn &&
      !coachReviewCheckIns.some(
        (c: any) => c.recordId === selectedCheckIn.recordId
      )
    ) {
      setSelectedCheckIn(null);
    }
  }, [coachReviewCheckIns, selectedCheckIn]);

  useEffect(() => {
    if (!selectedCheckIn) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    checkInPanel.current?.focus({ preventScroll: true });
    const closeCheckIn = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedCheckIn(null);
      if (event.key === "Tab") {
        const nodes = Array.from(checkInPanel.current?.querySelectorAll<HTMLElement>("*") || [])
          .filter(node => node.matches('button, textarea, [tabindex="0"]') && !node.matches(":disabled"));
        const first = nodes[0], last = nodes.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === checkInPanel.current)) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    window.addEventListener("keydown", closeCheckIn);
    return () => {
      window.removeEventListener("keydown", closeCheckIn);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [selectedCheckIn]);

  const unreviewedFormVideos = reviewFormVideos.filter(
    (v: any) => embeddedSection || v.status !== "Reviewed"
  );

  const commentsCount =
    globalUnreviewedWorkoutComments.length + globalReviewOrders.length;
  const total =
    globalUnreviewedWorkoutComments.length +
    pendingSubmissions.length +
    globalMissedWorkouts.length +
    globalReviewOrders.length +
    coachReviewCheckIns.length +
    newEnquiries.length +
    clientMessages.length;

  const checkInChips = (c: any) => {
    const mk = (label: string, v: any) =>
      v && String(v).trim() ? { label, value: String(v).trim() } : null;
    return [
      mk("Energy", c.energy),
      mk("Sleep", c.sleepQuality),
      mk("Soreness", c.soreness),
      mk("Mood", c.mood),
      mk("Stress", c.stress),
      mk("Readiness", c.readinessScore),
      c.bodyWeight
        ? { label: "BW", value: String(c.bodyWeight).trim() }
        : null,
    ].filter(Boolean) as { label: string; value: string }[];
  };
  const checkInNotesLine = (c: any) =>
    [
      c.trainingNotes,
      c.wins && `Wins: ${c.wins}`,
      c.problemsPain && `Pain: ${c.problemsPain}`,
      c.clientNotes,
      c.nutritionNotes && `Nutrition: ${c.nutritionNotes}`,
    ]
      .filter(Boolean)
      .join(" · ");
  const checkInNoteBlocks = (c: any) =>
    [
      c.trainingNotes && { label: "Training notes", text: c.trainingNotesEn || c.trainingNotes },
      c.wins && { label: "Wins", text: c.winsEn || c.wins },
      c.problemsPain && { label: "Problems / pain", text: c.problemsPainEn || c.problemsPain },
      c.clientNotes && { label: "Client notes", text: c.clientNotesEn || c.clientNotes },
      c.nutritionNotes && { label: "Nutrition", text: c.nutritionNotesEn || c.nutritionNotes },
    ].filter(Boolean) as { label: string; text: string }[];

  const summaryCards = [
    {
      label: "Workout comments",
      count: globalUnreviewedWorkoutComments.length,
      target: "reviewColComments",
      accent: "#758eae", // Steel Blue
    },
    {
      label: "Submissions",
      count: pendingSubmissions.length,
      target: "reviewColSubmissions",
      accent: "#5e8a86", // Dusty Teal
    },
    {
      label: "Missed tasks",
      count: globalMissedWorkouts.length,
      target: "reviewColMissed",
      accent: "#d8412f", // Vermilion
    },
    {
      label: "Order reviews",
      count: globalReviewOrders.length,
      target: "reviewColComments",
      accent: "#c99a4e", // Ochre
    },
    {
      label: "Check-ins",
      count: coachReviewCheckIns.length,
      target: "reviewColCheckins",
      accent: "#b3a6d4", // Wisteria
    },
    {
      label: t("trainingEnquiries"),
      count: newEnquiries.length,
      target: "reviewColEnquiries",
      accent: "#b5654a", // Clay
    },
    {
      label: "Messages",
      count: clientMessages.length,
      target: "reviewColMessages",
      accent: "#d4af37", // Brand gold — the athlete's own voice
    },
  ];

  const sectionHeader = (
    eyebrow: string,
    title: string,
    count: number,
    key: string
  ) => embeddedSection ? null : (
    <button
      type="button"
      className="rvSecHead"
      aria-expanded={!!openReviewSections[key]}
      onClick={() => toggleReviewSection(key)}
    >
      <div>
        <span className="rvSecEyebrow">{eyebrow}</span>
        <strong className="rvSecTitle">{title}</strong>
      </div>
      <div className="rvSecHeadRight">
        <em className="rvPill">{count}</em>
        <ChevronDown
          size={18}
          className={`rvChev ${openReviewSections[key] ? "open" : ""}`}
        />
      </div>
    </button>
  );

  return (
    <section className={`rvPage ${embeddedSection ? "rvEmbedded" : ""}`}>
      {!embeddedSection && <>
      {/* header */}
      <header className="rvHeader">
        <span className="rvEyebrow">
          <CheckSquare size={14} />{t("polishReviewe29a")} </span>
        <div className="rvTitleRow">
          <h1 className="rvTitle">{t("polishReviewe29a")}</h1>
          <button
            type="button"
            className="rvRefresh"
            onClick={refreshReviewQueue}
            disabled={coachReviewLoading}
          >
            {coachReviewLoading ? "Refreshing…" : "Refresh queue"}
          </button>
        </div>
        <p className="rvIntro">{t("polishClientCommentsFormTestSubmissionsMissedTasksAndOrderFollowUpsThat49cd")} </p>
      </header>

      {coachReviewError && <div className="rvError">{coachReviewError}</div>}

      {/* dark KPI hero */}
      <div className="rvHero">
        <div className="rvHeroGlow" aria-hidden="true" />
        <span className="rvHeroEyebrow">{t("polishNeedsADecision83ce")}</span>
        <div className="rvHeroRow">
          <span className="rvHeroNum">
            <CountUp value={total} />
          </span>
          <span className="rvHeroSub">{t("polishOpenItemsAcross7QueuesWaitingOnYou9df6")} </span>
        </div>
      </div>

      {/* summary grid */}
      <div className="rvSummaryGrid">
        {summaryCards.map((card) => (
          <button
            type="button"
            key={card.label}
            className="rvSummaryCard"
            onClick={() => focusReviewColumn(card.target)}
          >
            <span
              className="rvSummaryBar"
              style={{ background: card.accent }}
              aria-hidden="true"
            />
            <span className="rvSummaryLabel">{card.label}</span>
            <strong className="rvSummaryCount">
              <CountUp value={card.count} />
            </strong>
          </button>
        ))}
      </div>

      </>}
      {/* board */}
      <div className="rvBoard">
        {/* Direct athlete messages — the 写给教练 loop. First on the board:
            an athlete who typed a message with no workout to hang it on is
            usually confused or blocked, the costliest state to leave waiting. */}
        <article
          id="reviewColMessages"
          hidden={!!embeddedSection && embeddedSection !== "messages"}
          className={`rvSection ${
            reviewFlashColumn === "reviewColMessages" ? "rvFlash" : ""
          }`}
        >
          {sectionHeader(
            "Direct from athletes",
            "Messages",
            clientMessages.length,
            "messages"
          )}
          {openReviewSections.messages && (
            <div className="rvGrid">
              {clientMessages.length === 0 && (
                <p className="rvEmpty">{t("polishNoUnansweredMessagesb36c")}</p>
              )}
              {clientMessages.map((msg: any) => (
                <div key={msg.messageId} className="rvCard">
                  <div className="rvCardHead">
                    <strong>{msg.clientName || clientLabel(msg.clientId) || msg.clientId}</strong>
                    <small>
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleString()
                        : "—"}
                    </small>
                  </div>
                  <p className="rvNote">{msg.bodyEn || msg.body}</p>
                  <textarea
                    className="rvReply"
                    placeholder={t("dailyWriteReply")}
                    value={messageReplyDrafts[msg.messageId] || ""}
                    onChange={(e) =>
                      setMessageReplyDrafts((cur: any) => ({
                        ...cur,
                        [msg.messageId]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="rvGoldBtn"
                    disabled={messageReplySaving === msg.messageId}
                    onClick={() => void respondToClientMessage(msg)}
                  >
                    {messageReplySaving === msg.messageId
                      ? t("dailySending")
                      : t("dailySendReply")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* In-Person Enquiries */}
        <article
          id="reviewColEnquiries"
          hidden={!!embeddedSection && embeddedSection !== "enquiries"}
          className={`rvSection ${
            reviewFlashColumn === "reviewColEnquiries" ? "rvFlash" : ""
          }`}
        >
          {sectionHeader(
            "Needs follow-up",
            t("trainingEnquiries"),
            newEnquiries.length,
            "enquiries"
          )}
          {openReviewSections.enquiries && (
            <div className="rvGrid">
              {newEnquiries.length === 0 && (
                <p className="rvEmpty">{t("trainingEnquiriesEmpty")}</p>
              )}
              {newEnquiries.map((enq: any) => {
                const chips = [
                  enq.contactPerson,
                  enq.contact,
                  enq.athletes && `${enq.athletes} athletes`,
                  enq.duration,
                ].filter(Boolean);
                return (
                  <div key={enq.recordId} className="rvCard">
                    <div className="rvCardHead">
                      <strong>
                        {enq.organization || enq.contactPerson || "Enquiry"}
                      </strong>
                      <small>{enq.submittedDate || "—"}</small>
                    </div>
                    {chips.length > 0 && (
                      <div className="rvChips">
                        {chips.map((chip: any, i: number) => (
                          <span key={i} className="rvChip">
                            {chip}
                          </span>
                        ))}
                      </div>
                    )}
                    {enq.notes && <p className="rvNote">{enq.notesEn || enq.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {/* Form Videos — collapsible like the rest; shown only when there are
            unreviewed clips (no summary card / KPI target points at it). */}
        {unreviewedFormVideos.length > 0 && (
          <article className="rvSection" hidden={!!embeddedSection && embeddedSection !== "formVideos"}>
            {sectionHeader(
              "Needs review",
              "Form Videos",
              unreviewedFormVideos.length,
              "formVideos"
            )}
            {openReviewSections.formVideos && (
              <div className="rvGrid rvGridWide">
                {unreviewedFormVideos.map((video: any) => (
                <div key={video.recordId} className="rvVideoCard">
                  <div className="rvVideoMeta">
                    <strong>{video.clientName || video.clientId}</strong>
                    <span>
                      {video.exerciseName}
                      {video.workoutName ? ` · ${video.workoutName}` : ""}
                    </span>
                  </div>
                  {video.videoUrl && (
                    <video
                      className="rvVideo"
                      src={toMediaCdnUrl(video.videoUrl)}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  )}
                  {video.clientNote && (
                    <p className="rvNote">{video.clientNoteEn || video.clientNote}</p>
                  )}
                  <textarea
                    className="rvReply"
                    placeholder={t("polishReplyToYourAthlete7e23")}
                    value={formVideoReplies[video.recordId] || ""}
                    onChange={(e) =>
                      setFormVideoReplies((cur: any) => ({
                        ...cur,
                        [video.recordId]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="rvGoldBtn"
                    onClick={() => void reviewFormVideo(video.recordId)}
                  >{t("polishSendReplyMarkReviewed51d8")} </button>
                </div>
                ))}
              </div>
            )}
          </article>
        )}

        {/* Daily Check-ins */}
        <article
          id="reviewColCheckins"
          hidden={!!embeddedSection && embeddedSection !== "checkins"}
          className={`rvSection ${
            reviewFlashColumn === "reviewColCheckins" ? "rvFlash" : ""
          }`}
        >
          {sectionHeader(
            "Needs review",
            "Daily Check-ins",
            coachReviewCheckIns.length,
            "checkins"
          )}
          {openReviewSections.checkins && (
            <div className="rvGrid rvGridWide">
              {coachReviewCheckIns.length === 0 && (
                <p className="rvEmpty">{t("polishNoCheckInsWaitingForAReply7351")}</p>
              )}
              {coachReviewCheckIns.map((checkIn: any) => {
                const chips = checkInChips(checkIn);
                const notes = checkInNotesLine(checkIn);
                return (
                  <div key={checkIn.recordId} className="rvCard rvCardCheckin">
                    <div
                      className="rvCardTap"
                      role="button"
                      tabIndex={0}
                      aria-label={`Review check-in from ${clientLabel(
                        checkIn.clientName || checkIn.clientId
                      )}`}
                      onClick={() => setSelectedCheckIn(checkIn)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedCheckIn(checkIn);
                        }
                      }}
                    >
                      <div className="rvCardHead">
                        <strong>
                          {clientLabel(checkIn.clientName || checkIn.clientId)}
                        </strong>
                        <small>{checkIn.submittedDate || "—"}</small>
                      </div>
                      {chips.length > 0 && (
                        <div className="rvChips">
                          {chips.map((s, i) => (
                            <span key={i} className="rvChip">
                              <span className="rvChipK">{s.label}</span>
                              <span className="rvChipV">{s.value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {notes && <p className="rvNote rvNoteClamp">{notes}</p>}
                      <span className="rvCardOpenHint" aria-hidden="true">{t("polishReviewReply05e1")} </span>
                    </div>
                    <textarea
                      className="rvReply"
                      placeholder={t("dailyWriteReply")}
                      value={checkInReplyDrafts[checkIn.recordId] || ""}
                      onChange={(e) =>
                        setCheckInReplyDrafts((cur: any) => ({
                          ...cur,
                          [checkIn.recordId]: e.target.value,
                        }))
                      }
                    />
                    <div className="rvReplyActions">
                      <button
                        type="button"
                        className="rvGoldBtn"
                        disabled={checkInReplySaving === checkIn.recordId}
                        onClick={() => void respondToCheckIn(checkIn)}
                      >
                        {checkInReplySaving === checkIn.recordId
                          ? t("dailySending")
                          : t("dailySendReply")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {/* Comments & Orders */}
        <article
          id="reviewColComments"
          hidden={!!embeddedSection && embeddedSection !== "comments"}
          className={`rvSection ${
            reviewFlashColumn === "reviewColComments" ? "rvFlash" : ""
          }`}
        >
          {sectionHeader(
            "Needs review",
            "Comments & Orders",
            commentsCount,
            "comments"
          )}
          {openReviewSections.comments && (
            <div className="rvGrid">
              {pageRows("orders", globalReviewOrders).map((order: any) => {
                const orderKey = String(order.recordId || order.orderId);
                const saving = savingOrderKey === orderKey;
                // "Done" = the program is loaded (leaves the queue, stays a
                // normal order); "Archive" = put away without fulfilling
                // (test orders, duplicates, abandoned carts). Both are
                // reversible from the Orders page.
                const settle = async (fulfillmentStatus: string) => {
                  if (saving || !updateProductOrder) return;
                  setSavingOrderKey(orderKey);
                  try {
                    await updateProductOrder(order, { fulfillmentStatus });
                  } finally {
                    setSavingOrderKey("");
                  }
                };
                return (
                  <div
                    key={`order-${orderKey}`}
                    className="rvItem rvItemUrgent rvOrderItem"
                  >
                    <span className="rvItemKicker">
                      {getOrderPipelineStatus(order)}
                    </span>
                    <strong>{order.clientName || "New client"}</strong>
                    <small>
                      {order.productName || order.productType || "Order"}
                    </small>
                    <div className="rvItemActions">
                      <button
                        type="button"
                        className="rvDarkBtn"
                        onClick={() => {
                          setActivePage("Orders");
                          void openOrderReview(order);
                        }}
                      >{t("polishOpencf9b")} </button>
                      <button
                        type="button"
                        className="rvGhostBtn"
                        disabled={saving}
                        onClick={() => void settle("Program Loaded")}
                      >
                        {saving ? "Saving…" : "Mark done"}
                      </button>
                      <button
                        type="button"
                        className="rvGhostBtn"
                        disabled={saving}
                        onClick={() => void settle("Archived")}
                      >{t("polishArchive2621")} </button>
                    </div>
                  </div>
                );
              })}

              {pageRows("comments", globalUnreviewedWorkoutComments).map((comment: any) => (
                <div key={comment.key} className="rvItem rvCommentItem">
                  <span className="rvItemKicker">{t("polishWorkoutCommentc988")}</span>
                  <strong>
                    {clientLabel(comment.clientName || comment.clientId)}
                  </strong>
                  <small>{comment.workoutName || "Workout"}</small>
                  <span className="rvCommentNote">
                    {comment.noteEn || comment.note}
                  </span>
                  <div className="rvItemActions">
                    <button
                      type="button"
                      className="rvGhostBtn"
                      onClick={() =>
                        openReviewClient(comment.clientId, comment.clientName)
                      }
                    >{t("polishOpenClient9da0")} </button>
                    <button
                      type="button"
                      className="rvDarkBtn"
                      disabled={reviewingWorkoutCommentKey === comment.key}
                      onClick={() =>
                        void markGlobalWorkoutCommentReviewed(comment)
                      }
                    >
                      {reviewingWorkoutCommentKey === comment.key
                        ? "Saving…"
                        : "Mark Reviewed"}
                    </button>
                  </div>
                </div>
              ))}

              {pager("orders", "Orders", globalReviewOrders)}
              {pager("comments", "Workout comments", globalUnreviewedWorkoutComments)}
              {commentsCount === 0 && (
                <p className="rvEmpty">{t("polishNoCommentsOrOrderReviewsWaitingb922")}</p>
              )}
            </div>
          )}
        </article>

        {/* Missed Tasks */}
        <article
          id="reviewColMissed"
          hidden={!!embeddedSection && embeddedSection !== "missed"}
          className={`rvSection ${
            reviewFlashColumn === "reviewColMissed" ? "rvFlash" : ""
          }`}
        >
          {sectionHeader(
            "Training",
            "Missed Tasks",
            globalMissedWorkouts.length,
            "missed"
          )}
          {openReviewSections.missed && (
            <div className="rvGrid">
              {(() => {
                // One collapsible group per client — a 16-card wall repeating
                // the same three names buries the rest of the queue.
                const groups = new Map<string, any[]>();
                pageRows("missed", globalMissedWorkouts).forEach((w: any) => {
                  const label = clientLabel(w.clientId) || "Unknown client";
                  if (!groups.has(label)) groups.set(label, []);
                  groups.get(label)!.push(w);
                });
                return Array.from(groups.entries())
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([label, items]) => (
                    <details
                      className="rvMissGroup"
                      key={label}
                      open={globalMissedWorkouts.length <= 6}
                    >
                      <summary className="rvMissSummary">
                        <strong>{label}</strong>
                        <span>{items.length}{t("polishOnThisPagee1fc")}</span>
                      </summary>
                      <div className="rvMissList">
                        {items.map((workout: any) => (
                          <button
                            type="button"
                            key={`missed-${workout.assignedWorkoutId || workout.id}`}
                            className="rvItem rvItemMissed"
                            onClick={() => openReviewWorkout(workout)}
                          >
                            <span className="rvItemKicker">{t("polishMissedWorkout3195")}</span>
                            <strong>{workout.sessionName || "Workout"}</strong>
                            <small>
                              {normalizeDate(String(workout.scheduledDate)) ||
                                "—"}
                            </small>
                          </button>
                        ))}
                      </div>
                    </details>
                  ));
              })()}
              {pager("missed", "Missed tasks", globalMissedWorkouts)}
              {globalMissedWorkouts.length === 0 && (
                <p className="rvEmpty">{t("polishNoMissedWorkoutsNeedAttention56df")}</p>
              )}
            </div>
          )}
        </article>

        {/* Forms & Tests */}
        <article
          id="reviewColSubmissions"
          hidden={!!embeddedSection && embeddedSection !== "submissions"}
          className={`rvSection ${
            reviewFlashColumn === "reviewColSubmissions" ? "rvFlash" : ""
          }`}
        >
          {sectionHeader(
            "Submissions",
            "Forms & Tests",
            pendingSubmissions.length,
            "submissions"
          )}
          {openReviewSections.submissions && (
            <div className="rvGrid">
              <div className="rvSubmissionFilters">
                <input aria-label={t("polishSearchSubmissions849c")} placeholder={t("polishSearchAthleteOrAssessmentd6e1")} value={submissionQuery}
                  onChange={e => { setSubmissionQuery(e.target.value); setPages(p => ({ ...p, submissions: 0 })); }} />
                <select aria-label={t("polishSubmissionStatus6698")} value={submissionFilter}
                  onChange={e => { setSubmissionFilter(e.target.value); setPages(p => ({ ...p, submissions: 0 })); }}>
                  <option value="pending">{t("polishNeedsReview33a5")}</option><option value="reviewed">{t("polishReviewed31ef")}</option><option value="all">{t("polishAllSubmissions4ff2")}</option>
                </select>
              </div>
              {pageRows("submissions", filteredSubmissions).map((group: any) => {
                const first = group.answers?.[0];
                return (
                  <button
                    type="button"
                    key={`submission-${group.key}`}
                    className="rvItem rvItemSubmission"
                    onClick={() => setSelectedContentSubmission(group)}
                  >
                    <span className="rvItemKicker">{group.responseType}</span>
                    <strong>{group.title || "Submission"}</strong>
                    <small>
                      {clientLabel(first?.clientName || first?.clientId) ||
                        "Unknown client"}
                      {group.submittedAt ? ` · ${group.submittedAt}` : ""}
                    </small>
                  </button>
                );
              })}
              {pager("submissions", "Submissions", filteredSubmissions)}
              {filteredSubmissions.length === 0 && (
                <p className="rvEmpty">{t("polishNoMatchingFormOrTestSubmissionsc32c")}</p>
              )}
            </div>
          )}
        </article>
      </div>

      {/* check-in slide-over */}
      {selectedCheckIn && (
        <PortalToApp>
        <div className="rvScrim" onClick={() => setSelectedCheckIn(null)}>
          <aside
            ref={checkInPanel}
            tabIndex={-1}
            className="rvSlide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rv-checkin-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rvSlideHead">
              <div>
                <span className="rvSlideEyebrow">{t("polishDailyCheckIn35af")}</span>
                <strong className="rvSlideTitle" id="rv-checkin-title">
                  {clientLabel(
                    selectedCheckIn.clientName || selectedCheckIn.clientId
                  )}
                </strong>
                <small className="rvSlideSub">{t("polishSubmitted2e00")} {selectedCheckIn.submittedDate || "—"}
                </small>
              </div>
              <button
                type="button"
                className="rvSlideClose"
                onClick={() => setSelectedCheckIn(null)}
                aria-label={t("polishCloseCheckInReview4d6d")}
              >
                <X size={16} />
              </button>
            </div>
            <div className="rvSlideBody">
              {(() => {
                const chips = checkInChips(selectedCheckIn);
                return chips.length > 0 ? (
                  <div className="rvChips rvChipsLg">
                    {chips.map((s, i) => (
                      <span key={i} className="rvChip rvChipLg">
                        <span className="rvChipK">{s.label}</span>
                        <span className="rvChipV">{s.value}</span>
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}
              {checkInNoteBlocks(selectedCheckIn).map((n, i) => (
                <div key={i} className="rvNoteBlock">
                  <span className="rvNoteLabel">{n.label}</span>
                  <p className="rvNoteText">{n.text}</p>
                </div>
              ))}
              <div className="rvSlideReply">
                <span className="rvNoteLabel">{t("polishYourReplybf9a")}</span>
                <textarea
                  className="rvReply rvReplyLg"
                  placeholder={t("dailyWriteReply")}
                  value={checkInReplyDrafts[selectedCheckIn.recordId] || ""}
                  onChange={(e) =>
                    setCheckInReplyDrafts((cur: any) => ({
                      ...cur,
                      [selectedCheckIn.recordId]: e.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="rvGoldBtn rvGoldBtnBlock"
                  disabled={checkInReplySaving === selectedCheckIn.recordId}
                  onClick={() => void respondToCheckIn(selectedCheckIn)}
                >
                  {checkInReplySaving === selectedCheckIn.recordId
                    ? t("dailySending")
                    : t("dailySendReply")}
                </button>
              </div>
            </div>
          </aside>
        </div>
        </PortalToApp>
      )}
    </section>
  );
}
