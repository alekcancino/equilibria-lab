import { describe, it, expect } from 'vitest';
import { solvePH, alphaFractions, saltCounterIons, defaultStartIndex } from '../equilibrium';
import { complexFractions, bjerrumNumber, solvePL } from '../complexation';
import { alphaY4, edtaTitrationCurve, EDTA_PKAS } from '../edta';
import {
  alphaH, alphaOH, condLogK, condLogKCurve, feasibilityWindow,
  hydroxideSolCurve, precipitationPH,
} from '../conditional';
import { peConditional, peStandard, alphaRedox, redoxTitrationCurve, conditionalEprime } from '../redox';
import { electrodePotential, stackFromLegacy } from '../sideReactions';
import { granPlot, titrationCurve, titratableProtons, firstDerivative } from '../titration';
import { ladderFractions, ladderLogC, predominanceZones } from '../ladder';
import {
  anionFreeFraction, solubility, solubilityVsPX, acidSolidSolubility, baseSolidSolubility,
} from '../solubility';
import { precipTitrationCurve, mohrEndpointPAg } from '../precipTitration';
import { buildSystem, availableSystems, waterLines } from '../pourbaix';
import { batchIonExchange, isothermCurve, breakthroughCurve } from '../ionExchange';
import { RESIN_PRESETS, APPLICATION_PRESETS } from '../ionExchangeDatabase';
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
    // 0.2 M total acetic, 0.1 M Na⁺ from the salt
    const comp: AcidBaseComponent = { c: 0.2, z0: 0, pKas: [4.76] };
    const pH = solvePH([comp], 0.1, 0);
    tol(pH, 4.76, 0.05);
  });

  it('HCl 0.1 M → pH ≈ 1.00', () => {
    const pH = solvePH([], 0, 0.1);
    tol(pH, 1.0, 0.05);
  });
});

