/** Bracketed bisection with endpoint sign checks and residual verification. */
export function bracketedBisection(
  residual: (x: number) => number,
  lo: number,
  hi: number,
  options?: { iterations?: number; tolerance?: number },
): { root: number; converged: boolean } {
  const iterations = options?.iterations ?? 140;
  const tolerance = options?.tolerance ?? 1e-10;
  const fLo = residual(lo);
  const fHi = residual(hi);
  if (Math.abs(fLo) < tolerance) return { root: lo, converged: true };
  if (Math.abs(fHi) < tolerance) return { root: hi, converged: true };
  if (fLo * fHi > 0) return { root: NaN, converged: false };
  let a = lo;
  let b = hi;
  let fa = fLo;
  for (let i = 0; i < iterations; i++) {
    const mid = (a + b) / 2;
    const fMid = residual(mid);
    if (Math.abs(fMid) < tolerance) return { root: mid, converged: true };
    if (fa * fMid <= 0) {
      b = mid;
    } else {
      a = mid;
      fa = fMid;
    }
  }
  const root = (a + b) / 2;
  return { root, converged: Math.abs(residual(root)) < tolerance * 1e3 };
}
