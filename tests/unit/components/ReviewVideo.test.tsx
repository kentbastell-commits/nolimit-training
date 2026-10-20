import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReviewVideo from "../../../src/ReviewVideo";
import "../../../src/i18n";

const url = "https://trainnolimit.cn/uploads/fv-example.mp4";
const getVideo = () => screen.getByLabelText("Row") as HTMLVideoElement;
beforeEach(() => vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue());
afterEach(() => vi.useRealTimers());

describe("review video connections", () => {
  it("uses the website connection first and offers a direct link without changing feedback", () => {
    render(<ReviewVideo url={url} title="Row" />);
    expect(getVideo()).toHaveAttribute("src", "/uploads/fv-example.mp4");
    expect(getVideo()).toHaveAttribute("playsinline");
    expect(getVideo()).toHaveAttribute("preload", "none");
    expect(screen.getByRole("link", { name: "Open video" })).toHaveAttribute("href", "/uploads/fv-example.mp4");
  });
  it("switches connections after a network/media error, then allows a fresh retry", () => {
    render(<ReviewVideo url={url} title="Row" />);
    fireEvent.error(getVideo());
    expect(getVideo()).toHaveAttribute("src", "https://media.trainnolimit.cn/uploads/fv-example.mp4");
    fireEvent.error(getVideo());
    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load");
    fireEvent.click(screen.getByRole("button", { name: "Reload video" }));
    expect(getVideo()).toHaveAttribute("src", "/uploads/fv-example.mp4");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("recovers when metadata never arrives without switching a paused, loaded player", () => {
    vi.useFakeTimers();
    render(<ReviewVideo url={url} title="Row" />);
    fireEvent.play(getVideo());
    fireEvent.loadStart(getVideo());
    act(() => vi.advanceTimersByTime(12000));
    expect(getVideo()).toHaveAttribute("src", "https://media.trainnolimit.cn/uploads/fv-example.mp4");
    Object.defineProperty(getVideo(), "readyState", { configurable: true, value: 1 });
    fireEvent.loadedMetadata(getVideo());
    fireEvent.stalled(getVideo());
    act(() => vi.advanceTimersByTime(24000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("cleans up timeouts when a submission changes and leaves external sources alone", () => {
    vi.useFakeTimers();
    const { rerender } = render(<ReviewVideo url={url} title="Row" />);
    fireEvent.play(getVideo());
    fireEvent.loadStart(getVideo());
    rerender(<ReviewVideo url="https://videos.example.org/clip.mp4" title="Row" />);
    act(() => vi.advanceTimersByTime(12000));
    expect(getVideo()).toHaveAttribute("src", "https://videos.example.org/clip.mp4");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
