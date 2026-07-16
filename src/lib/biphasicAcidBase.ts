import { PKW } from './constants';
import { alphaFractions } from './equilibrium';

export interface BiphasicAcidBaseParams {
  pKas: number[];
  z0: number;
  totalMoles: number;
  aqueousVolume: number;
  organicVolume: number;
  /** Organic/aqueous distribution constant for each protonation state. */
  stateKDs: number[];
  addedStrongCationMoles?: number;
  addedStrongAnionMoles?: number;
  pKw?: number;
}

export interface BiphasicAcidBaseState {
  pH: number;
  aqueousTotal: number;
  aqueousSpeciesMoles: number[];
  organicSpeciesMoles: number[];
  chargeResidual: number;
  massError: number;
  distributionRatio: number;
}

export function biphasicAcidBaseAtPH(
  params: BiphasicAcidBaseParams,
  pH: number,
): BiphasicAcidBaseState {
  const h = Math.pow(10, -pH);
  const fractions = alphaFractions(h, params.pKas);
  const distributionRatio = fractions.reduce((sum, fraction, index) => (
    sum + fraction * Math.max(params.stateKDs[index] ?? 0, 0)
  ), 0);
  const capacityVolume = params.aqueousVolume + params.organicVolume * distributionRatio;
  const aqueousTotal = params.totalMoles / Math.max(capacityVolume, 1e-300);
  const aqueousSpeciesMoles = fractions.map((fraction) => fraction * aqueousTotal * params.aqueousVolume);
  const organicSpeciesMoles = fractions.map((fraction, index) => (
    fraction * aqueousTotal * params.organicVolume * Math.max(params.stateKDs[index] ?? 0, 0)
  ));
  const aqueousCharge = aqueousSpeciesMoles.reduce((sum, amount, index) => (
    sum + amount * (params.z0 - index)
  ), 0) / params.aqueousVolume;
  const chargeResidual = h - Math.pow(10, -(params.pKw ?? PKW)) / h
    + aqueousCharge
    + ((params.addedStrongCationMoles ?? 0) - (params.addedStrongAnionMoles ?? 0)) / params.aqueousVolume;
  const recovered = aqueousSpeciesMoles.reduce((sum, value) => sum + value, 0)
    + organicSpeciesMoles.reduce((sum, value) => sum + value, 0);
  return {
    pH,
    aqueousTotal,
    aqueousSpeciesMoles,
    organicSpeciesMoles,
    chargeResidual,
    massError: recovered - params.totalMoles,
    distributionRatio,
  };
}

export function solveBiphasicAcidBasePH(params: BiphasicAcidBaseParams): BiphasicAcidBaseState {
  let lo = -2;
  let hi = (params.pKw ?? PKW) + 2;
  for (let i = 0; i < 140; i++) {
    const mid = (lo + hi) / 2;
    if (biphasicAcidBaseAtPH(params, mid).chargeResidual > 0) lo = mid;
    else hi = mid;
  }
  return biphasicAcidBaseAtPH(params, (lo + hi) / 2);
}

export function biphasicApparentBoundaries(
  pKas: number[],
  neutralIndex: number,
  kd: number,
  volumeRatio: number,
): number[] {
  const shift = Math.log10(1 + Math.max(kd, 0) * Math.max(volumeRatio, 0));
  return pKas.map((pKa, index) => {
    if (index < neutralIndex) return pKa - shift;
    if (index >= neutralIndex) return pKa + shift;
    return pKa;
  });
}

export function biphasicAcidBaseTitrationCurve(params: {
  pKas: number[];
  z0: number;
  cAnalyte: number;
  vAnalyte: number;
  cTitrant: number;
  organicVolume: number;
  stateKDs: number[];
  vMax: number;
  points?: number;
  pKw?: number;
}): { volumes: number[]; pHs: number[]; massErrors: number[] } {
  const points = params.points ?? 400;
  const volumes: number[] = [];
  const pHs: number[] = [];
  const massErrors: number[] = [];
  for (let i = 0; i <= points; i++) {
    const volume = params.vMax * i / points;
    const state = solveBiphasicAcidBasePH({
      pKas: params.pKas,
      z0: params.z0,
      totalMoles: params.cAnalyte * params.vAnalyte,
      aqueousVolume: params.vAnalyte + volume,
      organicVolume: params.organicVolume,
      stateKDs: params.stateKDs,
      addedStrongCationMoles: params.cTitrant * volume,
      pKw: params.pKw,
    });
    volumes.push(volume);
    pHs.push(state.pH);
    massErrors.push(state.massError);
  }
  return { volumes, pHs, massErrors };
}

