// Revenue — rebuilt in the light system (KPI board, revenue-by-stream, outstanding
// strip, 6-month bar chart, coach earnings, subscriptions, top programs + recent
// orders). View-layer only: every number is the same computation as before.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ProductOrder } from "./appCore";
import "./CoachRevenuePage.css";
import { Clock, DollarSign } from "lucide-react";
import { dateToInputValue } from "./appCore";

const AVATAR_PALETTE = [
  { bg: "#e8f0ff", fg: "#1f5fd6" },
  { bg: "#fdeaee", fg: "#a32f3e" },
  { bg: "#e9f6ee", fg: "#237a30" },
  { bg: "#f3ecfb", fg: "#6a2f9e" },
  { bg: "#fdf0e1", fg: "#9a6a12" },
  { bg: "#e6f6f7", fg: "#0c7382" },
];
function avatarColor(name: string) {
  let h = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
const initialsOf = (name: string) =>
  String(name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

export default function CoachRevenuePage(props: { [key: string]: any }) {
  const {
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
  } = props;

  const now = new Date();
  const isCoachScoped = coachScope !== "All Coaches";
  const scopedOrders = productOrders.filter(orderBelongsToCoachScope);
  const paidOrders = scopedOrders.filter(
    (o: any) => o.paymentStatus === "Paid" || o.paymentStatus === "paid",
  );

  const parseAmount = (o: ProductOrder) => parseFloat(o.amount || "0") || 0;

  const totalRevenue = paidOrders.reduce(
    (sum: any, o: any) => sum + parseAmount(o),
    0,
  );

  const thisMonthOrders = paidOrders.filter((o: any) => {
    const d = new Date(o.purchasedAt);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });
  const thisMonthRevenue = thisMonthOrders.reduce(
    (sum: any, o: any) => sum + parseAmount(o),
    0,
  );

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthOrders = paidOrders.filter((o: any) => {
    const d = new Date(o.purchasedAt);
    return (
      d.getFullYear() === lastMonthDate.getFullYear() &&
      d.getMonth() === lastMonthDate.getMonth()
    );
  });
  const lastMonthRevenue = lastMonthOrders.reduce(
    (sum: any, o: any) => sum + parseAmount(o),
    0,
  );
  const revenueGrowth =
    lastMonthRevenue > 0
      ? Math.round(
          ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100,
        )
      : null;

  const activeClientCount = coachVisibleClients.filter(
    (c: any) =>
      c.status === "Active" ||
      c.status === "Premium" ||
      c.status === "Online Coaching",
  ).length;

  const programCounts: Record<string, number> = {};
  paidOrders.forEach((o: any) => {
    if (o.productName)
      programCounts[o.productName] = (programCounts[o.productName] || 0) + 1;
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
        return (
          od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth()
        );
      })
      .reduce((sum: any, o: any) => sum + parseAmount(o), 0);
    return { month: label, revenue: Math.round(rev) };
  });

  const formatCurrency = (n: number) =>
    n >= 1000 ? `¥${(n / 1000).toFixed(1)}k` : `¥${Math.round(n)}`;

  // ---- revenue by stream (bucket collected orders on productType) ----
  const streamDefs = [
    {
      key: "coaching",
      label: "Online Coaching",
      accent: "#b5731a",
      match: /online coaching/i,
      sub: "recurring · attributed",
      noun: "active",
    },
    {
      key: "digital",
      label: "Digital · self-serve",
      accent: "#1f5fd6",
      match: /digital/i,
      sub: "hands-off, no onboarding",
      noun: "sales",
    },
    {
      key: "inperson",
      label: "In-person",
      accent: "#237a30",
      match: /in.?person/i,
      sub: "sessions & packs",
      noun: "sales",
    },
  ];
  const streamStats = streamDefs.map((def) => {
    const rows = paidOrders.filter((o: any) =>
      def.match.test(o.productType || ""),
    );
    return {
      ...def,
      amount: rows.reduce((s: number, o: any) => s + parseAmount(o), 0),
      count: rows.length,
    };
  });
  const streamTotal = streamStats.reduce((s, x) => s + x.amount, 0) || 1;

  // ---- outstanding (owed, not collected — excluded from paidOrders) ----
  // FLAG: no deposit/balance concept exists in the order schema, so deposit
  // balances are 0; "unpaid" = orders still Pending.
  const unpaidOrders = scopedOrders.filter((o: any) =>
    /pending/i.test(o.paymentStatus || ""),
  );
  const unpaidDue = unpaidOrders.reduce(
    (s: number, o: any) => s + parseAmount(o),
    0,
  );
  const depositDue = 0;
  const depositCount = 0;

  // ---- chart ----
  const chartMax = Math.max(...monthlyData.map((m) => m.revenue), 1);

  // ---- subscriptions ----
  const scopedSubs = subscriptions.filter(
    (s: any) =>
      coachScope === "All Coaches" || !s.coach || s.coach === coachScope,
  );
  const subCycleMonths = (label: string) =>
    /year|annual/i.test(label)
      ? 12
      : /6\s*month/i.test(label)
        ? 6
        : /3\s*month|quarter/i.test(label)
          ? 3
          : 1;
  const activeSubs = scopedSubs.filter(
    (s: any) => !/cancel|paused/i.test(s.status),
  );
  const mrrByCurrency: Record<string, number> = {};
  activeSubs.forEach((s: any) => {
    const m = (s.price || 0) / subCycleMonths(s.billingCycle);
    mrrByCurrency[s.currency || "CNY"] =
      (mrrByCurrency[s.currency || "CNY"] || 0) + m;
  });
  const overdueSubs = activeSubs.filter(
    (s: any) => subEffectiveStatus(s) === "Past Due",
  );
  const dueCutoff = dateToInputValue(new Date(Date.now() + 14 * 86400000));
  const dueSoonSubs = activeSubs.filter(
    (s: any) =>
      s.nextBillingDate &&
      s.nextBillingDate >= todayValue &&
      s.nextBillingDate <= dueCutoff,
  );
  const sortedActiveSubs = [...activeSubs].sort((a: any, b: any) =>
    (a.nextBillingDate || "9999").localeCompare(b.nextBillingDate || "9999"),
  );
  const curSymbol = (c: string) => (c === "USD" ? "$" : "¥");

  const topMax = topPrograms.length
    ? Math.max(...topPrograms.map(([, c]: any) => c))
    : 1;
  const recentOrders = paidOrders
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime(),
    )
    .slice(0, 8);

  return (
    <div className="crpPage">
      {/* header */}
      <div className="crpHead">
        <span className="crpEyebrow">
          <DollarSign size={14} /> Revenue
        </span>
        <h1>Revenue</h1>
        <p>Sales, recurring revenue, and your coaching earnings at a glance.</p>
      </div>

      {/* KPI board */}
      <div className="crpRevenueBoard">
        <div className="crpHero">
          <div className="crpHeroGlow" />
          <span className="crpHeroEyebrow">This month</span>
          <div className="crpHeroBig">
            <span>{formatCurrency(thisMonthRevenue)}</span>
            <span
              className={`crpGrowth${revenueGrowth !== null && revenueGrowth < 0 ? " neg" : ""}`}
            >
              {revenueGrowth !== null
                ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}% vs last month`
                : `${thisMonthOrders.length} orders`}
            </span>
          </div>
          <div className="crpHeroBreak">
            <span>
              <strong>{formatCurrency(totalRevenue)}</strong> total revenue
            </span>
            <span>
              <strong>{paidOrders.length}</strong> paid orders
            </span>
          </div>
        </div>
        <div className="crpSideCol">
          <div className="crpSideCard">
            <span className="crpSideK">Active clients</span>
            <div className="crpSideV">{activeClientCount}</div>
          </div>
          <div className="crpSideCard">
            <span className="crpSideK">Last month</span>
            <div className="crpSideV">{formatCurrency(lastMonthRevenue)}</div>
          </div>
        </div>
      </div>

      {/* revenue by stream */}
      <div className="crpStreams">
        {streamStats.map((st) => {
          const pct = Math.round((st.amount / streamTotal) * 100);
          return (
            <div
              className="crpStream"
              key={st.key}
              style={{ borderLeftColor: st.accent }}
            >
              <div className="crpStreamTop">
                <span className="crpStreamK" style={{ color: st.accent }}>
                  {st.label}
                </span>
                <span className="crpStreamPct">{pct}%</span>
              </div>
              <div className="crpStreamV">{formatCurrency(st.amount)}</div>
              <div className="crpStreamSub">
                {st.count.toLocaleString("en-US")} {st.noun} · {st.sub}
              </div>
              <div className="crpStreamBar">
                <div style={{ width: `${pct}%`, background: st.accent }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* outstanding */}
      <div className="crpOutstanding">
        <span className="crpOutK">
          <Clock size={15} /> Outstanding
        </span>
        {depositCount > 0 && (
          <>
            <div className="crpOutItem">
              <strong>{formatCurrency(depositDue)}</strong>
              <span>deposit balances · {depositCount} orders</span>
            </div>
            <div className="crpOutDivider" />
          </>
        )}
        <div className="crpOutItem">
          <strong className="crpOutRed">{formatCurrency(unpaidDue)}</strong>
          <span>unpaid · {unpaidOrders.length} orders</span>
        </div>
        <span className="crpOutNote">Not yet in collected revenue</span>
      </div>

      {/* chart */}
      <div className="crpCard crpChartCard">
        <div className="crpChartHead">
          <h2>Revenue — last 6 months</h2>
          <span className="crpChartUnit">CNY</span>
        </div>
        <div className="crpBars">
          {monthlyData.map((m, i) => (
            <div className="crpBarCol" key={m.month + i}>
              <span className="crpBarVal">{formatCurrency(m.revenue)}</span>
              <div
                className={`crpBar${i === monthlyData.length - 1 ? " cur" : ""}`}
                style={{
                  height: `${Math.max(2, Math.round((m.revenue / chartMax) * 130))}px`,
                }}
              />
              <span className="crpBarMonth">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* coach earnings */}
      {isCoachScoped && (
        <div className="crpEarnings">
          <div className="crpEarningsHead">
            <div>
              <span className="crpEyebrow">Coach portal</span>
              <h2>{coachScope} — earnings</h2>
            </div>
            <label className="crpShare">
              <span>Revenue share</span>
              <div className="crpShareInput">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={coachSharePercent}
                  onChange={(e) =>
                    setCoachSharePercent(
                      Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    )
                  }
                />
                <strong>%</strong>
              </div>
            </label>
          </div>
          <div className="crpEarningsGrid">
            <div className="crpEarnTile">
              <span>Attributed</span>
              <strong>{formatCurrency(totalRevenue)}</strong>
            </div>
            <div className="crpEarnTile">
              <span>This month</span>
              <strong>{formatCurrency(thisMonthRevenue)}</strong>
            </div>
            <div className="crpEarnTile">
              <span>Active clients</span>
              <strong>{activeClientCount}</strong>
            </div>
            <div className="crpEarnTile crpPayout">
              <span>Est. payout · {coachSharePercent}%</span>
              <strong>
                {formatCurrency((totalRevenue * coachSharePercent) / 100)}
              </strong>
              <em>
                This month{" "}
                {formatCurrency((thisMonthRevenue * coachSharePercent) / 100)}
              </em>
            </div>
          </div>
        </div>
      )}

      {/* subscriptions */}
      {scopedSubs.length > 0 && (
        <div className="crpCard crpSubs">
          <div className="crpSubsHead">
            <div>
              <span className="crpEyebrow">Recurring</span>
              <h2>Subscriptions</h2>
            </div>
            <div className="crpSubsMetrics">
              <div>
                <strong>{activeSubs.length}</strong>
                <small>Active</small>
              </div>
              {Object.entries(mrrByCurrency).map(([cur, amt]) => (
                <div key={cur}>
                  <strong>
                    {curSymbol(cur)}
                    {Math.round(amt as number)}
                  </strong>
                  <small>MRR ({cur})</small>
                </div>
              ))}
              <div>
                <strong className={overdueSubs.length ? "crpRed" : ""}>
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
            <div className="crpSubsList">
              {sortedActiveSubs.map((s: any) => {
                const c = clients.find(
                  (cl: any) =>
                    cl.clientCode === s.clientId ||
                    s.clientRecordIds.includes(cl.id),
                );
                const eff = subEffectiveStatus(s);
                const rel = relativeDue(s.nextBillingDate);
                const od = eff === "Past Due";
                const ac = avatarColor(c?.name || s.clientId || "");
                return (
                  <button
                    type="button"
                    key={s.id}
                    className="crpSubRow"
                    onClick={() => c && openAccountModal(c)}
                    aria-label={`Open account for ${c?.name || s.clientId || "client"}`}
                  >
                    <span
                      className="crpSubAv"
                      style={{ background: ac.bg, color: ac.fg }}
                    >
                      {initialsOf(c?.name || s.clientId || "?")}
                    </span>
                    <strong className="crpSubName">
                      {c?.name || s.clientId || "Client"}
                    </strong>
                    <span className="crpSubPlan">{s.plan}</span>
                    <span className="crpSubPrice">
                      {curSymbol(s.currency)}
                      {s.price}/{s.billingCycle}
                    </span>
                    <div className="crpSubDue">
                      <div>{s.nextBillingDate || "—"}</div>
                      {rel && (
                        <div className={`crpSubRel${od ? " od" : ""}`}>
                          {rel}
                        </div>
                      )}
                    </div>
                    <span className={`crpSubStatus${od ? " od" : ""}`}>
                      {eff}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* bottom grid */}
      <div className="crpBottom">
        <div className="crpCard">
          <h2 className="crpBottomH">Top programs</h2>
          {topPrograms.length === 0 ? (
            <p className="crpEmpty">No paid orders yet.</p>
          ) : (
            topPrograms.map(([name, count]: any) => (
              <div className="crpTopRow" key={name}>
                <strong>{name}</strong>
                <div className="crpTopBar">
                  <div
                    style={{ width: `${Math.round((count / topMax) * 100)}%` }}
                  />
                </div>
                <span className="crpTopCount">{count}</span>
              </div>
            ))
          )}
        </div>
        <div className="crpCard">
          <h2 className="crpBottomH">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <p className="crpEmpty">No paid orders yet.</p>
          ) : (
            recentOrders.map((o: any) => (
              <div className="crpRecentRow" key={o.recordId}>
                <div className="crpRecentMain">
                  <strong>{o.clientName || "—"}</strong>
                  <span>{o.productName || "—"}</span>
                </div>
                <span className="crpRecentAmt">¥{o.amount}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
