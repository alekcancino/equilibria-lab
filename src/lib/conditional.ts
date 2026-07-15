// Conditional constants engine (Ringbom).
// K' = K / (α_M · α_Y)    log K' = log K − log α_M − log α_Y
// All α ≥ 1; equals 1 when no side reaction is present.

import { PKW } from './constants';
import { alphaFractions } from './equilibrium';
import { logActivityCoefficient } from './activity';
import { stackFromLegacy, condLogKCurveFromStack } from './sideReactions';

/**
 * Side-reaction coefficient for ligand protonation (α_Y(H)).
 * α_Y(H) = 1 / α_{fully deprotonated} = D / [Y^n−]
 *
 * Uses alphaFractions: the last fraction is α of the deprotonated form,
 * so α_Y(H) = 1 / alphas[last].
 *
 * @param pKas  successive pKas of the ligand (ascending), e.g. EDTA [2.0, 2.69, 6.13, 10.37]
 * @param pH    medium pH
 */
export function alphaH(pKas: number[], pH: number): number {
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, pKas);
  const aFree = alphas[alphas.length - 1];
  return aFree < 1e-30 ? 1e30 : 1 / aFree;
}

/**
 * Side-reaction coefficient for metal hydrolysis (α_M(OH)).
 * α_M(OH) = 1 + Σ β_i(OH) · [OH]^i
 *
 * @param logBetasOH  overall log β of hydroxo-complexes M(OH)₁, M(OH)₂, ...
 * @param pH          medium pH
 */
export function alphaOH(logBetasOH: number[], pH: number): number {
  if (logBetasOH.length === 0) return 1;
  const pOH = PKW - pH;
  const logOH = -pOH;
  let sum = 1;
  for (let i = 0; i < logBetasOH.length; i++) {
    sum += Math.pow(10, logBetasOH[i] + (i + 1) * logOH);
  }
  return sum;
}

/**
 * Side-reaction coefficient for free auxiliary ligand (α_M(L)).
 * α_M(L) = 1 + Σ β_i · [L]^i
 *
 * @param logBetasL  overall log β of metal with the auxiliary ligand
 * @param cL         free auxiliary ligand concentration [L] (M)
 */
export function alphaL(logBetasL: number[], cL: number): number {
  if (logBetasL.length === 0 || cL <= 0) return 1;
  const logL = Math.log10(cL);
  let sum = 1;
  for (let i = 0; i < logBetasL.length; i++) {
    sum += Math.pow(10, logBetasL[i] + (i + 1) * logL);
  }
  return sum;
}

/**
 * Conditional constant (log K').
 * log K' = logKf − log(α_M) − log(α_Y)
 *
 * α_M = αM_OH · αM_L  (multiplicative combination of metal side-reaction coefficients)
 *
 * @param logKf   formation log K in ideal medium
 * @param alphaM  total metal coefficient (αOH · αL; pass 1 if not applicable)
 * @param alphaY  total ligand coefficient (αH; pass 1 if not applicable)
 */
export function condLogK(
  logKf: number,
  { alphaM, alphaY }: { alphaM: number; alphaY: number }
): number {
  return logKf - Math.log10(alphaM) - Math.log10(alphaY);
}

/**
 * Feasibility window: pH range where log K' ≥ threshold.
 * Returns [pH_min, pH_max] or null if the threshold is never reached.
 *
 * @param pHs       array of pH values (must be sorted)
 * @param logKs     corresponding array of log K' values (same index)
 * @param threshold quantitative threshold (6 = reaction; 8 = sharp titration)
 */
export function feasibilityWindow(
  pHs: number[],
  logKs: number[],
  threshold: number
): [number, number] | null {
  let best: [number, number] | null = null;
  let bestWidth = -1;
  let runStart: number | null = null;
  let runEnd: number | null = null;

  const flush = () => {
    if (runStart !== null && runEnd !== null) {
      const width = runEnd - runStart;
      if (width > bestWidth) {
        best = [runStart, runEnd];
        bestWidth = width;
      }
    }
    runStart = null;
    runEnd = null;
  };

  for (let i = 0; i < pHs.length; i++) {
    if (logKs[i] >= threshold) {
      if (runStart === null) runStart = pHs[i];
      runEnd = pHs[i];
    } else {
      flush();
    }
  }
  flush();
  return best;
}

/**
 * Generates the log K' = f(pH) curve for an M+Y system.
 *
 * @param logKf       formation log K of M+Y in ideal medium
 * @param pKasY       pKas of ligand Y (protonation)
 * @param logBetasOH  log β of metal with OH⁻ (can be [])
 * @param logBetasL   log β of metal with auxiliary ligand (can be [])
 * @param cL          free auxiliary ligand concentration (M)
 * @param pHRange     [pHmin, pHmax] sweep range
 * @param points      number of points
 */
export function condLogKCurve(
  logKf: number,
  pKasY: number[],
  logBetasOH: number[],
  logBetasL: number[],
  cL: number,
  pHRange: [number, number] = [1, 14],
  points = 500
): { pHs: number[]; logKs: number[]; logAlphaH: number[]; logAlphaOH: number[]; logAlphaL: number[] } {
  const stack = stackFromLegacy(pKasY, logBetasOH, logBetasL, cL);
  const r = condLogKCurveFromStack(logKf, stack, pHRange, points);
  return {
    pHs: r.pHs,
    logKs: r.logKs,
    logAlphaH: r.logAlphaH,
    logAlphaOH: r.logAlphaOH,
    logAlphaL: r.logAlphaL,
  };
}

