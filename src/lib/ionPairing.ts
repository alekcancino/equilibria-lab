const R = 8.31446261815324;

export interface IonPairConstants {
  ionization: number;
  dissociation: number;
}

/** Overall free-ion acidity is the product of ionization and pair dissociation. */
export function overallIonizationConstant(constants: IonPairConstants): number {
  return constants.ionization * constants.dissociation;
}

export function ionPairFractions(constants: IonPairConstants): {
  molecular: number;
  ionPair: number;
  freeIons: number;
} {
  const molecularWeight = 1;
  const pairWeight = Math.max(constants.ionization, 0);
  const freeWeight = pairWeight * Math.max(constants.dissociation, 0);
  const total = molecularWeight + pairWeight + freeWeight;
  return {
    molecular: molecularWeight / total,
    ionPair: pairWeight / total,
    freeIons: freeWeight / total,
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

