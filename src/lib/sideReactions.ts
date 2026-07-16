// Composer of side reactions (Ringbom) for coupled equilibria.
// A SideReactionStack declares hydrolysis, auxiliary ligand, complex protonation, etc.

import { PKW } from './constants';
import { alphaFractions } from './equilibrium';
import { logActivityCoefficient } from './activity';
import { alphaH, alphaOH, alphaL, condLogK, feasibilityWindow } from './conditional';
import { speciationFractions } from './speciation';

export { feasibilityWindow };

/** Auxiliary ligand: fixed free concentration, analytical total (F), or fixed pX′ scale. */
export type LigandSpec =
  | { mode: 'free'; cL: number }
  | { mode: 'total'; cTotal: number; pKas: number[]; coordinatingIndex?: number }
  | { mode: 'fixedPX'; pX: number };

/** Side reactions on the MY complex (protonation / hydroxo-complex of the chelate). */
export interface ComplexSideReaction {
  /** log K for MY + H⁺ ⇌ MHY (increases α on the Y/complex side) */
  logBetaProtonation?: number;
  /** log K for MY + OH⁻ ⇌ MOHY (user convention) */
  logBetaHydroxy?: number;
}

/** Declarative side-reaction stack for a primary reaction M + Y ⇌ MY. */
export interface SideReactionStack {
  /** Successive pKas of the primary ligand Y (e.g. EDTA) */
  ligandPKas: number[];
  hydrolysis?: { logBetasOH: number[] };
  auxLigand?: {
    logBetasL: number[];
    spec: LigandSpec;
  };
  complex?: ComplexSideReaction;
}

/** Primary reaction with ideal formation constant. */
export interface PrimaryReaction {
  label: string;
  logKf: number;
}

export function defaultSideStack(ligandPKas: number[] = [2.0, 2.69, 6.13, 10.37]): SideReactionStack {
  return { ligandPKas: [...ligandPKas] };
}

/** Returns the free coordinating species concentration [L] from the auxiliary ligand spec. */
export function freeLigandConcentration(spec: LigandSpec, pH: number): number {
  if (spec.mode === 'free') return Math.max(spec.cL, 0);
  if (spec.mode === 'fixedPX') return Math.pow(10, -spec.pX);
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, spec.pKas);
  const idx = spec.coordinatingIndex ?? alphas.length - 1;
  return spec.cTotal * alphas[idx];
}

/** α for additional protonation / hydrolysis of the MY complex. */
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
  alphaProduct: number;
  alphaH: number;
  alphaOH: number;
  alphaL: number;
  alphaComplex: number;
  cLFree: number;
}

/** Combines mutually exclusive branches that share the same reference species. */
export function combineSideReactionBranches(alphas: number[]): number {
  return 1 + alphas.reduce((sum, alpha) => sum + Math.max(alpha - 1, 0), 0);
}

/** Total reactant and product coefficients from the stack. */
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
    alphaM: combineSideReactionBranches([aOH, aL]),
    alphaY: aH,
    alphaProduct: aCx,
    alphaH: aH,
    alphaOH: aOH,
    alphaL: aL,
    alphaComplex: aCx,
    cLFree,
  };
}

/** log K′ of a primary reaction at a given pH. */
export function condLogKPrimary(logKf: number, pH: number, stack: SideReactionStack): number {
  const { alphaM, alphaY, alphaProduct } = composeAlphas(pH, stack);
  return condLogK(logKf, { alphaM, alphaY, alphaProduct });
}

export interface CondLogKCurveResult {
  pHs: number[];
  logKs: number[];
  logAlphaH: number[];
  logAlphaOH: number[];
  logAlphaL: number[];
  logAlphaComplex: number[];
}

/** log K′ = f(pH) curve with the full stack. */
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
    logKs.push(condLogK(logKf, {
      alphaM: br.alphaM,
      alphaY: br.alphaY,
      alphaProduct: br.alphaProduct,
    }));
    logAlphaH.push(Math.log10(br.alphaH));
    logAlphaOH.push(Math.log10(br.alphaOH));
    logAlphaL.push(Math.log10(br.alphaL));
    logAlphaComplex.push(Math.log10(br.alphaComplex));
  }
  return { pHs, logKs, logAlphaH, logAlphaOH, logAlphaL, logAlphaComplex };
}

