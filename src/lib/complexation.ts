// Multi-ligand coordination complex engine.
// Model M + iL ⇌ MLᵢ with overall stability constants βᵢ.
// Working axis is pL = −log[L]_free.

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
