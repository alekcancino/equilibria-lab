import { describe, it, expect } from 'vitest';
import { solvePH, alphaFractions } from '../equilibrium';
import { complexFractions, bjerrumNumber, solvePL } from '../complexation';
import { alphaY4, edtaTitrationCurve, EDTA_PKAS } from '../edta';
import {
  alphaH, alphaOH, condLogK, condLogKCurve, feasibilityWindow,
  hydroxideSolCurve, precipitationPH,
} from '../conditional';
import { peConditional, peStandard, alphaRedox, redoxTitrationCurve } from '../redox';
import { granPlot, titrationCurve, titratableProtons, firstDerivative } from '../titration';
import { ladderFractions, ladderLogC, predominanceZones } from '../ladder';
import { anionFreeFraction, solubility, solubilityVsPX } from '../solubility';
import { precipTitrationCurve, mohrEndpointPAg } from '../precipTitration';
import { buildSystem, availableSystems, waterLines } from '../pourbaix';
import { batchIonExchange } from '../ionExchange';
import { activityCoefficient } from '../activity';
import { SALTS } from '../database';
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

  it('Fe³⁺ a pH 2: logK\'f coincide con condLogK incluyendo αM(OH)', () => {
    const logKf = 25.10;
    const logBetasOH = [11.81, 21.68, 30.67];
    const pH = 2;
    const result = edtaTitrationCurve({
      logKf, pH, logBetasOH,
      cMetal: 0.01, vMetal: 25, cEdta: 0.01, vMax: 50,
    });
    const expected = condLogK(logKf, {
      alphaM: alphaOH(logBetasOH, pH),
      alphaY: alphaH(EDTA_PKAS, pH),
    });
    const withoutOH = condLogK(logKf, { alphaM: 1, alphaY: alphaH(EDTA_PKAS, pH) });
    expect(result.logKfCond).toBeCloseTo(expected, 8);
    expect(result.logKfCond).toBeLessThan(withoutOH);
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

// ── ladder.ts ────────────────────────────────────────────────────────────────

describe('ladderFractions', () => {
  it('ácido monoprótico: a p = pKa las fracciones son 50/50 (ascending)', () => {
    const pKa = 4.76;
    const [a0, a1] = ladderFractions(pKa, [pKa], true);
    expect(Math.abs(a0 - 0.5)).toBeLessThan(1e-9);
    expect(Math.abs(a1 - 0.5)).toBeLessThan(1e-9);
  });

  it('complejo 1:1: a pL = log β las fracciones son 50/50 (descending)', () => {
    const logBeta = 8;
    const [a0, a1] = ladderFractions(logBeta, [logBeta], false);
    expect(Math.abs(a0 - 0.5)).toBeLessThan(1e-9);
    expect(Math.abs(a1 - 0.5)).toBeLessThan(1e-9);
  });

  it('las fracciones suman 1 con 4 fronteras', () => {
    const boundaries = [2.0, 2.69, 6.13, 10.37];
    const alphas = ladderFractions(7, boundaries, true);
    const sum = alphas.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
  });
});

describe('ladderLogC', () => {
  it('a pKa y log C = −2 las especies principales tienen log[S] ≈ −2.3', () => {
    const pKa = 4.76;
    const logCs = ladderLogC(pKa, [pKa], true, -2);
    expect(logCs[0]).toBeLessThan(-2.1);
    expect(logCs[1]).toBeLessThan(-2.1);
  });
});

describe('predominanceZones', () => {
  it('HAc con pKa 4.76 en [0,14] genera 2 zonas', () => {
    const zones = predominanceZones([4.76], ['HAc', 'Ac⁻'], 0, 14, true);
    expect(zones.length).toBe(2);
  });
});

// ── conditional.ts (resto) ─────────────────────────────────────────────────

describe('alphaOH', () => {
  it('sin β hidroxo el coeficiente es 1', () => {
    expect(alphaOH([], 7)).toBe(1);
  });

  it('Fe³⁺ con hidroxocomplejos a pH 2 → α > 1', () => {
    const logBetasOH = [11.81, 21.68, 30.67];
    expect(alphaOH(logBetasOH, 2)).toBeGreaterThan(1);
  });
});

describe('condLogK', () => {
  it('log K′ = log Kf − log αH − log αOH a pH fijo', () => {
    const pH = 10;
    const logKf = 10.65;
    const aH = alphaH(EDTA_PKAS, pH);
    const aOH = alphaOH([], pH);
    const expected = logKf - Math.log10(aH) - Math.log10(aOH);
    expect(condLogK(logKf, { alphaM: aOH, alphaY: aH })).toBeCloseTo(expected, 10);
  });
});

describe('feasibilityWindow', () => {
  it('Ca–EDTA alcanza log K′ ≥ 6 en ventana de pH alcalino', () => {
    const curve = condLogKCurve(10.65, EDTA_PKAS, [], [], 0, [1, 14], 200);
    const maxLogK = Math.max(...curve.logKs);
    expect(maxLogK).toBeGreaterThan(8);
    const window = feasibilityWindow(curve.pHs, curve.logKs, 6);
    expect(window).not.toBeNull();
    expect(window![1] - window![0]).toBeGreaterThan(2);
  });
});

describe('hydroxideSolCurve', () => {
  it('Fe(OH)₃ sin hidroxocomplejos: pendiente −3 por unidad de pH', () => {
    const { pHs, logS } = hydroxideSolCurve(39, 3, [], [8, 12], 100);
    const i10 = pHs.findIndex((p) => Math.abs(p - 10) < 0.1);
    const i11 = pHs.findIndex((p) => Math.abs(p - 11) < 0.1);
    expect(i10).toBeGreaterThan(0);
    expect(i11).toBeGreaterThan(i10);
    const slope = (logS[i11] - logS[i10]) / (pHs[i11] - pHs[i10]);
    tol(slope, -3, 0.05);
  });
});

describe('precipitationPH', () => {
  it('devuelve pH coherente con hydroxideSolCurve al cruzar umbral', () => {
    const pKsp = 15;
    const n = 2;
    const logBetasOH: number[] = [];
    const logSThreshold = -4;
    const pH = precipitationPH(pKsp, n, logBetasOH, logSThreshold, [0, 14], 'falling');
    expect(pH).not.toBeNull();
    if (pH !== null) {
      const { logS } = hydroxideSolCurve(pKsp, n, logBetasOH, [pH - 0.01, pH + 0.01], 20);
      expect(logS[0]).toBeGreaterThan(logSThreshold - 0.5);
    }
  });
});

// ── solubility.ts ────────────────────────────────────────────────────────────

describe('anionFreeFraction', () => {
  it('Cl⁻ no básico → fracción libre = 1', () => {
    const agcl = SALTS.find((s) => s.id === 'agcl')!;
    expect(anionFreeFraction(agcl, 7)).toBe(1);
  });

  it('CaCO₃ a pH 7 → fracción de CO₃²⁻ muy pequeña', () => {
    const caco3 = SALTS.find((s) => s.id === 'caco3')!;
    expect(anionFreeFraction(caco3, 7)).toBeLessThan(0.01);
  });
});

describe('solubility', () => {
  it('AgCl puro a pH 7 → s ≈ 10^−4.87 M', () => {
    const agcl = SALTS.find((s) => s.id === 'agcl')!;
    const s = solubility(agcl, 7, 0);
    tol(Math.log10(s), -4.87, 0.05);
  });

  it('AgCl con ion común 0.01 M → s menor que sin ion común', () => {
    const agcl = SALTS.find((s) => s.id === 'agcl')!;
    const sPure = solubility(agcl, 7, 0);
    const sCommon = solubility(agcl, 7, 0.01);
    expect(sCommon).toBeLessThan(sPure);
  });
});

// ── precipTitration.ts ───────────────────────────────────────────────────────

describe('precipTitrationCurve', () => {
  it('AgCl 0.1 M, 25 mL, Ag⁺ 0.1 M → vEq = 25 mL, pAgEq = 4.87', () => {
    const curve = precipTitrationCurve({
      pKsp: 9.74, cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 40,
    });
    tol(curve.vEq, 25, 0.01);
    tol(curve.pAgEq, 4.87, 0.01);
  });

  it('a v = 0 hay exceso de analito → pX = 1 (−log[Cl⁻] a 0.1 M)', () => {
    const curve = precipTitrationCurve({
      pKsp: 9.74, cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 40,
    });
    expect(curve.volumes[0]).toBe(0);
    tol(curve.pXs[0], 1.0, 0.01);
  });
});

describe('mohrEndpointPAg', () => {
  it('cCrO₄ = 0.005 M → pAg donde precipita Ag₂CrO₄', () => {
    // Ksp(Ag₂CrO₄)=10^−11.89 → pAg = ½(pKsp − log[CrO₄²⁻]) ≈ 4.79
    tol(mohrEndpointPAg(0.005), 4.79, 0.15);
  });
});

// ── titration.ts (curvas) ────────────────────────────────────────────────────

describe('titratableProtons', () => {
  it('pKas vacío → 1 protón titulable', () => {
    expect(titratableProtons([])).toBe(1);
  });

  it('H₃PO₄ → 3 protones titulables', () => {
    expect(titratableProtons([2.15, 7.20, 12.35])).toBe(3);
  });
});

describe('titrationCurve', () => {
  it('HCl 0.1 M + NaOH 0.1 M → vEq ≈ 25 mL, pH en eq ≈ 7', () => {
    const curve = titrationCurve({
      analyte: { z0: 0, pKas: [], kind: 'strong-acid' },
      titrantIsAcid: false,
      cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 100,
    });
    tol(curve.equivalenceVolumes[0], 25, 0.5);
    const eqIdx = curve.volumes.findIndex((v) => Math.abs(v - 25) < 0.5);
    expect(eqIdx).toBeGreaterThan(0);
    tol(curve.pHs[eqIdx], 7.0, 0.3);
  });

  it('HAc 0.1 M → pH inicial ≈ 2.87 (consistente con solvePH)', () => {
    const curve = titrationCurve({
      analyte: { z0: 0, pKas: [4.76] },
      titrantIsAcid: false,
      cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 50,
    });
    tol(curve.pHs[0], 2.87, 0.05);
  });
});

describe('firstDerivative', () => {
  it('pico de |dpH/dV| cerca del volumen de equivalencia', () => {
    const curve = titrationCurve({
      analyte: { z0: 0, pKas: [4.76] },
      titrantIsAcid: false,
      cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 200,
    });
    const der = firstDerivative(curve.volumes, curve.pHs);
    const vEq = curve.equivalenceVolumes[0];
    const maxIdx = der.d.reduce((best, d, i) => (Math.abs(d) > Math.abs(der.d[best]) ? i : best), 0);
    expect(Math.abs(der.v[maxIdx] - vEq)).toBeLessThan(5);
  });
});

// ── pourbaix.ts ──────────────────────────────────────────────────────────────

describe('pourbaix buildSystem', () => {
  it('Fe(OH)₃/Fe²⁺: E°′ derivado por Hess = 0.948 V (logC = 0)', () => {
    const diagram = buildSystem('fe', 0);
    const line = diagram.lines.find((l) => l.name === 'Fe(OH)₃ / Fe²⁺');
    expect(line).toBeDefined();
    expect(line!.vertical).toBe(false);
    // Recuperar A de E = A − B·pH en el tramo recortado
    const pH0 = line!.pH[0];
    const E0 = line!.E[0];
    const pH1 = line!.pH[1];
    const E1 = line!.E[1];
    const B = (E0 - E1) / (pH1 - pH0);
    const A = E0 + B * pH0;
    tol(A, 0.948, 0.02);
  });
});

describe('availableSystems', () => {
  it('incluye fe, cu, zn, cr (≥ 7 sistemas)', () => {
    const ids = availableSystems().map((s) => s.id);
    expect(ids.length).toBeGreaterThanOrEqual(7);
    for (const id of ['fe', 'cu', 'zn', 'cr']) {
      expect(ids).toContain(id);
    }
  });
});

describe('waterLines', () => {
  it('O₂ y H₂ tienen pendientes positivas coherentes con S_NERNST', () => {
    const { o2, h2 } = waterLines();
    expect(o2.B).toBeCloseTo(0.05916, 4);
    expect(h2.B).toBeCloseTo(0.05916, 4);
    expect(o2.A).toBeGreaterThan(h2.A);
  });
});

// ── redox.ts (completar) ─────────────────────────────────────────────────────

describe('alphaRedox', () => {
  it('a pe = pe°′ las fracciones ox y red son 50/50', () => {
    const pe0c = peStandard(0.771);
    const { ox, red } = alphaRedox(pe0c, pe0c, 1);
    expect(Math.abs(ox - 0.5)).toBeLessThan(1e-9);
    expect(Math.abs(red - 0.5)).toBeLessThan(1e-9);
  });
});

describe('redoxTitrationCurve', () => {
  const base = { id: '', name: '', halfReaction: '', reference: '' };
  const fe2fe3: RedoxCouple = { ...base, ox: 'Fe³⁺', red: 'Fe²⁺', E0: 0.771, n: 1, mH: 0 };
  const ce4ce3: RedoxCouple = { ...base, ox: 'Ce⁴⁺', red: 'Ce³⁺', E0: 1.44, n: 1, mH: 0 };

  it('vEq coherente con estequiometría n_a·C_a·V_a = n_t·C_t·V_eq', () => {
    const curve = redoxTitrationCurve({
      analyte: fe2fe3, titrant: ce4ce3, pH: 1,
      cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 50,
    });
    tol(curve.vEq, 25, 0.5);
  });

  it('genera punto inicial en v = 0', () => {
    const curve = redoxTitrationCurve({
      analyte: fe2fe3, titrant: ce4ce3, pH: 1,
      cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 50,
    });
    expect(curve.volumes.length).toBeGreaterThan(0);
    expect(curve.volumes[0]).toBe(0);
    expect(Number.isFinite(curve.peEq)).toBe(true);
  });
});

describe('feasibilityWindow (ventana contigua)', () => {
  it('elige el tramo más ancho cuando hay dos bandas separadas', () => {
    const pHs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const logKs = [5, 5, 5, 9, 9, 9, 5, 5, 5, 5];
    const win = feasibilityWindow(pHs, logKs, 8);
    expect(win).toEqual([4, 6]);
  });
});

describe('precipTitrationCurve (1:1)', () => {
  it('AgCl: vEq = C·V analito / C titulante', () => {
    const curve = precipTitrationCurve({
      pKsp: 9.74, cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 40,
    });
    tol(curve.vEq, 25, 0.01);
    tol(curve.pAgEq, 9.74 / 2, 0.01);
  });
});

describe('solubilityVsPX', () => {
  it('complejante aumenta solubilidad (menor pX → mayor s)', () => {
    const salt = SALTS.find((s) => s.id === 'agcl')!;
    const highPX = Math.log10(solubilityVsPX(salt, 7, [5], 10));
    const lowPX = Math.log10(solubilityVsPX(salt, 7, [5], 2));
    expect(lowPX).toBeGreaterThan(highPX);
  });
});

describe('batchIonExchange', () => {
  it('Ksel alto incrementa fracción de A en resina', () => {
    const low = batchIonExchange({
      cA0: 0.01, cB0: 0.01, selectivityAB: 1, resinCapacity: 2, resinVolume: 0.05, volume: 0.1,
    });
    const high = batchIonExchange({
      cA0: 0.01, cB0: 0.01, selectivityAB: 10, resinCapacity: 2, resinVolume: 0.05, volume: 0.1,
    });
    expect(high.fracAInResin).toBeGreaterThan(low.fracAInResin);
  });
});

describe('activity', () => {
  it('γ → 1 cuando I → 0', () => {
    expect(activityCoefficient(1, 0)).toBeCloseTo(1, 10);
  });
});
