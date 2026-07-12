import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import LegalPage from "../../../src/LegalPage";

describe("LegalPage", () => {
  it("renders the privacy policy and links all policies", () => {
    render(<LegalPage kind="privacy" lang="en" setLang={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Refunds" })).toHaveAttribute("href", "/refund");
  });

  it("switches to Chinese", () => {
    const setLang = vi.fn();
    render(<LegalPage kind="terms" lang="en" setLang={setLang} />);
    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    expect(setLang).toHaveBeenCalledWith("zh");
  });
});
