// Metal speciation vs pH: hydrolysis (M–OH) coupled with an optional auxiliary
// ligand (M–L) and an optional second complexing agent (M–X), species-by-species.
// Single mononuclear metal center — M(OH)ⱼ, MLᵢ and MXₖ share the same
// free-metal denominator but mixed species (M(OH)L, MLX…) are not modeled
// (standard simplifying assumption for this class of problem).
//
// Species order is fixed: [M, MOH₁…MOHⱼ, ML₁…MLᵢ, MX₁…MXₖ] (j = logBetasOH.length,
// i = logBetasL.length, k = x.logBetasX.length when the X branch is active).

import { PKW } from './constants';
import { alphaH } from './conditional';
import { SPECIES_COLORS } from './database';
import type { Zone } from './ladder';
import type { XBranch } from './complexation';

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
  /** Optional second complexing agent competing with OH and L for M. */
  x?: XBranch;
}

export interface SpeciationPoint {
  pH: number;
  /** Free ligand pL = −log[L]. Infinity when cL = 0 or there's no ligand branch. */
  pL: number;
  /** Free pX of the second agent. Infinity when the X branch is absent/empty. */
  pX: number;
  /** Species fractions in the fixed [M, MOH…, ML…, MX…] order; sums to 1. */
  fractions: number[];
  /** Mean number of auxiliary ligands bound per M (Bjerrum-style, L branch only). */
  nBar: number;
  /** Mean number of X bound per M (X branch only). */
  nBarX: number;
}

/**
 * Combined M–OH / M–L / M–X distribution at a given pH and free pL/pX.
 * D = 1 + Σ βOHⱼ·[OH]ʲ + Σ βLᵢ·[L]ⁱ + Σ βXₖ·[X]ᵏ, all in log-space (immune to
 * large β, e.g. Fe³⁺ hydrolysis ~30). pL or pX = Infinity zeroes that branch's
 * terms with no special case: log[·] = −Infinity → the terms vanish through
 * Math.pow(10, -Infinity) = 0, so the two-branch model is the X-empty limit.
 */
export function speciationFractions(
  pH: number,
  pL: number,
  logBetasOH: number[],
  logBetasL: number[] = [],
  pX = Infinity,
  logBetasX: number[] = [],
): number[] {
  const logOH = pH - PKW;
  const logL = -pL;
  const logX = -pX;
  const logTerms = [
    0,
    ...logBetasOH.map((b, j) => b + (j + 1) * logOH),
    ...logBetasL.map((b, i) => b + (i + 1) * logL),
    ...logBetasX.map((b, k) => b + (k + 1) * logX),
  ];
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const D = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / D);
}

/** Mean bound L and X per M at the given free concentrations. */
function meanBound(
  pH: number,
  pL: number,
  pX: number,
  logBetasOH: number[],
  logBetasL: number[],
  logBetasX: number[],
): { nBarL: number; nBarX: number } {
  if (logBetasL.length === 0 && logBetasX.length === 0) return { nBarL: 0, nBarX: 0 };
  const fr = speciationFractions(pH, pL, logBetasOH, logBetasL, pX, logBetasX);
  const nOH = logBetasOH.length;
  let nBarL = 0;
  let nBarX = 0;
  for (let i = 0; i < logBetasL.length; i++) nBarL += (i + 1) * fr[1 + nOH + i];
  for (let k = 0; k < logBetasX.length; k++) nBarX += (k + 1) * fr[1 + nOH + logBetasL.length + k];
  return { nBarL, nBarX };
}

/** Free pX when the X spec fixes it directly; NaN signals the 'total' mode
 * (needs a mass-balance solve), Infinity an absent/empty branch. */
function knownPX(x?: XBranch): number {
  if (!x || x.logBetasX.length === 0) return Infinity;
  if (x.spec.mode === 'free') return x.spec.cL > 0 ? -Math.log10(x.spec.cL) : Infinity;
  if (x.spec.mode === 'fixedPX') return x.spec.pX;
  return NaN;
}

/**
 * Free pX of a 'total'-mode X branch at a given pH and (hypothetical) pL,
 * by bisection on  cX = [X]·α_X(H) + cM·n̄_X(pH, pL, pX).  g(pX) is
 * monotonically increasing in pX (both the free term and the bound term
 * shrink as [X] drops — the constant OH terms only enlarge the free-M pool),
 * so bisection is safe. Same structure as complexation.ts's solvePXAtPL with
 * the hydrolysis terms added to the shared denominator.
 */
function solvePXAt(
  pH: number,
  pL: number,
  cM: number,
  x: XBranch,
  logBetasOH: number[],
  logBetasL: number[],
): number {
  const fixed = knownPX(x);
  if (!Number.isNaN(fixed)) return fixed;
  const spec = x.spec as Extract<XBranch['spec'], { mode: 'total' }>;
  const cX = spec.cTotal;
  if (cX <= 0) return Infinity;
  const aXH = alphaH(spec.pKas, pH);
  let lo = Math.min(-Math.log10(cX), 0) - 1;
  let hi = Math.max(...x.logBetasX) + Math.log10(aXH) + 8;
  const g = (pX: number) =>
    cX - Math.pow(10, -pX) * aXH - cM * meanBound(pH, pL, pX, logBetasOH, logBetasL, x.logBetasX).nBarX;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) hi = mid;
    else lo = mid;
  }
  const result = (lo + hi) / 2;
  if (!(Math.abs(g(result)) <= 1e-6 * (cX + 1e-15))) return NaN;
  return result;
}

