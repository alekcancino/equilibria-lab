import { PKW } from './constants';
import { alphaFractions } from './equilibrium';
import { bufferCapacityAtPH } from './bufferCapacity';

export interface AcidBasePrecipitationParams {
  pKas: number[];
  /** Charge of the fully protonated aqueous form. */
  z0: number;
  totalAnalyte: number;
  /** Index of the aqueous form incorporated into the solid. */
  precipitatingIndex?: number;
  pKsp?: number;
  freeMetal?: number;
  /** Net fixed positive minus negative background concentration. */
  backgroundCharge?: number;
  pKw?: number;
}

export interface AcidBasePrecipitationState {
  pH: number;
  aqueousTotal: number;
  solid: number;
  aqueousSpecies: number[];
  chargeResidual: number;
  saturationRatio: number;
}

/** Coupled acid-base speciation and 1:1 precipitation at a fixed pH. */
export function acidBasePrecipitationAtPH(
  params: AcidBasePrecipitationParams,
  pH: number,
): AcidBasePrecipitationState {
  const h = Math.pow(10, -pH);
  const fractions = alphaFractions(h, params.pKas);
  const index = params.precipitatingIndex ?? params.pKas.length;
  const fractionSolidForm = Math.max(fractions[index] ?? 0, 1e-300);
  const hasSolidEquilibrium = params.pKsp !== undefined && params.freeMetal !== undefined;
  const maxAqueous = hasSolidEquilibrium
    ? Math.pow(10, -params.pKsp!) / Math.max(params.freeMetal!, 1e-300) / fractionSolidForm
    : Number.POSITIVE_INFINITY;
  const aqueousTotal = Math.min(Math.max(params.totalAnalyte, 0), maxAqueous);
  const solid = Math.max(params.totalAnalyte - aqueousTotal, 0);
  const aqueousSpecies = fractions.map((fraction) => fraction * aqueousTotal);
  const meanCharge = fractions.reduce((sum, fraction, speciesIndex) => (
    sum + fraction * (params.z0 - speciesIndex)
  ), 0);
  const chargeResidual = h - Math.pow(10, -(params.pKw ?? PKW)) / h
    + (params.backgroundCharge ?? 0)
    + aqueousTotal * meanCharge;
  const saturationRatio = hasSolidEquilibrium
    ? Math.max(params.freeMetal!, 0) * aqueousSpecies[index] / Math.pow(10, -params.pKsp!)
    : 0;
  return { pH, aqueousTotal, solid, aqueousSpecies, chargeResidual, saturationRatio };
}

/** Solves the charge balance while allowing the solid amount to change. */
export function solveAcidBasePrecipitationPH(
  params: AcidBasePrecipitationParams,
): AcidBasePrecipitationState {
  let lo = -2;
  let hi = (params.pKw ?? PKW) + 2;
  for (let i = 0; i < 140; i++) {
    const mid = (lo + hi) / 2;
    const residual = acidBasePrecipitationAtPH(params, mid).chargeResidual;
    if (residual > 0) lo = mid;
    else hi = mid;
  }
  return acidBasePrecipitationAtPH(params, (lo + hi) / 2);
}

export function monoproticPrecipitationBoundary(pKa: number, pKsp: number, pM: number): number {
  return pKa - pKsp + pM;
}

export function diproticGlobalPrecipitationBoundary(
  pKa1: number,
  pKa2: number,
  pKsp: number,
  pM: number,
): number {
  return 0.5 * (pKa1 + pKa2 - pKsp + pM);
}

export interface PrecipitatingAcidTitrationPoint {
  volume: number;
  fraction: number;
  pH: number;
  solidMoles: number;
  aqueousAnalyteMoles: number;
  freeMetal: number;
  chargeResidual: number;
}

