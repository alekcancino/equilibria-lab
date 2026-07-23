import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { GLOSSARY } from '../lib/glossary';
import { useLanguage } from '../hooks/useLanguage';
import { useT } from '../hooks/useT';

/**
 * Small ⓘ affordance next to a cryptic control label. Shows a styled tooltip on
 * hover/focus (CSS) and on tap (click toggle for touch). Content comes from the
 * glossary; unknown ids render nothing.
 */
export function HelpTip({ id }: { id: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const lang = useLanguage();
  const t = useT();
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
        aria-label={`${t('controls.help')}: ${entry.meaning[lang]}`}
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
          <span className="help-tip-meaning">{entry.meaning[lang]}</span>
          <span className="help-tip-units">{entry.units[lang]}</span>
        </span>,
        document.body,
      )}
    </span>
  );
}

/** Numeric field that tolerates intermediate states while typing. */
function NumberField({
  value, onCommit, step, min, max, width = 72, labelledBy,
}: {
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  width?: number;
  labelledBy: string;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(String(value));
      setInvalid(false);
    }
  }, [value]);

  const withinBounds = (v: number) =>
    (min === undefined || v >= min) && (max === undefined || v <= max);

  const commitDraft = () => {
    if (draft.trim() === '') {
      setDraft(String(value));
      setInvalid(false);
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      setInvalid(false);
      return;
    }
    const bounded = Math.min(max ?? parsed, Math.max(min ?? parsed, parsed));
    onCommit(bounded);
    setDraft(String(bounded));
    setInvalid(false);
  };

  const errorMessage = min !== undefined && max !== undefined
    ? t('controls.valueRange', { min, max })
    : t('controls.invalidNumber');

  return (
    <span className="num-field-wrap">
      <input
        ref={inputRef}
        type="number"
        className={`num-field${invalid ? ' invalid' : ''}`}
        style={{ width }}
        value={draft}
        min={min}
        max={max}
        step={step ?? 'any'}
        aria-labelledby={labelledBy}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${labelledBy}-error` : undefined}
        onChange={(e) => {
          const next = e.target.value;
          const parsed = Number(next);
          setDraft(next);
          const valid = next !== '' && Number.isFinite(parsed) && withinBounds(parsed);
          setInvalid(!valid);
          if (valid) onCommit(parsed);
        }}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitDraft();
            inputRef.current?.blur();
          } else if (e.key === 'Escape') {
            setDraft(String(value));
            setInvalid(false);
            inputRef.current?.blur();
          }
        }}
      />
      {invalid && (
        <span id={`${labelledBy}-error`} className="num-field-error" role="alert">
          {errorMessage}
        </span>
      )}
    </span>
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
  const controlId = useId();
  const labelId = `${controlId}-label`;
  const rounded = parseFloat(value.toFixed(decimals));
  return (
    <div className="control">
      <div className="control-header">
        <span id={labelId} className="control-label">{label}{helpId && <HelpTip id={helpId} />}</span>
        <span className="control-value">
          <NumberField
            value={rounded}
            onCommit={onChange}
            step={step}
            min={min}
            max={max}
            labelledBy={labelId}
          />
          {unit && <span className="unit">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        aria-labelledby={labelId}
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
  const controlId = useId();
  const labelId = `${controlId}-label`;
  const valueMin = Math.pow(10, min);
  const valueMax = Math.pow(10, max);
  return (
    <div className="control">
      <div className="control-header">
        <span id={labelId} className="control-label">{label}{helpId && <HelpTip id={helpId} />}</span>
        <span className="control-value">
          <NumberField
            value={parseFloat(value.toPrecision(4))}
            onCommit={onChange}
            min={valueMin}
            max={valueMax}
            labelledBy={labelId}
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
        aria-labelledby={labelId}
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
  const controlId = useId();
  const labelId = `${controlId}-label`;
  return (
    <div className="control">
      {label && (
        <div className="control-header">
          <span id={labelId} className="control-label">{label}{helpId && <HelpTip id={helpId} />}</span>
        </div>
      )}
      <select value={value} aria-labelledby={label ? labelId : undefined} onChange={(e) => onChange(e.target.value)}>
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

function handleSegmentKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  options: { value: string }[],
  value: string,
  onChange: (v: string) => void,
): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const group = event.currentTarget.closest('[role="radiogroup"]');
  if (!group) return;
  const radios = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
  const current = radios.indexOf(event.currentTarget);
  if (current < 0 || radios.length === 0) return;

  event.preventDefault();
  let next = current;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = radios.length - 1;
  if (event.key === 'ArrowRight') next = (current + 1) % radios.length;
  if (event.key === 'ArrowLeft') next = (current - 1 + radios.length) % radios.length;
  const selected = options[next]?.value;
  if (selected !== undefined && selected !== value) onChange(selected);
  radios[next]?.focus();
}

/** Segmented control for choosing a mode (e.g. titration type or chart type). */
export function Segmented({
  options, value, onChange, ariaLabel, compact = false,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  /** Keep a horizontal row on narrow panels (short numeric/symbol options). */
  compact?: boolean;
}) {
  const longestLabel = options.reduce((max, o) => Math.max(max, o.label.length), 0);
  const useCompact = compact || (options.length <= 4 && longestLabel <= 12);
  return (
    <div className={`segmented${useCompact ? ' segmented--compact' : ''}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={o.value === value ? 'seg-btn active' : 'seg-btn'}
          onClick={() => onChange(o.value)}
          onKeyDown={(event) => handleSegmentKeyDown(event, options, value, onChange)}
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
      <div className="control-input">
        <Segmented compact ariaLabel={label} options={options.map((n) => ({ value: String(n), label: String(n) }))} value={String(value)} onChange={(v) => onChange(Number(v))} />
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
  const inputId = useId();
  return (
    <div className="control">
      <div className="control-header">
        <span className="control-label">
          <label htmlFor={inputId}>{label}</label>
          {helpId && <HelpTip id={helpId} />}
        </span>
      </div>
      <input
        id={inputId}
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
  const t = useT();
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
            type="button"
            className="mini-btn"
            title={t('controls.removeConstant')}
            aria-label={t('controls.removeConstant')}
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            disabled={values.length <= minItems}
          >
            −
          </button>
        </div>
      ))}
      {values.length < maxItems && (
        <button
          type="button"
          className="add-btn"
          onClick={() => onChange([
            ...values,
            values.length === 0
              ? initialValue
              : Math.min((values[values.length - 1] ?? initialValue) + 3, max),
          ])}
        >
          + {t('controls.add')} {prefix}
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
  items, onSelect, title,
}: {
  items: DbItem[];
  onSelect: (id: string) => void;
  title?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const otherGroup = t('controls.otherGroup');
  const hasGroups = items.some((it) => it.group);
  const groups = hasGroups
    ? [...new Set(items.map((it) => it.group ?? otherGroup))]
    : [null];

  const renderItem = (it: DbItem) => (
    <button
      key={it.id}
      type="button"
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
      <summary>{title ?? t('controls.dbExamples')}<span className="ui-chevron" aria-hidden /></summary>
      {groups.map((g) => (
        <div key={g ?? 'all'}>
          {g && <p className="db-group-title">{g}</p>}
          <div className="db-grid">
            {items.filter((it) => (g ? (it.group ?? otherGroup) === g : true)).map(renderItem)}
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
  items, onSelect, title,
}: {
  items: { id: string; name: string; group: string; detail: string }[];
  onSelect: (id: string) => void;
  title?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const groups = [...new Set(items.map((it) => it.group))];
  return (
    <details className="preset-picker" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{title ?? t('controls.loadFullSystem')}<span className="ui-chevron" aria-hidden /></summary>
      {groups.map((g) => (
        <div key={g} className="preset-group">
          <p className="preset-group-title">{g}</p>
          {items.filter((it) => it.group === g).map((it) => (
            <button
              key={it.id}
              type="button"
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
  const t = useT();
  const active = additions.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return (
    <div className="system-classification">
      <span><strong>{t('controls.modelDetected')}:</strong> {model}</span>
      {active.length > 0 && (
        <span className="model-additions">
          {active.map((item) => <span key={item} className="model-chip">+ {item}</span>)}
        </span>
      )}
    </div>
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

/** Groups the core controls for one stage of a scientific model. */
export function PanelSection({
  title, children, defaultOpen, collapsible = false,
}: {
  title?: ReactNode;
  children: ReactNode;
  /** If collapsible, initial state (open by default). */
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  const bodyId = useId();
  const header = title && (
    <div className="psection-head">
      <span className="psection-title">{title}</span>
      {collapsible && <span className="ui-chevron" aria-hidden />}
    </div>
  );
  return (
    <section className={collapsible && open ? 'psection open' : 'psection'}>
      {collapsible
        ? (
          <button type="button" className="psection-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
            {header}
          </button>
        )
        : header}
      {open && <div id={bodyId} className="psection-body">{children}</div>}
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
  /** In controlled mode, `open` owns the state and should be paired with `onToggle`. */
  open?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const bodyId = useId();
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    onToggle?.(next);
  };
  return (
    <section className={open ? 'disclosure open' : 'disclosure'}>
      <button type="button" className="disclosure-head" aria-expanded={open} aria-controls={bodyId} onClick={toggle}>
        <span className="disclosure-title">{title}</span>
        <span className="ui-chevron" aria-hidden />
      </button>
      {open && <div id={bodyId} className="disclosure-body">{children}</div>}
    </section>
  );
}

/** Primary metrics rendered with the plot, separate from detailed sidebar results. */
export function ResultCardRow({
  items,
}: {
  items: { label: ReactNode; value: ReactNode; accent?: boolean; helpId?: string }[];
}) {
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
      <summary>{title}<span className="ui-chevron" aria-hidden /></summary>
      <div>{children}</div>
    </details>
  );
}
