// Database of chemical species with equilibrium constants (25 °C).
// Sources: Harris, Quantitative Chemical Analysis; Skoog, Analytical Chemistry.

export interface AcidPreset {
  id: string;
  /** Display name, e.g. "Ácido fosfórico" */
  name: string;
  /** Formula of the most protonated form with HTML sub/sup, e.g. "H<sub>3</sub>PO<sub>4</sub>" */
  formula: string;
  /** Charge of the fully protonated form */
  z0: number;
  pKas: number[];
  /** Species labels from most to least protonated (HTML) */
  speciesLabels: string[];
  /** true if it acts as a base (titrated with a strong acid) */
  isBase?: boolean;
  /** true if it is a strong acid/base (pKa not applicable for titration) */
  strong?: boolean;
}

export const ACIDS: AcidPreset[] = [
  {
    id: 'hcl', name: 'Ácido clorhídrico (fuerte)', formula: 'HCl', z0: 0, pKas: [-7],
    speciesLabels: ['HCl', 'Cl⁻'], strong: true,
  },
  {
    id: 'acetic', name: 'Ácido acético', formula: 'CH₃COOH', z0: 0, pKas: [4.76],
    speciesLabels: ['CH₃COOH', 'CH₃COO⁻'],
  },
  {
    id: 'formic', name: 'Ácido fórmico', formula: 'HCOOH', z0: 0, pKas: [3.75],
    speciesLabels: ['HCOOH', 'HCOO⁻'],
  },
  {
    id: 'hf', name: 'Ácido fluorhídrico', formula: 'HF', z0: 0, pKas: [3.17],
    speciesLabels: ['HF', 'F⁻'],
  },
  {
    id: 'hocl', name: 'Ácido hipocloroso', formula: 'HOCl', z0: 0, pKas: [7.53],
    speciesLabels: ['HOCl', 'OCl⁻'],
  },
  {
    id: 'carbonic', name: 'Ácido carbónico', formula: 'H₂CO₃', z0: 0, pKas: [6.35, 10.33],
    speciesLabels: ['H₂CO₃', 'HCO₃⁻', 'CO₃²⁻'],
  },
  {
    id: 'oxalic', name: 'Ácido oxálico', formula: 'H₂C₂O₄', z0: 0, pKas: [1.25, 4.27],
    speciesLabels: ['H₂C₂O₄', 'HC₂O₄⁻', 'C₂O₄²⁻'],
  },
  {
    id: 'sulfurous', name: 'Ácido sulfuroso', formula: 'H₂SO₃', z0: 0, pKas: [1.86, 7.17],
    speciesLabels: ['H₂SO₃', 'HSO₃⁻', 'SO₃²⁻'],
  },
  {
    id: 'phosphoric', name: 'Ácido fosfórico', formula: 'H₃PO₄', z0: 0, pKas: [2.15, 7.20, 12.35],
    speciesLabels: ['H₃PO₄', 'H₂PO₄⁻', 'HPO₄²⁻', 'PO₄³⁻'],
  },
  {
    id: 'citric', name: 'Ácido cítrico', formula: 'H₃Cit', z0: 0, pKas: [3.13, 4.76, 6.40],
    speciesLabels: ['H₃Cit', 'H₂Cit⁻', 'HCit²⁻', 'Cit³⁻'],
  },
  {
    id: 'edta', name: 'EDTA (H₄Y)', formula: 'H₄Y', z0: 0, pKas: [2.00, 2.69, 6.13, 10.37],
    speciesLabels: ['H₄Y', 'H₃Y⁻', 'H₂Y²⁻', 'HY³⁻', 'Y⁴⁻'],
  },
  {
    id: 'ammonium', name: 'Amoniaco / Amonio', formula: 'NH₃', z0: 1, pKas: [9.25],
    speciesLabels: ['NH₄⁺', 'NH₃'], isBase: true,
  },
  {
    id: 'methylamine', name: 'Metilamina', formula: 'CH₃NH₂', z0: 1, pKas: [10.64],
    speciesLabels: ['CH₃NH₃⁺', 'CH₃NH₂'], isBase: true,
  },
  {
    id: 'pyridine', name: 'Piridina', formula: 'C₅H₅N', z0: 1, pKas: [5.23],
    speciesLabels: ['C₅H₅NH⁺', 'C₅H₅N'], isBase: true,
  },
  {
    id: 'naoh', name: 'Hidróxido de sodio (fuerte)', formula: 'NaOH', z0: 0, pKas: [15.7],
    speciesLabels: ['NaOH', 'OH⁻'], isBase: true, strong: true,
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
  /** pKsp */
  pKsp: number;
  /** stoichiometry M_m X_x */
  m: number;
  x: number;
  /** pKa(s) of the conjugate acid of the anion, if the anion is basic (for pH effect) */
  anionPKas?: number[];
  /** how many protons the anion can accept (index of free species in alphas) */
  anionLabel: string;
  cationLabel: string;
  /** Ion charges for Debye-Hückel activity correction of Ksp (defaults to 1 if omitted) */
  zCation?: number;
  zAnion?: number;
}

export const SALTS: SaltPreset[] = [
  { id: 'agcl', name: 'Cloruro de plata', formula: 'AgCl', pKsp: 9.74, m: 1, x: 1, anionLabel: 'Cl⁻', cationLabel: 'Ag⁺', zCation: 1, zAnion: 1 },
  { id: 'agbr', name: 'Bromuro de plata', formula: 'AgBr', pKsp: 12.30, m: 1, x: 1, anionLabel: 'Br⁻', cationLabel: 'Ag⁺', zCation: 1, zAnion: 1 },
  { id: 'baso4', name: 'Sulfato de bario', formula: 'BaSO₄', pKsp: 9.96, m: 1, x: 1, anionPKas: [1.99], anionLabel: 'SO₄²⁻', cationLabel: 'Ba²⁺', zCation: 2, zAnion: 2 },
  { id: 'caco3', name: 'Carbonato de calcio', formula: 'CaCO₃', pKsp: 8.54, m: 1, x: 1, anionPKas: [6.35, 10.33], anionLabel: 'CO₃²⁻', cationLabel: 'Ca²⁺', zCation: 2, zAnion: 2 },
  { id: 'caf2', name: 'Fluoruro de calcio', formula: 'CaF₂', pKsp: 10.50, m: 1, x: 2, anionPKas: [3.17], anionLabel: 'F⁻', cationLabel: 'Ca²⁺', zCation: 2, zAnion: 1 },
  { id: 'mgoh2', name: 'Hidróxido de magnesio', formula: 'Mg(OH)₂', pKsp: 11.15, m: 1, x: 2, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Mg²⁺', zCation: 2, zAnion: 1 },
  { id: 'caox', name: 'Oxalato de calcio', formula: 'CaC₂O₄', pKsp: 8.60, m: 1, x: 1, anionPKas: [1.25, 4.27], anionLabel: 'C₂O₄²⁻', cationLabel: 'Ca²⁺', zCation: 2, zAnion: 2 },
  { id: 'pbi2', name: 'Yoduro de plomo', formula: 'PbI₂', pKsp: 8.10, m: 1, x: 2, anionLabel: 'I⁻', cationLabel: 'Pb²⁺', zCation: 2, zAnion: 1 },
];

/** Color for system markers (pH, pe, equilibrium lines) — Okabe-Ito pink */
export const MARKER_COLOR = '#CC79A7';

/**
 * Species series palette: six core Okabe-Ito hues (colorblind-safe) plus
 * violet/olive extras — the old slate/gray slots 7-8 failed the palette
 * lightness/chroma validation in both themes. Dark-mode equivalents are
 * remapped centrally in lib/plotTheme.ts.
 */
export const SPECIES_COLORS = [
  '#0072B2', '#D55E00', '#009E73', '#CC79A7',
  '#E69F00', '#56B4E9', '#7B5CD6', '#9A6A00',
];
