import { describe, expect, it } from 'vitest';
import { waterThermodynamicState } from '../thermodynamicState';
import { translations } from '../../i18n/translations';

describe('waterThermodynamicState temperature scope', () => {
  it('varies only pKw and acidityRange while solvent labels stay fixed', () => {
    const cold = waterThermodynamicState(10);
    const hot = waterThermodynamicState(100);
    expect(cold.label).toBe('Water');
    expect(hot.label).toBe('Water');
    expect(cold.lioniumLabel).toBe('H₃O⁺');
    expect(hot.lyateLabel).toBe('OH⁻');
    expect(cold.pKw).not.toBe(hot.pKw);
    expect(cold.acidityRange[0]).toBe(-2);
    expect(hot.acidityRange[0]).toBe(-2);
    expect(cold.acidityRange[1]).toBeCloseTo(cold.pKw + 2, 10);
    expect(hot.acidityRange[1]).toBeCloseTo(hot.pKw + 2, 10);
  });
});

describe('titulacion temperature scope copy', () => {
  it('declares bilingual scope hints for acid–base and sensor modes', () => {
    for (const key of ['titulacion.temperatureScopeHint', 'titulacion.sensorTemperatureScopeHint'] as const) {
      expect(translations[key].es.length).toBeGreaterThan(10);
      expect(translations[key].en.length).toBeGreaterThan(10);
    }
    expect(translations['titulacion.temperatureScopeLabel'].es).toContain('pKw');
    expect(translations['titulacion.temperatureScopeLabel'].en).toContain('pKw');
  });
});
