// Titulaciones complejométricas con EDTA: constante condicional y curva pM vs volumen.

import { alphaFractions } from './equilibrium';

/** pKas del EDTA (H4Y); para alfa_Y4- solo importan las 4 últimas desprotonaciones */
export const EDTA_PKAS = [2.0, 2.69, 6.13, 10.37];

/** Fracción alfa de Y⁴⁻ (forma totalmente desprotonada del EDTA) a un pH dado */
export function alphaY4(pH: number): number {
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, EDTA_PKAS);
  return alphas[alphas.length - 1];
}

export interface EdtaTitrationParams {
  /** log Kf del complejo M-EDTA */
  logKf: number;
  /** pH amortiguado de la titulación */
  pH: number;
  /** Concentración de la especie en el matraz (M) */
  cMetal: number;
  /** Volumen inicial en el matraz (mL) */
  vMetal: number;
  /** Concentración del titulante (M) */
  cEdta: number;
  /** Volumen máximo de titulante (mL) */
  vMax: number;
  /** true: el EDTA está en el matraz y se titula con el metal (retro/inversa) */
  edtaInFlask?: boolean;
  points?: number;
}

export interface EdtaCurve {
  volumes: number[];
  pMs: number[];
  vEq: number;
  /** Constante condicional K'f = alfa_Y4 * Kf */
  logKfCond: number;
}

/**
 * Curva de titulación pM vs volumen de EDTA usando la constante condicional
 * K'f = alfa_Y4(pH) · Kf. Resuelve [M] exacto con la cuadrática del balance de masas:
 *   K'[M]² + (K'(C_Y − C_M) + 1)[M] − C_M = 0
 */
export function edtaTitrationCurve(params: EdtaTitrationParams): EdtaCurve {
  const { logKf, pH, cMetal, vMetal, cEdta, vMax, edtaInFlask = false } = params;
  const points = params.points ?? 500;
  const aY = alphaY4(pH);
  const kCond = aY * Math.pow(10, logKf);

  const volumes: number[] = [];
  const pMs: number[] = [];

  for (let i = 0; i <= points; i++) {
    const v = (vMax * i) / points;
    const vTotal = vMetal + v;
    // En la dirección directa el metal está en el matraz; en la inversa, el EDTA.
    const flask = (cMetal * vMetal) / vTotal;
    const buret = (cEdta * v) / vTotal;
    const cM = edtaInFlask ? buret : flask;
    const cY = edtaInFlask ? flask : buret;

    // K'[M]² + (K'(cY − cM) + 1)[M] − cM = 0
    const a = kCond;
    const b = kCond * (cY - cM) + 1;
    const c = -cM;
    const m = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);

    volumes.push(v);
    pMs.push(-Math.log10(Math.max(m, 1e-30)));
  }

  return {
    volumes,
    pMs,
    vEq: (cMetal * vMetal) / cEdta,
    logKfCond: Math.log10(kCond),
  };
}
