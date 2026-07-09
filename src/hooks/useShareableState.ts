import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

const DEBOUNCE_MS = 300;

function encodeState(obj: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

function decodeState<T>(s: string, defaultState: T): T {
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(s)));
    if (typeof parsed !== 'object' || parsed === null) return defaultState;
    // Shallow merge: unknown keys are ignored, missing keys fall back to default.
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

function readUrlState<T>(moduleId: string, defaultState: T): T {
  const params = new URLSearchParams(window.location.search);
  if (params.get('m') !== moduleId) return defaultState;
  const s = params.get('s');
  if (!s) return defaultState;
  return decodeState(s, defaultState);
}

/** True when the current URL carries a restorable ?m=<moduleId>&s=… snapshot
 * for this module — used to skip cross-view carry-over seeding when a share
 * link (or a previous visit's own state) already determines the initial state. */
export function hasSharedUrlState(moduleId: string): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('m') === moduleId && !!params.get('s');
}

function writeUrl(moduleId: string, state: unknown): void {
  const params = new URLSearchParams();
  params.set('m', moduleId);
  params.set('s', encodeState(state));
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', url);
}

/**
 * Drop-in replacement for useState when the module has a single root state object.
 * Syncs state to ?m=<moduleId>&s=<base64JSON> in the URL.
 */
export function useShareableState<T>(
  moduleId: string,
  defaultState: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => readUrlState(moduleId, defaultState));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => writeUrl(moduleId, state), DEBOUNCE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [moduleId, state]);

  return [state, setState];
}

/**
 * For modules with multiple useState calls. Pass a snapshot of current values
 * and a restore function; the hook handles URL read on mount and URL write on change.
 */
export function useShareEffect<T extends Record<string, unknown>>(
  moduleId: string,
  snapshot: T,
  restore: (s: Partial<T>) => void,
): void {
  const restoredRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore from URL once on mount.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('m') !== moduleId) return;
    const s = params.get('s');
    if (!s) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(atob(s)));
      if (typeof parsed === 'object' && parsed !== null) restore(parsed as Partial<T>);
    } catch { /* ignore malformed URLs */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write URL whenever snapshot changes (debounced).
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => writeUrl(moduleId, snapshot), DEBOUNCE_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  // snapshot is a new object every render; stringify to detect real changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, JSON.stringify(snapshot)]);
}
