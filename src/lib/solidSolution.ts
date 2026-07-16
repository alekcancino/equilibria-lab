export interface IdealSolidSolutionPoint {
  xA: number;
  xB: number;
  aqueousA: number;
  aqueousB: number;
  commonIonActivity: number;
  ratioClosure: number;
}

export function idealSolidSolutionAtComposition(params: {
  kspA: number;
  kspB: number;
  xA: number;
  commonIonActivity: number;
  gammaSolidA?: number;
  gammaSolidB?: number;
}): IdealSolidSolutionPoint {
  const xA = Math.min(1, Math.max(0, params.xA));
  const xB = 1 - xA;
  const aX = Math.max(params.commonIonActivity, 1e-300);
  const gammaA = params.gammaSolidA ?? 1;
  const gammaB = params.gammaSolidB ?? 1;
  const aqueousA = params.kspA * gammaA * xA / aX;
  const aqueousB = params.kspB * gammaB * xB / aX;
  const expectedRatio = xA > 0 && xB > 0
    ? (params.kspB * gammaB / (params.kspA * gammaA)) * (xB / xA)
    : aqueousA === 0 ? Infinity : 0;
  const observedRatio = aqueousA > 0 ? aqueousB / aqueousA : Infinity;
  return { xA, xB, aqueousA, aqueousB, commonIonActivity: aX, ratioClosure: observedRatio / expectedRatio - 1 };
}

export function regularSolutionGammas(xA: number, interactionParameter: number): { gammaA: number; gammaB: number } {
  const xa = Math.min(1, Math.max(0, xA));
  const xb = 1 - xa;
  return {
    gammaA: Math.exp(interactionParameter * xb * xb),
    gammaB: Math.exp(interactionParameter * xa * xa),
  };
}

export function hasRegularSolutionMiscibilityGap(interactionParameter: number): boolean {
  return interactionParameter > 2;
}

export function finiteIdealSolidSolution(params: {
  kspA: number;
  kspB: number;
  totalA: number;
  totalB: number;
  totalCommonIon: number;
}): {
  solidAmount: number;
  xA: number;
  aqueousA: number;
  aqueousB: number;
  aqueousCommonIon: number;
  massError: number;
} {
  const saturation = params.totalCommonIon
    * (params.totalA / params.kspA + params.totalB / params.kspB);
  if (saturation <= 1) {
    return {
      solidAmount: 0,
      xA: params.totalA / Math.max(params.totalA + params.totalB, 1e-300),
      aqueousA: params.totalA, aqueousB: params.totalB,
      aqueousCommonIon: params.totalCommonIon, massError: 0,
    };
  }
  const maxSolid = Math.min(params.totalCommonIon, params.totalA + params.totalB);
  const compositionSum = (solid: number) => {
    const aX = params.totalCommonIon - solid;
    const xA = params.totalA * aX / (params.kspA + solid * aX);
    const xB = params.totalB * aX / (params.kspB + solid * aX);
    return { sum: xA + xB, xA, xB };
  };
  let lo = 0;
  let hi = maxSolid * (1 - 1e-14);
  for (let i = 0; i < 160; i++) {
    const mid = (lo + hi) / 2;
    if (compositionSum(mid).sum > 1) lo = mid;
    else hi = mid;
  }
  const solidAmount = (lo + hi) / 2;
  const composition = compositionSum(solidAmount);
  const xA = composition.xA / composition.sum;
  const aqueousA = params.totalA - solidAmount * xA;
  const aqueousB = params.totalB - solidAmount * (1 - xA);
  const aqueousCommonIon = params.totalCommonIon - solidAmount;
  const massError = Math.max(
    Math.abs(aqueousA + solidAmount * xA - params.totalA),
    Math.abs(aqueousB + solidAmount * (1 - xA) - params.totalB),
    Math.abs(aqueousCommonIon + solidAmount - params.totalCommonIon),
  );
  return { solidAmount, xA, aqueousA, aqueousB, aqueousCommonIon, massError };
}
