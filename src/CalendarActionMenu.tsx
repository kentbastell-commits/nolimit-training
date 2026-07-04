// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Copy, Scissors, Trash2, X } from "lucide-react";
import { formatCalendarLabel } from "./appCore";

export default function CalendarActionMenu({
  calendarActionMenu,
  closeCalendarActionMenu,
  copiedCalendarItem,
  copyCalendarAssignment,
  copyCalendarWorkout,
  deleteContentAssignment,
  deleteWorkout,
  getAssignmentDisplayName,
  localizedWorkoutName,
  pasteCalendarItemToDate,
  setCopiedCalendarItem,
}: { [key: string]: any }) {
  return (
    <>
          <div
            className="calendarContextMenu"
            style={{
              left: calendarActionMenu.x,
              top: calendarActionMenu.y,
            }}
            onClick={(event) => event.stopPropagation()}
            role="menu"
          >
            {calendarActionMenu.kind === "item" ? (
              <>
                <strong>
                  {calendarActionMenu.item.type === "workout"
                    ? localizedWorkoutName(calendarActionMenu.item.workout)
                    : getAssignmentDisplayName(calendarActionMenu.item.assignment)}
                </strong>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (calendarActionMenu.item.type === "workout") {
                      copyCalendarWorkout(calendarActionMenu.item.workout, "copy");
                    } else {
                      copyCalendarAssignment(
                        calendarActionMenu.item.assignment,
                        "copy"
                      );
                    }
                    closeCalendarActionMenu();
                  }}
                >
                  <Copy size={15} aria-hidden="true" />
                  Copy
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (calendarActionMenu.item.type === "workout") {
                      copyCalendarWorkout(calendarActionMenu.item.workout, "cut");
                    } else {
                      copyCalendarAssignment(
                        calendarActionMenu.item.assignment,
                        "cut"
                      );
                    }
                    closeCalendarActionMenu();
                  }}
                >
                  <Scissors size={15} aria-hidden="true" />
                  Cut
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="dangerContextAction"
                  onClick={() => {
                    if (calendarActionMenu.item.type === "workout") {
                      void deleteWorkout(calendarActionMenu.item.workout);
                    } else {
                      void deleteContentAssignment(
                        calendarActionMenu.item.assignment
                      );
                    }
                    closeCalendarActionMenu();
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <strong>{formatCalendarLabel(calendarActionMenu.date)}</strong>
                {copiedCalendarItem && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      void pasteCalendarItemToDate(calendarActionMenu.date);
                      closeCalendarActionMenu();
                    }}
                  >
                    {copiedCalendarItem.action === "copy" ? (
                      <Copy size={15} aria-hidden="true" />
                    ) : (
                      <Scissors size={15} aria-hidden="true" />
                    )}
                    {copiedCalendarItem.action === "copy"
                      ? "Paste copy"
                      : "Paste cut"}
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCopiedCalendarItem(null);
                    closeCalendarActionMenu();
                  }}
                >
                  <X size={15} aria-hidden="true" />
                  Cancel
                </button>
              </>
            )}
          </div>
    </>
  );
}
