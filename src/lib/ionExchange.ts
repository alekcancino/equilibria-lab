// Ion exchange: selectivity and equilibrium distribution (binary 1:1 model).

export interface IonExchangeParams {
  /** Initial concentration of cation A in solution (M) */
  cA0: number;
  /** Initial concentration of cation B in solution (M) */
  cB0: number;
  /** Exchange capacity of the resin (eq/L resin) */
  resinCapacity: number;
  /** Solution volume (L) */
  volume: number;
  /** Resin volume (L) */
  resinVolume: number;
  /** Selectivity coefficient K_A/B = (y_A·x_B)/(y_B·x_A) */
  selectivityAB: number;
}

export interface IonExchangeResult {
  cAeq: number;
  cBeq: number;
  fracAInResin: number;
  fracBInResin: number;
  percentAOnResin: number;
}

/**
 * Batch equilibrium: resin initially in form B exchanges with A in solution.
 * For each eq of A adsorbed, 1 eq of B is released (1:1 exchange).
 */
export function batchIonExchange(params: IonExchangeParams): IonExchangeResult {
  const { cA0, cB0, resinCapacity, volume, resinVolume, selectivityAB: K } = params;
  const Q = resinCapacity * resinVolume;
  const nA0 = cA0 * volume;
  const nB0 = cB0 * volume;
  const zMax = Math.min(nA0, Q);

  const f = (z: number): number => {
    if (z <= 0 || z >= zMax || z >= Q) return -1;
    const cA = (nA0 - z) / volume;
    const cB = (nB0 + z) / volume;
    const yA = z / Q;
    const yB = (Q - z) / Q;
    return yA * cB - K * yB * cA;
  };

  let lo = 1e-12;
  let hi = zMax * (1 - 1e-9);
  if (f(lo) * f(hi) > 0) {
    return {
      cAeq: cA0,
      cBeq: cB0,
      fracAInResin: 0,
      fracBInResin: 1,
      percentAOnResin: 0,
    };
  }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  const z = (lo + hi) / 2;
  const cAeq = (nA0 - z) / volume;
  const cBeq = (nB0 + z) / volume;
  const fracAInResin = z / Q;
  const fracBInResin = (Q - z) / Q;
  return {
    cAeq,
    cBeq,
    fracAInResin,
    fracBInResin,
    percentAOnResin: 100 * fracAInResin,
  };
}

/** Ksel = K_d(A) / K_d(B) from measured distribution coefficients. */
export function selectivityFromKd(kdA: number, kdB: number): number {
  if (kdB <= 0) return Infinity;
  return kdA / kdB;
}

export {
  distributionCoefficient,
  resinExchangeFraction,
  exchangeDistributionCurve,
  optimalElutionPH,
  elutionAtPH3C,
  optimalElutionPH3C,
  alphaMetalGlobal,
  sideStackFromEditor,
  defaultSideEditorState,
} from './sideReactions';
export type {
  SideReactionStack, SideReactionEditorState, ElutionParams,
  Elution3CParams, Elution3CPoint,
} from './sideReactions';

// ─── Craig N-plate multi-ion breakthrough model ────────────────────────────

export interface CraigIon {
  label: string;
  /** Feed concentration (M) */
  c0: number;
  /** Selectivity vs. background counter-ion B: K_{i/B} = (y_i·x_B)/(y_B·x_i) */
  kSel: number;
}

export interface CraigParams {
  ions: CraigIon[];
  /** Resin capacity (eq/L resin) */
  resinCapacity: number;
  /** Resin bed volume (L) */
  resinVolume: number;
  /** Number of Craig theoretical plates — controls front sharpness */
  nPlates: number;
  /** Output BV-axis points (default 200) */
  points?: number;
}

