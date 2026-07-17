// Test → athlete-metric pipeline: turns a physical-test result entry into a
// calculated metric (1RM, MAS, VO2max, …). Backend-agnostic — moved verbatim
// from api/submitContentResponse.ts and shared by both impls.

export function parseNumbers(value: string) {
  return (String(value).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}

export function parseDurationSeconds(value: string) {
  const text = String(value || "").trim();
  const timeMatch = text.match(/(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.\d+)?/);
  if (timeMatch) {
    const hours = Number(timeMatch[1] || 0);
    const minutes = Number(timeMatch[2] || 0);
    const seconds = Number(timeMatch[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:min|minute|minutes|分钟)/i);
  const secondMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:sec|second|seconds|秒|s)/i);
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const seconds = secondMatch ? Number(secondMatch[1]) : 0;
  if (minutes || seconds) return minutes * 60 + seconds;

  const numeric = Number(text);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function calculateMetric(params: {
  value: string;
  notes?: string;
  label?: string;
  method?: string;
  metricUnit?: string;
}) {
  const sourceText = [params.value, params.notes, params.label].filter(Boolean).join(" ");
  const method = String(params.method || "Direct Value").toLowerCase();
  const numbers = parseNumbers(sourceText);

  if (method.includes("epley") || method.includes("brzycki")) {
    const weight = numbers[0];
    const reps =
      numbers[1] ||
      Number(String(params.label || "").match(/(\d+)\s*rm/i)?.[1] || "") ||
      1;
    if (!weight || !reps) return null;

    if (method.includes("brzycki")) {
      return Math.round((weight * (36 / (37 - reps))) * 10) / 10;
    }

    return Math.round((weight * (1 + reps / 30)) * 10) / 10;
  }

  if (method.includes("pace") || method.includes("min/km")) {
    const seconds = parseDurationSeconds(sourceText);
    if (!seconds) return null;

    // Distance in km: explicit "Xkm" / "X m", else assume the 2km test.
    const kmMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*km/i);
    const mMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*m(?![a-z/])/i);
    const distanceKm = kmMatch
      ? Number(kmMatch[1])
      : mMatch
        ? Number(mMatch[1]) / 1000
        : 2;
    if (!distanceKm) return null;

    const minutesPerKm = seconds / 60 / distanceKm;
    return Math.round(minutesPerKm * 100) / 100;
  }

  if (
    method.includes("2km") ||
    method.includes("aerobic speed") ||
    method.includes("mas")
  ) {
    const seconds = parseDurationSeconds(sourceText);
    if (!seconds) return null;

    const speedMetersPerSecond = 2000 / seconds;
    const unit = String(params.metricUnit || "").toLowerCase();
    const value = unit.includes("m/s")
      ? speedMetersPerSecond
      : speedMetersPerSecond * 3.6;
    return Math.round(value * 100) / 100;
  }

  if (method.includes("lactate") || method.includes("threshold")) {
    // Threshold pace -> speed in km/h.
    const seconds = parseDurationSeconds(sourceText);
    const kmMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*km/i);
    const mMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*m(?![a-z/])/i);
    const distanceKm = kmMatch
      ? Number(kmMatch[1])
      : mMatch
        ? Number(mMatch[1]) / 1000
        : NaN;
    // A time-trial (distance + time) -> average speed.
    if (seconds && Number.isFinite(distanceKm) && distanceKm > 0) {
      return Math.round((distanceKm / (seconds / 3600)) * 100) / 100;
    }
    // A pace entered as m:ss (per km) -> speed.
    if (seconds) {
      return Math.round((3600 / seconds) * 100) / 100;
    }
    // A direct speed value.
    const directSpeed = numbers[0];
    return Number.isFinite(directSpeed) ? directSpeed : null;
  }

  // VO2max — Cooper 12-min run (distance m) or Yo-Yo IR1 (distance m).
  if (
    method.includes("vo2") ||
    method.includes("cooper") ||
    method.includes("yo-yo") ||
    method.includes("yoyo")
  ) {
    const dist = numbers[0]; // metres covered
    if (!dist) return null;
    const vo2 =
      method.includes("yo") || method.includes("yoyo")
        ? dist * 0.0084 + 36.4 // Bangsbo Yo-Yo IR1
        : (dist - 504.9) / 44.73; // Cooper 12-min
    return Math.round(vo2 * 10) / 10;
  }

  // Peak power from a countermovement jump (Sayers): jump height (cm) + body
  // mass (kg). Enter as "<height> <mass>" (value + notes).
  if (
    method.includes("peak power") ||
    method.includes("sayers") ||
    method.includes("cmj")
  ) {
    const heightCm = numbers[0];
    const massKg = numbers[1];
    if (!heightCm || !massKg) return null;
    return Math.round(60.7 * heightCm + 45.3 * massKg - 2055);
  }

  // Reactive Strength Index = jump height (m) ÷ ground-contact time (s). Enter
  // "<jump cm> <contact s|ms>"; contact >10 is treated as milliseconds.
  if (method.includes("reactive strength") || method.includes("rsi")) {
    const heightCm = numbers[0];
    let contact = numbers[1];
    if (!heightCm || !contact) return null;
    if (contact > 10) contact = contact / 1000;
    return Math.round((heightCm / 100 / contact) * 100) / 100;
  }

  // Relative strength = load ÷ body mass (× bodyweight). Enter "<load> <mass>".
  if (
    method.includes("relative strength") ||
    method.includes("per bodyweight") ||
    method.includes("/bw")
  ) {
    const load = numbers[0];
    const mass = numbers[1];
    if (!load || !mass) return null;
    return Math.round((load / mass) * 100) / 100;
  }

  // Sprint velocity = distance (m) ÷ time (s) → m/s. Distance comes from the
  // test label (e.g. "40m Sprint"); time is the entered value.
  if (method.includes("sprint") || method.includes("velocity")) {
    const seconds = Number(params.value) || parseDurationSeconds(sourceText);
    const mMatch = sourceText.match(/(\d+(?:\.\d+)?)\s*m(?![a-z/])/i);
    const distance = mMatch ? Number(mMatch[1]) : numbers.find((n) => n >= 5);
    if (!seconds || !distance) return null;
    return Math.round((distance / seconds) * 100) / 100;
  }

  // VIFT — final velocity of the 30-15 IFT, entered directly (km/h). Drives
  // interval-speed prescription, like MAS.
  if (
    method.includes("vift") ||
    method.includes("30-15") ||
    method.includes("ift")
  ) {
    const v = numbers[0];
    return Number.isFinite(v) ? v : null;
  }

  const direct = numbers[0];
  return Number.isFinite(direct) ? direct : null;
}

