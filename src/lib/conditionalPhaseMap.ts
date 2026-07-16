import { alphaH } from './conditional';
import { axisValue, type Grid2D } from './predominance2D';

export interface ConditionalMapSpecies {
  label: string;
  logBeta: number;
  hydroxideStoich?: number;
  ligandStoich?: number;
}

export interface ConditionalSolid {
  label: string;
  pKsp: number;
  metalStoich: number;
  hydroxideStoich: number;
}

export interface ConditionalPhaseMapSystem {
  cMetal: number;
  ligandPKas?: number[];
  species: ConditionalMapSpecies[];
  solid?: ConditionalSolid;
  ligandAxis?: 'free' | 'conditional';
  pKw?: number;
}

export interface ConditionalPhasePoint {
  fractions: number[];
  freeMetal: number;
  freePL: number;
  saturationIndex: number;
  dominant: number;
}

export function conditionalPhasePoint(
  system: ConditionalPhaseMapSystem,
  pH: number,
  pLAxis: number,
): ConditionalPhasePoint {
  const pKw = system.pKw ?? 14;
  const logAlphaL = Math.log10(alphaH(system.ligandPKas ?? [], pH));
  const freePL = system.ligandAxis === 'conditional' ? pLAxis + logAlphaL : pLAxis;
  const logOH = pH - pKw;
  const logL = -freePL;
  const logs = system.species.map((species) => species.logBeta
    + (species.hydroxideStoich ?? 0) * logOH
    + (species.ligandStoich ?? 0) * logL);
  const maxLog = Math.max(...logs);
  const weights = logs.map((value) => Math.pow(10, value - maxLog));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const fractions = weights.map((value) => value / totalWeight);
  const alphaMetal = Math.pow(10, maxLog) * totalWeight;
  const freeMetal = system.cMetal / alphaMetal;
  const solid = system.solid;
  const saturationIndex = solid
    ? solid.pKsp + solid.metalStoich * Math.log10(Math.max(freeMetal, 1e-300))
      + solid.hydroxideStoich * logOH
    : -Infinity;
  let dominant = fractions.indexOf(Math.max(...fractions));
  if (solid && saturationIndex >= 0) dominant = system.species.length;
  return { fractions, freeMetal, freePL, saturationIndex, dominant };
}

export function conditionalPhaseMap(
  system: ConditionalPhaseMapSystem,
  pHRange: [number, number],
  pLRange: [number, number],
  nx = 160,
  ny = 160,
): Grid2D {
  const dominant: number[][] = [];
  const frac: number[][] = [];
  for (let j = 0; j < ny; j++) {
    const pL = axisValue(pLRange, ny, j);
    const rowD: number[] = [];
    const rowF: number[] = [];
    for (let i = 0; i < nx; i++) {
      const pH = axisValue(pHRange, nx, i);
      const point = conditionalPhasePoint(system, pH, pL);
      rowD.push(point.dominant);
      rowF.push(point.dominant === system.species.length ? 1 : point.fractions[point.dominant]);
    }
    dominant.push(rowD);
    frac.push(rowF);
  }
  return { dominant, frac, nx, ny, xRange: pHRange, yRange: pLRange };
}