describe('saltCounterIons / defaultStartIndex', () => {
  it('ácido acético (z0=0, 1 pKa): índice 0 = ácido puro, sin contraión', () => {
    expect(saltCounterIons(0, 0)).toEqual({ cations: 0, anions: 0 });
    expect(defaultStartIndex(0, 1)).toBe(0);
  });

  it('ácido fosfórico (z0=0, 3 pKas): índice 2 = sal disódica, 2 Na⁺', () => {
    expect(saltCounterIons(0, 2)).toEqual({ cations: 2, anions: 0 });
  });

  it('amoniaco (z0=1, 1 pKa): índice 1 = base libre (NH₃), índice 0 = NH₄Cl', () => {
    expect(saltCounterIons(1, 1)).toEqual({ cations: 0, anions: 0 });
    expect(saltCounterIons(1, 0)).toEqual({ cations: 0, anions: 1 });
    expect(defaultStartIndex(1, 1)).toBe(1); // defaults to the free base
  });

  it('Fe³⁺ (z0=3, 1 pKa, catión acuo-ácido): nunca llega a carga 0', () => {
    expect(saltCounterIons(3, 0)).toEqual({ cations: 0, anions: 3 }); // Fe³⁺ puro (FeCl₃)
    expect(saltCounterIons(3, 1)).toEqual({ cations: 0, anions: 2 }); // FeOH²⁺
    expect(defaultStartIndex(3, 1)).toBe(0); // defaults to the parent ion, not FeOH²⁺
  });

  it('coincide con el fix ya verificado de AcidoBase/titration: Fe³⁺ 0.1 M → pH 1.65', () => {
    const { anions } = saltCounterIons(3, defaultStartIndex(3, 1));
    const pH = solvePH([{ c: 0.1, z0: 3, pKas: [2.2] }], 0, anions * 0.1);
    tol(pH, 1.65, 0.02);
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

describe('conditionalEprime (E°′=f(pH) con complejación por estado)', () => {
  const couple = { E0: 1.82, n: 1, mH: 0 }; // Co³⁺/Co²⁺, no protons in the half-reaction

  it('sin pilas de reacciones parásitas, es idéntico a E°−S·(mH/n)·pH', () => {
    const withStacks = conditionalEprime(couple, 5, undefined, undefined);
    const plain = couple.E0 - 0.05916 * (couple.mH / couple.n) * 5;
    tol(withStacks, plain, 1e-9);
  });

  it('pilas idénticas en Ox y Red se cancelan (E°′ no cambia)', () => {
    const stack = stackFromLegacy([], [6.0], [], 0);
    const same = conditionalEprime(couple, 7, stack, stack);
    const plain = conditionalEprime(couple, 7, undefined, undefined);
    tol(same, plain, 1e-9);
  });

  it('complejar solo el oxidante estabiliza Ox y baja E°′ (oxidante más débil)', () => {
    const oxStack = stackFromLegacy([], [], [10, 18, 24], 1); // fuerte β para Ox
    const base = conditionalEprime(couple, 7, undefined, undefined);
    const complexed = conditionalEprime(couple, 7, oxStack, undefined);
    expect(complexed).toBeLessThan(base);
  });

  it('complejar solo el reductor estabiliza Red y sube E°′ (oxidante más fuerte)', () => {
    const redStack = stackFromLegacy([], [], [10, 18, 24], 1);
    const base = conditionalEprime(couple, 7, undefined, undefined);
    const complexed = conditionalEprime(couple, 7, undefined, redStack);
    expect(complexed).toBeGreaterThan(base);
  });

  // Vera, Problemas de Química Analítica, P7 (Co³⁺/Co²⁺ + etilendiamina):
  // α_En(H) a pH 4 = 10^9.41, a partir de pKa(enH₂²⁺)=7.3, pKa(enH⁺)=10.11.
  it('α_En(H) a pH 4 = 10^9.41 (Vera P7, vía alphaH)', () => {
    const aEnH = alphaH([7.3, 10.11], 4);
    tol(Math.log10(aEnH), 9.41, 0.02);
  });
});

describe('electrodePotential', () => {
  // Harris, QCA 8th ed., §13 "Nernst Equation for a Complete Reaction" (p.310-311):
  // Ag+ + e- ⇌ Ag(s), E°=0.799V, [Ag+]=0.50M → E=0.781V.
  it('Ag+/Ag(s) a [Ag+]=0.50 M → E=0.781 V (Harris)', () => {
    const pAg = -Math.log10(0.50);
    const E = electrodePotential(0.799, 1, pAg);
    tol(E, 0.781, 0.001);
  });

  it('E decrece al diluir (menos oxidante, pM más alto)', () => {
    const eConc = electrodePotential(0.799, 1, -Math.log10(1.0));
    const eDilute = electrodePotential(0.799, 1, -Math.log10(1e-6));
    expect(eDilute).toBeLessThan(eConc);
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

  it('I > 0 aumenta solubilidad (efecto salting-in)', () => {
    // At I = 0.1 M the activity coefficients reduce ion activities → apparent Ksp larger → more soluble
    const { logS: logS0 } = hydroxideSolCurve(15, 2, [], [6, 10], 50, 0);
    const { logS: logS1 } = hydroxideSolCurve(15, 2, [], [6, 10], 50, 0.1);
    // At every pH point the corrected curve should show higher solubility
    for (let i = 0; i < logS0.length; i++) {
      expect(logS1[i]).toBeGreaterThan(logS0[i] - 1e-9);
    }
  });

  it('I = 0 da resultado idéntico al caso sin corrección', () => {
    const { logS: a } = hydroxideSolCurve(15, 2, [], [5, 9], 20, 0);
    const { logS: b } = hydroxideSolCurve(15, 2, [], [5, 9], 20);
    for (let i = 0; i < a.length; i++) expect(a[i]).toBeCloseTo(b[i], 10);
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

  it('estequiometría M₂X₃ arbitraria (UI ahora expone m,x libres): Ksp = m^m·x^x·s^(m+x)', () => {
    const m2x3 = { id: 'm2x3', name: 'M₂X₃', formula: 'M₂X₃', pKsp: 40, m: 2, x: 3, anionLabel: 'X', cationLabel: 'M' };
    const s = solubility(m2x3, 7, 0);
    const expectedLogS = (-40 - Math.log10(2 ** 2 * 3 ** 3)) / (2 + 3);
    tol(Math.log10(s), expectedLogS, 1e-6);
  });
});

// Molecular acid/base solid solubility (ROADMAP B-6): S = S0·(1 + 10^±(pH-pKa)).
// Golden case: benzoic acid, S0 = 0.0278 M, pKa = 4.2 (Martin, Physical Pharmacy).
describe('acidSolidSolubility / baseSolidSolubility', () => {
  const S0 = 0.0278;
  const pKa = 4.2;

  it('ácido benzoico a pH ≪ pKa → S ≈ S0 (forma no ionizada domina)', () => {
    tol(acidSolidSolubility(S0, pKa, 1), S0, 1e-4);
  });

  it('a pH = pKa, S = 2·S0 para ambos modelos (mitad ionizada)', () => {
    tol(acidSolidSolubility(S0, pKa, pKa), 2 * S0, 1e-9);
    tol(baseSolidSolubility(S0, pKa, pKa), 2 * S0, 1e-9);
  });

  it('sólido ácido: S crece con el pH (más base conjugada soluble)', () => {
    const sLow = acidSolidSolubility(S0, pKa, 2);
    const sHigh = acidSolidSolubility(S0, pKa, 7);
    expect(sHigh).toBeGreaterThan(sLow);
  });

  it('sólido básico: S decrece con el pH (menos forma protonada soluble)', () => {
    const sLow = baseSolidSolubility(S0, pKa, 2);
    const sHigh = baseSolidSolubility(S0, pKa, 7);
    expect(sHigh).toBeLessThan(sLow);
  });

  it('simetría: ácido(pH) === base(2·pKa − pH) reflejado en pKa', () => {
    const pH = 6;
    tol(acidSolidSolubility(S0, pKa, pH), baseSolidSolubility(S0, pKa, 2 * pKa - pH), 1e-9);
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

describe('precipTitrationCurve — estequiometría MmXx libre (UI ahora expone m,x)', () => {
  it('Ag₂CrO₄ (m=2,x=1): vEq escala con m/x, pAgEq y pX(v=0) coinciden con la derivación cerrada', () => {
    const curve = precipTitrationCurve({
      pKsp: 11.89, cAnalyte: 0.05, vAnalyte: 25, cTitrant: 0.1, vMax: 40, m: 2, x: 1,
    });
    // vEq = (m/x)·(cAnalyte·vAnalyte)/cTitrant — el doble de lo que daría 1:1 con los mismos datos.
    tol(curve.vEq, 25, 0.01);
    // [M]^m[X]^x=Ksp junto con x[M]=m[X] en el punto estequiométrico exacto.
    tol(curve.pAgEq, -Math.log10(Math.pow(Math.pow(10, -11.89) / 2, 1 / 3)), 0.01);
    // v=0: solo queda el analito puro en el matraz, pX = -log(cAnalyte).
    expect(curve.volumes[0]).toBe(0);
    tol(curve.pXs[0], -Math.log10(0.05), 0.01);
  });

  it('m=x=1 sin pasar m,x da exactamente el mismo resultado que pasándolos explícitos (default = 1:1)', () => {
    const withDefaults = precipTitrationCurve({ pKsp: 9.74, cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 40 });
    const explicit = precipTitrationCurve({ pKsp: 9.74, cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 40, m: 1, x: 1 });
    expect(withDefaults).toEqual(explicit);
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

  it('Fe³⁺ 0.1 M (catión acuo-ácido, z0=3 > pKas.length=1) → pH inicial ≈ 1.65', () => {
    // Same golden value as AcidoBase.tsx's "pH disolución pura" for the Fe³⁺
    // preset — the analyte's own z0·c counter-anion must be added even
    // before any titrant is dosed (v=0), or the ladder never balances.
    const curve = titrationCurve({
      analyte: { z0: 3, pKas: [2.2] },
      titrantIsAcid: false,
      cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 50,
    });
    tol(curve.pHs[0], 1.65, 0.05);
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

  it('Cu²⁺/Cu: E° = 0.337 V en deposición (logC = 0)', () => {
    const diagram = buildSystem('cu', 0);
    const line = diagram.lines.find((l) => l.name === 'Cu²⁺ / Cu');
    expect(line).toBeDefined();
    expect(line!.vertical).toBe(false);
    tol(line!.E[0], 0.337, 0.02);
  });
});

describe('smoke presets', () => {
  it('buildSystem no lanza para todos los sistemas disponibles', () => {
    for (const sys of availableSystems()) {
      expect(() => buildSystem(sys.id, 0)).not.toThrow();
    }
  });

  it('batchIonExchange con parámetros por defecto devuelve resultado finito', () => {
    const r = batchIonExchange({
      cA0: 0.01, cB0: 0.01, selectivityAB: 2.5,
      resinCapacity: 2, resinVolume: 0.05, volume: 0.1,
    });
    expect(Number.isFinite(r.cAeq)).toBe(true);
    expect(Number.isFinite(r.fracAInResin)).toBe(true);
  });

  it('hydroxideSolCurve preset Fe(OH)₂ no lanza', () => {
    const curve = hydroxideSolCurve(15.1, 2, [4.5, 7.4], [0, 14], 100);
    expect(curve.pHs.length).toBeGreaterThan(0);
    expect(curve.logS.every(Number.isFinite)).toBe(true);
  });

  it('ionExchangeDatabase presets son coherentes', () => {
    expect(RESIN_PRESETS.length).toBeGreaterThanOrEqual(3);
    expect(APPLICATION_PRESETS.length).toBeGreaterThanOrEqual(2);
    for (const app of APPLICATION_PRESETS) {
      expect(RESIN_PRESETS.some((r) => r.id === app.resinId)).toBe(true);
    }
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

  it('isotherm q crece con C_A (monotonicidad)', () => {
    const { q } = isothermCurve({
      cB0: 0.01, selectivityAB: 5, resinCapacity: 2, resinVolume: 0.05, volume: 0.1,
      cMin: 1e-4, cMax: 0.05, points: 20,
    });
    expect(q[q.length - 1]).toBeGreaterThan(q[0]);
  });

  it('breakthrough sigmoide entre 0 y 1', () => {
    const { cRatio } = breakthroughCurve({
      cA0: 0.01, selectivityAB: 2, resinCapacity: 2, resinVolume: 0.05, flowRate: 0.05,
    });
    expect(cRatio[0]).toBeLessThan(0.1);
    expect(cRatio[cRatio.length - 1]).toBeGreaterThan(0.9);
  });
});

describe('activity', () => {
  it('γ → 1 cuando I → 0', () => {
    expect(activityCoefficient(1, 0)).toBeCloseTo(1, 10);
  });
});

// ── Activity correction: regression at I=0, correction at I>0 ────────────────

describe('solvePH activity correction', () => {
  const comp: AcidBaseComponent = { c: 0.1, z0: 0, pKas: [4.76] };

  it('regression: I=0 produces same pH as no I argument', () => {
    const pH0 = solvePH([comp]);
    const pHI0 = solvePH([comp], 0, 0, 0);
    expect(Math.abs(pH0 - pHI0)).toBeLessThan(1e-9);
  });

  it('I=0.1 shifts pH upward (acid appears weaker at finite ionic strength)', () => {
    const pH0 = solvePH([comp], 0, 0, 0);
    const pHI = solvePH([comp], 0, 0, 0.1);
    // Debye-Hückel lowers γ → pKa_app > pKa → higher equilibrium pH
    expect(pHI).toBeGreaterThan(pH0);
  });

  it('I=0.1: pH shift for acetic acid 0.1 M is in 0.05–0.25 range', () => {
    const pH0 = solvePH([comp], 0, 0, 0);
    const pHI = solvePH([comp], 0, 0, 0.1);
    const delta = pHI - pH0;
    expect(delta).toBeGreaterThan(0.05);
    expect(delta).toBeLessThan(0.25);
  });
});

describe('solubility activity correction', () => {
  const agcl = SALTS.find((s) => s.id === 'agcl')!;

  it('regression: I=0 produces same solubility as no I argument', () => {
    const s0 = solubility(agcl, 7);
    const sI0 = solubility(agcl, 7, 0, 0);
    expect(Math.abs(s0 - sI0) / s0).toBeLessThan(1e-9);
  });

  it('I=0.1 increases solubility of AgCl (salting-in effect)', () => {
    const s0 = solubility(agcl, 7, 0, 0);
    const sI = solubility(agcl, 7, 0, 0.1);
    expect(sI).toBeGreaterThan(s0);
  });
});

describe('ladderFractions activity correction', () => {
  it('regression: I=0 matches original behavior', () => {
    const pKa = 4.76;
    const origAlphas = ladderFractions(4.76, [pKa], true);
    const newAlphas  = ladderFractions(4.76, [pKa], true, 0, 0);
    origAlphas.forEach((a, i) => expect(Math.abs(a - newAlphas[i])).toBeLessThan(1e-12));
  });

  it('I=0.1: at pH=pKa the apparent crossing point shifts above pKa', () => {
    const pKa = 4.76;
    // At pH = pKa and I=0, α_acid = α_base = 0.5 (exact crossing).
    // At pH = pKa and I=0.1, pKa_app > pKa, so [pH < pKa_app] → species 0 still dominates slightly.
    const [a0_ideal] = ladderFractions(pKa, [pKa], true, 0, 0);
    const [a0_corrected] = ladderFractions(pKa, [pKa], true, 0, 0.1);
    expect(a0_corrected).toBeGreaterThan(a0_ideal);
  });
});
