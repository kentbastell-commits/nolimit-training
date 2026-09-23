// Extracted from App.tsx (monolith split) — JSX verbatim; props threaded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Copy, Scissors, Trash2, X, Pencil, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./CalendarActionMenu.css";
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
  openWorkout,
  editWorkout,
}: { [key: string]: any }) {
  const { i18n } = useTranslation(); const zh = i18n.language?.startsWith("zh");
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
                {calendarActionMenu.item.type === "workout" && <>
                  <button type="button" role="menuitem" onClick={() => { openWorkout(calendarActionMenu.item.workout); closeCalendarActionMenu(); }}><Eye size={15} />{zh ? "查看 / 回顾" : "View / Review"}</button>
                  {calendarActionMenu.item.workout.completionStatus !== "Completed" && <button type="button" role="menuitem" onClick={() => { editWorkout(calendarActionMenu.item.workout); closeCalendarActionMenu(); }}><Pencil size={15} />{zh ? "编辑本次训练" : "Edit this session"}</button>}
                </>}
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
                  {zh ? "复制" : "Copy"}
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
                  {zh ? "移动到其他日期" : "Move to another date"}
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
                  {zh ? "删除" : "Delete"}
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
                    {zh ? "放到此日期" : "Place on this date"}
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
                  {zh ? "取消" : "Cancel"}
                </button>
              </>
            )}
          </div>
    </>
  );
}
