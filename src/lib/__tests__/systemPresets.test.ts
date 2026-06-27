import { describe, it, expect } from 'vitest';
import { SYSTEM_PRESETS, systemPresetById, sideFromPreset } from '../systemPresets';
import { condLogKPrimary, sideStackFromEditor } from '../sideReactions';

describe('SYSTEM_PRESETS', () => {
  it('todos los presets tienen id único y campos requeridos', () => {
    const ids = new Set<string>();
    for (const p of SYSTEM_PRESETS) {
      expect(ids.has(p.id), `id duplicado: ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.metalLabel.length).toBeGreaterThan(0);
      expect(Number.isFinite(p.logKf)).toBe(true);
      expect(p.side.ligandPKas.length).toBeGreaterThan(0);
    }
  });

  it('sideFromPreset clona sin compartir referencias de arrays', () => {
    const p = systemPresetById('zn-edta-nh3')!;
    const a = sideFromPreset(p);
    a.logBetasOH.push(99);
    expect(p.side.logBetasOH).not.toContain(99);
  });

  it('Ca–EDTA: log K′f(pH 10) ≈ 10,2 (sin parásitas del metal)', () => {
    const p = systemPresetById('ca-edta')!;
    const stack = sideStackFromEditor(sideFromPreset(p));
    const logKp = condLogKPrimary(p.logKf, 10, stack);
    // K'f = Kf / αY(H); αY(EDTA, pH10) ≈ 0,45 en log → log K' ≈ 10,65 − 0,45
    expect(logKp).toBeGreaterThan(9.5);
    expect(logKp).toBeLessThan(10.65);
  });

  it('log K′ condicional siempre ≤ log K_f (α ≥ 1)', () => {
    for (const p of SYSTEM_PRESETS) {
      const stack = sideStackFromEditor(sideFromPreset(p));
      const logKp = condLogKPrimary(p.logKf, p.pH, stack);
      expect(logKp, `${p.id} a pH ${p.pH}`).toBeLessThanOrEqual(p.logKf + 1e-9);
    }
  });

  it('Zn–EDTA–NH₃: el enmascaramiento por NH₃ reduce log K′ respecto a solo EDTA', () => {
    const p = systemPresetById('zn-edta-nh3')!;
    const withNH3 = sideStackFromEditor(sideFromPreset(p));
    const bare = sideFromPreset(p);
    bare.showAux = false;
    const noNH3 = sideStackFromEditor(bare);
    const kWith = condLogKPrimary(p.logKf, 10, withNH3);
    const kNo = condLogKPrimary(p.logKf, 10, noNH3);
    expect(kWith).toBeLessThan(kNo);
  });
});
