// Intercambio iónico: selectividad y reparto en equilibrio (modelo binario 1:1).

export interface IonExchangeParams {
  /** Concentración inicial del catión A en solución (M) */
  cA0: number;
  /** Concentración inicial del catión B en solución (M) */
  cB0: number;
  /** Capacidad de intercambio del resin (eq/L de resina) */
  resinCapacity: number;
  /** Volumen de solución (L) */
  volume: number;
  /** Volumen de resina (L) */
  resinVolume: number;
  /** Coeficiente de selectividad K_A/B = (y_A·x_B)/(y_B·x_A) */
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
 * Equilibrio en lote: resina inicialmente en forma B, intercambia con A en solución.
 * Por cada eq de A adsorbido se libera 1 eq de B (intercambio 1:1).
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

/** Ksel = K_d(A) / K_d(B) a partir de repartos medidos. */
export function selectivityFromKd(kdA: number, kdB: number): number {
  if (kdB <= 0) return Infinity;
  return kdA / kdB;
}

/** Isoterma de equilibrio: q (eq/L resina) vs C_A en solución. */
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
 * Breakthrough ideal: C/C0 vs volúmenes de lecho (BV).
 * BV_break ≈ Q·V_res / (cA0·V_col) con sigmoide alrededor de ese punto.
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
