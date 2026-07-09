import { describe, it, expect } from 'vitest';
import { defaultAcidSystem, acidSystemFromPreset, isValidAcidSystem, systemLabels } from '../editorModels';

describe('isValidAcidSystem', () => {
  it('acepta sistemas construidos por la app', () => {
    expect(isValidAcidSystem(defaultAcidSystem())).toBe(true);
    expect(isValidAcidSystem(acidSystemFromPreset('phosphoric'))).toBe(true);
    expect(isValidAcidSystem({ label: 'X', z0: 3, pKas: [2.2], speciesLabels: null, reference: null })).toBe(true);
  });

  it('rechaza valores no-objeto y la forma vieja de Mezclas ({acidId})', () => {
    expect(isValidAcidSystem(undefined)).toBe(false);
    expect(isValidAcidSystem(null)).toBe(false);
    expect(isValidAcidSystem('acetic')).toBe(false);
    expect(isValidAcidSystem({ acidId: 'acetic', conc: 0.05, saltLevel: 0 })).toBe(false);
  });

  it('rechaza campos malformados', () => {
    const base = defaultAcidSystem();
    expect(isValidAcidSystem({ ...base, pKas: [4.76, NaN] })).toBe(false);
    expect(isValidAcidSystem({ ...base, pKas: ['4.76'] })).toBe(false);
    expect(isValidAcidSystem({ ...base, z0: 1.5 })).toBe(false);
    expect(isValidAcidSystem({ ...base, z0: -1 })).toBe(false);
    expect(isValidAcidSystem({ ...base, z0: 5 })).toBe(false);
    expect(isValidAcidSystem({ ...base, label: 42 })).toBe(false);
    expect(isValidAcidSystem({ ...base, speciesLabels: [1, 2] })).toBe(false);
  });
});

describe('systemLabels', () => {
  it('usa los labels del preset cuando la longitud coincide', () => {
    const sys = acidSystemFromPreset('phosphoric');
    expect(systemLabels(sys)).toEqual(sys.speciesLabels);
    expect(systemLabels(sys)).toHaveLength(4);
  });

  it('cae a labels genéricos cuando el usuario editó la escalera', () => {
    const sys = { ...acidSystemFromPreset('phosphoric'), speciesLabels: null };
    const labels = systemLabels(sys);
    expect(labels).toHaveLength(sys.pKas.length + 1);
    labels.forEach((l) => expect(typeof l).toBe('string'));
  });
});
