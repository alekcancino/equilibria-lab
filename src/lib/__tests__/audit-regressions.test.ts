import { describe, expect, it } from 'vitest';
import { bufferCapacityAtPH } from '../bufferCapacity';
import { conditionalPKa, conditionalPKas } from '../acidBaseConditional';
import { alphaH, alphaOH, condLogK, conditionalLogK } from '../conditional';
import {
  combineSideReactionBranches,
  composeAlphas,
  defaultSideStack,
  distributionCoefficient,
} from '../sideReactions';
import {
  equivalenceResidual,
  granVeq,
  quantitativity,
  titrationCurve,
} from '../titration';
import {
  competitiveEdtaPoint,
  competitiveEdtaTitrationCurve,
  complexometricSensorCurve,
  edtaTitrationCurve,
} from '../edta';
import {
  conditionalEprimeFromStates,
  conditionalPotentialPXDiagram,
  redoxMixtureTitrationCurve,
  redoxStateAlpha,
  redoxTitrationCurve,
  type RedoxCouple,
} from '../redox';
import { redoxNetworkFractions, redoxNetworkTitrationCurve } from '../redoxNetworks';
import {
  conditionalMolarSolubility,
  conditionalPKsp,
  sharedPrecipitationEquilibrium,
  sequentialSharedPrecipitation,
  solubilityWithCationComplexation,
} from '../conditionalSolubility';
import {
  chelateSideReactionAlphas,
  conditionalChelateLogK,
  distributionD,
  sequentialExtraction,
} from '../extraction';
import { competitiveIonExchange } from '../ionExchange';
import {
  acidBasePrecipitationAtPH,
  diproticGlobalPrecipitationBoundary,
  finiteAcidBasePrecipitationAtPH,
  fitPrecipitationGran,
  monoproticPrecipitationBoundary,
  precipitatingAcidTitrationPoint,
  precipitationGranTransform,
  solveAcidBasePrecipitationPH,
  solidBufferCapacityAtPH,
} from '../acidBasePrecipitation';
import { solvePH } from '../equilibrium';
import {
  competingAcidBaseSolidsAtPH,
  solveFiniteCompetingSolidPH,
  molecularSolidSaturationPH,
  molecularSolidSolubility,
} from '../molecularSolids';
import {
  biphasicAcidBaseAtPH,
  biphasicAcidBaseTitrationCurve,
  biphasicApparentBoundaries,
  solveBiphasicAcidBasePH,
} from '../biphasicAcidBase';
import { acidBaseResinTitrationCurve, solveAcidBaseResinPH } from '../acidBaseResin';
import { nernstSlope, SOLVENT_PRESETS, waterThermodynamicState } from '../thermodynamicState';
import {
  equilibriumConstantFromFreeEnergy,
  ionPairFractions,
  overallIonizationConstant,
  standardFreeEnergyFromK,
  transferCycle,
} from '../ionPairing';
import { glycineMacroConstants, glycineMicrostateFractions } from '../acidBaseMicrostates';
import { conditionalPhaseMap, conditionalPhasePoint } from '../conditionalPhaseMap';
import { evaluateFeasibility, feasibleIntervals1D } from '../multisystemFeasibility';
import { generalizedRedoxGrid, isRedoxGraphConnected, poolConservationError, redoxGraphPotentials, redoxPoolFractions } from '../generalizedRedoxDiagram';
import { conditionalPKspForPrecipitation, conditionalPrecipSensorCurve } from '../conditionalPrecipSensor';
import { precipTitrationCurve } from '../precipTitration';
import { finiteIdealSolidSolution, hasRegularSolutionMiscibilityGap, idealSolidSolutionAtComposition, regularSolutionGammas } from '../solidSolution';
import { backTitration, runTitrationProtocol } from '../titrationProtocols';
import { acidBaseEndpointError, complexometricEndpointError, complexometricIndicatorFraction, endpointFromCurve, precipitationEndpointError, redoxEndpointError } from '../endpointError';
import {
  acidBaseConductometricFromCurve, acidBaseOpticalFromCurve, absorbanceFromComposition,
  complexometricConductometricFromCurve, complexometricOpticalFromCurve,
  redoxConductometricFromCurve, redoxOpticalFromCurve,
  strongAcidConductometricCurve,
} from '../titrationObservables';
import { equimolarAssociationLogKForTarget, solveReactionExtent } from '../stoichiometricQuantitativity';
import { polynuclearEquivalencePotential, polynuclearNernstPotential, polynuclearPoolFractions } from '../polynuclearRedox';

describe('R2 conditional-equilibrium regressions', () => {
  it('adds independent side-reaction branches instead of multiplying them', () => {
    expect(combineSideReactionBranches([11, 11])).toBe(21);
    const breakdown = composeAlphas(7, {
      ligandPKas: [],
      hydrolysis: { logBetasOH: [8] },
      auxLigand: { logBetasL: [2], spec: { mode: 'free', cL: 0.1 } },
    });
    expect(breakdown.alphaOH).toBeCloseTo(11, 10);
    expect(breakdown.alphaL).toBeCloseTo(11, 10);
    expect(breakdown.alphaM).toBeCloseTo(21, 10);
    expect(combineSideReactionBranches([11])).toBe(11);
  });

  it('applies product coefficients and stoichiometric exponents with their correct signs', () => {
    expect(condLogK(10, { alphaM: 1, alphaY: 1, alphaProduct: 11 }))
      .toBeCloseTo(11.041392685, 9);
    expect(conditionalLogK(10, {
      reactants: [{ alpha: 1 }, { alpha: 10, stoich: 4 }],
    })).toBeCloseTo(6, 12);
  });
});

