// Generación de curvas de titulación ácido-base por balance de cargas exacto.
// El analito puede ser ácido o base; el titulante fuerte puede ser base (NaOH)
// o ácido (HCl) — las cuatro combinaciones son válidas.

import { solvePH, type AcidBaseComponent } from './equilibrium';

export interface TitrationParams {
  /** Sistema analito (cualquier HnA/B con sus pKa) */
  analyte: { z0: number; pKas: number[] };
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

/** Protones titulables en dirección alcalimétrica o acidimétrica (pKa en ventana útil). */
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
    const comp: AcidBaseComponent = {
      c: (cAnalyte * vAnalyte) / vTotal,
      z0: analyte.z0,
      pKas: analyte.pKas,
    };
    const titrantConc = (cTitrant * vb) / vTotal;
    const pH = titrantIsAcid
      ? solvePH([comp], 0, titrantConc) // HCl → Cl⁻ espectador
      : solvePH([comp], titrantConc, 0); // NaOH → Na⁺ espectador
    volumes.push(vb);
    pHs.push(pH);
  }

  const nProtons = titratableProtons(analyte.pKas);
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
