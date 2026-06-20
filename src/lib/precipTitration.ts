// Titulación argentométrica: Ag⁺ + X⁻ → AgX↓ (estequiometría 1:1)
// Calcula curva pAg (y pX) vs volumen de AgNO₃ agregado.
// Alcance: solo reacciones 1:1 (m:x = 1:1). Otros estequiometrías no están modeladas.
// Fuente: Harris QCA 9.ª ed. cap. 16; Skoog PAQUI.

export interface PrecipParams {
  pKsp: number;       // pKsp del precipitado (ej. 9.74 para AgCl)
  cAnalyte: number;   // concentración de X⁻ en el matraz (M)
  vAnalyte: number;   // volumen del matraz (mL)
  cTitrant: number;   // concentración de Ag⁺ en la bureta (M)
  vMax: number;       // volumen máximo a graficar (mL)
  points?: number;
}

export interface PrecipCurve {
  volumes: number[];
  pAgs: number[];     // −log[Ag⁺]
  pXs: number[];      // −log[X⁻]
  vEq: number;        // volumen de equivalencia (mL)
  pAgEq: number;      // pAg en equivalencia = ½ pKsp
}

export function precipTitrationCurve(params: PrecipParams): PrecipCurve {
  const { pKsp, cAnalyte, vAnalyte, cTitrant, vMax } = params;
  const Ksp = Math.pow(10, -pKsp);
  const points = params.points ?? 500;
  const vEq = (cAnalyte * vAnalyte) / cTitrant;
  const pAgEq = pKsp / 2;

  const volumes: number[] = [];
  const pAgs: number[] = [];
  const pXs: number[] = [];

  for (let i = 0; i <= points; i++) {
    const v = (vMax * i) / points;
    const vTotal_L = (vAnalyte + v) / 1000;
    const nAg = (cTitrant * v) / 1000;
    const nX = (cAnalyte * vAnalyte) / 1000;
    const excess = nAg - nX;

    let cAg: number;
    let cX: number;

    if (Math.abs(excess) < 1e-15 * nX) {
      // En equivalencia exacta
      cAg = Math.sqrt(Ksp);
      cX = Math.sqrt(Ksp);
    } else if (excess < 0) {
      // Antes de equivalencia: exceso de X⁻
      cX = -excess / vTotal_L;
      cAg = Ksp / cX;
    } else {
      // Después de equivalencia: exceso de Ag⁺
      cAg = excess / vTotal_L;
      cX = Ksp / cAg;
    }

    volumes.push(v);
    pAgs.push(-Math.log10(Math.max(cAg, 1e-30)));
    pXs.push(-Math.log10(Math.max(cX, 1e-30)));
  }

  return { volumes, pAgs, pXs, vEq, pAgEq };
}

export interface MohrIndicator {
  name: string;
  /** Concentración del cromato (M) para el indicador Mohr */
  cChromate: number;
  /** pKsp de Ag₂CrO₄ = 11.89 → pAg en EP = ½(pKsp + log[CrO₄²⁻]) */
  pKspChromate: number;
}

export const MOHR_INDICATOR: MohrIndicator = {
  name: 'Mohr (CrO₄²⁻)',
  cChromate: 0.005,
  pKspChromate: 11.89,
};

/** pAg al que precipita Ag₂CrO₄: 2Ag⁺ + CrO₄²⁻ → Ag₂CrO₄↓ */
export function mohrEndpointPAg(cChromate: number): number {
  // Ksp(Ag₂CrO₄) = [Ag⁺]²[CrO₄²⁻] → [Ag⁺] = √(Ksp/[CrO₄²⁻])
  const Ksp_chromate = Math.pow(10, -11.89);
  const cAg = Math.sqrt(Ksp_chromate / cChromate);
  return -Math.log10(cAg);
}

/** Presets de analitos comunes en argentometría */
export interface PrecipPreset {
  id: string;
  cation: string;
  anion: string;
  formula: string;
  pKsp: number;
  isAg: boolean;
}

export const PRECIP_PRESETS: PrecipPreset[] = [
  { id: 'cl',    cation: 'Ag⁺',  anion: 'Cl⁻',    formula: 'AgCl',    pKsp: 9.74,  isAg: true  },
  { id: 'br',    cation: 'Ag⁺',  anion: 'Br⁻',    formula: 'AgBr',    pKsp: 12.30, isAg: true  },
  { id: 'i',     cation: 'Ag⁺',  anion: 'I⁻',     formula: 'AgI',     pKsp: 16.07, isAg: true  },
  { id: 'scn',   cation: 'Ag⁺',  anion: 'SCN⁻',   formula: 'AgSCN',   pKsp: 12.00, isAg: true  },
  { id: 'so4',   cation: 'Ba²⁺', anion: 'SO₄²⁻',  formula: 'BaSO₄',   pKsp: 9.97,  isAg: false },
  { id: 'ox',    cation: 'Ca²⁺', anion: 'C₂O₄²⁻', formula: 'CaC₂O₄', pKsp: 8.64,  isAg: false },
  { id: 'pbso4', cation: 'Pb²⁺', anion: 'SO₄²⁻',  formula: 'PbSO₄',   pKsp: 7.79,  isAg: false },
];

/** @deprecated Usar PRECIP_PRESETS */
export const PRECIP_ANALYTES = PRECIP_PRESETS.map(({ id, anion, formula, pKsp }) => ({
  id, label: anion, formula, pKsp,
}));
