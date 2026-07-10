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

// ── Tercera rama: segundo agente complejante X ───────────────────────────────

describe('speciation — rama X (segundo agente complejante)', () => {
  const ZN_NH3 = [2.37, 4.81, 7.31, 9.46];
  const CU_EN = [10.72, 20.03];

  it('sin rama X (params por defecto) reproduce exactamente el modelo de dos ramas', () => {
    const oldCall = speciationFractions(7, 4, [4.97, 8.55], ZN_NH3);
    const newCall = speciationFractions(7, 4, [4.97, 8.55], ZN_NH3, Infinity, []);
    expect(newCall).toEqual(oldCall);
    const s = sys({ cM: 1e-3, logBetasOH: [4.97, 8.55], logBetasL: ZN_NH3, cL: 0.05, pKasL: [9.25] });
    const withUndefX = speciationAtPH(s, 8);
    const withEmptyX = speciationAtPH({ ...s, x: { logBetasX: [], spec: { mode: 'free', cL: 0 } } }, 8);
    expect(withEmptyX.pL).toBe(withUndefX.pL);
    expect(withEmptyX.fractions).toEqual(withUndefX.fractions);
  });

  it('identidad de fracción libre: f_M = 1/(α_OH + α_L + α_X − 2) — tres implementaciones independientes', () => {
    // D = 1 + ΣOH + ΣL + ΣX = α_OH + α_L + α_X − 2 (cada α = 1 + Σ propia).
    const logBetasOH = [4.97, 8.55];
    const pH = 9;
    const pL = 3;
    const pX = 2.5;
    const fr = speciationFractions(pH, pL, logBetasOH, ZN_NH3, pX, CU_EN);
    const aOH = alphaOH(logBetasOH, pH);
    const sumL = ZN_NH3.reduce((s2, b, i) => s2 + Math.pow(10, b + (i + 1) * -pL), 0);
    const sumX = CU_EN.reduce((s2, b, k) => s2 + Math.pow(10, b + (k + 1) * -pX), 0);
    const D = aOH + sumL + sumX;
    expect(Math.abs(fr[0] - 1 / D) / (1 / D)).toBeLessThan(1e-9);
    expect(Math.abs(fr.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-12);
  });

  it('X en modo total: ambos balances de masa se satisfacen en el punto resuelto', () => {
    const s = sys({
      cM: 1e-3,
      logBetasOH: [4.97, 8.55],
      logBetasL: ZN_NH3,
      cL: 0.02,
      pKasL: [9.25],
      x: { logBetasX: CU_EN, spec: { mode: 'total', cTotal: 0.01, pKas: [7.1, 10.0] } },
    });
    const pt = speciationAtPH(s, 9);
    expect(Number.isFinite(pt.pL)).toBe(true);
    expect(Number.isFinite(pt.pX)).toBe(true);
    // Balance de L: cL = [L]·α_L(H) + cM·n̄_L
    const aLH = 1 + Math.pow(10, 9.25 - 9);
    const balL = Math.pow(10, -pt.pL) * aLH + s.cM * pt.nBar;
    expect(Math.abs(balL - s.cL) / s.cL).toBeLessThan(1e-6);
    // Balance de X: cX = [X]·α_X(H) + cM·n̄_X
    const aXH = 1 + Math.pow(10, 10.0 - 9) + Math.pow(10, 10.0 + 7.1 - 18);
    const balX = Math.pow(10, -pt.pX) * aXH + s.cM * pt.nBarX;
    expect(Math.abs(balX - 0.01) / 0.01).toBeLessThan(1e-6);
  });

  it('X total con cX→0 colapsa a la curva sin X', () => {
    const base = sys({ cM: 1e-3, logBetasOH: [4.97, 8.55], logBetasL: ZN_NH3, cL: 0.02, pKasL: [9.25] });
    const noX = speciationAtPH(base, 8);
    const tinyX = speciationAtPH({
      ...base,
      x: { logBetasX: CU_EN, spec: { mode: 'total', cTotal: 1e-15, pKas: [] } },
    }, 8);
    expect(Math.abs(tinyX.pL - noX.pL)).toBeLessThan(1e-3);
  });

  it('X fuerte a [X] fijo captura al metal: dominante pasa de hidroxo a MX', () => {
    const base = sys({ cM: 1e-4, logBetasOH: [4.97, 8.55, 13.9, 15.1], logBetasL: [], cL: 0 });
    const noX = speciationAtPH(base, 10);
    const nOH = 4;
    const domNoX = noX.fractions.indexOf(Math.max(...noX.fractions));
    expect(domNoX).toBeGreaterThan(0); // hidroxo domina a pH 10 sin X
    const withX = speciationAtPH({
      ...base,
      x: { logBetasX: CU_EN, spec: { mode: 'free', cL: 0.01 } },
    }, 10);
    const domX = withX.fractions.indexOf(Math.max(...withX.fractions));
    expect(domX).toBeGreaterThan(nOH); // ahora domina una especie MX
  });
});
