export interface ConditionalAcidBaseStep {
  pKa: number;
  alphaAcid: number;
  alphaBase: number;
}

/** pKa′ for HA′ ⇌ H+ + A′ when each state has its own side-reaction coefficient. */
export function conditionalPKa({ pKa, alphaAcid, alphaBase }: ConditionalAcidBaseStep): number {
  return pKa + Math.log10(Math.max(alphaAcid, 1e-300))
    - Math.log10(Math.max(alphaBase, 1e-300));
}

/** Applies one state coefficient to every member of a protonation ladder. */
export function conditionalPKas(pKas: number[], stateAlphas: number[]): number[] {
  if (stateAlphas.length !== pKas.length + 1) {
    throw new Error('stateAlphas must contain one coefficient per ladder species');
  }
  return pKas.map((pKa, i) => conditionalPKa({
    pKa,
    alphaAcid: stateAlphas[i],
    alphaBase: stateAlphas[i + 1],
  }));
}

export function conditionalPKaCurve(
  pKa: number,
  alphaAcidAt: (x: number) => number,
  alphaBaseAt: (x: number) => number,
  range: [number, number],
  points = 200,
): { xs: number[]; pKas: number[] } {
  const xs: number[] = [];
  const pKas: number[] = [];
  for (let i = 0; i <= points; i++) {
    const x = range[0] + ((range[1] - range[0]) * i) / points;
    xs.push(x);
    pKas.push(conditionalPKa({
      pKa,
      alphaAcid: alphaAcidAt(x),
      alphaBase: alphaBaseAt(x),
    }));
  }
  return { xs, pKas };
}
