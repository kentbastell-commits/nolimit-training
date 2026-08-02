// The test→metric calculations. Each method string here is exactly what the
// coach-facing select in CoachBuilderPage writes to test_items.calculation_method
// — a rename there without a matching branch means the metric silently comes
// out null (the athlete's test "worked" but produced no number).
import { describe, expect, it } from "vitest";
import {
  calculateMetric,
  deriveMetricKind,
  deriveMetricUnit,
} from "../../../server/db/metricPipeline.ts";

describe("Row Pace (min/500m)", () => {
  it("computes the average /500m split from a 2000m final time", () => {
    // 7:24 over 2000m → 111s per 500m → 1.85 min/500m.
    const value = calculateMetric({
      value: "2000 m in 7:24",
      method: "Row Pace (min/500m)",
    });
    expect(value).toBe(1.85);
  });

  it("respects a non-2000m distance in the result text", () => {
    // 5000m in 20:00 → 120s per 500m → 2 min/500m.
    const value = calculateMetric({
      value: "5000 m in 20:00",
      method: "Row Pace (min/500m)",
    });
    expect(value).toBe(2);
  });

  it("defaults to 2000m when the text has no distance", () => {
    const value = calculateMetric({
      value: "7:00",
      method: "Row Pace (min/500m)",
    });
    expect(value).toBe(1.75);
  });

  it("returns null when there is no parsable time", () => {
    expect(
      calculateMetric({ value: "", method: "Row Pace (min/500m)" })
    ).toBeNull();
  });

  it("is NOT captured by the generic run-pace branch", () => {
    // The method name contains "pace", so ordering matters: the same input
    // through the min/km branch would give 3.7 (7:24 over 2km), not 1.85.
    const value = calculateMetric({
      value: "2000 m in 7:24",
      method: "Row Pace (min/500m)",
    });
    expect(value).not.toBe(3.7);
  });

  it("derives the Row Pace kind and min/500m unit", () => {
    const kind = deriveMetricKind("Row Pace (min/500m)");
    expect(kind).toBe("Row Pace");
    expect(
      deriveMetricUnit({ metricKind: kind, calculationMethod: "Row Pace (min/500m)" })
    ).toBe("min/500m");
  });

  it("does not disturb the existing run-pace and MAS methods", () => {
    expect(deriveMetricKind("Run Pace (min/km)")).toBe("Pace");
    expect(deriveMetricKind("Max Aerobic Speed")).toBe("MAS");
    // 2km in 8:00 → 15 km/h.
    expect(
      calculateMetric({ value: "2000 m in 8:00", method: "Max Aerobic Speed" })
    ).toBe(15);
  });
});
