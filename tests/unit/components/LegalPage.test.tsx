import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import LegalPage from "../../../src/LegalPage";

describe("LegalPage", () => {
  it("renders the privacy policy and links all policies", () => {
    render(<LegalPage kind="privacy" lang="en" setLang={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Refunds" })).toHaveAttribute("href", "/refund");
    expect(screen.getByRole("link", { name: "Business" })).toHaveAttribute("href", "/business");
  });

  it("switches to Chinese", () => {
    const setLang = vi.fn();
    render(<LegalPage kind="terms" lang="en" setLang={setLang} />);
    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    expect(setLang).toHaveBeenCalledWith("zh");
  });

  it("renders the registered company details from the business licence", () => {
    render(<LegalPage kind="business" lang="en" setLang={vi.fn()} />);
    expect(screen.getByText("广州跃燃体育信息咨询有限公司")).toBeInTheDocument();
    expect(screen.getByText("91440104MAKEAJP20G")).toBeInTheDocument();
    expect(screen.getByText("BASTELL KENT")).toBeInTheDocument();
  });
});
