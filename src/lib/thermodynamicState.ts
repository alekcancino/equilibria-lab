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

export function nernstSlope(temperatureC: number): number {
  return GAS_CONSTANT * (temperatureC + 273.15) * Math.LN10 / FARADAY_CONSTANT;
}

export function waterThermodynamicState(
  temperatureC = 25,
  pressureMPa = 0.1,
): ThermodynamicState {
  const temperatures = Object.keys(WATER_PKW).map(Number).sort((a, b) => a - b);
  const exact = WATER_PKW[temperatureC];
  let pKw = exact;
  if (pKw === undefined) {
    const lower = [...temperatures].reverse().find((value) => value < temperatureC) ?? temperatures[0];
    const upper = temperatures.find((value) => value > temperatureC) ?? temperatures[temperatures.length - 1];
    const fraction = lower === upper ? 0 : (temperatureC - lower) / (upper - lower);
    pKw = WATER_PKW[lower] + fraction * (WATER_PKW[upper] - WATER_PKW[lower]);
  }
  if (temperatureC === 25 && Math.abs(pressureMPa - 100) < 1e-9) pKw = 13.668;
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

