// Compositor de reacciones parásitas (Ringbom) para equilibrios acoplados.
// Un SideReactionStack declara hidrólisis, ligando auxiliar, protonación del complejo, etc.

import { PKW } from './constants';
import { alphaFractions } from './equilibrium';
import { alphaH, alphaOH, alphaL, condLogK, feasibilityWindow } from './conditional';

export { feasibilityWindow };

/** Ligando auxiliar: concentración libre fija, total analítica (F) o escala pX′ fija. */
export type LigandSpec =
  | { mode: 'free'; cL: number }
  | { mode: 'total'; cTotal: number; pKas: number[]; coordinatingIndex?: number }
  | { mode: 'fixedPX'; pX: number };

/** Reacciones parásitas sobre el complejo MY (protonación / hidroxocomplejo del quelato). */
export interface ComplexSideReaction {
  /** log K para MY + H⁺ ⇌ MHY (aumenta α del lado Y/complejo) */
  logBetaProtonation?: number;
  /** log K para MY + OH⁻ ⇌ MOHY (convención del usuario) */
  logBetaHydroxy?: number;
}

/** Stack declarativo de parásitas para una reacción principal M + Y ⇌ MY. */
export interface SideReactionStack {
  /** pK_a sucesivos del ligando principal Y (p. ej. EDTA) */
  ligandPKas: number[];
  hydrolysis?: { logBetasOH: number[] };
  auxLigand?: {
    logBetasL: number[];
    spec: LigandSpec;
  };
  complex?: ComplexSideReaction;
}

/** Reacción principal con constante de formación ideal. */
export interface PrimaryReaction {
  label: string;
  logKf: number;
}

export function defaultSideStack(ligandPKas: number[] = [2.0, 2.69, 6.13, 10.37]): SideReactionStack {
  return { ligandPKas: [...ligandPKas] };
}

/** Concentra la especie coordinante libre [L] a partir del spec del ligando auxiliar. */
export function freeLigandConcentration(spec: LigandSpec, pH: number): number {
  if (spec.mode === 'free') return Math.max(spec.cL, 0);
  if (spec.mode === 'fixedPX') return Math.pow(10, -spec.pX);
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, spec.pKas);
  const idx = spec.coordinatingIndex ?? alphas.length - 1;
  return spec.cTotal * alphas[idx];
}

/** α por protonación / hidrólisis adicional del complejo MY. */
export function alphaComplex(pH: number, complex?: ComplexSideReaction): number {
  if (!complex) return 1;
  let a = 1;
  const h = Math.pow(10, -pH);
  const oh = Math.pow(10, pH - PKW);
  if (complex.logBetaProtonation !== undefined) {
    a += Math.pow(10, complex.logBetaProtonation) * h;
  }
  if (complex.logBetaHydroxy !== undefined) {
    a += Math.pow(10, complex.logBetaHydroxy) * oh;
  }
  return a;
}

export interface AlphaBreakdown {
  alphaM: number;
  alphaY: number;
  alphaH: number;
  alphaOH: number;
  alphaL: number;
  alphaComplex: number;
  cLFree: number;
}

/** α_M y α_Y totales a partir del stack. */
export function composeAlphas(pH: number, stack: SideReactionStack): AlphaBreakdown {
  const aH = alphaH(stack.ligandPKas, pH);
  const aOH = stack.hydrolysis
    ? alphaOH(stack.hydrolysis.logBetasOH, pH)
    : 1;
  let cLFree = 0;
  let aL = 1;
  if (stack.auxLigand && stack.auxLigand.logBetasL.length > 0) {
    cLFree = freeLigandConcentration(stack.auxLigand.spec, pH);
    aL = alphaL(stack.auxLigand.logBetasL, cLFree);
  }
  const aCx = alphaComplex(pH, stack.complex);
  return {
    alphaM: aOH * aL,
    alphaY: aH * aCx,
    alphaH: aH,
    alphaOH: aOH,
    alphaL: aL,
    alphaComplex: aCx,
    cLFree,
  };
}

/** log K′ de una reacción principal a pH dado. */
export function condLogKPrimary(logKf: number, pH: number, stack: SideReactionStack): number {
  const { alphaM, alphaY } = composeAlphas(pH, stack);
  return condLogK(logKf, { alphaM, alphaY });
}

export interface CondLogKCurveResult {
  pHs: number[];
  logKs: number[];
  logAlphaH: number[];
  logAlphaOH: number[];
  logAlphaL: number[];
  logAlphaComplex: number[];
}

