// Acid-base titration curves by exact charge balance.
// The analyte may be an acid or a base; the strong titrant may be basic (NaOH)
// or acidic (HCl) — all four combinations are valid.

import { solvePH, type AcidBaseComponent } from './equilibrium';

export interface TitrationParams {
  /** Analyte system (any HnA/B with pKas) */
  analyte: {
    z0: number;
    pKas: number[];
    kind?: 'equilibrium' | 'strong-acid' | 'strong-base';
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
}

export interface TitrationCurve {
  volumes: number[];
  pHs: number[];
  /** Theoretical equivalence volume for each titratable proton (mL) */
  equivalenceVolumes: number[];
}

/** Titratable protons with a basic or acidic titrant (pKa in the useful window). */
export function titratableProtons(pKas: number[]): number {
  return Math.max(pKas.filter((pk) => pk > 0 && pk < 14).length, 1);
}

/**
 * pH vs. volume curve. The titrant enters the charge balance as a spectator ion
 * (Na⁺ from NaOH or Cl⁻ from HCl); pH is solved exactly at each point with
 * dilution included (lesson from audit P0-5).
 */
export function titrationCurve(params: TitrationParams): TitrationCurve {
  const { analyte, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax } = params;
  const points = params.points ?? 600;
  const volumes: number[] = [];
  const pHs: number[] = [];

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
    }
    const titrantConc = (cTitrant * vb) / vTotal;
    if (titrantIsAcid) extraAnions += titrantConc;
    else extraCations += titrantConc;
    const pH = solvePH(components, extraCations, extraAnions);
    volumes.push(vb);
    pHs.push(pH);
  }

  const nProtons = analyte.kind === 'strong-acid' || analyte.kind === 'strong-base'
    ? 1
    : titratableProtons(analyte.pKas);
  const equivalenceVolumes: number[] = [];
  for (let k = 1; k <= nProtons; k++) {
    const veq = (k * cAnalyte * vAnalyte) / cTitrant;
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
 * Before EP:  F₁ = (V₀ + V) · 10^−pH  (proportional to total [H⁺])
 * After EP:   F₂ = (V₀ + V) · 10^(pH − 14)  (proportional to excess [OH⁻])
 * Each segment is linear; its x-intercept extrapolation gives V_eq.
 */
export function granPlot(
  volumes: number[],
  pHs: number[],
  vAnalyte: number,
): { v1: number[]; F1: number[]; v2: number[]; F2: number[] } {
  const v1: number[] = [], F1: number[] = [];
  const v2: number[] = [], F2: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    const pH = pHs[i];
    const V = volumes[i];
    if (!Number.isFinite(pH)) continue;
    const pHc = Math.min(14, Math.max(0, pH)); // numerical clamp
    const Vtot = vAnalyte + V;
    v1.push(V);
    F1.push(Vtot * Math.pow(10, -pHc));
    v2.push(V);
    F2.push(Vtot * Math.pow(10, pHc - 14));
  }
  return { v1, F1, v2, F2 };
}
