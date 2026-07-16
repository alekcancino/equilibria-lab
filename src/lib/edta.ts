// Complexometric titrations with EDTA: conditional constant and pM′ / pY′ curves vs. fraction x or volume.

import { alphaH } from './conditional';
import {
  condLogKPrimary,
  defaultSideStack,
  sideStackFromEditor,
  type SideReactionEditorState,
  type SideReactionStack,
} from './sideReactions';

/** pKas of EDTA (H4Y) */
export const EDTA_PKAS = [2.0, 2.69, 6.13, 10.37];

/** α_Y(H) of EDTA at a given pH */
export function alphaY4(pH: number, pKas: number[] = EDTA_PKAS): number {
  return alphaH(pKas, pH);
}

export interface EdtaTitrationParams {
  logKf: number;
  pH: number;
  logBetasOH?: number[];
  cMetal: number;
  vMetal: number;
  cEdta: number;
  vMax: number;
  edtaInFlask?: boolean;
  points?: number;
  /** Declarative side-reaction stack (preferred) */
  sideStack?: SideReactionStack;
  /** Editor state → stack, used only if sideStack is not provided */
  sideEditor?: SideReactionEditorState;
  /** Axis: titrant volume or progress x = n_Y/n_M0 */
  axis?: 'volume' | 'x';
  xMax?: number;
}

export interface EdtaCurve {
  volumes: number[];
  xs: number[];
  pMs: number[];
  pYs: number[];
  vEq: number;
  xEq: number;
  logKfCond: number;
}

export interface CompetitiveMetal {
  label: string;
  c: number;
  logKfCond: number;
}

export interface CompetitiveEdtaPoint {
  pY: number;
  pMetals: number[];
  complexes: number[];
  freeLigand: number;
}

/** Shared-ligand balance for any number of 1:1 metal complexes. */
export function competitiveEdtaPoint(metals: CompetitiveMetal[], cLigand: number): CompetitiveEdtaPoint {
  const ligandTotal = Math.max(cLigand, 0);
  const balance = (y: number) => y + metals.reduce((sum, metal) => {
    const ky = Math.pow(10, metal.logKfCond) * y;
    return sum + Math.max(metal.c, 0) * ky / (1 + ky);
  }, 0) - ligandTotal;

  let lo = 0;
  let hi = Math.max(ligandTotal, 1e-30);
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (balance(mid) > 0) hi = mid;
    else lo = mid;
  }
  const y = Math.max((lo + hi) / 2, 1e-30);
  const pMetals: number[] = [];
  const complexes: number[] = [];
  for (const metal of metals) {
    const k = Math.pow(10, metal.logKfCond);
    const free = Math.max(metal.c, 0) / (1 + k * y);
    pMetals.push(-Math.log10(Math.max(free, 1e-30)));
    complexes.push(Math.max(metal.c - free, 0));
  }
  return { pY: -Math.log10(y), pMetals, complexes, freeLigand: y };
}

export interface CompetitiveEdtaCurve {
  volumes: number[];
  pY: number[];
  pMetals: number[][];
  equivalenceVolumes: number[];
  order: number[];
}

export function competitiveEdtaTitrationCurve(params: {
  metals: CompetitiveMetal[];
  vSample: number;
  cEdta: number;
  vMax: number;
  points?: number;
}): CompetitiveEdtaCurve {
  const { metals, vSample, cEdta, vMax } = params;
  const points = params.points ?? 500;
  const order = metals.map((_, i) => i).sort((a, b) => metals[b].logKfCond - metals[a].logKfCond);
  const equivalenceVolumes: number[] = [];
  let cumulativeMoles = 0;
  for (const index of order) {
    cumulativeMoles += Math.max(metals[index].c, 0) * vSample;
    equivalenceVolumes.push(cumulativeMoles / Math.max(cEdta, 1e-30));
  }

  const volumes: number[] = [];
  const pY: number[] = [];
  const pMetals = metals.map(() => [] as number[]);
  for (let i = 0; i <= points; i++) {
    const v = (vMax * i) / points;
    const vTotal = vSample + v;
    const diluted = metals.map((metal) => ({ ...metal, c: metal.c * vSample / vTotal }));
    const point = competitiveEdtaPoint(diluted, cEdta * v / vTotal);
    volumes.push(v);
    pY.push(point.pY);
    point.pMetals.forEach((value, index) => pMetals[index].push(value));
  }
  return { volumes, pY, pMetals, equivalenceVolumes, order };
}

export type ComplexometricSensor =
  | { kind: 'metal'; E0: number; n: number }
  | { kind: 'redox-indicator'; E0: number; n: number; logKfOx: number; logKfRed: number };

/** Potentiometric signal derived from the same free-species curve as the EDTA balance. */
export function complexometricSensorCurve(
  pMetals: number[],
  pYs: number[],
  sensor: ComplexometricSensor,
): number[] {
  if (sensor.kind === 'metal') {
    return pMetals.map((pM) => sensor.E0 - (0.05916 / Math.max(sensor.n, 1)) * pM);
  }
  return pYs.map((pY) => {
    const y = Math.pow(10, -pY);
    const alphaOx = 1 + Math.pow(10, sensor.logKfOx) * y;
    const alphaRed = 1 + Math.pow(10, sensor.logKfRed) * y;
    return sensor.E0 + (0.05916 / Math.max(sensor.n, 1)) * Math.log10(alphaRed / alphaOx);
  });
}

