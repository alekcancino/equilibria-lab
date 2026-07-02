// Equilibrium constants database (25 °C, I → 0).
//
// Source priority (highest first):
//   1. HYDRA/Medusa — Puigdomenech I., KTH (2016), freely available at
//      https://www.kth.se/che/medusa
//   2. NIST SRD-46 — NIST Critical Stability Constants of Metal Complexes
//   3. Harris (QCA 9) — Harris D.C., Quantitative Chemical Analysis, 9th ed. (2015)
//   4. Skoog (AC 9)  — Skoog D.A. et al., Principles of Analytical Chemistry, 9th ed.
//
// Each entry carries a `reference` field citing its primary source.
// When HYDRA and a textbook differ, HYDRA wins unless noted in
// docs/constants-provenance.md.

export interface AcidPreset {
  id: string;
  /** Display name, e.g. "Ácido fosfórico" */
  name: string;
  /** Formula of the most protonated form */
  formula: string;
  /** Charge of the fully protonated form */
  z0: number;
  pKas: number[];
  /** Species labels from most to least protonated */
  speciesLabels: string[];
  /** Primary source for pKa values (all entries in ACIDS must cite one) */
  reference?: string;
  /** true if it acts as a base (titrated with a strong acid) */
  isBase?: boolean;
  /** true if it is a strong acid/base */
  strong?: boolean;
}

