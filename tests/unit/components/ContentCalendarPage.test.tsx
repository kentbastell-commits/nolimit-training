import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import ContentCalendarPage from "../../../src/companyOps/ContentCalendarPage";

// Local-time YYYY-MM-DD, mirroring the page's own dayKey().
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const thisMonday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
};

const renderCalendar = (onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>) => {
  const monday = thisMonday();
  const item = {
    id: "c1",
    title: "Footwork drill teaser",
    platform: "小红书 XHS",
    status: "Idea",
    publishDate: `${dayKey(monday)}T10:00`,
  };
  const utils = render(
    <ContentCalendarPage
      items={[item]}
      language="en"
      onUpdate={onUpdate}
      onDuplicate={vi.fn(async () => {})}
      onDelete={vi.fn(async () => {})}
      onQuickAction={vi.fn()}
    />,
  );
  const columns = () => Array.from(utils.container.querySelectorAll(".fopsCalWeekCol"));
  const dropOn = (index: number) =>
    fireEvent.drop(columns()[index], {
      dataTransfer: { getData: () => "c1" },
    });
  return { ...utils, columns, dropOn };
};

describe("ContentCalendarPage drag-to-reschedule", () => {
  it("moves the chip to the dropped day immediately, before the write resolves", async () => {
    let resolveWrite: () => void = () => {};
    const onUpdate = vi.fn(
      () => new Promise<void>((resolve) => { resolveWrite = resolve; }),
    );
    const { columns, dropOn } = renderCalendar(onUpdate);

    expect(columns()).toHaveLength(7);
    expect(columns()[0].textContent).toContain("Footwork drill teaser");

    dropOn(3);

    // Optimistic: it is already on Thursday while onUpdate is still pending.
    expect(onUpdate).toHaveBeenCalledWith(
      "c1",
      { publishDate: `${dayKey(new Date(thisMonday().getTime() + 3 * 86_400_000))}T10:00` },
    );
    expect(columns()[3].textContent).toContain("Footwork drill teaser");
    expect(columns()[0].textContent).not.toContain("Footwork drill teaser");

    resolveWrite();
    await waitFor(() => expect(columns()[3].textContent).toContain("Footwork drill teaser"));
  });

  it("snaps the chip back to its original day when the write fails", async () => {
    const onUpdate = vi.fn(async () => {
      throw new Error("Bitable down");
    });
    const { columns, dropOn } = renderCalendar(onUpdate);

    dropOn(3);
    expect(columns()[3].textContent).toContain("Footwork drill teaser");

    await waitFor(() => {
      expect(columns()[0].textContent).toContain("Footwork drill teaser");
      expect(columns()[3].textContent).not.toContain("Footwork drill teaser");
    });
  });
});
