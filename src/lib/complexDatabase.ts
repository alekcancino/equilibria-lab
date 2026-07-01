// Database of coordination complex systems with overall stability constants β (25 °C, μ ≈ 0).
// Sources: Harris, QCA 9th ed.; Skoog, Principles of Analytical Chemistry.

export interface ComplexPreset {
  id: string;
  metalLabel: string;
  ligandLabel: string;
  /** Overall log β: β₁, β₂, ..., βₙ */
  logBetas: number[];
  /** Labels for the n+1 species: M, ML, ML₂, ... */
  speciesLabels: string[];
  reference: string;
  group: string;
}

export const COMPLEX_PRESETS: ComplexPreset[] = [
  {
    id: 'cu_nh3',
    metalLabel: 'Cu²⁺', ligandLabel: 'NH₃',
    logBetas: [4.04, 7.47, 10.27, 12.03],
    speciesLabels: ['Cu²⁺', 'Cu(NH₃)²⁺', 'Cu(NH₃)₂²⁺', 'Cu(NH₃)₃²⁺', 'Cu(NH₃)₄²⁺'],
    reference: 'Harris, QCA 9.ª ed.',
    group: 'Metal / NH₃',
  },
  {
    id: 'zn_nh3',
    metalLabel: 'Zn²⁺', ligandLabel: 'NH₃',
    logBetas: [2.37, 4.81, 7.31, 9.46],
    speciesLabels: ['Zn²⁺', 'Zn(NH₃)²⁺', 'Zn(NH₃)₂²⁺', 'Zn(NH₃)₃²⁺', 'Zn(NH₃)₄²⁺'],
    reference: 'Harris, QCA 9.ª ed.',
    group: 'Metal / NH₃',
  },
  {
    id: 'cd_nh3',
    metalLabel: 'Cd²⁺', ligandLabel: 'NH₃',
    logBetas: [2.65, 4.75, 6.19, 7.12],
    speciesLabels: ['Cd²⁺', 'Cd(NH₃)²⁺', 'Cd(NH₃)₂²⁺', 'Cd(NH₃)₃²⁺', 'Cd(NH₃)₄²⁺'],
    reference: 'Harris, QCA 9.ª ed.',
    group: 'Metal / NH₃',
  },
  {
    id: 'ni_nh3',
    metalLabel: 'Ni²⁺', ligandLabel: 'NH₃',
    logBetas: [2.80, 5.04, 6.77, 7.96, 8.71, 8.74],
    speciesLabels: ['Ni²⁺', 'Ni(NH₃)²⁺', 'Ni(NH₃)₂²⁺', 'Ni(NH₃)₃²⁺', 'Ni(NH₃)₄²⁺', 'Ni(NH₃)₅²⁺', 'Ni(NH₃)₆²⁺'],
    reference: 'Harris, QCA 9.ª ed.',
    group: 'Metal / NH₃',
  },
  {
    id: 'ag_nh3',
    metalLabel: 'Ag⁺', ligandLabel: 'NH₃',
    logBetas: [3.24, 7.05],
    speciesLabels: ['Ag⁺', 'Ag(NH₃)⁺', 'Ag(NH₃)₂⁺'],
    reference: 'Harris, QCA 9.ª ed.',
    group: 'Metal / NH₃',
  },
  {
    id: 'cu_en',
    metalLabel: 'Cu²⁺', ligandLabel: 'en',
    logBetas: [10.72, 19.92],
    speciesLabels: ['Cu²⁺', 'Cu(en)²⁺', 'Cu(en)₂²⁺'],
    reference: 'Skoog, Analytical Chemistry 9.ª ed.',
    group: 'Metal / etilendiamina',
  },
  {
    id: 'co_en',
    metalLabel: 'Co²⁺', ligandLabel: 'en',
    logBetas: [5.91, 10.61, 13.91],
    speciesLabels: ['Co²⁺', 'Co(en)²⁺', 'Co(en)₂²⁺', 'Co(en)₃²⁺'],
    reference: 'Skoog, Analytical Chemistry 9.ª ed.',
    group: 'Metal / etilendiamina',
  },
];

/**
 * Generates generic complex labels when the user edits manually.
 * E.g.: metalLabel="M", ligandLabel="L" → ["M", "ML", "ML₂", "ML₃"]
 */
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const toSub = (n: number) =>
  String(n).split('').map((d) => SUB[parseInt(d)]).join('');

export function genericComplexLabels(metalLabel: string, ligandLabel: string, n: number): string[] {
  const labels = [metalLabel];
  for (let i = 1; i <= n; i++) {
    labels.push(`${metalLabel}(${ligandLabel})${i > 1 ? toSub(i) : ''}`);
  }
  return labels;
}
