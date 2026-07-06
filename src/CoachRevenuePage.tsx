// Extracted from App.tsx (monolith split) — body verbatim (was an IIFE).
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ProductOrder } from "./appCore";
import "./CoachRevenuePage.css";
import { Suspense } from "react";
import { dateToInputValue } from "./appCore";

export default function CoachRevenuePage({
  RevenueChart,
  t,
  clients,
  coachScope,
  coachSharePercent,
  coachVisibleClients,
  openAccountModal,
  orderBelongsToCoachScope,
  productOrders,
  relativeDue,
  setCoachSharePercent,
  subEffectiveStatus,
  subscriptions,
  todayValue,
}: { [key: string]: any }) {
              const now = new Date();
              const isCoachScoped = coachScope !== "All Coaches";
              const scopedOrders = productOrders.filter(orderBelongsToCoachScope);
              const paidOrders = scopedOrders.filter(
                (o: any) => o.paymentStatus === "Paid" || o.paymentStatus === "paid"
              );

              const parseAmount = (o: ProductOrder) => parseFloat(o.amount || "0") || 0;

              const totalRevenue = paidOrders.reduce((sum: any, o: any) => sum + parseAmount(o), 0);

              const thisMonthOrders = paidOrders.filter((o: any) => {
                const d = new Date(o.purchasedAt);
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
              });
              const thisMonthRevenue = thisMonthOrders.reduce((sum: any, o: any) => sum + parseAmount(o), 0);

              const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const lastMonthOrders = paidOrders.filter((o: any) => {
                const d = new Date(o.purchasedAt);
                return d.getFullYear() === lastMonthDate.getFullYear() && d.getMonth() === lastMonthDate.getMonth();
              });
              const lastMonthRevenue = lastMonthOrders.reduce((sum: any, o: any) => sum + parseAmount(o), 0);
              const revenueGrowth = lastMonthRevenue > 0
                ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
                : null;

              const activeClientCount = coachVisibleClients.filter(
                (c: any) => c.status === "Active" || c.status === "Premium" || c.status === "Online Coaching"
              ).length;

              const programCounts: Record<string, number> = {};
              paidOrders.forEach((o: any) => {
                if (o.productName) programCounts[o.productName] = (programCounts[o.productName] || 0) + 1;
              });
              const topPrograms = Object.entries(programCounts)
                .sort((a: any, b: any) => b[1] - a[1])
                .slice(0, 5);

              const monthlyData = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                const label = d.toLocaleString("default", { month: "short" });
                const rev = paidOrders
                  .filter((o: any) => {
                    const od = new Date(o.purchasedAt);
                    return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
                  })
                  .reduce((sum: any, o: any) => sum + parseAmount(o), 0);
                return { month: label, revenue: Math.round(rev) };
              });

              const formatCurrency = (n: number) =>
                n >= 1000 ? `¥${(n / 1000).toFixed(1)}k` : `¥${Math.round(n)}`;

              // Subscriptions (recurring revenue)
              const scopedSubs = subscriptions.filter(
                (s: any) =>
                  coachScope === "All Coaches" ||
                  !s.coach ||
                  s.coach === coachScope
              );
              const subCycleMonths = (label: string) =>
                /year|annual/i.test(label)
                  ? 12
                  : /6\s*month/i.test(label)
                  ? 6
                  : /3\s*month|quarter/i.test(label)
                  ? 3
                  : 1;
              // "Active" = anything not cancelled/paused (revenue-bearing).
              const activeSubs = scopedSubs.filter(
                (s: any) => !/cancel|paused/i.test(s.status)
              );
              const mrrByCurrency: Record<string, number> = {};
              activeSubs.forEach((s: any) => {
                const m = (s.price || 0) / subCycleMonths(s.billingCycle);
                mrrByCurrency[s.currency || "CNY"] =
                  (mrrByCurrency[s.currency || "CNY"] || 0) + m;
              });
              const overdueSubs = activeSubs.filter(
                (s: any) => subEffectiveStatus(s) === "Past Due"
              );
              const dueCutoff = dateToInputValue(
                new Date(Date.now() + 14 * 86400000)
              );
              const dueSoonSubs = activeSubs.filter(
                (s: any) =>
                  s.nextBillingDate &&
                  s.nextBillingDate >= todayValue &&
                  s.nextBillingDate <= dueCutoff
              );
              // Full active list: overdue first, then soonest next-billing.
              const sortedActiveSubs = [...activeSubs].sort((a: any, b: any) =>
                (a.nextBillingDate || "9999").localeCompare(
                  b.nextBillingDate || "9999"
                )
              );
              const curSymbol = (c: string) => (c === "USD" ? "$" : "¥");

              return (
                <section className="revenuePage">
                  {scopedSubs.length > 0 && (
                    <section className="tableCard subsPanel">
                      <div className="subsPanelHeader">
                        <div>
                          <span className="eyebrow">Recurring</span>
                          <h3>Subscriptions</h3>
                        </div>
                        <div className="subsMetrics">
                          <div>
                            <strong>{activeSubs.length}</strong>
                            <small>Active</small>
                          </div>
                          {Object.entries(mrrByCurrency).map(([cur, amt]) => (
                            <div key={cur}>
                              <strong>
                                {curSymbol(cur)}
                                {Math.round(amt)}
                              </strong>
                              <small>MRR ({cur})</small>
                            </div>
                          ))}
                          <div>
                            <strong
                              className={overdueSubs.length ? "subsOverdueNum" : ""}
                            >
                              {overdueSubs.length}
                            </strong>
                            <small>Overdue</small>
                          </div>
                          <div>
                            <strong>{dueSoonSubs.length}</strong>
                            <small>Due ≤14d</small>
                          </div>
                        </div>
                      </div>
                      {sortedActiveSubs.length > 0 && (
                        <div className="subsRenewList">
                          {sortedActiveSubs.map((s) => {
                            const c = clients.find(
                              (cl: any) =>
                                cl.clientCode === s.clientId ||
                                s.clientRecordIds.includes(cl.id)
                            );
                            const eff = subEffectiveStatus(s);
                            const rel = relativeDue(s.nextBillingDate);
                            return (
                              <div
                                key={s.id}
                                className="subsRenewRow clickableRow"
                                onClick={() => {
                                  if (c) openAccountModal(c);
                                }}
                              >
                                <strong>
                                  {c?.name || s.clientId || "Client"}
                                </strong>
                                <span>{s.plan}</span>
                                <span>
                                  {curSymbol(s.currency)}
                                  {s.price}/{s.billingCycle}
                                </span>
                                <span className="subsDue">
                                  {s.nextBillingDate || "—"}
                                  {rel && (
                                    <em
                                      className={`subsRel ${
                                        eff === "Past Due" ? "isOverdue" : ""
                                      }`}
                                    >
                                      {rel}
                                    </em>
                                  )}
                                </span>
                                <span
                                  className={`attentionChip subStatusChip status-${eff
                                    .toLowerCase()
                                    .replace(/\s+/g, "")}`}
                                >
                                  {eff}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}
                  <div className="revenueStatGrid">
                    <div className="revenueStat">
                      <span>This Month</span>
                      <strong>{formatCurrency(thisMonthRevenue)}</strong>
                      <small>
                        {revenueGrowth !== null
                          ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}% vs last month`
                          : `${thisMonthOrders.length} orders`}
                      </small>
                    </div>
                    <div className="revenueStat">
                      <span>Total Revenue</span>
                      <strong>{formatCurrency(totalRevenue)}</strong>
                      <small>{paidOrders.length} paid orders</small>
                    </div>
                    <div className="revenueStat">
                      <span>Active Clients</span>
                      <strong>{activeClientCount}</strong>
                      <small>Active + Premium + Online</small>
                    </div>
                    <div className="revenueStat">
                      <span>Last Month</span>
                      <strong>{formatCurrency(lastMonthRevenue)}</strong>
                      <small>{lastMonthOrders.length} orders</small>
                    </div>
                  </div>

                  {isCoachScoped && (
                    <div className="coachEarningsCard">
                      <div className="coachEarningsHeader">
                        <div>
                          <span className="eyebrow">Coach Portal</span>
                          <h3>{coachScope} — Earnings</h3>
                        </div>
                        <label className="coachShareControl">
                          <span>Revenue share</span>
                          <div>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={coachSharePercent}
                              onChange={(e) =>
                                setCoachSharePercent(
                                  Math.max(
                                    0,
                                    Math.min(100, Number(e.target.value) || 0)
                                  )
                                )
                              }
                            />
                            <strong>%</strong>
                          </div>
                        </label>
                      </div>
                      <div className="coachEarningsGrid">
                        <div className="coachEarningsStat">
                          <span>Attributed Revenue</span>
                          <strong>{formatCurrency(totalRevenue)}</strong>
                          <small>{paidOrders.length} paid orders</small>
                        </div>
                        <div className="coachEarningsStat">
                          <span>This Month</span>
                          <strong>{formatCurrency(thisMonthRevenue)}</strong>
                          <small>{thisMonthOrders.length} orders</small>
                        </div>
                        <div className="coachEarningsStat">
                          <span>Active Clients</span>
                          <strong>{activeClientCount}</strong>
                          <small>Active + Premium + Online</small>
                        </div>
                        <div className="coachEarningsStat coachEarningsPayout">
                          <span>Est. Payout ({coachSharePercent}%)</span>
                          <strong>
                            {formatCurrency(
                              (totalRevenue * coachSharePercent) / 100
                            )}
                          </strong>
                          <small>
                            This month:{" "}
                            {formatCurrency(
                              (thisMonthRevenue * coachSharePercent) / 100
                            )}
                          </small>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="revenueChartCard">
                    <h3>Revenue — Last 6 Months</h3>
                    <Suspense
                      fallback={<div className="chartLoading">{t("loading")}</div>}
                    >
                      <RevenueChart data={monthlyData} />
                    </Suspense>
                  </div>

                  <div className="revenueBottomGrid">
                    <div className="revenueTableCard">
                      <h3>Top Programs</h3>
                      {topPrograms.length === 0 ? (
                        <p className="emptyTableMessage">No paid orders yet.</p>
                      ) : (
                        <table className="revenueTable">
                          <thead>
                            <tr>
                              <th>Program</th>
                              <th>Orders</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topPrograms.map(([name, count]) => (
                              <tr key={name}>
                                <td>{name}</td>
                                <td>{count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div className="revenueTableCard">
                      <h3>Recent Orders</h3>
                      {paidOrders.length === 0 ? (
                        <p className="emptyTableMessage">No paid orders yet.</p>
                      ) : (
                        <table className="revenueTable">
                          <thead>
                            <tr>
                              <th>Client</th>
                              <th>Program</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paidOrders
                              .slice()
                              .sort((a: any, b: any) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
                              .slice(0, 8)
                              .map((o: any) => (
                                <tr key={o.recordId}>
                                  <td>{o.clientName || "—"}</td>
                                  <td>{o.productName || "—"}</td>
                                  <td>¥{o.amount}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </section>
              );
}
