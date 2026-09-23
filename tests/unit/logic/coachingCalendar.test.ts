import { afterEach, describe, expect, it, vi } from "vitest";
import { calendarDayOffset, coachingDate, coachingToday } from "../../../src/coachingCalendar";

afterEach(() => vi.useRealTimers());
describe("China coaching calendar", () => {
  it("keeps civil dates and China-midnight epochs on the same training day", () => {
    for (const value of ["2026-09-23", "2026-09-23 00:00:00", "2026-09-22T16:00:00Z", Date.parse("2026-09-22T16:00:00Z")]) {
      expect(coachingDate(value)).toBe("2026-09-23");
    }
  });
  it("does not advance the training day at midnight in Japan", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-24T00:30:00+09:00"));
    expect(coachingToday()).toBe("2026-09-23");
    vi.setSystemTime(new Date("2026-09-24T01:00:00+09:00"));
    expect(coachingToday()).toBe("2026-09-24");
  });
  it("uses the same China day for absolute instants with different offsets", () => {
    expect(coachingDate("2026-09-22T09:00:00-07:00")).toBe("2026-09-23");
    expect(coachingDate("2026-09-23T01:00:00+09:00")).toBe("2026-09-23");
  });
  it("handles leap years, DST weekends and year boundaries as calendar arithmetic", () => {
    expect(calendarDayOffset("2024-02-28", 1)).toBe("2024-02-29");
    expect(calendarDayOffset("2026-03-08", 1)).toBe("2026-03-09");
    expect(calendarDayOffset("2026-12-31", 1)).toBe("2027-01-01");
    expect(calendarDayOffset("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("rejects invalid calendar dates", () => {
    for (const value of [null, undefined, "", "bad", "2026-02-30", "2026-13-01"]) expect(coachingDate(value)).toBe("");
  });
});
