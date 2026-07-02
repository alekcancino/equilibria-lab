import { describe, expect, it } from 'vitest';

// Encode/decode logic mirrored from useShareableState.ts for unit testing.
function encodeState(obj: unknown): string {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

function decodeState<T extends Record<string, unknown>>(s: string, defaultState: T): T {
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(s)));
    if (typeof parsed !== 'object' || parsed === null) return defaultState;
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

describe('URL state encode/decode', () => {
  it('roundtrips a simple state object exactly', () => {
    const state = { pH: 7.4, conc: 0.1, label: 'ácido acético' };
    const encoded = encodeState(state);
    const decoded = decodeState(encoded, state);
    expect(decoded).toEqual(state);
  });

  it('roundtrips nested objects', () => {
    const state = { sys: { pKas: [4.76], z0: 0 }, conc: 0.05, show: true };
    const encoded = encodeState(state);
    const decoded = decodeState(encoded, state);
    expect(decoded).toEqual(state);
  });

  it('merges decoded keys onto defaultState (forward-compat: unknown keys do not crash)', () => {
    const defaultState = { pH: 7, conc: 0.1 };
    const encoded = encodeState({ pH: 3, unknownKey: 'extra-from-future-version' });
    const decoded = decodeState(encoded, defaultState);
    // Known keys are updated; defaultState keys missing in URL fall back to default.
    expect(decoded.pH).toBe(3);
    expect(decoded.conc).toBe(0.1);
    // Unknown keys are merged in but do not cause crashes (TypeScript prevents accidental use).
  });

  it('returns defaultState for malformed base64', () => {
    const defaultState = { pH: 7, conc: 0.1 };
    const decoded = decodeState('!!!not-base64!!!', defaultState);
    expect(decoded).toEqual(defaultState);
  });

  it('returns defaultState for valid base64 but invalid JSON', () => {
    const defaultState = { pH: 7, conc: 0.1 };
    const badJson = btoa(encodeURIComponent('{broken json'));
    const decoded = decodeState(badJson, defaultState);
    expect(decoded).toEqual(defaultState);
  });

  it('returns defaultState when decoded value is not an object (e.g. a number)', () => {
    const defaultState = { pH: 7, conc: 0.1 };
    const encoded = encodeState(42);
    const decoded = decodeState(encoded, defaultState);
    expect(decoded).toEqual(defaultState);
  });

  it('returns defaultState when decoded value is null', () => {
    const defaultState = { pH: 7, conc: 0.1 };
    const encoded = encodeState(null);
    const decoded = decodeState(encoded, defaultState);
    expect(decoded).toEqual(defaultState);
  });
});
