import { useEffect, useState, type ReactNode } from 'react';

/** Campo numérico editable que tolera estados intermedios al teclear. */
function NumberField({
  value, onCommit, step, width = 72,
}: {
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  width?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((prev) => (parseFloat(prev) === value ? prev : String(value)));
  }, [value]);
  return (
    <input
      type="number"
      className="num-field"
      style={{ width }}
      value={text}
      step={step ?? 'any'}
      onChange={(e) => {
        setText(e.target.value);
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) onCommit(v);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

/** Slider con etiqueta y valor numérico EDITABLE (patrón profesional). */
export function Slider({
  label, value, min, max, step, onChange, unit, decimals = 2,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  decimals?: number;
}) {
  const rounded = parseFloat(value.toFixed(decimals));
  return (
    <div className="control">
      <div className="control-header">
        <span className="control-label">{label}</span>
        <span className="control-value">
          <NumberField value={rounded} onCommit={onChange} step={step} />
          {unit && <span className="unit">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

/**
 * Concentración: slider logarítmico + campo editable en M (notación libre,
 * acepta 0.05 o 5e-2).
 */
export function ConcSlider({
  label, value, onChange, min = -6, max = 0,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="control">
      <div className="control-header">
        <span className="control-label">{label}</span>
        <span className="control-value">
          <NumberField
            value={parseFloat(value.toPrecision(4))}
            onCommit={(v) => v > 0 && onChange(v)}
          />
          <span className="unit">M</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={Math.log10(value)}
        onChange={(e) => onChange(Math.pow(10, parseFloat(e.target.value)))}
      />
    </div>
  );
}

export function SelectControl({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="control">
      {label && (
        <div className="control-header">
          <span className="control-label">{label}</span>
        </div>
      )}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Toggle({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** Control segmentado para elegir modo (ej. tipo de titulación o de gráfica). */
export function Segmented({
  options, value, onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={o.value === value ? 'seg-btn active' : 'seg-btn'}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Campo de texto libre para nombrar el compuesto/sistema. */
export function LabelField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="control">
      <div className="control-header">
        <span className="control-label">{label}</span>
      </div>
      <input
        type="text"
        className="text-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/**
 * Lista editable de constantes (pKa, log β, ...) con botones ± .
 * Cada fila: slider + campo numérico + quitar.
 */
export function ConstantList({
  prefix, values, onChange, min, max, maxItems = 6, minItems = 1, initialValue = 7,
}: {
  prefix: string;
  values: number[];
  onChange: (v: number[]) => void;
  min: number;
  max: number;
  maxItems?: number;
  minItems?: number;
  initialValue?: number;
}) {
  return (
    <div className="constant-list">
      {values.map((v, i) => (
        <div key={i} className="constant-row">
          <div className="constant-slider">
            <Slider
              label={`${prefix}${values.length > 1 ? i + 1 : ''}`}
              value={v}
              min={min}
              max={max}
              step={0.01}
              onChange={(nv) => onChange(values.map((x, j) => (j === i ? nv : x)))}
            />
          </div>
          <button
            className="mini-btn"
            title="Quitar constante"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            disabled={values.length <= minItems}
          >
            −
          </button>
        </div>
      ))}
      {values.length < maxItems && (
        <button
          className="add-btn"
          onClick={() => onChange([
            ...values,
            values.length === 0
              ? initialValue
              : Math.min((values[values.length - 1] ?? initialValue) + 3, max),
          ])}
        >
          + Agregar {prefix}
        </button>
      )}
    </div>
  );
}

/**
 * Base de datos colapsable (patrón secundario): cerrada por defecto,
 * al elegir un registro se autocompletan los controles y se cierra.
 */
export interface DbItem {
  id: string;
  label: string;
  detail: string;
  /** Grupo opcional para agrupar visualmente (ej. "Monopróticos") */
  group?: string;
}

export function DbPanel({
  items, onSelect, title = 'Ejemplos de la base de datos',
}: {
  items: DbItem[];
  onSelect: (id: string) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasGroups = items.some((it) => it.group);
  const groups = hasGroups
    ? [...new Set(items.map((it) => it.group ?? 'Otros'))]
    : [null];

  const renderItem = (it: DbItem) => (
    <button
      key={it.id}
      className="db-item"
      onClick={() => {
        onSelect(it.id);
        setOpen(false);
      }}
    >
      <span className="db-item-label">{it.label}</span>
      <span className="db-item-detail">{it.detail}</span>
    </button>
  );

  return (
    <details className="db-panel" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{title}</summary>
      {groups.map((g) => (
        <div key={g ?? 'all'}>
          {g && <p className="db-group-title">{g}</p>}
          <div className="db-grid">
            {items.filter((it) => (g ? (it.group ?? 'Otros') === g : true)).map(renderItem)}
          </div>
        </div>
      ))}
    </details>
  );
}

/** Declara el modelo inferido y las capas opcionales activas. */
export function ModelBadge({
  model, additions = [],
}: {
  model: string;
  additions?: Array<string | false | null | undefined>;
}) {
  const active = additions.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return (
    <div className="system-classification">
      <span><strong>Modelo detectado:</strong> {model}</span>
      {active.length > 0 && (
        <span className="model-additions">
          {active.map((item) => <span key={item} className="model-chip">+ {item}</span>)}
        </span>
      )}
    </div>
  );
}

/** Fuente del dato cargado desde la base; desaparece al editarlo manualmente. */
export function RefBadge({ reference }: { reference?: string }) {
  if (!reference) return null;
  return (
    <p className="ref-badge">
      <strong>Fuente del dato:</strong> {reference}
    </p>
  );
}

/** Tarjeta de resultado numérico destacado (ej. pH en equivalencia). */
export function ResultCard({ items }: { items: { label: ReactNode; value: string }[] }) {
  return (
    <div className="result-card">
      {items.map((it, i) => (
        <div key={i} className="result-item">
          <span className="result-label">{it.label}</span>
          <span className="result-value">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Bloque de explicación didáctica plegable. */
export function InfoBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="info-box">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}
