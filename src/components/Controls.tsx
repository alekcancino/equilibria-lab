import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GLOSSARY } from '../lib/glossary';

/**
 * Small ⓘ affordance next to a cryptic control label. Shows a styled tooltip on
 * hover/focus (CSS) and on tap (click toggle for touch). Content comes from the
 * glossary; unknown ids render nothing.
 */
export function HelpTip({ id }: { id: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const entry = GLOSSARY[id];
  if (!entry) return null;

  const show = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
  };
  const hide = () => setPos(null);

  return (
    <span className="help-tip">
      <button
        ref={btnRef}
        type="button"
        className="help-tip-btn"
        aria-label={`Ayuda: ${entry.meaning}`}
        aria-expanded={pos !== null}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (pos) hide(); else show(); }}
      >
        ⓘ
      </button>
      {pos && createPortal(
        <span
          className="help-tip-pop"
          role="tooltip"
          style={{ position: 'fixed', top: pos.top, left: pos.left, opacity: 1, transform: 'translateY(0)' }}
        >
          <span className="help-tip-meaning">{entry.meaning}</span>
          <span className="help-tip-units">{entry.units}</span>
        </span>,
        document.body,
      )}
    </span>
  );
}

/** Numeric field that tolerates intermediate states while typing. */
function NumberField({
  value, onCommit, step, width = 72,
}: {
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  width?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current && parseFloat(inputRef.current.value) !== value) {
      inputRef.current.value = String(value);
    }
  }, [value]);
  return (
    <input
      ref={inputRef}
      type="number"
      className="num-field"
      style={{ width }}
      defaultValue={value}
      step={step ?? 'any'}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) onCommit(v);
      }}
      onBlur={(e) => { e.target.value = String(value); }}
    />
  );
}

