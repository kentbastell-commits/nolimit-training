// Coach review workspace — the "needs-a-decision" inbox. Restyle only: all
// state/handlers arrive as props (threaded from App.tsx). Layout: header +
// dark KPI hero + 6-card summary grid + stacked collapsible sections + a
// right slide-over for a check-in's full detail. The only local state is the
// presentational check-in slide-over selection; every business handler
// (drafts, replies, mark-reviewed, open-client/order/workout/submission) is a
// prop and stays wired.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { CheckSquare, ChevronDown, X } from "lucide-react";
import "./ReviewPage.css";
import { normalizeDate } from "./appCore";

export default function ReviewPage({
  reviewFlashColumn,
  checkInReplyDrafts,
  checkInReplySaving,
  clientLabel,
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
  // Presentational only: which check-in is expanded in the slide-over.
  const [selectedCheckIn, setSelectedCheckIn] = useState<any>(null);

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

  const unreviewedFormVideos = reviewFormVideos.filter(
    (v: any) => v.status !== "Reviewed"
  );

  const commentsCount =
    globalUnreviewedWorkoutComments.length + globalReviewOrders.length;
  const total =
    globalUnreviewedWorkoutComments.length +
    globalReviewSubmissionItems.length +
    globalMissedWorkouts.length +
    globalReviewOrders.length +
    coachReviewCheckIns.length +
    newEnquiries.length;

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
      c.trainingNotes && { label: "Training notes", text: c.trainingNotes },
      c.wins && { label: "Wins", text: c.wins },
      c.problemsPain && { label: "Problems / pain", text: c.problemsPain },
      c.clientNotes && { label: "Client notes", text: c.clientNotes },
      c.nutritionNotes && { label: "Nutrition", text: c.nutritionNotes },
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
      count: globalReviewSubmissionItems.length,
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
      label: "In-person enquiries",
      count: newEnquiries.length,
      target: "reviewColEnquiries",
      accent: "#b5654a", // Clay
    },
  ];

  const sectionHeader = (
    eyebrow: string,
    title: string,
    count: number,
    key: string
  ) => (
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
    <section className="rvPage">
      {/* header */}
      <header className="rvHeader">
        <span className="rvEyebrow">
          <CheckSquare size={14} /> Review
        </span>
        <h1 className="rvTitle">Review</h1>
        <p className="rvIntro">
          Client comments, form &amp; test submissions, missed tasks, and order
          follow-ups that need a coach decision.
        </p>
      </header>

      {coachReviewError && <div className="rvError">{coachReviewError}</div>}

      {/* dark KPI hero */}
      <div className="rvHero">
        <div className="rvHeroGlow" aria-hidden="true" />
        <span className="rvHeroEyebrow">Needs a decision</span>
        <div className="rvHeroRow">
          <span className="rvHeroNum">{total}</span>
          <span className="rvHeroSub">
            open items across 6 queues waiting on you
          </span>
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
            <strong className="rvSummaryCount">{card.count}</strong>
          </button>
        ))}
      </div>

      {/* board */}
      <div className="rvBoard">
        {/* In-Person Enquiries */}
        <article
          id="reviewColEnquiries"
          className={`rvSection ${
            reviewFlashColumn === "reviewColEnquiries" ? "rvFlash" : ""
          }`}
        >
          {sectionHeader(
            "Needs follow-up",
            "In-Person Enquiries",
            newEnquiries.length,
            "enquiries"
          )}
          {openReviewSections.enquiries && (
            <div className="rvGrid">
              {newEnquiries.length === 0 && (
                <p className="rvEmpty">No new in-person enquiries.</p>
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
                    {enq.notes && <p className="rvNote">{enq.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </article>

        {/* Form Videos — collapsible like the rest; shown only when there are
            unreviewed clips (no summary card / KPI target points at it). */}
        {unreviewedFormVideos.length > 0 && (
          <article className="rvSection">
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
                  <video
                    className="rvVideo"
                    src={video.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                  />
                  <textarea
                    className="rvReply"
                    placeholder="Reply to your athlete…"
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
                  >
                    Send reply &amp; mark reviewed
                  </button>
                </div>
                ))}
              </div>
            )}
          </article>
        )}

        {/* Daily Check-ins */}
        <article
          id="reviewColCheckins"
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
                <p className="rvEmpty">No check-ins waiting for a reply.</p>
              )}
              {coachReviewCheckIns.map((checkIn: any) => {
                const chips = checkInChips(checkIn);
                const notes = checkInNotesLine(checkIn);
                return (
                  <div key={checkIn.recordId} className="rvCard rvCardCheckin">
                    <div
                      className="rvCardTap"
                      onClick={() => setSelectedCheckIn(checkIn)}
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
                    </div>
                    <textarea
                      className="rvReply"
                      placeholder="Write a reply to your athlete…"
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
                          ? "Sending…"
                          : "Send reply"}
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
              {globalReviewOrders.slice(0, 6).map((order: any) => (
                <button
                  type="button"
                  key={`order-${order.recordId || order.orderId}`}
                  className="rvItem rvItemUrgent"
                  onClick={() => {
                    setActivePage("Orders");
                    void openOrderReview(order);
                  }}
                >
                  <span className="rvItemKicker">
                    {getOrderPipelineStatus(order)}
                  </span>
                  <strong>{order.clientName || "New client"}</strong>
                  <small>
                    {order.productName || order.productType || "Order"}
                  </small>
                </button>
              ))}

              {globalUnreviewedWorkoutComments.map((comment: any) => (
                <div key={comment.key} className="rvItem rvCommentItem">
                  <span className="rvItemKicker">Workout comment</span>
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
                    >
                      Open Client
                    </button>
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

              {commentsCount === 0 && (
                <p className="rvEmpty">No comments or order reviews waiting.</p>
              )}
            </div>
          )}
        </article>

        {/* Missed Tasks */}
        <article
          id="reviewColMissed"
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
              {globalMissedWorkouts.map((workout: any) => (
                <button
                  type="button"
                  key={`missed-${workout.assignedWorkoutId || workout.id}`}
                  className="rvItem rvItemMissed"
                  onClick={() => openReviewWorkout(workout)}
                >
                  <span className="rvItemKicker">Missed workout</span>
                  <strong>{workout.sessionName || "Workout"}</strong>
                  <small>
                    {normalizeDate(String(workout.scheduledDate)) || "—"} ·{" "}
                    {clientLabel(workout.clientId)}
                  </small>
                </button>
              ))}
              {globalMissedWorkouts.length === 0 && (
                <p className="rvEmpty">No missed workouts need attention.</p>
              )}
            </div>
          )}
        </article>

        {/* Forms & Tests */}
        <article
          id="reviewColSubmissions"
          className={`rvSection ${
            reviewFlashColumn === "reviewColSubmissions" ? "rvFlash" : ""
          }`}
        >
          {sectionHeader(
            "Submissions",
            "Forms & Tests",
            globalReviewSubmissionItems.length,
            "submissions"
          )}
          {openReviewSections.submissions && (
            <div className="rvGrid">
              {globalReviewSubmissionItems.map((group: any) => {
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
                      {clientLabel(first?.clientName || first?.clientId)} ·{" "}
                      {group.submittedAt || "—"}
                    </small>
                  </button>
                );
              })}
              {globalReviewSubmissionItems.length === 0 && (
                <p className="rvEmpty">No new form or test submissions.</p>
              )}
            </div>
          )}
        </article>
      </div>

      {/* check-in slide-over */}
      {selectedCheckIn && (
        <div className="rvScrim" onClick={() => setSelectedCheckIn(null)}>
          <aside className="rvSlide" onClick={(e) => e.stopPropagation()}>
            <div className="rvSlideHead">
              <div>
                <span className="rvSlideEyebrow">Daily check-in</span>
                <strong className="rvSlideTitle">
                  {clientLabel(
                    selectedCheckIn.clientName || selectedCheckIn.clientId
                  )}
                </strong>
                <small className="rvSlideSub">
                  Submitted {selectedCheckIn.submittedDate || "—"}
                </small>
              </div>
              <button
                type="button"
                className="rvSlideClose"
                onClick={() => setSelectedCheckIn(null)}
                aria-label="Close"
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
                <span className="rvNoteLabel">Your reply</span>
                <textarea
                  className="rvReply rvReplyLg"
                  placeholder="Write a reply to your athlete…"
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
                    ? "Sending…"
                    : "Send reply"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
