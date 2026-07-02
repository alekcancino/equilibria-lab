// Database of coordination complex systems with overall stability constants β (25 °C, I → 0).
// Sources: Harris, QCA 9th ed.; Skoog, Principles of Analytical Chemistry 9th ed.;
//          Puigdomenech I., HYDRA/Medusa (KTH, 2016); NIST SRD-46.

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
  {
    id: 'ni_en',
    metalLabel: 'Ni²⁺', ligandLabel: 'en',
    logBetas: [7.52, 13.86, 18.28],
    speciesLabels: ['Ni²⁺', 'Ni(en)²⁺', 'Ni(en)₂²⁺', 'Ni(en)₃²⁺'],
    reference: 'NIST SRD-46',
    group: 'Metal / etilendiamina',
  },
  {
    id: 'zn_en',
    metalLabel: 'Zn²⁺', ligandLabel: 'en',
    logBetas: [5.77, 10.83, 14.11],
    speciesLabels: ['Zn²⁺', 'Zn(en)²⁺', 'Zn(en)₂²⁺', 'Zn(en)₃²⁺'],
    reference: 'NIST SRD-46',
    group: 'Metal / etilendiamina',
  },
  {
    id: 'cd_en',
    metalLabel: 'Cd²⁺', ligandLabel: 'en',
    logBetas: [5.47, 10.09, 12.09],
    speciesLabels: ['Cd²⁺', 'Cd(en)²⁺', 'Cd(en)₂²⁺', 'Cd(en)₃²⁺'],
    reference: 'NIST SRD-46',
    group: 'Metal / etilendiamina',
  },
  {
    id: 'hg_en',
    metalLabel: 'Hg²⁺', ligandLabel: 'en',
    logBetas: [14.30, 23.30],
    speciesLabels: ['Hg²⁺', 'Hg(en)²⁺', 'Hg(en)₂²⁺'],
    reference: 'NIST SRD-46',
    group: 'Metal / etilendiamina',
  },
  // ── Metal / Cl⁻ ───────────────────────────────────────────────────────────
  {
    id: 'hg_cl',
    metalLabel: 'Hg²⁺', ligandLabel: 'Cl⁻',
    logBetas: [6.74, 13.22, 14.07, 15.07],
    speciesLabels: ['Hg²⁺', 'HgCl⁺', 'HgCl₂', 'HgCl₃⁻', 'HgCl₄²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / Cl⁻',
  },
  {
    id: 'fe3_cl',
    metalLabel: 'Fe³⁺', ligandLabel: 'Cl⁻',
    logBetas: [1.48, 2.13],
    speciesLabels: ['Fe³⁺', 'FeCl²⁺', 'FeCl₂⁺'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / Cl⁻',
  },
  {
    id: 'pb_cl',
    metalLabel: 'Pb²⁺', ligandLabel: 'Cl⁻',
    logBetas: [1.59, 2.05, 2.11],
    speciesLabels: ['Pb²⁺', 'PbCl⁺', 'PbCl₂', 'PbCl₃⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / Cl⁻',
  },
  {
    id: 'cd_cl',
    metalLabel: 'Cd²⁺', ligandLabel: 'Cl⁻',
    logBetas: [1.95, 2.65, 2.23, 1.73],
    speciesLabels: ['Cd²⁺', 'CdCl⁺', 'CdCl₂', 'CdCl₃⁻', 'CdCl₄²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / Cl⁻',
  },
  {
    id: 'ag_cl',
    metalLabel: 'Ag⁺', ligandLabel: 'Cl⁻',
    logBetas: [3.04, 4.89, 4.95],
    speciesLabels: ['Ag⁺', 'AgCl', 'AgCl₂⁻', 'AgCl₃²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / Cl⁻',
  },
  // ── Metal / Br⁻ ───────────────────────────────────────────────────────────
  {
    id: 'hg_br',
    metalLabel: 'Hg²⁺', ligandLabel: 'Br⁻',
    logBetas: [9.05, 17.32, 19.74, 21.00],
    speciesLabels: ['Hg²⁺', 'HgBr⁺', 'HgBr₂', 'HgBr₃⁻', 'HgBr₄²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / Br⁻',
  },
  {
    id: 'cd_br',
    metalLabel: 'Cd²⁺', ligandLabel: 'Br⁻',
    logBetas: [2.08, 2.92, 3.03],
    speciesLabels: ['Cd²⁺', 'CdBr⁺', 'CdBr₂', 'CdBr₃⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / Br⁻',
  },
  {
    id: 'pb_br',
    metalLabel: 'Pb²⁺', ligandLabel: 'Br⁻',
    logBetas: [1.77, 2.60, 3.00],
    speciesLabels: ['Pb²⁺', 'PbBr⁺', 'PbBr₂', 'PbBr₃⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / Br⁻',
  },
  // ── Metal / I⁻ ────────────────────────────────────────────────────────────
  {
    id: 'hg_i',
    metalLabel: 'Hg²⁺', ligandLabel: 'I⁻',
    logBetas: [12.87, 23.82, 27.60, 29.83],
    speciesLabels: ['Hg²⁺', 'HgI⁺', 'HgI₂', 'HgI₃⁻', 'HgI₄²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / I⁻',
  },
  {
    id: 'cd_i',
    metalLabel: 'Cd²⁺', ligandLabel: 'I⁻',
    logBetas: [2.28, 3.92, 4.85, 5.11],
    speciesLabels: ['Cd²⁺', 'CdI⁺', 'CdI₂', 'CdI₃⁻', 'CdI₄²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / I⁻',
  },
  {
    id: 'pb_i',
    metalLabel: 'Pb²⁺', ligandLabel: 'I⁻',
    logBetas: [1.92, 3.15],
    speciesLabels: ['Pb²⁺', 'PbI⁺', 'PbI₂'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / I⁻',
  },
  // ── Metal / CN⁻ ───────────────────────────────────────────────────────────
  {
    id: 'ag_cn',
    metalLabel: 'Ag⁺', ligandLabel: 'CN⁻',
    logBetas: [10.80, 19.60, 21.40],
    speciesLabels: ['Ag⁺', 'AgCN', 'Ag(CN)₂⁻', 'Ag(CN)₃²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / CN⁻',
  },
  {
    id: 'au_cn',
    metalLabel: 'Au⁺', ligandLabel: 'CN⁻',
    logBetas: [38.30],
    speciesLabels: ['Au⁺', 'Au(CN)₂⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / CN⁻',
  },
  {
    id: 'fe2_cn',
    metalLabel: 'Fe²⁺', ligandLabel: 'CN⁻',
    logBetas: [35.40],
    speciesLabels: ['Fe²⁺', '[Fe(CN)₆]⁴⁻'],
    reference: 'Harris, QCA 9.ª ed.',
    group: 'Metal / CN⁻',
  },
  {
    id: 'fe3_cn',
    metalLabel: 'Fe³⁺', ligandLabel: 'CN⁻',
    logBetas: [43.90],
    speciesLabels: ['Fe³⁺', '[Fe(CN)₆]³⁻'],
    reference: 'Harris, QCA 9.ª ed.',
    group: 'Metal / CN⁻',
  },
  {
    id: 'ni_cn',
    metalLabel: 'Ni²⁺', ligandLabel: 'CN⁻',
    logBetas: [30.20],
    speciesLabels: ['Ni²⁺', '[Ni(CN)₄]²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / CN⁻',
  },
  {
    id: 'zn_cn',
    metalLabel: 'Zn²⁺', ligandLabel: 'CN⁻',
    logBetas: [11.07, 16.05, 19.62, 19.62],
    speciesLabels: ['Zn²⁺', 'ZnCN⁺', 'Zn(CN)₂', 'Zn(CN)₃⁻', 'Zn(CN)₄²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / CN⁻',
  },
  // ── Metal / SCN⁻ ──────────────────────────────────────────────────────────
  {
    id: 'fe3_scn',
    metalLabel: 'Fe³⁺', ligandLabel: 'SCN⁻',
    logBetas: [2.95, 4.13, 4.86],
    speciesLabels: ['Fe³⁺', 'FeSCN²⁺', 'Fe(SCN)₂⁺', 'Fe(SCN)₃'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / SCN⁻',
  },
  {
    id: 'hg_scn',
    metalLabel: 'Hg²⁺', ligandLabel: 'SCN⁻',
    logBetas: [9.08, 16.86, 19.39, 21.23],
    speciesLabels: ['Hg²⁺', 'HgSCN⁺', 'Hg(SCN)₂', 'Hg(SCN)₃⁻', 'Hg(SCN)₄²⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / SCN⁻',
  },
  // ── Metal / S₂O₃²⁻ (tiosulfato) ──────────────────────────────────────────
  {
    id: 'ag_s2o3',
    metalLabel: 'Ag⁺', ligandLabel: 'S₂O₃²⁻',
    logBetas: [8.82, 13.46, 14.15],
    speciesLabels: ['Ag⁺', 'Ag(S₂O₃)⁻', 'Ag(S₂O₃)₂³⁻', 'Ag(S₂O₃)₃⁵⁻'],
    reference: 'HYDRA/Medusa (KTH)',
    group: 'Metal / S₂O₃²⁻',
  },
  // ── Metal / glicinato (Gly⁻) ──────────────────────────────────────────────
  {
    id: 'cu_gly',
    metalLabel: 'Cu²⁺', ligandLabel: 'Gly⁻',
    logBetas: [8.22, 15.10],
    speciesLabels: ['Cu²⁺', 'Cu(Gly)⁺', 'Cu(Gly)₂'],
    reference: 'NIST SRD-46',
    group: 'Metal / glicinato',
  },
  {
    id: 'ni_gly',
    metalLabel: 'Ni²⁺', ligandLabel: 'Gly⁻',
    logBetas: [5.76, 10.55, 14.14],
    speciesLabels: ['Ni²⁺', 'Ni(Gly)⁺', 'Ni(Gly)₂', 'Ni(Gly)₃⁻'],
    reference: 'NIST SRD-46',
    group: 'Metal / glicinato',
  },
  {
    id: 'zn_gly',
    metalLabel: 'Zn²⁺', ligandLabel: 'Gly⁻',
    logBetas: [5.16, 9.34],
    speciesLabels: ['Zn²⁺', 'Zn(Gly)⁺', 'Zn(Gly)₂'],
    reference: 'NIST SRD-46',
    group: 'Metal / glicinato',
  },
  {
    id: 'co_gly',
    metalLabel: 'Co²⁺', ligandLabel: 'Gly⁻',
    logBetas: [4.75, 8.62, 11.54],
    speciesLabels: ['Co²⁺', 'Co(Gly)⁺', 'Co(Gly)₂', 'Co(Gly)₃⁻'],
    reference: 'NIST SRD-46',
    group: 'Metal / glicinato',
  },
  {
    id: 'cd_gly',
    metalLabel: 'Cd²⁺', ligandLabel: 'Gly⁻',
    logBetas: [4.40, 7.93],
    speciesLabels: ['Cd²⁺', 'Cd(Gly)⁺', 'Cd(Gly)₂'],
    reference: 'NIST SRD-46',
    group: 'Metal / glicinato',
  },
  // ── Metal / oxalato (Ox²⁻) ────────────────────────────────────────────────
  {
    id: 'fe3_ox',
    metalLabel: 'Fe³⁺', ligandLabel: 'Ox²⁻',
    logBetas: [9.40, 16.20, 20.20],
    speciesLabels: ['Fe³⁺', 'Fe(Ox)⁺', 'Fe(Ox)₂⁻', 'Fe(Ox)₃³⁻'],
    reference: 'NIST SRD-46',
    group: 'Metal / oxalato',
  },
  {
    id: 'al_ox',
    metalLabel: 'Al³⁺', ligandLabel: 'Ox²⁻',
    logBetas: [7.26, 12.40, 16.30],
    speciesLabels: ['Al³⁺', 'Al(Ox)⁺', 'Al(Ox)₂⁻', 'Al(Ox)₃³⁻'],
    reference: 'NIST SRD-46',
    group: 'Metal / oxalato',
  },
  {
    id: 'cu_ox',
    metalLabel: 'Cu²⁺', ligandLabel: 'Ox²⁻',
    logBetas: [4.84, 8.36],
    speciesLabels: ['Cu²⁺', 'Cu(Ox)', 'Cu(Ox)₂²⁻'],
    reference: 'NIST SRD-46',
    group: 'Metal / oxalato',
  },
  {
    id: 'pb_ox',
    metalLabel: 'Pb²⁺', ligandLabel: 'Ox²⁻',
    logBetas: [4.91],
    speciesLabels: ['Pb²⁺', 'Pb(Ox)'],
    reference: 'NIST SRD-46',
    group: 'Metal / oxalato',
  },
  // ── Metal / piridina ──────────────────────────────────────────────────────
  {
    id: 'cu_py',
    metalLabel: 'Cu²⁺', ligandLabel: 'py',
    logBetas: [2.59, 4.62, 6.15, 7.12],
    speciesLabels: ['Cu²⁺', 'Cu(py)²⁺', 'Cu(py)₂²⁺', 'Cu(py)₃²⁺', 'Cu(py)₄²⁺'],
    reference: 'NIST SRD-46',
    group: 'Metal / piridina',
  },
  {
    id: 'ni_py',
    metalLabel: 'Ni²⁺', ligandLabel: 'py',
    logBetas: [1.51, 2.89, 3.86],
    speciesLabels: ['Ni²⁺', 'Ni(py)²⁺', 'Ni(py)₂²⁺', 'Ni(py)₃²⁺'],
    reference: 'NIST SRD-46',
    group: 'Metal / piridina',
  },
  {
    id: 'zn_py',
    metalLabel: 'Zn²⁺', ligandLabel: 'py',
    logBetas: [1.17, 2.14, 2.40],
    speciesLabels: ['Zn²⁺', 'Zn(py)²⁺', 'Zn(py)₂²⁺', 'Zn(py)₃²⁺'],
    reference: 'NIST SRD-46',
    group: 'Metal / piridina',
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
