// One-click complete systems (editable): load metal + ligand + side reactions
// (hydrolysis, auxiliary, complex protonation) into a single SideReactionEditorState.
// The user can edit any parameter afterwards.
//
// Covers classic complexometric systems (Harris / Skoog) and common analytical
// scenarios. Constants at 25 °C; sign conventions documented in `note`.

import { EDTA_PKAS } from './edta';
import { defaultSideEditorState, type SideReactionEditorState } from './sideReactions';

export interface SystemPreset {
  id: string;
  /** Human-readable name of the complete system. */
  name: string;
  group: string;
  /** Short description (displayed in the selector). */
  detail: string;
  reference: string;
  /** Convention/approximation note (e.g. sign of β OH). */
  note?: string;

  metalLabel: string;
  /** id matching EDTA_METAL_PRESETS / indicators, if applicable. */
  metalId?: string;
  /** log K_f of the primary M–Y complex. */
  logKf: number;
  /** Typical buffered pH of the system. */
  pH: number;
  /** Typical analytical metal concentration (M). */
  cAnalytic: number;

  /** Solubility: pK_sp and OH⁻ stoichiometry of the hydroxide (if applicable). */
  pKsp?: number;
  n?: number;

  /** Fully editable side-reaction stack. */
  side: SideReactionEditorState;
}

/** Compact constructor for SideReactionEditorState from raw constants. */
function makeSide(opts: {
  ligandPKas?: number[];
  oh?: number[];
  aux?: {
    label: string;
    betas: number[];
    mode: 'free' | 'total' | 'fixedPX';
    cFree?: number;
    cTotal?: number;
    pKas?: number[];
    pX?: number;
  };
  complexProtonation?: number;
  complexHydroxy?: number;
}): SideReactionEditorState {
  const s = defaultSideEditorState(opts.ligandPKas ?? EDTA_PKAS);
  if (opts.oh && opts.oh.length > 0) {
    s.showOH = true;
    s.logBetasOH = [...opts.oh];
  }
  if (opts.aux) {
    s.showAux = true;
    s.auxLabel = opts.aux.label;
    s.logBetasAux = [...opts.aux.betas];
    s.auxSpecMode = opts.aux.mode;
    if (opts.aux.cFree != null) s.cAuxFree = opts.aux.cFree;
    if (opts.aux.cTotal != null) s.cAuxTotal = opts.aux.cTotal;
    if (opts.aux.pKas) s.auxPKas = [...opts.aux.pKas];
    if (opts.aux.pX != null) s.pXFixed = opts.aux.pX;
  }
  if (opts.complexProtonation != null || opts.complexHydroxy != null) {
    s.showComplex = true;
    s.logBetaProtonation = opts.complexProtonation ?? null;
    s.logBetaHydroxy = opts.complexHydroxy ?? null;
  }
  return s;
}

export const SYSTEM_PRESETS: SystemPreset[] = [
  // ── EDTA complexometry ───────────────────────────────────────────────────────
  {
    id: 'zn-edta-nh3',
    name: 'Zn²⁺ – EDTA – NH₃',
    group: 'Complejometría EDTA',
    detail: 'Enmascaramiento con NH₃ 2 M, pH 10',
    reference: 'Harris, QCA',
    note: 'β Zn(OH)ₖ son constantes de formación (positivas); algunos textos las dan con signo negativo (convenio de descomposición).',
    metalLabel: 'Zn²⁺',
    metalId: 'zn',
    logKf: 16.44,
    pH: 10,
    cAnalytic: 0.01,
    pKsp: 16.2,
    n: 2,
    side: makeSide({
      oh: [5.04, 10.43, 13.7, 15.2],
      aux: { label: 'NH₃', betas: [2.21, 4.5, 6.86, 8.89], mode: 'total', cTotal: 2.0, pKas: [9.2] },
      complexProtonation: 3.0, // log K(ZnY + H ⇌ ZnHY) ≈ logβ(ZnHY 19.44) − logKf
    }),
  },
  {
    id: 'ni-edta-ix',
    name: 'Ni²⁺ – EDTA (intercambio iónico)',
    group: 'Complejometría EDTA',
    detail: 'Recuperación de Ni²⁺ con EDTA, 0,1 mM, pH 6',
    reference: 'Harris, QCA',
    metalLabel: 'Ni²⁺',
    metalId: 'ni',
    logKf: 18.56,
    pH: 6,
    cAnalytic: 1e-4,
    pKsp: 15.2,
    n: 2,
    side: makeSide({ oh: [4.97, 8.55] }),
  },
  // ── Classic complexometry (Harris / Skoog) ──────────────────────────────────
  {
    id: 'ca-edta',
    name: 'Ca²⁺ – EDTA',
    group: 'Complejometría EDTA',
    detail: 'Dureza del agua · sin hidrólisis, pH 10',
    reference: 'Harris, QCA',
    metalLabel: 'Ca²⁺',
    metalId: 'ca',
    logKf: 10.65,
    pH: 10,
    cAnalytic: 0.01,
    pKsp: 4.7,
    n: 2,
    side: makeSide({}),
  },
  {
    id: 'mg-edta',
    name: 'Mg²⁺ – EDTA',
    group: 'Complejometría EDTA',
    detail: 'Titulación directa · pH 10',
    reference: 'Harris, QCA',
    metalLabel: 'Mg²⁺',
    metalId: 'mg',
    logKf: 8.64,
    pH: 10,
    cAnalytic: 0.01,
    pKsp: 11.2,
    n: 2,
    side: makeSide({ oh: [2.6] }),
  },
  {
    id: 'cu-edta-nh3',
    name: 'Cu²⁺ – EDTA – NH₃',
    group: 'Complejometría EDTA',
    detail: 'Enmascaramiento NH₃ · pH 10',
    reference: 'Harris, QCA',
    metalLabel: 'Cu²⁺',
    metalId: 'cu',
    logKf: 18.80,
    pH: 10,
    cAnalytic: 0.01,
    pKsp: 19.7,
    n: 2,
    side: makeSide({
      oh: [6.0, 11.8],
      aux: { label: 'NH₃', betas: [4.04, 7.47, 10.27, 12.03], mode: 'total', cTotal: 1.0, pKas: [9.25] },
    }),
  },
  {
    id: 'fe3-edta',
    name: 'Fe³⁺ – EDTA',
    group: 'Complejometría EDTA',
    detail: 'Medio ácido · pH 2–3',
    reference: 'Harris, QCA',
    metalLabel: 'Fe³⁺',
    metalId: 'fe3',
    logKf: 25.10,
    pH: 2.5,
    cAnalytic: 0.01,
    pKsp: 38.7,
    n: 3,
    side: makeSide({ oh: [11.81, 21.68, 30.67] }),
  },
];

export function systemPresetById(id: string): SystemPreset | undefined {
  return SYSTEM_PRESETS.find((p) => p.id === id);
}

/** Clones the editor state from a preset (to avoid mutating the source). */
export function sideFromPreset(p: SystemPreset): SideReactionEditorState {
  return {
    ...p.side,
    ligandPKas: [...p.side.ligandPKas],
    logBetasOH: [...p.side.logBetasOH],
    logBetasAux: [...p.side.logBetasAux],
    auxPKas: [...p.side.auxPKas],
  };
}
