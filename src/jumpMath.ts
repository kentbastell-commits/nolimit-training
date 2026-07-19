// Flight-time jump metrics (the MyJump method). All inputs are seconds unless
// noted; heights come out in centimetres. h = g·t²/8 — the classic
// projectile-motion result for a jump with equal takeoff/landing height.

const G = 9.80665;

/** Jump height in cm from flight time in seconds. */
export function jumpHeightCm(flightS: number): number {
  if (!Number.isFinite(flightS) || flightS <= 0) return 0;
  return (G * flightS * flightS) / 8 * 100;
}

/** Reactive Strength Index = flight time / ground contact time. */
export function rsi(flightS: number, contactS: number): number {
  if (!Number.isFinite(flightS) || flightS <= 0) return 0;
  if (!Number.isFinite(contactS) || contactS <= 0) return 0;
  return flightS / contactS;
}

/** Sayers estimate of peak power (W) from jump height (cm) and body mass (kg). */
export function sayersPeakPowerW(heightCm: number, massKg: number): number {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return 0;
  if (!Number.isFinite(massKg) || massKg <= 0) return 0;
  return 60.7 * heightCm + 45.3 * massKg - 2055;
}

/** Round to a fixed number of decimals for display/storage. */
export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
