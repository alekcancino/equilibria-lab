// Sistemas completos de un clic (editables): cargan metal + ligante + reacciones
// parásitas (hidrólisis, auxiliar, protonación del complejo) en un solo
// SideReactionEditorState. El usuario puede editar cualquier parámetro después.
//
// Mapean los sistemas de los exámenes QA III 2025-2 y clásicos de textbook
// (Harris / Skoog). Constantes a 25 °C; convenios documentados en `note`.

import { EDTA_PKAS } from './edta';
import { defaultSideEditorState, type SideReactionEditorState } from './sideReactions';

export interface SystemPreset {
  id: string;
  /** Nombre legible del sistema completo. */
  name: string;
  group: string;
  /** Descripción corta (se muestra en el selector). */
  detail: string;
  reference: string;
  /** Nota de convenio/aproximación (p. ej. signo de β OH). */
  note?: string;

  metalLabel: string;
  /** id que coincide con EDTA_METAL_PRESETS / indicadores, si aplica. */
  metalId?: string;
  /** log K_f del complejo principal M–Y. */
  logKf: number;
  /** pH amortiguado típico del sistema. */
  pH: number;
  /** Concentración analítica típica del metal (M). */
  cAnalytic: number;

  /** Solubilidad: pK_sp y estequiometría de OH⁻ del hidróxido (si aplica). */
  pKsp?: number;
  n?: number;

  /** Stack de parásitas completamente editable. */
  side: SideReactionEditorState;
}

/** Constructor compacto de SideReactionEditorState desde constantes crudas. */
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
  // ── Exámenes QA III 2025-2 ──────────────────────────────────────────────────
  {
    id: 'zn-edta-nh3',
    name: 'Zn²⁺ – EDTA – NH₃',
    group: 'Exámenes QA III',
    detail: '1.er parcial · enmascaramiento NH₃ 2 F, pH 10',
    reference: 'QA III 2025-2, 1.er parcial (Aguilar Cordero)',
    note: 'NH₃ como total analítica 2 F (pKa 9,2). β Zn(OH)ₖ del preset son magnitudes de formación positivas; el encabezado del examen las da con signo negativo (convenio de descomposición).',
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
      complexProtonation: 3.0, // log K(ZnY + H ⇌ ZnHY) ≈ logβ(ZnHY 19,44) − logKf
    }),
  },
  {
    id: 'ni-edta-ix',
    name: 'Ni²⁺ – EDTA (intercambio iónico)',
    group: 'Exámenes QA III',
    detail: '3.er parcial · Ni 0,1 mM, recuperación con EDTA',
    reference: 'QA III 2025-2, 3.er parcial',
    metalLabel: 'Ni²⁺',
    metalId: 'ni',
    logKf: 18.56,
    pH: 6,
    cAnalytic: 1e-4,
    pKsp: 15.2,
    n: 2,
    side: makeSide({ oh: [4.97, 8.55] }),
  },
  // ── Complejometría clásica (Harris / Skoog) ─────────────────────────────────
  {
    id: 'ca-edta',
    name: 'Ca²⁺ – EDTA',
    group: 'Complejometría EDTA',
    detail: 'Dureza del agua · sin hidrólisis, pH 10',
    reference: 'Harris, QCA 9.ª ed.',
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
    reference: 'Harris, QCA 9.ª ed.',
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
    reference: 'Harris, QCA 9.ª ed.',
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
    reference: 'Harris, QCA 9.ª ed.',
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

/** Clona el estado del editor de un preset (para no mutar la fuente). */
export function sideFromPreset(p: SystemPreset): SideReactionEditorState {
  return {
    ...p.side,
    ligandPKas: [...p.side.ligandPKas],
    logBetasOH: [...p.side.logBetasOH],
    logBetasAux: [...p.side.logBetasAux],
    auxPKas: [...p.side.auxPKas],
  };
}
