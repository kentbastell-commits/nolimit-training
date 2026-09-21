import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createPortal } from "react-dom";
import "../../../src/i18n";
import CalendarWorkoutEditor from "../../../src/CalendarWorkoutEditor";

const context = { clientName: "Test Athlete", date: "2026-09-22" };

describe("CalendarWorkoutEditor", () => {
  it("keeps the calendar mounted and restores focus when the editor closes", () => {
    const onClose = vi.fn();
    const { rerender } = render(<div className="app"><button>Calendar workout</button></div>);
    const origin = screen.getByRole("button", { name: "Calendar workout" });
    origin.focus();
    const view = (open: boolean) => <div className="app"><button>Calendar workout</button>
      {open && <CalendarWorkoutEditor context={context} busy={false} onClose={onClose}>
        <button>Save and return</button>
      </CalendarWorkoutEditor>}
    </div>;
    rerender(view(true));
    expect(screen.getByRole("button", { name: "Calendar workout" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveFocus();
    expect(screen.getByText(/2026-09-22/)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    rerender(view(false));
    expect(origin).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("leaves nested exercise dialogs to handle Escape themselves", () => {
    const close = vi.fn();
    render(<CalendarWorkoutEditor context={context} busy={false} onClose={close}>
      {createPortal(<button>Nested exercise control</button>, document.body)}
    </CalendarWorkoutEditor>);
    fireEvent.keyDown(screen.getByRole("button", { name: "Nested exercise control" }), { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
  });

  it("prevents accidental closing while a save is in progress", () => {
    const close = vi.fn();
    render(<CalendarWorkoutEditor context={context} busy onClose={close}><p>Saving</p></CalendarWorkoutEditor>);
    expect(screen.getByRole("button", { name: "Back to athlete calendar" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(document.querySelector('.calendarWorkoutBackdrop')!);
    expect(close).not.toHaveBeenCalled();
  });
});
