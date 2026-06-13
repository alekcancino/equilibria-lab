// Titulaciones complejométricas con EDTA: constante condicional y curva pM vs volumen.

import { alphaH } from './conditional';

/** pKas del EDTA (H4Y) */
export const EDTA_PKAS = [2.0, 2.69, 6.13, 10.37];

/** α_Y(H) del EDTA a un pH dado — delega en conditional.ts */
export function alphaY4(pH: number): number {
  return alphaH(EDTA_PKAS, pH);
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
    // Cuando kCond << 1 la cuadrática degenera: usamos la rama estabilizada.
    const a = kCond;
    const b = kCond * (cY - cM) + 1;
    const c = -cM;
    let m: number;
    if (kCond < 1e-8) {
      // Régimen de ligando muy débil: [M] ≈ cM (sin complejo significativo)
      m = cM;
    } else {
      m = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    }

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
