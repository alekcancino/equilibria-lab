// Unified equilibrium ladder (Baeza/UNAM model): MLⱼ ⇌ MLᵢ + (j−i)L on a p-scale.
// Species S₀…Sₙ connected by boundaries (constants) on the p-scale
// (pH for acid-base, pL for complexation, pe for redox). The SAME engine
// drives α distribution, the log-C diagram, and the DUZP for all three
// equilibrium types — that uniformity is what makes the app intuitive.

import { SPECIES_COLORS } from './database';

/**
 * α fractions for a one-particle-per-step ladder.
 * - `boundaries`: p-value of each boundary (pKa₁…pKaₙ for acid-base;
 *   successive log K₁…log Kₙ for complexation).
 * - `ascending=true`  → species index increases as p INCREASES (acid-base: pH;
 *   higher pH means more deprotonated species).
 * - `ascending=false` → species index increases as p DECREASES (complexation: pL;
 *   lower pL means more free ligand, more complexed species).
 *
 * Works in log-space to avoid overflow. Returns α₀…αₙ.
 */
export function ladderFractions(p: number, boundaries: number[], ascending: boolean): number[] {
  const logTerms: number[] = [0];
  let acc = 0;
  for (let i = 0; i < boundaries.length; i++) {
    acc += ascending ? p - boundaries[i] : boundaries[i] - p;
    logTerms.push(acc);
  }
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const denom = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / denom);
}

/** log concentration of each species: log[Sᵢ] = log αᵢ + log C_total. */
export function ladderLogC(
  p: number, boundaries: number[], ascending: boolean, logCtotal: number,
): number[] {
  return ladderFractions(p, boundaries, ascending).map(
    (a) => Math.log10(Math.max(a, 1e-30)) + logCtotal,
  );
}

export interface Zone {
  label: string;
  /** species index (for consistent color with α/logC) */
  index: number;
  pStart: number;
  pEnd: number;
  color: string;
}

/** Refines the boundary between two dominant species by bisection (exact p-value). */
function refineBoundary(
  lo: number, hi: number, a: number, b: number, boundaries: number[], ascending: boolean,
): number {
  // root of f(p) = α_b − α_a; f changes sign on [lo, hi]
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const fr = ladderFractions(mid, boundaries, ascending);
    if (fr[b] - fr[a] < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Predominance zones for the DUZP, computed by SWEEPING α (which species
 * dominates at each point) and refined by bisection. Robust to degenerate/close
 * constants: a species that never dominates simply produces no zone
 * (avoids the inverted-zone bug from previous versions).
 */
export function predominanceZones(
  boundaries: number[], labels: string[], pMin: number, pMax: number, ascending: boolean,
): Zone[] {
  const N = 2000;
  const zones: Zone[] = [];
  let curIdx = -1;
  let zoneStart = pMin;
  let prevP = pMin;

  const pushZone = (end: number) => {
    if (curIdx >= 0) {
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
    const p = pMin + ((pMax - pMin) * i) / N;
    const a = ladderFractions(p, boundaries, ascending);
    const dom = a.indexOf(Math.max(...a));
    if (dom !== curIdx) {
      const edge = curIdx >= 0 ? refineBoundary(prevP, p, curIdx, dom, boundaries, ascending) : pMin;
      pushZone(edge);
      curIdx = dom;
      zoneStart = edge;
    }
    prevP = p;
  }
  pushZone(pMax);
  return zones;
}
