// Assigned dates are civil days in the coaching calendar, not the coach's
// current device timezone. The database stores China-midnight epoch millis.
export const COACHING_TIME_ZONE = "Asia/Shanghai";
const chinaDay = new Intl.DateTimeFormat("en-CA", { timeZone: COACHING_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
export function coachingDate(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  const text = String(value).trim();
  const plain = text.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$)/);
  if (plain) {
    const check = new Date(`${plain[1]}T12:00:00Z`);
    return Number.isFinite(check.getTime()) && check.toISOString().slice(0, 10) === plain[1] ? plain[1] : "";
  }
  const date = value instanceof Date ? value : /^\d+$/.test(text) ? new Date(Number(text)) : new Date(text);
  return Number.isFinite(date.getTime()) ? chinaDay.format(date) : "";
}
export const coachingToday = () => coachingDate(Date.now());
export function calendarDayOffset(day: string, amount: number): string {
  const date = new Date(`${coachingDate(day)}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
