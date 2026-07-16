// Acid-base titration curves by exact charge balance.
// The analyte may be an acid or a base; the strong titrant may be basic (NaOH)
// or acidic (HCl) — all four combinations are valid.

import { solvePH, saltCounterIons, defaultStartIndex, type AcidBaseComponent } from './equilibrium';
import type { GammaModel } from './activity';

export type { GammaModel };

export interface TitrationParams {
  /** Analyte system (any HnA/B with pKas) */
  analyte: {
    z0: number;
    pKas: number[];
    kind?: 'equilibrium' | 'strong-acid' | 'strong-base';
    /** Prepared ladder species; 0 is fully protonated. */
    startIndex?: number;
    /** Ladder species reached at the final formal equivalence. */
    endIndex?: number;
    /** Initial formal composition over the ladder; normalized internally. */
    initialFractions?: number[];
  };
  /** true: strong titrant is HCl; false: NaOH */
  titrantIsAcid: boolean;
  /** Analyte concentration (M) */
  cAnalyte: number;
  /** Initial analyte volume (mL) */
  vAnalyte: number;
  /** Strong titrant concentration (M) */
  cTitrant: number;
  /** Maximum titrant volume (mL) */
  vMax: number;
  /** Number of curve points */
  points?: number;
  /** Ionic strength for Debye–Hückel/Davies/Güntelberg correction (0 = ideal) */
  I?: number;
  /** Activity model at I > 0 (default extended D-H, unchanged from before this param existed) */
  model?: GammaModel;
  /** Solvent autoionization constant and acidity domain (water defaults preserved). */
  pKw?: number;
  pHRange?: [number, number];
}

export interface TitrationCurve {
  volumes: number[];
  pHs: number[];
  /** Theoretical equivalence volume for each titratable proton (mL) */
  equivalenceVolumes: number[];
}

/** Number of formal acid-base steps represented by the ladder. */
export function titratableProtons(pKas: number[]): number {
  return Math.max(pKas.length, 1);
}

function validLadderIndex(value: number | undefined, fallback: number, length: number): number {
  return Number.isInteger(value) && value! >= 0 && value! <= length ? value! : fallback;
}

/** Formal equivalents between two explicitly selected ladder species. */
export function formalEquivalents(startIndex: number, endIndex: number): number {
  return Math.abs(endIndex - startIndex);
}

function normalizedInitialFractions(values: number[] | undefined, length: number): number[] | null {
  if (!values || values.length !== length || values.some((v) => !Number.isFinite(v) || v < 0)) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum > 0 ? values.map((v) => v / sum) : null;
}

/**
 * pH vs. volume curve. The titrant enters the charge balance as a spectator ion
 * (Na⁺ from NaOH or Cl⁻ from HCl); pH is solved exactly at each point with
 * dilution included at every point.
 */
export function titrationCurve(params: TitrationParams): TitrationCurve {
  const { analyte, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax, I = 0, model = 'dh', pKw = 14, pHRange = [-2, pKw + 2] } = params;
  const points = params.points ?? 600;
  const volumes: number[] = [];
  const pHs: number[] = [];

  // Same counter-ion accounting as AcidoBase.tsx's "pH disolución pura" —
  // see saltCounterIons/defaultStartIndex in equilibrium.ts. z0/pKas are
  // fixed for the whole curve, so the ratio is computed once outside the loop.
  const defaultStart = defaultStartIndex(analyte.z0, analyte.pKas.length);
  const startIndex = validLadderIndex(analyte.startIndex, defaultStart, analyte.pKas.length);
  const defaultEnd = titrantIsAcid ? 0 : analyte.pKas.length;
  const endIndex = validLadderIndex(analyte.endIndex, defaultEnd, analyte.pKas.length);
  const initialFractions = normalizedInitialFractions(analyte.initialFractions, analyte.pKas.length + 1);
  const analyteIons = initialFractions
    ? initialFractions.reduce((ions, fraction, index) => {
        const salt = saltCounterIons(analyte.z0, index);
        ions.cations += fraction * salt.cations;
        ions.anions += fraction * salt.anions;
        return ions;
      }, { cations: 0, anions: 0 })
    : saltCounterIons(analyte.z0, startIndex);

  for (let i = 0; i <= points; i++) {
    const vb = (vMax * i) / points;
    const vTotal = vAnalyte + vb;
    const analyteConc = (cAnalyte * vAnalyte) / vTotal;
    const components: AcidBaseComponent[] = [];
    let extraCations = 0;
    let extraAnions = 0;
    if (analyte.kind === 'strong-acid') {
      extraAnions += analyteConc;
    } else if (analyte.kind === 'strong-base') {
      extraCations += analyteConc;
    } else {
      components.push({ c: analyteConc, z0: analyte.z0, pKas: analyte.pKas });
      extraCations += analyteIons.cations * analyteConc;
      extraAnions += analyteIons.anions * analyteConc;
    }
    const titrantConc = (cTitrant * vb) / vTotal;
    if (titrantIsAcid) extraAnions += titrantConc;
    else extraCations += titrantConc;
    const pH = solvePH(components, extraCations, extraAnions, I, model, pKw, pHRange);
    volumes.push(vb);
    pHs.push(pH);
  }

  const initialMeanIndex = initialFractions
    ? initialFractions.reduce((mean, fraction, index) => mean + fraction * index, 0)
    : startIndex;
  const nProtons = analyte.kind === 'strong-acid' || analyte.kind === 'strong-base'
    ? 1
    : Math.abs(endIndex - initialMeanIndex);
  const equivalenceVolumes: number[] = [];
  const wholeSteps = Math.floor(nProtons + 1e-12);
  const firstFraction = nProtons - wholeSteps;
  const offsets = firstFraction > 1e-12
    ? [firstFraction, ...Array.from({ length: wholeSteps }, (_, i) => firstFraction + i + 1)]
    : Array.from({ length: wholeSteps }, (_, i) => i + 1);
  for (const equivalents of offsets) {
    const veq = (equivalents * cAnalyte * vAnalyte) / cTitrant;
    if (veq <= vMax) equivalenceVolumes.push(veq);
  }

  return { volumes, pHs, equivalenceVolumes };
}

