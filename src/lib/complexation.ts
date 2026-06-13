// Motor de complejos de coordinación multi-ligante.
// Modelo M + iL ⇌ MLᵢ con constantes globales de estabilidad βᵢ.
// El eje de trabajo es pL = −log[L]_libre.

/**
 * Convierte log β globales en log K escalonadas sucesivas.
 * logKᵢ = logβᵢ − logβᵢ₋₁  (logβ₀ = 0)
 * Las logK sucesivas son lo que necesita ladderFractions/predominanceZones.
 */
export function logBetasToStepwise(logBetas: number[]): number[] {
  return logBetas.map((b, i) => (i === 0 ? b : b - logBetas[i - 1]));
}

/**
 * Fracciones de distribución α de M, ML, ML₂, ..., MLₙ a un pL dado.
 * αᵢ = βᵢ·[L]ⁱ / (1 + Σ βⱼ·[L]ʲ), trabajado en espacio logarítmico para
 * evitar overflow con β grandes.
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
 * Número de ligación medio de Bjerrum: n̄ = Σ(i · αᵢ).
 * Curva diagnóstica: sus inflexiones coinciden aproximadamente con log Kᵢ sucesivas.
 */
export function bjerrumNumber(pL: number, logBetas: number[]): number {
  return complexFractions(pL, logBetas).reduce((s, a, i) => s + i * a, 0);
}

/**
 * Resuelve el pL libre de equilibrio dado cM y cL totales, por bisección
 * sobre el balance de masa del ligando:
 *   cL = [L]_libre + cM · n̄([L]_libre)
 *   g(pL) = cL − 10^(−pL) − cM · n̄(pL)
 * g es monotónamente creciente en pL → bisección directa.
 * Retorna Infinity si cL = 0 (sin ligando).
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
  // Verificar que la bisección convergió a una solución física válida.
  // Si cL < cM·n̄_max el balance de masa del ligando no tiene solución real.
  const residual = cL - Math.pow(10, -result) - cM * bjerrumNumber(result, logBetas);
  if (Math.abs(residual) > 1e-6 * (cL + 1e-15)) return NaN;
  return result;
}
