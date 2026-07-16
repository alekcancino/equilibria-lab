export interface GlycineMicrostateConstants {
  /** H2A+ -> zwitterion + H+ */
  pKaToZwitterion: number;
  /** zwitterion -> A- + H+ */
  pKaFromZwitterion: number;
  /** H2A+ -> neutral HA + H+ */
  pKaToNeutral: number;
  /** neutral HA -> A- + H+ */
  pKaFromNeutral: number;
}

export function glycineMacroConstants(constants: GlycineMicrostateConstants): {
  pKa1: number;
  pKa2: number;
  tautomerizationK: number;
  pI: number;
  cycleErrorLogK: number;
} {
  const kaZ = Math.pow(10, -constants.pKaToZwitterion);
  const kaN = Math.pow(10, -constants.pKaToNeutral);
  const macroKa1 = kaZ + kaN;
  const pathLogKZ = -(constants.pKaToZwitterion + constants.pKaFromZwitterion);
  const pathLogKN = -(constants.pKaToNeutral + constants.pKaFromNeutral);
  const pathK = Math.pow(10, pathLogKZ);
  const macroKa2 = pathK / macroKa1;
  const pKa1 = -Math.log10(macroKa1);
  const pKa2 = -Math.log10(macroKa2);
  return {
    pKa1,
    pKa2,
    tautomerizationK: kaZ / kaN,
    pI: 0.5 * (pKa1 + pKa2),
    cycleErrorLogK: pathLogKZ - pathLogKN,
  };
}

export function glycineMicrostateFractions(
  constants: GlycineMicrostateConstants,
  pH: number,
): { protonated: number; zwitterion: number; neutral: number; deprotonated: number } {
  const h = Math.pow(10, -pH);
  const kaZ = Math.pow(10, -constants.pKaToZwitterion);
  const kaN = Math.pow(10, -constants.pKaToNeutral);
  const pathK = Math.pow(10, -(constants.pKaToZwitterion + constants.pKaFromZwitterion));
  const weights = [h * h, kaZ * h, kaN * h, pathK];
  const total = weights.reduce((sum, value) => sum + value, 0);
  return {
    protonated: weights[0] / total,
    zwitterion: weights[1] / total,
    neutral: weights[2] / total,
    deprotonated: weights[3] / total,
  };
}

