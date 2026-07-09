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
