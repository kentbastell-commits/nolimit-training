import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReviewVideo from "../../../src/ReviewVideo";
import "../../../src/i18n";

const url = "https://trainnolimit.cn/uploads/fv-example.mp4";
const getVideo = () => screen.getByLabelText("Row") as HTMLVideoElement;
const open = (title = "Row") => fireEvent.click(screen.getByRole("button", { name: `Play ${title}` }));
beforeEach(() => vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue());
afterEach(() => vi.useRealTimers());

describe("review video connections", () => {
  it("is a poster until tapped, then uses the website connection first and offers a direct link", () => {
    render(<ReviewVideo url={url} title="Row" />);
    expect(document.querySelector("video")).toBeNull();
    const poster = screen.getByRole("button", { name: "Play Row" });
    expect(poster).toHaveStyle({ backgroundImage: "url(https://media.trainnolimit.cn/uploads/thumbs/fv-example.jpg)" });
    open();
    expect(getVideo()).toHaveAttribute("src", "/uploads/fv-example.mp4?v=l41");
    expect(getVideo()).toHaveAttribute("playsinline");
    expect(getVideo()).toHaveAttribute("autoplay");
    expect(getVideo()).toHaveAttribute("poster", "https://media.trainnolimit.cn/uploads/thumbs/fv-example.jpg");
    expect(screen.getByRole("link", { name: "Open video" })).toHaveAttribute("href", "/uploads/fv-example.mp4?v=l41");
  });
  it("keeps one live player: opening a second clip returns the first to its poster (iPhone media pool)", () => {
    render(<>
      <ReviewVideo url={url} title="Row" />
      <ReviewVideo url="https://trainnolimit.cn/uploads/fv-other.mp4" title="Hang" />
    </>);
    open("Row");
    expect(document.querySelectorAll("video")).toHaveLength(1);
    open("Hang");
    expect(document.querySelectorAll("video")).toHaveLength(1);
    expect(screen.getByLabelText("Hang")).toHaveAttribute("src", "/uploads/fv-other.mp4?v=l41");
    expect(screen.getByRole("button", { name: "Play Row" })).toBeInTheDocument();
  });
  it("switches connections after a network/media error, then allows a fresh retry", () => {
    render(<ReviewVideo url={url} title="Row" />);
    open();
    fireEvent.error(getVideo());
    expect(getVideo()).toHaveAttribute("src", "https://media.trainnolimit.cn/uploads/fv-example.mp4?v=l41");
    fireEvent.error(getVideo());
    expect(screen.getByRole("alert")).toHaveTextContent("couldn’t load");
    fireEvent.click(screen.getByRole("button", { name: "Reload video" }));
    expect(getVideo()).toHaveAttribute("src", "/uploads/fv-example.mp4?v=l41");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("recovers when metadata never arrives without switching a paused, loaded player", () => {
    vi.useFakeTimers();
    render(<ReviewVideo url={url} title="Row" />);
    open();
    fireEvent.play(getVideo());
    fireEvent.loadStart(getVideo());
    act(() => vi.advanceTimersByTime(12000));
    expect(getVideo()).toHaveAttribute("src", "https://media.trainnolimit.cn/uploads/fv-example.mp4?v=l41");
    Object.defineProperty(getVideo(), "readyState", { configurable: true, value: 1 });
    fireEvent.loadedMetadata(getVideo());
    fireEvent.pause(getVideo());
    fireEvent.stalled(getVideo());
    act(() => vi.advanceTimersByTime(24000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("waits while bytes are still arriving instead of switching at 12s", () => {
    vi.useFakeTimers();
    render(<ReviewVideo url={url} title="Row" />);
    open();
    const v = getVideo();
    let end = 0;
    Object.defineProperty(v, "networkState", { configurable: true, value: 2 });
    Object.defineProperty(v, "buffered", { configurable: true, get: () => ({ length: 1, end: () => end }) });
    fireEvent.play(v);
    fireEvent.loadStart(v);
    end = 1.5;
    act(() => vi.advanceTimersByTime(12000));
    expect(getVideo()).toHaveAttribute("src", "/uploads/fv-example.mp4?v=l41");
    end = 3;
    act(() => vi.advanceTimersByTime(12000));
    expect(getVideo()).toHaveAttribute("src", "/uploads/fv-example.mp4?v=l41");
  });
  it("cleans up timeouts when a submission changes and leaves external sources alone", () => {
    vi.useFakeTimers();
    const { rerender } = render(<ReviewVideo url={url} title="Row" />);
    open();
    fireEvent.play(getVideo());
    fireEvent.loadStart(getVideo());
    rerender(<ReviewVideo url="https://videos.example.org/clip.mp4" title="Row" />);
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole("button", { name: "Play Row" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    open();
    expect(getVideo()).toHaveAttribute("src", "https://videos.example.org/clip.mp4");
  });
});
