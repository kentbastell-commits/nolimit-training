import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CalendarActionMenu from "../../../src/CalendarActionMenu";

const baseProps = {
  calendarActionMenu: {
    kind: "item",
    x: 10,
    y: 20,
    item: { type: "workout", workout: { workoutName: "Leg Day" } },
  },
  closeCalendarActionMenu: vi.fn(),
  copiedCalendarItem: null,
  copyCalendarAssignment: vi.fn(),
  copyCalendarWorkout: vi.fn(),
  deleteContentAssignment: vi.fn(),
  deleteWorkout: vi.fn(),
  getAssignmentDisplayName: vi.fn(() => "Assignment"),
  localizedWorkoutName: (w: any) => w.workoutName,
  pasteCalendarItemToDate: vi.fn(),
  setCopiedCalendarItem: vi.fn(),
};

describe("CalendarActionMenu", () => {
  it("renders workout item actions", () => {
    render(<CalendarActionMenu {...baseProps} />);
    expect(screen.getByText("Leg Day")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cut" })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Delete" })
    ).toBeInTheDocument();
  });

  it("copies the workout and closes the menu", () => {
    const copyCalendarWorkout = vi.fn();
    const closeCalendarActionMenu = vi.fn();
    render(
      <CalendarActionMenu
        {...baseProps}
        copyCalendarWorkout={copyCalendarWorkout}
        closeCalendarActionMenu={closeCalendarActionMenu}
      />
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(copyCalendarWorkout).toHaveBeenCalledWith(
      baseProps.calendarActionMenu.item.workout,
      "copy"
    );
    expect(closeCalendarActionMenu).toHaveBeenCalled();
  });

  it("renders date mode with a paste option when an item is copied", () => {
    render(
      <CalendarActionMenu
        {...baseProps}
        calendarActionMenu={{ kind: "date", x: 0, y: 0, date: "2026-07-07" }}
        copiedCalendarItem={{ action: "copy" }}
      />
    );
    expect(
      screen.getByRole("menuitem", { name: "Paste copy" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Cancel" })
    ).toBeInTheDocument();
  });
});