describe('R2 acid-base titration regressions', () => {
  it('uses the explicitly prepared salt form in the initial charge balance', () => {
    const sodiumA = titrationCurve({
      analyte: { z0: 0, pKas: [4.2], startIndex: 1, endIndex: 0 },
      titrantIsAcid: true,
      cAnalyte: 0.1,
      vAnalyte: 25,
      cTitrant: 0.1,
      vMax: 40,
      points: 80,
    });
    expect(sodiumA.pHs[0]).toBeCloseTo(8.60013, 4);

    const protonatedBase = titrationCurve({
      analyte: { z0: 1, pKas: [10], startIndex: 0, endIndex: 1 },
      titrantIsAcid: false,
      cAnalyte: 0.1,
      vAnalyte: 25,
      cTitrant: 0.1,
      vMax: 40,
      points: 80,
    });
    expect(protonatedBase.pHs[0]).toBeCloseTo(5.49979, 4);
  });

  it('keeps formal equivalences outside the 0–14 pKa window', () => {
    const sulfuric = titrationCurve({
      analyte: { z0: 0, pKas: [-3, 1.99], startIndex: 0, endIndex: 2 },
      titrantIsAcid: false,
      cAnalyte: 0.1,
      vAnalyte: 25,
      cTitrant: 0.1,
      vMax: 60,
      points: 120,
    });
    expect(sulfuric.equivalenceVolumes).toEqual([25, 50]);
  });

  it('linearizes a weak base titrated with strong acid in the correct direction', () => {
    const curve = titrationCurve({
      analyte: { z0: 1, pKas: [9.25], startIndex: 1, endIndex: 0 },
      titrantIsAcid: true,
      cAnalyte: 0.001,
      vAnalyte: 50,
      cTitrant: 0.1,
      vMax: 0.8,
      points: 800,
    });
    expect(granVeq(curve.volumes, curve.pHs, 50, true, 14, true)).toBeCloseTo(0.5, 2);
  });

  it('uses H+ as the residual for a base analyte titrated with acid', () => {
    const curve = titrationCurve({
      analyte: { z0: 0, pKas: [4.2], startIndex: 1, endIndex: 0 },
      titrantIsAcid: true,
      cAnalyte: 0.1,
      vAnalyte: 25,
      cTitrant: 0.1,
      vMax: 40,
      points: 200,
    });
    const iEq = curve.volumes.findIndex((v) => Math.abs(v - 25) < 1e-9);
    const residual = equivalenceResidual(curve.pHs[iEq], true);
    expect(quantitativity(residual, 0.05)).toBeCloseTo(96.5102, 3);
  });

  it('uses OH- as the residual for an acid analyte titrated with base', () => {
    const curve = titrationCurve({
      analyte: { z0: 0, pKas: [4.2], startIndex: 0, endIndex: 1 },
      titrantIsAcid: false,
      cAnalyte: 0.1,
      vAnalyte: 25,
      cTitrant: 0.1,
      vMax: 40,
      points: 200,
    });
    const iEq = curve.volumes.findIndex((v) => Math.abs(v - 25) < 1e-9);
    const residual = equivalenceResidual(curve.pHs[iEq], false);
    expect(residual).toBeCloseTo(Math.pow(10, curve.pHs[iEq] - 14), 12);
    expect(quantitativity(residual, 0.05)).toBeGreaterThan(99.9);
  });
});

describe('R2 ion-exchange and buffer-capacity regressions', () => {
  it('increases divalent-metal retention by 10^2 per pH unit', () => {
    const stack = defaultSideStack([]);
    const d4 = distributionCoefficient({ kSelSquared: 3, charge: 2, pH: 4, stack, hResin: 0.005 });
    const d8 = distributionCoefficient({ kSelSquared: 3, charge: 2, pH: 8, stack, hResin: 0.005 });
    expect(d4).toBeCloseTo(7.5e3, 6);
    expect(d8).toBeCloseTo(7.5e11, 6);
    const d5 = distributionCoefficient({ kSelSquared: 3, charge: 2, pH: 5, stack, hResin: 0.005 });
    expect(d5 / d4).toBeCloseTo(100, 10);
  });

  it('matches the homogeneous monoprotic buffer maximum', () => {
    const beta = bufferCapacityAtPH([{ c: 0.2, pKas: [4.75] }], 4.75);
    expect(beta).toBeCloseTo(0.115190955, 9);
  });

  it('keeps fY and alphaY as explicit reciprocal conventions', () => {
    const alphaY = alphaH([2.0, 2.69, 6.13, 10.37], 10.37);
    expect(alphaY).toBeGreaterThanOrEqual(1);
    expect(1 / alphaY).toBeCloseTo(0.499986, 5);
  });
});

describe('R2 multianalyte and conditional-titration extensions', () => {
  it('solves a common EDTA balance and exposes successive equivalences', () => {
    const metals = [
      { label: 'M1', c: 0.01, logKfCond: 10.2 },
      { label: 'M2', c: 0.01, logKfCond: 8.2 },
    ];
    const curve = competitiveEdtaTitrationCurve({
      metals,
      vSample: 50,
      cEdta: 0.01,
      vMax: 120,
      points: 120,
    });
    expect(curve.equivalenceVolumes).toEqual([50, 100]);
    expect(curve.order).toEqual([0, 1]);
    expect(metals[0].logKfCond - metals[1].logKfCond).toBe(2);
    const between = competitiveEdtaPoint(metals, 0.015);
    expect(between.complexes[0]).toBeGreaterThan(between.complexes[1]);

    const one = competitiveEdtaPoint([metals[0]], 0.006);
    const legacy = edtaTitrationCurve({
      logKf: 10.2,
      pH: 14,
      cMetal: 0.01,
      vMetal: 50,
      cEdta: 0.01,
      vMax: 50,
      axis: 'x',
      xMax: 0.6,
      sideStack: defaultSideStack([]),
      points: 1,
    });
    expect(one.pMetals[0]).toBeCloseTo(legacy.pMs[1], 9);
    expect(one.pY).toBeCloseTo(legacy.pYs[1], 8);
  });

  it('conserves a global electron balance for two sequential reductants', () => {
    const couple = (id: string, E0: number, n: number): RedoxCouple => ({
      id, name: id, halfReaction: '', ox: `${id}ox`, red: `${id}red`, E0, n, mH: 0, reference: '',
    });
    const a1 = couple('A1', 0.14, 2);
    const a2 = couple('A2', 0.77, 2);
    const titrant = couple('T', 1.24, 4);
    const mixture = redoxMixtureTitrationCurve({
      analytes: [{ couple: a1, c: 0.01 }, { couple: a2, c: 0.01 }],
      titrant,
      pH: 0,
      vAnalyte: 50,
      cTitrant: 0.01,
      vMax: 60,
      points: 120,
    });
    expect(mixture.order).toEqual([0, 1]);
    expect(mixture.equivalenceVolumes).toEqual([25, 50]);

    const reduced = redoxMixtureTitrationCurve({
      analytes: [{ couple: a1, c: 0.01 }], titrant, pH: 0,
      vAnalyte: 50, cTitrant: 0.01, vMax: 30, points: 60,
    });
    const legacy = redoxTitrationCurve({
      analyte: a1, titrant, pH: 0, cAnalyte: 0.01,
      vAnalyte: 50, cTitrant: 0.01, vMax: 30, points: 60,
    });
    expect(reduced.pes[30]).toBeCloseTo(legacy.pes[30], 10);
  });

  it('shifts each acid-base boundary from state-specific coefficients', () => {
    expect(conditionalPKa({ pKa: 5, alphaAcid: 100, alphaBase: 10 })).toBe(6);
    expect(conditionalPKas([4, 8], [100, 10, 1])).toEqual([5, 9]);
    expect(conditionalPKas([4.5], [1, 1])).toEqual([4.5]);
  });

  it('starts a pre-neutralized 50/50 buffer from its continuous composition', () => {
    const curve = titrationCurve({
      analyte: {
        z0: 0,
        pKas: [4.5],
        initialFractions: [0.5, 0.5],
        endIndex: 1,
      },
      titrantIsAcid: false,
      cAnalyte: 0.02,
      vAnalyte: 100,
      cTitrant: 0.1,
      vMax: 15,
      points: 150,
    });
    expect(curve.pHs[0]).toBeCloseTo(4.502729, 5);
    expect(curve.equivalenceVolumes).toEqual([10]);
  });

  it('derives metal and redox-indicator signals from the EDTA free-species curve', () => {
    const pMs = [2, 4, 8];
    const pYs = [8, 6, 2];
    const metal = complexometricSensorCurve(pMs, pYs, { kind: 'metal', E0: 0.5, n: 2 });
    expect(metal[2]).toBeCloseTo(0.5 - 0.05916 * 4, 10);
    const redox = complexometricSensorCurve(pMs, pYs, {
      kind: 'redox-indicator', E0: 0.4, n: 1, logKfOx: 8, logKfRed: 2,
    });
    expect(redox[2]).toBeLessThan(redox[0]);
  });
});

