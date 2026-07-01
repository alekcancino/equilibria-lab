// Complexometric titrations with EDTA: conditional constant and pM′ / pY′ curves vs. fraction x or volume.

import { alphaH } from './conditional';
import {
  composeAlphas,
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
  const c = -cM;
  let m: number;
  if (kCond < 1e-8) {
    m = cM;
  } else {
    const disc = b * b - 4 * a * c;
    m = (-b + Math.sqrt(Math.max(disc, 0))) / (2 * a);
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
  const logKfCond = condLogKPrimary(logKf, pH, stack);
  const kCond = Math.pow(10, logKfCond);
  const br = composeAlphas(pH, stack);

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
      const eq = equilibriumPoint(kCond, cM, cY);
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
      const eq = equilibriumPoint(kCond, cM, cY);
      volumes.push(v);
      xs.push(v / vEq);
      pMs.push(eq.pM);
      pYs.push(eq.pY);
    }
  }

  void br;
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
