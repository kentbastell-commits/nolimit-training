import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WarRoomPage from "../../../src/companyOps/WarRoomPage";
import type { CompanyOpsUser, OpsIdeaItem } from "../../../src/companyOps/types";

const user: CompanyOpsUser = {
  id: "staff-1",
  openId: "ou_staff",
  name: "Yumei",
  role: "growth",
  accessStatus: "active",
};

const idea: OpsIdeaItem = {
  id: "rec-idea-1",
  idea: "Try a referral campaign",
  category: "增长 Growth",
  status: "新 New",
  raisedBy: "Yumei",
  raisedByOpenId: "ou_staff",
  votes: 0,
  hasVoted: false,
  thread: "",
};

function renderWarRoom(overrides: {
  onCreate?: ReturnType<typeof vi.fn>;
  onReply?: ReturnType<typeof vi.fn>;
  onVote?: ReturnType<typeof vi.fn>;
} = {}) {
  const onCreate = overrides.onCreate || vi.fn(async () => undefined);
  const onReply = overrides.onReply || vi.fn(async () => undefined);
  const onVote = overrides.onVote || vi.fn(async () => undefined);

  render(
    <WarRoomPage
      ideas={[idea]}
      language="en"
      user={user}
      csrfToken="csrf-test"
      onCreate={onCreate}
      onReply={onReply}
      onVote={onVote}
      onStatus={vi.fn(async () => undefined)}
      onDelete={vi.fn()}
    />,
  );

  return { onCreate, onReply, onVote };
}

describe("WarRoomPage action failures", () => {
  it("restores a failed reply and removes the misleading optimistic entry", async () => {
    const onReply = vi.fn(async () => {
      throw new Error("Company Operations could not reach Feishu");
    });
    const browser = userEvent.setup();
    renderWarRoom({ onReply });

    await browser.click(screen.getByRole("button", { name: "Try a referral campaign" }));
    const reply = screen.getByRole("textbox", { name: "Add to the discussion…" });
    await browser.type(reply, "Test it with the August cohort{enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That reply wasn't saved. Your message has been restored",
    );
    expect(reply).toHaveValue("Test it with the August cohort");
    expect(screen.getByText("No replies yet — be the first.")).toBeInTheDocument();
    expect(onReply).toHaveBeenCalledWith(
      "rec-idea-1",
      "Test it with the August cohort",
      [],
    );
  });

  it("restores a failed new-idea draft and removes its pending card", async () => {
    const onCreate = vi.fn(async () => {
      throw new Error("Company Operations could not reach Feishu");
    });
    const browser = userEvent.setup();
    renderWarRoom({ onCreate });

    const draft = screen.getByRole("textbox", { name: "What's the idea?" });
    await browser.type(draft, "Launch a gym referral challenge");
    await browser.click(screen.getByRole("button", { name: "Post" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That idea wasn't saved. Your draft has been restored",
    );
    expect(draft).toHaveValue("Launch a gym referral challenge");
    expect(
      screen.queryByRole("button", { name: "Launch a gym referral challenge" }),
    ).not.toBeInTheDocument();
  });

  it("rolls back a vote when Feishu rejects the update", async () => {
    const onVote = vi.fn(async () => {
      throw new Error("Company Operations could not reach Feishu");
    });
    const browser = userEvent.setup();
    renderWarRoom({ onVote });

    const vote = screen.getByRole("button", { name: "Back this idea" });
    await browser.click(vote);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your vote wasn't saved",
    );
    await waitFor(() => expect(vote).toHaveTextContent("0"));
  });
});