/**
 * log s at a single pH for the salt M(OH)_n.
 *
 * Full model (not just a straight line): includes soluble hydroxo-complexes.
 *   [M^n+] = Ksp / [OH⁻]^n
 *   [M]_total = [M^n+] × α_M(OH)  (where α_M(OH) includes all soluble M(OH)_i)
 *   log s = −pKsp + n·(14−pH) + log α_M(OH)
 *
 * For amphoteric metals (Al, Zn, Pb, Cr), logBetasOH must include the
 * anionic complexes (Al(OH)₄⁻, Zn(OH)₄²⁻, etc.) → the curve has a U-shape.
 * Extracted from hydroxideSolCurve so the 2D solubility map (below) can
 * evaluate the same saturation boundary point-by-point on its own grid,
 * without re-deriving the formula.
 *
 * @param pKsp       −log Ksp of M(OH)_n
 * @param n          OH⁻ stoichiometry
 * @param logBetasOH overall log β of soluble M(OH)_i complexes (can be [])
 */
export function logSaturation(
  pH: number,
  pKsp: number,
  n: number,
  logBetasOH: number[],
  I = 0,
): number {
  // Ksp_app = Ksp_thermo / (γ_M · γ_OH^n) → pKsp_app = pKsp + logγ(n, I) + n·logγ(1, I)
  const pKspApp = I > 0
    ? pKsp + logActivityCoefficient(n, I) + n * logActivityCoefficient(1, I)
    : pKsp;
  const logFreeMetal = -pKspApp + n * (PKW - pH);
  return logFreeMetal + Math.log10(alphaOH(logBetasOH, pH));
}

/**
 * log s = f(pH) curve for the salt M(OH)_n. See logSaturation for the formula.
 *
 * @param pHRange    pH sweep range
 * @param points     number of points
 */
export function hydroxideSolCurve(
  pKsp: number,
  n: number,
  logBetasOH: number[],
  pHRange: [number, number] = [0, 14],
  points = 500,
  I = 0,
): { pHs: number[]; logS: number[] } {
  const [pHmin, pHmax] = pHRange;
  const pHs: number[] = [];
  const logS: number[] = [];

  for (let i = 0; i <= points; i++) {
    const pH = pHmin + ((pHmax - pHmin) * i) / points;
    pHs.push(pH);
    logS.push(logSaturation(pH, pKsp, n, logBetasOH, I));
  }

  return { pHs, logS };
}

/**
 * Individual M/M(OH)ⱼ fractions (no ligand) — same denominator as alphaOH,
 * but returning each term instead of their sum. Used by the 2D solubility map
 * to pick the dominant DISSOLVED species: below the saturation line, this
 * ladder depends only on pH — the Ksp condition pins [M^n+] via [OH⁻] alone,
 * so total concentration never enters the hydrolysis ratios.
 */
function hydrolysisFractions(pH: number, logBetasOH: number[]): number[] {
  const pOH = PKW - pH;
  const logOH = -pOH;
  const logTerms = [0, ...logBetasOH.map((b, i) => b + (i + 1) * logOH)];
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const D = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / D);
}

/**
 * 2D Sillén solubility map: dominant regime at (pH, log[M]_total).
 * Index 0 = solid M(OH)ₙ(s) — the analytical concentration at this point would
 * exceed saturation. Indices 1..k+1 = dissolved M^n+/M(OH)₁/.../M(OH)ₖ.
 *
 * Below the saturation line (undersaturated), which dissolved species
 * dominates depends only on pH, never on the y (log[M]) position — see
 * hydrolysisFractions. So the vertical axis only ever decides solid vs.
 * solution; species boundaries within "solution" are pH-only vertical bands,
 * exactly like the 1D M–OH predominance diagram.
 */
export function solubilityRegimeFractions(
  pH: number,
  logM: number,
  pKsp: number,
  n: number,
  logBetasOH: number[],
  I = 0,
): number[] {
  const isSolid = logM > logSaturation(pH, pKsp, n, logBetasOH, I);
  const dissolved = isSolid
    ? new Array<number>(logBetasOH.length + 1).fill(0)
    : hydrolysisFractions(pH, logBetasOH);
  return [isSolid ? 1 : 0, ...dissolved];
}

/**
 * pH where hydroxide solubility crosses a given threshold (bisection).
 * Returns null if the threshold is never crossed on [pHmin, pHmax].
 * direction: 'rising' finds the first ascending crossing (logS crosses upward),
 *            'falling' finds the first descending crossing.
 */
export function precipitationPH(
  pKsp: number,
  n: number,
  logBetasOH: number[],
  logSThreshold: number,
  pHRange: [number, number] = [0, 14],
  direction: 'falling' | 'rising' = 'falling',
  I = 0,
): number | null {
  const { pHs, logS } = hydroxideSolCurve(pKsp, n, logBetasOH, pHRange, 1000, I);
  // Find the first transition
  for (let i = 1; i < pHs.length; i++) {
    const crossed =
      direction === 'falling'
        ? logS[i - 1] > logSThreshold && logS[i] <= logSThreshold
        : logS[i - 1] <= logSThreshold && logS[i] > logSThreshold;
    if (crossed) {
      // Linear interpolation
      const t = (logSThreshold - logS[i - 1]) / (logS[i] - logS[i - 1]);
      return pHs[i - 1] + t * (pHs[i] - pHs[i - 1]);
    }
  }
  return null;
}
