// UI metric helpers — "% + operating point".
//
// These do NOT touch the calculation engines (complexation/equilibrium/conditional
// are already validated). They only READ those functions and add:
//   • derived percentages (% formed / dissociated / species fraction)
//   • "operating point": the diagram axis value (pL/pH/pe) where a metric
//     reaches X% (X ∈ {10,50,90}), solved by bisection.
//
// Exact definitions:
//   % formed (1:1 complex)       = ñ·100          (ñ = bjerrumNumber)
//   % dissociated                = (1 − ñ)·100
//   % acid-base species at pH    = αᵢ·100
//   fraction formed at Co (excess ligand) = K'·Co / (1 + K'·Co)

import { bjerrumNumber } from './complexation';
import { alphaFractions } from './equilibrium';
import { alphaH, alphaOH } from './conditional';

// ── Complexation percentages (1:1) ───────────────────────────────────────────

/** Percent formed for a 1:1 complex at a given pL: ñ·100. */
export function percentFormed(pL: number, logBetas: number[]): number {
  return bjerrumNumber(pL, logBetas) * 100;
}

/** Percent dissociated for a 1:1 complex at a given pL: (1 − ñ)·100. */
export function percentDissociated(pL: number, logBetas: number[]): number {
  return (1 - bjerrumNumber(pL, logBetas)) * 100;
}

// ── Acid-base species percentages ────────────────────────────────────────────

/** Percent of species i (αᵢ·100) for an HnA system with the given pKas, at a given pH. */
export function percentSpeciesAtPH(pH: number, pKas: number[], idx: number): number {
  const alphas = alphaFractions(Math.pow(10, -pH), pKas);
  return (alphas[idx] ?? 0) * 100;
}

// ── Conditional constant and fraction formed ──────────────────────────────────

/**
 * log K′(pH) for an M+Y complex with ligand protonation (α_Y(H)) and metal
 * hydrolysis (α_M(OH)). Delegates to conditional.ts.
 *   log K′ = log Kf − log α_Y(H) − log α_M(OH)
 */
export function condLogKAtPH(
  logKf: number,
  ligandPKas: number[],
  pH: number,
  logBetasOH: number[] = [],
): number {
  return logKf - Math.log10(alphaH(ligandPKas, pH)) - Math.log10(alphaOH(logBetasOH, pH));
}

/**
 * Fraction formed for a 1:1 complex with the ligand in excess (or the metal in
 * excess — the model is symmetric). Co is the concentration of the excess
 * reagent (M):
 *   f = [ML]/C_limiting = K'·Co / (1 + K'·Co)
 */
export function fractionFormedExcess(logKprime: number, cExcess: number): number {
  const KC = Math.pow(10, logKprime) * cExcess;
  return KC / (1 + KC);
}

// ── Operating point (generic bisection) ──────────────────────────────────────

/**
 * Operating point: value of x ∈ [lo, hi] where metric(x) = targetPercent.
 * metric must be monotone on [lo, hi] (increasing or decreasing); bisection
 * detects this from the sign of the endpoints. Follows the bisection pattern
 * in equilibrium.ts (~64 iterations). Returns NaN if [lo, hi] does not bracket the target.
 */
export function operatingPoint(
  metric: (x: number) => number,
  targetPercent: number,
  lo: number,
  hi: number,
  iterations = 64,
): number {
  let a = lo;
  let b = hi;
  let fa = metric(a) - targetPercent;
  const fb = metric(b) - targetPercent;
  if (Math.abs(fa) < 1e-9) return a;
  if (Math.abs(fb) < 1e-9) return b;
  if (fa * fb > 0) return NaN;
  for (let i = 0; i < iterations; i++) {
    const mid = (a + b) / 2;
    const fm = metric(mid) - targetPercent;
    if (Math.abs(fm) < 1e-12) return mid;
    if (fa * fm < 0) { b = mid; } else { a = mid; fa = fm; }
  }
  return (a + b) / 2;
}

/**
 * pL at which the percent formed of the complex reaches targetPercent (bisection over pL).
 * For a 1:1 complex, %formed = 50 occurs at pL = log β₁.
 */
export function pLForPercentFormed(logBetas: number[], targetPercent: number): number {
  const hi = (logBetas[logBetas.length - 1] ?? 6) + 8;
  return operatingPoint((pL) => percentFormed(pL, logBetas), targetPercent, -4, hi);
}

/**
 * pH at which the fraction formed of the M+Y complex (ligand in excess, conc. Co)
 * reaches targetPercent. Bisection over pH using log K′(pH).
 */
export function pHForPercentFormed(
  logKf: number,
  ligandPKas: number[],
  cExcess: number,
  targetPercent: number,
  logBetasOH: number[] = [],
  pHRange: [number, number] = [0, 14],
): number {
  const metric = (pH: number) =>
    fractionFormedExcess(condLogKAtPH(logKf, ligandPKas, pH, logBetasOH), cExcess) * 100;
  return operatingPoint(metric, targetPercent, pHRange[0], pHRange[1]);
}
