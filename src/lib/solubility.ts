// Solubility of sparingly soluble salts: common-ion effect and pH effect (basic anion).

import { alphaFractions } from './equilibrium';
import { alphaL } from './conditional';
import { logActivityCoefficient } from './activity';
import type { SaltPreset } from './database';

/**
 * Ksp corrected for ionic strength: Ksp_app = Ksp / (γ_M^m · γ_X^x)
 * ion charges default to 1 if not present in SaltPreset.
 */
function correctedKsp(salt: SaltPreset, I: number): number {
  if (I <= 0) return Math.pow(10, -salt.pKsp);
  const zM = salt.zCation ?? 1;
  const zX = salt.zAnion ?? 1;
  const logKspApp = -salt.pKsp
    - salt.m * logActivityCoefficient(zM, I)
    - salt.x * logActivityCoefficient(zX, I);
  return Math.pow(10, logKspApp);
}

/**
 * Fraction of the anion that remains as the free (fully deprotonated) species
 * at a given pH. Returns 1 if the anion is not basic.
 */
export function anionFreeFraction(salt: SaltPreset, pH: number): number {
  if (!salt.anionPKas || salt.anionPKas.length === 0) return 1;
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, salt.anionPKas);
  return alphas[alphas.length - 1];
}

/**
 * Molar solubility s of salt MmXx at a given pH with additional common-ion
 * concentration cCommon (analytical).
 *
 * Ksp = [M]^m · [X_free]^x, with [M] = m·s and [X_free] = α · (x·s + cCommon).
 * Solved by bisection on log10(s).
 */
export function solubility(salt: SaltPreset, pH: number, cCommon = 0, I = 0): number {
  const ksp = correctedKsp(salt, I);
  const alpha = anionFreeFraction(salt, pH);

  const f = (logS: number): number => {
    const s = Math.pow(10, logS);
    const cation = salt.m * s;
    const anionFree = alpha * (salt.x * s + cCommon);
    return (
      salt.m * Math.log10(cation) + salt.x * Math.log10(anionFree) - Math.log10(ksp)
    );
  };

  // f is increasing in logS; bisection on [-15, 2]
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
 * Molar solubility s of MmXx in the presence of a complexing agent X that forms
 * hydroxo/complexes with the cation: log s = f(pX) at fixed pH.
 * αM(L) = 1 + Σ βᵢ[X]ⁱ corrects for the free cation concentration.
 */
export function solubilityVsPX(
  salt: SaltPreset,
  pH: number,
  logBetasM: number[],
  pX: number,
  cCommon = 0,
  I = 0,
): number {
  const ksp = correctedKsp(salt, I);
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

/**
 * Solubility of a molecular (non-ionic) weak-acid solid HA(s), e.g. benzoic
 * acid: the intrinsic solubility S₀ is the concentration of the un-ionized
 * form alone; above pKa the conjugate base A⁻ pulls more solid into
 * solution, so total solubility grows as pH rises:
 *   S = S₀ · (1 + 10^(pH−pKa))
 */
export function acidSolidSolubility(S0: number, pKa: number, pH: number): number {
  return S0 * (1 + Math.pow(10, pH - pKa));
}

/**
 * Solubility of a molecular weak-base solid B(s), e.g. an amine: below the
 * pKa of its conjugate acid BH⁺, protonation pulls more solid into
 * solution, so total solubility grows as pH falls:
 *   S = S₀ · (1 + 10^(pKa−pH))
 */
export function baseSolidSolubility(S0: number, pKa: number, pH: number): number {
  return S0 * (1 + Math.pow(10, pKa - pH));
}

/** log s = f(pX) curve over a pX sweep. */
export function solubilityPXCurve(
  salt: SaltPreset,
  pH: number,
  logBetasM: number[],
  pXMin: number,
  pXMax: number,
  points = 300,
  cCommon = 0,
  I = 0,
): { pXs: number[]; logS: number[] } {
  const pXs: number[] = [];
  const logS: number[] = [];
  for (let i = 0; i <= points; i++) {
    const pX = pXMin + ((pXMax - pXMin) * i) / points;
    pXs.push(pX);
    logS.push(Math.log10(solubilityVsPX(salt, pH, logBetasM, pX, cCommon, I)));
  }
  return { pXs, logS };
}
