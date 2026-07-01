// Helpers de lectura de métricas para la UI: "% + punto de operación".
//
// NO tocan el motor de cálculo (complexation/equilibrium/conditional ya están
// verificados). Solo LEEN esas funciones y añaden:
//   • porcentajes derivados (% formado / disociado / de especie)
//   • el "punto de operación": el valor del eje del diagrama (pL/pH/pe) donde
//     una métrica alcanza X% (X ∈ {10,50,90}), por bisección.
//
// Definiciones exactas (spec issue #4), sin decisiones libres:
//   % formado de complejo (1:1) = ñ·100          (ñ = bjerrumNumber)
//   % disociado                 = (1 − ñ)·100
//   % de especie ácido-base a pH = αᵢ·100
//   fracción formada a Co (ligando en exceso) = K'·Co / (1 + K'·Co)

import { bjerrumNumber } from './complexation';
import { alphaFractions } from './equilibrium';
import { alphaH, alphaOH } from './conditional';

// ── Porcentajes de complejación (1:1) ────────────────────────────────────────

/** % formado de complejo 1:1 a un pL dado: ñ·100. */
export function percentFormed(pL: number, logBetas: number[]): number {
  return bjerrumNumber(pL, logBetas) * 100;
}

/** % disociado de complejo 1:1 a un pL dado: (1 − ñ)·100. */
export function percentDissociated(pL: number, logBetas: number[]): number {
  return (1 - bjerrumNumber(pL, logBetas)) * 100;
}

// ── % de especie ácido-base ──────────────────────────────────────────────────

/** % de la especie i (αᵢ·100) de un sistema HnA con las pKa dadas, a un pH. */
export function percentSpeciesAtPH(pH: number, pKas: number[], idx: number): number {
  const alphas = alphaFractions(Math.pow(10, -pH), pKas);
  return (alphas[idx] ?? 0) * 100;
}

// ── Constante condicional y fracción formada ─────────────────────────────────

/**
 * log K′(pH) de un complejo M+Y con protonación del ligante (α_Y(H)) e
 * hidrólisis del metal (α_M(OH)). Reusa el motor conditional.ts.
 *   log K′ = log Kf − log α_Y(H) − log α_M(OH)
 */
export function condLogKAtPH(
  logKf: number,
  ligandPKas: number[],
  pH: number,
  logBetasOH: number[] = [],
): number {
  return logKf - Math.log10(alphaH(ligandPKas, pH)) - Math.log10(alphaOH(logBetasOH, pH));
}

/**
 * Fracción formada de un complejo 1:1 con el ligando en exceso (o el metal en
 * exceso: el modelo es simétrico). Co es la concentración del reactivo en
 * exceso (M):
 *   f = [ML]/C_limitante = K'·Co / (1 + K'·Co)
 */
export function fractionFormedExcess(logKprime: number, cExcess: number): number {
  const KC = Math.pow(10, logKprime) * cExcess;
  return KC / (1 + KC);
}

// ── Punto de operación (bisección genérica) ──────────────────────────────────

/**
 * Punto de operación: el valor de x ∈ [lo, hi] donde metric(x) = targetPercent.
 * metric debe ser monótona en [lo, hi] (creciente o decreciente); la bisección
 * lo detecta por el signo de los extremos. Sigue el patrón de bisección de
 * equilibrium.ts (~64 iteraciones). Devuelve NaN si [lo, hi] no acota el objetivo.
 */
export function operatingPoint(
  metric: (x: number) => number,
  targetPercent: number,
  lo: number,
  hi: number,
  iterations = 64,
): number {
  let a = lo;
  let b = hi;
  let fa = metric(a) - targetPercent;
  const fb = metric(b) - targetPercent;
  if (Math.abs(fa) < 1e-9) return a;
  if (Math.abs(fb) < 1e-9) return b;
  if (fa * fb > 0) return NaN;
  for (let i = 0; i < iterations; i++) {
    const mid = (a + b) / 2;
    const fm = metric(mid) - targetPercent;
    if (Math.abs(fm) < 1e-12) return mid;
    if (fa * fm < 0) { b = mid; } else { a = mid; fa = fm; }
  }
  return (a + b) / 2;
}

/**
 * pL donde el % formado del complejo alcanza targetPercent (bisección sobre pL).
 * Para un complejo 1:1, %formado = 50 ocurre en pL = log β₁.
 */
export function pLForPercentFormed(logBetas: number[], targetPercent: number): number {
  const hi = (logBetas[logBetas.length - 1] ?? 6) + 8;
  return operatingPoint((pL) => percentFormed(pL, logBetas), targetPercent, -4, hi);
}

/**
 * pH donde la fracción formada del complejo M+Y (ligando en exceso, conc. Co)
 * alcanza targetPercent. Bisección sobre pH usando log K′(pH).
 */
export function pHForPercentFormed(
  logKf: number,
  ligandPKas: number[],
  cExcess: number,
  targetPercent: number,
  logBetasOH: number[] = [],
  pHRange: [number, number] = [0, 14],
): number {
  const metric = (pH: number) =>
    fractionFormedExcess(condLogKAtPH(logKf, ligandPKas, pH, logBetasOH), cExcess) * 100;
  return operatingPoint(metric, targetPercent, pHRange[0], pHRange[1]);
}
