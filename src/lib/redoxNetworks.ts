import { NERNST_S } from './constants';

export interface RedoxNetworkTransition {
  /** Electrons removed when moving from state i to state i+1. */
  n: number;
  /** Conditional formal pe for the adjacent-state couple. */
  pe0: number;
}

export interface RedoxStateNetwork {
  labels: string[];
  transitions: RedoxNetworkTransition[];
}

export interface RedoxNetworkDistribution {
  fractions: number[];
  meanElectronsRemoved: number;
  maxElectronsRemoved: number;
}

/** Grand-canonical distribution over any number of sequential oxidation states. */
export function redoxNetworkFractions(
  network: RedoxStateNetwork,
  pe: number,
): RedoxNetworkDistribution {
  if (network.labels.length !== network.transitions.length + 1) {
    throw new Error('A redox network needs one more state than transition.');
  }
  const logWeights = [0];
  const levels = [0];
  network.transitions.forEach((transition, index) => {
    logWeights.push(logWeights[index] + transition.n * (pe - transition.pe0));
    levels.push(levels[index] + transition.n);
  });
  const maxLog = Math.max(...logWeights);
  const weights = logWeights.map((logWeight) => Math.pow(10, logWeight - maxLog));
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const fractions = weights.map((weight) => weight / sum);
  return {
    fractions,
    meanElectronsRemoved: fractions.reduce((total, fraction, index) => (
      total + fraction * levels[index]
    ), 0),
    maxElectronsRemoved: levels[levels.length - 1],
  };
}

export interface RedoxNetworkTitrationCurve {
  volumes: number[];
  pes: number[];
  Es: number[];
  analyteFractions: number[][];
  titrantFractions: number[][];
  equivalenceVolumes: number[];
  electronBalanceErrors: number[];
}

/**
 * Oxidimetric titration between two state networks. The analyte feed starts in
 * its most reduced state and the titrant feed in its most oxidized state.
 */
export function redoxNetworkTitrationCurve(params: {
  analyte: RedoxStateNetwork;
  titrant: RedoxStateNetwork;
  analyteMoles: number;
  titrantConcentration: number;
  vMax: number;
  points?: number;
}): RedoxNetworkTitrationCurve {
  const points = params.points ?? 500;
  const titrantCapacity = params.titrant.transitions.reduce((sum, step) => sum + step.n, 0);
  const equivalenceVolumes: number[] = [];
  let cumulative = 0;
  for (const step of params.analyte.transitions) {
    cumulative += step.n * params.analyteMoles;
    equivalenceVolumes.push(cumulative / Math.max(params.titrantConcentration * titrantCapacity, 1e-300));
  }

  const solve = (titrantMoles: number) => {
    const balance = (pe: number) => {
      const a = redoxNetworkFractions(params.analyte, pe);
      const t = redoxNetworkFractions(params.titrant, pe);
      const released = params.analyteMoles * a.meanElectronsRemoved;
      const accepted = titrantMoles * (t.maxElectronsRemoved - t.meanElectronsRemoved);
      return released - accepted;
    };
    let lo = -60;
    let hi = 60;
    for (let i = 0; i < 140; i++) {
      const mid = (lo + hi) / 2;
      if (balance(mid) < 0) lo = mid;
      else hi = mid;
    }
    const pe = (lo + hi) / 2;
    return { pe, error: balance(pe) };
  };

  const volumes: number[] = [];
  const pes: number[] = [];
  const Es: number[] = [];
  const analyteFractions = params.analyte.labels.map(() => [] as number[]);
  const titrantFractions = params.titrant.labels.map(() => [] as number[]);
  const electronBalanceErrors: number[] = [];
  for (let i = 0; i <= points; i++) {
    const volume = params.vMax * i / points;
    const result = solve(params.titrantConcentration * volume);
    const a = redoxNetworkFractions(params.analyte, result.pe);
    const t = redoxNetworkFractions(params.titrant, result.pe);
    volumes.push(volume);
    pes.push(result.pe);
    Es.push(result.pe * NERNST_S);
    a.fractions.forEach((fraction, index) => analyteFractions[index].push(fraction));
    t.fractions.forEach((fraction, index) => titrantFractions[index].push(fraction));
    electronBalanceErrors.push(result.error);
  }
  return {
    volumes,
    pes,
    Es,
    analyteFractions,
    titrantFractions,
    equivalenceVolumes,
    electronBalanceErrors,
  };
}