/** Multiple primary reactions (e.g. NiGly, NiGly₂, NiGly₃). */
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

/** log S′ = f(pH) for M(OH)_n with full masking via stack (metal side reactions only). */
export function hydroxideSolCurveMasked(
  pKsp: number,
  n: number,
  stack: SideReactionStack,
  pHRange: [number, number] = [0, 14],
  points = 500,
  I = 0,
): { pHs: number[]; logS: number[] } {
  // Ksp_app = Ksp_thermo / (γ_M · γ_OH^n) → pKsp_app = pKsp + logγ(n, I) + n·logγ(1, I)
  const pKspApp = I > 0
    ? pKsp + logActivityCoefficient(n, I) + n * logActivityCoefficient(1, I)
    : pKsp;
  const [pHmin, pHmax] = pHRange;
  const pHs: number[] = [];
  const logS: number[] = [];
  const ohBetas = stack.hydrolysis?.logBetasOH ?? [];

  for (let i = 0; i <= points; i++) {
    const pH = pHmin + ((pHmax - pHmin) * i) / points;
    const logFreeMetal = -pKspApp + n * (PKW - pH);
    const br = composeAlphas(pH, stack);
    // α_M for solubility: hydroxo + auxiliary (NH₃, glycinate), without Y-ligand protonation
    const alphaM = br.alphaM;
    pHs.push(pH);
    logS.push(logFreeMetal + Math.log10(alphaM));
  }

  void ohBetas;
  return { pHs, logS };
}

/** log s threshold from analytical concentration C (M): log s_thresh = log10(C). */
export function logSThresholdFromConcentration(cMolar: number): number {
  return Math.log10(Math.max(cMolar, 1e-30));
}