describe('R2 conditional redox states and networks', () => {
  it('reproduces complete protonation polynomials for three reference couples', () => {
    const ascorbate = conditionalEprimeFromStates(
      { E0: -0.05916, n: 2, mH: 0 }, 6, undefined,
      { intrinsicTerms: [{ logCoefficient: 11, pHSlope: -1 }, { logCoefficient: 15, pHSlope: -2 }] },
    ) / 0.05916;
    expect(ascorbate).toBeCloseTo(-1 + 0.5 * Math.log10(1 + 1e5 + 1e3), 10);

    const ferricyanide = conditionalEprimeFromStates(
      { E0: 7 * 0.05916, n: 1, mH: 0 }, 5, undefined,
      { intrinsicTerms: [{ logCoefficient: 4, pHSlope: -1 }, { logCoefficient: 7, pHSlope: -2 }] },
    ) / 0.05916;
    expect(ferricyanide).toBeCloseTo(7 + Math.log10(1 + 1e-1 + 1e-3), 10);

    const quinone = conditionalEprimeFromStates(
      { E0: 0.074, n: 2, mH: 0 }, 10.6, undefined,
      { intrinsicTerms: [{ logCoefficient: 11.4, pHSlope: -1 }, { logCoefficient: 21.2, pHSlope: -2 }] },
    );
    expect(quinone).toBeCloseTo(0.101201, 5);
  });

  it('adds independent ligand branches on one redox state', () => {
    const alpha = redoxStateAlpha({
      ligandBranches: [
        { logBetas: [2.4, 2.2], spec: { mode: 'fixedPX', pX: 1 } },
        { logBetas: [0.4], spec: { mode: 'fixedPX', pX: 2 } },
      ],
    }, 7);
    expect(alpha).toBeCloseTo(1 + Math.pow(10, 1.4) + Math.pow(10, 0.2) + Math.pow(10, -1.6), 10);
  });

  it('compares multiple potential curves on an adaptive pX domain', () => {
    const diagram = conditionalPotentialPXDiagram([
      { label: 'constant', E0: 0.5, n: 1, oxLogBetas: [], redLogBetas: [] },
      { label: 'complexed', E0: 1, n: 1, oxLogBetas: [10], redLogBetas: [] },
    ], [-3, 25], 1400);
    expect(diagram.pXs[0]).toBe(-3);
    expect(diagram.pXs[diagram.pXs.length - 1]).toBe(25);
    expect(diagram.crossings).toHaveLength(1);
    expect(diagram.crossings[0].pX).toBeCloseTo(1.55, 2);
  });

  it('conserves one inventory through a three-state redox titration', () => {
    const analyte = { labels: ['Ared', 'Aint', 'Aox'], transitions: [{ n: 1, pe0: 2 }, { n: 2, pe0: 8 }] };
    const titrant = { labels: ['Tred', 'Tox'], transitions: [{ n: 1, pe0: 12 }] };
    const mid = redoxNetworkFractions(analyte, 5);
    expect(mid.fractions.reduce((sum, fraction) => sum + fraction, 0)).toBeCloseTo(1, 12);
    const curve = redoxNetworkTitrationCurve({
      analyte,
      titrant,
      analyteMoles: 1,
      titrantConcentration: 1,
      vMax: 4,
      points: 80,
    });
    expect(curve.equivalenceVolumes).toEqual([1, 3]);
    curve.electronBalanceErrors.forEach((error) => expect(Math.abs(error)).toBeLessThan(1e-10));
    curve.analyteFractions.forEach((fractions) => fractions.forEach((fraction) => {
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThanOrEqual(1);
    }));
  });
});