export const ACIDS: AcidPreset[] = [
  // ── Strong acids/bases ───────────────────────────────────────────────────
  {
    id: 'hcl', name: 'Ácido clorhídrico (fuerte)', formula: 'HCl', z0: 0, pKas: [-7],
    speciesLabels: ['HCl', 'Cl⁻'], reference: 'Harris (QCA 9)', strong: true,
  },
  {
    id: 'naoh', name: 'Hidróxido de sodio (fuerte)', formula: 'NaOH', z0: 0, pKas: [15.7],
    speciesLabels: ['NaOH', 'OH⁻'], reference: 'HYDRA/Medusa', isBase: true, strong: true,
  },
  // ── Monoprotic acids ─────────────────────────────────────────────────────
  {
    id: 'acetic', name: 'Ácido acético', formula: 'CH₃COOH', z0: 0, pKas: [4.76],
    speciesLabels: ['CH₃COOH', 'CH₃COO⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'formic', name: 'Ácido fórmico', formula: 'HCOOH', z0: 0, pKas: [3.75],
    speciesLabels: ['HCOOH', 'HCOO⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'hf', name: 'Ácido fluorhídrico', formula: 'HF', z0: 0, pKas: [3.17],
    speciesLabels: ['HF', 'F⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'hocl', name: 'Ácido hipocloroso', formula: 'HOCl', z0: 0, pKas: [7.50],
    speciesLabels: ['HOCl', 'OCl⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'hno2', name: 'Ácido nitroso', formula: 'HNO₂', z0: 0, pKas: [3.40],
    speciesLabels: ['HNO₂', 'NO₂⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'hcn', name: 'Ácido cianhídrico', formula: 'HCN', z0: 0, pKas: [9.21],
    speciesLabels: ['HCN', 'CN⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'lactic', name: 'Ácido láctico', formula: 'HLac', z0: 0, pKas: [3.86],
    speciesLabels: ['HLac', 'Lac⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'glycolic', name: 'Ácido glicólico', formula: 'HGlyc', z0: 0, pKas: [3.83],
    speciesLabels: ['HGlyc', 'Glyc⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'h3bo3', name: 'Ácido bórico', formula: 'H₃BO₃', z0: 0, pKas: [9.23],
    speciesLabels: ['H₃BO₃', 'H₂BO₃⁻'], reference: 'HYDRA/Medusa',
  },
  // ── Diprotic acids ───────────────────────────────────────────────────────
  {
    id: 'h2s', name: 'Ácido sulfhídrico', formula: 'H₂S', z0: 0, pKas: [7.00, 17.40],
    speciesLabels: ['H₂S', 'HS⁻', 'S²⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'h2so4', name: 'Ácido sulfúrico (2.ª ionización)', formula: 'HSO₄⁻', z0: -1, pKas: [1.99],
    speciesLabels: ['HSO₄⁻', 'SO₄²⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'sulfurous', name: 'Ácido sulfuroso', formula: 'H₂SO₃', z0: 0, pKas: [1.81, 6.91],
    speciesLabels: ['H₂SO₃', 'HSO₃⁻', 'SO₃²⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'carbonic', name: 'Ácido carbónico', formula: 'H₂CO₃', z0: 0, pKas: [6.35, 10.33],
    speciesLabels: ['H₂CO₃', 'HCO₃⁻', 'CO₃²⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'oxalic', name: 'Ácido oxálico', formula: 'H₂C₂O₄', z0: 0, pKas: [1.25, 4.27],
    speciesLabels: ['H₂C₂O₄', 'HC₂O₄⁻', 'C₂O₄²⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'malonic', name: 'Ácido malónico', formula: 'H₂Mal', z0: 0, pKas: [2.83, 5.69],
    speciesLabels: ['H₂Mal', 'HMal⁻', 'Mal²⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'succinic', name: 'Ácido succínico', formula: 'H₂Suc', z0: 0, pKas: [4.21, 5.64],
    speciesLabels: ['H₂Suc', 'HSuc⁻', 'Suc²⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'tartaric', name: 'Ácido tartárico', formula: 'H₂Tar', z0: 0, pKas: [2.98, 4.34],
    speciesLabels: ['H₂Tar', 'HTar⁻', 'Tar²⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'phthalic', name: 'Ácido ftálico', formula: 'H₂Pht', z0: 0, pKas: [2.89, 5.51],
    speciesLabels: ['H₂Pht', 'HPht⁻', 'Pht²⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'maleic', name: 'Ácido maleico', formula: 'H₂Male', z0: 0, pKas: [1.94, 6.22],
    speciesLabels: ['H₂Male', 'HMale⁻', 'Male²⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'salicylic', name: 'Ácido salicílico', formula: 'H₂Sal', z0: 0, pKas: [2.97, 13.74],
    speciesLabels: ['H₂Sal', 'HSal⁻', 'Sal²⁻'], reference: 'NIST SRD-46',
  },
  // ── Triprotic and higher ─────────────────────────────────────────────────
  {
    id: 'phosphoric', name: 'Ácido fosfórico', formula: 'H₃PO₄', z0: 0, pKas: [2.15, 7.20, 12.35],
    speciesLabels: ['H₃PO₄', 'H₂PO₄⁻', 'HPO₄²⁻', 'PO₄³⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'citric', name: 'Ácido cítrico', formula: 'H₃Cit', z0: 0, pKas: [3.13, 4.76, 6.40],
    speciesLabels: ['H₃Cit', 'H₂Cit⁻', 'HCit²⁻', 'Cit³⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'h3aso4', name: 'Ácido arsénico', formula: 'H₃AsO₄', z0: 0, pKas: [2.20, 6.98, 11.50],
    speciesLabels: ['H₃AsO₄', 'H₂AsO₄⁻', 'HAsO₄²⁻', 'AsO₄³⁻'], reference: 'HYDRA/Medusa',
  },
  {
    id: 'nta', name: 'NTA (H₃NTA)', formula: 'H₃NTA', z0: 0, pKas: [1.89, 2.49, 9.73],
    speciesLabels: ['H₃NTA', 'H₂NTA⁻', 'HNTA²⁻', 'NTA³⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'edta', name: 'EDTA (H₄Y)', formula: 'H₄Y', z0: 0, pKas: [2.00, 2.69, 6.13, 10.37],
    speciesLabels: ['H₄Y', 'H₃Y⁻', 'H₂Y²⁻', 'HY³⁻', 'Y⁴⁻'], reference: 'Harris (QCA 9)',
  },
  // ── Amines / bases ───────────────────────────────────────────────────────
  {
    id: 'glycine', name: 'Glicina', formula: 'H₂Gly⁺', z0: 1, pKas: [2.35, 9.78],
    speciesLabels: ['H₂Gly⁺', 'HGly', 'Gly⁻'], reference: 'NIST SRD-46',
  },
  {
    id: 'ammonium', name: 'Amoniaco / Amonio', formula: 'NH₃', z0: 1, pKas: [9.25],
    speciesLabels: ['NH₄⁺', 'NH₃'], reference: 'HYDRA/Medusa', isBase: true,
  },
  {
    id: 'methylamine', name: 'Metilamina', formula: 'CH₃NH₂', z0: 1, pKas: [10.64],
    speciesLabels: ['CH₃NH₃⁺', 'CH₃NH₂'], reference: 'NIST SRD-46', isBase: true,
  },
  {
    id: 'pyridine', name: 'Piridina', formula: 'C₅H₅N', z0: 1, pKas: [5.23],
    speciesLabels: ['C₅H₅NH⁺', 'C₅H₅N'], reference: 'HYDRA/Medusa', isBase: true,
  },
  {
    id: 'tris', name: 'TRIS (tampón)', formula: 'TRIS', z0: 1, pKas: [8.08],
    speciesLabels: ['TRIS·H⁺', 'TRIS'], reference: 'NIST SRD-46', isBase: true,
  },
];

export interface Indicator {
  id: string;
  name: string;
  /** Transition interval [low pH, high pH] */
  range: [number, number];
  /** Colors: acid form → basic form */
  colors: [string, string];
}

export const INDICATORS: Indicator[] = [
  { id: 'methyl_orange', name: 'Naranja de metilo', range: [3.1, 4.4], colors: ['#e74c3c', '#f1c40f'] },
  { id: 'methyl_red', name: 'Rojo de metilo', range: [4.2, 6.3], colors: ['#e74c3c', '#f1c40f'] },
  { id: 'bromothymol', name: 'Azul de bromotimol', range: [6.0, 7.6], colors: ['#f1c40f', '#2980b9'] },
  { id: 'phenolphthalein', name: 'Fenolftaleína', range: [8.2, 10.0], colors: ['#ffffff', '#e84393'] },
  { id: 'thymolphthalein', name: 'Timolftaleína', range: [9.3, 10.5], colors: ['#ffffff', '#2980b9'] },
];

export interface SaltPreset {
  id: string;
  name: string;
  formula: string;
  /** pKsp = −log Ksp (thermodynamic, I → 0) */
  pKsp: number;
  /** stoichiometry: MmXx */
  m: number;
  x: number;
  /** pKa(s) of the conjugate acid of the anion (for pH-dependent solubility) */
  anionPKas?: number[];
  anionLabel: string;
  cationLabel: string;
  /** Ion charges for Debye–Hückel correction (defaults to 1 if omitted) */
  zCation?: number;
  zAnion?: number;
  /** Primary source for pKsp (all entries in SALTS must cite one) */
  reference?: string;
}

export const SALTS: SaltPreset[] = [
  // ── Silver halides ───────────────────────────────────────────────────────
  { id: 'agcl',  name: 'Cloruro de plata',    formula: 'AgCl',   pKsp: 9.74,  m: 1, x: 1, anionLabel: 'Cl⁻',   cationLabel: 'Ag⁺',  zCation: 1, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'agbr',  name: 'Bromuro de plata',    formula: 'AgBr',   pKsp: 12.30, m: 1, x: 1, anionLabel: 'Br⁻',   cationLabel: 'Ag⁺',  zCation: 1, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'agi',   name: 'Yoduro de plata',     formula: 'AgI',    pKsp: 16.08, m: 1, x: 1, anionLabel: 'I⁻',    cationLabel: 'Ag⁺',  zCation: 1, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'agscn', name: 'Tiocianato de plata', formula: 'AgSCN',  pKsp: 12.00, m: 1, x: 1, anionLabel: 'SCN⁻',  cationLabel: 'Ag⁺',  zCation: 1, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'ag2s',  name: 'Sulfuro de plata',    formula: 'Ag₂S',   pKsp: 49.20, m: 2, x: 1, anionPKas: [7.00, 17.40], anionLabel: 'S²⁻', cationLabel: 'Ag⁺', zCation: 1, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'ag2so4', name: 'Sulfato de plata',   formula: 'Ag₂SO₄', pKsp: 4.83,  m: 2, x: 1, anionPKas: [1.99], anionLabel: 'SO₄²⁻', cationLabel: 'Ag⁺', zCation: 1, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'ag3po4', name: 'Fosfato de plata',   formula: 'Ag₃PO₄', pKsp: 17.55, m: 3, x: 1, anionPKas: [2.15, 7.20, 12.35], anionLabel: 'PO₄³⁻', cationLabel: 'Ag⁺', zCation: 1, zAnion: 3, reference: 'Harris (QCA 9)' },
  { id: 'ag2cro4', name: 'Cromato de plata',  formula: 'Ag₂CrO₄', pKsp: 11.89, m: 2, x: 1, anionPKas: [0.74, 6.51], anionLabel: 'CrO₄²⁻', cationLabel: 'Ag⁺', zCation: 1, zAnion: 2, reference: 'Harris (QCA 9)' },
  // ── Lead salts ───────────────────────────────────────────────────────────
  { id: 'pbi2',  name: 'Yoduro de plomo',     formula: 'PbI₂',   pKsp: 8.10,  m: 1, x: 2, anionLabel: 'I⁻',    cationLabel: 'Pb²⁺', zCation: 2, zAnion: 1, reference: 'Harris (QCA 9)' },
  { id: 'pbf2',  name: 'Fluoruro de plomo',   formula: 'PbF₂',   pKsp: 7.44,  m: 1, x: 2, anionPKas: [3.17], anionLabel: 'F⁻',    cationLabel: 'Pb²⁺', zCation: 2, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'pbso4', name: 'Sulfato de plomo',    formula: 'PbSO₄',  pKsp: 7.79,  m: 1, x: 1, anionPKas: [1.99], anionLabel: 'SO₄²⁻', cationLabel: 'Pb²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'pbco3', name: 'Carbonato de plomo',  formula: 'PbCO₃',  pKsp: 13.13, m: 1, x: 1, anionPKas: [6.35, 10.33], anionLabel: 'CO₃²⁻', cationLabel: 'Pb²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'pbcro4', name: 'Cromato de plomo',   formula: 'PbCrO₄', pKsp: 13.75, m: 1, x: 1, anionPKas: [0.74, 6.51], anionLabel: 'CrO₄²⁻', cationLabel: 'Pb²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  // ── Calcium and magnesium salts ───────────────────────────────────────────
  { id: 'caco3', name: 'Carbonato de calcio', formula: 'CaCO₃',  pKsp: 8.48,  m: 1, x: 1, anionPKas: [6.35, 10.33], anionLabel: 'CO₃²⁻', cationLabel: 'Ca²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'caf2',  name: 'Fluoruro de calcio',  formula: 'CaF₂',   pKsp: 10.60, m: 1, x: 2, anionPKas: [3.17], anionLabel: 'F⁻',    cationLabel: 'Ca²⁺', zCation: 2, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'caox',  name: 'Oxalato de calcio',   formula: 'CaC₂O₄', pKsp: 8.60,  m: 1, x: 1, anionPKas: [1.25, 4.27], anionLabel: 'C₂O₄²⁻', cationLabel: 'Ca²⁺', zCation: 2, zAnion: 2, reference: 'Harris (QCA 9)' },
  { id: 'mgoh2', name: 'Hidróxido de magnesio', formula: 'Mg(OH)₂', pKsp: 11.15, m: 1, x: 2, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Mg²⁺', zCation: 2, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'ca3po4', name: 'Fosfato de calcio',  formula: 'Ca₃(PO₄)₂', pKsp: 28.92, m: 3, x: 2, anionPKas: [2.15, 7.20, 12.35], anionLabel: 'PO₄³⁻', cationLabel: 'Ca²⁺', zCation: 2, zAnion: 3, reference: 'Harris (QCA 9)' },
  // ── Barium / strontium ───────────────────────────────────────────────────
  { id: 'baso4', name: 'Sulfato de bario',    formula: 'BaSO₄',  pKsp: 9.97,  m: 1, x: 1, anionPKas: [1.99], anionLabel: 'SO₄²⁻', cationLabel: 'Ba²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'srso4', name: 'Sulfato de estroncio', formula: 'SrSO₄', pKsp: 6.49,  m: 1, x: 1, anionPKas: [1.99], anionLabel: 'SO₄²⁻', cationLabel: 'Sr²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'srco3', name: 'Carbonato de estroncio', formula: 'SrCO₃', pKsp: 9.60, m: 1, x: 1, anionPKas: [6.35, 10.33], anionLabel: 'CO₃²⁻', cationLabel: 'Sr²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  // ── Metal hydroxides ─────────────────────────────────────────────────────
  { id: 'feoh3', name: 'Hidróxido de hierro(III)', formula: 'Fe(OH)₃', pKsp: 38.50, m: 1, x: 3, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Fe³⁺', zCation: 3, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'feoh2', name: 'Hidróxido de hierro(II)',  formula: 'Fe(OH)₂', pKsp: 15.10, m: 1, x: 2, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Fe²⁺', zCation: 2, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'cuoh2', name: 'Hidróxido de cobre(II)',   formula: 'Cu(OH)₂', pKsp: 19.30, m: 1, x: 2, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Cu²⁺', zCation: 2, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'aloh3', name: 'Hidróxido de aluminio',    formula: 'Al(OH)₃', pKsp: 32.40, m: 1, x: 3, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Al³⁺', zCation: 3, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'croh3', name: 'Hidróxido de cromo(III)', formula: 'Cr(OH)₃',  pKsp: 29.80, m: 1, x: 3, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Cr³⁺', zCation: 3, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'nioh2', name: 'Hidróxido de níquel',      formula: 'Ni(OH)₂', pKsp: 15.26, m: 1, x: 2, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Ni²⁺', zCation: 2, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'cdoh2', name: 'Hidróxido de cadmio',      formula: 'Cd(OH)₂', pKsp: 13.60, m: 1, x: 2, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Cd²⁺', zCation: 2, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'mnoh2', name: 'Hidróxido de manganeso(II)', formula: 'Mn(OH)₂', pKsp: 12.72, m: 1, x: 2, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Mn²⁺', zCation: 2, zAnion: 1, reference: 'HYDRA/Medusa' },
  { id: 'pboh2', name: 'Hidróxido de plomo(II)',   formula: 'Pb(OH)₂', pKsp: 19.90, m: 1, x: 2, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Pb²⁺', zCation: 2, zAnion: 1, reference: 'HYDRA/Medusa' },
  // ── Metal sulfides ───────────────────────────────────────────────────────
  { id: 'cus',  name: 'Sulfuro de cobre(II)',   formula: 'CuS',  pKsp: 35.20, m: 1, x: 1, anionPKas: [7.00, 17.40], anionLabel: 'S²⁻', cationLabel: 'Cu²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'pbs',  name: 'Sulfuro de plomo',       formula: 'PbS',  pKsp: 27.90, m: 1, x: 1, anionPKas: [7.00, 17.40], anionLabel: 'S²⁻', cationLabel: 'Pb²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'zns',  name: 'Sulfuro de zinc',        formula: 'ZnS',  pKsp: 23.80, m: 1, x: 1, anionPKas: [7.00, 17.40], anionLabel: 'S²⁻', cationLabel: 'Zn²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'cds',  name: 'Sulfuro de cadmio',      formula: 'CdS',  pKsp: 27.00, m: 1, x: 1, anionPKas: [7.00, 17.40], anionLabel: 'S²⁻', cationLabel: 'Cd²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'fes',  name: 'Sulfuro de hierro(II)',  formula: 'FeS',  pKsp: 18.10, m: 1, x: 1, anionPKas: [7.00, 17.40], anionLabel: 'S²⁻', cationLabel: 'Fe²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'mns',  name: 'Sulfuro de manganeso',   formula: 'MnS',  pKsp: 12.60, m: 1, x: 1, anionPKas: [7.00, 17.40], anionLabel: 'S²⁻', cationLabel: 'Mn²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'nis',  name: 'Sulfuro de níquel',      formula: 'NiS',  pKsp: 19.40, m: 1, x: 1, anionPKas: [7.00, 17.40], anionLabel: 'S²⁻', cationLabel: 'Ni²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'hgs',  name: 'Sulfuro de mercurio(II)', formula: 'HgS', pKsp: 52.40, m: 1, x: 1, anionPKas: [7.00, 17.40], anionLabel: 'S²⁻', cationLabel: 'Hg²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  // ── Metal carbonates ─────────────────────────────────────────────────────
  { id: 'mnco3', name: 'Carbonato de manganeso', formula: 'MnCO₃', pKsp:  9.30, m: 1, x: 1, anionPKas: [6.35, 10.33], anionLabel: 'CO₃²⁻', cationLabel: 'Mn²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'znco3', name: 'Carbonato de zinc',      formula: 'ZnCO₃', pKsp: 10.00, m: 1, x: 1, anionPKas: [6.35, 10.33], anionLabel: 'CO₃²⁻', cationLabel: 'Zn²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
  { id: 'cdco3', name: 'Carbonato de cadmio',    formula: 'CdCO₃', pKsp: 11.93, m: 1, x: 1, anionPKas: [6.35, 10.33], anionLabel: 'CO₃²⁻', cationLabel: 'Cd²⁺', zCation: 2, zAnion: 2, reference: 'HYDRA/Medusa' },
];

/** Color for system markers (pH, pe, equilibrium lines) — Okabe-Ito pink */
export const MARKER_COLOR = '#CC79A7';

/** Okabe-Ito palette (colorblind-safe) for species series */
export const SPECIES_COLORS = [
  '#0072B2', '#D55E00', '#009E73', '#CC79A7',
  '#E69F00', '#56B4E9', '#2C3E50', '#999999',
];