/** Monoprotic acid/base titration coupled to a finite 1:1 metal precipitant. */
export function precipitatingAcidTitrationPoint(params: {
  pKa: number;
  pKsp: number;
  cAnalyte: number;
  vAnalyte: number;
  cMetal: number;
  cTitrant: number;
  fraction: number;
  pKw?: number;
}): PrecipitatingAcidTitrationPoint {
  const pKw = params.pKw ?? PKW;
  const nAnalyte = params.cAnalyte * params.vAnalyte;
  const vTitrant = params.fraction * nAnalyte / Math.max(params.cTitrant, 1e-300);
  const volume = params.vAnalyte + vTitrant;
  const nTitrant = params.cTitrant * vTitrant;
  const ksp = Math.pow(10, -params.pKsp);

  const stateAt = (pH: number) => {
    const h = Math.pow(10, -pH);
    const fractions = alphaFractions(Math.pow(10, -pH), [params.pKa]);
    const fractionA = fractions[1];
    const freeMetal = Math.max(params.cMetal, 1e-300);
    const freeAAtSaturation = ksp / freeMetal;
    const haAtSaturation = h * freeAAtSaturation / Math.pow(10, -params.pKa);
    const saturatedAqueousMoles = (freeAAtSaturation + haAtSaturation) * volume;
    const solidActive = saturatedAqueousMoles < nAnalyte;
    const aqueousAnalyteMoles = solidActive ? saturatedAqueousMoles : nAnalyte;
    const solidMoles = Math.max(nAnalyte - aqueousAnalyteMoles, 0);
    const chargeResidual = solidActive
      ? h - Math.pow(10, -pKw) / h - haAtSaturation - (nAnalyte - nTitrant) / volume
      : h - Math.pow(10, -pKw) / h + nTitrant / volume - nAnalyte * fractionA / volume;
    return { solidMoles, aqueousAnalyteMoles, freeMetal, chargeResidual };
  };

  let lo = -2;
  let hi = pKw + 2;
  for (let i = 0; i < 140; i++) {
    const mid = (lo + hi) / 2;
    if (stateAt(mid).chargeResidual > 0) lo = mid;
    else hi = mid;
  }
  const pH = (lo + hi) / 2;
  return { volume: vTitrant, fraction: params.fraction, pH, ...stateAt(pH) };
}

export function precipitatingAcidTitrationCurve(
  params: Omit<Parameters<typeof precipitatingAcidTitrationPoint>[0], 'fraction'> & {
    maxFraction?: number;
    points?: number;
  },
): PrecipitatingAcidTitrationPoint[] {
  const points = params.points ?? 400;
  const maxFraction = params.maxFraction ?? 2;
  return Array.from({ length: points + 1 }, (_, index) => precipitatingAcidTitrationPoint({
    ...params,
    fraction: maxFraction * index / points,
  }));
}

export interface PrecipitationGranPoint {
  volume: number;
  transformed: number;
}

/** Generalized pre-equivalence Gran transform for M + nu OH -> M(OH)_nu(s). */
export function precipitationGranTransform(
  volumes: number[],
  pHs: number[],
  initialVolume: number,
  hydroxideStoich: number,
): PrecipitationGranPoint[] {
  return volumes.map((volume, index) => ({
    volume,
    transformed: Math.pow(10, -hydroxideStoich * pHs[index]) * (initialVolume + volume),
  }));
}

export function fitPrecipitationGran(
  points: PrecipitationGranPoint[],
  maxVolume = Number.POSITIVE_INFINITY,
): { slope: number; intercept: number; xIntercept: number; r2: number } | null {
  const selected = points.filter((point) => point.volume <= maxVolume && Number.isFinite(point.transformed));
  if (selected.length < 3) return null;
  const meanX = selected.reduce((sum, point) => sum + point.volume, 0) / selected.length;
  const meanY = selected.reduce((sum, point) => sum + point.transformed, 0) / selected.length;
  const sxx = selected.reduce((sum, point) => sum + Math.pow(point.volume - meanX, 2), 0);
  if (sxx === 0) return null;
  const slope = selected.reduce((sum, point) => (
    sum + (point.volume - meanX) * (point.transformed - meanY)
  ), 0) / sxx;
  const intercept = meanY - slope * meanX;
  const ssTot = selected.reduce((sum, point) => sum + Math.pow(point.transformed - meanY, 2), 0);
  const ssRes = selected.reduce((sum, point) => (
    sum + Math.pow(point.transformed - (intercept + slope * point.volume), 2)
  ), 0);
  return {
    slope,
    intercept,
    xIntercept: slope === 0 ? Number.NaN : -intercept / slope,
    r2: ssTot === 0 ? 1 : 1 - ssRes / ssTot,
  };
}

