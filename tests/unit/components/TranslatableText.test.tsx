import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { TranslatableText } from "../../../src/companyOps/TranslatableText";

afterEach(() => vi.unstubAllGlobals());
const result = (translated: string | null) => new Response(JSON.stringify({ translated }));

describe("on-demand translation display", () => {
  it("shows the original while unavailable and retries on a later visit", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(result(null)).mockResolvedValueOnce(result("译文已恢复"));
    vi.stubGlobal("fetch", fetch);
    const first = render(<TranslatableText text="Recovery fixture" language="zh" bare />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Recovery fixture")).toBeInTheDocument();
    await act(async () => { await Promise.resolve(); });
    first.unmount();
    render(<TranslatableText text="Recovery fixture" language="zh" bare />);
    expect(await screen.findByText("译文已恢复")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("never displays an old translation for newly edited content", async () => {
    let resolveNew!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(result("旧内容"))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNew = resolve; })));
    const view = render(<TranslatableText text="First content fixture" language="zh" bare />);
    expect(await screen.findByText("旧内容")).toBeInTheDocument();
    view.rerender(<TranslatableText text="Updated content fixture" language="zh" bare />);
    expect(screen.getByText("Updated content fixture")).toBeInTheDocument();
    expect(screen.queryByText("旧内容")).not.toBeInTheDocument();
    await act(async () => { resolveNew(result("最新内容")); });
    expect(await screen.findByText("最新内容")).toBeInTheDocument();
  });

  it("requests a Chinese translation for mixed English/Chinese content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(result("本周发布3条训练视频")));
    render(<TranslatableText text="This week 发布 3 training videos" language="zh" bare />);
    expect(await screen.findByText("本周发布3条训练视频")).toBeInTheDocument();
  });
});
