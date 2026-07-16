import { precipTitrationCurve, type PrecipParams } from './precipTitration';
import { nernstSlope } from './thermodynamicState';

export interface ConditionalPrecipSensorParams extends PrecipParams {
  alphaMetal?: number;
  alphaAnalyte?: number;
  electrodeE0: number;
  electrons: number;
  temperatureC?: number;
  referencePotential?: number;
}

export interface ConditionalPrecipSensorCurve {
  volumes: number[];
  pMetalFree: number[];
  pAnalyteFree: number[];
  potentials: number[];
  pKspConditional: number;
  vEq: number;
}

export function conditionalPKspForPrecipitation(
  pKsp: number,
  metalStoich: number,
  analyteStoich: number,
  alphaMetal = 1,
  alphaAnalyte = 1,
): number {
  return pKsp - metalStoich * Math.log10(alphaMetal) - analyteStoich * Math.log10(alphaAnalyte);
}

export function conditionalPrecipSensorCurve(
  params: ConditionalPrecipSensorParams,
): ConditionalPrecipSensorCurve {
  const m = params.m ?? 1;
  const x = params.x ?? 1;
  const alphaMetal = Math.max(params.alphaMetal ?? 1, 1e-300);
  const alphaAnalyte = Math.max(params.alphaAnalyte ?? 1, 1e-300);
  const pKspConditional = conditionalPKspForPrecipitation(params.pKsp, m, x, alphaMetal, alphaAnalyte);
  const curve = precipTitrationCurve({ ...params, pKsp: pKspConditional, m, x });
  const pMetalFree = curve.pAgs.map((value) => value + Math.log10(alphaMetal));
  const pAnalyteFree = curve.pXs.map((value) => value + Math.log10(alphaAnalyte));
  const slope = nernstSlope(params.temperatureC ?? 25) / Math.max(params.electrons, 1);
  const potentials = pMetalFree.map((value) => params.electrodeE0 - slope * value - (params.referencePotential ?? 0));
  return { volumes: curve.volumes, pMetalFree, pAnalyteFree, potentials, pKspConditional, vEq: curve.vEq };
}
