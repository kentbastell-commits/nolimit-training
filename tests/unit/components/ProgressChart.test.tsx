import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import ProgressChart from "../../../src/ProgressChart";

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
            height: 210,
            top: 0,
            left: 0,
            bottom: 210,
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

describe("ProgressChart", () => {
  it("renders an area chart with locale-formatted date ticks", () => {
    const { container } = render(
      <ProgressChart
        points={[
          { date: "2026-07-01", value: 100 },
          { date: "2026-07-04", value: 105 },
        ]}
        locale="en-US"
        unit="kg"
      />
    );

    expect(container.querySelector("svg.recharts-surface")).toBeInTheDocument();
    expect(container.querySelector(".recharts-area")).toBeInTheDocument();
    // Dates are re-labelled as "Jul 1" style ticks.
    expect(container.textContent).toContain("Jul 1");
    expect(container.textContent).toContain("Jul 4");
  });
});
