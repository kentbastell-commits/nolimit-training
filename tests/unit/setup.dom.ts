// jsdom setup for component smoke tests: jest-dom matchers, a safe fetch stub
// (components fetch on mount; tests must never hit the network), and browser
// APIs jsdom lacks.
import "@testing-library/jest-dom/vitest";
import { vi, beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
  // Default network: every request resolves to an empty-but-shaped JSON. Tests
  // that need data override with their own vi.stubGlobal("fetch", ...).
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "{}",
    }))
  );
  vi.stubGlobal("scrollTo", vi.fn());
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.matchMedia =
    window.matchMedia ||
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as any);
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as any).ResizeObserver = (window as any).ResizeObserver || RO;
  (window as any).IntersectionObserver =
    (window as any).IntersectionObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
