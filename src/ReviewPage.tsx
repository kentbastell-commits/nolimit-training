// Coach review workspace. Extracted from App.tsx (split phase G) — JSX
// verbatim; state/handlers threaded as props.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronDown } from "lucide-react";
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
  return (
              <section className="coachReviewWorkspacePage">
                <p className="coachReviewIntro">
                  Client comments, form and test submissions, missed tasks, and
                  order follow-ups that need a coach decision.
                </p>

                {coachReviewError && (
                  <div className="formError">{coachReviewError}</div>
                )}

                <div className="coachReviewSummaryGrid">
                  <button
                    type="button"
                    className="coachReviewSummaryCard"
                    onClick={() => focusReviewColumn("reviewColComments")}
                  >
                    <span>Workout comments</span>
                    <strong>{globalUnreviewedWorkoutComments.length}</strong>
                  </button>
                  <button
                    type="button"
                    className="coachReviewSummaryCard"
                    onClick={() => focusReviewColumn("reviewColSubmissions")}
                  >
                    <span>Submissions</span>
                    <strong>{globalReviewSubmissionItems.length}</strong>
                  </button>
                  <button
                    type="button"
                    className="coachReviewSummaryCard"
                    onClick={() => focusReviewColumn("reviewColMissed")}
                  >
                    <span>Missed tasks</span>
                    <strong>{globalMissedWorkouts.length}</strong>
                  </button>
                  <button
                    type="button"
                    className="coachReviewSummaryCard"
                    onClick={() => focusReviewColumn("reviewColComments")}
                  >
                    <span>Order reviews</span>
                    <strong>{globalReviewOrders.length}</strong>
                  </button>
                  <button
                    type="button"
                    className="coachReviewSummaryCard"
                    onClick={() => focusReviewColumn("reviewColCheckins")}
                  >
                    <span>Check-ins</span>
                    <strong>{coachReviewCheckIns.length}</strong>
                  </button>
                  <button
                    type="button"
                    className="coachReviewSummaryCard"
                    onClick={() => focusReviewColumn("reviewColEnquiries")}
                  >
                    <span>In-person enquiries</span>
                    <strong>{newEnquiries.length}</strong>
                  </button>
                </div>

                <div className="coachReviewBoard">
                  <article
                    id="reviewColEnquiries"
                    className={`coachReviewColumn ${
                      reviewFlashColumn === "reviewColEnquiries"
                        ? "coachReviewColumnFlash"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="coachReviewColumnHeader"
                      aria-expanded={openReviewSections.enquiries}
                      onClick={() => toggleReviewSection("enquiries")}
                    >
                      <div>
                        <span>Needs follow-up</span>
                        <strong>In-Person Enquiries</strong>
                      </div>
                      <div className="coachReviewHeaderRight">
                        <em>{newEnquiries.length}</em>
                        <ChevronDown
                          size={18}
                          className={`coachReviewChevron ${
                            openReviewSections.enquiries ? "open" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {openReviewSections.enquiries && (
                      <div className="coachReviewGlobalList">
                        {newEnquiries.length === 0 && (
                          <p className="coachReviewEmpty">
                            No new in-person enquiries.
                          </p>
                        )}
                        {newEnquiries.map((enq: any) => (
                          <div
                            key={enq.recordId}
                            className="coachCheckInReviewCard"
                          >
                            <div className="coachCheckInReviewHead">
                              <strong>
                                {enq.organization || enq.contactPerson || "Enquiry"}
                              </strong>
                              <small>{enq.submittedDate || "--"}</small>
                            </div>
                            <div className="coachCheckInStats">
                              {enq.contactPerson && (
                                <span>{enq.contactPerson}</span>
                              )}
                              {enq.contact && <span>{enq.contact}</span>}
                              {enq.athletes && (
                                <span>{enq.athletes} athletes</span>
                              )}
                              {enq.duration && <span>{enq.duration}</span>}
                            </div>
                            {enq.notes && (
                              <p className="coachCheckInNotes">{enq.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>

                  {reviewFormVideos.filter((v: any) => v.status !== "Reviewed")
                    .length > 0 && (
                    <article className="coachReviewColumn">
                      <div className="coachReviewColumnHeader">
                        <div>
                          <span>Needs review</span>
                          <strong>Form Videos</strong>
                        </div>
                        <div className="coachReviewHeaderRight">
                          <em>
                            {
                              reviewFormVideos.filter(
                                (v: any) => v.status !== "Reviewed"
                              ).length
                            }
                          </em>
                        </div>
                      </div>
                      <div className="formVideoReviewList">
                        {reviewFormVideos
                          .filter((v: any) => v.status !== "Reviewed")
                          .map((video: any) => (
                            <div
                              className="formVideoReviewCard"
                              key={video.recordId}
                            >
                              <div className="formVideoReviewMeta">
                                <strong>{video.clientName || video.clientId}</strong>
                                <span>
                                  {video.exerciseName}
                                  {video.workoutName
                                    ? ` · ${video.workoutName}`
                                    : ""}
                                </span>
                              </div>
                              <video
                                src={video.videoUrl}
                                controls
                                playsInline
                                preload="metadata"
                              />
                              <textarea
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
                                className="primaryButton"
                                onClick={() =>
                                  void reviewFormVideo(video.recordId)
                                }
                              >
                                Send reply & mark reviewed
                              </button>
                            </div>
                          ))}
                      </div>
                    </article>
                  )}

                  <article
                    id="reviewColCheckins"
                    className={`coachReviewColumn ${
                      reviewFlashColumn === "reviewColCheckins"
                        ? "coachReviewColumnFlash"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="coachReviewColumnHeader"
                      aria-expanded={openReviewSections.checkins}
                      onClick={() => toggleReviewSection("checkins")}
                    >
                      <div>
                        <span>Needs review</span>
                        <strong>Daily Check-ins</strong>
                      </div>
                      <div className="coachReviewHeaderRight">
                        <em>{coachReviewCheckIns.length}</em>
                        <ChevronDown
                          size={18}
                          className={`coachReviewChevron ${
                            openReviewSections.checkins ? "open" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {openReviewSections.checkins && (
                      <div className="coachReviewGlobalList">
                        {coachReviewCheckIns.length === 0 && (
                          <p className="coachReviewEmpty">
                            No check-ins waiting for a reply.
                          </p>
                        )}
                        {coachReviewCheckIns.map((checkIn: any) => {
                          const metric = (label: string, value: string) =>
                            value && String(value).trim()
                              ? `${label} ${value}`
                              : "";
                          const stats = [
                            metric("Energy", checkIn.energy),
                            metric("Sleep", checkIn.sleepQuality),
                            metric("Soreness", checkIn.soreness),
                            metric("Mood", checkIn.mood),
                            metric("Stress", checkIn.stress),
                            metric("Readiness", checkIn.readinessScore),
                            checkIn.bodyWeight
                              ? `BW ${checkIn.bodyWeight}`
                              : "",
                          ].filter(Boolean);
                          const notes = [
                            checkIn.trainingNotes,
                            checkIn.wins && `Wins: ${checkIn.wins}`,
                            checkIn.problemsPain &&
                              `Pain: ${checkIn.problemsPain}`,
                            checkIn.clientNotes,
                            checkIn.nutritionNotes &&
                              `Nutrition: ${checkIn.nutritionNotes}`,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <div
                              key={checkIn.recordId}
                              className="coachCheckInReviewCard"
                            >
                              <div className="coachCheckInReviewHead">
                                <strong>
                                  {clientLabel(checkIn.clientName || checkIn.clientId)}
                                </strong>
                                <small>{checkIn.submittedDate || "--"}</small>
                              </div>
                              {stats.length > 0 && (
                                <div className="coachCheckInStats">
                                  {stats.map((s: any) => (
                                    <span key={s}>{s}</span>
                                  ))}
                                </div>
                              )}
                              {notes && (
                                <p className="coachCheckInNotes">{notes}</p>
                              )}
                              <textarea
                                className="coachCheckInReplyInput"
                                placeholder="Write a reply to your athlete…"
                                value={checkInReplyDrafts[checkIn.recordId] || ""}
                                onChange={(e) =>
                                  setCheckInReplyDrafts((cur: any) => ({
                                    ...cur,
                                    [checkIn.recordId]: e.target.value,
                                  }))
                                }
                              />
                              <div className="coachCheckInReplyActions">
                                <button
                                  type="button"
                                  className="goldButton"
                                  disabled={
                                    checkInReplySaving === checkIn.recordId
                                  }
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

                  <article
                    id="reviewColComments"
                    className={`coachReviewColumn ${
                      reviewFlashColumn === "reviewColComments"
                        ? "coachReviewColumnFlash"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="coachReviewColumnHeader"
                      aria-expanded={openReviewSections.comments}
                      onClick={() => toggleReviewSection("comments")}
                    >
                      <div>
                        <span>Needs review</span>
                        <strong>Comments & Orders</strong>
                      </div>
                      <div className="coachReviewHeaderRight">
                        <em>
                          {globalUnreviewedWorkoutComments.length +
                            globalReviewOrders.length}
                        </em>
                        <ChevronDown
                          size={18}
                          className={`coachReviewChevron ${
                            openReviewSections.comments ? "open" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {openReviewSections.comments && (
                    <div className="coachReviewGlobalList">
                      {globalReviewOrders.slice(0, 6).map((order: any) => (
                        <button
                          key={`order-${order.recordId || order.orderId}`}
                          className="coachReviewGlobalItem urgent"
                          onClick={() => {
                            setActivePage("Orders");
                            void openOrderReview(order);
                          }}
                        >
                          <span>{getOrderPipelineStatus(order)}</span>
                          <strong>{order.clientName || "New client"}</strong>
                          <small>
                            {order.productName || order.productType || "Order"}
                          </small>
                        </button>
                      ))}

                      {globalUnreviewedWorkoutComments.map((comment: any) => (
                        <div
                          key={comment.key}
                          className="coachReviewGlobalItem"
                        >
                          <button
                            type="button"
                            className="coachReviewItemMain"
                            onClick={() =>
                              openReviewClient(
                                comment.clientId,
                                comment.clientName
                              )
                            }
                          >
                            <span>Workout comment</span>
                            <strong>
                              {clientLabel(comment.clientName || comment.clientId)}
                            </strong>
                            <small>
                              {comment.workoutName || "Workout"} -{" "}
                              {comment.date || "--"}
                            </small>
                            <span className="coachReviewPreview">
                              {comment.noteEn || comment.note}
                            </span>
                          </button>
                          <div className="coachReviewItemActions">
                            <button
                              type="button"
                              onClick={() =>
                                openReviewClient(
                                  comment.clientId,
                                  comment.clientName
                                )
                              }
                            >
                              Open Client
                            </button>
                            <button
                              type="button"
                              className="reviewDoneButton"
                              disabled={reviewingWorkoutCommentKey === comment.key}
                              onClick={() =>
                                void markGlobalWorkoutCommentReviewed(comment)
                              }
                            >
                              {reviewingWorkoutCommentKey === comment.key
                                ? "Saving..."
                                : "Mark Reviewed"}
                            </button>
                          </div>
                        </div>
                      ))}

                      {globalReviewOrders.length === 0 &&
                        globalUnreviewedWorkoutComments.length === 0 && (
                          <p className="mutedText">
                            No comments or order reviews waiting.
                          </p>
                        )}
                    </div>
                    )}
                  </article>

                  <article
                    id="reviewColMissed"
                    className={`coachReviewColumn ${
                      reviewFlashColumn === "reviewColMissed"
                        ? "coachReviewColumnFlash"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="coachReviewColumnHeader"
                      aria-expanded={openReviewSections.missed}
                      onClick={() => toggleReviewSection("missed")}
                    >
                      <div>
                        <span>Training</span>
                        <strong>Missed Tasks</strong>
                      </div>
                      <div className="coachReviewHeaderRight">
                        <em>{globalMissedWorkouts.length}</em>
                        <ChevronDown
                          size={18}
                          className={`coachReviewChevron ${
                            openReviewSections.missed ? "open" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {openReviewSections.missed && (
                    <div className="coachReviewGlobalList">
                      {globalMissedWorkouts.map((workout: any) => (
                        <button
                          key={`missed-${
                            workout.assignedWorkoutId || workout.id
                          }`}
                          className="coachReviewGlobalItem missed"
                          onClick={() => openReviewWorkout(workout)}
                        >
                          <span>Missed workout</span>
                          <strong>{workout.sessionName || "Workout"}</strong>
                          <small>
                            {normalizeDate(String(workout.scheduledDate)) || "--"}{" "}
                            - {clientLabel(workout.clientId)}
                          </small>
                        </button>
                      ))}
                      {globalMissedWorkouts.length === 0 && (
                        <p className="mutedText">
                          No missed workouts need attention.
                        </p>
                      )}
                    </div>
                    )}
                  </article>

                  <article
                    id="reviewColSubmissions"
                    className={`coachReviewColumn ${
                      reviewFlashColumn === "reviewColSubmissions"
                        ? "coachReviewColumnFlash"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="coachReviewColumnHeader"
                      aria-expanded={openReviewSections.submissions}
                      onClick={() => toggleReviewSection("submissions")}
                    >
                      <div>
                        <span>Submissions</span>
                        <strong>Forms & Tests</strong>
                      </div>
                      <div className="coachReviewHeaderRight">
                        <em>{globalReviewSubmissionItems.length}</em>
                        <ChevronDown
                          size={18}
                          className={`coachReviewChevron ${
                            openReviewSections.submissions ? "open" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {openReviewSections.submissions && (
                    <div className="coachReviewGlobalList">
                      {globalReviewSubmissionItems.map((group: any) => {
                        const first = group.answers[0];
                        return (
                          <button
                            key={`submission-${group.key}`}
                            className="coachReviewGlobalItem"
                            onClick={() => setSelectedContentSubmission(group)}
                          >
                            <span>{group.responseType}</span>
                            <strong>{group.title || "Submission"}</strong>
                            <small>
                              {clientLabel(
                                first?.clientName || first?.clientId
                              )}{" "}
                              - {group.submittedAt || "--"}
                            </small>
                          </button>
                        );
                      })}
                      {globalReviewSubmissionItems.length === 0 && (
                        <p className="mutedText">
                          No new form or test submissions.
                        </p>
                      )}
                    </div>
                    )}
                  </article>
                </div>
              </section>
  );
}
