// Ion exchange: selectivity and equilibrium distribution, general z_A:z_B
// stoichiometry (z_A = z_B = 1 reduces exactly to the binary 1:1 model).

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
  /**
   * Selectivity coefficient (Gaines-Thomas convention):
   * K_A/B = (y_A^zB · c_B^zA) / (y_B^zA · c_A^zB). Reduces to the plain
   * (y_A·c_B)/(y_B·c_A) form when zA = zB = 1.
   */
  selectivityAB: number;
  /** Charge of cation A (default 1 — binary 1:1 exchange, backward compatible). */
  zA?: number;
  /** Charge of cation B (default 1). */
  zB?: number;
}

export interface IonExchangeResult {
  cAeq: number;
  cBeq: number;
  fracAInResin: number;
  fracBInResin: number;
  percentAOnResin: number;
}

export interface CompetitiveExchangeIon {
  label: string;
  c0: number;
  charge: number;
  kSelectivity: number;
  alpha?: number;
}

export interface CompetitiveExchangeResult {
  aqueous: number[];
  counterIonAqueous: number;
  resinFractions: number[];
  counterIonResinFraction: number;
  massErrors: number[];
  equivalentError: number;
}

/**
 * Competitive Gaines–Thomas equilibrium for N ions on one initially
 * counter-ion-form resin. Charge magnitudes work for cationic or anionic resin modes.
 */
export function competitiveIonExchange(params: {
  ions: CompetitiveExchangeIon[];
  counterIonConcentration: number;
  counterIonCharge?: number;
  capacityEq: number;
  solutionVolume: number;
}): CompetitiveExchangeResult {
  const { ions, counterIonConcentration, capacityEq, solutionVolume } = params;
  const zCounter = params.counterIonCharge ?? 1;
  const Q = Math.max(capacityEq, 0);
  const V = Math.max(solutionVolume, 1e-30);

  const fractionsAt = (yCounter: number): number[] => {
    const occupied = 1 - yCounter;
    const cCounter = counterIonConcentration + Q * occupied / (zCounter * V);
    return ions.map((ion) => {
      const z = Math.max(ion.charge, 1);
      const alpha = Math.max(ion.alpha ?? 1, 1);
      const effectiveC = Math.max(ion.c0, 0) / alpha;
      // Unequal-charge Gaines–Thomas constants use resin equivalents as the
      // standard state, so converting them to site fractions introduces this factor.
      const standardState = Q > 0
        ? Math.pow(V / Q, z / zCounter - 1)
        : 1;
      const A = Math.max(ion.kSelectivity, 0)
        * standardState
        * Math.pow(yCounter, z / zCounter)
        / Math.pow(Math.max(cCounter, 1e-300), z / zCounter);
      return A * effectiveC / (1 + A * Q / (z * V));
    });
  };

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    const sum = fractionsAt(mid).reduce((a, b) => a + b, 0);
    if (sum > 1 - mid) hi = mid;
    else lo = mid;
  }
  const yCounter = (lo + hi) / 2;
  const resinFractions = fractionsAt(yCounter);
  const aqueous = ions.map((ion, index) => Math.max(
    ion.c0 - Q * resinFractions[index] / (Math.max(ion.charge, 1) * V),
    0,
  ));
  const occupied = resinFractions.reduce((a, b) => a + b, 0);
  const counterIonAqueous = counterIonConcentration + Q * occupied / (zCounter * V);
  const massErrors = ions.map((ion, index) => aqueous[index] * V
    + Q * resinFractions[index] / Math.max(ion.charge, 1)
    - ion.c0 * V);
  const equivalentError = occupied + yCounter - 1;
  return {
    aqueous,
    counterIonAqueous,
    resinFractions,
    counterIonResinFraction: yCounter,
    massErrors,
    equivalentError,
  };
}

/**
 * Batch equilibrium: resin initially in form B exchanges with A in solution,
 * zB·A^zA + zA·B̄^zB ⇌ zB·Ā^zA + zA·B^zB. The exchange variable ζ tracks
 * EQUIVALENTS of A adsorbed (not moles): each mole of A removed from
 * solution carries zA equivalents, so nA drops by ζ/zA; each mole of B
 * released carries zB equivalents, so nB rises by ζ/zB. zA = zB = 1 makes
 * ζ moles-of-A-adsorbed and reduces every formula to the original 1:1 code.
 */
export function batchIonExchange(params: IonExchangeParams): IonExchangeResult {
  const { cA0, cB0, resinCapacity, volume, resinVolume, selectivityAB: K } = params;
  const zA = params.zA ?? 1;
  const zB = params.zB ?? 1;
  const Q = resinCapacity * resinVolume;
  const nA0 = cA0 * volume;
  const nB0 = cB0 * volume;
  const zetaMax = Math.min(zA * nA0, Q);

  const f = (zeta: number): number => {
    if (zeta <= 0 || zeta >= zetaMax || zeta >= Q) return -1;
    const cA = (nA0 - zeta / zA) / volume;
    const cB = (nB0 + zeta / zB) / volume;
    const yA = zeta / Q;
    const yB = (Q - zeta) / Q;
    return Math.pow(yA, zB) * Math.pow(cB, zA) - K * Math.pow(yB, zA) * Math.pow(cA, zB);
  };

  let lo = 1e-12;
  let hi = zetaMax * (1 - 1e-9);
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
  const zeta = (lo + hi) / 2;
  const cAeq = (nA0 - zeta / zA) / volume;
  const cBeq = (nB0 + zeta / zB) / volume;
  const fracAInResin = zeta / Q;
  const fracBInResin = (Q - zeta) / Q;
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
