// UI metric helpers — "% + operating point".
//
// These do NOT touch the calculation engines (complexation/equilibrium/conditional
// are already validated). They only READ those functions and add:
//   • derived percentages (% formed / dissociated / species fraction)
//   • "operating point": the diagram axis value (pL/pH/pe) where a metric
//     reaches X% (X ∈ {10,50,90}), solved by bisection.
//
// Exact definitions:
//   % formed (any ladder MLₙ)    = (1 − α_free)·100
//   % dissociated                = α_free·100
//   % acid-base species at pH    = αᵢ·100
//   fraction formed at Co (excess ligand) = K'·Co / (1 + K'·Co)

import { complexFractions } from './complexation';
import { alphaFractions } from './equilibrium';
import { alphaH, alphaOH } from './conditional';

// ── Complexation percentages ─────────────────────────────────────────────────

/**
 * Percent of total metal that has reacted into ANY complexed form (not free
 * M): (1 − α_free)·100. `alphaFree` is the free-metal fraction — index 0 of
 * whatever fraction vector the caller already has (complexFractions,
 * twoLigandFractions, speciationFractions all put free M there by this
 * codebase's convention), so this works unmodified for 1:1 complexes, N-step
 * ladders (MLₙ) and coupled X–M–L systems alike.
 *
 * This replaces an earlier ñ·100 (bjerrumNumber, mean ligand number) formula
 * that was only a genuine percentage for 1:1 complexes — for a 4-step ladder
 * (e.g. Zn–NH₃) ñ itself ranges 0–4, so ñ·100 showed values like "312.5 %",
 * which is not a physical percentage. (1 − α_free) is always in [0, 1] by
 * construction, for any number of steps.
 */
export function percentComplexed(alphaFree: number): number {
  return (1 - alphaFree) * 100;
}

/**
 * pL at which percentComplexed reaches targetPercent (bisection over pL).
 * For a 1:1 complex this coincides with pL = log β₁ at 50 % — same value the
 * old ñ-based formula gave, since with only two species (M, ML) the ladder
 * and the free-metal-fraction definitions are mathematically identical.
 */
export function pLForPercentComplexed(logBetas: number[], targetPercent: number): number {
  const hi = (logBetas[logBetas.length - 1] ?? 6) + 8;
  const metric = (pL: number) => percentComplexed(complexFractions(pL, logBetas)[0] ?? 0);
  return operatingPoint(metric, targetPercent, -4, hi);
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