describe('R2 separation and conditional-solubility extensions', () => {
  it('applies side-reaction coefficients to both ions with stoichiometric exponents', () => {
    expect(conditionalPKsp({ label: 'CaCO3', pKsp: 8, m: 1, x: 1, alphaM: 11, alphaX: 1 }))
      .toBeCloseTo(6.958607, 6);
    const ideal = conditionalMolarSolubility({ label: 'MX', pKsp: 10, m: 1, x: 1, alphaM: 1, alphaX: 1 });
    expect(ideal).toBeCloseTo(1e-5, 12);
    const agTotal = solubilityWithCationComplexation(10, 1e-2, 1, 22);
    expect(Math.log10(agTotal)).toBeCloseTo(-6.65758, 5);
  });

  it('shares one finite precipitant pool across N solids', () => {
    const result = sharedPrecipitationEquilibrium({
      salts: [
        { label: 'MX', pKsp: 12, m: 1, x: 1, totalFormulaMoles: 1e-3, alphaM: 1 },
        { label: 'NX2', pKsp: 18, m: 1, x: 2, totalFormulaMoles: 1e-3, alphaM: 10 },
      ],
      totalPrecipitantMoles: 2e-3,
      volume: 0.1,
      alphaX: 2,
    });
    expect(Math.abs(result.precipitantBalanceError)).toBeLessThan(1e-12);
    result.dissolvedFormulaMoles.forEach((amount, index) => {
      expect(amount + result.precipitatedFormulaMoles[index]).toBeCloseTo(1e-3, 12);
    });
  });

  it('conserves precipitant across sequential stage pH values', () => {
    const stages = sequentialSharedPrecipitation({
      salts: [
        { label: 'Fe', pKsp: 15, m: 1, x: 2, totalFormulaMoles: 0.01, alphaM: 1 },
        { label: 'Ni', pKsp: 14, m: 1, x: 2, totalFormulaMoles: 0.01, alphaM: 1 },
      ],
      logBetasOHBySalt: [[], []],
      totalPrecipitantMoles: 0.03,
      volume: 1,
      stagePHs: [8, 10, 12],
      alphaMetalAtPH: alphaOH,
    });
    expect(stages).toHaveLength(3);
    stages.forEach((stage) => expect(Math.abs(stage.result.precipitantBalanceError)).toBeLessThan(1e-10));
    expect(stages[2].result.precipitatedFormulaMoles[0]).toBeGreaterThanOrEqual(stages[0].result.precipitatedFormulaMoles[0]);
  });

  it('routes sequential extraction phases without reinitializing or losing analyte', () => {
    const analytes = [
      { label: 'A', initialMoles: 1, state: { label: 'A', type: 'acid' as const, logKd: 2, pKas: [4], neutralIdx: 0, n: 1, logCHL: 0 } },
      { label: 'B', initialMoles: 2, state: { label: 'B', type: 'acid' as const, logKd: 1, pKas: [8], neutralIdx: 0, n: 1, logCHL: 0 } },
      { label: 'C', initialMoles: 3, state: { label: 'C', type: 'acid' as const, logKd: 0, pKas: [], neutralIdx: 0, n: 1, logCHL: 0 } },
    ];
    const result = sequentialExtraction(analytes, [
      { pH: 2, aqueousVolume: 1, organicVolume: 1, continuePhase: 'organic' },
      { pH: 10, aqueousVolume: 1, organicVolume: 1, continuePhase: 'aqueous' },
      { pH: 5, aqueousVolume: 1, organicVolume: 1, continuePhase: 'organic' },
    ]);
    expect(result.collected).toHaveLength(3);
    result.massError.forEach((error) => expect(Math.abs(error)).toBeLessThan(1e-10));
  });

  it('applies full aqueous side reactions to chelate extraction', () => {
    const pH = 10;
    const alphaPb = 1 + Math.pow(10, pH - 8) + Math.pow(10, 2 * pH - 18) + Math.pow(10, 3 * pH - 29);
    const alphaDz = 1 + Math.pow(10, 9 - pH) * 2;
    expect(conditionalChelateLogK({ logKEx: 18, alphaMetal: alphaPb, alphaChelator: alphaDz, stoichChelator: 2 }))
      .toBeCloseTo(18 - Math.log10(alphaPb) - 2 * Math.log10(alphaDz), 12);
    const leadDithizone = {
      label: 'Pb/Dz', type: 'chelate' as const, logKd: 18, pKas: [], neutralIdx: 0,
      n: 2, logCHL: -2, logBetasMetalOH: [6, 10, 13],
      chelatorPKas: [9], chelatorPartitionRatio: 2,
    };
    const alphas = chelateSideReactionAlphas(leadDithizone, pH);
    expect(alphas.alphaMetal).toBeCloseTo(alphaPb, 10);
    expect(alphas.alphaChelator).toBeCloseTo(alphaDz, 10);
    expect(distributionD(leadDithizone, 14)).toBeLessThan(distributionD(leadDithizone, 10));
  });

  it('solves Ca/Mn competition on one Na-form resin capacity', () => {
    const result = competitiveIonExchange({
      ions: [
        { label: 'Ca2+', c0: 1e-3, charge: 2, kSelectivity: 1.331 },
        { label: 'Mn2+', c0: 1e-3, charge: 2, kSelectivity: 0.840 },
      ],
      counterIonConcentration: 0.01,
      capacityEq: 0.01,
      solutionVolume: 0.1,
    });
    expect(result.aqueous[0]).toBeCloseTo(3.193813e-7, 9);
    expect(result.aqueous[1]).toBeCloseTo(5.059728e-7, 9);
    expect(result.counterIonAqueous).toBeCloseTo(0.013998349, 8);
    result.massErrors.forEach((error) => expect(Math.abs(error)).toBeLessThan(1e-12));
    expect(Math.abs(result.equivalentError)).toBeLessThan(1e-12);
  });
});

describe('R2 coupled acid-base precipitation', () => {
  it('recovers the analytical precipitation boundaries', () => {
    expect(monoproticPrecipitationBoundary(8, 10, 0)).toBe(-2);
    expect(diproticGlobalPrecipitationBoundary(6.3, 10.1, 7.6, 2)).toBeCloseTo(5.4, 12);
  });

  it('reduces to the aqueous charge-balance solver when no solid is enabled', () => {
    const params = { pKas: [4.76], z0: 0, totalAnalyte: 0.01 };
    const coupled = solveAcidBasePrecipitationPH(params);
    const aqueous = solvePH([{ c: 0.01, z0: 0, pKas: [4.76] }]);
    expect(coupled.pH).toBeCloseTo(aqueous, 7);
    expect(coupled.solid).toBe(0);
  });

  it('conserves analyte and enforces Ksp when the solid is active', () => {
    const state = acidBasePrecipitationAtPH({
      pKas: [6.3, 10.1], z0: 0, totalAnalyte: 0.1,
      pKsp: 7.6, freeMetal: 1e-2,
    }, 10);
    expect(state.aqueousTotal + state.solid).toBeCloseTo(0.1, 12);
    expect(state.solid).toBeGreaterThan(0);
    expect(state.saturationRatio).toBeCloseTo(1, 10);
  });

  it('reproduces the coupled precipitation titration golden', () => {
    const fractions = [0, 0.5, 1, 1.5, 2];
    const points = fractions.map((fraction) => precipitatingAcidTitrationPoint({
      pKa: 8, pKsp: 10, cAnalyte: 0.1, vAnalyte: 1, cMetal: 1, cTitrant: 0.1, fraction,
    }));
    points.forEach((point) => {
      expect(Math.abs(point.chargeResidual)).toBeLessThan(1e-10);
    });
    for (let i = 1; i < points.length; i++) {
      expect(points[i].pH).toBeGreaterThan(points[i - 1].pH - 0.05);
    }
    expect(points[0].pH).toBeCloseTo(1.005, 2);
    expect(points[4].pH).toBeGreaterThan(12);
  });

  it('derives precipitation Gran and solid buffer capacity from the shared state', () => {
    const gran = precipitationGranTransform([0, 0.5], [2, 3], 1, 2);
    expect(gran[0].transformed).toBeCloseTo(1e-4, 12);
    expect(gran[1].transformed).toBeCloseTo(1.5e-6, 12);
    const betaSolid = solidBufferCapacityAtPH({
      pKas: [8], z0: 0, totalAnalyte: 0.1, pKsp: 10, freeMetal: 1,
    }, 5);
    expect(Number.isFinite(betaSolid)).toBe(true);
    const betaAqueous = solidBufferCapacityAtPH({ pKas: [4.76], z0: 0, totalAnalyte: 0.01 }, 4.76);
    expect(betaAqueous).toBeCloseTo(bufferCapacityAtPH([{ c: 0.01, pKas: [4.76] }], 4.76), 7);
    const volumes = [0, 1, 2, 3, 4];
    const y = volumes.map((volume) => 8 - 2 * volume);
    const pHs = volumes.map((volume, index) => -0.5 * Math.log10(y[index] / (10 + volume)));
    const fit = fitPrecipitationGran(precipitationGranTransform(volumes, pHs, 10, 2));
    expect(fit?.xIntercept).toBeCloseTo(4, 10);
    expect(fit?.r2).toBeCloseTo(1, 12);
  });

  it('conserves finite metal and analyte for general M_mA_x solids', () => {
    const state = finiteAcidBasePrecipitationAtPH({
      pKas: [2.15, 7.2, 12.35], z0: 0,
      totalAnalyteMoles: 2e-3, totalMetalMoles: 3e-3, volume: 0.1,
      pKsp: 28.92, m: 3, x: 2, metalCharge: 2,
    }, 12);
    expect(state.solidFormulaMoles).toBeGreaterThan(0);
    expect(Math.abs(state.analyteMassError)).toBeLessThan(1e-14);
    expect(Math.abs(state.metalMassError)).toBeLessThan(1e-14);
    expect(state.saturationRatio).toBeCloseTo(1, 8);
  });
});

