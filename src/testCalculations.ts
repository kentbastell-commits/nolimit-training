// Test Library calculation registry. Each Calculation value on a canonical
// test maps to a small formula: labeled inputs -> a derived value + unit.
// Used by the Tests page live calculator now, and by results-driven athlete
// metrics / auto-prescription later — keep formulas pure and unit-explicit.

export type CalcInput = {
  key: string;
  labelEn: string;
  labelZh: string;
  placeholder: string;
};

export type CalcResult = {
  value: number;
  display: string;
  detailEn?: string;
  detailZh?: string;
};

export type TestCalculation = {
  inputs: CalcInput[];
  compute: (values: Record<string, number>) => CalcResult | null;
};

const round = (n: number, dp = 1) =>
  Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp);

const positive = (values: Record<string, number>, keys: string[]) =>
  keys.every((k) => Number.isFinite(values[k]) && values[k] > 0);

export const TEST_CALCULATIONS: Record<string, TestCalculation> = {
  // Estimated 1RM from a rep test (Epley). reps = 1 returns the load itself.
  "e1RM (Epley)": {
    inputs: [
      { key: "load", labelEn: "Load (kg)", labelZh: "重量 (kg)", placeholder: "140" },
      { key: "reps", labelEn: "Reps", labelZh: "次数", placeholder: "5" },
    ],
    compute: (v) => {
      if (!positive(v, ["load", "reps"]) || v.reps > 12) return null;
      const e1rm = v.reps === 1 ? v.load : v.load * (1 + v.reps / 30);
      return {
        value: round(e1rm, 1),
        display: `e1RM ≈ ${round(e1rm, 1)} kg`,
        detailEn: v.reps > 5 ? "Above 5 reps the estimate gets loose — retest with a heavier set when possible." : undefined,
        detailZh: v.reps > 5 ? "超过5次的估算偏差较大，条件允许时用更大重量复测。" : undefined,
      };
    },
  },
  // Maximal Aerobic Speed from a fixed-duration run (default the 5-min test).
  "MAS (m/s)": {
    inputs: [
      { key: "distance", labelEn: "Distance (m)", labelZh: "距离 (m)", placeholder: "1450" },
      { key: "seconds", labelEn: "Time (s)", labelZh: "时间 (s)", placeholder: "300" },
    ],
    compute: (v) => {
      if (!positive(v, ["distance", "seconds"])) return null;
      const mas = v.distance / v.seconds;
      const kmh = mas * 3.6;
      const paceSec = 1000 / mas;
      const pm = Math.floor(paceSec / 60);
      const ps = Math.round(paceSec % 60);
      return {
        value: round(mas, 2),
        display: `MAS ${round(mas, 2)} m/s · ${round(kmh, 1)} km/h`,
        detailEn: `100% MAS pace ≈ ${pm}:${String(ps).padStart(2, "0")} /km`,
        detailZh: `100% MAS 配速约 ${pm}:${String(ps).padStart(2, "0")} /公里`,
      };
    },
  },
  // Threshold pace from a time trial (default 2 km).
  "Pace (min/km)": {
    inputs: [
      { key: "minutes", labelEn: "Time (min)", labelZh: "时间 (分钟)", placeholder: "8.5" },
      { key: "km", labelEn: "Distance (km)", labelZh: "距离 (公里)", placeholder: "2" },
    ],
    compute: (v) => {
      if (!positive(v, ["minutes", "km"])) return null;
      const paceMin = v.minutes / v.km;
      const pm = Math.floor(paceMin);
      const ps = Math.round((paceMin - pm) * 60);
      const p88 = paceMin / 0.88;
      const p88m = Math.floor(p88);
      const p88s = Math.round((p88 - p88m) * 60);
      return {
        value: round(paceMin, 2),
        display: `TT pace ${pm}:${String(ps).padStart(2, "0")} /km`,
        detailEn: `88% of TT (threshold work) ≈ ${p88m}:${String(p88s).padStart(2, "0")} /km`,
        detailZh: `TT配速的88%（阈值训练）约 ${p88m}:${String(p88s).padStart(2, "0")} /公里`,
      };
    },
  },
  // Strength-to-weight (max hang, weighted pull-up...).
  "Relative (per kg)": {
    inputs: [
      { key: "result", labelEn: "Result (kg)", labelZh: "成绩 (kg)", placeholder: "40" },
      { key: "bodyweight", labelEn: "Bodyweight (kg)", labelZh: "体重 (kg)", placeholder: "75" },
    ],
    compute: (v) => {
      if (!positive(v, ["result", "bodyweight"])) return null;
      const rel = v.result / v.bodyweight;
      return {
        value: round(rel, 2),
        display: `${round(rel * 100, 0)}% of bodyweight (${round(rel, 2)}×)`,
      };
    },
  },
  // Reactive Strength Index.
  RSI: {
    inputs: [
      { key: "flight", labelEn: "Flight time (ms)", labelZh: "腾空时间 (ms)", placeholder: "520" },
      { key: "contact", labelEn: "Contact time (ms)", labelZh: "触地时间 (ms)", placeholder: "210" },
    ],
    compute: (v) => {
      if (!positive(v, ["flight", "contact"])) return null;
      const rsi = v.flight / v.contact;
      return {
        value: round(rsi, 2),
        display: `RSI ${round(rsi, 2)}`,
        detailEn: rsi >= 2.5 ? "Elite reactive range." : rsi >= 2.0 ? "Solid — box height can go up." : "Build stiffness before raising the box.",
        detailZh: rsi >= 2.5 ? "反应力达到高水平。" : rsi >= 2.0 ? "水平扎实，可提高跳箱高度。" : "先发展踝刚性，再增加跳箱高度。",
      };
    },
  },
  // Dynamic Strength Index: ballistic peak force / isometric peak force.
  "DSI (ratio)": {
    inputs: [
      { key: "ballistic", labelEn: "Ballistic peak force (N)", labelZh: "弹跳峰值力 (N)", placeholder: "2100" },
      { key: "isometric", labelEn: "IMTP peak force (N)", labelZh: "IMTP峰值力 (N)", placeholder: "3200" },
    ],
    compute: (v) => {
      if (!positive(v, ["ballistic", "isometric"])) return null;
      const dsi = v.ballistic / v.isometric;
      return {
        value: round(dsi, 2),
        display: `DSI ${round(dsi, 2)}`,
        detailEn: dsi < 0.6 ? "< 0.60 — prioritize ballistic / speed-strength work." : dsi <= 0.8 ? "0.60–0.80 — train strength and speed concurrently." : "> 0.80 — prioritize maximal strength.",
        detailZh: dsi < 0.6 ? "低于0.60——优先发展弹震/速度力量。" : dsi <= 0.8 ? "0.60–0.80——力量与速度并行发展。" : "高于0.80——优先发展最大力量。",
      };
    },
  },
  // Eccentric Utilization Ratio: CMJ / SJ.
  "EUR (ratio)": {
    inputs: [
      { key: "cmj", labelEn: "CMJ height (cm)", labelZh: "反向纵跳高度 (cm)", placeholder: "42" },
      { key: "sj", labelEn: "Squat jump height (cm)", labelZh: "静止蹲跳高度 (cm)", placeholder: "38" },
    ],
    compute: (v) => {
      if (!positive(v, ["cmj", "sj"])) return null;
      const eur = v.cmj / v.sj;
      return {
        value: round(eur, 2),
        display: `EUR ${round(eur, 2)}`,
        detailEn: eur >= 1.1 ? "Stretch-shortening cycle contributing well." : "Near 1.00 — reactive/plyometric training will pay off fastest.",
        detailZh: eur >= 1.1 ? "牵张-缩短循环利用良好。" : "接近1.00——反应力/增强式训练收益最大。",
      };
    },
  },
};

export const calculationFor = (name?: string): TestCalculation | null =>
  TEST_CALCULATIONS[String(name || "").trim()] || null;