function resolveStack(params: Pick<EdtaTitrationParams, 'sideStack' | 'sideEditor' | 'logBetasOH'>): SideReactionStack {
  if (params.sideStack) return params.sideStack;
  if (params.sideEditor) return sideStackFromEditor(params.sideEditor);
  const stack = defaultSideStack(EDTA_PKAS);
  const oh = params.logBetasOH ?? [];
  if (oh.length > 0) stack.hydrolysis = { logBetasOH: [...oh] };
  return stack;
}

function equilibriumPoint(kCond: number, cM: number, cY: number): { pM: number; pY: number } {
  const a = kCond;
  const b = kCond * (cY - cM) + 1;
  let m: number;
  if (kCond < 1e-8) {
    m = cM;
  } else {
    // Positive root of a·m² + b·m − cM = 0. When b > 0 (past equivalence with
    // large K′) the textbook form (−b + √(b²+4a·cM))/(2a) cancels
    // catastrophically — for log K′ ≳ 16 the 4a·cM term falls below the ulp
    // of b² and m collapses to 0 (pM pinned at 30). The conjugate form is
    // exact there; the textbook form stays for b ≤ 0, where the conjugate
    // would cancel instead.
    const disc = Math.sqrt(Math.max(b * b + 4 * a * cM, 0));
    m = b > 0 ? (2 * cM) / (b + disc) : (disc - b) / (2 * a);
  }
  m = Math.max(m, 1e-30);
  const my = Math.max(cM - m, 0);
  const yFree = Math.max(cY - my, 1e-30);
  return { pM: -Math.log10(m), pY: -Math.log10(yFree) };
}

/**
 * Titration curve with K′f = Kf / (α_M · α_Y).
 * x-axis: fraction n_Y/n_M0 (exam model, constant volume).
 * volume-axis: includes dilution.
 */
export function edtaTitrationCurve(params: EdtaTitrationParams): EdtaCurve {
  const {
    logKf, pH, cMetal, vMetal, cEdta, vMax,
    edtaInFlask = false, axis = 'volume', xMax = 2,
  } = params;
  const points = params.points ?? 500;
  const stack = resolveStack(params);
  // Reported K'f is the undiluted (flask) value; when the aux ligand is an
  // analytical total it dilutes with added titrant, so kCond is re-evaluated
  // per point below for the volume axis.
  const logKfCond = condLogKPrimary(logKf, pH, stack);
  const kCondFlask = Math.pow(10, logKfCond);
  const auxTotal = stack.auxLigand?.spec.mode === 'total' ? stack.auxLigand.spec : null;
  const kCondAt = (vTotal: number): number => {
    if (!auxTotal || !stack.auxLigand) return kCondFlask;
    const diluted: SideReactionStack = {
      ...stack,
      auxLigand: {
        ...stack.auxLigand,
        spec: { ...auxTotal, cTotal: (auxTotal.cTotal * vMetal) / vTotal },
      },
    };
    return Math.pow(10, condLogKPrimary(logKf, pH, diluted));
  };

  const volumes: number[] = [];
  const xs: number[] = [];
  const pMs: number[] = [];
  const pYs: number[] = [];

  const vEq = (cMetal * vMetal) / cEdta;
  const xEq = 1;

  for (let i = 0; i <= points; i++) {
    if (axis === 'x') {
      const x = (xMax * i) / points;
      const cM = cMetal;
      const cY = x * cMetal;
      const eq = equilibriumPoint(kCondFlask, cM, cY);
      xs.push(x);
      volumes.push(x * vEq);
      pMs.push(eq.pM);
      pYs.push(eq.pY);
    } else {
      const v = (vMax * i) / points;
      const vTotal = vMetal + v;
      const flask = (cMetal * vMetal) / vTotal;
      const buret = (cEdta * v) / vTotal;
      const cM = edtaInFlask ? buret : flask;
      const cY = edtaInFlask ? flask : buret;
      const eq = equilibriumPoint(kCondAt(vTotal), cM, cY);
      volumes.push(v);
      xs.push(v / vEq);
      pMs.push(eq.pM);
      pYs.push(eq.pY);
    }
  }

  return { volumes, xs, pMs, pYs, vEq, xEq, logKfCond };
}

/** pM′ / pY′ values at a given progress fraction x (e.g. 0.5 or 1.5). */
export function edtaAtFraction(
  params: Pick<EdtaTitrationParams, 'logKf' | 'pH' | 'cMetal' | 'sideStack' | 'sideEditor' | 'logBetasOH'> & {
    vMetal?: number;
    cEdta?: number;
  },
  x: number,
): { pM: number; pY: number; logKfCond: number } {
  const stack = resolveStack(params);
  const logKfCond = condLogKPrimary(params.logKf, params.pH, stack);
  const kCond = Math.pow(10, logKfCond);
  const eq = equilibriumPoint(kCond, params.cMetal, x * params.cMetal);
  return { ...eq, logKfCond };
}