describe('R2 molecular and competing solids', () => {
  it('solves the self-consistent saturation pH of benzoic acid', () => {
    const benzoic = { label: 'HBz(s)', S0: 0.0278, pKas: [4.2], z0: 0, solidFormIndex: 0 };
    const state = molecularSolidSaturationPH(benzoic);
    expect(state.pH).toBeCloseTo(2.87798, 5);
    expect(state.totalSolubility).toBeCloseTo(molecularSolidSolubility(benzoic, state.pH), 12);
    expect(Math.abs(state.chargeResidual)).toBeLessThan(1e-12);
  });

  it('selects between molecular and ionic solids on one acid-base pool', () => {
    const pH = 5;
    const state = competingAcidBaseSolidsAtPH({
      pKas: [4], z0: 0, pH,
      phases: [
        { kind: 'molecular', label: 'HB(s)', solidFormIndex: 0, S0: Math.pow(10, -6.8) },
        { kind: 'ionic', label: 'NaB(s)', solidFormIndex: 1, pKsp: 2, freeCounterIon: Math.pow(10, 8.8 - pH) },
      ],
    });
    expect(state.phaseLimits[0]).toBeCloseTo(state.phaseLimits[1], 10);
    expect(state.activePhaseIndices).toEqual([0, 1]);
    expect(state.species.reduce((sum, value) => sum + value, 0)).toBeCloseTo(state.totalDissolved, 12);
    const finite = solveFiniteCompetingSolidPH({
      pKas: [4], z0: 0,
      phases: [
        { kind: 'molecular', label: 'HB(s)', solidFormIndex: 0, S0: 1e-4 },
        { kind: 'ionic', label: 'NaB(s)', solidFormIndex: 1, pKsp: 8, freeCounterIon: 0.01 },
      ],
      totalAnalyteMoles: 1e-3,
      volume: 0.1,
    });
    expect(Math.abs(finite.massError)).toBeLessThan(1e-14);
    expect(Math.abs(finite.chargeResidual)).toBeLessThan(1e-10);
  });
});

describe('R2 biphasic acid-base balance', () => {
  it('reproduces the analytical boundary shifts', () => {
    expect(biphasicApparentBoundaries([4.5], 0, 1e6, 1)[0]).toBeCloseTo(10.4999996, 5);
    const oxine = biphasicApparentBoundaries([5, 9.7], 1, 720, 1);
    expect(oxine[0]).toBeCloseTo(2.1420647, 6);
    expect(oxine[1]).toBeCloseTo(12.5579353, 6);
  });

  it('reduces to aqueous pH and external distribution limits', () => {
    const params = {
      pKas: [4.76], z0: 0, totalMoles: 0.001,
      aqueousVolume: 0.1, organicVolume: 0, stateKDs: [100, 0],
    };
    expect(solveBiphasicAcidBasePH(params).pH)
      .toBeCloseTo(solvePH([{ c: 0.01, z0: 0, pKas: [4.76] }]), 10);
    const atPH = biphasicAcidBaseAtPH({ ...params, organicVolume: 0.1 }, 4.76);
    expect(atPH.distributionRatio).toBeCloseTo(50, 10);
    expect(Math.abs(atPH.massError)).toBeLessThan(1e-12);
  });

  it('conserves mass along the biphasic titration curve', () => {
    const curve = biphasicAcidBaseTitrationCurve({
      pKas: [4.5], z0: 0, cAnalyte: 0.01, vAnalyte: 0.1,
      cTitrant: 0.01, organicVolume: 0.1, stateKDs: [1e3, 0], vMax: 0.2,
      points: 40,
    });
    curve.massErrors.forEach((error) => expect(Math.abs(error)).toBeLessThan(1e-12));
  });
});

describe('R2 acid-base resin coupling', () => {
  it('reduces to the aqueous solver at zero resin capacity', () => {
    const state = solveAcidBaseResinPH({
      analytes: [{ label: 'HA', totalMoles: 0.001, pKas: [4.76], z0: 0, bindingIndex: 1, kBinding: 1e3 }],
      aqueousVolume: 0.1,
      resinCapacityMoles: 0,
      counterIonConcentration: 0.01,
      counterIonCharge: -1,
    });
    expect(state.pH).toBeCloseTo(solvePH([{ c: 0.01, z0: 0, pKas: [4.76] }]), 7);
    expect(state.resinOccupancy).toBe(0);
  });

  it('shares finite resin capacity between protonatable analytes', () => {
    const state = solveAcidBaseResinPH({
      analytes: [
        { label: 'HA', totalMoles: 1e-3, pKas: [4], z0: 0, bindingIndex: 1, kBinding: 1e4 },
        { label: 'HB', totalMoles: 1e-3, pKas: [8], z0: 0, bindingIndex: 1, kBinding: 1e2 },
      ],
      aqueousVolume: 0.1,
      resinCapacityMoles: 5e-4,
      counterIonConcentration: 0.01,
      counterIonCharge: -1,
    });
    expect(state.resinOccupancy).toBeLessThanOrEqual(1);
    state.massErrors.forEach((error) => expect(Math.abs(error)).toBeLessThan(1e-12));
  });

  it('keeps the formal equivalence volume unchanged by the resin', () => {
    const c = 0.0005 / 0.05;
    const curve = acidBaseResinTitrationCurve({
      analytes: [{ label: 'phenol', c, pKas: [10], z0: 0, bindingIndex: 1, kBinding: 1e3 }],
      vAnalyte: 0.05,
      cTitrant: 0.0981,
      vMax: 0.01,
      resinCapacityMoles: 2e-4,
      counterIonConcentration: 0.01,
      counterIonCharge: -1,
      points: 20,
    });
    expect(0.0005 / 0.0981).toBeCloseTo(0.00509684, 8);
    expect(curve.resinConverged).toBe(true);
    curve.massErrors.flat().forEach((error) => expect(Math.abs(error)).toBeLessThan(1e-12));
  });
});

