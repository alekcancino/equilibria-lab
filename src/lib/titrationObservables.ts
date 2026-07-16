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