/** Slider with label and EDITABLE numeric value. */
export function Slider({
  label, value, min, max, step, onChange, unit, decimals = 2, helpId,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  decimals?: number;
  helpId?: string;
}) {
  const rounded = parseFloat(value.toFixed(decimals));
  return (
    <div className="control">
      <div className="control-header">
        <span className="control-label">{label}{helpId && <HelpTip id={helpId} />}</span>
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
 * Concentration: logarithmic slider + editable field in M (free notation,
 * accepts 0.05 or 5e-2).
 */
export function ConcSlider({
  label, value, onChange, min = -6, max = 0, helpId,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  helpId?: string;
}) {
  return (
    <div className="control">
      <div className="control-header">
        <span className="control-label">{label}{helpId && <HelpTip id={helpId} />}</span>
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
  label, value, options, onChange, helpId,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  helpId?: string;
}) {
  return (
    <div className="control">
      {label && (
        <div className="control-header">
          <span className="control-label">{label}{helpId && <HelpTip id={helpId} />}</span>
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
  label, checked, onChange, helpId,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  helpId?: string;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
      {helpId && <HelpTip id={helpId} />}
    </label>
  );
}

/** Segmented control for choosing a mode (e.g. titration type or chart type). */
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

/** Segmented picker for a small integer stoichiometric coefficient/charge
 * (e.g. m, x, p, q, zM), wrapped in the standard label+value control shell. */
export function NumberSegmented({
  label, value, options, onChange, suffix = '', hint,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (n: number) => void;
  suffix?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="control">
      <div className="control-header">
        <span className="control-label">{label}</span>
        <span className="control-value">{value}{suffix}</span>
      </div>
      <div style={{ marginTop: 4 }}>
        <Segmented options={options.map((n) => ({ value: String(n), label: String(n) }))} value={String(value)} onChange={(v) => onChange(Number(v))} />
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

/** Free-text field for naming the compound/system. */
export function LabelField({
  label, value, onChange, helpId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helpId?: string;
}) {
  return (
    <div className="control">
      <div className="control-header">
        <span className="control-label">{label}{helpId && <HelpTip id={helpId} />}</span>
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
 * Editable list of free-text labels — the string-array counterpart of
 * ConstantList. No +/- buttons: the count is dictated by the constants it
 * labels (e.g. one per species in a ladder), not user-managed directly.
 */
export function LabelList({
  prefix, values, onChange,
}: {
  prefix: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="constant-list">
      {values.map((v, i) => (
        <LabelField
          key={i}
          label={`${prefix} ${i + 1}`}
          value={v}
          onChange={(nv) => onChange(values.map((x, j) => (j === i ? nv : x)))}
        />
      ))}
    </div>
  );
}

/**
 * Editable list of constants (pKa, log β, ...) with ± buttons.
 * Each row: slider + numeric field + remove button.
 */
export function ConstantList({
  prefix, values, onChange, min, max, maxItems = 6, minItems = 1, initialValue = 7, helpId,
}: {
  prefix: string;
  values: number[];
  onChange: (v: number[]) => void;
  min: number;
  max: number;
  maxItems?: number;
  minItems?: number;
  initialValue?: number;
  helpId?: string;
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
              helpId={i === 0 ? helpId : undefined}
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
 * Collapsible database (secondary pattern): closed by default;
 * selecting a record auto-fills the controls and closes the panel.
 */
export interface DbItem {
  id: string;
  label: string;
  detail: string;
  /** Optional group for visual grouping (e.g. "Monoprotic") */
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

/**
 * Full-system picker (one click loads metal + ligand + side reactions).
 * Groups by `group`; each item calls onSelect(id) and closes.
 */
export function SystemPresetPicker({
  items, onSelect, title = 'Cargar sistema completo',
}: {
  items: { id: string; name: string; group: string; detail: string }[];
  onSelect: (id: string) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const groups = [...new Set(items.map((it) => it.group))];
  return (
    <details className="preset-picker" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary><span className="preset-picker-spark" aria-hidden>✦</span> {title}</summary>
      {groups.map((g) => (
        <div key={g} className="preset-group">
          <p className="preset-group-title">{g}</p>
          {items.filter((it) => it.group === g).map((it) => (
            <button
              key={it.id}
              className="preset-item"
              onClick={() => { onSelect(it.id); setOpen(false); }}
            >
              <span className="preset-item-name">{it.name}</span>
              <span className="preset-item-detail">{it.detail}</span>
            </button>
          ))}
        </div>
      ))}
    </details>
  );
}

/** Displays the inferred model and active optional layers. */
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

/** Shows the literature citation for an unedited database preset. */
export function RefBadge({ reference }: { reference?: string }) {
  if (!reference) return null;
  return (
    <p className="ref-badge">
      <strong>Fuente:</strong> {reference}
    </p>
  );
}

/** Highlighted numeric result card (e.g. pH at equivalence point). */
export function ResultCard({ items }: { items: { label: ReactNode; value: string; helpId?: string }[] }) {
  return (
    <div className="result-card">
      {items.map((it, i) => (
        <div key={i} className="result-item">
          <span className="result-label">{it.label}{it.helpId && <HelpTip id={it.helpId} />}</span>
          <span className="result-value">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Section card with header ("E" direction): groups related controls
 * on a rounded surface with a soft elevation. Replaces ad-hoc grouping
 * with bare <h3> elements.
 */
export function PanelSection({
  title, icon, children, defaultOpen, collapsible = false,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  /** If collapsible, initial state (open by default). */
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const header = title && (
    <div className="psection-head">
      {icon && <span className="psection-ic" aria-hidden>{icon}</span>}
      <span className="psection-title">{title}</span>
      {collapsible && <span className="psection-caret" aria-hidden>{open ? '▾' : '▸'}</span>}
    </div>
  );
  return (
    <section className="psection">
      {collapsible
        ? (
          <button type="button" className="psection-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {header}
          </button>
        )
        : header}
      {open && <div className="psection-body">{children}</div>}
    </section>
  );
}

/**
 * Single-level accordion for advanced layers (side reactions, comparisons).
 * Replaces nested <details> with a clean disclosure pattern.
 */
export function Disclosure({
  title, defaultOpen = false, children, open: openProp, onToggle,
}: {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  /** Modo controlado: si se pasa `open`, el componente lo obedece (úsese con `onToggle`). */
  open?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onToggle?.(next);
  };
  return (
    <section className={open ? 'disclosure open' : 'disclosure'}>
      <button type="button" className="disclosure-head" aria-expanded={open} onClick={toggle}>
        <span className="disclosure-title">{title}</span>
        <span className="disclosure-caret" aria-hidden>▾</span>
      </button>
      {open && <div className="disclosure-body">{children}</div>}
    </section>
  );
}

/**
 * Result card row below the chart ("C" direction): large numbers readable for students.
 * The `accent` item uses the indigo→violet gradient for the key value.
 * Placed as the last child of `.plot-area`.
 */
export function ResultCardRow({
  items,
}: {
  items: { label: ReactNode; value: ReactNode; accent?: boolean; helpId?: string }[];
}) {
  // Rendered as a slim metric header that sits ABOVE the plot (via CSS order),
  // reading as the chart card's header row. The `accent` item is emphasized in
  // indigo. Data comes unchanged from each module.
  if (items.length === 0) return null;
  return (
    <div className="result-row">
      {items.map((it, i) => (
        <div key={i} className={it.accent ? 'metric accent' : 'metric'}>
          <span className="metric-k">{it.label}{it.helpId && <HelpTip id={it.helpId} />}</span>
          <span className="metric-v">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Collapsible didactic explanation block. */
export function InfoBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="info-box">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}
