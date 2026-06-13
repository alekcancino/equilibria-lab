// Solubilidad de sales poco solubles: efecto del ion común y del pH (anión básico).

import { alphaFractions } from './equilibrium';
import type { SaltPreset } from './database';

/**
 * Fracción del anión que permanece como especie libre (totalmente desprotonada)
 * a un pH dado. Si el anión no es básico, vale 1.
 */
export function anionFreeFraction(salt: SaltPreset, pH: number): number {
  if (!salt.anionPKas || salt.anionPKas.length === 0) return 1;
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, salt.anionPKas);
  return alphas[alphas.length - 1];
}

/**
 * Solubilidad molar s de la sal MmXx a un pH dado y con concentración
 * adicional de anión común cCommon (analítica).
 *
 * Ksp = [M]^m · [X_libre]^x, con [M] = m·s y [X_libre] = alfa · (x·s + cCommon).
 * Se resuelve por bisección sobre log10(s).
 */
export function solubility(salt: SaltPreset, pH: number, cCommon = 0): number {
  const ksp = Math.pow(10, -salt.pKsp);
  const alpha = anionFreeFraction(salt, pH);

  const f = (logS: number): number => {
    const s = Math.pow(10, logS);
    const cation = salt.m * s;
    const anionFree = alpha * (salt.x * s + cCommon);
    return (
      salt.m * Math.log10(cation) + salt.x * Math.log10(anionFree) - Math.log10(ksp)
    );
  };

  // f es creciente en logS; bisección en [-15, 2]
  let lo = -15;
  let hi = 2;
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return Math.pow(10, (lo + hi) / 2);
}
