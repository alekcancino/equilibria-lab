// Motor de constantes condicionales (Ringbom).
// K' = K / (α_M · α_Y)    log K' = log K − log α_M − log α_Y
// Todos los α ≥ 1; vale 1 cuando no hay reacción parásita.

import { alphaFractions } from './equilibrium';

/**
 * Coeficiente de reacciones parásitas por protonación del ligante (α_Y(H)).
 * α_Y(H) = 1 / α_{totalmente desprotonado} = D / [Y^n−]
 *
 * Usa alphaFractions: la última fracción es α de la forma desprotonada,
 * por lo que α_Y(H) = 1 / alphas[last].
 *
 * @param pKas  pKas sucesivos del ligante (de menor a mayor), ej. EDTA [2.0, 2.69, 6.13, 10.37]
 * @param pH    pH del medio
 */
export function alphaH(pKas: number[], pH: number): number {
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, pKas);
  const aFree = alphas[alphas.length - 1];
  return aFree < 1e-30 ? 1e30 : 1 / aFree;
}

/**
 * Coeficiente de reacciones parásitas por hidrólisis del metal (α_M(OH)).
 * α_M(OH) = 1 + Σ β_i(OH) · [OH]^i
 *
 * @param logBetasOH  log β globales de los hidroxocomplexos M(OH)₁, M(OH)₂, ...
 * @param pH          pH del medio
 */
export function alphaOH(logBetasOH: number[], pH: number): number {
  if (logBetasOH.length === 0) return 1;
  const pOH = 14 - pH;
  const logOH = -pOH;
  let sum = 1;
  for (let i = 0; i < logBetasOH.length; i++) {
    sum += Math.pow(10, logBetasOH[i] + (i + 1) * logOH);
  }
  return sum;
}

/**
 * Coeficiente de reacciones parásitas por ligando auxiliar libre (α_M(L)).
 * α_M(L) = 1 + Σ β_i · [L]^i
 *
 * @param logBetasL  log β globales del metal con el ligando auxiliar
 * @param cL         concentración libre del ligando auxiliar [L] (M)
 */
export function alphaL(logBetasL: number[], cL: number): number {
  if (logBetasL.length === 0 || cL <= 0) return 1;
  const logL = Math.log10(cL);
  let sum = 1;
  for (let i = 0; i < logBetasL.length; i++) {
    sum += Math.pow(10, logBetasL[i] + (i + 1) * logL);
  }
  return sum;
}

/**
 * Constante condicional (log K').
 * log K' = logKf − log(α_M) − log(α_Y)
 *
 * α_M = αM_OH · αM_L  (combinación multiplicativa de coeficientes del metal)
 *
 * @param logKf   log K de formación en medio ideal
 * @param alphaM  coeficiente total del metal (αOH · αL; pasar 1 si no aplica)
 * @param alphaY  coeficiente total del ligante (αH; pasar 1 si no aplica)
 */
export function condLogK(
  logKf: number,
  { alphaM, alphaY }: { alphaM: number; alphaY: number }
): number {
  return logKf - Math.log10(alphaM) - Math.log10(alphaY);
}

/**
 * Ventana de factibilidad: rango de pH donde log K' ≥ threshold.
 * Devuelve [pH_min, pH_max] o null si nunca se alcanza el umbral.
 *
 * @param pHs       array de valores de pH (debe estar ordenado)
 * @param logKs     array de log K' correspondientes (mismo índice)
 * @param threshold umbral de cuantitatividad (6 = reacción; 8 = titulación nítida)
 */
export function feasibilityWindow(
  pHs: number[],
  logKs: number[],
  threshold: number
): [number, number] | null {
  let lo: number | null = null;
  let hi: number | null = null;
  for (let i = 0; i < pHs.length; i++) {
    if (logKs[i] >= threshold) {
      if (lo === null) lo = pHs[i];
      hi = pHs[i];
    }
  }
  if (lo === null || hi === null) return null;
  return [lo, hi];
}

/**
 * Genera la curva log K' = f(pH) para un sistema M+Y.
 *
 * @param logKf       log K de formación M+Y en medio ideal
 * @param pKasY       pKas del ligante Y (protonación)
 * @param logBetasOH  log β del metal con OH⁻ (puede ser [])
 * @param logBetasL   log β del metal con ligando auxiliar (puede ser [])
 * @param cL          concentración libre del ligando auxiliar (M)
 * @param pHRange     [pHmin, pHmax] del barrido
 * @param points      número de puntos
 */
export function condLogKCurve(
  logKf: number,
  pKasY: number[],
  logBetasOH: number[],
  logBetasL: number[],
  cL: number,
  pHRange: [number, number] = [1, 14],
  points = 500
): { pHs: number[]; logKs: number[]; logAlphaH: number[]; logAlphaOH: number[]; logAlphaL: number[] } {
  const [pHmin, pHmax] = pHRange;
  const pHs: number[] = [];
  const logKs: number[] = [];
  const logAlphaH: number[] = [];
  const logAlphaOH: number[] = [];
  const logAlphaL: number[] = [];

  for (let i = 0; i <= points; i++) {
    const pH = pHmin + ((pHmax - pHmin) * i) / points;
    const aH = alphaH(pKasY, pH);
    const aOH = alphaOH(logBetasOH, pH);
    const aL = alphaL(logBetasL, cL);
    const alphaM = aOH * aL;
    const lk = condLogK(logKf, { alphaM, alphaY: aH });

    pHs.push(pH);
    logKs.push(lk);
    logAlphaH.push(Math.log10(aH));
    logAlphaOH.push(Math.log10(aOH));
    logAlphaL.push(Math.log10(aL));
  }

  return { pHs, logKs, logAlphaH, logAlphaOH, logAlphaL };
}