/** Precipitation pH with masked stack. */
export function precipitationPHMasked(
  pKsp: number,
  n: number,
  stack: SideReactionStack,
  logSThreshold: number,
  pHRange: [number, number] = [0, 14],
  direction: 'falling' | 'rising' = 'falling',
  I = 0,
): number | null {
  const { pHs, logS } = hydroxideSolCurveMasked(pKsp, n, stack, pHRange, 1000, I);
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

/**
 * 2D Sillén map with side-reaction masking: dominant regime at (pH, log[M]_total)
 * when a masking ligand (NH₃, glycinate…) competes with hydrolysis for the metal.
 * Same two-regime structure as the unmasked `solubilityRegimeFractions`
 * (conditional.ts) — index 0 = solid M(OH)ₙ(s); indices 1..(nOH+nL+1) =
 * dissolved M/M(OH)₁..ⱼ/M-Lmask₁..ₖ — except the saturation boundary is
 * shifted by α_M(OH)·α_M(L) (matching hydroxideSolCurveMasked) and the
 * dissolved ladder gains the masking ligand's own complexes, evaluated at its
 * pH-dependent free concentration (composeAlphas already resolves whichever
 * LigandSpec mode — free/total/fixedPX — the mask uses).
 */
export function solubilityRegimeFractionsMasked(
  pH: number,
  logM: number,
  pKsp: number,
  n: number,
  stack: SideReactionStack,
  I = 0,
): number[] {
  const pKspApp = I > 0
    ? pKsp + logActivityCoefficient(n, I) + n * logActivityCoefficient(1, I)
    : pKsp;
  const logFreeMetal = -pKspApp + n * (PKW - pH);
  const br = composeAlphas(pH, stack);
  const logSat = logFreeMetal + Math.log10(br.alphaM);

  const logBetasOH = stack.hydrolysis?.logBetasOH ?? [];
  const logBetasL = stack.auxLigand?.logBetasL ?? [];
  const nDissolved = logBetasOH.length + logBetasL.length + 1;

  if (logM > logSat) return [1, ...new Array(nDissolved).fill(0)];
  const pL = br.cLFree > 0 ? -Math.log10(br.cLFree) : Infinity;
  return [0, ...speciationFractions(pH, pL, logBetasOH, logBetasL)];
}

/** Conditional pX′ scale → free coordinating [X] concentration. */
export function concentrationFromPX(pX: number): number {
  return Math.pow(10, -pX);
}

/** Global α_M for exchange (hydrolysis + auxiliary at a given pH). */
export function alphaMetalGlobal(pH: number, stack: SideReactionStack): number {
  const br = composeAlphas(pH, stack);
  return br.alphaM;
}

export interface DistributionParams {
  /** Selectivity constant K^z_H/M. */
  kSelSquared: number;
  /** Charge magnitude of the exchanging metal. */
  charge?: number;
  pH: number;
  stack: SideReactionStack;
  /** [H⁺] in the resin (≈ CI during the experiment) */
  hResin: number;
}

/**
 * Distribution coefficient D = [M]_resin / [M′]_sol.
 * D = K^z · (α_M)^−1 · ([H⁺]_resin/[H⁺]_bulk)^z
 */
export function distributionCoefficient(params: DistributionParams): number {
  const { kSelSquared, pH, stack, hResin, charge = 2 } = params;
  const hBulk = Math.pow(10, -pH);
  const alphaM = alphaMetalGlobal(pH, stack);
  const safeAlpha = Math.max(alphaM, 1e-30);
  const safeHResin = Math.max(hResin, 1e-30);
  return kSelSquared * Math.pow(safeHResin / Math.max(hBulk, 1e-30), Math.max(charge, 0)) / safeAlpha;
}

export interface ExchangeFractionParams {
  d: number;
  /** m_R / V (g/L) */
  r: number;
  /**
   * Capacity factor in meq·g/L of solution equivalent to the exam model.
   * Default CI_meq_g * mR_g / V_L; if capacityFactorMeqPerL is passed it is used directly.
   */
  capacityFactorMeqPerL?: number;
  ciMeqPerG?: number;
  massResinG?: number;
  volumeL?: number;
}

/**
 * Cation fraction in resin: φ = (D·r/F) / (1 + D·r/F).
 * F = CI·(m_R/V) in meq/L when CI is in meq/g.
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

/** Converts legacy condLogKCurve parameters to a stack. */
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
  /** moles of Ni in resin at start */
  nNiResin: number;
  /** EDTA volume (L) */
  vEdta: number;
  /** analytical EDTA concentration (M) */
  cEdta: number;
  logKfNiY: number;
  stack: SideReactionStack;
  pHRange?: [number, number];
}

/**
 * pH that maximises the fraction of Ni complexed with EDTA when eluting the resin (simplified model).
 * Compares K′(pH) · [Y] available against n_Ni in the resin.
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

// ── 3-compartment elution (resin ↔ solution ↔ chelate) ───────────────────────

export interface Elution3CParams extends ElutionParams {
  /** Resin selectivity K²_H/M (same as in distributionCoefficient). */
  kSelSquared: number;
  /** [H⁺] in the resin (M). */
  hResin: number;
  /** Charge magnitude of the retained ion. */
  charge?: number;
}

export interface Elution3CPoint {
  /** Fraction of Ni eluted from resin (free solution + chelate). */
  fractionEluted: number;
  /** Conditional log K′f for Ni–EDTA at the pH. */
  logKprime: number;
  /** log D of the resin (retention power) at the pH. */
  logD: number;
  /** Free [Ni′] in solution (M). */
  mFree: number;
  /** [NiY] chelate (M). */
  chelate: number;
  /** Ni retained in resin (equiv. concentration over V, M). */
  resinHeld: number;
}

/**
 * Coupled 3-compartment balance at a fixed pH.
 *   Resin:    R₂Ni + 2H⁺ ⇌ 2RH + Ni²⁺   →  D = [Ni]_resin / [Ni′]_sol
 *   Solution: Ni′ + Y′ ⇌ NiY            →  K′f = [NiY] / ([Ni′][Y′])
 * Mass balance (over solution volume V = vEdta):
 *   C_Ni = D·m + m + K′f·m·y    with    y = C_Y / (1 + K′f·m)
 * Solved for m = [Ni′] by bisection (g(m) is monotonically increasing).
 */
