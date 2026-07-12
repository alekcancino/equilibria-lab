import { describe, it, expect } from 'vitest';
import { solvePH, alphaFractions, saltCounterIons, defaultStartIndex } from '../equilibrium';
import {
  complexFractions, bjerrumNumber, solvePL,
  twoLigandFractions, solveTwoLigandEquilibrium, twoLigandCurve,
} from '../complexation';
import type { XBranch } from '../complexation';
import { alphaY4, edtaAtFraction, edtaTitrationCurve, EDTA_PKAS } from '../edta';
import {
  alphaH, alphaOH, alphaL, condLogK, condLogKCurve, feasibilityWindow,
  hydroxideSolCurve, precipitationPH, logSaturation, solubilityRegimeFractions,
} from '../conditional';
import { peConditional, peStandard, alphaRedox, redoxTitrationCurve, conditionalEprime } from '../redox';
import {
  electrodePotential, stackFromLegacy, freeLigandConcentration,
  hydroxideSolCurveMasked, solubilityRegimeFractionsMasked, type SideReactionStack,
} from '../sideReactions';
import { granPlot, titrationCurve, titratableProtons, firstDerivative } from '../titration';
import { ladderFractions, ladderLogC, predominanceZones } from '../ladder';
import {
  anionFreeFraction, solubility, solubilityVsPX, acidSolidSolubility, baseSolidSolubility,
} from '../solubility';
import { precipTitrationCurve, mohrEndpointPAg } from '../precipTitration';
import {
  competitiveAtPAg, competitiveEquilibrium, pAgAtFraction, separationWindow,
} from '../solubilityCompetitive';
import { buildSystem, availableSystems, waterLines } from '../pourbaix';
import { batchIonExchange, isothermCurve, breakthroughCurve } from '../ionExchange';
import {
  distributionD, percentE1, percentEn, nFor, type AnalyteState,
} from '../extraction';
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

  it('modelo por defecto (omitido) === "dh" explícito, a I > 0', () => {
    const comp: AcidBaseComponent = { c: 0.1, z0: 0, pKas: [4.76] };
    expect(solvePH([comp], 0, 0, 0.2)).toBe(solvePH([comp], 0, 0, 0.2, 'dh'));
  });

  it('tampón 1:1 a I>0: pH (actividad) = pKa + shift, 3 modelos derivados a mano, ninguno coincide con los otros', () => {
    // solvePH devuelve pH DE ACTIVIDAD (−log a_H = −log(γ_H·[H+])), no pH de
    // concentración: en el punto de tampón 1:1 (0.1M HAc + 0.1M NaAc, vía
    // catión espectador) [HAc]=[Ac⁻] da pH_conc = pKa − 2·logγ(1,I) (el shift
    // de Henderson-Hasselbalch habitual), y sumarle la conversión de
    // concentración a actividad (−logγ_H) da un tercer término:
    // pH_actividad = pKa − 3·logγ(1,I).
    const comp: AcidBaseComponent = { c: 0.2, z0: 0, pKas: [4.76] };
    const I = 0.2;
    // D-H extendida (a=3 Å): logγ(1,0.2) = -0.51·√0.2/(1+0.33·3·√0.2) = -0.158082.
    tol(solvePH([comp], 0.1, 0, I, 'dh'), 4.76 - 3 * -0.158082, 0.001);
    // Davies: logγ = -0.51·(√I/(1+√I) - 0.3I) = -0.126998.
    tol(solvePH([comp], 0.1, 0, I, 'davies'), 4.76 - 3 * -0.126998, 0.001);
    // Güntelberg: logγ = -0.5·√I/(1+√I) = -0.154508.
    tol(solvePH([comp], 0.1, 0, I, 'guntelberg'), 4.76 - 3 * -0.154508, 0.001);
    // Los tres deben ser distintos entre sí (confirma que el parámetro cablea de verdad).
    const [dh, davies, guntelberg] = [
      solvePH([comp], 0.1, 0, I, 'dh'),
      solvePH([comp], 0.1, 0, I, 'davies'),
      solvePH([comp], 0.1, 0, I, 'guntelberg'),
    ];
    expect(new Set([dh, davies, guntelberg]).size).toBe(3);
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

describe('two-ligand coupled model (X–M–L)', () => {
  const ZN_NH3 = [2.37, 4.81, 7.31, 9.46];  // Zn²⁺–NH₃ (Harris)
  const CU_NH3 = [4.04, 7.47, 10.27, 12.03]; // Cu²⁺–NH₃ (Harris)

  it('rama X vacía reproduce exactamente el modelo de un ligando', () => {
    const pLRef = solvePL(0.001, 0.05, CU_NH3);
    const { pL, pX } = solveTwoLigandEquilibrium(
      0.001, 0.05, CU_NH3, { logBetasX: [], spec: { mode: 'free', cL: 0 } }, 7,
    );
    expect(pL).toBe(pLRef);
    expect(pX).toBe(Infinity);
    expect(twoLigandFractions(pLRef, Infinity, CU_NH3, [])).toEqual(complexFractions(pLRef, CU_NH3));
  });

  it('solo rama X a [X] fijo: fracción de M libre = 1/α_M(X) de Ringbom (conditional.ts)', () => {
    // Dos implementaciones independientes del mismo denominador.
    const fr = twoLigandFractions(Infinity, 1, [], ZN_NH3); // pX = 1 → [X] = 0.1
    tol(fr[0], 1 / alphaL(ZN_NH3, 0.1), 1e-9);
  });

  it('simetría: β idénticos en ambas ramas y cX = cL en modo total ⇒ pX = pL', () => {
    const x: XBranch = { logBetasX: [3, 5.5], spec: { mode: 'total', cTotal: 0.01, pKas: [] } };
    const { pL, pX } = solveTwoLigandEquilibrium(0.001, 0.01, [3, 5.5], x, 7);
    tol(pX, pL, 1e-6);
  });

  it('X en modo total con cX→0 colapsa al pL de un solo ligando', () => {
    const x: XBranch = { logBetasX: ZN_NH3, spec: { mode: 'total', cTotal: 1e-12, pKas: [9.25] } };
    const { pL } = solveTwoLigandEquilibrium(0.001, 0.05, CU_NH3, x, 9);
    tol(pL, solvePL(0.001, 0.05, CU_NH3), 1e-3);
  });

  it('[X] fijo: solve acoplado ≡ solvePL con β′ = β/α_M(X) — identidad de Ringbom exacta', () => {
    // A [X] fijo el modelo acoplado y el corrimiento de Ringbom son la MISMA
    // álgebra (n̄_L con D = α_X + Σβ[L]ⁱ equivale a β′ᵢ = βᵢ/α_X), así que
    // deben coincidir a precisión de bisección, no aproximadamente.
    const cXFree = 0.05;
    const x: XBranch = { logBetasX: ZN_NH3, spec: { mode: 'free', cL: cXFree } };
    const shifted = CU_NH3.map((b) => b - Math.log10(alphaL(ZN_NH3, cXFree)));
    const { pL } = solveTwoLigandEquilibrium(0.001, 0.05, CU_NH3, x, 7);
    tol(pL, solvePL(0.001, 0.05, shifted), 1e-6);
  });

  it('X total en gran exceso ≈ límite Ringbom con [X] libre sin consumo por M', () => {
    const spec = { mode: 'total' as const, cTotal: 1.0, pKas: [9.25] };
    const x: XBranch = { logBetasX: ZN_NH3, spec };
    const pH = 10;
    const { pL, pX } = solveTwoLigandEquilibrium(1e-3, 0.05, CU_NH3, x, pH);
    const cXFree = freeLigandConcentration(spec, pH);
    const shifted = CU_NH3.map((b) => b - Math.log10(alphaL(ZN_NH3, cXFree)));
    tol(pL, solvePL(1e-3, 0.05, shifted), 0.05);
    tol(pX, -Math.log10(cXFree), 0.05);
  });

  it('barrido: pX se re-resuelve por punto y las fracciones suman 1', () => {
    const x: XBranch = { logBetasX: ZN_NH3, spec: { mode: 'total', cTotal: 0.1, pKas: [9.25] } };
    const curve = twoLigandCurve(0.001, CU_NH3, x, 9, [0, 12], 50);
    expect(curve).toHaveLength(51);
    for (const pt of curve) {
      const sum = pt.fractions.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(1e-12);
      expect(Number.isNaN(pt.pX)).toBe(false);
    }
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

describe('edtaTitrationCurve — K′ por punto y cuadrática estable', () => {
  it('K′ grande (Fe³⁺-EDTA, logKf 25.1): pM tras la equivalencia es finito y correcto, no el colapso a 30', () => {
    // Tras la equivalencia con exceso de EDTA: m ≈ cM/(K′·(cY−cM)).
    // A x=1.5, cM=0.01, cY=0.015 (modelo x, sin dilución): m ≈ 0.01/(10^25.1·0.005)
    // → pM ≈ 25.1 + log(0.005) − log(0.01) = 25.1 − 0.301 ≈ 24.80.
    const curve = edtaTitrationCurve({
      logKf: 25.1, pH: 12, sideStack: { ligandPKas: [] },
      cMetal: 0.01, vMetal: 25, cEdta: 0.01, vMax: 50, axis: 'x', xMax: 2, points: 200,
    });
    const i = curve.xs.findIndex((x) => Math.abs(x - 1.5) < 1e-9);
    expect(i).toBeGreaterThan(-1);
    tol(curve.pMs[i], 24.80, 0.05);
    expect(curve.pMs[i]).toBeLessThan(29); // la forma inestable daba m=0 → pM clavado en 30
  });

  it('ligando auxiliar en modo total se diluye por punto: coincide con un stack pre-diluido en modo free', () => {
    const ZN_NH3 = [2.37, 4.81, 7.31, 9.46];
    const pH = 10;
    const base = { logKf: 16.5, pH, cMetal: 0.01, vMetal: 25, cEdta: 0.01, vMax: 50, points: 500 };
    const withTotal = edtaTitrationCurve({
      ...base,
      sideStack: {
        ligandPKas: EDTA_PKAS,
        auxLigand: { logBetasL: ZN_NH3, spec: { mode: 'total', cTotal: 0.2, pKas: [9.25] } },
      },
    });
    // A v = 25 mL el volumen se duplicó → cTotal efectivo 0.1; el mismo punto
    // con el ligando FIJO a la concentración libre correspondiente debe coincidir.
    const freeAt = freeLigandConcentration({ mode: 'total', cTotal: 0.1, pKas: [9.25] }, pH);
    const withFree = edtaTitrationCurve({
      ...base,
      sideStack: {
        ligandPKas: EDTA_PKAS,
        auxLigand: { logBetasL: ZN_NH3, spec: { mode: 'free', cL: freeAt } },
      },
    });
    const i = withTotal.volumes.findIndex((v) => Math.abs(v - 25) < 1e-9);
    expect(i).toBeGreaterThan(-1);
    tol(withTotal.pMs[i], withFree.pMs[i], 1e-9);
    // Y difiere del modelo congelado (cTotal 0.2 sin diluir): α_M cambia ~4·log 2.
    const frozenEquivalent = edtaTitrationCurve({
      ...base,
      sideStack: {
        ligandPKas: EDTA_PKAS,
        auxLigand: { logBetasL: ZN_NH3, spec: { mode: 'free', cL: freeLigandConcentration({ mode: 'total', cTotal: 0.2, pKas: [9.25] }, pH) } },
      },
    });
    expect(Math.abs(withTotal.pMs[i] - frozenEquivalent.pMs[i])).toBeGreaterThan(0.5);
  });

  it('modo free (tamponado) es invariante: la curva en eje x reproduce edtaAtFraction', () => {
    const sideStack = {
      ligandPKas: EDTA_PKAS,
      auxLigand: { logBetasL: [2.37, 4.81, 7.31, 9.46], spec: { mode: 'free' as const, cL: 0.05 } },
    };
    const curve = edtaTitrationCurve({
      logKf: 16.5, pH: 10, cMetal: 0.01, vMetal: 25, cEdta: 0.01, vMax: 50,
      axis: 'x', xMax: 2, points: 200, sideStack,
    });
    const at = edtaAtFraction({ logKf: 16.5, pH: 10, cMetal: 0.01, sideStack }, 0.5);
    const i = curve.xs.findIndex((x) => Math.abs(x - 0.5) < 1e-9);
    tol(curve.pMs[i], at.pM, 1e-12);
    tol(curve.logKfCond, at.logKfCond, 1e-12);
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

  it('modelo por defecto (omitido) === "dh" explícito, a I > 0', () => {
    expect(ladderFractions(5, [4.76], true, 0, 0.2)).toEqual(ladderFractions(5, [4.76], true, 0, 0.2, 'dh'));
  });

  it('a I>0, 50/50 ocurre en pKa′ (no pKa) — mismo shift de solvePH, 3 modelos', () => {
    const pKa = 4.76;
    const I = 0.2;
    // Mismos shifts derivados a mano que en el describe('solvePH') de arriba.
    const shifts: Record<'dh' | 'davies' | 'guntelberg', number> = {
      dh: 0.316164, davies: 0.253997, guntelberg: 0.309017,
    };
    for (const model of ['dh', 'davies', 'guntelberg'] as const) {
      const [a0, a1] = ladderFractions(pKa + shifts[model], [pKa], true, 0, I, model);
      tol(a0, 0.5, 0.001);
      tol(a1, 0.5, 0.001);
    }
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

describe('logSaturation', () => {
  it('matches hydroxideSolCurve point-by-point (extraction refactor, no behavior change)', () => {
    const pKsp = 16.2; const n = 2; const logBetasOH = [5.04, 10.43, 13.7, 15.2]; // Zn(OH)2
    const { pHs, logS } = hydroxideSolCurve(pKsp, n, logBetasOH, [0, 14], 50, 0.05);
    pHs.forEach((pH, i) => {
      expect(logSaturation(pH, pKsp, n, logBetasOH, 0.05)).toBeCloseTo(logS[i], 9);
    });
  });
});

describe('solubilityRegimeFractions', () => {
  const pKsp = 16.2; const n = 2; const logBetasOH = [5.04, 10.43, 13.7, 15.2]; // Zn(OH)2, amphoteric

  it('picks the solid (index 0) when logM is above the saturation line', () => {
    const pH = 7;
    const sat = logSaturation(pH, pKsp, n, logBetasOH);
    const f = solubilityRegimeFractions(pH, sat + 2, pKsp, n, logBetasOH);
    expect(f[0]).toBe(1);
    expect(f.slice(1).every((v) => v === 0)).toBe(true);
  });

  it('picks a dissolved species (index ≥ 1) when logM is below the saturation line', () => {
    const pH = 7;
    const sat = logSaturation(pH, pKsp, n, logBetasOH);
    const f = solubilityRegimeFractions(pH, sat - 3, pKsp, n, logBetasOH);
    expect(f[0]).toBe(0);
    expect(f.slice(1).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it('dissolved-species ladder is independent of logM (only pH matters below saturation)', () => {
    const pH = 10;
    const sat = logSaturation(pH, pKsp, n, logBetasOH);
    const a = solubilityRegimeFractions(pH, sat - 1, pKsp, n, logBetasOH);
    const b = solubilityRegimeFractions(pH, sat - 8, pKsp, n, logBetasOH);
    expect(a.slice(1)).toEqual(b.slice(1));
  });

  it('the free metal ion (index 1) dominates at low pH, an anionic hydroxo-complex at high pH', () => {
    const lowPH = 2; const highPH = 13;
    const fLow = solubilityRegimeFractions(lowPH, logSaturation(lowPH, pKsp, n, logBetasOH) - 3, pKsp, n, logBetasOH);
    const fHigh = solubilityRegimeFractions(highPH, logSaturation(highPH, pKsp, n, logBetasOH) - 3, pKsp, n, logBetasOH);
    expect(fLow.indexOf(Math.max(...fLow))).toBe(1); // free Zn²⁺
    expect(fHigh.indexOf(Math.max(...fHigh))).toBe(1 + logBetasOH.length); // Zn(OH)₄²⁻
  });
});

describe('solubilityRegimeFractionsMasked', () => {
  const pKsp = 16.2; const n = 2; const logBetasOH = [5.04, 10.43, 13.7, 15.2]; // Zn(OH)2
  const logBetasNH3 = [2.21, 4.5, 6.86, 8.89]; // Zn-NH3 stepwise-cumulative
  const stack: SideReactionStack = {
    ligandPKas: [],
    hydrolysis: { logBetasOH },
    auxLigand: { logBetasL: logBetasNH3, spec: { mode: 'free', cL: 1.0 } }, // 1 M NH3 free
  };
  const bareStack: SideReactionStack = { ligandPKas: [], hydrolysis: { logBetasOH } };

  it('boundary matches hydroxideSolCurveMasked point-by-point (same formula, no drift)', () => {
    const { pHs, logS } = hydroxideSolCurveMasked(pKsp, n, stack, [0, 14], 40);
    pHs.forEach((pH, i) => {
      const sat = logS[i];
      // just above the boundary -> solid; just below -> dissolved.
      expect(solubilityRegimeFractionsMasked(pH, sat + 1, pKsp, n, stack)[0]).toBe(1);
      expect(solubilityRegimeFractionsMasked(pH, sat - 1, pKsp, n, stack)[0]).toBe(0);
    });
  });

  it('masking raises the saturation line vs. the bare hydroxide (more soluble)', () => {
    const pH = 10;
    const { logS: masked } = hydroxideSolCurveMasked(pKsp, n, stack, [pH, pH], 1);
    const { logS: bare } = hydroxideSolCurveMasked(pKsp, n, bareStack, [pH, pH], 1);
    expect(masked[0]).toBeGreaterThan(bare[0]);
  });

  it('dissolved ladder includes the masking-ligand species and sums to 1', () => {
    const pH = 9;
    const sat = hydroxideSolCurveMasked(pKsp, n, stack, [pH, pH], 1).logS[0];
    const f = solubilityRegimeFractionsMasked(pH, sat - 3, pKsp, n, stack);
    // [solid, M, OH1..4, NH3_1..4] = 1 + 1 + 4 + 4 = 10
    expect(f).toHaveLength(10);
    expect(f[0]).toBe(0);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it('with 1 M free NH₃ at mid pH, an amino-complex outcompetes free Zn²⁺', () => {
    const pH = 8; // little OH-driven hydrolysis yet, but NH3 is already strong
    const sat = hydroxideSolCurveMasked(pKsp, n, stack, [pH, pH], 1).logS[0];
    const f = solubilityRegimeFractionsMasked(pH, sat - 3, pKsp, n, stack);
    const domIdx = f.indexOf(Math.max(...f));
    expect(domIdx).toBeGreaterThan(1 + logBetasOH.length); // one of the NH3 complexes, not M or M-OH
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

  it('modelo por defecto (omitido) === "dh" explícito, a I > 0', () => {
    const agcl = SALTS.find((s) => s.id === 'agcl')!;
    expect(solubility(agcl, 7, 0, 0.3)).toBe(solubility(agcl, 7, 0, 0.3, 'dh'));
  });

  it('AgCl (m=x=1, Cl⁻ no básico → sin dependencia de pH) a I=0.3: s = √Ksp_app difiere por modelo — 3 valores derivados a mano', () => {
    const agcl = SALTS.find((s) => s.id === 'agcl')!;
    const I = 0.3;
    // logKsp_app = -pKsp - 2·logγ(1,I) (m=x=zM=zX=1); s = 10^(logKsp_app/2).
    // D-H extendida: logγ(1,0.3) = -0.51·√0.3/(1+0.99·√0.3) = -0.181139.
    tol(Math.log10(solubility(agcl, 7, 0, I, 'dh')), (-9.74 - 2 * -0.181139) / 2, 0.001);
    // Davies: logγ = -0.51·(√0.3/(1+√0.3) - 0.09) = -0.134577.
    tol(Math.log10(solubility(agcl, 7, 0, I, 'davies')), (-9.74 - 2 * -0.134577) / 2, 0.001);
    // Güntelberg: logγ = -0.5·√0.3/(1+√0.3) = -0.176938.
    tol(Math.log10(solubility(agcl, 7, 0, I, 'guntelberg')), (-9.74 - 2 * -0.176938) / 2, 0.001);
    const vals = [
      solubility(agcl, 7, 0, I, 'dh'),
      solubility(agcl, 7, 0, I, 'davies'),
      solubility(agcl, 7, 0, I, 'guntelberg'),
    ];
    expect(new Set(vals).size).toBe(3);
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

describe('solubilityCompetitive — precipitación fraccionada Cl⁻/Br⁻ con Ag⁺ (Harris)', () => {
  const AgCl = { label: 'Cl⁻', pKsp: 9.74, cX: 0.01 };
  const AgBr = { label: 'Br⁻', pKsp: 12.30, cX: 0.01 };

  it('AgBr precipita primero: onset pAg 10.30 vs 7.74 para AgCl (pAg = pKsp + log cX)', () => {
    tol(pAgAtFraction(AgBr.pKsp, AgBr.cX, 0), 10.30, 0.01);
    tol(pAgAtFraction(AgCl.pKsp, AgCl.cX, 0), 7.74, 0.01);
  });

  it('cuando AgCl arranca, el Br⁻ residual es 10^−4.56 M (0.275 % — separación NO cuantitativa al 99.9 %)', () => {
    const pt = competitiveAtPAg(7.74, AgCl, AgBr);
    tol(Math.log10(pt.freeX2), -4.56, 0.01);
    const win = separationWindow(AgCl, AgBr);
    expect(win.firstIdx).toBe(1);
    tol(win.residualFrac, 2.75e-3, 0.05e-3);
    expect(win.ok).toBe(false); // 0.275 % > 0.1 %: Harris marca esta separación como casi-completa
  });

  it('Br⁻/I⁻ sí separa: residual de I⁻ = 10^−3.77 (< 0.1 %) y la ventana existe', () => {
    const AgI = { label: 'I⁻', pKsp: 16.07, cX: 0.01 };
    const win = separationWindow(AgBr, AgI);
    expect(win.firstIdx).toBe(1); // AgI primero
    tol(Math.log10(win.residualFrac), -3.77, 0.01);
    expect(win.ok).toBe(true);
    tol(win.pAgQuant, 11.07, 0.01);
    tol(win.pAgSecondOnset, 10.30, 0.01);
  });

  it('competitiveEquilibrium: prueba de combinaciones acepta la hipótesis correcta', () => {
    // cAg = 0.015 con 0.01+0.01 de aniones: ambas sales presentes.
    const both = competitiveEquilibrium(0.015, AgCl, AgBr);
    expect(both.phases).toBe('ambas');
    tol(both.pAg, 7.44, 0.01);
    tol(both.p1, 5.01e-3, 0.05e-3);
    // Balance de masa del catión: [M] + P1 + P2 = cM total.
    tol(Math.pow(10, -both.pAg) + both.p1 + both.p2, 0.015, 1e-9);

    // cAg = 0.005: solo AgBr (IAP de AgCl queda por debajo de su Ksp).
    const one = competitiveEquilibrium(0.005, AgCl, AgBr);
    expect(one.phases).toBe('sal2');
    tol(one.p2, 5.0e-3, 0.05e-3);
    expect(Math.pow(10, -one.pAg) * AgCl.cX).toBeLessThan(Math.pow(10, -AgCl.pKsp));

    // cAg trazas: ninguna sal.
    const none = competitiveEquilibrium(1e-12, AgCl, AgBr);
    expect(none.phases).toBe('ninguna');
    expect(none.p1).toBe(0);
    expect(none.p2).toBe(0);
  });
});

describe('precipTitrationCurve — estequiometría MmXx libre (UI ahora expone m,x)', () => {
  it('Ag₂CrO₄ (m=2,x=1): vEq escala con m/x, pAgEq y pX(v=0) coinciden con la derivación cerrada', () => {
    const curve = precipTitrationCurve({
      pKsp: 11.89, cAnalyte: 0.05, vAnalyte: 25, cTitrant: 0.1, vMax: 40, m: 2, x: 1,
    });
    // vEq = (m/x)·(cAnalyte·vAnalyte)/cTitrant — el doble de lo que daría 1:1 con los mismos datos.
    tol(curve.vEq, 25, 0.01);
    // Derivación independiente (no reusa la fórmula cerrada del motor): en el punto
    // estequiométrico [Ag⁺]=2s, [CrO₄²⁻]=s → Ksp=(2s)²·s=4s³ → s=(Ksp/4)^(1/3).
    const s = Math.pow(Math.pow(10, -11.89) / 4, 1 / 3);
    tol(curve.pAgEq, -Math.log10(2 * s), 0.01);
    // v=0: solo queda el analito puro en el matraz, pX = -log(cAnalyte).
    expect(curve.volumes[0]).toBe(0);
    tol(curve.pXs[0], -Math.log10(0.05), 0.01);
  });

  it('solve exacto: caso diluido AgCl 1e-4 M a 50 % — coincide con la cuadrática a mano, no con la aproximación de reactivo limitante', () => {
    // nCl = 2.5e-6, nAg = 1.25e-6, V = 37.5 mL → exceso de Cl⁻ = 3.3333e-5 M.
    // Exacto: [Ag]² + 3.3333e-5·[Ag] − Ksp = 0 → [Ag] = 4.775e-6, pAg = 5.321.
    // La aproximación vieja ([Ag] = Ksp/exceso) daría 5.463e-6 → pAg 5.263 — 0.06 de error.
    const curve = precipTitrationCurve({
      pKsp: 9.74, cAnalyte: 1e-4, vAnalyte: 25, cTitrant: 1e-4, vMax: 25, points: 500,
    });
    const i = curve.volumes.findIndex((v) => Math.abs(v - 12.5) < 1e-9);
    expect(i).toBeGreaterThan(-1);
    tol(curve.pAgs[i], 5.321, 0.002);
    expect(Math.abs(curve.pAgs[i] - 5.263)).toBeGreaterThan(0.05);
  });

  it('solve exacto: en el punto de equivalencia reproduce la forma cerrada pAgEq', () => {
    const curve = precipTitrationCurve({
      pKsp: 9.74, cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 500,
    });
    const i = curve.volumes.findIndex((v) => Math.abs(v - 25) < 1e-9);
    tol(curve.pAgs[i], curve.pAgEq, 0.01);
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

  it('modelo por defecto (omitido) === "dh" explícito, a I > 0', () => {
    const params = {
      analyte: { z0: 0, pKas: [4.76] }, titrantIsAcid: false,
      cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 20, I: 0.2,
    };
    const withDefault = titrationCurve(params);
    const withExplicit = titrationCurve({ ...params, model: 'dh' as const });
    expect(withDefault.pHs).toEqual(withExplicit.pHs);
  });

  it('HAc 0.1 M + NaOH a I=0.2, medio-equivalencia (V=12.5 mL): pH = pKa + shift, 3 modelos derivados a mano', () => {
    // At V = Veq/2 the buffer ratio [HAc]=[Ac⁻] is 1:1 regardless of dilution
    // (Henderson-Hasselbalch depends only on the ratio) — same activity-pH
    // identity as solvePH's own buffer-point golden (engines.test.ts:86):
    // pH_activity = pKa − 3·logγ(1,I), independently re-derived per model.
    const params = {
      analyte: { z0: 0, pKas: [4.76] }, titrantIsAcid: false,
      cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 2000, I: 0.2,
    };
    const halfEqIdx = (model: 'dh' | 'davies' | 'guntelberg') => {
      const curve = titrationCurve({ ...params, model });
      return curve.pHs[curve.volumes.findIndex((v) => Math.abs(v - 12.5) < 0.02)];
    };
    tol(halfEqIdx('dh'), 4.76 - 3 * -0.158082, 0.005);
    tol(halfEqIdx('davies'), 4.76 - 3 * -0.126998, 0.005);
    tol(halfEqIdx('guntelberg'), 4.76 - 3 * -0.154508, 0.005);
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

  it('presets de igual carga (Pb²⁺/Ca²⁺, Ca²⁺/Mg²⁺) mantienen zA=zB=1 — no recalibrados', () => {
    // Ksel de estos dos se calibró contra el motor original (ciego a la
    // carga); poner zA=zB=2 real cambiaría sus números en silencio sin un K
    // de literatura para volver a calibrar (ver comentario en la interfaz).
    const chelating = RESIN_PRESETS.find((r) => r.id === 'chelating')!;
    expect(chelating.zA).toBe(1);
    expect(chelating.zB).toBe(1);
    const pbRemoval = APPLICATION_PRESETS.find((a) => a.id === 'pb-removal')!;
    expect(pbRemoval.zA).toBe(1);
    expect(pbRemoval.zB).toBe(1);
    const caMg = APPLICATION_PRESETS.find((a) => a.id === 'ca-mg')!;
    expect(caMg.zA).toBe(1);
    expect(caMg.zB).toBe(1);
  });

  it('presets de carga distinta (Ca²⁺/Na⁺, Ca²⁺/H⁺, SO₄²⁻/Cl⁻) sí llevan sus cargas reales', () => {
    const dowex = RESIN_PRESETS.find((r) => r.id === 'dowex50')!;
    expect(dowex.zA).toBe(2);
    expect(dowex.zB).toBe(1);
    const amberlite120 = RESIN_PRESETS.find((r) => r.id === 'amberlite120')!;
    expect(amberlite120.zA).toBe(2);
    expect(amberlite120.zB).toBe(1);
    const amberlite400 = RESIN_PRESETS.find((r) => r.id === 'amberlite400')!;
    expect(amberlite400.zA).toBe(2);
    expect(amberlite400.zB).toBe(1);
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

describe('distributionD — extracción líquido-líquido, quelatos n:1 general', () => {
  const chelate = (n: number): AnalyteState => ({
    label: 'M', type: 'chelate', logKd: 9.10, pKas: [], neutralIdx: 0, n, logCHL: -1,
  });

  it('pendiente de log D vs pH = n (Cu²⁺+8-HQ n=2, Fe³⁺+8-HQ n=3)', () => {
    for (const n of [1, 2, 3, 4]) {
      const a = chelate(n);
      const d1 = distributionD(a, 3);
      const d2 = distributionD(a, 4);
      tol(Math.log10(d2) - Math.log10(d1), n, 1e-9);
    }
  });

  it('Cu²⁺+8-HQ (logKex 9.10, log[HL] −1, n=2) a pH 4: D = 10^(9.10−2+8) = 10^15.10', () => {
    const cu8hq: AnalyteState = { label: 'Cu', type: 'chelate', logKd: 9.10, pKas: [], neutralIdx: 0, n: 2, logCHL: -1 };
    tol(Math.log10(distributionD(cu8hq, 4)), 15.10, 1e-9);
  });

  it('ácido: D = Kd·α_neutral, pendiente −1 en log D para pH ≫ pKa', () => {
    const acid: AnalyteState = { label: 'HA', type: 'acid', logKd: 2.22, pKas: [4.20], neutralIdx: 0, n: 1, logCHL: 0 };
    const d1 = distributionD(acid, 7);
    const d2 = distributionD(acid, 8);
    tol(Math.log10(d1) - Math.log10(d2), 1, 0.01);
  });

  it('sin pKas, D = Kd constante (I₂ no ionizable)', () => {
    const i2: AnalyteState = { label: 'I2', type: 'acid', logKd: 2.83, pKas: [], neutralIdx: 0, n: 1, logCHL: 0 };
    expect(distributionD(i2, 1)).toBe(distributionD(i2, 10));
    tol(distributionD(i2, 5), Math.pow(10, 2.83), 1e-9);
  });

  it('dímero orgánico aumenta D respecto al monómero cuando K₂>0 y hay especie neutra', () => {
    const acid: AnalyteState = { label: 'HA', type: 'acid', logKd: 2.22, pKas: [4.20], neutralIdx: 0, n: 1, logCHL: 0 };
    const mono = distributionD(acid, 4.2); // pH = pKa: α_neutral = 0.5, efecto del dímero visible
    const dimerized = distributionD(acid, 4.2, { enabled: true, logK2: 1.5 });
    expect(dimerized).toBeGreaterThan(mono);
  });
});

describe('percentE1 / percentEn / nFor', () => {
  it('percentEn con count=1 coincide con percentE1', () => {
    const D = 50;
    const r = 1;
    tol(percentEn(D, r, 1), percentE1(D, r), 1e-9);
  });

  it('percentEn crece monótonamente con el número de extracciones', () => {
    const D = 5;
    const r = 1;
    expect(percentEn(D, r, 3)).toBeGreaterThan(percentEn(D, r, 2));
    expect(percentEn(D, r, 2)).toBeGreaterThan(percentEn(D, r, 1));
  });

  it('nFor(D,r,target) es el mínimo n tal que percentEn ≥ target', () => {
    const D = 2;
    const r = 1;
    const n = nFor(D, r, 99)!;
    expect(percentEn(D, r, n)).toBeGreaterThanOrEqual(99);
    expect(percentEn(D, r, n - 1)).toBeLessThan(99);
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

  it('zA=zB=1 sin pasarlos da exactamente el mismo resultado que pasándolos explícitos (default = 1:1)', () => {
    const base = { cA0: 0.01, cB0: 0.01, selectivityAB: 2.4, resinCapacity: 2, resinVolume: 0.05, volume: 0.1 };
    expect(batchIonExchange(base)).toEqual(batchIonExchange({ ...base, zA: 1, zB: 1 }));
  });

  it('efecto concentración-valencia (Ca²⁺/Na⁺, Helfferich): diluir favorece al ion divalente', () => {
    // Mismo K, misma RAZÓN cA0/cB0 (1:2); la métrica correcta es la fracción
    // del propio A removida de solución (1 − cAeq/cA0), NO fracAInResin
    // (normalizada a la capacidad fija Q: diluir reduce nA0 en términos
    // absolutos y esa normalización lo confundiría con "menos adsorción").
    const params = { selectivityAB: 1.5, resinCapacity: 2, resinVolume: 0.05, zA: 2, zB: 1, volume: 0.1 };
    const removed = (cA0: number, cB0: number) => {
      const r = batchIonExchange({ ...params, cA0, cB0 });
      return 1 - r.cAeq / cA0;
    };
    expect(removed(0.5, 1.0)).toBeLessThan(0.3); // concentrado: A compite mal por el resina
    expect(removed(0.05, 0.1)).toBeGreaterThan(removed(0.5, 1.0)); // 10× más diluido, mejor
    expect(removed(0.005, 0.01)).toBeGreaterThan(0.99); // 100× más diluido: casi todo el A se adsorbe
  });

  it('caso z≠1 reproduce el balance de equivalentes a mano en el punto de equilibrio', () => {
    const r = batchIonExchange({
      cA0: 0.005, cB0: 0.01, selectivityAB: 2.4, resinCapacity: 2, resinVolume: 0.05, volume: 0.1, zA: 2, zB: 1,
    });
    const Q = 2 * 0.05; // eq
    const zeta = r.fracAInResin * Q; // eq de A adsorbidos
    tol(r.cAeq, (0.005 * 0.1 - zeta / 2) / 0.1, 1e-9);
    tol(r.cBeq, (0.01 * 0.1 + zeta / 1) / 0.1, 1e-9);
    const K = (Math.pow(r.fracAInResin, 1) * Math.pow(r.cBeq, 2)) / (Math.pow(r.fracBInResin, 2) * Math.pow(r.cAeq, 1));
    tol(K, 2.4, 0.01);
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
