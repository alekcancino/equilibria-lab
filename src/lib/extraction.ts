// Liquid–liquid extraction: distribution coefficient D and %E formulas.
//
//   Acids:    D = Kd · α_neutral(pH)         (optional organic-phase dimer)
//   Chelates: D = K_ex · [HL]_org^n · 10^(n·pH)   — general n:1 metal:ligand
//             stoichiometry (M^n+ + n HL(org) ⇌ MLn(org) + n H+)
//   %E = 100 · D·r / (D·r + 1)   where r = Vorg/Vaq
//   For n successive extractions: %Eₙ = 100 · (1 − (1/(1+D·r))^n)
//
// Source: Harris QCA ch. 23; Skoog, Principles of Analytical Chemistry.

import { alphaFractions } from './equilibrium';

export interface AnalyteState {
  label: string;
  type: 'acid' | 'chelate';
  logKd: number;
  pKas: number[];
  neutralIdx: number;
  /** Chelate: metal charge / ligand stoichiometry (MLₙ). */
  n: number;
  /** Chelate: log[HL]_org, chelating agent concentration in the organic phase. */
  logCHL: number;
}

/**
 * Conditional distribution coefficient D at a given pH.
 * Chelates: log D = log K_ex + n·log[HL]_org + n·pH — slope n in log D vs pH,
 * generalizing the classic n=2 (Cu²⁺, Zn²⁺) / n=3 (Fe³⁺) chelate cases.
 * Acids: D = Kd·α_neutral, optionally boosted by an organic-phase dimer
 * (2 HA(org) ⇌ (HA)₂(org)) that shifts the log D maximum.
 */
export function distributionD(
  a: AnalyteState,
  pH: number,
  dimer?: { enabled: boolean; logK2: number },
): number {
  if (a.type === 'chelate') {
    return Math.pow(10, a.logKd + a.n * a.logCHL + a.n * pH);
  }
  const Kd = Math.pow(10, a.logKd);
  if (a.pKas.length === 0) return Kd;
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, a.pKas);
  const aN = alphas[Math.min(a.neutralIdx, alphas.length - 1)] ?? 0;
  const Dmono = Kd * aN;
  if (dimer?.enabled && a.type === 'acid') {
    const K2 = Math.pow(10, dimer.logK2);
    return Dmono * (1 + K2 * aN * aN);
  }
  return Dmono;
}

/** %E in a single extraction. r = Vorg/Vaq. */
export function percentE1(D: number, r: number): number {
  return (100 * D * r) / (D * r + 1);
}

/** Cumulative %E after `count` equal successive extractions. */
export function percentEn(D: number, r: number, count: number): number {
  if (D <= 0) return 0;
  const remaining = Math.pow(1 / (1 + D * r), count);
  return 100 * (1 - remaining);
}

/** Minimum number of extractions for %E ≥ target. */
export function nFor(D: number, r: number, target: number): number | null {
  if (D <= 0) return null;
  const base = 1 / (1 + D * r);
  if (base <= 0) return 1;
  const count = Math.ceil(Math.log(1 - target / 100) / Math.log(base));
  return count > 0 && count <= 100 ? count : null;
}