describe('R2 solvent and thermodynamic state', () => {
  it('uses tabulated water neutrality and temperature-dependent Nernst slopes', () => {
    const expected: Array<[number, number]> = [[10, 7.264], [20, 7.0815], [25, 6.9975], [100, 6.132]];
    expected.forEach(([temperature, neutralPH]) => {
      expect(waterThermodynamicState(temperature).pKw / 2).toBeCloseTo(neutralPH, 4);
    });
    expect(waterThermodynamicState(25, 100).pKw / 2).toBeCloseTo(6.834, 3);
    expect(nernstSlope(25)).toBeCloseTo(0.05916, 5);
    expect(nernstSlope(100)).toBeGreaterThan(nernstSlope(25));
  });

  it('supports solvent-specific pKw and acidity domains without water clipping', () => {
    const dmf = SOLVENT_PRESETS.dmf;
    expect(solvePH([], 0, 0, 0, 'dh', dmf.pKw, dmf.acidityRange)).toBeCloseTo(15, 10);
    expect(dmf.pKw).toBeGreaterThan(14);
    expect(SOLVENT_PRESETS.ethanol.pKw).toBeGreaterThan(14);
    const ethanolCurve = titrationCurve({
      analyte: { z0: 0, pKas: [2.2, 10.1], startIndex: 0, endIndex: 2 },
      titrantIsAcid: false,
      cAnalyte: 0.1, vAnalyte: 10, cTitrant: 0.1, vMax: 25,
      pKw: SOLVENT_PRESETS.ethanol.pKw,
      pHRange: SOLVENT_PRESETS.ethanol.acidityRange,
    });
    expect(ethanolCurve.equivalenceVolumes).toEqual([10, 20]);
  });
});

