import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ProgressPoint = { date: string; value: number | string };

// Lazy-loaded (shares the recharts chunk with RevenueChart).
export default function ProgressChart({
  points,
  locale,
  unit,
}: {
  points: ProgressPoint[];
  locale: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart
        data={points.map((point) => ({
          ...point,
          label: new Date(`${point.date}T00:00:00`).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
          }),
        }))}
        margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
      >
        <defs>
          <linearGradient id="progressGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#151515" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#9f7a26" stopOpacity={0.08} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e5dfd2" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#68645d", fontSize: 11, fontWeight: 800 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#68645d", fontSize: 11, fontWeight: 800 }}
        />
        <Tooltip
          contentStyle={{
            border: "1px solid #d8d1c4",
            borderRadius: 10,
            color: "#111",
            fontWeight: 800,
          }}
          formatter={(value) => [
            `${value}${unit ? ` ${unit}` : ""}`,
            "Result",
          ]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#111"
          strokeWidth={3}
          fill="url(#progressGold)"
          dot={{ r: 4, fill: "#111", stroke: "#d5b24c", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#d5b24c", stroke: "#111", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
