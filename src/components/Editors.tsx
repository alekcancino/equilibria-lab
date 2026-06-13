// Editores compartidos según el patrón estándar de UI:
// PRIMARIO = etiqueta libre + constantes editables con ± .
// SECUNDARIO = base de datos colapsable que autocompleta y se cierra.

import { ConstantList, DbPanel, LabelField, ModelBadge, RefBadge, SelectControl, Slider } from './Controls';
import { ACIDS } from '../lib/database';
import { REDOX_COUPLES } from '../lib/redoxDatabase';
import {
  acidSystemFromPreset, coupleFromPreset, inferredSystemLabel, isGenericSystemLabel,
  type AcidSystem, type CoupleState,
} from '../lib/editorModels';

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
