import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { useBuilderUndo } from "../../../src/useBuilderUndo";

it("restores deleted exercises, circuit order and notes without crossing athletes", () => {
  const original = { exercises: [{ id: "A", circuit: "1" }, { id: "B", circuit: "1" }], notes: "Setup" };
  const { result, rerender } = renderHook(({ scope }) => {
    const [value, setValue] = useState(original);
    return { value, setValue, ...useBuilderUndo(value, scope, setValue, true) };
  }, { initialProps: { scope: "athlete-1:session-1" } });
  act(() => result.current.setValue({ exercises: [{ id: "B", circuit: "" }], notes: "Execution" }));
  act(() => result.current.undo()); expect(result.current.value).toEqual(original);
  act(() => result.current.redo()); expect(result.current.value.exercises).toHaveLength(1);
  rerender({ scope: "athlete-2:session-1" });
  expect(result.current.canUndo).toBe(false); expect(result.current.canRedo).toBe(false);
});
