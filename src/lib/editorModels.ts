import { ACIDS } from './database';
import { REDOX_COUPLES } from './redoxDatabase';
import type { RedoxCouple } from './redox';
import { genericSpeciesLabels } from './speciesNames';

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
    reference: 'Harris, Quantitative Chemical Analysis, 9.ª ed.',
  };
}

export function acidSystemFromPreset(id: string, strongWithoutPKa = false): AcidSystem {
  const p = ACIDS.find((a) => a.id === id)!;
  return {
    label: p.name,
    z0: strongWithoutPKa && p.strong ? (p.isBase ? 1 : 0) : p.z0,
    pKas: strongWithoutPKa && p.strong ? [] : [...p.pKas],
    speciesLabels: strongWithoutPKa && p.strong ? null : [...p.speciesLabels],
    reference: 'Harris, Quantitative Chemical Analysis, 9.ª ed.',
  };
}

export function strongAcidSystem(isBase = false): AcidSystem {
  return {
    label: isBase ? 'Base fuerte' : 'Ácido fuerte',
    z0: isBase ? 1 : 0,
    pKas: [],
    speciesLabels: null,
    reference: null,
  };
}

export function inferredSystemLabel(z0: number, pKas: number[]): string {
  const isBase = z0 > 0;
  if (pKas.length === 0) return isBase ? 'Base fuerte' : 'Ácido fuerte';
  if (pKas.length === 1) return isBase ? 'Base débil' : 'Ácido débil';
  return isBase ? 'Base poliprótica' : 'Ácido poliprótico';
}

export function isGenericSystemLabel(label: string): boolean {
  return [
    'Ácido fuerte', 'Base fuerte',
    'Ácido débil', 'Base débil',
    'Ácido poliprótico', 'Base poliprótica',
  ].includes(label);
}

export function systemLabels(sys: AcidSystem): string[] {
  if (sys.speciesLabels && sys.speciesLabels.length === sys.pKas.length + 1) {
    return sys.speciesLabels;
  }
  return genericSpeciesLabels(sys.pKas.length, sys.z0);
}

export interface CoupleState extends RedoxCouple {
  reference: string;
}

export function coupleFromPreset(id: string): CoupleState {
  const c = REDOX_COUPLES.find((x) => x.id === id)!;
  return { ...c };
}