describe('R2 ion pairing and microstates', () => {
  it('separates ionization from ion-pair dissociation and closes transfer cycles', () => {
    const overall = overallIonizationConstant({ ionization: 0.5, dissociation: 2.7e-5 });
    expect(overall).toBeCloseTo(1.35e-5, 12);
    expect(-Math.log10(overall)).toBeCloseTo(4.8697, 4);
    const fractions = ionPairFractions({ ionization: 0.5, dissociation: 2.7e-5 });
    expect(fractions.molecular + fractions.ionPair + fractions.freeIons).toBeCloseTo(1, 8);
    expect(fractions.molecular).toBeCloseTo(0.666, 2);
    expect(fractions.ionPair).toBeCloseTo(0.333, 2);
    const deltaG = standardFreeEnergyFromK(123.4);
    expect(equilibriumConstantFromFreeEnergy(deltaG)).toBeCloseTo(123.4, 10);
    expect(Math.abs(transferCycle({ sourceK: 10, reactantTransferK: 2, productTransferK: 5 }).cycleDeltaG)).toBeLessThan(1e-10);
  });

  it('derives glycine macroconstants while retaining central microstates', () => {
    const constants = {
      pKaToZwitterion: 2.31,
      pKaFromZwitterion: 9.62,
      pKaToNeutral: 7.62,
      pKaFromNeutral: 4.31,
    };
    const macro = glycineMacroConstants(constants);
    expect(macro.tautomerizationK).toBeCloseTo(Math.pow(10, 5.31), 5);
    expect(macro.pKa1).toBeCloseTo(2.309997873, 9);
    expect(macro.pKa2).toBeCloseTo(9.620002127, 9);
    expect(macro.pI).toBeCloseTo(5.965, 10);
    expect(macro.cycleErrorLogK).toBeCloseTo(0, 12);
    const fractions = glycineMicrostateFractions(constants, macro.pI);
    expect(Object.values(fractions).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
  });
});

describe('R2 conditional maps and sensors', () => {
  it('classifies mixed complexes and makes the solid boundary concentration-dependent', () => {
    const base = {
      cMetal: 1e-3,
      ligandPKas: [8],
      ligandAxis: 'conditional' as const,
      species: [
        { label: 'M', logBeta: 0 },
        { label: 'ML', logBeta: 10, ligandStoich: 1 },
        { label: 'MOHL', logBeta: 22, ligandStoich: 1, hydroxideStoich: 1 },
      ],
      solid: { label: 'M(OH)2(s)', pKsp: 12, metalStoich: 1, hydroxideStoich: 2 },
    };
    const mixed = conditionalPhasePoint(base, 10, 5);
    expect(mixed.fractions[2]).toBeGreaterThan(0);
    const solidSystem = { ...base, species: [{ label: 'M', logBeta: 0 }], ligandPKas: [] };
    const concentrated = conditionalPhaseMap(solidSystem, [0, 14], [0, 12], 30, 30);
    const dilute = conditionalPhaseMap({ ...solidSystem, cMetal: 1e-6 }, [0, 14], [0, 12], 30, 30);
    expect(concentrated.dominant).not.toEqual(dilute.dominant);
  });

  it('intersects multisystem objectives and rejects incompatible axes', () => {
    const constraints = [
      { label: 'Ni', axisSignature: 'pH|CNprime=.004', target: 4.275005, evaluate: (pH: number) => pH },
      { label: 'Pb', axisSignature: 'pH|CNprime=.004', target: -8.725628, evaluate: (pH: number) => -pH },
    ];
    expect(evaluateFeasibility(constraints, 6).feasible).toBe(true);
    const intervals = feasibleIntervals1D(constraints, [0, 14], 14000);
    expect(intervals[0][0]).toBeCloseTo(4.276, 3);
    expect(intervals[0][1]).toBeCloseTo(8.725, 3);
    expect(() => evaluateFeasibility([
      constraints[0], { ...constraints[1], axisSignature: 'free-pH' },
    ], 6)).toThrow(/Incompatible/);
  });

  it('keeps generalized redox scores path-independent and removes unstable states', () => {
    const graph = {
      nodes: [{ id: 'ox', label: 'Ox' }, { id: 'mid', label: 'Mid' }, { id: 'red', label: 'Red', phase: 'solid' as const }],
      edges: [
        { from: 'ox', to: 'mid', logK0: 10, peCoefficient: -1 },
        { from: 'mid', to: 'red', logK0: 5, pHCoefficient: -1, peCoefficient: -1 },
        { from: 'ox', to: 'red', logK0: 15, pHCoefficient: -1, peCoefficient: -2 },
      ],
    };
    expect(redoxGraphPotentials(graph, 7, 0, 4).maxCycleError).toBeLessThan(1e-12);
    expect(isRedoxGraphConnected(graph)).toBe(true);
    const grid = generalizedRedoxGrid(graph, [-3, 14], [-10, 25], 0, 20, 20);
    expect(new Set(grid.dominant.flat()).size).toBeGreaterThan(1);
  });

  it('conserves the metal pool and shifts solids with logC', () => {
    const makeGraph = (logC: number) => ({
      nodes: [
        { id: 'fe3', label: 'Fe3+', phase: 'aqueous' as const, logActivity: logC, poolStoich: 1 },
        { id: 'fe2', label: 'Fe2+', phase: 'aqueous' as const, logActivity: logC, poolStoich: 1 },
        { id: 'feoh3', label: 'Fe(OH)3', phase: 'solid' as const, poolStoich: 1 },
      ],
      edges: [
        { from: 'fe3', to: 'fe2', logK0: 0.771 / 0.05916, peCoefficient: -1 },
        { from: 'fe3', to: 'feoh3', logK0: 38.7 - 42, pHCoefficient: 3 },
      ],
    });
    const dilute = generalizedRedoxGrid(makeGraph(-4), [0, 14], [-5, 15], 0, 30, 30);
    const concentrated = generalizedRedoxGrid(makeGraph(-1), [0, 14], [-5, 15], 0, 30, 30);
    expect(concentrated.dominant).not.toEqual(dilute.dominant);
    const point = redoxGraphPotentials(makeGraph(-2), 9, 0, 0);
    expect(point.poolError).toBeLessThan(1e-12);
    expect(poolConservationError(redoxPoolFractions(point.scores, makeGraph(-2).nodes), makeGraph(-2).nodes))
      .toBeLessThan(1e-12);
  });

  it('couples conditional Ksp and the Nernst signal to the same free activity', () => {
    expect(conditionalPKspForPrecipitation(9, 1, 1, 10001001, 1)).toBeCloseTo(1.9999566, 6);
    const params = { pKsp: 9.74, cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 40, points: 30 };
    const base = precipTitrationCurve(params);
    const sensor = conditionalPrecipSensorCurve({ ...params, alphaMetal: 1, alphaAnalyte: 1, electrodeE0: 0.8, electrons: 1 });
    expect(sensor.pMetalFree).toEqual(base.pAgs);
    expect(sensor.pAnalyteFree).toEqual(base.pXs);
    expect(sensor.vEq).toBe(base.vEq);
    expect(sensor.potentials[10]).toBeCloseTo(0.8 - nernstSlope(25) * sensor.pMetalFree[10], 12);
  });
});

describe('R2 advanced solids, protocols, endpoints and observables', () => {
  it('closes ideal solid-solution activities and exposes non-ideal miscibility gaps', () => {
    const point = idealSolidSolutionAtComposition({ kspA: 1e-10, kspB: 1e-8, xA: 0.25, commonIonActivity: 1e-3 });
    expect(point.aqueousA * point.commonIonActivity).toBeCloseTo(1e-10 * point.xA, 14);
    expect(point.aqueousB * point.commonIonActivity).toBeCloseTo(1e-8 * point.xB, 14);
    expect(point.ratioClosure).toBeCloseTo(0, 14);
    expect(idealSolidSolutionAtComposition({ kspA: 1e-10, kspB: 1e-8, xA: 1, commonIonActivity: 1e-3 }).aqueousB).toBe(0);
    expect(regularSolutionGammas(0.5, 3).gammaA).toBeGreaterThan(1);
    expect(hasRegularSolutionMiscibilityGap(3)).toBe(true);
    const finite = finiteIdealSolidSolution({ kspA: 1e-10, kspB: 1e-8, totalA: 1e-3, totalB: 2e-3, totalCommonIon: 4e-3 });
    expect(finite.massError).toBeLessThan(1e-14);
    expect(finite.aqueousA * finite.aqueousCommonIon).toBeCloseTo(1e-10 * finite.xA, 10);
    expect(finite.aqueousB * finite.aqueousCommonIon).toBeCloseTo(1e-8 * (1 - finite.xA), 10);
  });

  it('conserves inventories across direct and back-titration stages', () => {
    const back = backTitration({ analyteMoles: 0.0025, primaryAddedMoles: 0.004, backTitrantConcentration: 0.1 });
    expect(back.primaryExcessMoles).toBeCloseTo(0.0015, 12);
    expect(back.backVolumeML).toBeCloseTo(15, 12);
    expect(back.recoveredAnalyteMoles).toBeCloseTo(0.0025, 12);
    const protocol = runTitrationProtocol([
      { label: 'A', moles: 0.0025 }, { label: 'B', moles: 0 }, { label: 'C', moles: 0 },
    ], [
      { label: 'primary', reagent: 'B', addedMoles: 0.004, consumes: 'A' },
      { label: 'back', reagent: 'C', addedMoles: 0.0015, consumes: 'B' },
    ]);
    expect(Object.values(protocol.inventories).reduce((sum, value) => sum + value, 0)).toBeCloseTo(0, 12);
  });

  it('reports quantitative indicator endpoint error for strong and weak systems', () => {
    expect(acidBaseEndpointError({ kind: 'strong-acid', endpointPH: 5, analyteConcentration: 0.1 }).relativeErrorPercent)
      .toBeCloseTo(-0.02, 3);
    expect(acidBaseEndpointError({ kind: 'strong-acid', endpointPH: 8, analyteConcentration: 0.1 }).relativeErrorPercent)
      .toBeCloseTo(0.002, 2);
    expect(acidBaseEndpointError({ kind: 'weak-acid', endpointPH: 7, analyteConcentration: 0.1, pKa: 4.75 }).relativeErrorPercent)
      .toBeCloseTo(-0.559197, 4);
    const interpolated = endpointFromCurve({ volumes: [0, 10, 20], signal: [2, 7, 12], endpointSignal: 7, equivalenceVolume: 9.5, titrantConcentration: 0.1, analyteMoles: 0.001 });
    expect(interpolated.volumeTP).toBe(10);
    expect(interpolated.volumeError).toBe(0.5);
    expect(complexometricIndicatorFraction(10)).toBeGreaterThan(0.9);
    const edtaCurve = edtaTitrationCurve({
      logKf: 10.65, pH: 10, cMetal: 0.01, vMetal: 50, cEdta: 0.01, vMax: 100,
    });
    const complexEndpoint = complexometricEndpointError({
      volumes: edtaCurve.volumes,
      pMs: edtaCurve.pMs,
      indicatorPM: edtaCurve.pMs[Math.floor(edtaCurve.pMs.length * 0.45)] ?? edtaCurve.pMs[0],
      equivalenceVolume: edtaCurve.vEq,
      titrantConcentration: 0.01,
      analyteMoles: 0.0005,
    });
    expect(complexEndpoint.volumeTP).toBeGreaterThan(0);
    const precipEndpoint = precipitationEndpointError({
      volumes: [0, 10, 20, 30],
      pTarget: [8, 7.9, 7.5, 6],
      endpointPTarget: 7.8,
      equivalenceVolume: 25,
      titrantConcentration: 0.1,
      analyteMoles: 0.0025,
    });
    expect(precipEndpoint.volumeTP).toBeGreaterThan(0);
    const redoxEndpoint = redoxEndpointError({
      volumes: [0, 10, 20, 30],
      signal: [0.4, 0.6, 0.85, 1.0],
      endpointSignal: 0.85,
      equivalenceVolume: 25,
      titrantConcentration: 0.05,
      analyteMoles: 0.0025,
    });
    expect(redoxEndpoint.volumeTP).toBeCloseTo(20, 0);
  });

  it('derives optical and conductometric signals without changing chemistry', () => {
    expect(absorbanceFromComposition([0.01], [100], 1)).toBeCloseTo(1, 12);
    expect(absorbanceFromComposition([0.02], [100], 1)).toBeCloseTo(2, 12);
    const curve = strongAcidConductometricCurve({
      cAcid: 0.1, vAcidML: 25, cBase: 0.1, vMaxML: 50,
      lambdaH: 350, lambdaOH: 200, lambdaSpectator: 50, points: 100,
    });
    const minimum = curve.volumes[curve.conductivity.indexOf(Math.min(...curve.conductivity))];
    expect(minimum).toBeCloseTo(curve.vEq, 0);
    const shared = titrationCurve({
      analyte: { z0: 0, pKas: [], kind: 'strong-acid', startIndex: 0, endIndex: 0 },
      titrantIsAcid: false, cAnalyte: 0.1, vAnalyte: 25, cTitrant: 0.1, vMax: 50, points: 100,
    });
    const fromCurve = acidBaseConductometricFromCurve({
      volumesML: shared.volumes,
      pHs: shared.pHs,
      cAnalyte: 0.1,
      vAnalyteML: 25,
      cTitrant: 0.1,
      titrantIsAcid: false,
      analyteKind: 'strong-acid',
      startIndex: 0,
    });
    const minShared = fromCurve.volumes[fromCurve.conductivity.indexOf(Math.min(...fromCurve.conductivity))];
    expect(minShared).toBeCloseTo(25, 0);
    const optical = acidBaseOpticalFromCurve({
      volumesML: [0, 12.5, 25],
      pHs: [1, 7, 12],
      cAnalyte: 0.1,
      vAnalyteML: 25,
      cTitrant: 0.1,
      titrantIsAcid: false,
      analyteKind: 'equilibrium',
      z0: 0,
      pKas: [4.75],
      startIndex: 0,
      productIndex: 1,
      productEpsilon: 100,
    });
    expect(optical.absorbance[2]).toBeGreaterThan(optical.absorbance[0]);
    const edta = edtaTitrationCurve({
      logKf: 10.65, pH: 10, cMetal: 0.01, vMetal: 50, cEdta: 0.01, vMax: 100,
    });
    const edtaOptical = complexometricOpticalFromCurve({
      volumesML: edta.volumes, pMs: edta.pMs, pYs: edta.pYs,
      cMetal: 0.01, vMetalML: 50, productEpsilon: 100,
    });
    expect(edtaOptical.absorbance.at(-1)).toBeGreaterThan(edtaOptical.absorbance[0]);
    const edtaCond = complexometricConductometricFromCurve({
      volumesML: edta.volumes, pMs: edta.pMs, pYs: edta.pYs,
      cMetal: 0.01, vMetalML: 50, metalCharge: 2, lambdaSpectator: 60,
    });
    expect(edtaCond.conductivity.at(-1)).toBeLessThan(edtaCond.conductivity[0]);
    const redoxCurve = redoxTitrationCurve({
      analyte: { id: 'fe', name: 'Fe', halfReaction: '', ox: 'Fe³⁺', red: 'Fe²⁺', E0: 0.771, n: 1, mH: 0, reference: '' },
      titrant: { id: 'ce', name: 'Ce', halfReaction: '', ox: 'Ce⁴⁺', red: 'Ce³⁺', E0: 1.72, n: 1, mH: 0, reference: '' },
      direction: 'oxidante', pH: 0, cAnalyte: 0.05, vAnalyte: 50, cTitrant: 0.05, vMax: 100, points: 100,
    });
    const redoxOptical = redoxOpticalFromCurve({
      volumesML: redoxCurve.volumes, pes: redoxCurve.pes, pe0Analyte: redoxCurve.pe0cAnalyte,
      nAnalyte: 1, analyteCoupleId: 'fe', direction: 'oxidante',
      cAnalyte: 0.05, vAnalyteML: 50, cTitrant: 0.05, productEpsilon: 100,
    });
    expect(Math.max(...redoxOptical.absorbance)).toBeGreaterThan(Math.min(...redoxOptical.absorbance));
    const redoxCond = redoxConductometricFromCurve({
      volumesML: redoxCurve.volumes, pes: redoxCurve.pes, pe0Analyte: redoxCurve.pe0cAnalyte,
      nAnalyte: 1, analyteCoupleId: 'fe', direction: 'oxidante',
      cAnalyte: 0.05, vAnalyteML: 50, cTitrant: 0.05, lambdaSpectator: 80,
    });
    expect(redoxCond.conductivity.at(-1)).not.toBe(redoxCond.conductivity[0]);
  });
});

describe('R2 general stoichiometry and polynuclear redox', () => {
  it('solves arbitrary reaction extent and the equimolar association target', () => {
    expect(equimolarAssociationLogKForTarget(0.1, 0.99)).toBeCloseTo(4.995635, 6);
    const result = solveReactionExtent({
      logK: 8,
      reactants: [{ initial: 3e-4, stoich: 3 }, { initial: 1e-4, stoich: 1 }],
      products: [{ initial: 1e-12, stoich: 3 }, { initial: 1e-12, stoich: 1 }],
    });
    expect(result.reactants[0] / result.reactants[1]).toBeCloseTo(3, 8);
    expect(result.limitingConversion).toBeGreaterThan(0.9);
  });

  it('retains molecular stoichiometry in Nernst, pool and equivalence equations', () => {
    const mono = polynuclearNernstPotential({ E0: 1, electrons: 1, oxidizedActivity: 0.2, reducedActivity: 0.8 });
    expect(mono).toBeCloseTo(1 - nernstSlope(25) * Math.log10(4), 12);
    const pool = polynuclearPoolFractions({ ratioReducedToOxidized: 2, unitsInOxidized: 2, unitsInReduced: 1 });
    expect(2 * pool.oxidizedMolecules + pool.reducedMolecules).toBeCloseTo(1, 12);
    const xEq = 0.01;
    expect(polynuclearEquivalencePotential({ potentials: [0.77, 1.07], electrons: [1, 2], activityCorrection: 2 * xEq }))
      .toBeCloseTo((0.77 + 2 * 1.07) / 3 - nernstSlope(25) * Math.log10(2 * xEq) / 3, 12);
    expect(polynuclearEquivalencePotential({ potentials: [0.77, 1.33], electrons: [1, 6], activityCorrection: 2 * xEq / 3 }))
      .toBeCloseTo((0.77 + 6 * 1.33) / 7 - nernstSlope(25) * Math.log10(2 * xEq / 3) / 7, 12);
  });
});
