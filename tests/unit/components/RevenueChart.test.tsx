import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import RevenueChart from "../../../src/RevenueChart";

// recharts' ResponsiveContainer measures itself via ResizeObserver; the
// default jsdom stub never fires, so the chart would render at 0x0 and skip
// the svg entirely. Report a fixed size so the chart actually draws.
class SizedResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 600,
            height: 220,
            top: 0,
            left: 0,
            bottom: 220,
            right: 600,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
        },
      ] as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  (window as any).ResizeObserver = SizedResizeObserver;
});

describe("RevenueChart", () => {
  it("renders a bar chart svg with the monthly revenue data", () => {
    const { container } = render(
      <RevenueChart
        data={[
          { month: "May", revenue: 1200 },
          { month: "Jun", revenue: 1800 },
        ]}
      />
    );

    expect(
      container.querySelector(".recharts-responsive-container")
    ).toBeInTheDocument();
    expect(container.querySelector("svg.recharts-surface")).toBeInTheDocument();
    // The month labels come through as axis ticks.
    expect(container.textContent).toContain("May");
    expect(container.textContent).toContain("Jun");
    // One bar per data point.
    expect(
      container.querySelectorAll(".recharts-bar-rectangle").length
    ).toBe(2);
  });
});
