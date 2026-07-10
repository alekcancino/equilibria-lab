// Multi-ligand coordination complex engine.
// Model M + iL ⇌ MLᵢ with overall stability constants βᵢ.
// Working axis is pL = −log[L]_free.
//
// Two-ligand extension (X–M–L): M distributed simultaneously over two branches,
// ML₁…MLₙ and MX₁…MXₘ, sharing one free-metal denominator
// D = 1 + Σβ_L,i[L]ⁱ + Σβ_X,k[X]ᵏ — a coupled equilibrium, unlike the Ringbom
// α_M axis shift, which is exact only when [X] is fixed. Mononuclear only;
// mixed MXL species are not modeled (same assumption as speciation.ts).
// Species order is fixed: [M, ML₁…MLₙ, MX₁…MXₘ].

import { alphaH } from './conditional';
import type { LigandSpec, SideReactionEditorState } from './sideReactions';

/**
 * Converts overall log β to successive stepwise log K.
 * logKᵢ = logβᵢ − logβᵢ₋₁  (logβ₀ = 0)
 * Stepwise logK values are what ladderFractions/predominanceZones need.
 */
export function logBetasToStepwise(logBetas: number[]): number[] {
  return logBetas.map((b, i) => (i === 0 ? b : b - logBetas[i - 1]));
}

/**
 * α distribution fractions of M, ML, ML₂, ..., MLₙ at a given pL.
 * αᵢ = βᵢ·[L]ⁱ / (1 + Σ βⱼ·[L]ʲ), computed in log-space to avoid
 * overflow with large β values.
 */
export function complexFractions(pL: number, logBetas: number[]): number[] {
  const logL = -pL;
  const logTerms = [0, ...logBetas.map((lb, i) => lb + (i + 1) * logL)];
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const D = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / D);
}

/**
 * Bjerrum mean ligand number: n̄ = Σ(i · αᵢ).
 * Diagnostic curve: its inflections occur approximately at successive stepwise log Kᵢ.
 */
export function bjerrumNumber(pL: number, logBetas: number[]): number {
  return complexFractions(pL, logBetas).reduce((s, a, i) => s + i * a, 0);
}

/**
 * Solves the free equilibrium pL given total cM and cL, by bisection
 * on the ligand mass balance:
 *   cL = [L]_free + cM · n̄([L]_free)
 *   g(pL) = cL − 10^(−pL) − cM · n̄(pL)
 * g is monotonically increasing in pL → direct bisection.
 * Returns Infinity if cL = 0 (no ligand).
 */
export function solvePL(cM: number, cL: number, logBetas: number[]): number {
  if (cL <= 0) return Infinity;
  const maxBeta = logBetas[logBetas.length - 1];
  let lo = -1;
  let hi = maxBeta + 8;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const g = cL - Math.pow(10, -mid) - cM * bjerrumNumber(mid, logBetas);
    if (g > 0) hi = mid;
    else lo = mid;
  }
  const result = (lo + hi) / 2;
  // Verify that bisection converged to a physically valid solution.
  // If cL < cM·n̄_max the ligand mass balance has no real solution.
  const residual = cL - Math.pow(10, -result) - cM * bjerrumNumber(result, logBetas);
  if (Math.abs(residual) > 1e-6 * (cL + 1e-15)) return NaN;
  return result;
}

// ── Two-ligand coupled model (X–M–L) ─────────────────────────────────────────

/** Auxiliary complexing agent X competing with the main ligand L for M. */
export interface XBranch {
  /** Overall log β of MX₁ … MXₘ. */
  logBetasX: number[];
  spec: LigandSpec;
}

export interface TwoLigandPoint {
  pL: number;
  /** Free pX consistent with the X branch's spec at this pL. */
  pX: number;
  /** Species fractions in the fixed [M, ML₁…MLₙ, MX₁…MXₘ] order; sums to 1. */
  fractions: number[];
  nBarL: number;
  nBarX: number;
}

/**
 * α distribution over both branches at given free pL and pX, in log-space.
 * pL or pX = Infinity zeroes that branch's terms with no special case
 * (10^(−Infinity) = 0), so the one-ligand model is the X-empty limit.
 */
export function twoLigandFractions(
  pL: number,
  pX: number,
  logBetasL: number[],
  logBetasX: number[],
): number[] {
  const logL = -pL;
  const logX = -pX;
  const logTerms = [
    0,
    ...logBetasL.map((b, i) => b + (i + 1) * logL),
    ...logBetasX.map((b, k) => b + (k + 1) * logX),
  ];
  const maxLog = Math.max(...logTerms);
  const terms = logTerms.map((lt) => Math.pow(10, lt - maxLog));
  const D = terms.reduce((a, b) => a + b, 0);
  return terms.map((t) => t / D);
}

/** Mean bound ligands per M, split by branch: n̄_L = Σi·α_MLᵢ, n̄_X = Σk·α_MXₖ. */
export function twoLigandNBars(
  pL: number,
  pX: number,
  logBetasL: number[],
  logBetasX: number[],
): { nBarL: number; nBarX: number } {
  const fr = twoLigandFractions(pL, pX, logBetasL, logBetasX);
  const nL = logBetasL.length;
  let nBarL = 0;
  let nBarX = 0;
  for (let i = 0; i < nL; i++) nBarL += (i + 1) * fr[1 + i];
  for (let k = 0; k < logBetasX.length; k++) nBarX += (k + 1) * fr[1 + nL + k];
  return { nBarL, nBarX };
}

/**
 * Free pX of the X branch at a given (hypothetical) pL — for diagram sweeps
 * where pL is the free axis. 'free'/'fixedPX' specs fix pX directly; 'total'
 * solves the X mass balance  cX = [X]·α_X(H) + cM·n̄_X(pL, pX)  by bisection.
 * g(pX) = cX − [X]·α_X(H) − cM·n̄_X is monotonically increasing in pX (both the
 * free term and the bound term shrink as [X] drops), so bisection is safe.
 */
