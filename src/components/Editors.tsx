// Editores compartidos según el patrón estándar de UI:
// PRIMARIO = etiqueta libre + constantes editables con ± .
// SECUNDARIO = base de datos colapsable que autocompleta y se cierra.

import { ConstantList, DbPanel, LabelField, ModelBadge, RefBadge, SelectControl, Slider } from './Controls';
import { ACIDS } from '../lib/database';
import { REDOX_COUPLES } from '../lib/redoxDatabase';
import type { RedoxCouple } from '../lib/redox';
import { genericSpeciesLabels } from '../lib/speciesNames';

/** Estado de un sistema ácido-base definido por el usuario. */
export interface AcidSystem {
  label: string;
  z0: number;
  pKas: number[];
  /** Etiquetas de especies; null → generar genéricas */
  speciesLabels: string[] | null;
  /** Referencia bibliográfica — solo si los valores vienen de la BD */
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

function inferredSystemLabel(z0: number, pKas: number[]): string {
  const isBase = z0 > 0;
  if (pKas.length === 0) return isBase ? 'Base fuerte' : 'Ácido fuerte';
  if (pKas.length === 1) return isBase ? 'Base débil' : 'Ácido débil';
  return isBase ? 'Base poliprótica' : 'Ácido poliprótico';
}

function isGenericSystemLabel(label: string): boolean {
  return [
    'Ácido fuerte', 'Base fuerte',
    'Ácido débil', 'Base débil',
    'Ácido poliprótico', 'Base poliprótica',
  ].includes(label);
}

/** Etiquetas efectivas del sistema (de BD si siguen siendo válidas, genéricas si no). */
export function systemLabels(sys: AcidSystem): string[] {
  if (sys.speciesLabels && sys.speciesLabels.length === sys.pKas.length + 1) {
    return sys.speciesLabels;
  }
  return genericSpeciesLabels(sys.pKas.length, sys.z0);
}

export function AcidSystemEditor({
  system, onChange, includeStrong = false, allowNoConstants = false, showModel = true,
}: {
  system: AcidSystem;
  onChange: (s: AcidSystem) => void;
  includeStrong?: boolean;
  allowNoConstants?: boolean;
  showModel?: boolean;
}) {
  const presets = ACIDS.filter((a) => includeStrong || !a.strong);
  const role = system.z0 > 0 ? 'base' : 'ácido';
  const classification = system.pKas.length === 0
    ? `${role} fuerte`
    : system.pKas.length === 1
      ? `${role} débil`
      : `${role} poliprótico (${system.pKas.length} etapas)`;
  return (
    <div className="editor">
      <LabelField
        label="Sistema (nombre libre)"
        value={system.label}
        onChange={(label) => onChange({ ...system, label })}
      />
      {showModel && <ModelBadge model={classification} />}
      {allowNoConstants && system.pKas.length === 0 && (
        <p className="hint">
          Sin pKa: disociación completa. Agrega un pKa para modelar un sistema débil.
        </p>
      )}
      <ConstantList
        prefix="pKa"
        values={system.pKas}
        min={-2}
        max={16}
        minItems={allowNoConstants ? 0 : 1}
        initialValue={system.z0 > 0 ? 9.25 : 4.76}
        onChange={(pKas) => {
          const shouldRename = allowNoConstants && isGenericSystemLabel(system.label);
          onChange({
            ...system,
            label: shouldRename ? inferredSystemLabel(system.z0, pKas) : system.label,
            pKas,
            // si cambió el número de constantes, las etiquetas de BD ya no aplican
            speciesLabels: pKas.length === system.pKas.length ? system.speciesLabels : null,
            reference: null,
          });
        }}
      />
      <details className="adv-panel">
        <summary>Avanzado</summary>
        <SelectControl
          label="Carga de la forma más protonada (z₀)"
          value={String(system.z0)}
          options={[
            { value: '0', label: '0 — ácido neutro (HnA)' },
            { value: '1', label: '+1 — base protonada (BH⁺)' },
            { value: '2', label: '+2 — diamina protonada (BH₂²⁺)' },
          ]}
          onChange={(v) => {
            const z0 = parseInt(v, 10);
            onChange({
              ...system,
              z0,
              label: allowNoConstants && isGenericSystemLabel(system.label)
                ? inferredSystemLabel(z0, system.pKas)
                : system.label,
              speciesLabels: null,
              reference: null,
            });
          }}
        />
      </details>
      <RefBadge reference={system.reference ?? undefined} />
      <DbPanel
        items={presets.map((a) => ({
          id: a.id,
          label: a.formula,
          detail: a.strong
            ? `${a.name.split(' (')[0]} · disociación completa`
            : `${a.name.split(' (')[0]} · pKa ${a.pKas.map((k) => k.toFixed(2)).join(', ')}`,
          group: a.strong ? 'Fuertes' : a.isBase ? 'Bases' : a.pKas.length > 1 ? 'Polipróticos' : 'Monopróticos',
        }))}
        onSelect={(id) => onChange(acidSystemFromPreset(id, allowNoConstants))}
      />
    </div>
  );
}

/** Estado editable de un par redox. */
export interface CoupleState extends RedoxCouple {
  reference: string;
}

export function coupleFromPreset(id: string): CoupleState {
  const c = REDOX_COUPLES.find((x) => x.id === id)!;
  return { ...c };
}

export function CoupleEditor({
  title, couple, onChange,
}: {
  title: string;
  couple: CoupleState;
  onChange: (c: CoupleState) => void;
}) {
  const edited = (patch: Partial<CoupleState>) =>
    onChange({ ...couple, ...patch, reference: '', caveat: undefined, name: patch.name ?? couple.name });
  return (
    <div className="editor">
      <p className="editor-title">{title}</p>
      <LabelField
        label="Par redox (nombre libre)"
        value={couple.name}
        onChange={(name) => onChange({ ...couple, name })}
      />
      <Slider label="E° (V vs ENH)" value={couple.E0} min={-1} max={2} step={0.001} onChange={(E0) => edited({ E0 })} decimals={3} unit="V" />
      <Slider label="n (electrones)" value={couple.n} min={1} max={6} step={1} onChange={(n) => edited({ n })} decimals={0} />
      <Slider label="m H⁺ (protones en la semirreacción)" value={couple.mH} min={0} max={14} step={1} onChange={(mH) => edited({ mH })} decimals={0} />
      <RefBadge reference={couple.reference || undefined} />
      {couple.caveat && <p className="badge warn">⚠ {couple.caveat}</p>}
      <DbPanel
        items={REDOX_COUPLES.map((c) => ({
          id: c.id,
          label: `${c.ox}/${c.red}`,
          detail: `E° ${c.E0.toFixed(3)} V · n=${c.n}${c.mH ? ` · ${c.mH}H⁺` : ''}`,
        }))}
        onSelect={(id) => onChange(coupleFromPreset(id))}
      />
    </div>
  );
}
