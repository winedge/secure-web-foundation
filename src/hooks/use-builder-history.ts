import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lightweight undo/redo for any serializable state.
 * Pushes commit-style snapshots: call `commit(next)` to record + propagate.
 */
export function useBuilderHistory<T>(initial: T, apply: (v: T) => void, limit = 60) {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef<T>(initial);
  const [version, setVersion] = useState(0);

  const commit = useCallback((next: T) => {
    past.current.push(last.current);
    if (past.current.length > limit) past.current.shift();
    future.current = [];
    last.current = next;
    apply(next);
    setVersion((v) => v + 1);
  }, [apply, limit]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(last.current);
    last.current = prev;
    apply(prev);
    setVersion((v) => v + 1);
  }, [apply]);

  const redo = useCallback(() => {
    const nxt = future.current.pop();
    if (nxt === undefined) return;
    past.current.push(last.current);
    last.current = nxt;
    apply(nxt);
    setVersion((v) => v + 1);
  }, [apply]);

  /** Replace baseline without recording (e.g., when external prop changes). */
  const reset = useCallback((v: T) => {
    last.current = v;
    past.current = [];
    future.current = [];
    setVersion((x) => x + 1);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return {
    commit,
    undo,
    redo,
    reset,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    version,
  };
}
