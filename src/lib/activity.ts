// Ionic activity and extended Debye-Hückel equation (25 °C).

import { PKW } from './constants';

/** Ionic strength I = ½ Σ cᵢ zᵢ² (M). */
export function ionicStrength(ions: { c: number; z: number }[]): number {
  return 0.5 * ions.reduce((s, { c, z }) => s + c * z * z, 0);
}

/**
 * log₁₀ γ for an ion with charge z (extended Debye-Hückel).
 * log γ = −A z² √I / (1 + B a √I)
 * A ≈ 0.51, B ≈ 0.33 Å⁻¹·M⁻½, a ≈ 3 Å (effective radius).
 */
export function logActivityCoefficient(z: number, I: number, a = 3): number {
  if (I <= 0) return 0;
  const sqrtI = Math.sqrt(I);
  const A = 0.51;
  const B = 0.33;
  return (-A * z * z * sqrtI) / (1 + B * a * sqrtI);
}

export function activityCoefficient(z: number, I: number, a = 3): number {
  return Math.pow(10, logActivityCoefficient(z, I, a));
}

/**
 * Davies equation (25 °C): log γ = −A z² (√I/(1+√I) − 0.3·I), A ≈ 0.51.
 * No ion-size parameter; the empirical −0.3·I term keeps it usable to
 * I ≈ 0.5 M, where fixed-a extended Debye-Hückel already fails.
 * Source: Davies 1962; Stumm & Morgan §3.4; same form used by Spana/HALTAFALL.
 */
export function logGammaDavies(z: number, I: number): number {
  if (I <= 0) return 0;
  const sqrtI = Math.sqrt(I);
  return -0.51 * z * z * (sqrtI / (1 + sqrtI) - 0.3 * I);
}

export function gammaDavies(z: number, I: number): number {
  return Math.pow(10, logGammaDavies(z, I));
}

/**
 * Güntelberg approximation: log γ = −0.5 z² √I/(1+√I) — the simplified
 * convention (A = 0.5, B·a = 1) many courses and older texts use. Kept as an
 * explicit model so results can be reproduced against that convention
 * (e.g. γ = 0.241 for z = 2 at I = 0.2, vs 0.233 with extended D-H a = 3 Å).
 */
export function logGammaGuntelberg(z: number, I: number): number {
  if (I <= 0) return 0;
  const sqrtI = Math.sqrt(I);
  return (-0.5 * z * z * sqrtI) / (1 + sqrtI);
}

export function gammaGuntelberg(z: number, I: number): number {
  return Math.pow(10, logGammaGuntelberg(z, I));
}

/** Kielland ion-size parameters a (Å) for extended Debye-Hückel.
 * Subset of Kielland 1937 as tabulated in Harris QCA (table 8-1). */
export const ION_SIZES: { label: string; z: number; a: number }[] = [
  { label: 'H⁺', z: 1, a: 9 },
  { label: 'Li⁺', z: 1, a: 6 },
  { label: 'Na⁺', z: 1, a: 4.5 },
  { label: 'K⁺ / Cl⁻ / NO₃⁻', z: 1, a: 3 },
  { label: 'NH₄⁺ / Ag⁺', z: 1, a: 2.5 },
  { label: 'OH⁻ / F⁻', z: 1, a: 3.5 },
  { label: 'CH₃COO⁻', z: 1, a: 4.5 },
  { label: 'HCO₃⁻', z: 1, a: 4.5 },
  { label: 'Mg²⁺', z: 2, a: 8 },
  { label: 'Ca²⁺ / Fe²⁺ / Zn²⁺ / Cu²⁺', z: 2, a: 6 },
  { label: 'Ba²⁺ / Cd²⁺', z: 2, a: 5 },
  { label: 'Pb²⁺ / CO₃²⁻', z: 2, a: 4.5 },
  { label: 'SO₄²⁻ / HPO₄²⁻', z: 2, a: 4 },
  { label: 'Fe³⁺ / Al³⁺ / Cr³⁺', z: 3, a: 9 },
  { label: 'PO₄³⁻ / Fe(CN)₆³⁻', z: 3, a: 4 },
];

/**
 * Activity-corrected overall formation constants (concentration basis).
 * β°ᵢ = a_MLᵢ/(a_M·a_Lⁱ) is thermodynamic, so the concentration quotient is
 * β′ᵢ = β°ᵢ·γ_M·γ_Lⁱ/γ_MLᵢ → log β′ᵢ = log β°ᵢ + log γ_M + i·log γ_L − log γ_MLᵢ,
 * with z(MLᵢ) = zM + i·zL. For oppositely charged ions the free-ion γ product
 * outweighs γ_ML (charge cancellation), so β′ < β° at I > 0 — the ionic
 * atmosphere stabilizes the free ions more than the complex.
 * Extended Debye-Hückel (a = 3 Å), consistent with the engine-side pKsp
 * corrections in conditional.ts/sideReactions.ts. A neutral ligand (zL = 0)
 * with i·zL = 0 gives zero correction, as it should in a z-only γ model.
 * For a single reaction M + Y ⇌ MY pass [logKf] and take element 0.
 */
export function correctedLogBetas(logBetas: number[], zM: number, zL: number, I: number): number[] {
  if (I <= 0) return [...logBetas];
  return logBetas.map((b, idx) => {
    const i = idx + 1;
    return b
      + logActivityCoefficient(Math.abs(zM), I)
      + i * logActivityCoefficient(Math.abs(zL), I)
      - logActivityCoefficient(Math.abs(zM + i * zL), I);
  });
}

/**
 * Shared model selector for callers that let the user pick which γ
 * convention to apply (Actividad's own picker, and any engine-side
 * correction that wants the same choice — e.g. charge-balance pH solving,
 * Ksp corrections). 'kielland' is intentionally excluded here: it needs a
 * per-ion size `a`, which only makes sense against a fixed named-ion table
 * (ION_SIZES) — not a generic z for an arbitrary user-typed species.
 */
export type GammaModel = 'dh' | 'davies' | 'guntelberg';

export function gammaOf(model: GammaModel, z: number, I: number): number {
  if (model === 'davies') return gammaDavies(z, I);
  if (model === 'guntelberg') return gammaGuntelberg(z, I);
  return activityCoefficient(z, I);
}

export function logGammaOf(model: GammaModel, z: number, I: number): number {
  if (model === 'davies') return logGammaDavies(z, I);
  if (model === 'guntelberg') return logGammaGuntelberg(z, I);
  return logActivityCoefficient(z, I);
}

/** Effective pH from a_H (activity). */
export function pHFromActivity(aH: number): number {
  return -Math.log10(Math.max(aH, 1e-30));
}

/** a_H from pH and γ_H. */
export function hydrogenActivity(pH: number, gammaH = 1): number {
  return gammaH * Math.pow(10, -pH);
}

/**
 * Apparent pKw with activity correction: Kw = a_H·a_OH = [H⁺]γ_H·[OH⁻]γ_OH is
 * constant, so the concentration product [H⁺][OH⁻] = Kw/(γ_H·γ_OH) grows as
 * γ < 1 (higher ionic strength) → pKw′ = pKw + log(γ_H·γ_OH) (pKw′ < pKw).
 */
export function apparentPKw(gammaH: number, gammaOH: number): number {
  return PKW + Math.log10(gammaH * gammaOH);
}
