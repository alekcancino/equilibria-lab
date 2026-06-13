// Base de datos de indicadores metalocrómicos para titulaciones complejométricas.
// Fuente: Harris, Quantitative Chemical Analysis 9.ª ed., Tabla 12-3;
//         Skoog, Principles of Analytical Chemistry 9.ª ed.
//
// logK(MIn): constante de formación del complejo M-In referenciada a la forma
// completamente desprotonada In^(n-) del indicador.
// K'(MIn) en un medio dado: logK'(MIn) = logK(MIn) - log αIn(H) - log αM(OH)

export interface IndicatorMetal {
  metalId: string;   // coincide con id en EDTA_PRESETS de ConstantesCondicionales
  logKMIn: number;   // log K de formación M-In (termodinámico)
}

export interface MetalIndicator {
  id: string;
  name: string;
  abbrev: string;
  /** pKas del indicador como ácido débil — la última especie es la forma que coordina al metal */
  pKas: number[];
  /** Color del indicador libre al pH de trabajo (aprox. pH 8–11) */
  colorFree: string;
  /** Color del complejo M-In */
  colorMIn: string;
  /** Rango de pH donde el indicador funciona normalmente */
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
    colorFree: '#3A7BD5',    // azul
    colorMIn: '#8B1A4A',     // rojo vino
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
    notes: 'Clásico para Mg y Ca a pH 10 (tampón NH₃/NH₄⁺). El Cu, Ni y Fe³⁺ bloquean el indicador (logK muy alto). Añadir enmascarante (KCN) si hay interferentes.',
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
    colorFree: '#7B3FA0',    // púrpura
    colorMIn: '#D04070',     // rosa-rojo
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
    colorFree: '#F0A500',    // amarillo-naranja
    colorMIn: '#C0392B',     // rojo
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

/** Mapa rápido id → indicador */
export const INDICATOR_BY_ID = Object.fromEntries(METAL_INDICATORS.map((ind) => [ind.id, ind]));