export function solvePXAtPL(
  pL: number,
  cM: number,
  x: XBranch,
  pH: number,
  logBetasL: number[],
): number {
  if (x.logBetasX.length === 0) return Infinity;
  if (x.spec.mode === 'free') return x.spec.cL > 0 ? -Math.log10(x.spec.cL) : Infinity;
  if (x.spec.mode === 'fixedPX') return x.spec.pX;
  const cX = x.spec.cTotal;
  if (cX <= 0) return Infinity;
  const aXH = alphaH(x.spec.pKas, pH);
  let lo = Math.min(-Math.log10(cX), 0) - 1;
  let hi = Math.max(...x.logBetasX) + Math.log10(aXH) + 8;
  const g = (pX: number) =>
    cX - Math.pow(10, -pX) * aXH - cM * twoLigandNBars(pL, pX, logBetasL, x.logBetasX).nBarX;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0) hi = mid;
    else lo = mid;
  }
  const result = (lo + hi) / 2;
  if (Math.abs(g(result)) > 1e-6 * (cX + 1e-15)) return NaN;
  return result;
}

/**
 * Operating point of the coupled system — both mass balances hold at once:
 *   cL = [L] + cM·n̄_L(pL, pX)          (main ligand, no protonation — parity with solvePL)
 *   cX = [X]·α_X(H) + cM·n̄_X(pL, pX)   (only binding when spec is 'total')
 * When [X] is fixed ('free'/'fixedPX') this is 1D bisection in pL. When both
 * are analytical totals it is nested bisection with pX as the outer variable:
 * the outer deficit G(pX) stays monotone even though the inner pL* re-adjusts,
 * because in a competitive-binding system the cross effect (M released from X
 * re-binding L) is always weaker than the direct effect — gross-substitutes
 * property; provable via Var(i)·Var(k) ≥ (n̄_L·n̄_X)² over the branch
 * distributions, which holds whenever free M is nonzero.
 */
export function solveTwoLigandEquilibrium(
  cM: number,
  cL: number,
  logBetasL: number[],
  x: XBranch,
  pH: number,
): { pL: number; pX: number } {
  if (x.logBetasX.length === 0) {
    return { pL: solvePL(cM, cL, logBetasL), pX: Infinity };
  }

  const solvePLAtPX = (pX: number): number => {
    if (cL <= 0) return Infinity;
    if (logBetasL.length === 0) return -Math.log10(cL);
    let lo = Math.min(-Math.log10(cL), 0) - 1;
    let hi = Math.max(...logBetasL) + 8;
    const g = (pL: number) =>
      cL - Math.pow(10, -pL) - cM * twoLigandNBars(pL, pX, logBetasL, x.logBetasX).nBarL;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (g(mid) > 0) hi = mid;
      else lo = mid;
    }
    const result = (lo + hi) / 2;
    if (Math.abs(g(result)) > 1e-6 * (cL + 1e-15)) return NaN;
    return result;
  };

  if (x.spec.mode !== 'total') {
    const pX = solvePXAtPL(Infinity, cM, x, pH, logBetasL);
    return { pL: solvePLAtPX(pX), pX };
  }

  const cX = x.spec.cTotal;
  if (cX <= 0) return { pL: solvePLAtPX(Infinity), pX: Infinity };
  const aXH = alphaH(x.spec.pKas, pH);
  let lo = Math.min(-Math.log10(cX), 0) - 1;
  let hi = Math.max(...x.logBetasX) + Math.log10(aXH) + 8;
  const G = (pX: number) =>
    cX - Math.pow(10, -pX) * aXH - cM * twoLigandNBars(solvePLAtPX(pX), pX, logBetasL, x.logBetasX).nBarX;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (G(mid) > 0) hi = mid;
    else lo = mid;
  }
  const pX = (lo + hi) / 2;
  if (Math.abs(G(pX)) > 1e-6 * (cX + 1e-15)) return { pL: NaN, pX: NaN };
  return { pL: solvePLAtPX(pX), pX };
}

/** Sweeps pL (free axis) and returns one point per sample, with pX re-solved each time. */
export function twoLigandCurve(
  cM: number,
  logBetasL: number[],
  x: XBranch,
  pH: number,
  pLRange: [number, number],
  points = 400,
): TwoLigandPoint[] {
  const [pLmin, pLmax] = pLRange;
  const out: TwoLigandPoint[] = [];
  for (let i = 0; i <= points; i++) {
    const pL = pLmin + ((pLmax - pLmin) * i) / points;
    const pX = solvePXAtPL(pL, cM, x, pH, logBetasL);
    const fractions = twoLigandFractions(pL, pX, logBetasL, x.logBetasX);
    const { nBarL, nBarX } = twoLigandNBars(pL, pX, logBetasL, x.logBetasX);
    out.push({ pL, pX, fractions, nBarL, nBarX });
  }
  return out;
}

/** Builds the X branch from the shared SideReactionEditor state; null = X disabled/empty. */
export function xBranchFromEditor(st: SideReactionEditorState): XBranch | null {
  if (!st.showAux || st.logBetasAux.length === 0) return null;
  let spec: LigandSpec;
  if (st.auxSpecMode === 'total') {
    spec = { mode: 'total', cTotal: st.cAuxTotal, pKas: [...st.auxPKas] };
  } else if (st.auxSpecMode === 'fixedPX') {
    spec = { mode: 'fixedPX', pX: st.pXFixed };
  } else {
    spec = { mode: 'free', cL: st.cAuxFree };
  }
  return { logBetasX: [...st.logBetasAux], spec };
}
