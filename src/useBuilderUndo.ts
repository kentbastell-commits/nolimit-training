import { useLayoutEffect, useRef, useState } from "react";

// Value snapshots also cover deletion, circuit linking and reordering. Scope
// changes reset the stack, so Undo cannot load another athlete's session.
export function useBuilderUndo<T>(value: T, scope: string, apply: (value: T) => void, enabled: boolean) {
  const history = useRef<{ scope: string; past: string[]; present: string; future: string[] }>({ scope, past: [], present: JSON.stringify(value), future: [] });
  const [, render] = useState(0);
  const serialized = JSON.stringify(value);
  useLayoutEffect(() => {
    const h = history.current;
    if (!enabled || h.scope !== scope) {
      history.current = { scope, past: [], present: serialized, future: [] }; render(n => n + 1);
    } else if (h.present !== serialized) {
      h.past.push(h.present); h.past = h.past.slice(-40); h.present = serialized; h.future = []; render(n => n + 1);
    }
  }, [serialized, scope, enabled]);
  const travel = (redo: boolean) => {
    const h = history.current, source = redo ? h.future : h.past;
    const target = source.pop(); if (!target || h.scope !== scope) return;
    (redo ? h.past : h.future).push(h.present); h.present = target;
    apply(JSON.parse(target)); render(n => n + 1);
  };
  return { undo: () => travel(false), redo: () => travel(true), canUndo: enabled && history.current.scope === scope && !!history.current.past.length,
    canRedo: enabled && history.current.scope === scope && !!history.current.future.length };
}
