// Base de datos de especies químicas con constantes de equilibrio (25 °C).
// Fuentes: Harris, Quantitative Chemical Analysis; Skoog, Analytical Chemistry.

export interface AcidPreset {
  id: string;
  /** Nombre para mostrar, ej. "Ácido fosfórico" */
  name: string;
  /** Fórmula de la forma más protonada, con HTML sub/sup, ej. "H<sub>3</sub>PO<sub>4</sub>" */
  formula: string;
  /** Carga de la forma totalmente protonada */
  z0: number;
  pKas: number[];
  /** Etiquetas de cada especie, de más a menos protonada (HTML) */
  speciesLabels: string[];
  /** true si funciona como base (se titula con ácido fuerte) */
  isBase?: boolean;
  /** true si es ácido/base fuerte (pKa no aplica para titulación) */
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
  /** Intervalo de vire [pH bajo, pH alto] */
  range: [number, number];
  /** Colores ácido → básico */
  colors: [string, string];
}

export const INDICATORS: Indicator[] = [
  { id: 'methyl_orange', name: 'Naranja de metilo', range: [3.1, 4.4], colors: ['#e74c3c', '#f1c40f'] },
  { id: 'methyl_red', name: 'Rojo de metilo', range: [4.2, 6.3], colors: ['#e74c3c', '#f1c40f'] },
  { id: 'bromothymol', name: 'Azul de bromotimol', range: [6.0, 7.6], colors: ['#f1c40f', '#2980b9'] },
  { id: 'phenolphthalein', name: 'Fenolftaleína', range: [8.2, 10.0], colors: ['#ffffff', '#e84393'] },
  { id: 'thymolphthalein', name: 'Timolftaleína', range: [9.3, 10.5], colors: ['#ffffff', '#2980b9'] },
];

export interface MetalPreset {
  id: string;
  name: string;
  symbol: string;
  /** log Kf del complejo M–EDTA */
  logKf: number;
}

// log Kf de complejos metal-EDTA (Harris, apéndice)
export const METALS: MetalPreset[] = [
  { id: 'mg', name: 'Magnesio', symbol: 'Mg²⁺', logKf: 8.79 },
  { id: 'ca', name: 'Calcio', symbol: 'Ca²⁺', logKf: 10.69 },
  { id: 'mn', name: 'Manganeso', symbol: 'Mn²⁺', logKf: 13.87 },
  { id: 'fe2', name: 'Hierro (II)', symbol: 'Fe²⁺', logKf: 14.32 },
  { id: 'zn', name: 'Zinc', symbol: 'Zn²⁺', logKf: 16.5 },
  { id: 'pb', name: 'Plomo', symbol: 'Pb²⁺', logKf: 18.04 },
  { id: 'cu', name: 'Cobre (II)', symbol: 'Cu²⁺', logKf: 18.8 },
  { id: 'fe3', name: 'Hierro (III)', symbol: 'Fe³⁺', logKf: 25.1 },
];

export interface SaltPreset {
  id: string;
  name: string;
  formula: string;
  /** pKsp */
  pKsp: number;
  /** estequiometría M_m X_x */
  m: number;
  x: number;
  /** pKa(s) del ácido conjugado del anión, si el anión es básico (para efecto del pH) */
  anionPKas?: number[];
  /** cuántos protones puede aceptar el anión (índice de la especie libre en alphas) */
  anionLabel: string;
  cationLabel: string;
}

export const SALTS: SaltPreset[] = [
  { id: 'agcl', name: 'Cloruro de plata', formula: 'AgCl', pKsp: 9.74, m: 1, x: 1, anionLabel: 'Cl⁻', cationLabel: 'Ag⁺' },
  { id: 'agbr', name: 'Bromuro de plata', formula: 'AgBr', pKsp: 12.30, m: 1, x: 1, anionLabel: 'Br⁻', cationLabel: 'Ag⁺' },
  { id: 'baso4', name: 'Sulfato de bario', formula: 'BaSO₄', pKsp: 9.96, m: 1, x: 1, anionPKas: [1.99], anionLabel: 'SO₄²⁻', cationLabel: 'Ba²⁺' },
  { id: 'caco3', name: 'Carbonato de calcio', formula: 'CaCO₃', pKsp: 8.54, m: 1, x: 1, anionPKas: [6.35, 10.33], anionLabel: 'CO₃²⁻', cationLabel: 'Ca²⁺' },
  { id: 'caf2', name: 'Fluoruro de calcio', formula: 'CaF₂', pKsp: 10.50, m: 1, x: 2, anionPKas: [3.17], anionLabel: 'F⁻', cationLabel: 'Ca²⁺' },
  { id: 'mgoh2', name: 'Hidróxido de magnesio', formula: 'Mg(OH)₂', pKsp: 11.15, m: 1, x: 2, anionPKas: [15.7], anionLabel: 'OH⁻', cationLabel: 'Mg²⁺' },
  { id: 'caox', name: 'Oxalato de calcio', formula: 'CaC₂O₄', pKsp: 8.60, m: 1, x: 1, anionPKas: [1.25, 4.27], anionLabel: 'C₂O₄²⁻', cationLabel: 'Ca²⁺' },
  { id: 'pbi2', name: 'Yoduro de plomo', formula: 'PbI₂', pKsp: 8.10, m: 1, x: 2, anionLabel: 'I⁻', cationLabel: 'Pb²⁺' },
];

/** Paleta Okabe-Ito (segura para daltonismo) para series de especies */
export const SPECIES_COLORS = [
  '#D55E00', '#0072B2', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#2c3e50', '#999999',
];
