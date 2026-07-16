import { alphaFractions, saltCounterIons } from './equilibrium';

export function absorbanceFromComposition(
  concentrations: number[],
  molarAbsorptivities: number[],
  pathLengthCM = 1,
): number {
  return pathLengthCM * concentrations.reduce((sum, concentration, index) =>
    sum + concentration * (molarAbsorptivities[index] ?? 0), 0);
}

export function conductivityFromComposition(
  concentrations: number[],
  molarConductivities: number[],
): number {
  return concentrations.reduce((sum, concentration, index) =>
    sum + concentration * (molarConductivities[index] ?? 0), 0);
}

export interface AcidBaseObservableParams {
  volumesML: number[];
  pHs: number[];
  cAnalyte: number;
  vAnalyteML: number;
  cTitrant: number;
  titrantIsAcid: boolean;
  analyteKind: 'equilibrium' | 'strong-acid' | 'strong-base';
  z0?: number;
  pKas?: number[];
  startIndex?: number;
  productIndex?: number;
  pKw?: number;
  lambdaH?: number;
  lambdaOH?: number;
  lambdaSpectator?: number;
  productEpsilon?: number;
}

/** Beer–Lambert absorbance of the target ladder species along a shared pH/V curve. */
export function acidBaseOpticalFromCurve(params: AcidBaseObservableParams): {
  volumes: number[];
  absorbance: number[];
} {
  const {
    volumesML, pHs, cAnalyte, vAnalyteML, cTitrant, analyteKind,
    pKas = [], productIndex = 0, productEpsilon = 100,
  } = params;
  const absorbance = volumesML.map((volume, index) => {
    const vTotal = vAnalyteML + volume;
    const cAnalyteDil = cAnalyte * vAnalyteML / vTotal;
    let productConc: number;
    if (analyteKind === 'equilibrium' && pKas.length > 0) {
      const alphas = alphaFractions(Math.pow(10, -pHs[index]), pKas);
      productConc = (alphas[productIndex] ?? 0) * cAnalyteDil;
    } else {
      const vEq = (cAnalyte * vAnalyteML) / cTitrant;
      productConc = Math.min(volume / Math.max(vEq, 1e-300), 1) * cAnalyteDil;
    }
    return absorbanceFromComposition([productConc], [productEpsilon]);
  });
  return { volumes: volumesML, absorbance };
}

/** Conductivity derived from the same pH/V points as the titration curve. */
export function acidBaseConductometricFromCurve(params: AcidBaseObservableParams): {
  volumes: number[];
  conductivity: number[];
} {
  const {
    volumesML, pHs, cAnalyte, vAnalyteML, cTitrant, analyteKind,
    z0 = 0, pKas = [], startIndex = 0, pKw = 14,
    lambdaH = 350, lambdaOH = 200, lambdaSpectator = 50,
  } = params;
  const saltIons = saltCounterIons(z0, startIndex);
  const conductivity = volumesML.map((volume, index) => {
    const vTotal = vAnalyteML + volume;
    const cAnalyteDil = cAnalyte * vAnalyteML / vTotal;
    const cTitrantDil = cTitrant * volume / vTotal;
    const h = Math.pow(10, -pHs[index]);
    const oh = Math.pow(10, pHs[index] - pKw);
    const concentrations: number[] = [h, oh];
    const lambdas: number[] = [lambdaH, lambdaOH];
    if (analyteKind === 'strong-acid') {
      concentrations.push(cAnalyteDil);
      lambdas.push(lambdaSpectator);
    } else if (analyteKind === 'strong-base') {
      concentrations.push(cAnalyteDil);
      lambdas.push(lambdaSpectator);
    } else if (pKas.length > 0) {
      const alphas = alphaFractions(h, pKas);
      alphas.forEach((fraction, speciesIndex) => {
        const charge = z0 - speciesIndex;
        if (charge !== 0) {
          concentrations.push(fraction * cAnalyteDil);
          lambdas.push(lambdaSpectator);
        }
      });
      if (saltIons.cations > 0) {
        concentrations.push(saltIons.cations * cAnalyteDil);
        lambdas.push(lambdaSpectator);
      }
      if (saltIons.anions > 0) {
        concentrations.push(saltIons.anions * cAnalyteDil);
        lambdas.push(lambdaSpectator);
      }
    }
    concentrations.push(cTitrantDil);
    lambdas.push(lambdaSpectator);
    return conductivityFromComposition(concentrations, lambdas);
  });
  return { volumes: volumesML, conductivity };
}

export function strongAcidConductometricCurve(params: {
  cAcid: number;
  vAcidML: number;
  cBase: number;
  vMaxML: number;
  lambdaH: number;
  lambdaOH: number;
  lambdaSpectator: number;
  points?: number;
}): { volumes: number[]; conductivity: number[]; vEq: number } {
  const points = params.points ?? 300;
  const acidMoles = params.cAcid * params.vAcidML / 1000;
  const vEq = 1000 * acidMoles / params.cBase;
  const volumes: number[] = [];
  const conductivity: number[] = [];
  for (let i = 0; i <= points; i++) {
    const v = params.vMaxML * i / points;
    const baseMoles = params.cBase * v / 1000;
    const totalVolume = (params.vAcidML + v) / 1000;
    const h = Math.max(acidMoles - baseMoles, 0) / totalVolume;
    const oh = Math.max(baseMoles - acidMoles, 0) / totalVolume;
    const spectator = (acidMoles + baseMoles) / totalVolume;
    volumes.push(v);
    conductivity.push(conductivityFromComposition(
      [h, oh, spectator], [params.lambdaH, params.lambdaOH, params.lambdaSpectator],
    ));
  }
  return { volumes, conductivity, vEq };
}
