import { describe, it, expect } from 'vitest';
import {
  speciationFractions, solveFreePL, speciationAtPH, speciationCurve,
  type MetalSpeciationSystem,
} from '../speciation';
import { complexFractions, solvePL } from '../complexation';
import { alphaOH } from '../conditional';

function sys(overrides: Partial<MetalSpeciationSystem>): MetalSpeciationSystem {
  return {
    metalLabel: 'M', cM: 1e-4, logBetasOH: [], ligandLabel: 'L', logBetasL: [], pKasL: [], cL: 0,
    ...overrides,
  };
}

// ── Golden cases (Burgot, Ionic Equilibria in Analytical Chemistry, cap. 25) ──

describe('speciationFractions — Burgot Ej.1: Hg²⁺ hidrólisis pura', () => {
  it('Hg²⁺ 1e-4 M, pH 3, logβOH=[10.3,21.7] → 5.9e-5 / 1.2e-5 / 2.9e-5', () => {
    const cM = 1e-4;
    const fr = speciationFractions(3, Infinity, [10.3, 21.7], []);
    const [hg, hgoh, hgoh2] = fr.map((f) => f * cM);
    expect(hg).toBeCloseTo(5.9e-5, 6);
    expect(hgoh).toBeCloseTo(1.2e-5, 6);
    expect(hgoh2).toBeCloseTo(2.9e-5, 6);
    // ±2% of book-rounded values
    expect(Math.abs(hg - 5.9e-5) / 5.9e-5).toBeLessThan(0.02);
    expect(Math.abs(hgoh - 1.2e-5) / 1.2e-5).toBeLessThan(0.03);
    expect(Math.abs(hgoh2 - 2.9e-5) / 2.9e-5).toBeLessThan(0.02);
  });
});

describe('speciationFractions — Burgot Ej.2: Hg²⁺/Cl⁻ a pL fijo', () => {
  // The book's stated [Cl⁻]=3.40e-2 doesn't close the mass balance against
  // cL=0.2 M (NEEDS-VERIFICATION against the physical totals) — this test
  // only asserts that at the book's stated pL/pH, the engine reproduces the
  // book's stated equilibrium concentrations (internal consistency, not a
  // solve-from-totals assertion).
  const logBetasCl = [6.74, 13.22, 14.07, 15.07]; // cumulative from stepwise 6.74/6.48/0.85/1.00
  const pL = -Math.log10(3.40e-2);
  const cM = 0.1;

  it('reproduce [HgCl₂], [HgCl₃⁻] y [Hg²⁺] del libro (±1%)', () => {
    const fr = speciationFractions(5.8, pL, [], logBetasCl);
    const [hg, , hgCl2, hgCl3] = fr.map((f) => f * cM);
    expect(Math.abs(hgCl2 - 7.56e-2) / 7.56e-2).toBeLessThan(0.05);
    expect(Math.abs(hgCl3 - 1.82e-2) / 1.82e-2).toBeLessThan(0.05);
    expect(Math.abs(hg - 3.9e-12) / 3.9e-12).toBeLessThan(0.05);
  });
});

// ── Degenerate cases ──────────────────────────────────────────────────────

describe('speciationFractions — casos degenerados', () => {
  it('cL=0 ⇒ forma cerrada de hidrólisis pura (sin términos L)', () => {
    const logBetasOH = [10.3, 21.7];
    const s = sys({ logBetasOH, logBetasL: [8], cL: 0 });
    const pt = speciationAtPH(s, 6);
    expect(pt.pL).toBe(Infinity);
    // Only the OH branch should carry weight; fractions[3] (the lone L species,
    // after [M, MOH, MOH2]) = 0
    expect(pt.fractions[3]).toBe(0);
    const sum = pt.fractions.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('sin hidrólisis (logBetasOH=[]) y sin protonación (pKasL=[]) ⇒ igual que complexFractions(solvePL(...))', () => {
    const logBetasL = [4.04, 7.47, 10.27, 12.03]; // Cu-NH3
    const cM = 0.001;
    const cL = 0.05;
    for (const pH of [2, 5, 8, 11]) {
      const s = sys({ cM, logBetasL, cL });
      const pt = speciationAtPH(s, pH);
      const expectedPL = solvePL(cM, cL, logBetasL);
      expect(pt.pL).toBeCloseTo(expectedPL, 6);
      const expectedFractions = complexFractions(expectedPL, logBetasL);
      pt.fractions.forEach((f, i) => expect(f).toBeCloseTo(expectedFractions[i], 8));
    }
  });

  it('Σ fracciones = 1 en una malla de pH/pL/β aleatorios', () => {
    const s = sys({ cM: 0.01, logBetasOH: [5, 9, 14], logBetasL: [3, 6], cL: 0.02 });
    for (const pH of [0, 2, 4, 6, 8, 10, 12, 14]) {
      const pt = speciationAtPH(s, pH);
      const sum = pt.fractions.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    }
  });

  it('NaN cuando cM es tan grande que ni siquiera la cola de la ventana de bisección (hi = maxβ+8) da un residual sin ligando cercano a cero', () => {
    // cM·n̄(hi) ≈ cM·10^(maxβ−hi) = cM·1e-8 must dwarf cL for the fixed
    // [lo, hi] window to fail to bracket a root.
    const s = sys({ cM: 1e6, logBetasL: [9], cL: 1e-6 });
    const pL = solveFreePL(7, s.cM, s.cL, s.logBetasOH, s.logBetasL, s.pKasL);
    expect(Number.isNaN(pL)).toBe(true);
  });

  it('n̄ no crece cuando pL aumenta (menos ligando libre ⇒ menos ligando unido)', () => {
    const s = sys({ cM: 0.001, logBetasL: [4.04, 7.47, 10.27, 12.03], cL: 0.05 });
    const curve = speciationCurve(s, [1, 13], 40);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].nBar).toBeLessThanOrEqual(curve[i - 1].nBar + 1e-9);
    }
  });
});

describe('speciationFractions — invariante cruzado con alphaOH (conditional.ts)', () => {
  it('(f_M + Σf_MOH)/f_M === alphaOH(logBetasOH, pH) sin ligando', () => {
    const logBetasOH = [11.81, 21.68, 30.67]; // Fe³⁺
    for (const pH of [1, 2, 3, 5, 8]) {
      const fr = speciationFractions(pH, Infinity, logBetasOH, []);
      const total = fr.reduce((a, b) => a + b, 0); // = 1, but written out for clarity
      const ratio = total / fr[0];
      const expected = alphaOH(logBetasOH, pH);
      expect(Math.abs(ratio - expected) / expected).toBeLessThan(1e-6);
    }
  });
});
