// LandingPage is animation-heavy (framer-motion hero, counters, tilt cards).
// The bar here is a stable smoke render plus visible-copy assertions; the
// jsdom shims in setup.dom.ts (matchMedia, IntersectionObserver) cover what
// framer-motion needs.
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LandingPage from "../../../src/LandingPage";

const baseProps = {
  storeLang: "en" as const,
  setStoreLang: vi.fn(),
  programs: [],
  toasts: [],
};

describe("LandingPage", () => {
  it("renders the hero copy in English", () => {
    render(<LandingPage {...baseProps} />);
    // The brand slogan replaced "Built for Training" (identity pass,
    // f2b9776); assert presence rather than a count so a copy re-shuffle
    // between hero/ticker/footer doesn't re-break this test.
    expect(
      screen.getAllByText("Raise the Floor. Break the Ceiling.").length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: "Train like a professional, from your phone.",
      })
    ).toBeInTheDocument();
  });

  it("switches language via the nav toggle", () => {
    const setStoreLang = vi.fn();
    render(<LandingPage {...baseProps} setStoreLang={setStoreLang} />);
    fireEvent.click(screen.getByLabelText("Change language"));
    expect(setStoreLang).toHaveBeenCalledWith("zh");
  });
});
