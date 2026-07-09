// Redox equilibrium using the pe convention: pe = E / 0.05916 V (Sillén).
// pe° = E°/0.05916 always — n is absorbed into pe°, not repeated in the formula.

import { NERNST_S } from './constants';
import { composeAlphas, type SideReactionStack } from './sideReactions';

export { NERNST_S };

export interface RedoxCouple {
  id: string;
  name: string;
  /** Full half-reaction string for display */
  halfReaction: string;
  ox: string;
  red: string;
  /** Standard potential (V vs SHE) */
  E0: number;
  /** Electrons transferred */
  n: number;
  /** Protons in the half-reaction (0 if H⁺ not involved) */
  mH: number;
  reference: string;
  /** Model caveat, if applicable (e.g. polynuclear species) */
  caveat?: string;
}

/** pe° = E°/S — Sillén convention: n is absorbed into pe°, not repeated. */
export function peStandard(E0: number): number {
  return E0 / NERNST_S;
}

/**
 * Conditional pe°' at the working pH: for ox + mH·H⁺ + n·e⁻ → red,
 * pe°' = pe° − (mH/n)·pH. If mH = 0 it is pH-independent.
 */
export function peConditional(couple: RedoxCouple, pH: number): number {
  return peStandard(couple.E0) - (couple.mH / couple.n) * pH;
}

/**
 * Conditional formal potential E°'(pH) with complexation/hydrolysis on BOTH
 * the oxidized and reduced forms (Ringbom-style, reusing composeAlphas — the
 * same α_M mechanism ConstantesCondicionales.tsx already uses for M-Y
 * complexes, applied here per redox state instead of per metal/ligand):
 *
 *   E = E° + (S/n)·log([Ox]_free/[Red]_free), and [X]_free = [X]_total/α_X
 *   ⇒ E°'(total-concentration basis) = E° + (S/n)·log(α_Red/α_Ox)
 *
 * combined multiplicatively with the existing proton term. Each stack is
 * optional; omitting one is equivalent to α=1 (no effect on that form).
 */
export function conditionalEprime(
  couple: Pick<RedoxCouple, 'E0' | 'n' | 'mH'>,
  pH: number,
  oxStack?: SideReactionStack,
  redStack?: SideReactionStack,
): number {
  const base = couple.E0 - NERNST_S * (couple.mH / couple.n) * pH;
  const aOx = oxStack ? composeAlphas(pH, oxStack).alphaM : 1;
  const aRed = redStack ? composeAlphas(pH, redStack).alphaM : 1;
  return base + (NERNST_S / couple.n) * Math.log10(aRed / aOx);
}

/**
 * Alpha fractions of a couple at a given pe (two mononuclear species model):
 * [ox]/[red] = 10^{n(pe − pe°')}.
 */
export function alphaRedox(pe: number, pe0c: number, n: number): { ox: number; red: number } {
  const exp = n * (pe - pe0c);
  if (exp > 30) return { ox: 1, red: Math.pow(10, -exp) };
  if (exp < -30) return { ox: Math.pow(10, exp), red: 1 };
  const r = Math.pow(10, exp);
  return { ox: r / (1 + r), red: 1 / (1 + r) };
}

export interface RedoxTitrationParams {
  /** Analyte couple */
  analyte: RedoxCouple;
  /** Titrant couple */
  titrant: RedoxCouple;
  /**
   * 'oxidante': analyte starts reduced, titrant is added oxidized (oxidimetry).
   * 'reductor': analyte starts oxidized, titrant is added reduced (reductimetry).
   */
  direction?: 'oxidante' | 'reductor';
  /** Buffered pH of the medium */
  pH: number;
  cAnalyte: number;
  vAnalyte: number;
  cTitrant: number;
  vMax: number;
  points?: number;
}

export interface RedoxCurve {
  volumes: number[];
  pes: number[];
  Es: number[];
  vEq: number;
  peEq: number;
  EEq: number;
  /** log K of the balanced titration reaction */
  logK: number;
  pe0cAnalyte: number;
  pe0cTitrant: number;
}

/**
 * Redox titration curve solved by exact ELECTRON BALANCE:
 * electrons released by the oxidized species equal those accepted
 * by the reduced species. For oxidimetry:
 *   f(pe) = n_a·N_a·α_ox,a(pe) − n_t·N_t·α_red,t(pe) = 0
 * (roles are reversed for reductimetry). f is strictly monotone in pe → robust bisection.
 * n_a ≠ n_t stoichiometry is handled automatically (V_eq = n_a·C_a·V_a / (n_t·C_t)).
 */
export function redoxTitrationCurve(params: RedoxTitrationParams): RedoxCurve {
  const { analyte, titrant, pH, cAnalyte, vAnalyte, cTitrant, vMax, direction = 'oxidante' } = params;
  const points = params.points ?? 500;
  const pe0a = peConditional(analyte, pH);
  const pe0t = peConditional(titrant, pH);

  const solvePe = (nA: number, nT: number): number => {
    // nA, nT in moles; bisection on the electron balance.
    // f is increasing in pe in both directions due to the sign convention.
    const f = (pe: number): number => {
      if (direction === 'oxidante') {
        return analyte.n * nA * alphaRedox(pe, pe0a, analyte.n).ox -
               titrant.n * nT * alphaRedox(pe, pe0t, titrant.n).red;
      }
      return titrant.n * nT * alphaRedox(pe, pe0t, titrant.n).ox -
             analyte.n * nA * alphaRedox(pe, pe0a, analyte.n).red;
    };
    let lo = -40;
    let hi = 45;
    const fLo = f(lo);
    const fHi = f(hi);
    if (fLo * fHi > 0) return fLo > 0 ? hi : lo;
    for (let i = 0; i < 90; i++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  const vEq = (analyte.n * cAnalyte * vAnalyte) / (titrant.n * cTitrant);
  const volumes: number[] = [];
  const pes: number[] = [];
  const Es: number[] = [];

  for (let i = 0; i <= points; i++) {
    const v = (vMax * i) / points;
    const pe = solvePe(cAnalyte * vAnalyte, cTitrant * v);
    volumes.push(v);
    pes.push(pe);
    Es.push(pe * NERNST_S);
  }

  const peEq = solvePe(cAnalyte * vAnalyte, cTitrant * vEq);

  // Balanced reaction: transfers n_a·n_t electrons; in reductimetry the analyte is
  // the oxidant, so the sign is flipped.
  const logK = direction === 'oxidante'
    ? analyte.n * titrant.n * (pe0t - pe0a)
    : analyte.n * titrant.n * (pe0a - pe0t);

  return {
    volumes, pes, Es, vEq,
    peEq, EEq: peEq * NERNST_S,
    logK,
    pe0cAnalyte: pe0a,
    pe0cTitrant: pe0t,
  };
}