/** Numerical first derivative dpH/dV (centered differences) */
export function firstDerivative(volumes: number[], pHs: number[]): { v: number[]; d: number[] } {
  const v: number[] = [];
  const d: number[] = [];
  for (let i = 1; i < volumes.length - 1; i++) {
    const dv = volumes[i + 1] - volumes[i - 1];
    if (dv === 0) continue;
    v.push(volumes[i]);
    d.push((pHs[i + 1] - pHs[i - 1]) / dv);
  }
  return { v, d };
}

/** Second derivative — applies centered differences twice. */
export function secondDerivative(volumes: number[], ys: number[]): { v: number[]; d: number[] } {
  const first = firstDerivative(volumes, ys);
  return firstDerivative(first.v, first.d);
}

/**
 * Linearised Gran function for higher-precision V_eq detection.
 * The pre-equivalence signal follows the analyte side: H⁺ with base titrant,
 * OH⁻ with acid titrant. Weak systems use V·signal; strong systems use
 * (V₀+V)·signal. F₂ uses the opposite excess-ion signal after equivalence.
 * Each segment is linear; its x-intercept extrapolation gives V_eq.
 */
export function granPlot(
  volumes: number[],
  pHs: number[],
  vAnalyte: number,
  titrantIsAcid = false,
  pKw = 14,
  weakAnalyte = false,
): { v1: number[]; F1: number[]; v2: number[]; F2: number[] } {
  const v1: number[] = [], F1: number[] = [];
  const v2: number[] = [], F2: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    const pH = pHs[i];
    const V = volumes[i];
    if (!Number.isFinite(pH)) continue;
    const pHc = Math.min(pKw, Math.max(0, pH));
    const Vtot = vAnalyte + V;
    const hSignal = Math.pow(10, -pHc);
    const ohSignal = Math.pow(10, pHc - pKw);
    const preMultiplier = weakAnalyte ? V : Vtot;
    v1.push(V);
    F1.push(preMultiplier * (titrantIsAcid ? ohSignal : hSignal));
    v2.push(V);
    F2.push(Vtot * (titrantIsAcid ? hSignal : ohSignal));
  }
  return { v1, F1, v2, F2 };
}

/** Least-squares linear fit for points (x, y). Returns { m, b } of y = m·x + b, or null if degenerate. */
function linearFit(xs: number[], ys: number[]): { m: number; b: number } | null {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-30) return null;
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return { m, b };
}

/**
 * V_eq from linear extrapolation of the direction-specific Gran F₁ function.
 * Fits the linear descending segment near equivalence (F₁ between 0.5 % and 60 %
 * of its maximum) and extrapolates to F₁ = 0. Returns NaN if the usable arm is
 * too short.
 */
export function granVeq(
  volumes: number[],
  pHs: number[],
  vAnalyte: number,
  titrantIsAcid = false,
  pKw = 14,
  weakAnalyte = false,
): number {
  const { v1, F1 } = granPlot(volumes, pHs, vAnalyte, titrantIsAcid, pKw, weakAnalyte);
  const Fmax = Math.max(...F1, 0);
  if (Fmax <= 0) return NaN;
  const peakIndex = F1.indexOf(Fmax);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = Math.max(peakIndex, 0); i < v1.length; i++) {
    if (F1[i] <= 0.6 * Fmax && F1[i] >= 0.005 * Fmax) {
      xs.push(v1[i]);
      ys.push(F1[i]);
    }
  }
  const fit = linearFit(xs, ys);
  if (!fit || Math.abs(fit.m) < 1e-30) return NaN;
  return -fit.b / fit.m;
}

/**
 * Quantitativity q% = (1 − ε/Co)·100, where ε is the effective molar concentration
 * of the limiting species at the equivalence point and Co is the analytical
 * concentration (diluted) at that point. q → 100 % means complete reaction.
 */
export function quantitativity(epsLimiting: number, cAtEquivalence: number): number {
  if (cAtEquivalence <= 0) return NaN;
  return (1 - epsLimiting / cAtEquivalence) * 100;
}

/** Residual analyte-side species at equivalence from the titration direction. */
export function equivalenceResidual(pH: number, titrantIsAcid: boolean, pKw = 14): number {
  return titrantIsAcid ? Math.pow(10, -pH) : Math.pow(10, pH - pKw);
}
