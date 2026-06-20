// Actividad iónica y ecuación de Debye-Hückel extendida (25 °C).

import { PKW } from './constants';

/** Fuerza iónica I = ½ Σ cᵢ zᵢ² (M). */
export function ionicStrength(ions: { c: number; z: number }[]): number {
  return 0.5 * ions.reduce((s, { c, z }) => s + c * z * z, 0);
}

/**
 * log₁₀ γ para un ion con carga z (Debye-Hückel extendida).
 * log γ = −A z² √I / (1 + B a √I)
 * A ≈ 0.51, B ≈ 0.33 Å⁻¹·M⁻½, a ≈ 3 Å (radio efectivo).
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

/** pH efectivo a partir de a_H (actividad). */
export function pHFromActivity(aH: number): number {
  return -Math.log10(Math.max(aH, 1e-30));
}

/** a_H a partir de pH y γ_H. */
export function hydrogenActivity(pH: number, gammaH = 1): number {
  return gammaH * Math.pow(10, -pH);
}

/** pKw aparente con corrección de actividad (modelo simplificado). */
export function apparentPKw(gammaH: number, gammaOH: number): number {
  return PKW - Math.log10(gammaH * gammaOH);
}
