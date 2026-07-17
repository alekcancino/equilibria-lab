export interface ConditionalSalt {
  label: string;
  pKsp: number;
  m: number;
  x: number;
  alphaM: number;
  alphaX: number;
}

/** pKsp on analytical M′/X′ concentrations when both ions have side reactions. */
export function conditionalPKsp(salt: ConditionalSalt): number {
  return salt.pKsp
    - salt.m * Math.log10(Math.max(salt.alphaM, 1e-300))
    - salt.x * Math.log10(Math.max(salt.alphaX, 1e-300));
}

/** Molar solubility of M_mX_x with independent side-reaction coefficients. */
export function conditionalMolarSolubility(salt: ConditionalSalt): number {
  const ksp = Math.pow(10, -salt.pKsp);
  const numerator = ksp
    * Math.pow(Math.max(salt.alphaM, 1e-300), salt.m)
    * Math.pow(Math.max(salt.alphaX, 1e-300), salt.x);
  const stoich = Math.pow(salt.m, salt.m) * Math.pow(salt.x, salt.x);
  return Math.pow(numerator / stoich, 1 / (salt.m + salt.x));
}

/** Total dissolved metal at fixed free counter-ion concentration. */
export function solubilityWithCationComplexation(
  pKsp: number,
  freeCounterIon: number,
  counterIonExponent: number,
  alphaMetal: number,
): number {
  const freeMetal = Math.pow(10, -pKsp)
    / Math.pow(Math.max(freeCounterIon, 1e-300), counterIonExponent);
  return freeMetal * Math.max(alphaMetal, 1);
}

export interface PrecipitationStage {
  label: string;
  freePrecipitantOnset: number;
  conditionalPKsp: number;
}

/** Orders any number of candidate solids by their conditional precipitation onset. */
export function orderPrecipitationStages(stages: PrecipitationStage[]): PrecipitationStage[] {
  return [...stages].sort((a, b) => a.freePrecipitantOnset - b.freePrecipitantOnset);
}

export interface SharedPrecipitationSalt {
  label: string;
  pKsp: number;
  m: number;
  x: number;
  /** Initial amount of formula units in moles. */
  totalFormulaMoles: number;
  /** Analytical/free coefficient for the metal component. */
  alphaM: number;
}

export interface SharedPrecipitationResult {
  freePrecipitant: number;
  dissolvedFormulaMoles: number[];
  precipitatedFormulaMoles: number[];
  dissolvedPrecipitantMoles: number;
  solidPrecipitantMoles: number;
  precipitantBalanceError: number;
}

/**
 * Equilibrates N solids against one finite precipitant pool. Volumes are in L,
 * so molar concentrations and mole balances remain explicit and no solid can
 * consume an independently duplicated copy of the same precipitant.
 */
export function sharedPrecipitationEquilibrium(params: {
  salts: SharedPrecipitationSalt[];
  totalPrecipitantMoles: number;
  volume: number;
  alphaX?: number;
}): SharedPrecipitationResult {
  const volume = Math.max(params.volume, 1e-30);
  const totalX = Math.max(params.totalPrecipitantMoles, 0);
  const alphaX = Math.max(params.alphaX ?? 1, 1);

  const amountsAt = (freeX: number) => params.salts.map((salt) => {
    const m = Math.max(salt.m, 1);
    const x = Math.max(salt.x, 1);
    const alphaM = Math.max(salt.alphaM, 1);
    const saturationFormulaConc = alphaM / m * Math.pow(
      Math.pow(10, -salt.pKsp) / Math.pow(Math.max(freeX, 1e-300), x),
      1 / m,
    );
    return Math.min(Math.max(salt.totalFormulaMoles, 0), saturationFormulaConc * volume);
  });

  const balanceAt = (freeX: number) => {
    const dissolved = amountsAt(freeX);
    const solidX = params.salts.reduce((sum, salt, index) => (
      sum + Math.max(salt.totalFormulaMoles - dissolved[index], 0) * Math.max(salt.x, 1)
    ), 0);
    return alphaX * freeX * volume + solidX;
  };

  let lo = 0;
  let hi = Math.max(totalX / (alphaX * volume), 1e-30);
  for (let i = 0; i < 180; i++) {
    const mid = (lo + hi) / 2;
    if (balanceAt(mid) > totalX) hi = mid;
    else lo = mid;
  }
  const freePrecipitant = (lo + hi) / 2;
  const dissolvedFormulaMoles = amountsAt(freePrecipitant);
  const precipitatedFormulaMoles = params.salts.map((salt, index) => (
    Math.max(salt.totalFormulaMoles - dissolvedFormulaMoles[index], 0)
  ));
  const dissolvedPrecipitantMoles = alphaX * freePrecipitant * volume;
  const solidPrecipitantMoles = params.salts.reduce((sum, salt, index) => (
    sum + precipitatedFormulaMoles[index] * Math.max(salt.x, 1)
  ), 0);
  return {
    freePrecipitant,
    dissolvedFormulaMoles,
    precipitatedFormulaMoles,
    dissolvedPrecipitantMoles,
    solidPrecipitantMoles,
    precipitantBalanceError: dissolvedPrecipitantMoles + solidPrecipitantMoles - totalX,
  };
}

export interface SequentialPrecipitationStage {
  operatingPH: number;
  result: SharedPrecipitationResult;
}

/**
 * Evaluates the same finite precipitant pool at a user-ordered sequence of pH
 * values. Alpha coefficients are recomputed at each stage; precipitant moles
 * stay conserved across the sequence.
 */
export function sequentialSharedPrecipitation(params: {
  salts: SharedPrecipitationSalt[];
  logBetasOHBySalt: number[][];
  totalPrecipitantMoles: number;
  volume: number;
  alphaX?: number;
  stagePHs: number[];
  alphaMetalAtPH: (logBetasOH: number[], pH: number) => number;
}): SequentialPrecipitationStage[] {
  const { stagePHs, alphaMetalAtPH, volume, alphaX, totalPrecipitantMoles, logBetasOHBySalt } = params;
  return stagePHs.map((operatingPH) => ({
    operatingPH,
    result: sharedPrecipitationEquilibrium({
      salts: params.salts.map((salt, index) => ({
        ...salt,
        alphaM: alphaMetalAtPH(logBetasOHBySalt[index] ?? [], operatingPH),
      })),
      totalPrecipitantMoles,
      volume,
      alphaX,
    }),
  }));
}