export function elutionAtPH3C(p: Elution3CParams, pH: number): Elution3CPoint {
  const V = Math.max(p.vEdta, 1e-12);
  const cNi = p.nNiResin / V;          // total Ni referred to solution volume
  const cY = Math.max(p.cEdta, 0);
  const logKp = condLogKPrimary(p.logKfNiY, pH, p.stack);
  const kf = Math.pow(10, logKp);
  const D = distributionCoefficient({
    kSelSquared: p.kSelSquared,
    pH,
    stack: p.stack,
    hResin: p.hResin,
    charge: p.charge,
  });

  if (cNi <= 0) {
    return { fractionEluted: 0, logKprime: logKp, logD: Math.log10(Math.max(D, 1e-30)), mFree: 0, chelate: 0, resinHeld: 0 };
  }

  const g = (m: number) => {
    const y = cY / (1 + kf * m);
    return m * (D + 1) + kf * m * y - cNi;
  };
  let lo = 0;
  let hi = cNi;
  let guard = 0;
  while (g(hi) < 0 && guard < 200) { hi *= 2; guard++; }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) hi = mid; else lo = mid;
  }
  const m = (lo + hi) / 2;
  const y = cY / (1 + kf * m);
  const chelate = kf * m * y;
  const resinHeld = D * m;
  const fractionEluted = Math.min(1, Math.max(0, (m + chelate) / cNi));
  return { fractionEluted, logKprime: logKp, logD: Math.log10(Math.max(D, 1e-30)), mFree: m, chelate, resinHeld };
}

/** Optimal elution pH and fraction-eluted(pH) curve with the 3-compartment model. */
export function optimalElutionPH3C(
  p: Elution3CParams,
  pHRange: [number, number] = [2, 12],
  points = 220,
): { pH: number; fractionEluted: number; logKprime: number; pHs: number[]; fractions: number[] } {
  const [lo, hi] = pHRange;
  const pHs: number[] = [];
  const fractions: number[] = [];
  let best = { pH: lo, frac: -1, logKp: 0 };
  for (let i = 0; i <= points; i++) {
    const pH = lo + ((hi - lo) * i) / points;
    const r = elutionAtPH3C(p, pH);
    pHs.push(pH);
    fractions.push(r.fractionEluted);
    if (r.fractionEluted > best.frac) best = { pH, frac: r.fractionEluted, logKp: r.logKprime };
  }
  return { pH: best.pH, fractionEluted: best.frac, logKprime: best.logKp, pHs, fractions };
}

/** Nernst electrode potential for M^n+ + n e⁻ ⇌ M(s): E = E°′ − (S/n)·pM, pM = −log[M]. */
export function electrodePotential(
  e0Prime: number,
  n: number,
  pM: number,
): number {
  const s = 0.05916;
  return e0Prime - (s / n) * pM;
}

/** E°′(pH) for a couple with mH protons: E°′ = E° − S·(mH/n)·pH. */
export function e0PrimeAtPH(e0: number, mH: number, n: number, pH: number): number {
  return e0 - 0.05916 * (mH / n) * pH;
}

// ── Shared state for SideReactionEditor ──────────────────────────────────────

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

/** D(pH) and φ(pH) curves for competitive cation exchange with H⁺. */
export function exchangeDistributionCurve(
  kSelSquared: number,
  stack: SideReactionStack,
  hResin: number,
  ciMeqPerG: number,
  massResinG: number,
  volumeL: number,
  pHRange: [number, number] = [1, 14],
  points = 200,
  charge = 2,
): { pHs: number[]; logD: number[]; phi: number[] } {
  const r = massResinG / volumeL;
  const capacity = (ciMeqPerG * massResinG) / volumeL;
  const pHs: number[] = [];
  const logD: number[] = [];
  const phi: number[] = [];
  for (let i = 0; i <= points; i++) {
    const pH = pHRange[0] + ((pHRange[1] - pHRange[0]) * i) / points;
    const d = distributionCoefficient({ kSelSquared, pH, stack, hResin, charge });
    pHs.push(pH);
    logD.push(Math.log10(Math.max(d, 1e-30)));
    phi.push(resinExchangeFraction({ d, r, capacityFactorMeqPerL: capacity }));
  }
  return { pHs, logD, phi };
}
