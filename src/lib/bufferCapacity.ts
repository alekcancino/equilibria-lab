import { alphaFractions } from './equilibrium';

export interface BufferComponent {
  c: number;
  pKas: number[];
}

const VAN_SLYKE_FACTOR = 2.303;

/** Van Slyke buffer capacity, including water and any number of protonation ladders. */
export function bufferCapacityAtPH(
  components: BufferComponent[],
  pH: number,
  pKw = 14,
): number {
  const h = Math.pow(10, -pH);
  const kw = Math.pow(10, -pKw);
  let beta = VAN_SLYKE_FACTOR * (h + kw / h);

  for (const component of components) {
    if (component.c <= 0) continue;
    const alphas = alphaFractions(h, component.pKas);
    let variance = 0;
    for (let i = 0; i < alphas.length; i++) {
      for (let j = i + 1; j < alphas.length; j++) {
        variance += (j - i) ** 2 * alphas[i] * alphas[j];
      }
    }
    beta += VAN_SLYKE_FACTOR * component.c * variance;
  }

  return beta;
}

export function bufferCapacityCurve(
  components: BufferComponent[],
  pHRange: [number, number] = [0, 14],
  points = 400,
  pKw = 14,
): { pHs: number[]; betas: number[] } {
  const [pHMin, pHMax] = pHRange;
  const pHs: number[] = [];
  const betas: number[] = [];
  for (let i = 0; i <= points; i++) {
    const pH = pHMin + ((pHMax - pHMin) * i) / points;
    pHs.push(pH);
    betas.push(bufferCapacityAtPH(components, pH, pKw));
  }
  return { pHs, betas };
}