/** Numerical buffer capacity from the complete solid-phase charge balance. */
export function solidBufferCapacityAtPH(
  params: AcidBasePrecipitationParams,
  pH: number,
): number {
  if (params.pKsp === undefined || params.freeMetal === undefined) {
    return bufferCapacityAtPH([{ c: params.totalAnalyte, pKas: params.pKas }], pH, params.pKw ?? PKW);
  }
  const dpH = 1e-4;
  const requiredBase = (value: number) => -acidBasePrecipitationAtPH(params, value).chargeResidual;
  return (requiredBase(pH + dpH) - requiredBase(pH - dpH)) / (2 * dpH);
}

export interface FiniteAcidBasePrecipitationState {
  pH: number;
  solidFormulaMoles: number;
  aqueousAnalyteMoles: number;
  freeMetalMoles: number;
  aqueousSpeciesMoles: number[];
  saturationRatio: number;
  analyteMassError: number;
  metalMassError: number;
  chargeResidual: number;
}

/** General M_mA_x phase with finite metal and a protonatable A pool. */
export function finiteAcidBasePrecipitationAtPH(params: {
  pKas: number[];
  z0: number;
  precipitatingIndex?: number;
  totalAnalyteMoles: number;
  totalMetalMoles: number;
  volume: number;
  pKsp: number;
  m: number;
  x: number;
  metalCharge: number;
  backgroundChargeMoles?: number;
  pKw?: number;
}, pH: number): FiniteAcidBasePrecipitationState {
  const volume = Math.max(params.volume, 1e-300);
  const m = Math.max(params.m, 1);
  const x = Math.max(params.x, 1);
  const fractions = alphaFractions(Math.pow(10, -pH), params.pKas);
  const index = params.precipitatingIndex ?? params.pKas.length;
  const ksp = Math.pow(10, -params.pKsp);
  const saturationAt = (solid: number) => {
    const freeA = (fractions[index] ?? 0) * Math.max(params.totalAnalyteMoles - x * solid, 0) / volume;
    const freeM = Math.max(params.totalMetalMoles - m * solid, 0) / volume;
    return Math.pow(freeM, m) * Math.pow(freeA, x);
  };
  let solidFormulaMoles = 0;
  if (saturationAt(0) > ksp) {
    let lo = 0;
    let hi = Math.min(params.totalAnalyteMoles / x, params.totalMetalMoles / m) * (1 - 1e-14);
    for (let i = 0; i < 140; i++) {
      const mid = (lo + hi) / 2;
      if (saturationAt(mid) > ksp) lo = mid;
      else hi = mid;
    }
    solidFormulaMoles = (lo + hi) / 2;
  }
  const aqueousAnalyteMoles = params.totalAnalyteMoles - x * solidFormulaMoles;
  const freeMetalMoles = params.totalMetalMoles - m * solidFormulaMoles;
  const aqueousSpeciesMoles = fractions.map((fraction) => fraction * aqueousAnalyteMoles);
  const h = Math.pow(10, -pH);
  const aqueousChargeMoles = aqueousSpeciesMoles.reduce((sum, amount, speciesIndex) => (
    sum + amount * (params.z0 - speciesIndex)
  ), 0);
  const metalSpectatorCharge = params.metalCharge * (freeMetalMoles - params.totalMetalMoles);
  const chargeResidual = h - Math.pow(10, -(params.pKw ?? PKW)) / h
    + (aqueousChargeMoles + metalSpectatorCharge + (params.backgroundChargeMoles ?? 0)) / volume;
  return {
    pH,
    solidFormulaMoles,
    aqueousAnalyteMoles,
    freeMetalMoles,
    aqueousSpeciesMoles,
    saturationRatio: saturationAt(solidFormulaMoles) / ksp,
    analyteMassError: aqueousAnalyteMoles + x * solidFormulaMoles - params.totalAnalyteMoles,
    metalMassError: freeMetalMoles + m * solidFormulaMoles - params.totalMetalMoles,
    chargeResidual,
  };
}
