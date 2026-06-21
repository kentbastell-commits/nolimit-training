import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type WellnessPoint = { date: string; value: number; avg: number };

// Daily values (gold area) with a 7-day moving "weekly average" line overlaid.
// Lazy-loaded; shares the recharts chunk with the other charts.
export default function WellnessChart({
  points,
  locale,
  unit,
  dailyLabel,
  avgLabel,
}: {
  points: WellnessPoint[];
  locale: string;
  unit?: string;
  dailyLabel: string;
  avgLabel: string;
}) {
  const data = points.map((point) => ({
    ...point,
    label: new Date(`${point.date}T00:00:00`).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    }),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="wellnessGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#151515" stopOpacity={0.85} />
            <stop offset="95%" stopColor="#9f7a26" stopOpacity={0.06} />
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
          formatter={((value: any, name: any) => [
            `${value}${unit ? ` ${unit}` : ""}`,
            name === "avg" ? avgLabel : dailyLabel,
          ]) as any}
        />
        <Area
          type="monotone"
          dataKey="value"
          name="value"
          stroke="#111"
          strokeWidth={3}
          fill="url(#wellnessGold)"
          dot={{ r: 4, fill: "#111", stroke: "#d5b24c", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#d5b24c", stroke: "#111", strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="avg"
          name="avg"
          stroke="#d4af37"
          strokeWidth={2.5}
          strokeDasharray="5 4"
          dot={false}
          activeDot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
