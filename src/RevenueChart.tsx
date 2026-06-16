import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlyRevenue = { month: string; revenue: number };

// Lazy-loaded so recharts (~100kB+) isn't in the main bundle — it only loads
// when a coach opens the Revenue page.
export default function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={36}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.1)" />
        <XAxis dataKey="month" stroke="#888" tick={{ fill: "#888", fontSize: 12 }} />
        <YAxis
          stroke="#888"
          tick={{ fill: "#888", fontSize: 12 }}
          tickFormatter={(v) => `¥${v}`}
        />
        <Tooltip
          contentStyle={{
            background: "#0e0a04",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 8,
          }}
          labelStyle={{ color: "#f5d77b" }}
          formatter={(v: unknown) => `¥${v as number}`}
        />
        <Bar dataKey="revenue" fill="#d4af37" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
