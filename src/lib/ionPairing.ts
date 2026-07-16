const R = 8.31446261815324;

export interface IonPairConstants {
  ionization: number;
  dissociation: number;
}

/** Overall free-ion acidity is the product of ionization and pair dissociation. */
export function overallIonizationConstant(constants: IonPairConstants): number {
  return constants.ionization * constants.dissociation;
}

/**
 * M + Ki AB; AB + Kd A + B with mass balance C = [M] + [AB] + [A].
 * Ki = [AB]/[M], Kd = [A][B]/[AB], [A] = [B].
 */
export function ionPairFractions(
  constants: IonPairConstants,
  totalConcentration = 1,
): {
  molecular: number;
  ionPair: number;
  freeIons: number;
} {
  const C = Math.max(totalConcentration, 0);
  if (C === 0) return { molecular: 0, ionPair: 0, freeIons: 0 };
  const ki = Math.max(constants.ionization, 0);
  const kd = Math.max(constants.dissociation, 0);
  if (ki === 0 && kd === 0) return { molecular: 1, ionPair: 0, freeIons: 0 };

  const balance = (m: number) => {
    const pair = ki * m;
    const free = Math.sqrt(Math.max(kd * pair, 0));
    return m + pair + free - C;
  };

  let lo = 0;
  let hi = C;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    if (balance(mid) > 0) hi = mid;
    else lo = mid;
  }
  const molecularConc = (lo + hi) / 2;
  const ionPairConc = ki * molecularConc;
  const freeConc = Math.sqrt(Math.max(kd * ionPairConc, 0));
  return {
    molecular: molecularConc / C,
    ionPair: ionPairConc / C,
    freeIons: freeConc / C,
  };
}

/** ΔG° = -RT ln K; positive transfer means the target medium is less favorable. */
export function standardFreeEnergyFromK(K: number, temperatureC = 25): number {
  return -R * (temperatureC + 273.15) * Math.log(Math.max(K, 1e-300));
}

export function equilibriumConstantFromFreeEnergy(deltaGJMol: number, temperatureC = 25): number {
  return Math.exp(-deltaGJMol / (R * (temperatureC + 273.15)));
}

export function transferCycle(params: {
  sourceK: number;
  reactantTransferK: number;
  productTransferK: number;
}): { targetK: number; cycleDeltaG: number } {
  const targetK = params.sourceK * params.productTransferK / Math.max(params.reactantTransferK, 1e-300);
  const cycleDeltaG = standardFreeEnergyFromK(params.sourceK)
    + standardFreeEnergyFromK(params.productTransferK)
    - standardFreeEnergyFromK(params.reactantTransferK)
    - standardFreeEnergyFromK(targetK);
  return { targetK, cycleDeltaG };
}
