// Argentometric titration: m·M + x·X → MmXx↓ (default 1:1, e.g. Ag⁺ + Cl⁻ → AgCl)
// Computes pM (and pX) curve vs. volume of titrant added.
// Source: Harris QCA ch. 16; Skoog PAQUI.

export interface PrecipParams {
  pKsp: number;       // pKsp of the precipitate (e.g. 9.74 for AgCl)
  cAnalyte: number;   // concentration of X in the flask (M)
  vAnalyte: number;   // flask volume (mL)
  cTitrant: number;   // M concentration in the burette (M)
  vMax: number;       // maximum volume to plot (mL)
  /** MmXx stoichiometric coefficients (default 1:1, e.g. AgCl, BaSO4). */
  m?: number;
  x?: number;
  points?: number;
}

export interface PrecipCurve {
  volumes: number[];
  pAgs: number[];     // −log[M]
  pXs: number[];      // −log[X]
  vEq: number;        // equivalence volume (mL)
  pAgEq: number;      // pM at equivalence
}

export function precipTitrationCurve(params: PrecipParams): PrecipCurve {
  const { pKsp, cAnalyte, vAnalyte, cTitrant, vMax } = params;
  const m = params.m ?? 1;
  const x = params.x ?? 1;
  const Ksp = Math.pow(10, -pKsp);
  const points = params.points ?? 500;
  const vEq = (m / x) * ((cAnalyte * vAnalyte) / cTitrant);
  // At the exact stoichiometric point of MmXx: [M]^m·[X]^x = Ksp together
  // with the mole balance x·[M] = m·[X] (m mol M and x mol X dissolve in
  // lockstep) — solving both gives [M] in closed form. Reduces to
  // [M]=[X]=√Ksp for the m=x=1 case (AgCl-style).
  const mOverX = m / x;
  const mAtEq = Math.pow(Ksp / Math.pow(mOverX, x), 1 / (m + x));
  const pAgEq = -Math.log10(mAtEq);

  const volumes: number[] = [];
  const pAgs: number[] = [];
  const pXs: number[] = [];

  for (let i = 0; i <= points; i++) {
    const v = (vMax * i) / points;
    const vTotal_L = (vAnalyte + v) / 1000;
    const nTitrant = (cTitrant * v) / 1000;
    const nAnalyte = (cAnalyte * vAnalyte) / 1000;
    // Formula units of MmXx precipitate if M (resp. X) were fully consumed —
    // whichever is smaller is the limiting reagent at this point.
    const xiFromM = nTitrant / m;
    const xiFromX = nAnalyte / x;
    const excess = xiFromM - xiFromX;

    let cAg: number;
    let cX: number;

    if (Math.abs(excess) < 1e-15 * xiFromX) {
      // Exact equivalence point
      cAg = mAtEq;
      cX = mOverX * mAtEq;
    } else if (excess < 0) {
      // Before equivalence: X in excess (M essentially fully precipitated)
      cX = (nAnalyte - x * xiFromM) / vTotal_L;
      cAg = Math.pow(Ksp / Math.pow(cX, x), 1 / m);
    } else {
      // After equivalence: M in excess (X essentially fully precipitated)
      cAg = (nTitrant - m * xiFromX) / vTotal_L;
      cX = Math.pow(Ksp / Math.pow(cAg, m), 1 / x);
    }

    volumes.push(v);
    pAgs.push(-Math.log10(Math.max(cAg, 1e-30)));
    pXs.push(-Math.log10(Math.max(cX, 1e-30)));
  }

  return { volumes, pAgs, pXs, vEq, pAgEq };
}

export interface MohrIndicator {
  name: string;
  /** Chromate concentration (M) for the Mohr indicator */
  cChromate: number;
  /** pKsp of Ag₂CrO₄ = 11.89 → pAg at EP = ½(pKsp + log[CrO₄²⁻]) */
  pKspChromate: number;
}

export const MOHR_INDICATOR: MohrIndicator = {
  name: 'Mohr (CrO₄²⁻)',
  cChromate: 0.005,
  pKspChromate: 11.89,
};

/** pAg at which Ag₂CrO₄ precipitates: 2Ag⁺ + CrO₄²⁻ → Ag₂CrO₄↓ */
export function mohrEndpointPAg(cChromate: number): number {
  // Ksp(Ag₂CrO₄) = [Ag⁺]²[CrO₄²⁻] → [Ag⁺] = √(Ksp/[CrO₄²⁻])
  const Ksp_chromate = Math.pow(10, -11.89);
  const cAg = Math.sqrt(Ksp_chromate / cChromate);
  return -Math.log10(cAg);
}

/** Common analyte presets for argentometric titrations */
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

/** @deprecated Use PRECIP_PRESETS */
export const PRECIP_ANALYTES = PRECIP_PRESETS.map(({ id, anion, formula, pKsp }) => ({
  id, label: anion, formula, pKsp,
}));
