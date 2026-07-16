export interface EndpointErrorResult {
  volumeTP: number;
  absoluteErrorMoles: number;
  relativeErrorPercent: number;
  volumeError: number;
  estimatedSigmaVolume?: number;
}

export function endpointFromCurve(params: {
  volumes: number[];
  signal: number[];
  endpointSignal: number;
  equivalenceVolume: number;
  titrantConcentration: number;
  analyteMoles: number;
  transitionWidth?: number;
}): EndpointErrorResult {
  let volumeTP = NaN;
  let localSlope = NaN;
  for (let i = 1; i < params.volumes.length; i++) {
    const y0 = params.signal[i - 1] - params.endpointSignal;
    const y1 = params.signal[i] - params.endpointSignal;
    if (y0 === 0 || y0 * y1 <= 0) {
      const fraction = y1 === y0 ? 0 : -y0 / (y1 - y0);
      volumeTP = params.volumes[i - 1] + fraction * (params.volumes[i] - params.volumes[i - 1]);
      localSlope = (params.signal[i] - params.signal[i - 1]) / (params.volumes[i] - params.volumes[i - 1]);
      break;
    }
  }
  const volumeError = volumeTP - params.equivalenceVolume;
  const absoluteErrorMoles = volumeError * params.titrantConcentration / 1000;
  return {
    volumeTP,
    volumeError,
    absoluteErrorMoles,
    relativeErrorPercent: 100 * absoluteErrorMoles / params.analyteMoles,
    estimatedSigmaVolume: params.transitionWidth && Number.isFinite(localSlope)
      ? params.transitionWidth / Math.abs(localSlope) : undefined,
  };
}

function dilutionAwareEndpointVolume(params: {
  analyteConcentration: number;
  analyteVolumeML: number;
  titrantConcentration: number;
  stoichiometricFactor: number;
  netIonExcess: number;
}): number {
  const { analyteConcentration: c0, analyteVolumeML: v0, titrantConcentration: ct, stoichiometricFactor: f, netIonExcess: d } = params;
  const denom = ct - d;
  if (Math.abs(denom) < 1e-300) return NaN;
  return v0 * (c0 * f + d) / denom;
}

export function acidBaseEndpointError(params: {
  kind: 'strong-acid' | 'weak-acid' | 'weak-base';
  endpointPH: number;
  analyteConcentration: number;
  analyteVolumeML?: number;
  titrantConcentration?: number;
  pKa?: number;
  pKw?: number;
}): EndpointErrorResult {
  const c0 = params.analyteConcentration;
  const v0 = params.analyteVolumeML ?? 1;
  const ct = params.titrantConcentration ?? c0;
  const pKw = params.pKw ?? 14;
  const h = Math.pow(10, -params.endpointPH);
  const oh = Math.pow(10, params.endpointPH - pKw);
  let stoichiometricFactor: number;
  let netIonExcess: number;
  if (params.kind === 'strong-acid') {
    stoichiometricFactor = 1;
    netIonExcess = oh - h;
  } else if (params.kind === 'weak-acid') {
    const ka = Math.pow(10, -(params.pKa ?? 7));
    stoichiometricFactor = ka / (ka + h);
    netIonExcess = oh - h;
  } else {
    const ka = Math.pow(10, -(params.pKa ?? 7));
    stoichiometricFactor = h / (h + ka);
    netIonExcess = h - oh;
  }
  const equivalenceVolume = c0 * v0 / ct;
  const volumeTP = dilutionAwareEndpointVolume({
    analyteConcentration: c0,
    analyteVolumeML: v0,
    titrantConcentration: ct,
    stoichiometricFactor,
    netIonExcess,
  });
  const volumeError = volumeTP - equivalenceVolume;
  const analyteMoles = c0 * v0 / 1000;
  const absoluteErrorMoles = volumeError * ct / 1000;
  return { volumeTP, volumeError, absoluteErrorMoles, relativeErrorPercent: 100 * absoluteErrorMoles / analyteMoles };
}
