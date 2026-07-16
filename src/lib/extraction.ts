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
  /** Global log beta values for aqueous M(OH)_i side reactions. */
  logBetasMetalOH?: number[];
  /** First value penalizes protonated chelator; second penalizes deprotonated chelator. */
  chelatorPKas?: number[];
  /** Organic/aqueous partition factor entering the protonated-chelator branch. */
  chelatorPartitionRatio?: number;
}

export function chelateSideReactionAlphas(
  a: AnalyteState,
  pH: number,
): { alphaMetal: number; alphaChelator: number } {
  const alphaMetal = 1 + (a.logBetasMetalOH ?? []).reduce((sum, logBeta, index) => {
    const stoich = index + 1;
    return sum + Math.pow(10, logBeta + stoich * (pH - 14));
  }, 0);
  const [pKaAcid, pKaBase] = a.chelatorPKas ?? [];
  const alphaAcid = Number.isFinite(pKaAcid)
    ? Math.max(a.chelatorPartitionRatio ?? 1, 0) * Math.pow(10, pKaAcid - pH)
    : 0;
  const alphaBase = Number.isFinite(pKaBase) ? Math.pow(10, pH - pKaBase) : 0;
  return { alphaMetal, alphaChelator: 1 + alphaAcid + alphaBase };
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
    const { alphaMetal, alphaChelator } = chelateSideReactionAlphas(a, pH);
    const logKConditional = conditionalChelateLogK({
      logKEx: a.logKd,
      alphaMetal,
      alphaChelator,
      stoichChelator: a.n,
    });
    return Math.pow(10, logKConditional + a.n * a.logCHL + a.n * pH);
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

export interface ChelateConditionalParams {
  logKEx: number;
  alphaMetal: number;
  alphaChelator: number;
  stoichChelator: number;
}

/** Full conditional extraction constant for M + nL ⇌ ML_n. */
export function conditionalChelateLogK(params: ChelateConditionalParams): number {
  return params.logKEx
    - Math.log10(Math.max(params.alphaMetal, 1e-300))
    - params.stoichChelator * Math.log10(Math.max(params.alphaChelator, 1e-300));
}

export interface SequentialExtractionAnalyte {
  label: string;
  initialMoles: number;
  state: AnalyteState;
}

export interface SequentialExtractionStage {
  pH: number;
  aqueousVolume: number;
  organicVolume: number;
  /** Phase retained as feed for the following stage. */
  continuePhase: 'aqueous' | 'organic';
}

export interface SequentialExtractionResult {
  currentPhase: 'aqueous' | 'organic';
  currentMoles: number[];
  collected: { phase: 'aqueous' | 'organic'; moles: number[] }[];
  massError: number[];
}

/** Sequential extraction/back-extraction with explicit phase routing and mole conservation. */
export function sequentialExtraction(
  analytes: SequentialExtractionAnalyte[],
  stages: SequentialExtractionStage[],
): SequentialExtractionResult {
  let currentPhase: 'aqueous' | 'organic' = 'aqueous';
  let currentMoles = analytes.map((analyte) => Math.max(analyte.initialMoles, 0));
  const collected: SequentialExtractionResult['collected'] = [];

  for (const stage of stages) {
    const aqueous: number[] = [];
    const organic: number[] = [];
    analytes.forEach((analyte, index) => {
      const total = currentMoles[index];
      const d = Math.max(distributionD(analyte.state, stage.pH), 0);
      const denom = stage.aqueousVolume + d * stage.organicVolume;
      const nOrganic = denom > 0 ? total * d * stage.organicVolume / denom : 0;
      organic.push(nOrganic);
      aqueous.push(total - nOrganic);
    });
    const removedPhase = stage.continuePhase === 'aqueous' ? 'organic' : 'aqueous';
    collected.push({ phase: removedPhase, moles: removedPhase === 'organic' ? organic : aqueous });
    currentPhase = stage.continuePhase;
    currentMoles = currentPhase === 'organic' ? organic : aqueous;
  }

  const massError = analytes.map((analyte, index) => {
    const recovered = currentMoles[index]
      + collected.reduce((sum, phase) => sum + phase.moles[index], 0);
    return recovered - Math.max(analyte.initialMoles, 0);
  });
  return { currentPhase, currentMoles, collected, massError };
}
