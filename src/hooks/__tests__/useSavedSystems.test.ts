import { describe, it, expect } from 'vitest';
import { isValidSavedSystem, parseSavedSystems, type SavedSystem } from '../useSavedSystems';

const valid: SavedSystem = {
  id: 'abc-123',
  name: 'Mi sistema',
  moduleId: 'acidobase',
  savedAt: '2026-07-09T12:00:00.000Z',
  url: 'https://equilibria-lab.vercel.app/?m=acidobase&s=xyz',
};

describe('isValidSavedSystem', () => {
  it('acepta un SavedSystem bien formado', () => {
    expect(isValidSavedSystem(valid)).toBe(true);
  });

  it('rechaza valores no-objeto', () => {
    expect(isValidSavedSystem(undefined)).toBe(false);
    expect(isValidSavedSystem(null)).toBe(false);
    expect(isValidSavedSystem('acidobase')).toBe(false);
  });

  it('rechaza campos faltantes o de tipo incorrecto', () => {
    expect(isValidSavedSystem({ ...valid, id: undefined })).toBe(false);
    expect(isValidSavedSystem({ ...valid, name: '' })).toBe(false);
    expect(isValidSavedSystem({ ...valid, name: '   ' })).toBe(false);
    expect(isValidSavedSystem({ ...valid, moduleId: 42 })).toBe(false);
    expect(isValidSavedSystem({ ...valid, savedAt: 'not-a-date' })).toBe(false);
    expect(isValidSavedSystem({ ...valid, url: null })).toBe(false);
  });
});

describe('parseSavedSystems', () => {
  it('null o vacío → lista vacía', () => {
    expect(parseSavedSystems(null)).toEqual([]);
    expect(parseSavedSystems('')).toEqual([]);
  });

  it('JSON corrupto → lista vacía, sin lanzar', () => {
    expect(parseSavedSystems('{not json')).toEqual([]);
  });

  it('JSON válido pero no-array → lista vacía', () => {
    expect(parseSavedSystems(JSON.stringify(valid))).toEqual([]);
  });

  it('filtra solo los elementos inválidos, conserva los válidos', () => {
    const raw = JSON.stringify([valid, { id: 'bad' }, { ...valid, id: 'def-456' }]);
    const result = parseSavedSystems(raw);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual(['abc-123', 'def-456']);
  });
});
