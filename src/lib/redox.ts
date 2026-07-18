// Redox equilibrium using the pe convention: pe = E / 0.05916 V (Sillén).
// pe° = E°/0.05916 always — n is absorbed into pe°, not repeated in the formula.

import { NERNST_S } from './constants';
import {
  combineSideReactionBranches,
  composeAlphas,
  freeLigandConcentration,
  type LigandSpec,
  type SideReactionStack,
} from './sideReactions';
import { alphaL } from './conditional';

export { NERNST_S };

export interface RedoxCouple {
  id: string;
  name: string;
  /** Full half-reaction string for display */
  halfReaction: string;
  ox: string;
  red: string;
  /** Standard potential (V vs SHE) */
  E0: number;
  /** Electrons transferred */
  n: number;
  /** Protons in the half-reaction (0 if H⁺ not involved) */
  mH: number;
  reference: string;
  /** Model caveat, if applicable (e.g. polynuclear species) */
  caveat?: string;
}

function gcd(a: number, b: number): number {
  let x = Math.max(1, Math.round(Math.abs(a)));
  let y = Math.max(1, Math.round(Math.abs(b)));
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** Electrons in the smallest balanced reaction formed by two half-reactions. */
export function electronTransferCount(n1: number, n2: number): number {
  const a = Math.max(1, Math.round(Math.abs(n1)));
  const b = Math.max(1, Math.round(Math.abs(n2)));
  return (a * b) / gcd(a, b);
}

interface ReactionTerm {
  species: string;
  coefficient: number;
}

function parseReactionSide(side: string): ReactionTerm[] {
  return side.trim().split(/\s+\+\s+/).map((raw) => {
    const term = raw.trim();
    const match = term.match(/^(\d+)(.+)$/);
    return match
      ? { coefficient: Number(match[1]), species: match[2].trim() }
      : { coefficient: 1, species: term };
  });
}

function parseHalfReaction(couple: RedoxCouple): [ReactionTerm[], ReactionTerm[]] {
  const [left = couple.ox, right = couple.red] = couple.halfReaction.split(/⇌|↔|→/);
  const normalizeElectrons = (terms: ReactionTerm[]) => terms.map((term) => (
    term.species === 'e⁻' || term.species === 'e-'
      ? { ...term, coefficient: couple.n }
      : term
  ));
  return [normalizeElectrons(parseReactionSide(left)), normalizeElectrons(parseReactionSide(right))];
}

function addTerms(target: Map<string, number>, order: string[], terms: ReactionTerm[], factor: number): void {
  for (const term of terms) {
    if (!target.has(term.species)) order.push(term.species);
    target.set(term.species, (target.get(term.species) ?? 0) + term.coefficient * factor);
  }
}

function formatReactionSide(terms: Map<string, number>, order: string[]): string {
  return order
    .filter((species) => (terms.get(species) ?? 0) > 1e-9)
    .map((species) => {
      const coefficient = terms.get(species) ?? 0;
      return `${Math.abs(coefficient - 1) < 1e-9 ? '' : coefficient}${species}`;
    })
    .join(' + ');
}

export interface BalancedRedoxReaction {
  equation: string;
  reactants: string;
  products: string;
  electrons: number;
}

/** Combines the stronger oxidant reduction with the weaker reductant oxidation. */
export function balancedRedoxReaction(oxidant: RedoxCouple, reductant: RedoxCouple): BalancedRedoxReaction {
  const electrons = electronTransferCount(oxidant.n, reductant.n);
  const oxidantFactor = electrons / Math.max(1, Math.round(oxidant.n));
  const reductantFactor = electrons / Math.max(1, Math.round(reductant.n));
  const [oxidantLeft, oxidantRight] = parseHalfReaction(oxidant);
  const [reductantLeft, reductantRight] = parseHalfReaction(reductant);
  const left = new Map<string, number>();
  const right = new Map<string, number>();
  const leftOrder: string[] = [];
  const rightOrder: string[] = [];
  addTerms(left, leftOrder, oxidantLeft, oxidantFactor);
  addTerms(right, rightOrder, oxidantRight, oxidantFactor);
  addTerms(left, leftOrder, reductantRight, reductantFactor);
  addTerms(right, rightOrder, reductantLeft, reductantFactor);

  for (const species of new Set([...left.keys(), ...right.keys()])) {
    const canceled = Math.min(left.get(species) ?? 0, right.get(species) ?? 0);
    if (canceled > 0) {
      left.set(species, (left.get(species) ?? 0) - canceled);
      right.set(species, (right.get(species) ?? 0) - canceled);
    }
  }

  const reactants = formatReactionSide(left, leftOrder);
  const products = formatReactionSide(right, rightOrder);
  return { equation: `${reactants} → ${products}`, reactants, products, electrons };
}

export interface ConditionalAlphaTerm {
  /** log10 coefficient in a term 10^(logCoefficient + pHSlope*pH). */
  logCoefficient: number;
  pHSlope: number;
}

export interface ConditionalLigandBranch {
  logBetas: number[];
  spec: LigandSpec;
}

export interface ConditionalRedoxState {
  intrinsicTerms?: ConditionalAlphaTerm[];
  hydrolysisLogBetas?: number[];
  ligandBranches?: ConditionalLigandBranch[];
}

/** Analytical/free coefficient for one redox state with additive exclusive branches. */
export function redoxStateAlpha(state: ConditionalRedoxState | undefined, pH: number): number {
  if (!state) return 1;
  const intrinsic = 1 + (state.intrinsicTerms ?? []).reduce((sum, term) => (
    sum + Math.pow(10, term.logCoefficient + term.pHSlope * pH)
  ), 0);
  const hydrolysis = 1 + (state.hydrolysisLogBetas ?? []).reduce((sum, logBeta, index) => (
    sum + Math.pow(10, logBeta + (index + 1) * (pH - 14))
  ), 0);
  const ligands = (state.ligandBranches ?? []).map((branch) => alphaL(
    branch.logBetas,
    freeLigandConcentration(branch.spec, pH),
  ));
  return combineSideReactionBranches([intrinsic, hydrolysis, ...ligands]);
}

/** Formal potential using complete, independent polynomials for Ox and Red. */
export function conditionalEprimeFromStates(
  couple: Pick<RedoxCouple, 'E0' | 'n' | 'mH'>,
  pH: number,
  oxState?: ConditionalRedoxState,
  redState?: ConditionalRedoxState,
): number {
  const base = couple.E0 - NERNST_S * (couple.mH / couple.n) * pH;
  return base + (NERNST_S / couple.n) * Math.log10(
    redoxStateAlpha(redState, pH) / redoxStateAlpha(oxState, pH),
  );
}

export interface ConditionalPXPair {
  label: string;
  E0: number;
  n: number;
  oxLogBetas: number[];
  redLogBetas: number[];
}

export interface ConditionalPXDiagram {
  pXs: number[];
  curves: { label: string; potentials: number[] }[];
  crossings: { pairA: number; pairB: number; pX: number }[];
}

/** Multiple formal-potential curves on one editable pX domain. */
export function conditionalPotentialPXDiagram(
  pairs: ConditionalPXPair[],
  range: [number, number] = [0, 14],
  points = 400,
): ConditionalPXDiagram {
  const pXs = Array.from({ length: points + 1 }, (_, index) => (
    range[0] + (range[1] - range[0]) * index / points
  ));
  const curves = pairs.map((pair) => ({
    label: pair.label,
    potentials: pXs.map((pX) => pair.E0 + (NERNST_S / pair.n) * Math.log10(
      alphaL(pair.redLogBetas, Math.pow(10, -pX))
      / alphaL(pair.oxLogBetas, Math.pow(10, -pX)),
    )),
  }));
  const crossings: ConditionalPXDiagram['crossings'] = [];
  for (let a = 0; a < curves.length; a++) {
    for (let b = a + 1; b < curves.length; b++) {
      for (let i = 1; i < pXs.length; i++) {
        const d0 = curves[a].potentials[i - 1] - curves[b].potentials[i - 1];
        const d1 = curves[a].potentials[i] - curves[b].potentials[i];
        if (d0 === 0 || (d0 > 0) !== (d1 > 0)) {
          const fraction = d0 === d1 ? 0 : d0 / (d0 - d1);
          crossings.push({
            pairA: a,
            pairB: b,
            pX: pXs[i - 1] + fraction * (pXs[i] - pXs[i - 1]),
          });
        }
      }
    }
  }
  return { pXs, curves, crossings };
}

/** pe° = E°/S — Sillén convention: n is absorbed into pe°, not repeated. */
export function peStandard(E0: number): number {
  return E0 / NERNST_S;
}

/**
 * Conditional pe°' at the working pH: for ox + mH·H⁺ + n·e⁻ → red,
 * pe°' = pe° − (mH/n)·pH. If mH = 0 it is pH-independent.
 */
export function peConditional(couple: RedoxCouple, pH: number): number {
  return peStandard(couple.E0) - (couple.mH / couple.n) * pH;
}

/**
 * Conditional formal potential E°'(pH) with complexation/hydrolysis on BOTH
 * the oxidized and reduced forms (Ringbom-style, reusing composeAlphas — the
 * same α_M mechanism ConstantesCondicionales.tsx already uses for M-Y
 * complexes, applied here per redox state instead of per metal/ligand):
 *
 *   E = E° + (S/n)·log([Ox]_free/[Red]_free), and [X]_free = [X]_total/α_X
 *   ⇒ E°'(total-concentration basis) = E° + (S/n)·log(α_Red/α_Ox)
 *
 * combined multiplicatively with the existing proton term. Each stack is
 * optional; omitting one is equivalent to α=1 (no effect on that form).
 */
export function conditionalEprime(
  couple: Pick<RedoxCouple, 'E0' | 'n' | 'mH'>,
  pH: number,
  oxStack?: SideReactionStack,
  redStack?: SideReactionStack,
): number {
  const base = couple.E0 - NERNST_S * (couple.mH / couple.n) * pH;
  const aOx = oxStack ? composeAlphas(pH, oxStack).alphaM : 1;
  const aRed = redStack ? composeAlphas(pH, redStack).alphaM : 1;
  return base + (NERNST_S / couple.n) * Math.log10(aRed / aOx);
}

/**
 * Alpha fractions of a couple at a given pe (two mononuclear species model):
 * [ox]/[red] = 10^{n(pe − pe°')}.
 */
export function alphaRedox(pe: number, pe0c: number, n: number): { ox: number; red: number } {
  const exp = n * (pe - pe0c);
  if (exp > 30) return { ox: 1, red: Math.pow(10, -exp) };
  if (exp < -30) return { ox: Math.pow(10, exp), red: 1 };
  const r = Math.pow(10, exp);
  return { ox: r / (1 + r), red: 1 / (1 + r) };
}

export interface RedoxTitrationParams {
  /** Analyte couple */
  analyte: RedoxCouple;
  /** Titrant couple */
  titrant: RedoxCouple;
  /**
   * 'oxidante': analyte starts reduced, titrant is added oxidized (oxidimetry).
   * 'reductor': analyte starts oxidized, titrant is added reduced (reductimetry).
   */
  direction?: 'oxidante' | 'reductor';
  /** Buffered pH of the medium */
  pH: number;
  cAnalyte: number;
  vAnalyte: number;
  cTitrant: number;
  vMax: number;
  points?: number;
  analyteOxState?: ConditionalRedoxState;
  analyteRedState?: ConditionalRedoxState;
  titrantOxState?: ConditionalRedoxState;
  titrantRedState?: ConditionalRedoxState;
}

export interface RedoxCurve {
  volumes: number[];
  pes: number[];
  Es: number[];
  vEq: number;
  peEq: number;
  EEq: number;
  /** log K of the balanced titration reaction */
  logK: number;
  pe0cAnalyte: number;
  pe0cTitrant: number;
}

export interface RedoxMixtureAnalyte {
  couple: RedoxCouple;
  c: number;
  oxState?: ConditionalRedoxState;
  redState?: ConditionalRedoxState;
}

export interface RedoxMixtureCurve {
  volumes: number[];
  pes: number[];
  Es: number[];
  equivalenceVolumes: number[];
  order: number[];
}

/** Exact global electron balance for N analyte pools sharing one titrant. */
export function redoxMixtureTitrationCurve(params: {
  analytes: RedoxMixtureAnalyte[];
  titrant: RedoxCouple;
  direction?: 'oxidante' | 'reductor';
  pH: number;
  vAnalyte: number;
  cTitrant: number;
  vMax: number;
  points?: number;
  titrantOxState?: ConditionalRedoxState;
  titrantRedState?: ConditionalRedoxState;
}): RedoxMixtureCurve {
  const { analytes, titrant, pH, vAnalyte, cTitrant, vMax, direction = 'oxidante' } = params;
  const points = params.points ?? 500;
  const peAnalytes = analytes.map((item) => conditionalEprimeFromStates(
    item.couple, pH, item.oxState, item.redState,
  ) / NERNST_S);
  const peTitrant = conditionalEprimeFromStates(
    titrant, pH, params.titrantOxState, params.titrantRedState,
  ) / NERNST_S;
  const order = analytes.map((_, i) => i).sort((a, b) => direction === 'oxidante'
    ? peAnalytes[a] - peAnalytes[b]
    : peAnalytes[b] - peAnalytes[a]);

  const equivalenceVolumes: number[] = [];
  let electronMoles = 0;
  for (const index of order) {
    electronMoles += analytes[index].couple.n * analytes[index].c * vAnalyte;
    equivalenceVolumes.push(electronMoles / (titrant.n * Math.max(cTitrant, 1e-30)));
  }

  const solvePe = (titrantMoles: number): number => {
    const f = (pe: number) => {
      const analyteElectrons = analytes.reduce((sum, item, index) => {
        const fraction = alphaRedox(pe, peAnalytes[index], item.couple.n);
        const changed = direction === 'oxidante' ? fraction.ox : fraction.red;
        return sum + item.couple.n * item.c * vAnalyte * changed;
      }, 0);
      const titrantFraction = alphaRedox(pe, peTitrant, titrant.n);
      const changedTitrant = direction === 'oxidante' ? titrantFraction.red : titrantFraction.ox;
      const titrantElectrons = titrant.n * titrantMoles * changedTitrant;
      return direction === 'oxidante'
        ? analyteElectrons - titrantElectrons
        : titrantElectrons - analyteElectrons;
    };
    let lo = -40;
    let hi = 45;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  const volumes: number[] = [];
  const pes: number[] = [];
  const Es: number[] = [];
  for (let i = 0; i <= points; i++) {
    const v = (vMax * i) / points;
    const pe = solvePe(cTitrant * v);
    volumes.push(v);
    pes.push(pe);
    Es.push(pe * NERNST_S);
  }
  return { volumes, pes, Es, equivalenceVolumes, order };
}

/**
 * Redox titration curve solved by exact ELECTRON BALANCE:
 * electrons released by the oxidized species equal those accepted
 * by the reduced species. For oxidimetry:
 *   f(pe) = n_a·N_a·α_ox,a(pe) − n_t·N_t·α_red,t(pe) = 0
 * (roles are reversed for reductimetry). f is strictly monotone in pe → robust bisection.
 * n_a ≠ n_t stoichiometry is handled automatically (V_eq = n_a·C_a·V_a / (n_t·C_t)).
 */
export function redoxTitrationCurve(params: RedoxTitrationParams): RedoxCurve {
  const { analyte, titrant, pH, cAnalyte, vAnalyte, cTitrant, vMax, direction = 'oxidante' } = params;
  const points = params.points ?? 500;
  const pe0a = conditionalEprimeFromStates(
    analyte, pH, params.analyteOxState, params.analyteRedState,
  ) / NERNST_S;
  const pe0t = conditionalEprimeFromStates(
    titrant, pH, params.titrantOxState, params.titrantRedState,
  ) / NERNST_S;

  const solvePe = (nA: number, nT: number): number => {
    // nA, nT in moles; bisection on the electron balance.
    // f is increasing in pe in both directions due to the sign convention.
    const f = (pe: number): number => {
      if (direction === 'oxidante') {
        return analyte.n * nA * alphaRedox(pe, pe0a, analyte.n).ox -
               titrant.n * nT * alphaRedox(pe, pe0t, titrant.n).red;
      }
      return titrant.n * nT * alphaRedox(pe, pe0t, titrant.n).ox -
             analyte.n * nA * alphaRedox(pe, pe0a, analyte.n).red;
    };
    let lo = -40;
    let hi = 45;
    const fLo = f(lo);
    const fHi = f(hi);
    if (fLo * fHi > 0) return fLo > 0 ? hi : lo;
    for (let i = 0; i < 90; i++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  const vEq = (analyte.n * cAnalyte * vAnalyte) / (titrant.n * cTitrant);
  const volumes: number[] = [];
  const pes: number[] = [];
  const Es: number[] = [];

  for (let i = 0; i <= points; i++) {
    const v = (vMax * i) / points;
    const pe = solvePe(cAnalyte * vAnalyte, cTitrant * v);
    volumes.push(v);
    pes.push(pe);
    Es.push(pe * NERNST_S);
  }

  const peEq = solvePe(cAnalyte * vAnalyte, cTitrant * vEq);

  const transferredElectrons = electronTransferCount(analyte.n, titrant.n);
  const logK = direction === 'oxidante'
    ? transferredElectrons * (pe0t - pe0a)
    : transferredElectrons * (pe0a - pe0t);

  return {
    volumes, pes, Es, vEq,
    peEq, EEq: peEq * NERNST_S,
    logK,
    pe0cAnalyte: pe0a,
    pe0cTitrant: pe0t,
  };
}