/** Curva log K′ = f(pH) con stack completo. */
export function condLogKCurveFromStack(
  logKf: number,
  stack: SideReactionStack,
  pHRange: [number, number] = [1, 14],
  points = 500,
): CondLogKCurveResult {
  const [pHmin, pHmax] = pHRange;
  const pHs: number[] = [];
  const logKs: number[] = [];
  const logAlphaH: number[] = [];
  const logAlphaOH: number[] = [];
  const logAlphaL: number[] = [];
  const logAlphaComplex: number[] = [];

  for (let i = 0; i <= points; i++) {
    const pH = pHmin + ((pHmax - pHmin) * i) / points;
    const br = composeAlphas(pH, stack);
    pHs.push(pH);
    logKs.push(condLogK(logKf, { alphaM: br.alphaM, alphaY: br.alphaY }));
    logAlphaH.push(Math.log10(br.alphaH));
    logAlphaOH.push(Math.log10(br.alphaOH));
    logAlphaL.push(Math.log10(br.alphaL));
    logAlphaComplex.push(Math.log10(br.alphaComplex));
  }
  return { pHs, logKs, logAlphaH, logAlphaOH, logAlphaL, logAlphaComplex };
}

/** Varias reacciones principales (p. ej. NiGly, NiGly₂, NiGly₃). */
export function condLogKCurveMulti(
  reactions: PrimaryReaction[],
  stack: SideReactionStack,
  pHRange: [number, number] = [1, 14],
  points = 500,
): { pHs: number[]; curves: { label: string; logKs: number[] }[] } {
  const base = condLogKCurveFromStack(reactions[0]?.logKf ?? 0, stack, pHRange, points);
  const curves = reactions.map((rx) => ({
    label: rx.label,
    logKs: condLogKCurveFromStack(rx.logKf, stack, pHRange, points).logKs,
  }));
  return { pHs: base.pHs, curves };
}

/** log S′ = f(pH) para M(OH)_n con enmascaramiento completo vía stack (solo parásitas del metal). */
export function hydroxideSolCurveMasked(
  pKsp: number,
  n: number,
  stack: SideReactionStack,
  pHRange: [number, number] = [0, 14],
  points = 500,
): { pHs: number[]; logS: number[] } {
  const [pHmin, pHmax] = pHRange;
  const pHs: number[] = [];
  const logS: number[] = [];
  const ohBetas = stack.hydrolysis?.logBetasOH ?? [];

  for (let i = 0; i <= points; i++) {
    const pH = pHmin + ((pHmax - pHmin) * i) / points;
    const logFreeMetal = -pKsp + n * (PKW - pH);
    const br = composeAlphas(pH, stack);
    // α_M para solubilidad: hidróxos + auxiliar (NH₃, glicinato), sin protonación del ligando Y
    const alphaM = br.alphaOH * br.alphaL;
    pHs.push(pH);
    logS.push(logFreeMetal + Math.log10(alphaM));
  }

  void ohBetas;
  return { pHs, logS };
}

/** Umbral log s desde concentración analítica C (M): log s_thresh = log10(C). */
export function logSThresholdFromConcentration(cMolar: number): number {
  return Math.log10(Math.max(cMolar, 1e-30));
}

/** pH de precipitación con stack enmascarado. */
export function precipitationPHMasked(
  pKsp: number,
  n: number,
  stack: SideReactionStack,
  logSThreshold: number,
  pHRange: [number, number] = [0, 14],
  direction: 'falling' | 'rising' = 'falling',
): number | null {
  const { pHs, logS } = hydroxideSolCurveMasked(pKsp, n, stack, pHRange, 1000);
  for (let i = 1; i < pHs.length; i++) {
    const crossed =
      direction === 'falling'
        ? logS[i - 1] > logSThreshold && logS[i] <= logSThreshold
        : logS[i - 1] <= logSThreshold && logS[i] > logSThreshold;
    if (crossed) {
      const t = (logSThreshold - logS[i - 1]) / (logS[i] - logS[i - 1]);
      return pHs[i - 1] + t * (pHs[i] - pHs[i - 1]);
    }
  }
  return null;
}

/** Escala condicional pX′ → [X] libre coordinante. */
export function concentrationFromPX(pX: number): number {
  return Math.pow(10, -pX);
}

