import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SplashScreen from "../../../src/SplashScreen";

describe("SplashScreen", () => {
  it("renders the wordmark, five power bars, label, and controlled percentage", () => {
    const { container } = render(<SplashScreen progress={42} />);
    expect(screen.getByAltText("NoLimit Training")).toBeInTheDocument();
    expect(screen.getByText("POWERING UP")).toBeInTheDocument();
    expect(container.querySelectorAll(".nlSplash__bar")).toHaveLength(5);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });

  it("zero-pads a single-digit percentage", () => {
    render(<SplashScreen progress={7} />);
    expect(screen.getByText("07")).toBeInTheDocument();
  });

  it("calls onFinish once shortly after progress reaches 100%", async () => {
    const onFinish = vi.fn();
    render(<SplashScreen progress={100} onFinish={onFinish} />);
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1), {
      timeout: 1500,
    });
  });
});
