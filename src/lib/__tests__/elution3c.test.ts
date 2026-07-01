import { describe, it, expect } from 'vitest';
import {
  elutionAtPH3C, optimalElutionPH3C, defaultSideStack, type Elution3CParams,
} from '../sideReactions';

// QA III third-exam system: Ni on resin, recovery with EDTA.
function niElutionParams(): Elution3CParams {
  const stack = defaultSideStack(); // EDTA pKas
  stack.hydrolysis = { logBetasOH: [4.97, 8.55] }; // Ni(OH)
  return {
    nNiResin: 2e-5,   // mol Ni en resina (0,2 L · 0,1 mM)
    vEdta: 0.2,       // L
    cEdta: 0.1,       // M EDTA
    logKfNiY: 18.56,
    stack,
    kSelSquared: 3,
    hResin: 0.005,
  };
}

describe('elutionAtPH3C — balance 3 compartimentos', () => {
  it('conserva masa: m + chelate + resinHeld = C_Ni', () => {
    const p = niElutionParams();
    const r = elutionAtPH3C(p, 6);
    const cNi = p.nNiResin / p.vEdta;
    const sum = r.mFree + r.chelate + r.resinHeld;
    expect(Math.abs(sum - cNi) / cNi).toBeLessThan(1e-3);
  });

  it('la fracción eluida está en [0, 1]', () => {
    const p = niElutionParams();
    for (const pH of [2, 4, 6, 8, 10, 12]) {
      const f = elutionAtPH3C(p, pH).fractionEluted;
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it('más EDTA elucionante → más Ni recuperado (a pH ácido, elución parcial)', () => {
    // At pH 2 the resin retains Ni (large D, hBulk > hResin): elution is partial,
    // so the amount of EDTA matters.
    const p = niElutionParams();
    const low = elutionAtPH3C({ ...p, cEdta: 5e-5 }, 2).fractionEluted;
    const high = elutionAtPH3C({ ...p, cEdta: 0.1 }, 2).fractionEluted;
    expect(high).toBeGreaterThan(low);
  });

  it('resina más selectiva (K² mayor) retiene más Ni → no más eluido', () => {
    const p = niElutionParams();
    const weak = elutionAtPH3C({ ...p, kSelSquared: 1 }, 2).fractionEluted;
    const strong = elutionAtPH3C({ ...p, kSelSquared: 1000 }, 2).fractionEluted;
    expect(strong).toBeLessThanOrEqual(weak + 1e-9);
  });
});

describe('optimalElutionPH3C', () => {
  it('devuelve un pH óptimo dentro del rango y una curva monótona en tamaño', () => {
    const p = niElutionParams();
    const r = optimalElutionPH3C(p, [2, 12], 100);
    expect(r.pH).toBeGreaterThanOrEqual(2);
    expect(r.pH).toBeLessThanOrEqual(12);
    expect(r.pHs.length).toBe(101);
    expect(r.fractions.length).toBe(101);
    // The optimum is the maximum of the curve
    expect(r.fractionEluted).toBe(Math.max(...r.fractions));
  });
});