/** α_M global para intercambio (hidrólisis + auxiliar a pH dado). */
export function alphaMetalGlobal(pH: number, stack: SideReactionStack): number {
  const br = composeAlphas(pH, stack);
  return br.alphaOH * br.alphaL;
}

export interface DistributionParams {
  /** Constante de selectividad K²_H/M (exam: K²_H/Ni = 3) */
  kSelSquared: number;
  pH: number;
  stack: SideReactionStack;
  /** [H⁺] en la resina (≈ CI durante el experimento) */
  hResin: number;
}

/**
 * Coeficiente de distribución D = [M]_resin / [M′]_sol (exam QA III 3er parcial).
 * D = K² · (α_M)^−1 · [H⁺]_bulk² / [H⁺]_resin²
 */
export function distributionCoefficient(params: DistributionParams): number {
  const { kSelSquared, pH, stack, hResin } = params;
  const hBulk = Math.pow(10, -pH);
  const alphaM = alphaMetalGlobal(pH, stack);
  const safeAlpha = Math.max(alphaM, 1e-30);
  const safeHResin = Math.max(hResin, 1e-30);
  return kSelSquared * (hBulk * hBulk) / (safeAlpha * safeHResin * safeHResin);
}

export interface ExchangeFractionParams {
  d: number;
  /** m_R / V (g/L) */
  r: number;
  /**
   * Factor de capacidad en meq·g/L de solución equivalente al examen.
   * Por defecto CI_meq_g * mR_g / V_L; si se pasa capacityFactorMeqPerL se usa directamente.
   */
  capacityFactorMeqPerL?: number;
  ciMeqPerG?: number;
  massResinG?: number;
  volumeL?: number;
}

/**
 * Fracción del catión en resina: φ = (D·r/F) / (1 + D·r/F).
 * F = CI·(m_R/V) en meq/L cuando CI está en meq/g.
 */
export function resinExchangeFraction(params: ExchangeFractionParams): number {
  const { d, r } = params;
  let F = params.capacityFactorMeqPerL;
  if (F === undefined && params.ciMeqPerG !== undefined && params.volumeL !== undefined) {
    F = (params.ciMeqPerG * (params.massResinG ?? 1)) / params.volumeL;
  }
  if (F === undefined || F <= 0) F = 25;
  const num = d * r;
  const ratio = num / F;
  return ratio / (1 + ratio);
}

/** Convierte parámetros legacy de condLogKCurve al stack. */
export function stackFromLegacy(
  pKasY: number[],
  logBetasOH: number[],
  logBetasL: number[],
  cL: number,
): SideReactionStack {
  const stack: SideReactionStack = { ligandPKas: [...pKasY] };
  if (logBetasOH.length > 0) stack.hydrolysis = { logBetasOH: [...logBetasOH] };
  if (logBetasL.length > 0 && cL > 0) {
    stack.auxLigand = {
      logBetasL: [...logBetasL],
      spec: { mode: 'free', cL },
    };
  }
  return stack;
}

export interface ElutionParams {
  /** moles Ni en resina al inicio */
  nNiResin: number;
  /** volumen EDTA (L) */
  vEdta: number;
  /** concentración analítica EDTA (M) */
  cEdta: number;
  logKfNiY: number;
  stack: SideReactionStack;
  pHRange?: [number, number];
}

/**
 * pH que maximiza fracción de Ni complejado con EDTA al eluir resina (modelo simplificado).
 * Compara K′(pH) · [Y] disponible frente a n_Ni en resina.
 */
export function optimalElutionPH(params: ElutionParams): { pH: number; logKprime: number; fractionEluted: number } {
  const { nNiResin, vEdta, cEdta, logKfNiY, stack } = params;
  const [pHmin, pHmax] = params.pHRange ?? [2, 12];
  let bestPH = pHmin;
  let bestScore = -Infinity;
  let bestLogK = -Infinity;
  const points = 200;
  for (let i = 0; i <= points; i++) {
    const pH = pHmin + ((pHmax - pHmin) * i) / points;
    const logKp = condLogKPrimary(logKfNiY, pH, stack);
    const cY = cEdta;
    const score = logKp + Math.log10(Math.max(cY, 1e-30));
    if (score > bestScore) {
      bestScore = score;
      bestPH = pH;
      bestLogK = logKp;
    }
  }
  const kFinal = Math.pow(10, bestLogK);
  const nY = cEdta * vEdta;
  const nComplex = Math.min(nNiResin, nY, nNiResin * kFinal * cEdta / (1 + kFinal * cEdta));
  return {
    pH: bestPH,
    logKprime: bestLogK,
    fractionEluted: nNiResin > 0 ? Math.min(1, nComplex / nNiResin) : 0,
  };
}

