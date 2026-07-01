// Redox equilibrium using the pe convention: pe = E / 0.05916 V (Sillén).
// pe° = E°/0.05916 always — n is absorbed into pe°, not repeated in the formula.

import { NERNST_S } from './constants';

export { NERNST_S };

export interface RedoxCouple {
  id: string;
  name: string;
  /** Semirreacción completa para mostrar */
  halfReaction: string;
  ox: string;
  red: string;
  /** Potencial estándar (V vs ENH) */
  E0: number;
  /** Electrones transferidos */
  n: number;
  /** Protones en la semirreacción (0 si no participa H⁺) */
  mH: number;
  reference: string;
  /** Advertencia de modelo, si aplica (ej. especies polinucleares) */
  caveat?: string;
}

/** pe° = E°/S — convención de Sillén/Baeza, consistente con los libros de texto. */
export function peStandard(E0: number): number {
  return E0 / NERNST_S;
}

/**
 * pe°' condicional al pH de trabajo: para ox + mH·H⁺ + n·e⁻ → red,
 * pe°' = pe° − (mH/n)·pH. Si mH = 0 no depende del pH.
 */
export function peConditional(couple: RedoxCouple, pH: number): number {
  return peStandard(couple.E0) - (couple.mH / couple.n) * pH;
}

/**
 * Fracciones alfa del par a un pe dado (modelo de dos especies mononucleares):
 * [ox]/[red] = 10^{n(pe − pe°')}.
 */
export function alphaRedox(pe: number, pe0c: number, n: number): { ox: number; red: number } {
  const exp = n * (pe - pe0c);
  if (exp > 30) return { ox: 1, red: Math.pow(10, -exp) };
  if (exp < -30) return { ox: Math.pow(10, exp), red: 1 };
  const r = Math.pow(10, exp);
  return { ox: r / (1 + r), red: 1 / (1 + r) };
}

export interface RedoxTitrationParams {
  /** Par del analito */
  analyte: RedoxCouple;
  /** Par del titulante */
  titrant: RedoxCouple;
  /**
   * 'oxidante': analito inicia reducido, titulante se agrega oxidado (oxidación del analito).
   * 'reductor': analito inicia oxidado, titulante se agrega reducido (reducción del analito).
   */
  direction?: 'oxidante' | 'reductor';
  /** pH amortiguado del medio */
  pH: number;
  cAnalyte: number;
  vAnalyte: number;
  cTitrant: number;
  vMax: number;
  points?: number;
}

export interface RedoxCurve {
  volumes: number[];
  pes: number[];
  Es: number[];
  vEq: number;
  peEq: number;
  EEq: number;
  /** log K de la reacción de titulación balanceada */
  logK: number;
  pe0cAnalyte: number;
  pe0cTitrant: number;
}

/**
 * Curva de titulación redox resuelta por BALANCE DE ELECTRONES exacto:
 * los electrones cedidos por la especie que se oxida igualan los aceptados
 * por la que se reduce. En titulación por oxidación:
 *   f(pe) = n_a·N_a·α_ox,a(pe) − n_t·N_t·α_red,t(pe) = 0
 * (en titulación por reducción los papeles se invierten). f es estrictamente monótona
 * en pe → bisección robusta. La estequiometría n_a ≠ n_t queda correcta
 * automáticamente (V_eq = n_a·C_a·V_a / (n_t·C_t)).
 */
export function redoxTitrationCurve(params: RedoxTitrationParams): RedoxCurve {
  const { analyte, titrant, pH, cAnalyte, vAnalyte, cTitrant, vMax, direction = 'oxidante' } = params;
  const points = params.points ?? 500;
  const pe0a = peConditional(analyte, pH);
  const pe0t = peConditional(titrant, pH);

  const solvePe = (nA: number, nT: number): number => {
    // nA, nT en moles; bisección sobre el balance de electrones.
    // f creciente en pe en ambas direcciones gracias al signo.
    const f = (pe: number): number => {
      if (direction === 'oxidante') {
        return analyte.n * nA * alphaRedox(pe, pe0a, analyte.n).ox -
               titrant.n * nT * alphaRedox(pe, pe0t, titrant.n).red;
      }
      return titrant.n * nT * alphaRedox(pe, pe0t, titrant.n).ox -
             analyte.n * nA * alphaRedox(pe, pe0a, analyte.n).red;
    };
    let lo = -40;
    let hi = 45;
    const fLo = f(lo);
    const fHi = f(hi);
    if (fLo * fHi > 0) return fLo > 0 ? hi : lo;
    for (let i = 0; i < 90; i++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  const vEq = (analyte.n * cAnalyte * vAnalyte) / (titrant.n * cTitrant);
  const volumes: number[] = [];
  const pes: number[] = [];
  const Es: number[] = [];

  for (let i = 0; i <= points; i++) {
    const v = (vMax * i) / points;
    const pe = solvePe(cAnalyte * vAnalyte, cTitrant * v);
    volumes.push(v);
    pes.push(pe);
    Es.push(pe * NERNST_S);
  }

  const peEq = solvePe(cAnalyte * vAnalyte, cTitrant * vEq);

  // Reacción balanceada: intercambia n_a·n_t electrones; en titulación por reducción
  // el oxidante es el analito, así que el signo se invierte.
  const logK = direction === 'oxidante'
    ? analyte.n * titrant.n * (pe0t - pe0a)
    : analyte.n * titrant.n * (pe0a - pe0t);

  return {
    volumes, pes, Es, vEq,
    peEq, EEq: peEq * NERNST_S,
    logK,
    pe0cAnalyte: pe0a,
    pe0cTitrant: pe0t,
  };
}
