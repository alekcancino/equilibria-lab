// Competitive precipitation: two 1:1 salts MX₁ and MX₂ sharing the common
// cation M (e.g. Ag⁺ over Cl⁻/Br⁻). Which solid(s) exist at equilibrium is
// decided by combination testing (HALTAFALL style): solve each phase
// hypothesis and accept the one whose solution satisfies every IAP ≤ Ksp with
// non-negative precipitate amounts.
// Source: Ingri et al. 1967 (HALTAFALL); Harris QCA, fractional precipitation.

export interface CompetitiveSalt {
  /** Anion label (the cation is shared). */
  label: string;
  pKsp: number;
  /** Total anion concentration (M). */
  cX: number;
}

export type CompetitivePhases = 'ninguna' | 'sal1' | 'sal2' | 'ambas';

export interface CompetitivePoint {
  pAg: number;
  /** Free anion concentrations (M). */
  freeX1: number;
  freeX2: number;
  /** Precipitated amounts (M of formula units). */
  p1: number;
  p2: number;
}

export interface CompetitiveEquilibrium extends CompetitivePoint {
  phases: CompetitivePhases;
}

/**
 * pAg at which a fraction f of salt (pKsp, cX) has precipitated, treating
 * [M] as the master variable: [X] = (1−f)·cX and [M][X] = Ksp give
 * pAg = pKsp + log₁₀((1−f)·cX). f = 0 is the onset of precipitation.
 */
export function pAgAtFraction(pKsp: number, cX: number, f: number): number {
  return pKsp + Math.log10((1 - f) * cX);
}

/** State of both salts at a fixed free-cation pAg (closed form for 1:1). */
export function competitiveAtPAg(pAg: number, s1: CompetitiveSalt, s2: CompetitiveSalt): CompetitivePoint {
  const m = Math.pow(10, -pAg);
  const freeX1 = Math.min(s1.cX, Math.pow(10, -s1.pKsp) / m);
  const freeX2 = Math.min(s2.cX, Math.pow(10, -s2.pKsp) / m);
  return { pAg, freeX1, freeX2, p1: s1.cX - freeX1, p2: s2.cX - freeX2 };
}

/** Sweep of pAg (master variable) for the fractional-precipitation curves. */
export function competitiveSweep(
  s1: CompetitiveSalt,
  s2: CompetitiveSalt,
  pAgRange: [number, number],
  points = 500,
): CompetitivePoint[] {
  const [lo, hi] = pAgRange;
  const out: CompetitivePoint[] = [];
  for (let i = 0; i <= points; i++) {
    out.push(competitiveAtPAg(lo + ((hi - lo) * i) / points, s1, s2));
  }
  return out;
}

/**
 * Separation window for fractional precipitation, in pAg terms. The salt
 * needing less M precipitates first; the window runs from the pAg where it
 * reaches `quantFrac` precipitated down to the pAg where the second salt
 * starts. Returns null when the second salt starts before the first is
 * quantitative (no clean separation). `residualFrac` is the free fraction of
 * the first anion remaining when the second salt begins to precipitate —
 * Ksp₁·cX₂/(Ksp₂·cX₁) in closed form for 1:1 salts.
 */
export function separationWindow(
  s1: CompetitiveSalt,
  s2: CompetitiveSalt,
  quantFrac = 0.999,
): { firstIdx: 0 | 1; pAgQuant: number; pAgSecondOnset: number; ok: boolean; residualFrac: number } {
  // Onset pAg is higher for the salt that precipitates first (less M needed).
  const onset1 = pAgAtFraction(s1.pKsp, s1.cX, 0);
  const onset2 = pAgAtFraction(s2.pKsp, s2.cX, 0);
  const firstIdx: 0 | 1 = onset1 >= onset2 ? 0 : 1;
  const first = firstIdx === 0 ? s1 : s2;
  const second = firstIdx === 0 ? s2 : s1;
  const pAgQuant = pAgAtFraction(first.pKsp, first.cX, quantFrac);
  const pAgSecondOnset = pAgAtFraction(second.pKsp, second.cX, 0);
  const residualFrac =
    (Math.pow(10, -first.pKsp) * second.cX) / (Math.pow(10, -second.pKsp) * first.cX);
  return { firstIdx, pAgQuant, pAgSecondOnset, ok: pAgQuant > pAgSecondOnset, residualFrac };
}

/**
 * Full equilibrium for a given TOTAL amount of cation added, by combination
 * testing. Hypotheses in order: both solids, only salt 1, only salt 2, none.
 * Each candidate is solved from its own mass balances; it is accepted iff
 * every dissolved IAP ≤ Ksp and every hypothesized precipitate ≥ 0. Exactly
 * one hypothesis is thermodynamically consistent (Gibbs phase rule for this
 * system), so the first accepted one is the answer.
 */
export function competitiveEquilibrium(
  cMTotal: number,
  s1: CompetitiveSalt,
  s2: CompetitiveSalt,
): CompetitiveEquilibrium {
  const K1 = Math.pow(10, -s1.pKsp);
  const K2 = Math.pow(10, -s2.pKsp);

  // Hypothesis "both": [X1] = K1/[M], [X2] = K2/[M];
  // cM = [M] + P1 + P2 = [M] + (cX1 − K1/[M]) + (cX2 − K2/[M])
  // → [M]² + (cX1 + cX2 − cM)·[M] − (K1 + K2) = 0 (positive root).
  {
    const b = s1.cX + s2.cX - cMTotal;
    const m = (-b + Math.sqrt(b * b + 4 * (K1 + K2))) / 2;
    const freeX1 = K1 / m;
    const freeX2 = K2 / m;
    const p1 = s1.cX - freeX1;
    const p2 = s2.cX - freeX2;
    if (p1 >= 0 && p2 >= 0) {
      return { pAg: -Math.log10(m), freeX1, freeX2, p1, p2, phases: 'ambas' };
    }
  }

  // Hypothesis "only salt i": [Xi] = Ki/[M], the other anion fully dissolved;
  // cM = [M] + (cXi − Ki/[M]) → [M]² + (cXi − cM)·[M] − Ki = 0.
  const onlyOne = (salt: CompetitiveSalt, K: number, other: CompetitiveSalt, Kother: number) => {
    const b = salt.cX - cMTotal;
    const m = (-b + Math.sqrt(b * b + 4 * K)) / 2;
    const freeX = K / m;
    // p from the CATION balance (= cX − freeX analytically): the anion form
    // cancels catastrophically when p ≈ 0 and can flip the hypothesis test.
    const p = cMTotal - m;
    const iapOther = m * other.cX;
    return { m, freeX, p, valid: p >= 0 && iapOther <= Kother };
  };
  {
    const h = onlyOne(s1, K1, s2, K2);
    if (h.valid) {
      return { pAg: -Math.log10(h.m), freeX1: h.freeX, freeX2: s2.cX, p1: h.p, p2: 0, phases: 'sal1' };
    }
  }
  {
    const h = onlyOne(s2, K2, s1, K1);
    if (h.valid) {
      return { pAg: -Math.log10(h.m), freeX1: s1.cX, freeX2: h.freeX, p1: 0, p2: h.p, phases: 'sal2' };
    }
  }

  // Hypothesis "none": all M stays dissolved.
  return {
    pAg: cMTotal > 0 ? -Math.log10(cMTotal) : Infinity,
    freeX1: s1.cX,
    freeX2: s2.cX,
    p1: 0,
    p2: 0,
    phases: 'ninguna',
  };
}
