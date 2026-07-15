// Unified equilibrium ladder: MLⱼ ⇌ MLᵢ + (j−i)L on a p-scale.
// Species S₀…Sₙ connected by boundaries (constants) on the p-scale
// (pH for acid-base, pL for complexation, pe for redox). The SAME engine
// drives α distribution, the log-C diagram, and the predominance diagram for all three
// equilibrium types — that uniformity is what makes the app intuitive.

import { SPECIES_COLORS } from './database';
import { logGammaOf, type GammaModel } from './activity';

export type { GammaModel };

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
/**
 * Debye–Hückel shift for acid-base boundary i (pKa_i,app − pKa_i).
 * boundary i: species (z0−i) ⇌ H⁺ + species (z0−i−1)
 */
function pKaShift(z0: number, i: number, I: number, model: GammaModel): number {
  const zDonor    = z0 - i;
  const zAcceptor = z0 - i - 1;
  return logGammaOf(model, Math.abs(zDonor), I)
    - logGammaOf(model, Math.abs(zAcceptor), I)
    - logGammaOf(model, 1, I);
}

/**
 * α fractions for a one-particle-per-step ladder.
 * z0: charge of species 0 (needed for activity correction; ignored when I = 0).
 * I: ionic strength for Debye–Hückel correction (0 = ideal, ascending only).
 */
export function ladderFractions(
  p: number, boundaries: number[], ascending: boolean, z0 = 0, I = 0, model: GammaModel = 'dh',
): number[] {
  const logTerms: number[] = [0];
  let acc = 0;
  for (let i = 0; i < boundaries.length; i++) {
    const b = (ascending && I > 0) ? boundaries[i] + pKaShift(z0, i, I, model) : boundaries[i];
    acc += ascending ? p - b : b - p;
    logTerms.push(acc);
  }
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const denom = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / denom);
}

/** log concentration of each species: log[Sᵢ] = log αᵢ + log C_total. */
export function ladderLogC(
  p: number, boundaries: number[], ascending: boolean, logCtotal: number, z0 = 0, I = 0,
  model: GammaModel = 'dh',
): number[] {
  return ladderFractions(p, boundaries, ascending, z0, I, model).map(
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
  lo: number, hi: number, a: number, b: number,
  boundaries: number[], ascending: boolean, z0: number, I: number, model: GammaModel,
): number {
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const fr = ladderFractions(mid, boundaries, ascending, z0, I, model);
    if (fr[b] - fr[a] < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Predominance zones for the predominance diagram, computed by SWEEPING α (which species
 * dominates at each point) and refined by bisection. Robust to degenerate/close
 * constants: a species that never dominates simply produces no zone
 * (avoids the inverted-zone bug from previous versions).
 */
export function predominanceZones(
  boundaries: number[], labels: string[], pMin: number, pMax: number, ascending: boolean,
  z0 = 0, I = 0, model: GammaModel = 'dh',
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
    const a = ladderFractions(p, boundaries, ascending, z0, I, model);
    const dom = a.indexOf(Math.max(...a));
    if (dom !== curIdx) {
      const edge = curIdx >= 0
        ? refineBoundary(prevP, p, curIdx, dom, boundaries, ascending, z0, I, model)
        : pMin;
      pushZone(edge);
      curIdx = dom;
      zoneStart = edge;
    }
    prevP = p;
  }
  pushZone(pMax);
  return zones;
}
