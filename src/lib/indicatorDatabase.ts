// Database of metallochromic indicators for complexometric titrations.
// Source: Harris, Quantitative Chemical Analysis, Table 12-3;
//         Skoog, Principles of Analytical Chemistry.
//
// logK(MIn): formation constant of the M-In complex referenced to the fully
// deprotonated In^(n-) form of the indicator.
// K'(MIn) at a given medium: logK'(MIn) = logK(MIn) - log αIn(H) - log αM(OH)

export interface IndicatorMetal {
  metalId: string;   // matches id in EDTA_METAL_PRESETS
  logKMIn: number;   // thermodynamic log K for M-In formation
}

export interface MetalIndicator {
  id: string;
  name: string;
  abbrev: string;
  /** pKas of the indicator as a weak acid — the last species is the form that coordinates to the metal */
  pKas: number[];
  /** Color of the free indicator at the working pH (approx. pH 8–11) */
  colorFree: string;
  /** Color of the M-In complex */
  colorMIn: string;
  /** pH range where the indicator normally functions */
  pHRange: [number, number];
  metals: IndicatorMetal[];
  notes: string;
}

export const METAL_INDICATORS: MetalIndicator[] = [
  {
    id: 'ebt',
    name: 'Negro de Eriocromo T',
    abbrev: 'EBT',
    pKas: [6.3, 11.6],
    colorFree: '#3A7BD5',    // blue
    colorMIn: '#8B1A4A',     // wine red
    pHRange: [7, 11],
    metals: [
      { metalId: 'ca',   logKMIn:  5.4 },
      { metalId: 'mg',   logKMIn:  7.0 },
      { metalId: 'mn',   logKMIn:  9.6 },
      { metalId: 'zn',   logKMIn: 12.9 },
      { metalId: 'cd',   logKMIn: 12.0 },
      { metalId: 'pb',   logKMIn: 13.7 },
      { metalId: 'ni',   logKMIn: 14.3 },
      { metalId: 'cu',   logKMIn: 15.5 },
      { metalId: 'fe3',  logKMIn: 14.3 },
    ],
    notes: 'Clásico para Mg y Ca a pH 10 (buffer NH₃/NH₄⁺). El Cu, Ni y Fe³⁺ bloquean el indicador (logK muy alto). Añadir enmascarante (KCN) si hay interferentes.',
  },
  {
    id: 'calmagite',
    name: 'Calmagite',
    abbrev: 'Cal',
    pKas: [8.1, 12.4],
    colorFree: '#2B7DBA',
    colorMIn: '#7A1F3A',
    pHRange: [8, 12],
    metals: [
      { metalId: 'ca',   logKMIn:  5.7 },
      { metalId: 'mg',   logKMIn:  8.1 },
      { metalId: 'zn',   logKMIn: 12.5 },
      { metalId: 'cd',   logKMIn: 11.8 },
      { metalId: 'pb',   logKMIn: 13.5 },
      { metalId: 'mn',   logKMIn:  9.0 },
      { metalId: 'ni',   logKMIn: 14.0 },
      { metalId: 'cu',   logKMIn: 15.0 },
    ],
    notes: 'Similar a EBT pero más estable frente al H₂O₂ y el tiempo. Rango de pH ligeramente más alto.',
  },
  {
    id: 'murexide',
    name: 'Murexide',
    abbrev: 'Mur',
    pKas: [9.2, 10.9],
    colorFree: '#7B3FA0',    // purple
    colorMIn: '#D04070',     // pink-red
    pHRange: [8, 11],
    metals: [
      { metalId: 'ca',   logKMIn:  3.4 },
      { metalId: 'ni',   logKMIn: 11.5 },
      { metalId: 'cu',   logKMIn: 15.3 },
      { metalId: 'co',   logKMIn: 10.5 },
      { metalId: 'mn',   logKMIn:  7.4 },
    ],
    notes: 'Indicador para Ca a pH 12 (NaOH) y Cu/Ni a pH 8. El cambio de color es rosa → púrpura en el punto de equivalencia.',
  },
  {
    id: 'xo',
    name: 'Naranja de Xilenol',
    abbrev: 'XO',
    pKas: [2.6, 3.2, 6.4, 10.5],
    colorFree: '#F0A500',    // yellow-orange
    colorMIn: '#C0392B',     // red
    pHRange: [1, 6],
    metals: [
      { metalId: 'pb',   logKMIn: 18.0 },
      { metalId: 'zn',   logKMIn: 15.5 },
      { metalId: 'cd',   logKMIn: 14.0 },
      { metalId: 'mn',   logKMIn: 13.0 },
      { metalId: 'fe3',  logKMIn: 14.9 },
      { metalId: 'hg',   logKMIn: 20.0 },
    ],
    notes: 'Se usa en medio ácido (pH 1–6) donde EBT no funciona. Indicado para Pb, Bi, In, Th, Fe³⁺. Cambio amarillo → rojo.',
  },
];

/** Fast id → indicator map */
export const INDICATOR_BY_ID = Object.fromEntries(METAL_INDICATORS.map((ind) => [ind.id, ind]));

// ── Metal presets for EDTA titrations ────────────────────────────────────────
// Source: Harris QCA, Table 12-1; Ringbom.
// logBetasOH: formation constants of the metal's hydroxo complexes β₁, β₂, …

export interface EdtaMetalPreset {
  id: string;
  metal: string;   // display label e.g. 'Ca²⁺'
  logKf: number;   // thermodynamic log Kf for M–EDTA
  logBetasOH: number[];
  group: string;
}

export const EDTA_METAL_PRESETS: EdtaMetalPreset[] = [
  { id: 'ca',  metal: 'Ca²⁺', logKf: 10.65, logBetasOH: [],                          group: 'M²⁺' },
  { id: 'mg',  metal: 'Mg²⁺', logKf:  8.64, logBetasOH: [],                          group: 'M²⁺' },
  { id: 'mn',  metal: 'Mn²⁺', logKf: 13.81, logBetasOH: [3.4],                       group: 'M²⁺' },
  { id: 'zn',  metal: 'Zn²⁺', logKf: 16.50, logBetasOH: [5.04, 10.43, 13.7, 15.2],  group: 'M²⁺' },
  { id: 'cu',  metal: 'Cu²⁺', logKf: 18.80, logBetasOH: [6.0, 11.8],                 group: 'M²⁺' },
  { id: 'ni',  metal: 'Ni²⁺', logKf: 18.56, logBetasOH: [4.97, 8.55],                group: 'M²⁺' },
  { id: 'pb',  metal: 'Pb²⁺', logKf: 18.04, logBetasOH: [6.29, 10.89],               group: 'M²⁺' },
  { id: 'hg',  metal: 'Hg²⁺', logKf: 21.70, logBetasOH: [10.60],                     group: 'M²⁺' },
  { id: 'cd',  metal: 'Cd²⁺', logKf: 16.46, logBetasOH: [3.9, 7.7],                  group: 'M²⁺' },
  { id: 'co',  metal: 'Co²⁺', logKf: 16.31, logBetasOH: [4.35, 8.4],                 group: 'M²⁺' },
  { id: 'fe3', metal: 'Fe³⁺', logKf: 25.10, logBetasOH: [11.81, 21.68, 30.67],       group: 'M³⁺' },
  { id: 'al',  metal: 'Al³⁺', logKf: 16.13, logBetasOH: [9.01, 17.09, 23.40, 27.68], group: 'M³⁺' },
  { id: 'ga',  metal: 'Ga³⁺', logKf: 20.27, logBetasOH: [11.4, 22.1, 30.7],           group: 'M³⁺' },
];
