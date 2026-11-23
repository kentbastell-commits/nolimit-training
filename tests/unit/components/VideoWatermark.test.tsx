import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import VideoWatermark from "../../../src/VideoWatermark";
import { resetWatermarkNameCache } from "../../../src/ContentWatermark";

// The dom setup has no localStorage; the resolver also reads ?client= from the URL.
beforeEach(() => { resetWatermarkNameCache(); window.history.replaceState({}, "", "/?portal=client&client=CL-9001"); });
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });

it("prints the athlete's name over the video, never the code, and fullscreens the wrapper", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ profile: { name: "Chen Cong", clientCode: "CL-9001" } }) }));
  const request = vi.fn().mockResolvedValue(undefined);
  (HTMLElement.prototype as any).requestFullscreen = request;
  const { container } = render(<VideoWatermark><video src="/uploads/ex-1.mp4" /></VideoWatermark>);
  await waitFor(() => expect(screen.getByText("Chen Cong · NX LIMIT")).toBeInTheDocument());
  expect(container.textContent).not.toContain("CL-9001");
  fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.instances[0]).toBe(container.querySelector(".videoWm"));
});

it("renders the bare video for a coach (empty label) without fetching a profile", () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const { container } = render(<VideoWatermark label=""><video src="/uploads/ex-1.mp4" /></VideoWatermark>);
  expect(container.querySelector(".videoWm")).toBeNull();
  expect(container.querySelector("video")).not.toBeNull();
});
