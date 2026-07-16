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
  const h = Math.pow(10, -params.endpointPH);
  const oh = Math.pow(10, params.endpointPH - (params.pKw ?? 14));
  let equivalenceFraction: number;
  if (params.kind === 'strong-acid') {
    equivalenceFraction = 1 + (oh - h) / c0;
  } else if (params.kind === 'weak-acid') {
    const ka = Math.pow(10, -(params.pKa ?? 7));
    const fractionBase = ka / (ka + h);
    equivalenceFraction = fractionBase + (oh - h) / c0;
  } else {
    const ka = Math.pow(10, -(params.pKa ?? 7));
    const fractionAcid = h / (h + ka);
    equivalenceFraction = fractionAcid + (h - oh) / c0;
  }
  const equivalenceVolume = c0 * v0 / ct;
  const volumeTP = equivalenceFraction * equivalenceVolume;
  const volumeError = volumeTP - equivalenceVolume;
  const analyteMoles = c0 * v0 / 1000;
  const absoluteErrorMoles = volumeError * ct / 1000;
  return { volumeTP, volumeError, absoluteErrorMoles, relativeErrorPercent: 100 * absoluteErrorMoles / analyteMoles };
}
