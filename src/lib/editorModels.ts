import { ACIDS } from './database';
import { REDOX_COUPLES } from './redoxDatabase';
import type { RedoxCouple } from './redox';
import { genericSpeciesLabels } from './speciesNames';
import type { Lang } from '../hooks/useLanguage';

// Generic placeholder labels in both languages — a plain lookup table (not the
// translations.ts dictionary) since this is a non-React lib file that can't
// call useT(). isGenericSystemLabel checks BOTH so the auto-rename-on-edit
// behavior keeps working regardless of which language generated the label
// currently sitting in the free-text field.
const GENERIC_LABELS: Record<'strongAcid' | 'strongBase' | 'weakAcid' | 'weakBase' | 'polyAcid' | 'polyBase', Record<Lang, string>> = {
  strongAcid: { es: 'Ácido fuerte', en: 'Strong acid' },
  strongBase: { es: 'Base fuerte', en: 'Strong base' },
  weakAcid: { es: 'Ácido débil', en: 'Weak acid' },
  weakBase: { es: 'Base débil', en: 'Weak base' },
  polyAcid: { es: 'Ácido poliprótico', en: 'Polyprotic acid' },
  polyBase: { es: 'Base poliprótica', en: 'Polyprotic base' },
};

/** State of a user-defined acid-base system. */
export interface AcidSystem {
  label: string;
  z0: number;
  pKas: number[];
  speciesLabels: string[] | null;
  reference: string | null;
}

export function defaultAcidSystem(): AcidSystem {
  const p = ACIDS.find((a) => a.id === 'acetic')!;
  return {
    label: p.name, z0: p.z0, pKas: [...p.pKas],
    speciesLabels: [...p.speciesLabels],
    reference: 'Harris, Quantitative Chemical Analysis',
  };
}

export function acidSystemFromPreset(id: string, strongWithoutPKa = false): AcidSystem {
  const p = ACIDS.find((a) => a.id === id)!;
  return {
    label: p.name,
    z0: strongWithoutPKa && p.strong ? (p.isBase ? 1 : 0) : p.z0,
    pKas: strongWithoutPKa && p.strong ? [] : [...p.pKas],
    speciesLabels: strongWithoutPKa && p.strong ? null : [...p.speciesLabels],
    reference: 'Harris, Quantitative Chemical Analysis',
  };
}

export function strongAcidSystem(isBase = false, lang: Lang = 'es'): AcidSystem {
  return {
    label: GENERIC_LABELS[isBase ? 'strongBase' : 'strongAcid'][lang],
    z0: isBase ? 1 : 0,
    pKas: [],
    speciesLabels: null,
    reference: null,
  };
}

export function inferredSystemLabel(z0: number, pKas: number[], lang: Lang = 'es'): string {
  const isBase = z0 > 0;
  if (pKas.length === 0) return GENERIC_LABELS[isBase ? 'strongBase' : 'strongAcid'][lang];
  if (pKas.length === 1) return GENERIC_LABELS[isBase ? 'weakBase' : 'weakAcid'][lang];
  return GENERIC_LABELS[isBase ? 'polyBase' : 'polyAcid'][lang];
}

export function isGenericSystemLabel(label: string): boolean {
  return Object.values(GENERIC_LABELS).some((byLang) => label === byLang.es || label === byLang.en);
}

export function systemLabels(sys: AcidSystem): string[] {
  if (sys.speciesLabels && sys.speciesLabels.length === sys.pKas.length + 1) {
    return sys.speciesLabels;
  }
  return genericSpeciesLabels(sys.pKas.length, sys.z0);
}

/**
 * Runtime shape check for AcidSystem coming from untrusted sources (shared
 * URLs). Modules that persist AcidSystem in ?s= state must validate on
 * restore: pre-custom Mezclas links carried {acidId} rows without a system,
 * and an invalid/missing system NaN-poisons solvePH into a silent bogus pH.
 */
export function isValidAcidSystem(x: unknown): x is AcidSystem {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Record<string, unknown>;
  return typeof s.label === 'string'
    // 0–3: the only z0 values AcidSystemEditor's select can ever produce
    // (Editors.tsx); a higher value would pass validation but render with
    // no matching <option>, desyncing the control from the real state.
    && typeof s.z0 === 'number' && Number.isInteger(s.z0) && s.z0 >= 0 && s.z0 <= 3
    && Array.isArray(s.pKas) && s.pKas.every((p) => typeof p === 'number' && Number.isFinite(p))
    && (s.speciesLabels == null || (Array.isArray(s.speciesLabels) && s.speciesLabels.every((l) => typeof l === 'string')))
    && (s.reference == null || typeof s.reference === 'string');
}

export interface CoupleState extends RedoxCouple {
  reference: string;
}

export function coupleFromPreset(id: string): CoupleState {
  const c = REDOX_COUPLES.find((x) => x.id === id)!;
  return { ...c };
}
