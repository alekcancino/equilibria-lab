// Generación de curvas de titulación ácido-base por balance de cargas exacto.
// El analito puede ser ácido o base; el titulante fuerte puede ser básico (NaOH)
// o ácido (HCl) — las cuatro combinaciones son válidas.

import { solvePH, type AcidBaseComponent } from './equilibrium';

export interface TitrationParams {
  /** Sistema analito (cualquier HnA/B con sus pKa) */
  analyte: {
    z0: number;
    pKas: number[];
    kind?: 'equilibrium' | 'strong-acid' | 'strong-base';
  };
  /** true: el titulante fuerte es HCl; false: es NaOH */
  titrantIsAcid: boolean;
  /** Concentración del analito (M) */
  cAnalyte: number;
  /** Volumen inicial del analito (mL) */
  vAnalyte: number;
  /** Concentración del titulante fuerte (M) */
  cTitrant: number;
  /** Volumen máximo de titulante (mL) */
  vMax: number;
  /** Número de puntos de la curva */
  points?: number;
}

export interface TitrationCurve {
  volumes: number[];
  pHs: number[];
  /** Volumen de equivalencia teórico de cada protón titulable (mL) */
  equivalenceVolumes: number[];
}

/** Protones titulables con titulante básico o ácido (pKa en ventana útil). */
export function titratableProtons(pKas: number[]): number {
  return Math.max(pKas.filter((pk) => pk > 0 && pk < 14).length, 1);
}

/**
 * Curva pH vs volumen. El titulante entra al balance de cargas como ion
 * espectador (Na⁺ del NaOH o Cl⁻ del HCl); el pH se resuelve exacto en cada
 * punto, con dilución incluida (lección de la auditoría P0-5).
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

/** Primera derivada numérica dpH/dV (diferencias centradas) */
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

/** Segunda derivada — aplica diferencias centrales dos veces. */
export function secondDerivative(volumes: number[], ys: number[]): { v: number[]; d: number[] } {
  const first = firstDerivative(volumes, ys);
  return firstDerivative(first.v, first.d);
}

/**
 * Función linealizada de Gran para detectar V_eq con mayor precisión.
 * Antes del P.E.:  F₁ = (V₀ + V) · 10^−pH  (proporcional a [H⁺] total)
 * Después del P.E.: F₂ = (V₀ + V) · 10^(pH − 14)  (proporcional a [OH⁻] exceso)
 * Cada segmento es lineal y su extrapolación al eje-x da V_eq.
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
    const pHc = Math.min(14, Math.max(0, pH)); // clamp numérico
    const Vtot = vAnalyte + V;
    v1.push(V);
    F1.push(Vtot * Math.pow(10, -pHc));
    v2.push(V);
    F2.push(Vtot * Math.pow(10, pHc - 14));
  }
  return { v1, F1, v2, F2 };
}

/**
 * Ajuste lineal por mínimos cuadrados de un conjunto de puntos (x, y).
 * Devuelve { m, b } de y = m·x + b. Devuelve null si es degenerado.
 */
function linearFit(xs: number[], ys: number[]): { m: number; b: number } | null {
  const n = xs.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-30) return null;
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return { m, b };
}

/**
 * V_eq detectado por extrapolación lineal de la función de Gran F₁ (rama ácida,
 * antes del P.E.). Ajusta la porción lineal descendente cercana a la equivalencia
 * (F₁ entre 0.5 % y 60 % de su máximo) y extrapola a F₁ = 0.
 * Devuelve NaN si no hay suficiente rama útil.
 */
export function granVeq(
  volumes: number[],
  pHs: number[],
  vAnalyte: number,
): number {
  const { v1, F1 } = granPlot(volumes, pHs, vAnalyte);
  const Fmax = Math.max(...F1, 0);
  if (Fmax <= 0) return NaN;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < v1.length; i++) {
    // Rama pre-equivalencia, tramo lineal cercano al P.E.
    if (F1[i] <= 0.6 * Fmax && F1[i] >= 0.005 * Fmax) {
      xs.push(v1[i]);
      ys.push(F1[i]);
    }
  }
  const fit = linearFit(xs, ys);
  if (!fit || Math.abs(fit.m) < 1e-30) return NaN;
  return -fit.b / fit.m; // intersección con F₁ = 0
}

/**
 * Cuantitatividad q% = (1 − ε/Co)·100, donde ε es la concentración molar
 * efectiva de la especie limitante en el punto de equivalencia y Co la
 * concentración analítica (diluida) en ese punto. q → 100 % ⇒ reacción completa.
 */
export function quantitativity(epsLimiting: number, cAtEquivalence: number): number {
  if (cAtEquivalence <= 0) return NaN;
  return (1 - epsLimiting / cAtEquivalence) * 100;
}
