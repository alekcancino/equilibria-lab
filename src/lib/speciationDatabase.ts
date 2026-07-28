// One-click metal speciation systems: hydrolysis (M–OH) + optional auxiliary
// ligand (M–L), for the "Especiación vs pH" view. Reuses the exact log β
// arrays already validated elsewhere in the app (systemPresets.ts,
// complexDatabase.ts, SolubilidadCondicional.tsx) so results stay consistent
// across hubs.

import type { MetalSpeciationSystem } from './speciation';
import { catalogSource, type ConstantSource } from './provenance';

export interface SpeciationPreset {
  id: string;
  name: string;
  group: string;
  detail: string;
  source: ConstantSource;
  /** Set when a constant (e.g. an anionic hydroxo-complex) hasn't been
   * cross-checked against a primary source for this specific feature. */
  needsVerification?: boolean;
  system: MetalSpeciationSystem;
  /** Species labels in the fixed [M, MOH…, ML…] order (see speciation.ts). */
  speciesLabels: string[];
}

const BURGOT = catalogSource('Burgot, Ionic Equilibria in Analytical Chemistry');
const HARRIS = catalogSource('Harris, Quantitative Chemical Analysis');
const STUMM = catalogSource('Stumm & Morgan, Aquatic Chemistry', 'primary');

const NH3_PKA = [9.25]; // NH4+ ⇌ NH3 + H+ (Harris, QCA)

export const SPECIATION_PRESETS: SpeciationPreset[] = [
  {
    id: 'hg-oh',
    name: 'Hg²⁺ — hidrólisis',
    group: 'Hg²⁺',
    detail: 'Solo hidrólisis, sin ligando auxiliar',
    source: BURGOT,
    system: {
      metalLabel: 'Hg²⁺', cM: 1e-4,
      logBetasOH: [10.3, 21.7],
      ligandLabel: undefined, logBetasL: [], pKasL: [], cL: 0,
    },
    speciesLabels: ['Hg²⁺', 'HgOH⁺', 'Hg(OH)₂'],
  },
  {
    id: 'hg-cl',
    name: 'Hg²⁺ — Cl⁻',
    group: 'Hg²⁺',
    detail: 'Hidrólisis acoplada con complejación por cloruro',
    source: BURGOT,
    system: {
      metalLabel: 'Hg²⁺', cM: 0.1,
      logBetasOH: [10.3, 21.7],
      ligandLabel: 'Cl⁻', logBetasL: [6.74, 13.22, 14.07, 15.07], pKasL: [], cL: 0.2,
    },
    speciesLabels: ['Hg²⁺', 'HgOH⁺', 'Hg(OH)₂', 'HgCl⁺', 'HgCl₂', 'HgCl₃⁻', 'HgCl₄²⁻'],
  },
  {
    id: 'zn-nh3',
    name: 'Zn²⁺ — NH₃',
    group: 'Enmascaramiento con NH₃',
    detail: 'Hidrólisis + amino-complejos, típico de enmascaramiento',
    source: HARRIS,
    system: {
      metalLabel: 'Zn²⁺', cM: 0.01,
      logBetasOH: [5.04, 10.43, 13.7, 15.2],
      ligandLabel: 'NH₃', logBetasL: [2.37, 4.81, 7.31, 9.46], pKasL: NH3_PKA, cL: 1.0,
    },
    speciesLabels: [
      'Zn²⁺', 'ZnOH⁺', 'Zn(OH)₂', 'Zn(OH)₃⁻', 'Zn(OH)₄²⁻',
      'Zn(NH₃)²⁺', 'Zn(NH₃)₂²⁺', 'Zn(NH₃)₃²⁺', 'Zn(NH₃)₄²⁺',
    ],
  },
  {
    id: 'cu-nh3',
    name: 'Cu²⁺ — NH₃',
    group: 'Enmascaramiento con NH₃',
    detail: 'Hidrólisis + amino-complejos, típico de enmascaramiento',
    source: HARRIS,
    system: {
      metalLabel: 'Cu²⁺', cM: 0.01,
      logBetasOH: [6.0, 11.8],
      ligandLabel: 'NH₃', logBetasL: [4.04, 7.47, 10.27, 12.03], pKasL: NH3_PKA, cL: 1.0,
    },
    speciesLabels: [
      'Cu²⁺', 'CuOH⁺', 'Cu(OH)₂',
      'Cu(NH₃)²⁺', 'Cu(NH₃)₂²⁺', 'Cu(NH₃)₃²⁺', 'Cu(NH₃)₄²⁺',
    ],
  },
  {
    id: 'fe3-oh',
    name: 'Fe³⁺ — hidrólisis',
    group: 'Cationes M³⁺ (precipitan a pH ácido)',
    detail: 'Serie de hidrólisis completa hasta Fe(OH)₃',
    source: HARRIS,
    system: {
      metalLabel: 'Fe³⁺', cM: 0.01,
      logBetasOH: [11.81, 21.68, 30.67],
      ligandLabel: undefined, logBetasL: [], pKasL: [], cL: 0,
    },
    speciesLabels: ['Fe³⁺', 'FeOH²⁺', 'Fe(OH)₂⁺', 'Fe(OH)₃'],
  },
  {
    id: 'al-oh',
    name: 'Al³⁺ — hidrólisis',
    group: 'Cationes M³⁺ (precipitan a pH ácido)',
    detail: 'Serie de hidrólisis, incluye el complejo aniónico Al(OH)₄⁻',
    source: catalogSource(STUMM.citation, 'illustrative', {
      uncertainty: 'Al(OH)₄⁻ constant not cross-checked for this feature',
    }),
    needsVerification: true,
    system: {
      metalLabel: 'Al³⁺', cM: 0.01,
      logBetasOH: [9.01, 17.09, 23.40, 27.68],
      ligandLabel: undefined, logBetasL: [], pKasL: [], cL: 0,
    },
    speciesLabels: ['Al³⁺', 'AlOH²⁺', 'Al(OH)₂⁺', 'Al(OH)₃', 'Al(OH)₄⁻'],
  },
];

export function speciationPresetById(id: string): SpeciationPreset | undefined {
  return SPECIATION_PRESETS.find((p) => p.id === id);
}
