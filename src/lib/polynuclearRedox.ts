import { nernstSlope } from './thermodynamicState';

export function polynuclearNernstPotential(params: {
  E0: number;
  electrons: number;
  oxidizedActivity: number;
  reducedActivity: number;
  oxidizedExponent?: number;
  reducedExponent?: number;
  temperatureC?: number;
}): number {
  const logQ = (params.reducedExponent ?? 1) * Math.log10(Math.max(params.reducedActivity, 1e-300))
    - (params.oxidizedExponent ?? 1) * Math.log10(Math.max(params.oxidizedActivity, 1e-300));
  return params.E0 - nernstSlope(params.temperatureC ?? 25) * logQ / params.electrons;
}

export function polynuclearPoolFractions(params: {
  ratioReducedToOxidized: number;
  unitsInOxidized: number;
  unitsInReduced: number;
}): { oxidizedMolecules: number; reducedMolecules: number; oxidizedUnitFraction: number } {
  const ratio = Math.max(params.ratioReducedToOxidized, 0);
  const ox = 1 / (params.unitsInOxidized + params.unitsInReduced * ratio);
  const red = ratio * ox;
  return {
    oxidizedMolecules: ox,
    reducedMolecules: red,
    oxidizedUnitFraction: params.unitsInOxidized * ox,
  };
}

export function polynuclearEquivalencePotential(params: {
  potentials: number[];
  electrons: number[];
  activityCorrection?: number;
  temperatureC?: number;
}): number {
  const totalElectrons = params.electrons.reduce((sum, value) => sum + value, 0);
  const weighted = params.potentials.reduce((sum, value, index) => sum + value * params.electrons[index], 0) / totalElectrons;
  return weighted - nernstSlope(params.temperatureC ?? 25)
    * Math.log10(Math.max(params.activityCorrection ?? 1, 1e-300)) / totalElectrons;
}
