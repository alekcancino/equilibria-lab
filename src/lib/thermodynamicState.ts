const GAS_CONSTANT = 8.31446261815324;
const FARADAY_CONSTANT = 96485.33212;

export interface ThermodynamicState {
  label: string;
  temperatureC: number;
  pressureMPa: number;
  pKw: number;
  acidityRange: [number, number];
  lioniumLabel: string;
  lyateLabel: string;
}

const WATER_PKW: Record<number, number> = {
  10: 14.528,
  20: 14.163,
  25: 13.995,
  100: 12.264,
};

const WATER_PKW_PRESSURE: Record<number, number> = {
  0.1: 13.995,
  100: 13.668,
};

function waterPKwAt(temperatureC: number, pressureMPa: number): number {
  const temperatures = Object.keys(WATER_PKW).map(Number).sort((a, b) => a - b);
  const exact = WATER_PKW[temperatureC];
  let pKw = exact;
  if (pKw === undefined) {
    const lower = [...temperatures].reverse().find((value) => value < temperatureC) ?? temperatures[0];
    const upper = temperatures.find((value) => value > temperatureC) ?? temperatures[temperatures.length - 1];
    const fraction = lower === upper ? 0 : (temperatureC - lower) / (upper - lower);
    pKw = WATER_PKW[lower] + fraction * (WATER_PKW[upper] - WATER_PKW[lower]);
  }
  if (temperatureC !== 25) return pKw;
  const pressures = Object.keys(WATER_PKW_PRESSURE).map(Number).sort((a, b) => a - b);
  const pExact = WATER_PKW_PRESSURE[pressureMPa];
  if (pExact !== undefined) return pExact;
  const lowerP = [...pressures].reverse().find((value) => value < pressureMPa) ?? pressures[0];
  const upperP = pressures.find((value) => value > pressureMPa) ?? pressures[pressures.length - 1];
  if (lowerP === upperP) return WATER_PKW_PRESSURE[lowerP];
  const fraction = (pressureMPa - lowerP) / (upperP - lowerP);
  return WATER_PKW_PRESSURE[lowerP] + fraction * (WATER_PKW_PRESSURE[upperP] - WATER_PKW_PRESSURE[lowerP]);
}

export function nernstSlope(temperatureC: number): number {
  return GAS_CONSTANT * (temperatureC + 273.15) * Math.LN10 / FARADAY_CONSTANT;
}

export function waterThermodynamicState(
  temperatureC = 25,
  pressureMPa = 0.1,
): ThermodynamicState {
  const pKw = waterPKwAt(temperatureC, pressureMPa);
  return {
    label: 'Water', temperatureC, pressureMPa, pKw,
    acidityRange: [-2, pKw + 2], lioniumLabel: 'H₃O⁺', lyateLabel: 'OH⁻',
  };
}

export function solventThermodynamicState(params: {
  label: string;
  pKAutoionization: number;
  acidityRange?: [number, number];
  lioniumLabel: string;
  lyateLabel: string;
  temperatureC?: number;
  pressureMPa?: number;
}): ThermodynamicState {
  return {
    label: params.label,
    temperatureC: params.temperatureC ?? 25,
    pressureMPa: params.pressureMPa ?? 0.1,
    pKw: params.pKAutoionization,
    acidityRange: params.acidityRange ?? [-2, params.pKAutoionization + 2],
    lioniumLabel: params.lioniumLabel,
    lyateLabel: params.lyateLabel,
  };
}

export const SOLVENT_PRESETS: Record<string, ThermodynamicState> = {
  water: waterThermodynamicState(25),
  dmf: solventThermodynamicState({
    label: 'DMF', pKAutoionization: 30, acidityRange: [-5, 32],
    lioniumLabel: 'DMFH⁺', lyateLabel: 'DMF⁻',
  }),
  ethanol: solventThermodynamicState({
    label: 'Ethanol', pKAutoionization: 19.1, acidityRange: [-3, 22],
    lioniumLabel: 'EtOH₂⁺', lyateLabel: 'EtO⁻',
  }),
};

