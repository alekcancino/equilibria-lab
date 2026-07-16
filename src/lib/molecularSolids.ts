import { PKW } from './constants';
import { alphaFractions } from './equilibrium';

export interface MolecularSolidSystem {
  label: string;
  S0: number;
  pKas: number[];
  z0: number;
  solidFormIndex: number;
}

export function molecularSolidSolubility(system: MolecularSolidSystem, pH: number): number {
  const fractions = alphaFractions(Math.pow(10, -pH), system.pKas);
  return system.S0 / Math.max(fractions[system.solidFormIndex] ?? 0, 1e-300);
}

export interface MolecularSaturationState {
  pH: number;
  totalSolubility: number;
  species: number[];
  chargeResidual: number;
}

/** Saturated-solution pH from electroneutrality for a multiprotic molecular solid. */
export function molecularSolidSaturationPH(
  system: MolecularSolidSystem,
  backgroundCharge = 0,
  pKw = PKW,
): MolecularSaturationState {
  const stateAt = (pH: number): MolecularSaturationState => {
    const h = Math.pow(10, -pH);
    const fractions = alphaFractions(h, system.pKas);
    const totalSolubility = molecularSolidSolubility(system, pH);
    const species = fractions.map((fraction) => fraction * totalSolubility);
    const chargeResidual = h - Math.pow(10, -pKw) / h + backgroundCharge
      + species.reduce((sum, concentration, index) => (
        sum + concentration * (system.z0 - index)
      ), 0);
    return { pH, totalSolubility, species, chargeResidual };
  };
  let lo = -2;
  let hi = pKw + 2;
  for (let i = 0; i < 140; i++) {
    const mid = (lo + hi) / 2;
    if (stateAt(mid).chargeResidual > 0) lo = mid;
    else hi = mid;
  }
  return stateAt((lo + hi) / 2);
}

export type AcidBaseSolidPhase =
  | { kind: 'molecular'; label: string; solidFormIndex: number; S0: number }
  | {
      kind: 'ionic';
      label: string;
      solidFormIndex: number;
      pKsp: number;
      freeCounterIon: number;
      counterExponent?: number;
    };

export interface CompetingSolidState {
  pH: number;
  totalDissolved: number;
  species: number[];
  phaseLimits: number[];
  activePhaseIndices: number[];
}

/** Selects the stable phase constraint for one shared acid-base pool. */
export function competingAcidBaseSolidsAtPH(params: {
  pKas: number[];
  z0: number;
  phases: AcidBaseSolidPhase[];
  pH: number;
}): CompetingSolidState {
  const fractions = alphaFractions(Math.pow(10, -params.pH), params.pKas);
  const phaseLimits = params.phases.map((phase) => {
    const fraction = Math.max(fractions[phase.solidFormIndex] ?? 0, 1e-300);
    if (phase.kind === 'molecular') return phase.S0 / fraction;
    const freeFormLimit = Math.pow(10, -phase.pKsp)
      / Math.pow(Math.max(phase.freeCounterIon, 1e-300), phase.counterExponent ?? 1);
    return freeFormLimit / fraction;
  });
  const totalDissolved = Math.min(...phaseLimits);
  const tolerance = Math.max(totalDissolved, 1e-300) * 1e-8;
  const activePhaseIndices = phaseLimits
    .map((limit, index) => Math.abs(limit - totalDissolved) <= tolerance ? index : -1)
    .filter((index) => index >= 0);
  return {
    pH: params.pH,
    totalDissolved,
    species: fractions.map((fraction) => fraction * totalDissolved),
    phaseLimits,
    activePhaseIndices,
  };
}

export interface FiniteCompetingSolidState extends CompetingSolidState {
  dissolvedMoles: number;
  solidMoles: number;
  chargeResidual: number;
  massError: number;
}

export function finiteCompetingAcidBaseSolidsAtPH(params: {
  pKas: number[];
  z0: number;
  phases: AcidBaseSolidPhase[];
  pH: number;
  totalAnalyteMoles: number;
  volume: number;
  backgroundCharge?: number;
  pKw?: number;
}): FiniteCompetingSolidState {
  const saturation = competingAcidBaseSolidsAtPH(params);
  const volume = Math.max(params.volume, 1e-300);
  const dissolvedMoles = Math.min(params.totalAnalyteMoles, saturation.totalDissolved * volume);
  const totalDissolved = dissolvedMoles / volume;
  const fractions = alphaFractions(Math.pow(10, -params.pH), params.pKas);
  const species = fractions.map((fraction) => fraction * totalDissolved);
  const h = Math.pow(10, -params.pH);
  const chargeResidual = h - Math.pow(10, -(params.pKw ?? PKW)) / h
    + (params.backgroundCharge ?? 0)
    + species.reduce((sum, concentration, index) => (
      sum + concentration * (params.z0 - index)
    ), 0);
  const solidMoles = Math.max(params.totalAnalyteMoles - dissolvedMoles, 0);
  return {
    ...saturation,
    totalDissolved,
    species,
    dissolvedMoles,
    solidMoles,
    chargeResidual,
    massError: dissolvedMoles + solidMoles - params.totalAnalyteMoles,
  };
}

export function solveFiniteCompetingSolidPH(
  params: Omit<Parameters<typeof finiteCompetingAcidBaseSolidsAtPH>[0], 'pH'>,
): FiniteCompetingSolidState {
  let lo = -2;
  let hi = (params.pKw ?? PKW) + 2;
  for (let i = 0; i < 140; i++) {
    const mid = (lo + hi) / 2;
    if (finiteCompetingAcidBaseSolidsAtPH({ ...params, pH: mid }).chargeResidual > 0) lo = mid;
    else hi = mid;
  }
  return finiteCompetingAcidBaseSolidsAtPH({ ...params, pH: (lo + hi) / 2 });
}
