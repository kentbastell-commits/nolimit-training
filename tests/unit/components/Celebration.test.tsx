import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Celebration from "../../../src/Celebration";

describe("Celebration", () => {
  it("renders the fistbump variant with default headline/kicker and the wordmark", () => {
    render(<Celebration variant="fistbump" />);
    expect(screen.getByAltText("NX LIMIT Training")).toBeInTheDocument();
    expect(screen.getByText("POUND IT")).toBeInTheDocument();
    expect(screen.getByText("WORKOUT COMPLETE")).toBeInTheDocument();
  });

  it("uses the thumbsup 'COACH APPROVED' kicker and CRUSHED IT headline", () => {
    render(<Celebration variant="thumbsup" />);
    expect(screen.getByText("CRUSHED IT")).toBeInTheDocument();
    expect(screen.getByText("COACH APPROVED")).toBeInTheDocument();
  });

  it("honors overridden copy (bilingual path) and derives the coach avatar initial", () => {
    render(
      <Celebration
        variant="highfive"
        kicker="训练完成"
        headline="击掌！"
        coachName="Kent Bastell"
        message="这周太拼了。"
        stats="42 分钟 · 8 个动作 · RPE 7"
        ctaLabel="继续"
      />
    );
    expect(screen.getByText("击掌！")).toBeInTheDocument();
    expect(screen.getByText("训练完成")).toBeInTheDocument();
    expect(screen.getByText("42 分钟 · 8 个动作 · RPE 7")).toBeInTheDocument();
    expect(screen.getByText("Kent Bastell")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument(); // avatar initial
  });

  it("reveals the CONTINUE button and calls onDone when tapped", async () => {
    const onDone = vi.fn();
    render(<Celebration variant="fistbump" ctaLabel="CONTINUE" onDone={onDone} />);
    const cta = screen.getByRole("button", { name: "CONTINUE" });
    await waitFor(() => expect(cta).toHaveStyle({ opacity: "1" }), {
      timeout: 2500,
    });
    fireEvent.click(cta);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
