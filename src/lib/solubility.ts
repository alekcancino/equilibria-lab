// Solubilidad de sales poco solubles: efecto del ion común y del pH (anión básico).

import { alphaFractions } from './equilibrium';
import { alphaL } from './conditional';
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
  if (f(lo) > 0) return 0;
  if (f(hi) < 0) return Math.pow(10, hi);
  if (f(lo) * f(hi) > 0) return NaN;
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return Math.pow(10, (lo + hi) / 2);
}

/**
 * Solubilidad molar s de MmXx en presencia de un complejante X que forma
 * hidroxo/complejos con el catión: log s = f(pX) a pH fijo.
 * αM(L) = 1 + Σ βᵢ[X]ⁱ corrige la concentración libre del catión.
 */
export function solubilityVsPX(
  salt: SaltPreset,
  pH: number,
  logBetasM: number[],
  pX: number,
  cCommon = 0,
): number {
  const ksp = Math.pow(10, -salt.pKsp);
  const alphaAnion = anionFreeFraction(salt, pH);
  const cX = Math.pow(10, -pX);
  const alphaM = alphaL(logBetasM, cX);

  const f = (logS: number): number => {
    const s = Math.pow(10, logS);
    const cationFree = (salt.m * s) / alphaM;
    const anionFree = alphaAnion * (salt.x * s + cCommon);
    return (
      salt.m * Math.log10(cationFree) + salt.x * Math.log10(anionFree) - Math.log10(ksp)
    );
  };

  let lo = -15;
  let hi = 2;
  if (f(lo) > 0) return 0;
  if (f(hi) < 0) return Math.pow(10, hi);
  if (f(lo) * f(hi) > 0) return NaN;
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return Math.pow(10, (lo + hi) / 2);
}

/** Curva log s = f(pX) para un barrido de pX. */
export function solubilityPXCurve(
  salt: SaltPreset,
  pH: number,
  logBetasM: number[],
  pXMin: number,
  pXMax: number,
  points = 300,
  cCommon = 0,
): { pXs: number[]; logS: number[] } {
  const pXs: number[] = [];
  const logS: number[] = [];
  for (let i = 0; i <= points; i++) {
    const pX = pXMin + ((pXMax - pXMin) * i) / points;
    pXs.push(pX);
    logS.push(Math.log10(solubilityVsPX(salt, pH, logBetasM, pX, cCommon)));
  }
  return { pXs, logS };
}