// Name the metric after its calculation so downstream features (dashboard 1RM
// card, auto-prescription resolver) can recognize it by name. The Athlete
// Metrics table has no calc-method column.
export function deriveMetricKind(calculationMethod?: string): string {
  const methodLower = String(calculationMethod || "").toLowerCase();
  return methodLower.includes("epley") || methodLower.includes("brzycki")
    ? "Predicted 1RM"
    : methodLower.includes("pace") || methodLower.includes("min/km")
      ? "Pace"
      : methodLower.includes("aerobic") ||
          methodLower.includes("mas") ||
          methodLower.includes("2km")
        ? "MAS"
        : methodLower.includes("lactate") || methodLower.includes("threshold")
          ? "LT Pace"
          : methodLower.includes("vo2") ||
              methodLower.includes("cooper") ||
              methodLower.includes("yo")
            ? "VO2max"
            : methodLower.includes("power") ||
                methodLower.includes("sayers") ||
                methodLower.includes("cmj")
              ? "Peak Power"
              : methodLower.includes("rsi") || methodLower.includes("reactive")
                ? "RSI"
                : methodLower.includes("relative") ||
                    methodLower.includes("bodyweight") ||
                    methodLower.includes("/bw")
                  ? "Relative Strength"
                  : methodLower.includes("vift") ||
                      methodLower.includes("30-15") ||
                      methodLower.includes("ift")
                    ? "VIFT"
                    : methodLower.includes("sprint") ||
                        methodLower.includes("velocity")
                      ? "Velocity"
                      : "";
}

// MAS is a speed, so its unit is km/h (or m/s if configured) — not the test's
// input distance unit (e.g. "m"). 1RM keeps the input weight unit (kg in ->
// kg out). MAS unit is driven by the chosen method ("... (m/s)") or an
// explicit metric/input unit; defaults to km/h.
export function deriveMetricUnit(params: {
  metricKind: string;
  calculationMethod?: string;
  metricUnit?: string;
  inputUnit?: string;
  responseUnit?: string;
}): string {
  const { metricKind } = params;
  const methodLower = String(params.calculationMethod || "").toLowerCase();
  const wantsMetersPerSecond =
    methodLower.includes("m/s") ||
    String(params.metricUnit || params.inputUnit || "")
      .toLowerCase()
      .includes("m/s");
  return metricKind === "MAS" || metricKind === "LT Pace" || metricKind === "VIFT"
    ? wantsMetersPerSecond
      ? "m/s"
      : "km/h"
    : metricKind === "Pace"
      ? "min/km"
      : metricKind === "VO2max"
        ? "ml/kg/min"
        : metricKind === "Peak Power"
          ? "W"
          : metricKind === "Velocity"
            ? "m/s"
            : metricKind === "Relative Strength"
              ? "x BW"
              : metricKind === "RSI"
                ? ""
                : params.metricUnit || params.responseUnit || "";
}
