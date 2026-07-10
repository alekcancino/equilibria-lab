import { useCallback, useEffect, useState } from 'react';

// useShareEffect/useShareableState debounce their URL write this long after
// the last state change (useShareableState.ts's DEBOUNCE_MS) — save() must
// wait at least this long past the last edit before trusting
// window.location.href, or a save right after editing can silently persist
// the pre-edit URL.
const SHARE_DEBOUNCE_MS = 300;

export interface SavedSystem {
  id: string;
  name: string;
  moduleId: string;
  savedAt: string;
  url: string;
}

const STORAGE_KEY = 'equilibria-saved-systems';

/** Runtime shape check for a SavedSystem read from localStorage — data a
 * user (or an old app version) could have written in a shape this version
 * no longer expects. Reject rather than let a malformed entry crash the
 * list or navigate somewhere broken on load. */
export function isValidSavedSystem(x: unknown): x is SavedSystem {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Record<string, unknown>;
  return typeof s.id === 'string'
    && typeof s.name === 'string' && s.name.trim().length > 0
    && typeof s.moduleId === 'string'
    && typeof s.savedAt === 'string'
    && typeof s.url === 'string';
}

export function parseSavedSystems(raw: string | null): SavedSystem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSavedSystem);
  } catch {
    return [];
  }
}

function readAll(): SavedSystem[] {
  try {
    return parseSavedSystems(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeAll(systems: SavedSystem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
  } catch { /* private mode / storage full — best-effort, UI state still updates */ }
}

/**
 * Per-module saved systems, backed by a single localStorage key shared by
 * every module (filtered by moduleId on read). "Saving" captures the current
 * shareable URL — kept in sync by useShareEffect/useShareableState, the same
 * mechanism ShareButton relies on — under a name; "loading" navigates to it,
 * so restoration goes through the exact same parsing/validation path every
 * module already has for a pasted share link (e.g. isValidAcidSystem), with
 * no separate logic to keep in sync.
 */
export function useSavedSystems(moduleId: string) {
  const [all, setAll] = useState<SavedSystem[]>(readAll);
  const systems = all.filter((s) => s.moduleId === moduleId);

  // Reconcile with writes from another tab/window — save/remove below always
  // read-then-write against the CURRENT localStorage content (not this
  // instance's possibly-stale `all`), so this only needs to keep the visible
  // list in sync, not prevent data loss (that's handled at the write site).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) setAll(readAll());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const save = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Wait past the share-link debounce so a save right after an edit
    // (e.g. releasing a slider and immediately clicking "Guardar") captures
    // the just-edited state instead of whatever URL preceded the edit.
    window.setTimeout(() => {
      const entry: SavedSystem = {
        id: crypto.randomUUID(),
        name: trimmed,
        moduleId,
        savedAt: new Date().toISOString(),
        url: window.location.href,
      };
      // Read fresh rather than reuse this instance's `all`: another tab may
      // have saved/removed a system since this instance last synced, and
      // writing from a stale copy would silently drop that change.
      const next = [...readAll(), entry];
      writeAll(next);
      setAll(next);
    }, SHARE_DEBOUNCE_MS + 50);
  }, [moduleId]);

  const remove = useCallback((id: string) => {
    const next = readAll().filter((s) => s.id !== id);
    writeAll(next);
    setAll(next);
  }, []);

  const load = useCallback((entry: SavedSystem) => {
    window.location.href = entry.url;
  }, []);

  return { systems, save, remove, load };
}
