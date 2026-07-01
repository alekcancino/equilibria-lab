// Redox couples with standard potentials and bibliographic references.
// Inherited and verified from the EquilibriaLab project (constants.json, audited).
// Single list: any couple can be analyte or titrant in either direction.

import type { RedoxCouple } from './redox';

export interface RedoxCoupleEntry extends RedoxCouple {
  reference: string;
}

export const REDOX_COUPLES: RedoxCoupleEntry[] = [
  {
    id: 'fe', name: 'Fe³⁺/Fe²⁺',
    halfReaction: 'Fe³⁺ + e⁻ ⇌ Fe²⁺',
    ox: 'Fe³⁺', red: 'Fe²⁺', E0: 0.771, n: 1, mH: 0,
    reference: 'Bard, Parsons & Jordan, Standard Potentials in Aqueous Solution (1985)',
  },
  {
    id: 'ce', name: 'Ce⁴⁺/Ce³⁺',
    halfReaction: 'Ce⁴⁺ + e⁻ ⇌ Ce³⁺',
    ox: 'Ce⁴⁺', red: 'Ce³⁺', E0: 1.72, n: 1, mH: 0,
    reference: 'Skoog et al., 9.ª ed. (2014) — formal en HClO₄ 1 M',
  },
  {
    id: 'mno4', name: 'MnO₄⁻/Mn²⁺',
    halfReaction: 'MnO₄⁻ + 8H⁺ + 5e⁻ ⇌ Mn²⁺ + 4H₂O',
    ox: 'MnO₄⁻', red: 'Mn²⁺', E0: 1.51, n: 5, mH: 8,
    reference: 'Harris, Quantitative Chemical Analysis, 9.ª ed. (2015)',
  },
  {
    id: 'cr2o7', name: 'Cr₂O₇²⁻/Cr³⁺',
    halfReaction: 'Cr₂O₇²⁻ + 14H⁺ + 6e⁻ ⇌ 2Cr³⁺ + 7H₂O',
    ox: 'Cr₂O₇²⁻', red: 'Cr³⁺', E0: 1.33, n: 6, mH: 14,
    reference: 'Harris, 9.ª ed. (2015)',
    caveat: 'El Cr₂O₇²⁻ es dinuclear (2 Cr por unidad): el modelo de dos especies mononucleares es una simplificación cerca del punto de equivalencia.',
  },
  {
    id: 'sn', name: 'Sn⁴⁺/Sn²⁺',
    halfReaction: 'Sn⁴⁺ + 2e⁻ ⇌ Sn²⁺',
    ox: 'Sn⁴⁺', red: 'Sn²⁺', E0: 0.154, n: 2, mH: 0,
    reference: 'Bard, Parsons & Jordan (1985)',
  },
  {
    id: 'as', name: 'H₃AsO₄/H₃AsO₃',
    halfReaction: 'H₃AsO₄ + 2H⁺ + 2e⁻ ⇌ H₃AsO₃ + H₂O',
    ox: 'H₃AsO₄', red: 'H₃AsO₃', E0: 0.560, n: 2, mH: 2,
    reference: 'Harris, 9.ª ed. (2015)',
  },
  {
    id: 'i2', name: 'I₂/I⁻',
    halfReaction: 'I₂ + 2e⁻ ⇌ 2I⁻',
    ox: 'I₂', red: 'I⁻', E0: 0.536, n: 2, mH: 0,
    reference: 'Skoog et al., 9.ª ed. (2014)',
    caveat: 'El par I₂/I⁻ es polinuclear (2 I⁻ por I₂): la posición exacta del salto depende de la concentración; el modelo de dos especies es aproximado.',
  },
  {
    id: 'cu1', name: 'Cu²⁺/Cu⁺',
    halfReaction: 'Cu²⁺ + e⁻ ⇌ Cu⁺',
    ox: 'Cu²⁺', red: 'Cu⁺', E0: 0.153, n: 1, mH: 0,
    reference: 'Bard, Parsons & Jordan (1985)',
  },
  {
    id: 'ti', name: 'TiO²⁺/Ti³⁺',
    halfReaction: 'TiO²⁺ + 2H⁺ + e⁻ ⇌ Ti³⁺ + H₂O',
    ox: 'TiO²⁺', red: 'Ti³⁺', E0: 0.099, n: 1, mH: 2,
    reference: 'Bard, Parsons & Jordan (1985)',
  },
  {
    id: 'vo2', name: 'VO₂⁺/VO²⁺',
    halfReaction: 'VO₂⁺ + 2H⁺ + e⁻ ⇌ VO²⁺ + H₂O',
    ox: 'VO₂⁺', red: 'VO²⁺', E0: 1.001, n: 1, mH: 2,
    reference: 'Bard, Parsons & Jordan (1985)',
  },
];
