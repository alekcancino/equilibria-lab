import { describe, it, expect } from 'vitest';
import { solvePH, alphaFractions } from '../equilibrium';
import { complexFractions, bjerrumNumber, solvePL } from '../complexation';
import { alphaY4, edtaTitrationCurve } from '../edta';
import { alphaH } from '../conditional';
import { peConditional, peStandard } from '../redox';
import { granPlot } from '../titration';
import type { AcidBaseComponent } from '../equilibrium';
import type { RedoxCouple } from '../redox';

const tol = (val: number, expected: number, delta = 0.02) =>
  expect(Math.abs(val - expected)).toBeLessThan(delta);

// ── equilibrium.ts ───────────────────────────────────────────────────────────

describe('alphaFractions', () => {
  it('ácido acético: a pH=pKa las fracciones son 50/50', () => {
    const pKa = 4.76;
    const h = Math.pow(10, -pKa);
    const [a0, a1] = alphaFractions(h, [pKa]);
    expect(Math.abs(a0 - 0.5)).toBeLessThan(1e-9);
    expect(Math.abs(a1 - 0.5)).toBeLessThan(1e-9);
  });

  it('las fracciones suman 1', () => {
    const h = 1e-7;
    const alphas = alphaFractions(h, [2.0, 2.69, 6.13, 10.37]);
    const sum = alphas.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
  });
});

describe('solvePH', () => {
  it('ácido acético 0.1 M → pH ≈ 2.87', () => {
    const comp: AcidBaseComponent = { c: 0.1, z0: 0, pKas: [4.76] };
    const pH = solvePH([comp]);
    tol(pH, 2.87, 0.05);
  });

  it('NaOH 0.01 M → pH ≈ 12.00', () => {
    const pH = solvePH([], 0.01, 0);
    tol(pH, 12.0, 0.05);
  });

  it('tampón acetato 0.1 M HAc + 0.1 M NaAc → pH ≈ pKa', () => {
    // 0.2 M total de acético, 0.1 M Na⁺ de la sal
    const comp: AcidBaseComponent = { c: 0.2, z0: 0, pKas: [4.76] };
    const pH = solvePH([comp], 0.1, 0);
    tol(pH, 4.76, 0.05);
  });

  it('HCl 0.1 M → pH ≈ 1.00', () => {
    const pH = solvePH([], 0, 0.1);
    tol(pH, 1.0, 0.05);
  });
});

// ── complexation.ts ──────────────────────────────────────────────────────────

describe('complexFractions', () => {
  it('a pL=logβ₁ las fracciones de M y ML son 50/50', () => {
    const logBeta = 8;
    const [a0, a1] = complexFractions(logBeta, [logBeta]);
    expect(Math.abs(a0 - 0.5)).toBeLessThan(1e-9);
    expect(Math.abs(a1 - 0.5)).toBeLessThan(1e-9);
  });

  it('suman 1 con múltiples ligandos', () => {
    const logBetas = [4.04, 7.47, 10.27, 12.03];
    const alphas = complexFractions(6, logBetas);
    const sum = alphas.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
  });
});

describe('bjerrumNumber', () => {
  it('n̄ = 0.5 cuando pL = logβ₁ (sistema 1:1)', () => {
    const logBeta = 8;
    const nBar = bjerrumNumber(logBeta, [logBeta]);
    expect(Math.abs(nBar - 0.5)).toBeLessThan(1e-9);
  });

  it('n̄ → 0 cuando pL >> logβ (sin ligando)', () => {
    const nBar = bjerrumNumber(20, [8]);
    expect(nBar).toBeLessThan(0.001);
  });

  it('n̄ → n cuando pL << 0 (ligando en exceso)', () => {
    const logBetas = [4.04, 7.47, 10.27, 12.03];
    const nBar = bjerrumNumber(-5, logBetas);
    expect(nBar).toBeGreaterThan(3.99);
  });
});

describe('solvePL', () => {
  it('con exceso de ligando pL debe ser pequeño (mucho ligando libre)', () => {
    // cM = 0.001, cL = 0.1, logBeta = 8 → casi todo complejado, [L] ≈ 0.099
    const pL = solvePL(0.001, 0.1, [8]);
    expect(pL).toBeLessThan(2);
  });

  it('sin ligando pL debe ser grande', () => {
    const pL = solvePL(0.01, 0, [8]);
    expect(pL).toBeGreaterThan(8);
  });
});

// ── edta.ts — bug K'f corregido ──────────────────────────────────────────────

