import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import WellnessChart from "../../../src/WellnessChart";

// recharts' ResponsiveContainer measures itself via ResizeObserver; the
// default jsdom stub never fires, so report a fixed size to make it draw.
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

describe("WellnessChart", () => {
  it("renders the daily area plus the weekly-average line", () => {
    const { container } = render(
      <WellnessChart
        points={[
          { date: "2026-07-01", value: 7, avg: 6.5 },
          { date: "2026-07-02", value: 6, avg: 6.4 },
          { date: "2026-07-03", value: 8, avg: 6.8 },
        ]}
        locale="en-US"
        unit="h"
        dailyLabel="Daily"
        avgLabel="Weekly avg"
      />
    );

    expect(container.querySelector("svg.recharts-surface")).toBeInTheDocument();
    // Composed chart draws both marks: the gold area and the dashed avg line.
    expect(container.querySelector(".recharts-area")).toBeInTheDocument();
    expect(container.querySelector(".recharts-line")).toBeInTheDocument();
    expect(container.textContent).toContain("Jul 1");
  });
});