/**
 * Solves the free ligand pL at a given pH by bisection on the ligand mass
 * balance:  cL = [L]_free·α_L(H) + cM·n̄(pH, pL)
 * g(pL) = cL − 10^(−pL)·α_L(H) − cM·n̄(pH, pL) is monotonically increasing in
 * pL (same shape as complexation.ts's solvePL, with an extra α_L(H) factor
 * for ligand protonation). Returns Infinity when there's no ligand, NaN when
 * cL is too small to satisfy the balance (no physical solution).
 * With an X branch at fixed pX, the X terms just enter the shared denominator.
 */
export function solveFreePL(
  pH: number,
  cM: number,
  cL: number,
  logBetasOH: number[],
  logBetasL: number[],
  pKasL: number[] = [],
  pX = Infinity,
  logBetasX: number[] = [],
): number {
  if (cL <= 0 || logBetasL.length === 0) return Infinity;
  const aH = alphaH(pKasL, pH); // alphaH([], pH) already returns 1
  const maxBeta = Math.max(...logBetasL);
  let lo = Math.min(-Math.log10(cL), 0) - 1;
  let hi = maxBeta + Math.log10(aH) + 8;
  const g = (pL: number) =>
    cL - Math.pow(10, -pL) * aH - cM * meanBound(pH, pL, pX, logBetasOH, logBetasL, logBetasX).nBarL;
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

/**
 * Full speciation (pL/pX solve + fractions + n̄) at a single pH.
 * When the X branch is an analytical total AND the ligand is present, the two
 * balances couple: nested bisection with pX as the outer variable, exactly as
 * in complexation.ts's solveTwoLigandEquilibrium (the outer deficit stays
 * monotone — gross-substitutes property; the OH terms are constant at fixed
 * pH and only strengthen the free-M pool that argument relies on).
 */
export function speciationAtPH(sys: MetalSpeciationSystem, pH: number): SpeciationPoint {
  const logBetasX = sys.x?.logBetasX ?? [];
  const hasX = sys.x !== undefined && logBetasX.length > 0;
  const hasL = sys.cL > 0 && sys.logBetasL.length > 0;

  let pL: number;
  let pX: number;

  if (!hasX) {
    pX = Infinity;
    pL = solveFreePL(pH, sys.cM, sys.cL, sys.logBetasOH, sys.logBetasL, sys.pKasL);
  } else if (!Number.isNaN(knownPX(sys.x))) {
    pX = knownPX(sys.x);
    pL = solveFreePL(pH, sys.cM, sys.cL, sys.logBetasOH, sys.logBetasL, sys.pKasL, pX, logBetasX);
  } else if (!hasL) {
    pL = Infinity;
    pX = solvePXAt(pH, Infinity, sys.cM, sys.x!, sys.logBetasOH, sys.logBetasL);
  } else {
    // Both totals: nested bisection, outer on pX.
    const x = sys.x!;
    const spec = x.spec as Extract<XBranch['spec'], { mode: 'total' }>;
    const cX = spec.cTotal;
    if (cX <= 0) {
      pX = Infinity;
      pL = solveFreePL(pH, sys.cM, sys.cL, sys.logBetasOH, sys.logBetasL, sys.pKasL);
    } else {
      const aXH = alphaH(spec.pKas, pH);
      let lo = Math.min(-Math.log10(cX), 0) - 1;
      let hi = Math.max(...logBetasX) + Math.log10(aXH) + 8;
      const innerPL = (pXTry: number) =>
        solveFreePL(pH, sys.cM, sys.cL, sys.logBetasOH, sys.logBetasL, sys.pKasL, pXTry, logBetasX);
      const G = (pXTry: number) =>
        cX - Math.pow(10, -pXTry) * aXH
        - sys.cM * meanBound(pH, innerPL(pXTry), pXTry, sys.logBetasOH, sys.logBetasL, logBetasX).nBarX;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (G(mid) > 0) hi = mid;
        else lo = mid;
      }
      pX = (lo + hi) / 2;
      // Inverted comparison so a NaN residual (poisoned inner solve) also bails out.
      if (!(Math.abs(G(pX)) <= 1e-6 * (cX + 1e-15))) pX = NaN;
      pL = Number.isNaN(pX) ? NaN : innerPL(pX);
    }
  }

  const fractions = speciationFractions(pH, pL, sys.logBetasOH, sys.logBetasL, pX, logBetasX);
  const { nBarL, nBarX } = meanBound(pH, pL, pX, sys.logBetasOH, sys.logBetasL, logBetasX);
  return { pH, pL, pX, fractions, nBar: nBarL, nBarX };
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
