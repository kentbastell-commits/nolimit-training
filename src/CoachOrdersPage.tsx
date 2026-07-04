// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Check, Trash2 } from "lucide-react";
import { addDays } from "./appCore";

export default function CoachOrdersPage({
  activationClientName,
  activationPortalLink,
  activeCoaches,
  assignOrderIntake,
  assignOrderProgram,
  buildClientPortalLink,
  copyToClipboard,
  createManualProductOrder,
  deleteProductOrder,
  getContentResponseLabel,
  getOrderClient,
  getOrderIntakeTemplate,
  getOrderPipelineStatus,
  getOrderPrimaryCoach,
  getOrderProgram,
  getOrderStageIndex,
  getOrderStartDate,
  loadProductOrders,
  manualOrder,
  markOrderIntakeReviewed,
  newOrdersQueue,
  openOrderReview,
  openOrdersCount,
  orderPipelineStages,
  orderProcessingId,
  orderReviewLoading,
  orderReviewOrder,
  orderReviewResponses,
  orderSearch,
  programs,
  readyOrdersCount,
  resetManualOrderForm,
  reviewAndLoadProgram,
  reviewQueueOrders,
  savingManualOrder,
  selectManualOrderProgram,
  selectedManualOrderProgram,
  setActivationClientName,
  setActivationPortalLink,
  setManualOrder,
  setOrderSearch,
  setOrderStartDates,
  setShowManualOrderForm,
  showManualOrderForm,
  updateProductOrder,
  visibleProductOrders,
}: { [key: string]: any }) {
  return (
    <>
              <section className="ordersWorkspace">
                <div className="ordersSummary">
                  <div>
                    <span>Total Orders</span>
                    <strong>{visibleProductOrders.length}</strong>
                  </div>
                  <div>
                    <span>In Pipeline</span>
                    <strong>{openOrdersCount}</strong>
                  </div>
                  <div>
                    <span>Ready to Load</span>
                    <strong>{readyOrdersCount}</strong>
                  </div>
                </div>

                <div className="ordersToolbar">
                  <input
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Search orders, clients, or products"
                  />
                  <button
                    className="goldButton"
                    onClick={() => setShowManualOrderForm((current: any) => !current)}
                  >
                    {showManualOrderForm ? "Close Order Form" : "+ Manual Order"}
                  </button>
                  <button className="outlineButton" onClick={loadProductOrders}>
                    Reload
                  </button>
                </div>

                {showManualOrderForm && (
                  <section className="manualOrderPanel">
                    <div className="manualOrderHeader">
                      <div>
                        <span>External Sale</span>
                        <h3>Create Manual Order</h3>
                        <p>
                          Use this after a WeChat QR, transfer, or external payment.
                          The order will enter the onboarding pipeline.
                        </p>
                      </div>
                      <button
                        className="outlineButton"
                        onClick={resetManualOrderForm}
                        disabled={savingManualOrder}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="manualOrderGrid">
                      <label>
                        <span>Client Name</span>
                        <input
                          value={manualOrder.clientName}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              clientName: event.target.value,
                            })
                          }
                          placeholder="Client name"
                        />
                      </label>

                      <label>
                        <span>Phone / WeChat</span>
                        <input
                          value={manualOrder.phone}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              phone: event.target.value,
                            })
                          }
                          placeholder="wechat_id"
                        />
                      </label>

                      <label>
                        <span>Email</span>
                        <input
                          value={manualOrder.email}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              email: event.target.value,
                            })
                          }
                          placeholder="Optional"
                        />
                      </label>

                      <label>
                        <span>Coach</span>
                        <select
                          value={manualOrder.assignedCoach}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              assignedCoach: event.target.value,
                            })
                          }
                        >
                          <option value="">Unassigned</option>
                          {activeCoaches.map((coach: any) => (
                            <option key={coach.recordId || coach.name} value={coach.name}>
                              {coach.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Saved Program</span>
                        <select
                          value={manualOrder.programId}
                          onChange={(event) =>
                            selectManualOrderProgram(event.target.value)
                          }
                        >
                          <option value="">Manual product only</option>
                          {programs
                            .filter((program: any) => program.status !== "Archived")
                            .map((program: any) => (
                              <option key={program.programId} value={program.programId}>
                                {program.programName}
                              </option>
                            ))}
                        </select>
                      </label>

                      <label>
                        <span>Product Name</span>
                        <input
                          value={manualOrder.productName}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              productName: event.target.value,
                            })
                          }
                          placeholder="Program or product name"
                        />
                      </label>

                      <label>
                        <span>Product Type</span>
                        <select
                          value={manualOrder.productType}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              productType: event.target.value,
                            })
                          }
                        >
                          <option>Digital Program</option>
                          <option>Online Coaching</option>
                          <option>In-Person Training</option>
                          <option>Internal Coaching Template</option>
                        </select>
                      </label>

                      <label>
                        <span>Payment</span>
                        <select
                          value={manualOrder.paymentStatus}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              paymentStatus: event.target.value,
                            })
                          }
                        >
                          <option>Paid</option>
                          <option>Pending</option>
                          <option>Comped</option>
                          <option>Refunded</option>
                        </select>
                      </label>

                      <label>
                        <span>Amount</span>
                        <input
                          value={manualOrder.amount}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              amount: event.target.value,
                            })
                          }
                          placeholder="0"
                        />
                      </label>

                      <label>
                        <span>Currency</span>
                        <select
                          value={manualOrder.currency}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              currency: event.target.value,
                            })
                          }
                        >
                          <option>CNY</option>
                          <option>USD</option>
                          <option>CAD</option>
                        </select>
                      </label>

                      <label>
                        <span>Payment Method</span>
                        <select
                          value={manualOrder.paymentProvider}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              paymentProvider: event.target.value,
                            })
                          }
                        >
                          <option>WeChat QR</option>
                          <option>Alipay QR</option>
                          <option>Bank Transfer</option>
                          <option>Cash</option>
                          <option>External Payment</option>
                        </select>
                      </label>

                      <label>
                        <span>Payment Reference</span>
                        <input
                          value={manualOrder.paymentReference}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              paymentReference: event.target.value,
                            })
                          }
                          placeholder="Receipt, screenshot, or note"
                        />
                      </label>

                      <label>
                        <span>Purchase Date</span>
                        <input
                          type="date"
                          value={manualOrder.purchasedAt}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              purchasedAt: event.target.value,
                            })
                          }
                        />
                      </label>

                      <label>
                        <span>Program Start</span>
                        <input
                          type="date"
                          value={manualOrder.accessStartDate}
                          onChange={(event) => {
                            const accessLength = Number(
                              selectedManualOrderProgram?.accessLengthDays || 0
                            );
                            setManualOrder({
                              ...manualOrder,
                              accessStartDate: event.target.value,
                              accessEndDate:
                                accessLength > 0
                                  ? addDays(
                                      event.target.value,
                                      Math.max(0, accessLength - 1)
                                    )
                                  : manualOrder.accessEndDate,
                            });
                          }}
                        />
                      </label>

                      <label>
                        <span>Access End</span>
                        <input
                          type="date"
                          value={manualOrder.accessEndDate}
                          onChange={(event) =>
                            setManualOrder({
                              ...manualOrder,
                              accessEndDate: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>

                    <label className="manualOrderNotes">
                      <span>Internal Notes</span>
                      <textarea
                        value={manualOrder.notes}
                        onChange={(event) =>
                          setManualOrder({
                            ...manualOrder,
                            notes: event.target.value,
                          })
                        }
                        placeholder="Example: Paid by WeChat QR. Intake should be sent after payment confirmation."
                      />
                    </label>

                    <div className="manualOrderActions">
                      <button
                        className="outlineButton"
                        onClick={() => void createManualProductOrder(false)}
                        disabled={savingManualOrder}
                      >
                        {savingManualOrder ? "Creating..." : "Create Order"}
                      </button>
                      <button
                        className="goldButton"
                        onClick={() => void createManualProductOrder(true)}
                        disabled={savingManualOrder}
                      >
                        {savingManualOrder
                          ? "Starting..."
                          : "Create + Send Intake"}
                      </button>
                    </div>
                  </section>
                )}

                {(newOrdersQueue.length > 0 || activationPortalLink) && (
                  <section className="pendingActivationSection">
                    <div className="pendingActivationHeader">
                      <div>
                        <span>Step 1 of 3</span>
                        <h3>Pending Activation</h3>
                      </div>
                      <strong>{newOrdersQueue.length}</strong>
                    </div>

                    <div className="pendingActivationBody">
                      <div className="pendingActivationList">
                        {newOrdersQueue.length === 0 && (
                          <p className="mutedText">No new orders pending.</p>
                        )}
                        {newOrdersQueue.map((order: any) => (
                          <div className="pendingOrderCard" key={order.recordId}>
                            <div className="pendingOrderInfo">
                              <strong>{order.clientName || "Unnamed client"}</strong>
                              <span>{order.productName || "Product"}</span>
                              <small>{order.phone || order.email || "No contact"}</small>
                            </div>
                            <div className="pendingOrderActions">
                              <button
                                className="goldButton"
                                disabled={orderProcessingId === order.recordId}
                                onClick={() => void assignOrderIntake(order)}
                              >
                                {orderProcessingId === order.recordId
                                  ? "Activating..."
                                  : "Activate"}
                              </button>
                              <button
                                className="iconActionButton dangerIconButton"
                                disabled={orderProcessingId === order.recordId}
                                onClick={() => void deleteProductOrder(order)}
                                title="Delete order"
                                aria-label={`Delete order ${
                                  order.orderId || order.productName || ""
                                }`}
                              >
                                <Trash2 size={17} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {activationPortalLink && (
                        <div className="portalSharePanel">
                          <div className="portalShareHeader">
                            <span>Step 2 — Send to client via WeChat</span>
                            <button
                              className="portalShareDismiss"
                              onClick={() => {
                                setActivationPortalLink("");
                                setActivationClientName("");
                              }}
                            >
                              ✕
                            </button>
                          </div>
                          <p className="portalShareClientName">
                            {activationClientName}
                          </p>
                          <div className="portalShareLinkRow">
                            <code className="portalShareUrl">{activationPortalLink}</code>
                            <button
                              className="goldButton"
                              onClick={() =>
                                void copyToClipboard(activationPortalLink, "Portal link")
                              }
                            >
                              Copy Link
                            </button>
                          </div>
                          <textarea
                            className="portalShareMessage"
                            readOnly
                            value={`Hi ${activationClientName}, welcome to NoLimit Training! Please open your personal training portal and complete your intake form here:\n\n${activationPortalLink}`}
                            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                          />
                          <p className="portalShareHint">
                            Click the message above to select all, then copy and paste into WeChat.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                <section className="orderReviewWorkspace">
                  <div className="orderReviewQueue">
                    <div className="orderReviewHeader">
                      <div>
                        <span>Step 2 of 3 — Coach Review</span>
                        <h3>Intake Review Queue</h3>
                      </div>
                      <strong>{reviewQueueOrders.length}</strong>
                    </div>

                    {reviewQueueOrders.length === 0 ? (
                      <p className="mutedText">
                        No intake items need review right now.
                      </p>
                    ) : (
                      <div className="orderReviewList">
                        {reviewQueueOrders.slice(0, 8).map((order: any) => {
                          const pipelineStatus = getOrderPipelineStatus(order);
                          const active =
                            orderReviewOrder?.recordId === order.recordId;

                          return (
                            <button
                              key={order.recordId || order.orderId}
                              className={[
                                "orderReviewItem",
                                active ? "active" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => void openOrderReview(order)}
                            >
                              <strong>{order.clientName || "Unnamed client"}</strong>
                              <span>{order.productName || "Purchased product"}</span>
                              <small>{pipelineStatus}</small>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="orderReviewDetail">
                    {!orderReviewOrder ? (
                      <div className="emptyOrderReview">
                        <span>Review Panel</span>
                        <h3>Select an order to review the intake.</h3>
                        <p>
                          Use this after the client submits their intake. Once
                          reviewed, the program can be loaded into their calendar.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="orderReviewDetailHeader">
                          <div>
                            <span>{getOrderPipelineStatus(orderReviewOrder)}</span>
                            <h3>{orderReviewOrder.clientName || "Unnamed client"}</h3>
                            <p>
                              {orderReviewOrder.productName || "Purchased product"} -{" "}
                              {orderReviewOrder.orderId || "No order ID"}
                            </p>
                          </div>
                          <div className="orderReviewDetailActions">
                            <button
                              className="outlineButton"
                              onClick={() => void openOrderReview(orderReviewOrder)}
                              disabled={orderReviewLoading}
                            >
                              {orderReviewLoading ? "Loading..." : "Refresh Review"}
                            </button>
                            <button
                              className="outlineButton"
                              onClick={() => void markOrderIntakeReviewed(orderReviewOrder)}
                              disabled={
                                orderProcessingId === orderReviewOrder.recordId ||
                                !getOrderClient(orderReviewOrder)
                              }
                            >
                              Mark Reviewed
                            </button>
                            <button
                              className="outlineButton"
                              onClick={() => void assignOrderProgram(orderReviewOrder)}
                              disabled={
                                orderProcessingId === orderReviewOrder.recordId ||
                                !getOrderProgram(orderReviewOrder)
                              }
                            >
                              Load Program
                            </button>
                            <button
                              className="goldButton"
                              onClick={() => void reviewAndLoadProgram(orderReviewOrder)}
                              disabled={
                                orderProcessingId === orderReviewOrder.recordId ||
                                !getOrderClient(orderReviewOrder) ||
                                !getOrderProgram(orderReviewOrder)
                              }
                            >
                              Reviewed + Load
                            </button>
                          </div>
                        </div>

                        <div className="orderReviewFacts">
                          <div>
                            <span>Client</span>
                            <strong>
                              {getOrderClient(orderReviewOrder)?.name ||
                                "Needs client record"}
                            </strong>
                          </div>
                          <div>
                            <span>Intake</span>
                            <strong>
                              {getOrderIntakeTemplate(orderReviewOrder)?.name ||
                                "No intake matched"}
                            </strong>
                          </div>
                          <div>
                            <span>Program</span>
                            <strong>
                              {getOrderProgram(orderReviewOrder)?.programName ||
                                "No saved program matched"}
                            </strong>
                          </div>
                        </div>

                        <div className="orderReviewResponses">
                          {orderReviewLoading && <p>Loading intake responses...</p>}

                          {!orderReviewLoading &&
                            orderReviewResponses.length === 0 && (
                              <p className="mutedText">
                                No intake submission has been found yet.
                              </p>
                            )}

                          {!orderReviewLoading &&
                            orderReviewResponses.map((submission: any) => (
                              <article
                                className="orderReviewSubmission"
                                key={submission.key}
                              >
                                <div>
                                  <strong>{submission.title}</strong>
                                  <span>{submission.submittedAt || "--"}</span>
                                </div>
                                <dl>
                                  {submission.answers.map((answer: any) => (
                                    <div key={answer.recordId || answer.responseId}>
                                      <dt>{getContentResponseLabel(answer)}</dt>
                                      <dd>
                                        {answer.answer || "--"}
                                        {answer.unit ? ` ${answer.unit}` : ""}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              </article>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <div className="ordersGrid">
                  {visibleProductOrders.length === 0 && (
                    <section className="orderCard emptyOrderCard">
                      <h3>No product orders found.</h3>
                      <p>
                        New store purchases and manual product orders will appear here.
                      </p>
                    </section>
                  )}

                  {visibleProductOrders.map((order: any) => {
                    const matchedClient = getOrderClient(order);
                    const matchedProgram = getOrderProgram(order);
                    const intakeTemplate = getOrderIntakeTemplate(order);
                    const processing = orderProcessingId === order.recordId;
                    const pipelineStatus = getOrderPipelineStatus(order);
                    const pipelineIndex = getOrderStageIndex(order);

                    return (
                      <section
                        className="orderCard"
                        key={order.recordId || order.orderId}
                      >
                        <div className="orderCardHeader">
                          <div>
                            <span>{order.productType || "Product Order"}</span>
                            <h3>{order.productName || "Untitled Product"}</h3>
                            <p>
                              {order.clientName || "Unnamed client"} ·{" "}
                              {order.orderId || "No order ID"}
                            </p>
                          </div>
                          <span
                            className={`status onboardingStatusChip ${
                              pipelineStatus === "Program Loaded"
                                ? "activeStatus"
                                : pipelineStatus === "New Order"
                                ? "newOrderStatus"
                                : "holdStatus"
                            }`}
                          >
                            {pipelineStatus}
                          </span>
                        </div>

                        <div className="onboardingTimeline">
                          {orderPipelineStages.map((stage: any, stageIndex: any) => (
                            <span
                              key={stage}
                              className={[
                                "onboardingStage",
                                stageIndex < pipelineIndex ? "complete" : "",
                                stageIndex === pipelineIndex ? "current" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {stage}
                            </span>
                          ))}
                        </div>

                        <div className="orderPipeline">
                          <div className={matchedClient ? "complete" : ""}>
                            <strong>Client</strong>
                            <span>
                              {matchedClient
                                ? matchedClient.name
                                : "Needs client record"}
                            </span>
                          </div>
                          <div className={intakeTemplate ? "complete" : ""}>
                            <strong>Intake</strong>
                            <span>
                              {intakeTemplate
                                ? intakeTemplate.name
                                : "No intake form matched"}
                            </span>
                          </div>
                          <div className={matchedProgram ? "complete" : ""}>
                            <strong>Program</strong>
                            <span>
                              {matchedProgram
                                ? matchedProgram.programName
                                : "No program matched"}
                            </span>
                          </div>
                        </div>

                        <div className="orderMetaGrid">
                          <div>
                            <span>Coach</span>
                            <strong>{getOrderPrimaryCoach(order)}</strong>
                          </div>
                          <div>
                            <span>Purchased</span>
                            <strong>{order.purchasedAt || "--"}</strong>
                          </div>
                          <div>
                            <span>Payment</span>
                            {/^pending$/i.test(order.paymentStatus || "") ? (
                              <span className="orderPaymentPending">
                                <strong>
                                  Pending
                                  {order.paymentReference
                                    ? ` · ${order.paymentReference}`
                                    : ""}
                                </strong>
                                <button
                                  type="button"
                                  className="orderVerifyButton"
                                  title={
                                    order.paymentReference
                                      ? `Confirm you found a WeChat payment with note ${order.paymentReference}`
                                      : "Mark this payment as verified"
                                  }
                                  onClick={() =>
                                    void updateProductOrder(order, {
                                      paymentStatus: "Paid",
                                    })
                                  }
                                >
                                  <Check size={13} /> Verify
                                </button>
                              </span>
                            ) : (
                              <strong>{order.paymentStatus || "Unknown"}</strong>
                            )}
                          </div>
                          <label>
                            <span>Program Start</span>
                            <input
                              type="date"
                              value={getOrderStartDate(order)}
                              onChange={(event) =>
                                setOrderStartDates((current: any) => ({
                                  ...current,
                                  [order.recordId]: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>

                        <div className="orderActions">
                          {order.intakeStatus === "Sent" ||
                          order.intakeStatus === "Submitted" ||
                          order.intakeStatus === "Reviewed" ? (
                            <button className="outlineButton" disabled>
                              Intake Sent ✓
                            </button>
                          ) : (
                            <button
                              className="outlineButton"
                              onClick={() => void assignOrderIntake(order)}
                              disabled={processing || !intakeTemplate}
                              title={
                                !intakeTemplate
                                  ? "No intake form matched for this program"
                                  : undefined
                              }
                            >
                              {processing ? "Working..." : "Start Onboarding"}
                            </button>
                          )}
                          {matchedClient && (
                            <button
                              className="outlineButton"
                              onClick={() =>
                                void copyToClipboard(
                                  buildClientPortalLink(matchedClient),
                                  "Portal link"
                                )
                              }
                            >
                              Copy Portal Link
                            </button>
                          )}
                          <button
                            className="outlineButton"
                            onClick={() => void markOrderIntakeReviewed(order)}
                            disabled={processing || !matchedClient}
                          >
                            Mark Intake Reviewed
                          </button>
                          <button
                            className="goldButton"
                            onClick={() => void assignOrderProgram(order)}
                            disabled={processing || !matchedProgram}
                          >
                            {processing ? "Working..." : "Load Program"}
                          </button>
                          <button
                            className="iconActionButton dangerIconButton"
                            onClick={() => void deleteProductOrder(order)}
                            disabled={processing}
                            title="Delete order"
                            aria-label={`Delete order ${
                              order.orderId || order.productName || ""
                            }`}
                          >
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </section>
    </>
  );
}