/** Potencial de electrodo Nernst: E = E°′ − (S/n) log([Ox]/[Red]) a pH fijo; aquí E°′ desde par. */
export function electrodePotential(
  e0Prime: number,
  n: number,
  pM: number,
): number {
  const s = 0.05916;
  const m = Math.pow(10, -pM);
  return e0Prime - (s / n) * Math.log10(Math.max(m, 1e-30));
}

/** E°′(pH) para par con mH protones: E°′ = E° − S·(mH/n)·pH. */
export function e0PrimeAtPH(e0: number, mH: number, n: number, pH: number): number {
  return e0 - 0.05916 * (mH / n) * pH;
}

// ── Estado compartido para SideReactionEditor ────────────────────────────────

export interface SideReactionEditorState {
  ligandPKas: number[];
  showOH: boolean;
  logBetasOH: number[];
  showAux: boolean;
  auxLabel: string;
  logBetasAux: number[];
  auxSpecMode: 'free' | 'total' | 'fixedPX';
  cAuxFree: number;
  cAuxTotal: number;
  auxPKas: number[];
  pXFixed: number;
  showComplex: boolean;
  logBetaProtonation: number | null;
  logBetaHydroxy: number | null;
}

export function defaultSideEditorState(
  ligandPKas: number[] = [2.0, 2.69, 6.13, 10.37],
): SideReactionEditorState {
  return {
    ligandPKas: [...ligandPKas],
    showOH: false,
    logBetasOH: [],
    showAux: false,
    auxLabel: 'NH₃',
    logBetasAux: [4.04, 7.47, 10.27, 12.03],
    auxSpecMode: 'free',
    cAuxFree: 0.01,
    cAuxTotal: 2.0,
    auxPKas: [9.2],
    pXFixed: 4,
    showComplex: false,
    logBetaProtonation: null,
    logBetaHydroxy: null,
  };
}

export function sideStackFromEditor(st: SideReactionEditorState): SideReactionStack {
  const stack: SideReactionStack = { ligandPKas: [...st.ligandPKas] };
  if (st.showOH && st.logBetasOH.length > 0) {
    stack.hydrolysis = { logBetasOH: [...st.logBetasOH] };
  }
  if (st.showAux && st.logBetasAux.length > 0) {
    let spec: LigandSpec;
    if (st.auxSpecMode === 'total') {
      spec = { mode: 'total', cTotal: st.cAuxTotal, pKas: [...st.auxPKas] };
    } else if (st.auxSpecMode === 'fixedPX') {
      spec = { mode: 'fixedPX', pX: st.pXFixed };
    } else {
      spec = { mode: 'free', cL: st.cAuxFree };
    }
    stack.auxLigand = { logBetasL: [...st.logBetasAux], spec };
  }
  if (st.showComplex && (st.logBetaProtonation !== null || st.logBetaHydroxy !== null)) {
    stack.complex = {};
    if (st.logBetaProtonation !== null) stack.complex.logBetaProtonation = st.logBetaProtonation;
    if (st.logBetaHydroxy !== null) stack.complex.logBetaHydroxy = st.logBetaHydroxy;
  }
  return stack;
}

/** Curva D(pH) y φ(pH) para intercambio catiónico competitivo con H⁺. */
export function exchangeDistributionCurve(
  kSelSquared: number,
  stack: SideReactionStack,
  hResin: number,
  ciMeqPerG: number,
  massResinG: number,
  volumeL: number,
  pHRange: [number, number] = [1, 14],
  points = 200,
): { pHs: number[]; logD: number[]; phi: number[] } {
  const r = massResinG / volumeL;
  const capacity = (ciMeqPerG * massResinG) / volumeL;
  const pHs: number[] = [];
  const logD: number[] = [];
  const phi: number[] = [];
  for (let i = 0; i <= points; i++) {
    const pH = pHRange[0] + ((pHRange[1] - pHRange[0]) * i) / points;
    const d = distributionCoefficient({ kSelSquared, pH, stack, hResin });
    pHs.push(pH);
    logD.push(Math.log10(Math.max(d, 1e-30)));
    phi.push(resinExchangeFraction({ d, r, capacityFactorMeqPerL: capacity }));
  }
  return { pHs, logD, phi };
}