export interface CraigResult {
  /** Bed-volume axis (0 … ~2.5 × BV_break_max) */
  bv: number[];
  /** C_i / C_i0 for each ion; cRatios[i] matches ions[i] */
  cRatios: number[][];
  /** BV at C/C0 = 0.5 for each ion (competitive formula) */
  bvBreaks: number[];
}

/**
 * Craig N-plate analytical model for multi-ion column breakthrough.
 *
 * Each ion i breaks through at BV_break_i = kSel_i · Q / (c_i0 · V_r) where
 * Q = resinCapacity · resinVolume.  With N theoretical plates the front width
 * is σ_i = BV_break_i / √N (Gaussian dispersion), approximated by a sigmoid:
 *   C_i/C_i0 ≈ 1 / (1 + exp(−1.7 · (BV − BV_break_i) / σ_i))
 *
 * Reference: Craig, L.C. (1944). Countercurrent distribution model, applied
 * here to ion-exchange chromatography columns.
 */
export function craigBreakthrough(params: CraigParams): CraigResult {
  const { ions, resinCapacity, nPlates, points = 200 } = params;
  const N = Math.max(nPlates, 1);

  const activeIons = ions.filter((ion) => ion.c0 > 0 && ion.kSel > 0);
  if (activeIons.length === 0) return { bv: [], cRatios: [], bvBreaks: [] };

  // Competitive BV_break: each ion's capacity fraction is K_i·c_i / Σ_j(K_j·c_j).
  // For a single ion this reduces to resinCapacity/c0 — matches breakthroughCurve.
  const kCSum = activeIons.reduce((s, ion) => s + ion.kSel * ion.c0, 0);
  const bvBreaks = activeIons.map((ion) => (ion.kSel * resinCapacity) / kCSum);
  const bvMax = Math.max(...bvBreaks) * 2.5;

  const bv = Array.from({ length: points + 1 }, (_, i) => (bvMax * i) / points);

  const cRatios = activeIons.map((_, i) => {
    const bvBreak = bvBreaks[i];
    const sigma = bvBreak / Math.sqrt(N);
    return bv.map((v) => 1 / (1 + Math.exp((-1.7 * (v - bvBreak)) / sigma)));
  });

  return { bv, cRatios, bvBreaks };
}

/** Equilibrium isotherm: q (eq/L resin) vs. C_A in solution. */
export function isothermCurve(
  params: Omit<IonExchangeParams, 'cA0'> & { cMin: number; cMax: number; points?: number },
): { cA: number[]; q: number[] } {
  const { cMin, cMax, points = 40, ...base } = params;
  const cA: number[] = [];
  const q: number[] = [];
  for (let i = 0; i <= points; i++) {
    const c = cMin + ((cMax - cMin) * i) / points;
    const r = batchIonExchange({ ...base, cA0: c });
    cA.push(c);
    q.push(r.fracAInResin * base.resinCapacity);
  }
  return { cA, q };
}

export interface ColumnParams {
  cA0: number;
  selectivityAB: number;
  resinCapacity: number;
  resinVolume: number;
  flowRate: number; // L/min por unidad de columna
  points?: number;
}

/**
 * Ideal breakthrough curve: C/C0 vs. bed volumes (BV).
 * BV_break ≈ Q·V_res / (cA0·V_col) with a sigmoid around that point.
 */
export function breakthroughCurve(params: ColumnParams): { bedVolumes: number[]; cRatio: number[] } {
  const { cA0, resinCapacity, resinVolume, points = 100 } = params;
  const Q = resinCapacity * resinVolume;
  const bvBreak = cA0 > 0 ? Q / (cA0 * resinVolume) : 10;
  const steepness = 0.35;
  const bedVolumes: number[] = [];
  const cRatio: number[] = [];
  for (let i = 0; i <= points; i++) {
    const bv = (3 * bvBreak * i) / points;
    bedVolumes.push(bv);
    const x = steepness * (bv - bvBreak);
    cRatio.push(1 / (1 + Math.exp(-x)));
  }
  return { bedVolumes, cRatio };
}
