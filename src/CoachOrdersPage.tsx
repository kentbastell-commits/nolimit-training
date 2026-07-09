// Orders — restructured by relationship type (the design decision): self-serve
// digital collapses to a roll-up that links to Digital; a segmented control
// splits Online Coaching (onboarding + coach assignment) from In-person (a money
// ledger). View-layer restructure wired to the existing handlers.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import "./CoachOrdersPage.css";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Clock,
  Monitor,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

const AV = [
  ["#e8f0ff", "#1f5fd6"],
  ["#f4ecd8", "#b5731a"],
  ["#eafaef", "#237a30"],
  ["#fbe9ec", "#8b1e2d"],
  ["#f3ecfb", "#6a2f9e"],
  ["#e6f6f7", "#0c7382"],
];
const initialsOf = (name: string) =>
  String(name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
const COACH_CAP = 12; // FLAG: coach capacity isn't in the Coach record — default.

export default function CoachOrdersPage(props: { [key: string]: any }) {
  const {
    activeCoaches,
    buildClientPortalLink,
    copyToClipboard,
    createManualProductOrder,
    deleteProductOrder,
    getContentResponseLabel,
    getOrderClient,
    getOrderStartDate,
    loadProductOrders,
    manualOrder,
    markOrderIntakeReviewed,
    openOrderReview,
    orderProcessingId,
    orderReviewLoading,
    orderReviewOrder,
    orderReviewResponses,
    orderSearch,
    reviewAndLoadProgram,
    savingManualOrder,
    setManualOrder,
    setOrderReviewOrder,
    setOrderSearch,
    setShowManualOrderForm,
    showManualOrderForm,
    updateProductOrder,
    visibleProductOrders,
  } = props;

  const reduce = useReducedMotion();
  const [segment, setSegment] = useState<"online" | "inperson">("online");
  const [onFilter, setOnFilter] = useState<"all" | "coach" | "intake" | "active">("all");
  const [ipFilter, setIpFilter] = useState<"all" | "Paid" | "Pending" | "Refunded">("all");
  const [assignTarget, setAssignTarget] = useState<any>(null);

  const orders = (visibleProductOrders as any[]) || [];
  const money = (amt: any, cur?: string) =>
    `${cur || "CNY"} ${Number(amt || 0).toLocaleString("en-US")}`;
  const intakeDone = (o: any) =>
    /submitted|reviewed|received|complete|done/i.test(o.intakeStatus || "");
  const isPaid = (o: any) => /^paid$/i.test(o.paymentStatus || "");
  const isPending = (o: any) => /pending/i.test(o.paymentStatus || "");
  const coachOf = (o: any) => (o.assignedCoach || "").trim();
  const termOf = (o: any) => {
    const pn = String(o.productName || "");
    const parts = pn.split(/[—–]|·|\|/).map((s) => s.trim()).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : pn || "Coaching";
  };

  const online = orders.filter((o) => /online coaching/i.test(o.productType || ""));
  const inperson = orders.filter((o) => /in.?person/i.test(o.productType || ""));
  const digital = orders.filter((o) => /digital/i.test(o.productType || ""));

  // ---- digital roll-up ----
  const digSales = digital.length;
  const digRevenue = digital.reduce((a, o) => a + (Number(o.amount) || 0), 0);

  // ---- online board ----
  const awaitingCoach = online.filter((o) => !coachOf(o)).length;
  const intakePending = online.filter((o) => !intakeDone(o)).length;
  const onActive = online.filter((o) => coachOf(o) && intakeDone(o)).length;
  const onQueue = online.filter((o) => !coachOf(o) || !intakeDone(o)).length;

  let onList = online;
  if (onFilter === "coach") onList = online.filter((o) => !coachOf(o));
  else if (onFilter === "intake") onList = online.filter((o) => !intakeDone(o));
  else if (onFilter === "active") onList = online.filter((o) => coachOf(o) && intakeDone(o));

  // ---- in-person board (real paymentStatus — no deposit concept in the data) ----
  const collected = inperson.filter(isPaid).reduce((a, o) => a + (Number(o.amount) || 0), 0);
  const outstanding = inperson.filter(isPending).reduce((a, o) => a + (Number(o.amount) || 0), 0);
  const refunded = inperson
    .filter((o) => /refund/i.test(o.paymentStatus || ""))
    .reduce((a, o) => a + (Number(o.amount) || 0), 0);
  const pendingCount = inperson.filter(isPending).length;
  const refundCount = inperson.filter((o) => /refund/i.test(o.paymentStatus || "")).length;

  let ipList = inperson;
  if (ipFilter !== "all")
    ipList = inperson.filter((o) =>
      ipFilter === "Refunded"
        ? /refund/i.test(o.paymentStatus || "")
        : new RegExp(`^${ipFilter}$`, "i").test(o.paymentStatus || "")
    );

  // Coach assignment — writes `coach` via updateProductOrder's patch path.
  // FLAG: /api/updateProductOrder must accept `coach` (added) to persist.
  const assignOrderCoach = async (order: any, coach: any) => {
    setAssignTarget(null);
    // "Assign Coach" is a DuplexLink column → send the coach record id so the
    // API can write [recordId] (name is the text fallback for non-link setups).
    await updateProductOrder(order, {
      coach: coach.name,
      coachRecordId: coach.recordId,
    });
  };

  const closeReview = () => setOrderReviewOrder(null);

  const fade = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const goDigital = (e: any) => {
    // CoachOrdersPage isn't passed a tab-nav callback, so the roll-up links to
    // the Digital route the app already uses. FLAG: full-load nav, not in-SPA.
    e.preventDefault();
    window.location.assign("/?view=coach&page=Digital");
  };

  return (
    <div className="copPage">
      {/* header */}
      <div className="copHead">
        <span className="copEyebrow">
          <ShoppingBag size={14} /> Orders
        </span>
        <h1>Orders</h1>
        <p>
          Coaching relationships and in-person sales. Self-serve digital sales live
          in Digital.
        </p>
      </div>

      {/* digital roll-up */}
      <a href="/?view=coach&page=Digital" className="copDigital" onClick={goDigital}>
        <span className="copDigitalIcon">
          <Monitor size={21} />
        </span>
        <span className="copDigitalCopy">
          <span className="copDigitalEyebrow">Digital programs · self-serve</span>
          <span className="copDigitalLine">
            <strong>{digSales} sales</strong> · <strong>{money(digRevenue)}</strong>{" "}
            · hands-off, no onboarding
          </span>
        </span>
        <span className="copDigitalLink">
          View in Digital <ChevronRight size={16} />
        </span>
      </a>

      {/* segmented control */}
      <div className="copSeg">
        {[
          { k: "online" as const, label: "Online Coaching", count: online.length },
          { k: "inperson" as const, label: "In-person", count: inperson.length },
        ].map((t) => (
          <button
            key={t.k}
            className={`copSegBtn${segment === t.k ? " on" : ""}`}
            onClick={() => setSegment(t.k)}
          >
            <span>{t.label}</span>
            <span className="copSegCount">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ===================== ONLINE ===================== */}
      {segment === "online" && (
        <div className="copFadeIn">
          <div className="copBoard">
            <div className="copBoardDark">
              <div className="copBoardGlow" />
              <span className="copBoardEyebrow">Onboarding queue</span>
              <div className="copBoardBig">
                <span>{onQueue}</span>
                <small>athletes need attention</small>
              </div>
              <div className="copBoardBreak">
                <span><strong>{awaitingCoach}</strong> awaiting coach</span>
                <span><strong>{intakePending}</strong> questionnaire pending</span>
              </div>
            </div>
            <div className="copBoardLight">
              <span className="copBoardEyebrowGreen">Active this month</span>
              <div className="copBoardBig">
                <span className="copBoardBigDark">{onActive}</span>
                <small>coaching athletes</small>
              </div>
              <p>Paid, coach assigned, plan running.</p>
            </div>
          </div>

          <div className="copFilters">
            <div className="copFilterTabs">
              {[
                { k: "all", l: `All · ${online.length}` },
                { k: "coach", l: `Awaiting coach · ${awaitingCoach}` },
                { k: "intake", l: `Questionnaire pending · ${intakePending}` },
                { k: "active", l: `Active · ${onActive}` },
              ].map((t) => (
                <button
                  key={t.k}
                  className={`copFilterTab${onFilter === t.k ? " on" : ""}`}
                  onClick={() => setOnFilter(t.k as any)}
                >
                  {t.l}
                </button>
              ))}
            </div>
            <div className="copSearch">
              <Search size={16} />
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search athletes, orders…"
              />
            </div>
          </div>

          {onList.length === 0 ? (
            <div className="copEmpty">
              <p className="copEmptyTitle">No coaching orders here</p>
              <p className="copEmptySub">
                New coaching purchases land in this queue for onboarding.
              </p>
            </div>
          ) : (
            onList.map((o: any, i: number) => {
              const done = intakeDone(o);
              const coach = coachOf(o);
              const av = AV[i % AV.length];
              const processing = orderProcessingId === o.recordId;
              const client = getOrderClient(o);
              return (
                <div className="copCard" key={o.recordId || o.orderId}>
                  <div className="copCardTop">
                    <div className="copCardWho">
                      <div className="copAvatar" style={{ background: av[0], color: av[1] }}>
                        {initialsOf(o.clientName)}
                      </div>
                      <div>
                        <div className="copCardName">
                          <h3>{o.clientName || "Unnamed athlete"}</h3>
                          <span className="copTerm">{termOf(o)}</span>
                        </div>
                        <div className="copCardMeta">
                          starts {getOrderStartDate(o) || "—"} · {o.orderId || "no ID"}
                        </div>
                      </div>
                    </div>
                    {isPaid(o) ? (
                      <span className="copPaidChip">
                        <Check size={12} /> Paid {money(o.amount, o.currency)}
                      </span>
                    ) : (
                      <span className="copPendChip">
                        <Clock size={12} /> {o.paymentStatus || "Pending"}
                        <button
                          type="button"
                          className="copVerify"
                          title={
                            o.paymentReference
                              ? `Confirm WeChat payment note ${o.paymentReference}`
                              : "Mark payment verified"
                          }
                          onClick={() =>
                            void updateProductOrder(o, { paymentStatus: "Paid" })
                          }
                        >
                          <Check size={12} /> Verify
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="copStrip">
                    <div className={`copStripTile${done ? " ok" : " warn"}`}>
                      <span className={`copStripDot${done ? " ok" : " warn"}`}>
                        {done ? <Check size={11} /> : <Clock size={11} />}
                      </span>
                      <div>
                        <span className="copStripK">Questionnaire</span>
                        <strong>{done ? "Complete" : "Pending — qualifier only"}</strong>
                      </div>
                    </div>
                    <div className={`copStripTile${coach ? " ok" : " bad"}`}>
                      <span className={`copStripDot${coach ? " ok" : " bad"}`}>
                        {coach ? <Check size={11} /> : <X size={11} />}
                      </span>
                      <div>
                        <span className="copStripK">Coach</span>
                        <strong className={coach ? "" : "copBadText"}>
                          {coach || "Unassigned"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="copCardFoot">
                    <div className="copFootMeta">
                      Purchased <strong>{o.purchasedAt || "—"}</strong>
                    </div>
                    <div className="copFootActions">
                      <button
                        type="button"
                        className="copGhostBtn"
                        onClick={() => void openOrderReview(o)}
                      >
                        Review intake
                      </button>
                      {!coach ? (
                        <button
                          type="button"
                          className="copGoldBtn"
                          onClick={() => setAssignTarget(o)}
                        >
                          Assign coach
                        </button>
                      ) : done ? (
                        <button
                          type="button"
                          className="copGhostBtn"
                          disabled={!client}
                          onClick={() =>
                            client && window.open(buildClientPortalLink(client), "_blank")
                          }
                        >
                          Open client
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="copGhostBtn"
                          disabled={processing || !client}
                          onClick={() =>
                            client &&
                            void copyToClipboard(
                              buildClientPortalLink(client),
                              "Portal link"
                            )
                          }
                        >
                          Nudge questionnaire
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===================== IN-PERSON ===================== */}
      {segment === "inperson" && (
        <div className="copFadeIn">
          <div className="copKpis">
            <div className="copKpi">
              <span className="copKpiK copKpiGreen">Collected</span>
              <div className="copKpiV">{money(collected)}</div>
              <p>Paid in full</p>
            </div>
            <div className="copKpi">
              <span className="copKpiK copKpiAmber">Outstanding</span>
              <div className="copKpiV">{money(outstanding)}</div>
              <p>{pendingCount} pending</p>
            </div>
            <div className="copKpi">
              <span className="copKpiK copKpiRed">Refunded</span>
              <div className="copKpiV">{money(refunded)}</div>
              <p>{refundCount} refunded</p>
            </div>
          </div>

          <div className="copToolbar">
            <div className="copFilterTabs">
              {[
                { k: "all", l: `All · ${inperson.length}` },
                { k: "Paid", l: "Paid" },
                { k: "Pending", l: `Pending · ${pendingCount}` },
                { k: "Refunded", l: `Refunded · ${refundCount}` },
              ].map((t) => (
                <button
                  key={t.k}
                  className={`copFilterTab${ipFilter === t.k ? " on" : ""}`}
                  onClick={() => setIpFilter(t.k as any)}
                >
                  {t.l}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="copNewBtn"
              onClick={() => {
                setManualOrder({ ...manualOrder, productType: "In-Person Training" });
                setShowManualOrderForm(true);
              }}
            >
              <Plus size={16} /> New in-person order
            </button>
          </div>

          <div className="copLedger">
            {ipList.length === 0 ? (
              <div className="copLedgerEmpty">
                <p className="copEmptyTitle">No in-person orders</p>
                <p className="copEmptySub">
                  Log a session or package sale with “New in-person order”.
                </p>
              </div>
            ) : (
              ipList.map((o: any) => (
                <div className="copRow" key={o.recordId || o.orderId}>
                  <div className="copRowMain">
                    <div className="copRowLabel">{o.clientName || o.productName || "Order"}</div>
                    <div className="copRowItem">{o.productName || "In-person"}</div>
                  </div>
                  <div className="copRowMid">
                    <div>{o.purchasedAt || "—"}</div>
                    <div>{o.paymentProvider || "—"}</div>
                  </div>
                  <div className="copRowAmt">{money(o.amount, o.currency)}</div>
                  <div className="copRowEnd">
                    <span
                      className={`copStatusChip ${
                        isPaid(o) ? "paid" : isPending(o) ? "pending" : "other"
                      }`}
                    >
                      {o.paymentStatus || "—"}
                    </span>
                    {!isPaid(o) && (
                      <button
                        type="button"
                        className="copMarkPaid"
                        onClick={() => void updateProductOrder(o, { paymentStatus: "Paid" })}
                      >
                        Mark paid
                      </button>
                    )}
                    <button
                      type="button"
                      className="copTrash"
                      title="Delete order"
                      onClick={() => void deleteProductOrder(o)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button type="button" className="copReload" onClick={loadProductOrders}>
            Reload orders
          </button>
        </div>
      )}

      {/* ===== assign-coach modal ===== */}
      <AnimatePresence>
        {assignTarget && (
          <motion.div
            className="copModalScrim"
            onClick={() => setAssignTarget(null)}
            {...fade}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="copModal"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <div className="copModalHead">
                <div>
                  <span className="copEyebrowSm">Assign coach</span>
                  <h2>{assignTarget.clientName || "Athlete"}</h2>
                  <p className="copModalMeta">
                    {termOf(assignTarget)} · {assignTarget.orderId || "no ID"}
                  </p>
                </div>
                <button className="copModalClose" onClick={() => setAssignTarget(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="copModalBody">
                <div className="copPickLabel">Pick a coach</div>
                <div className="copCoachList">
                  {(activeCoaches as any[]).map((c: any) => {
                    const load = online.filter((o) => coachOf(o) === c.name).length;
                    const pct = Math.min(100, Math.round((load / COACH_CAP) * 100));
                    const barColor = pct >= 90 ? "#c0546a" : pct >= 70 ? "#c79a2e" : "#2f9e55";
                    return (
                      <button
                        key={c.recordId || c.name}
                        className="copCoachRow"
                        onClick={() => void assignOrderCoach(assignTarget, c)}
                      >
                        <span className="copCoachAv">{initialsOf(c.name)}</span>
                        <span className="copCoachMain">
                          <span className="copCoachName">
                            <strong>{c.name}</strong>
                            <em>{c.role || "Coach"}</em>
                          </span>
                          <span className="copCoachBarRow">
                            <span className="copCoachBar">
                              <span style={{ width: `${pct}%`, background: barColor }} />
                            </span>
                            <span className="copCoachLoad">{load}/{COACH_CAP} athletes</span>
                          </span>
                        </span>
                        <ChevronRight size={18} className="copCoachChev" />
                      </button>
                    );
                  })}
                </div>
                <div className="copModalActions">
                  <button className="copGhostBtn" onClick={() => setAssignTarget(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== intake review slide-over ===== */}
      <AnimatePresence>
        {orderReviewOrder && (
          <motion.div
            className="copSlideScrim"
            onClick={closeReview}
            {...fade}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="copSlide"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <div className="copSlideHead">
                <div>
                  <span className="copEyebrowSm">
                    Coaching · {coachOf(orderReviewOrder) || "unassigned"}
                  </span>
                  <h2>{orderReviewOrder.clientName || "Unnamed client"}</h2>
                  <div className="copSlideSub">
                    {termOf(orderReviewOrder)} · {orderReviewOrder.orderId || "no ID"}
                  </div>
                </div>
                <button className="copModalClose" onClick={closeReview}>
                  <X size={17} />
                </button>
              </div>
              <div className="copSlideBody">
                <div className="copFacts">
                  <div>
                    <span>Questionnaire</span>
                    <strong className={intakeDone(orderReviewOrder) ? "copGreen" : "copAmber"}>
                      {intakeDone(orderReviewOrder) ? "Complete" : "Qualifier only"}
                    </strong>
                  </div>
                  <div>
                    <span>Coach</span>
                    <strong className={coachOf(orderReviewOrder) ? "" : "copBadText"}>
                      {coachOf(orderReviewOrder) || "Unassigned"}
                    </strong>
                  </div>
                </div>

                <div className="copRespLabel">Intake responses</div>
                {orderReviewLoading ? (
                  <p className="copMuted">Loading intake responses…</p>
                ) : (orderReviewResponses as any[]).length === 0 ? (
                  <p className="copMuted">No intake submission found yet.</p>
                ) : (
                  <div className="copResponses">
                    {(orderReviewResponses as any[]).map((submission: any) => (
                      <div className="copRespGroup" key={submission.key}>
                        {submission.answers.map((answer: any) => (
                          <div className="copRespRow" key={answer.recordId || answer.responseId}>
                            <span>{getContentResponseLabel(answer)}</span>
                            <strong>
                              {answer.answer || "—"}
                              {answer.unit ? ` ${answer.unit}` : ""}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                <div className="copSlideFoot">
                  <button className="copGhostBtn" onClick={closeReview}>
                    Close
                  </button>
                  <button
                    className="copGoldBtn"
                    disabled={
                      orderProcessingId === orderReviewOrder.recordId ||
                      !getOrderClient(orderReviewOrder)
                    }
                    onClick={() =>
                      getOrderClient(orderReviewOrder)
                        ? void reviewAndLoadProgram(orderReviewOrder)
                        : void markOrderIntakeReviewed(orderReviewOrder)
                    }
                  >
                    Reviewed + build plan
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== new in-person order modal (real manualOrder fields) ===== */}
      <AnimatePresence>
        {showManualOrderForm && (
          <motion.div
            className="copModalScrim"
            onClick={() => setShowManualOrderForm(false)}
            {...fade}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="copModal copModalWide"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <div className="copModalHead">
                <div>
                  <span className="copEyebrowSm">In-person</span>
                  <h2>New in-person order</h2>
                  <p className="copModalMeta">
                    A record for a session or package sold in person.
                  </p>
                </div>
                <button className="copModalClose" onClick={() => setShowManualOrderForm(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="copModalBody">
                <div className="copFormGrid">
                  <label>
                    <span>Client name</span>
                    <input
                      value={manualOrder.clientName}
                      onChange={(e) => setManualOrder({ ...manualOrder, clientName: e.target.value })}
                      placeholder="Name or session label"
                    />
                  </label>
                  <label>
                    <span>Phone / WeChat</span>
                    <input
                      value={manualOrder.phone}
                      onChange={(e) => setManualOrder({ ...manualOrder, phone: e.target.value })}
                      placeholder="Optional"
                    />
                  </label>
                  <label>
                    <span>What they bought</span>
                    <input
                      value={manualOrder.productName}
                      onChange={(e) => setManualOrder({ ...manualOrder, productName: e.target.value })}
                      placeholder="e.g. 10-session PT pack"
                    />
                  </label>
                  <label>
                    <span>Purchase date</span>
                    <input
                      type="date"
                      value={manualOrder.purchasedAt}
                      onChange={(e) => setManualOrder({ ...manualOrder, purchasedAt: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>Amount</span>
                    <input
                      value={manualOrder.amount}
                      onChange={(e) => setManualOrder({ ...manualOrder, amount: e.target.value })}
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </label>
                  <label>
                    <span>Currency</span>
                    <select
                      value={manualOrder.currency}
                      onChange={(e) => setManualOrder({ ...manualOrder, currency: e.target.value })}
                    >
                      <option>CNY</option>
                      <option>USD</option>
                      <option>CAD</option>
                    </select>
                  </label>
                  <label>
                    <span>Method</span>
                    <select
                      value={manualOrder.paymentProvider}
                      onChange={(e) => setManualOrder({ ...manualOrder, paymentProvider: e.target.value })}
                    >
                      <option>WeChat QR</option>
                      <option>Alipay QR</option>
                      <option>Bank Transfer</option>
                      <option>Cash</option>
                      <option>External Payment</option>
                    </select>
                  </label>
                  <label>
                    <span>Payment status</span>
                    <select
                      value={manualOrder.paymentStatus}
                      onChange={(e) => setManualOrder({ ...manualOrder, paymentStatus: e.target.value })}
                    >
                      <option>Paid</option>
                      <option>Pending</option>
                      <option>Comped</option>
                      <option>Refunded</option>
                    </select>
                  </label>
                  <label>
                    <span>Coach</span>
                    <select
                      value={manualOrder.assignedCoach}
                      onChange={(e) => setManualOrder({ ...manualOrder, assignedCoach: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {(activeCoaches as any[]).map((c: any) => (
                        <option key={c.recordId || c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Reference</span>
                    <input
                      value={manualOrder.paymentReference}
                      onChange={(e) => setManualOrder({ ...manualOrder, paymentReference: e.target.value })}
                      placeholder="Receipt or note"
                    />
                  </label>
                </div>
                <label className="copFormFull">
                  <span>Notes <em>(optional)</em></span>
                  <textarea
                    value={manualOrder.notes}
                    onChange={(e) => setManualOrder({ ...manualOrder, notes: e.target.value })}
                    placeholder="e.g. Balance due at first session."
                  />
                </label>
                <div className="copModalActions">
                  <button className="copGhostBtn" onClick={() => setShowManualOrderForm(false)}>
                    Cancel
                  </button>
                  <button
                    className="copDarkBtn"
                    disabled={savingManualOrder}
                    onClick={() => void createManualProductOrder(false)}
                  >
                    {savingManualOrder ? "Saving…" : "Save order"}
                  </button>
                  <button
                    className="copGoldBtn"
                    disabled={savingManualOrder}
                    onClick={() => void createManualProductOrder(true)}
                  >
                    {savingManualOrder ? "Saving…" : "Save + send intake"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
