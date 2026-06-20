// Motor de equilibrio químico: fracciones alfa y solver de pH por balance de cargas.

import { KW } from './constants';

export { KW };

/**
 * Un componente ácido-base: la forma totalmente protonada HnA con carga z0
 * y sus constantes de acidez sucesivas (pKa1 < pKa2 < ...).
 * Ejemplos: H3PO4 → z0 = 0, pKas [2.15, 7.20, 12.35]
 *           NH4+  → z0 = +1, pKas [9.25]
 */
export interface AcidBaseComponent {
  /** Concentración analítica total (mol/L) */
  c: number;
  /** Carga de la especie totalmente protonada */
  z0: number;
  /** pKa sucesivos, ordenados de menor a mayor */
  pKas: number[];
}

/**
 * Fracciones de distribución alfa_i para un sistema HnA con las Ka dadas.
 * alpha[0] = forma totalmente protonada, alpha[n] = totalmente desprotonada.
 */
export function alphaFractions(h: number, pKas: number[]): number[] {
  const n = pKas.length;
  // término i = [H+]^(n-i) * Ka1*...*Kai ; se trabaja con logaritmos para evitar overflow
  const logH = Math.log10(h);
  const logTerms: number[] = [];
  let cumLogKa = 0;
  for (let i = 0; i <= n; i++) {
    if (i > 0) cumLogKa += -pKas[i - 1];
    logTerms.push((n - i) * logH + cumLogKa);
  }
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const denom = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / denom);
}

/**
 * Balance de cargas de una mezcla a un pH dado.
 * extraCations/extraAnions: concentraciones de iones espectadores fuertes (Na+, Cl-).
 * Devuelve la carga neta; la raíz f(pH) = 0 es el pH de equilibrio.
 */
export function chargeBalance(
  pH: number,
  components: AcidBaseComponent[],
  extraCations = 0,
  extraAnions = 0,
): number {
  const h = Math.pow(10, -pH);
  const oh = KW / h;
  let net = h - oh + extraCations - extraAnions;
  for (const comp of components) {
    if (comp.c <= 0) continue;
    const alphas = alphaFractions(h, comp.pKas);
    let weighted = 0;
    for (let i = 0; i < alphas.length; i++) {
      weighted += alphas[i] * (comp.z0 - i);
    }
    net += comp.c * weighted;
  }
  return net;
}

/**
 * Resuelve el pH de una mezcla por bisección sobre el balance de cargas.
 * f(pH) es estrictamente decreciente en pH, así que la bisección es robusta.
 */
export function solvePH(
  components: AcidBaseComponent[],
  extraCations = 0,
  extraAnions = 0,
): number {
  let lo = -2;
  let hi = 16;
  const fLo = chargeBalance(lo, components, extraCations, extraAnions);
  const fHi = chargeBalance(hi, components, extraCations, extraAnions);
  if (fLo <= 0) return lo;
  if (fHi >= 0) return hi;
  if (fLo * fHi > 0) return (lo + hi) / 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const f = chargeBalance(mid, components, extraCations, extraAnions);
    if (f > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
