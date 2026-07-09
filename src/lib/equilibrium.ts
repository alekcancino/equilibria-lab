// Chemical equilibrium engine: alpha fractions and pH solver via charge balance.

import { KW } from './constants';
import { activityCoefficient, logActivityCoefficient, apparentPKw } from './activity';

export { KW };

/**
 * Apparent pKas in concentration units at ionic strength I.
 * For each dissociation step i: HA^(z0-i) ⇌ H⁺ + A^(z0-i-1)
 * pKa_i,app = pKa_i + log(γ_donor) - log(γ_acceptor) - log(γ_H)
 */
function correctedPKas(pKas: number[], z0: number, I: number): number[] {
  return pKas.map((pKa, i) => {
    const zDonor = z0 - i;
    const zAcceptor = z0 - i - 1;
    const shift = logActivityCoefficient(Math.abs(zDonor), I)
      - logActivityCoefficient(Math.abs(zAcceptor), I)
      - logActivityCoefficient(1, I);
    return pKa + shift;
  });
}

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
 * Charge balance of a mixture at a given pH (activity pH = −log a_H).
 * extraCations/extraAnions: concentrations of strong spectator ions (Na+, Cl-).
 * I: ionic strength for Debye–Hückel correction (0 = ideal, γ = 1).
 * Returns net charge; the root f(pH) = 0 is the equilibrium pH.
 */
export function chargeBalance(
  pH: number,
  components: AcidBaseComponent[],
  extraCations = 0,
  extraAnions = 0,
  I = 0,
): number {
  const gammaH  = activityCoefficient(1, I);
  const gammaOH = activityCoefficient(1, I);
  // [H+] concentration from activity pH: a_H = γH · [H+]
  const h = Math.pow(10, -pH) / gammaH;
  // [OH-] from apparent Kw: [H+][OH-] = Kw / (γH · γOH)
  const kwApp = Math.pow(10, -apparentPKw(gammaH, gammaOH));
  const oh = kwApp / h;
  let net = h - oh + extraCations - extraAnions;
  for (const comp of components) {
    if (comp.c <= 0) continue;
    const pKas = I > 0 ? correctedPKas(comp.pKas, comp.z0, I) : comp.pKas;
    const alphas = alphaFractions(h, pKas);
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
 * I: ionic strength for Debye–Hückel correction (0 = ideal).
 */
export function solvePH(
  components: AcidBaseComponent[],
  extraCations = 0,
  extraAnions = 0,
  I = 0,
): number {
  let lo = -2;
  let hi = 16;
  const fLo = chargeBalance(lo, components, extraCations, extraAnions, I);
  const fHi = chargeBalance(hi, components, extraCations, extraAnions, I);
  if (fLo <= 0) return lo;
  if (fHi >= 0) return hi;
  if (fLo * fHi > 0) return NaN;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const f = chargeBalance(mid, components, extraCations, extraAnions, I);
    if (f > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Counter-ions needed to prepare the species at ladder index `startIndex` of
 * an M(z0, pKas) system (0 = fully protonated, charge z0; pKas.length = least
 * protonated species, charge z0−pKas.length) as an electrically-neutral salt:
 * a species with residual positive charge was dissolved with that many
 * inert anions (Cl⁻, NO₃⁻…); negative charge, that many inert cations (Na⁺…);
 * charge exactly 0 needs none (the "free" neutral acid or base form).
 *
 * This single formula covers every case without branching on the sign of z0:
 * a neutral acid (z0=0, index 0), a protonatable base (0<z0≤pKas.length,
 * index=z0 is the free base), and an aqua-acid cation that never reaches a
 * neutral species within its modeled pKas (z0>pKas.length, e.g. Fe³⁺ — every
 * reachable index still carries residual positive charge).
 */
export function saltCounterIons(z0: number, startIndex: number): { cations: number; anions: number } {
  const charge = z0 - startIndex;
  return charge < 0 ? { cations: -charge, anions: 0 } : { cations: 0, anions: charge };
}

/**
 * Sensible default starting ladder index: the neutral species when the
 * ladder reaches one (z0 ≤ pKas.length — ordinary acids/bases dissolve
 * "bare", no counter-ion), otherwise the fully-protonated original ion
 * (aqua-acid cations, which never reach neutral — e.g. Fe³⁺ itself, the
 * most intuitive starting point, rather than an already-hydrolyzed form).
 */
export function defaultStartIndex(z0: number, pKasLength: number): number {
  return z0 <= pKasLength ? z0 : 0;
}
