import { PKW } from './constants';
import { alphaFractions } from './equilibrium';

export interface ResinAcidBaseAnalyte {
  label: string;
  totalMoles: number;
  pKas: number[];
  z0: number;
  bindingIndex: number;
  kBinding: number;
}

export interface AcidBaseResinState {
  pH: number;
  aqueousTotals: number[];
  aqueousSpeciesMoles: number[][];
  resinMoles: number[];
  resinOccupancy: number;
  chargeResidual: number;
  massErrors: number[];
}

/** Shared finite-capacity resin equilibrium for N protonatable analytes. */
export function acidBaseResinAtPH(params: {
  analytes: ResinAcidBaseAnalyte[];
  aqueousVolume: number;
  resinCapacityMoles: number;
  counterIonConcentration: number;
  counterIonCharge: number;
  addedStrongCationMoles?: number;
  addedStrongAnionMoles?: number;
  pKw?: number;
}, pH: number): AcidBaseResinState {
  const volume = Math.max(params.aqueousVolume, 1e-300);
  const capacity = Math.max(params.resinCapacityMoles, 0);
  const fractions = params.analytes.map((analyte) => (
    alphaFractions(Math.pow(10, -pH), analyte.pKas)
  ));
  let resinMoles = params.analytes.map(() => 0);
  for (let iteration = 0; iteration < 300; iteration++) {
    const bindingConcentrations = params.analytes.map((analyte, index) => {
      const aqueous = Math.max(analyte.totalMoles - resinMoles[index], 0) / volume;
      return aqueous * (fractions[index][analyte.bindingIndex] ?? 0);
    });
    const affinities = params.analytes.map((analyte, index) => (
      Math.max(analyte.kBinding, 0) * bindingConcentrations[index]
      / Math.max(params.counterIonConcentration, 1e-300)
    ));
    const denominator = 1 + affinities.reduce((sum, value) => sum + value, 0);
    const targets = params.analytes.map((analyte, index) => (
      Math.min(analyte.totalMoles, capacity * affinities[index] / denominator)
    ));
    const next = resinMoles.map((current, index) => 0.5 * current + 0.5 * targets[index]);
    const change = next.reduce((max, value, index) => Math.max(max, Math.abs(value - resinMoles[index])), 0);
    resinMoles = next;
    if (change < 1e-15) break;
  }
  const aqueousTotals = params.analytes.map((analyte, index) => (
    Math.max(analyte.totalMoles - resinMoles[index], 0) / volume
  ));
  const aqueousSpeciesMoles = params.analytes.map((_, analyteIndex) => (
    fractions[analyteIndex].map((fraction) => fraction * aqueousTotals[analyteIndex] * volume)
  ));
  const aqueousCharge = params.analytes.reduce((sum, analyte, analyteIndex) => (
    sum + aqueousSpeciesMoles[analyteIndex].reduce((stateSum, amount, stateIndex) => (
      stateSum + amount * (analyte.z0 - stateIndex)
    ), 0)
  ), 0);
  const releasedCounterIonCharge = params.counterIonCharge * resinMoles.reduce((sum, amount) => sum + amount, 0);
  const h = Math.pow(10, -pH);
  const chargeResidual = h - Math.pow(10, -(params.pKw ?? PKW)) / h
    + (aqueousCharge + releasedCounterIonCharge
      + (params.addedStrongCationMoles ?? 0) - (params.addedStrongAnionMoles ?? 0)) / volume;
  return {
    pH,
    aqueousTotals,
    aqueousSpeciesMoles,
    resinMoles,
    resinOccupancy: capacity > 0 ? resinMoles.reduce((sum, amount) => sum + amount, 0) / capacity : 0,
    chargeResidual,
    massErrors: params.analytes.map((analyte, index) => (
      aqueousSpeciesMoles[index].reduce((sum, amount) => sum + amount, 0)
      + resinMoles[index] - analyte.totalMoles
    )),
  };
}

export function solveAcidBaseResinPH(
  params: Parameters<typeof acidBaseResinAtPH>[0],
): AcidBaseResinState {
  let lo = -2;
  let hi = (params.pKw ?? PKW) + 2;
  for (let i = 0; i < 140; i++) {
    const mid = (lo + hi) / 2;
    if (acidBaseResinAtPH(params, mid).chargeResidual > 0) lo = mid;
    else hi = mid;
  }
  return acidBaseResinAtPH(params, (lo + hi) / 2);
}

export function acidBaseResinTitrationCurve(params: {
  analytes: Array<Omit<ResinAcidBaseAnalyte, 'totalMoles'> & { c: number }>;
  vAnalyte: number;
  cTitrant: number;
  vMax: number;
  resinCapacityMoles: number;
  counterIonConcentration: number;
  counterIonCharge: number;
  points?: number;
  pKw?: number;
}): { volumes: number[]; pHs: number[]; occupancies: number[]; massErrors: number[][] } {
  const points = params.points ?? 400;
  const volumes: number[] = [];
  const pHs: number[] = [];
  const occupancies: number[] = [];
  const massErrors: number[][] = [];
  for (let i = 0; i <= points; i++) {
    const volume = params.vMax * i / points;
    const state = solveAcidBaseResinPH({
      analytes: params.analytes.map((analyte) => ({
        ...analyte,
        totalMoles: analyte.c * params.vAnalyte,
      })),
      aqueousVolume: params.vAnalyte + volume,
      resinCapacityMoles: params.resinCapacityMoles,
      counterIonConcentration: params.counterIonConcentration,
      counterIonCharge: params.counterIonCharge,
      addedStrongCationMoles: params.cTitrant * volume,
      pKw: params.pKw,
    });
    volumes.push(volume);
    pHs.push(state.pH);
    occupancies.push(state.resinOccupancy);
    massErrors.push(state.massErrors);
  }
  return { volumes, pHs, occupancies, massErrors };
}
