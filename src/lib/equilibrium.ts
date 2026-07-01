// Chemical equilibrium engine: alpha fractions and pH solver via charge balance.

import { KW } from './constants';

export { KW };

/**
 * An acid-base component: the fully protonated form HnA with charge z0
 * and its successive acid dissociation constants (pKa1 < pKa2 < ...).
 * Examples: H3PO4 → z0 = 0, pKas [2.15, 7.20, 12.35]
 *           NH4+  → z0 = +1, pKas [9.25]
 */
export interface AcidBaseComponent {
  /** Total analytical concentration (mol/L) */
  c: number;
  /** Charge of the fully protonated species */
  z0: number;
  /** Successive pKas in ascending order */
  pKas: number[];
}

/**
 * Alpha distribution fractions for an HnA system with given Ka values.
 * alpha[0] = fully protonated form, alpha[n] = fully deprotonated.
 */
export function alphaFractions(h: number, pKas: number[]): number[] {
  const n = pKas.length;
  // term i = [H+]^(n-i) * Ka1*...*Kai ; computed in log-space to avoid overflow
  const logH = Math.log10(h);
  const logTerms: number[] = [];
  let cumLogKa = 0;
  for (let i = 0; i <= n; i++) {
    if (i > 0) cumLogKa += -pKas[i - 1];
    logTerms.push((n - i) * logH + cumLogKa);
  }
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const denom = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / denom);
}

/**
 * Charge balance of a mixture at a given pH.
 * extraCations/extraAnions: concentrations of strong spectator ions (Na+, Cl-).
 * Returns net charge; the root f(pH) = 0 is the equilibrium pH.
 */
export function chargeBalance(
  pH: number,
  components: AcidBaseComponent[],
  extraCations = 0,
  extraAnions = 0,
): number {
  const h = Math.pow(10, -pH);
  const oh = KW / h;
  let net = h - oh + extraCations - extraAnions;
  for (const comp of components) {
    if (comp.c <= 0) continue;
    const alphas = alphaFractions(h, comp.pKas);
    let weighted = 0;
    for (let i = 0; i < alphas.length; i++) {
      weighted += alphas[i] * (comp.z0 - i);
    }
    net += comp.c * weighted;
  }
  return net;
}

/**
 * Solves the pH of a mixture by bisection on the charge balance.
 * f(pH) is strictly decreasing in pH, so bisection is robust.
 */
export function solvePH(
  components: AcidBaseComponent[],
  extraCations = 0,
  extraAnions = 0,
): number {
  let lo = -2;
  let hi = 16;
  const fLo = chargeBalance(lo, components, extraCations, extraAnions);
  const fHi = chargeBalance(hi, components, extraCations, extraAnions);
  if (fLo <= 0) return lo;
  if (fHi >= 0) return hi;
  if (fLo * fHi > 0) return NaN;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const f = chargeBalance(mid, components, extraCations, extraAnions);
    if (f > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
