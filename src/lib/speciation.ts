// Metal speciation vs pH: hydrolysis (M–OH) coupled with an optional auxiliary
// ligand (M–L), species-by-species. Single mononuclear metal center — M(OH)ⱼ
// and MLᵢ share the same free-metal denominator but mixed M(OH)L species are
// not modeled (standard simplifying assumption for this class of problem).
//
// Species order is fixed: [M, MOH₁…MOHⱼ, ML₁…MLᵢ] (j = logBetasOH.length,
// i = logBetasL.length).

import { PKW } from './constants';
import { alphaH } from './conditional';
import { SPECIES_COLORS } from './database';
import type { Zone } from './ladder';

export interface MetalSpeciationSystem {
  metalLabel: string;
  cM: number;
  /** Overall log β of M(OH)₁ … M(OH)ⱼ. Empty = no hydrolysis modeled. */
  logBetasOH: number[];
  ligandLabel?: string;
  /** Overall log β of M-L₁ … M-Lᵢ. Empty = no auxiliary ligand. */
  logBetasL: number[];
  /** Ligand protonation pKas (ascending), for the total→free ligand balance. */
  pKasL: number[];
  /** Total analytical ligand concentration (M). 0 = no ligand present. */
  cL: number;
}

export interface SpeciationPoint {
  pH: number;
  /** Free ligand pL = −log[L]. Infinity when cL = 0 or there's no ligand branch. */
  pL: number;
  /** Species fractions in the fixed [M, MOH…, ML…] order; sums to 1. */
  fractions: number[];
  /** Mean number of auxiliary ligands bound per M (Bjerrum-style, L branch only). */
  nBar: number;
}

/**
 * Combined M–OH / M–L distribution at a given pH and free pL.
 * D = 1 + Σ βOHⱼ·[OH]ʲ + Σ βLᵢ·[L]ⁱ, all in log-space (immune to large β,
 * e.g. Fe³⁺ hydrolysis ~30). pL = Infinity zeroes the L terms with no special
 * case: log[L] = −Infinity → those terms vanish through Math.pow(10, -Infinity) = 0.
 */
export function speciationFractions(
  pH: number,
  pL: number,
  logBetasOH: number[],
  logBetasL: number[] = [],
): number[] {
  const logOH = pH - PKW;
  const logL = -pL;
  const logTerms = [
    0,
    ...logBetasOH.map((b, j) => b + (j + 1) * logOH),
    ...logBetasL.map((b, i) => b + (i + 1) * logL),
  ];
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const D = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / D);
}

function meanBoundL(pH: number, pL: number, logBetasOH: number[], logBetasL: number[]): number {
  if (logBetasL.length === 0) return 0;
  const fr = speciationFractions(pH, pL, logBetasOH, logBetasL);
  const nOH = logBetasOH.length;
  let n = 0;
  for (let i = 0; i < logBetasL.length; i++) n += (i + 1) * fr[1 + nOH + i];
  return n;
}

/**
 * Solves the free ligand pL at a given pH by bisection on the ligand mass
 * balance:  cL = [L]_free·α_L(H) + cM·n̄(pH, pL)
 * g(pL) = cL − 10^(−pL)·α_L(H) − cM·n̄(pH, pL) is monotonically increasing in
 * pL (same shape as complexation.ts's solvePL, with an extra α_L(H) factor
 * for ligand protonation). Returns Infinity when there's no ligand, NaN when
 * cL is too small to satisfy the balance (no physical solution).
 */
export function solveFreePL(
  pH: number,
  cM: number,
  cL: number,
  logBetasOH: number[],
  logBetasL: number[],
  pKasL: number[] = [],
): number {
  if (cL <= 0 || logBetasL.length === 0) return Infinity;
  const aH = alphaH(pKasL, pH); // alphaH([], pH) already returns 1
  const maxBeta = Math.max(...logBetasL);
  let lo = Math.min(-Math.log10(cL), 0) - 1;
  let hi = maxBeta + Math.log10(aH) + 8;
  const g = (pL: number) => cL - Math.pow(10, -pL) * aH - cM * meanBoundL(pH, pL, logBetasOH, logBetasL);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) hi = mid;
    else lo = mid;
  }
  const result = (lo + hi) / 2;
  const residual = g(result);
  if (Math.abs(residual) > 1e-6 * (cL + 1e-15)) return NaN;
  return result;
}

/** Full speciation (pL solve + fractions + n̄) at a single pH. */
export function speciationAtPH(sys: MetalSpeciationSystem, pH: number): SpeciationPoint {
  const pL = solveFreePL(pH, sys.cM, sys.cL, sys.logBetasOH, sys.logBetasL, sys.pKasL);
  const fractions = speciationFractions(pH, pL, sys.logBetasOH, sys.logBetasL);
  const nBar = meanBoundL(pH, pL, sys.logBetasOH, sys.logBetasL);
  return { pH, pL, fractions, nBar };
}

/** Sweeps pH and returns one SpeciationPoint per sample (for α / log C / n̄ curves). */
export function speciationCurve(
  sys: MetalSpeciationSystem,
  pHRange: [number, number] = [0, 14],
  points = 300,
): SpeciationPoint[] {
  const [pHmin, pHmax] = pHRange;
  const out: SpeciationPoint[] = [];
  for (let i = 0; i <= points; i++) {
    const pH = pHmin + ((pHmax - pHmin) * i) / points;
    out.push(speciationAtPH(sys, pH));
  }
  return out;
}

function refineBoundary(sys: MetalSpeciationSystem, lo: number, hi: number, a: number, b: number): number {
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const fr = speciationAtPH(sys, mid).fractions;
    if (fr[b] - fr[a] < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Predominance zones for the DUZP, by sweeping pH (which species dominates)
 * and refining each crossing by bisection — same technique as
 * ladder.ts's predominanceZones, adapted since here each sample requires a
 * pL bisection solve rather than a closed-form ladder evaluation.
 */
export function predominanceZonesVsPH(
  sys: MetalSpeciationSystem,
  labels: string[],
  pHRange: [number, number] = [0, 14],
): Zone[] {
  const [pMin, pMax] = pHRange;
  const N = 1500;
  const zones: Zone[] = [];
  // curIdx = -1 means "no zone open" — either before the first sample or
  // inside a pH gap where the ligand mass balance has no solution (NaN
  // fractions). Array.prototype.indexOf(NaN) is always -1 too, which is
  // exactly the sentinel we want here (dom collapses to "no dominant species").
  let curIdx = -1;
  let zoneStart = pMin;
  let prevP = pMin;

  const pushZone = (end: number) => {
    if (curIdx >= 0 && end > zoneStart) {
      zones.push({
        label: labels[curIdx] ?? `S${curIdx}`,
        index: curIdx,
        pStart: zoneStart,
        pEnd: end,
        color: SPECIES_COLORS[curIdx % SPECIES_COLORS.length],
      });
    }
  };

  for (let i = 0; i <= N; i++) {
    const pH = pMin + ((pMax - pMin) * i) / N;
    const a = speciationAtPH(sys, pH).fractions;
    const max = Math.max(...a);
    const dom = Number.isNaN(max) ? -1 : a.indexOf(max);
    if (dom !== curIdx) {
      // Bisection refinement only makes sense between two valid dominant
      // species; entering or leaving a NaN gap just cuts at the sample point.
      const edge = curIdx >= 0 && dom >= 0
        ? refineBoundary(sys, prevP, pH, curIdx, dom)
        : pH;
      pushZone(edge);
      curIdx = dom;
      zoneStart = edge;
    }
    prevP = pH;
  }
  pushZone(pMax);
  return zones;
}
