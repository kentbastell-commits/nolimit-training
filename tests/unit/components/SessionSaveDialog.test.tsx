import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "../../../src/i18n";
import AssignedSessionRecoveryDialog, { SessionSaveDialog } from "../../../src/SessionSaveDialog";
import type { ProgramSession } from "../../../src/appCore";

describe("session save recovery dialog", () => {
  const base = { localId: "s", week: "1", day: "1", sessionName: "Accessory", exercises: [
    { exerciseId: "A", exerciseName: "Hold", sets: "3", reps: "30 sec" },
  ] } as ProgramSession;
  it("blocks publishing until the coach chooses a conflicting prescription", () => {
    const publish = vi.fn();
    render(<AssignedSessionRecoveryDialog recovery={{ version: "new", base, draft: { ...base, exercises: [{ ...base.exercises[0], sets: "4" }] },
      latest: { ...base, exercises: [{ ...base.exercises[0], sets: "2" }] } }} busy={false} onClose={vi.fn()} onPublish={publish} />);
    const button = screen.getByRole("button", { name: "Publish reviewed changes" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /Latest saved/ }));
    expect(button).toBeEnabled(); fireEvent.click(button);
    expect(publish.mock.calls[0][0].exercises[0].sets).toBe("2");
  });
  it("traps focus and lets Escape continue editing without invoking an outer handler", () => {
    const close = vi.fn(), outer = vi.fn();
    render(<div onKeyDown={outer}><SessionSaveDialog title="Leave this session?" busy={false} onClose={close}>
      <button>Save and return</button><button>Keep draft and leave</button><button>Continue editing</button>
    </SessionSaveDialog></div>);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus(); fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Continue editing" })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" }); expect(close).toHaveBeenCalledOnce(); expect(outer).not.toHaveBeenCalled();
  });
  it("shows the differing loads so the coach can make a meaningful choice", () => {
    const draft = { ...base, exercises: [{ ...base.exercises[0], setPrescriptions: [{ setNumber: 1, load: "20", reps: "8" }] }] } as ProgramSession;
    const latest = { ...base, exercises: [{ ...base.exercises[0], setPrescriptions: [{ setNumber: 1, load: "30", reps: "8" }] }] } as ProgramSession;
    render(<AssignedSessionRecoveryDialog recovery={{ version: "new", base, draft, latest }} busy={false} onClose={vi.fn()} onPublish={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /My edits.*Load: 20/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Latest saved.*Load: 30/ })).toBeInTheDocument();
  });
  it("does not close while publishing", () => {
    const close = vi.fn(); render(<SessionSaveDialog title="Saving" busy onClose={close}><button disabled>Publishing</button></SessionSaveDialog>);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(document.querySelector('.sessionSaveScrim')!); expect(close).not.toHaveBeenCalled();
  });
});