describe('alphaY4 (αY(H))', () => {
  it('a pH muy alto αY(H) → 1 (EDTA totalmente desprotonado)', () => {
    const aY = alphaY4(13);
    tol(aY, 1.0, 0.01);
  });

  it('a pH 4 αY(H) >> 1 (protonación significativa)', () => {
    const aY = alphaY4(4);
    expect(aY).toBeGreaterThan(10);
  });
});

describe('edtaTitrationCurve — K\'f correcta', () => {
  it('Ca²⁺-EDTA a pH 10: logK\'f ≈ 10.2 (no 11.2 del bug original)', () => {
    const result = edtaTitrationCurve({
      logKf: 10.65, pH: 10,
      cMetal: 0.01, vMetal: 25, cEdta: 0.01, vMax: 50,
    });
    // Con el fix: logK'f = logKf - log(αY(H)) ≈ 10.65 - 0.45 ≈ 10.2
    tol(result.logKfCond, 10.2, 0.2);
    // Antes del fix era ≈11.1 (bug: multiplicaba αY(H) en lugar de dividir)
    expect(result.logKfCond).toBeLessThan(10.7);
  });

  it('a pH 3 K\'f << K\f (condiciones muy ácidas perjudican el complejo)', () => {
    const pH10 = edtaTitrationCurve({ logKf: 10.65, pH: 10, cMetal: 0.01, vMetal: 25, cEdta: 0.01, vMax: 50 });
    const pH3  = edtaTitrationCurve({ logKf: 10.65, pH: 3,  cMetal: 0.01, vMetal: 25, cEdta: 0.01, vMax: 50 });
    expect(pH10.logKfCond).toBeGreaterThan(pH3.logKfCond + 3);
  });
});

// ── conditional.ts ───────────────────────────────────────────────────────────

describe('alphaH (coeficiente de reacción parásita)', () => {
  it('sin pKas el coeficiente es 1 (sin reacción parásita)', () => {
    const a = alphaH([], 7);
    expect(Math.abs(a - 1)).toBeLessThan(1e-12);
  });

  it('αY(H) = αH del EDTA son idénticos', () => {
    const EDTA_PKAS = [2.0, 2.69, 6.13, 10.37];
    expect(alphaY4(7)).toBeCloseTo(alphaH(EDTA_PKAS, 7), 10);
  });
});

// ── redox.ts ─────────────────────────────────────────────────────────────────

describe('peStandard', () => {
  it('Fe³⁺/Fe²⁺ E°=0.771V → pe° ≈ 13.03', () => {
    const pe = peStandard(0.771);
    tol(pe, 0.771 / 0.05916, 0.1);
  });
});

describe('peConditional', () => {
  const base = { id: '', name: '', halfReaction: '', reference: '' };

  it('par sin H⁺: pe°′ = pe° independientemente del pH', () => {
    const couple: RedoxCouple = { ...base, ox: 'Fe³⁺', red: 'Fe²⁺', E0: 0.771, n: 1, mH: 0 };
    const pe0 = peConditional(couple, 0);
    const pe7 = peConditional(couple, 7);
    tol(pe0, pe7, 1e-10);
  });

  it('par con H⁺ (MnO₄⁻): pe°′ decrece con pH', () => {
    // MnO4- + 8H+ + 5e- → Mn2+ + 4H2O, E°=1.51V, mH=8, n=5
    const couple: RedoxCouple = { ...base, ox: 'MnO₄⁻', red: 'Mn²⁺', E0: 1.51, n: 5, mH: 8 };
    const pe0 = peConditional(couple, 0);
    const pe7 = peConditional(couple, 7);
    expect(pe0).toBeGreaterThan(pe7);
    // Δpe°′ = (mH/n)·ΔpH = (8/5)·7 = 11.2
    tol(pe0 - pe7, 11.2, 0.1);
  });
});

// ── titration.ts — Gran plot ──────────────────────────────────────────────────

describe('granPlot', () => {
  it('F1 = (V0+V)·10^(−pH): a pH 2 con V=0, V0=25 → F1 = 25·0.01 = 0.25', () => {
    const { F1 } = granPlot([0], [2], 25);
    tol(F1[0], 0.25, 1e-10);
  });

  it('F2 = (V0+V)·10^(pH−14): a pH 12 con V=0, V0=25 → F2 = 25·0.01 = 0.25', () => {
    const { F2 } = granPlot([0], [12], 25);
    tol(F2[0], 0.25, 1e-10);
  });

  it('F1 y F2 tienen la misma cantidad de puntos que el input', () => {
    const volumes = [0, 5, 10, 15];
    const pHs = [3, 5, 7, 9];
    const result = granPlot(volumes, pHs, 25);
    expect(result.v1.length).toBe(4);
    expect(result.F1.length).toBe(4);
    expect(result.v2.length).toBe(4);
    expect(result.F2.length).toBe(4);
  });
});
