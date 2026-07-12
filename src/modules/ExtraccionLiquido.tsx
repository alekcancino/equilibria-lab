// Liquid–liquid extraction — module ② of multiple equilibria.
//
// Models the distribution of an analyte between two immiscible phases as a
// function of pH. The conditional distribution coefficient D captures how
// ionisation in the aqueous phase reduces extraction:
//
//   D = Kd × α_neutral        α_neutral = fraction of the extractable form
//   %E = 100 · D·r / (D·r + 1)   where r = Vorg/Vaq
//
// For n successive extractions: %Eₙ = 100 · (1 − (1/(1+D·r))^n)
//
// Covered behaviors:
//   • Acids: D decreases monotonically for pH > pKa  (slope −1 in log D)
//   • Amphoteric (8-HQ): D has a bell-shaped maximum
//   • Non-ionisable (I₂): D constant = Kd

import { useMemo } from 'react';
import { useShareableState } from '../hooks/useShareableState';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { InfoBox, ModelBadge, ResultCard, Slider, Toggle, ConstantList, PanelSection, ResultCardRow } from '../components/Controls';
import {
  distributionD, percentE1, percentEn, nFor, type AnalyteState,
} from '../lib/extraction';
import { SPECIES_COLORS } from '../lib/database';
import { formatSci } from '../lib/format';
import { useT } from '../hooks/useT';

// ── Presets ───────────────────────────────────────────────────────────────────


interface ExtractionPreset {
  id: string;
  label: string;
  formula: string;
  type: 'acid' | 'chelate';
  logKd: number;
  pKas: number[];
  neutralIdx: number;
  system: string;
  reference?: string;
  // quelato
  n?: number;
  logCHL?: number;
}

// Data note: the dithizone logKd (id 'dithizone') differs ~100x between this base (4.00) and
// another reported value (10^6, log=6) -- see docs/testing/BOOK-QA-LOG.md finding B-7. Without a
// third source to break the tie, it's left without a `reference` (dithizone and pb_dithiz)
// rather than asserting a citation that could be wrong.
const PRESETS: ExtractionPreset[] = [
  { id: 'benzoico',  label: 'Ácido benzoico',         formula: 'C₆H₅COOH', type: 'acid',    logKd:  2.22, pKas: [4.20],         neutralIdx: 0, system: 'CHCl₃/H₂O', reference: 'Harris, QCA' },
  { id: 'salicilico',label: 'Ácido salicílico',       formula: 'HOC₆H₄COOH',type: 'acid',   logKd:  2.40, pKas: [3.00, 13.40], neutralIdx: 0, system: 'CHCl₃/H₂O', reference: 'Harris, QCA' },
  { id: 'aspirina',  label: 'Ácido acetilsalicílico', formula: 'HC₉H₇O₄',  type: 'acid',    logKd:  1.70, pKas: [3.50],         neutralIdx: 0, system: 'CHCl₃/H₂O', reference: 'Harris, QCA' },
  { id: 'acetico',   label: 'Ácido acético',           formula: 'CH₃COOH',  type: 'acid',    logKd: -0.23, pKas: [4.76],         neutralIdx: 0, system: 'Et₂O/H₂O',  reference: 'Harris, QCA' },
  { id: '8hq',       label: '8-Hidroxiquinolina',      formula: 'HQ',        type: 'acid',    logKd:  2.70, pKas: [5.13, 9.89],  neutralIdx: 1, system: 'CHCl₃/H₂O', reference: 'Skoog, Principles of Analytical Chemistry' },
  { id: 'dithizone', label: 'Ditizona',                formula: 'H₂Dz',     type: 'acid',    logKd:  4.00, pKas: [4.47],         neutralIdx: 0, system: 'CHCl₃/H₂O' },
  { id: 'I2',        label: 'Yodo molecular',          formula: 'I₂',        type: 'acid',    logKd:  2.83, pKas: [],             neutralIdx: 0, system: 'CCl₄/H₂O',  reference: 'Harris, QCA' },
  // Metal chelates — D = K_ex · [HL]^n · 10^(n·pH)
  { id: 'cu_8hq',    label: 'Cu²⁺ + 8-HQ',            formula: 'Cu(Ox)₂',   type: 'chelate', logKd:  9.10, pKas: [], neutralIdx: 0, n: 2, logCHL: -1, system: 'CHCl₃/H₂O', reference: 'Skoog, Principles of Analytical Chemistry' },
  { id: 'zn_8hq',    label: 'Zn²⁺ + 8-HQ',            formula: 'Zn(Ox)₂',   type: 'chelate', logKd:  8.70, pKas: [], neutralIdx: 0, n: 2, logCHL: -1, system: 'CHCl₃/H₂O', reference: 'Skoog, Principles of Analytical Chemistry' },
  { id: 'fe_8hq',    label: 'Fe³⁺ + 8-HQ',            formula: 'Fe(Ox)₃',   type: 'chelate', logKd: 12.10, pKas: [], neutralIdx: 0, n: 3, logCHL: -1, system: 'CHCl₃/H₂O', reference: 'Skoog, Principles of Analytical Chemistry' },
  { id: 'pb_dithiz', label: 'Pb²⁺ + Ditizona',         formula: 'Pb(HDz)₂', type: 'chelate', logKd:  6.30, pKas: [], neutralIdx: 0, n: 2, logCHL: -2, system: 'CHCl₃/H₂O' },
];

// ── Colors ────────────────────────────────────────────────────────────────────

const C1 = SPECIES_COLORS[0]; // orange — analyte 1
const C2 = SPECIES_COLORS[1]; // blue   — analyte 2 (comparison)
const C_N = ['#D55E00', '#0072B2', '#009E73'];

const PH_N = 400;

// ── State interfaces ──────────────────────────────────────────────────────────

function presetState(id: string): AnalyteState {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0];
  return {
    label: p.label,
    type: p.type,
    logKd: p.logKd,
    pKas: [...p.pKas],
    neutralIdx: p.neutralIdx,
    n: p.n ?? 2,
    logCHL: p.logCHL ?? -1,
  };
}

function defaultState() {
  return {
    a1: presetState('I2'),
    a2: presetState('8hq'),
    showA2: false,
    showDimer: false,
    logK2: 1.5,
    Vaq: 10,        // mL
    Vorg: 10,       // mL
    nMax: 1,        // number of successive extractions shown in the 3rd tab
    preconNMax: 10,
    pH: 5,          // cursor
  };
}

function AnalyteEditor({ a, color, additions, onChange }: {
  a: AnalyteState;
  color: string;
  additions: Array<string | false>;
  onChange: (patch: Partial<AnalyteState>) => void;
}) {
  const t = useT();
  const acidPresets = PRESETS.filter((p) => p.type === 'acid');
  const chelatePresets = PRESETS.filter((p) => p.type === 'chelate');
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
        {t('extraccionLiquido.nameFormulaLabel')}
      </label>
      <input
        className="text-input"
        value={a.label}
        onChange={(e) => onChange({ label: e.target.value })}
        style={{ width: '100%', marginBottom: 8 }}
      />

      <div className="control" style={{ marginBottom: 6 }}>
        <div className="control-header">
          <span className="control-label">{t('solubilidad.typeLabel')}</span>
        </div>
        <div className="segmented" style={{ marginTop: 4 }}>
          {(['acid', 'chelate'] as const).map((tp) => (
            <button
              key={tp}
              className={a.type === tp ? 'seg-btn active' : 'seg-btn'}
              onClick={() => onChange({ type: tp })}
            >
              {tp === 'acid' ? t('extraccionLiquido.acidNeutralOption') : t('extraccionLiquido.metalChelateOption')}
            </button>
          ))}
        </div>
      </div>
      <ModelBadge
        model={a.type === 'chelate'
          ? t('extraccionLiquido.chelateExtractionModel', { n: a.n })
          : a.pKas.length === 0
            ? t('extraccionLiquido.simplePartitionModel')
            : a.pKas.length === 1
              ? t('extraccionLiquido.singleIonizationModel')
              : t('extraccionLiquido.multiIonizationModel', { n: a.pKas.length })}
        additions={additions}
      />

      <p className="hint" style={{ marginBottom: 6 }}>
        {a.type === 'acid'
          ? t('extraccionLiquido.acidPresetsHint')
          : t('extraccionLiquido.chelatePresetsHint')}
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {(a.type === 'acid' ? acidPresets : chelatePresets).map((p) => (
          <button
            key={p.id}
            className="preset-chip"
            title={`${p.system}  ·  logKd = ${p.logKd}`}
            onClick={() => onChange({
              label: p.label, type: p.type, logKd: p.logKd,
              pKas: [...p.pKas], neutralIdx: p.neutralIdx,
              n: p.n ?? 2, logCHL: p.logCHL ?? -1,
            })}
          >
            {p.formula}
          </button>
        ))}
      </div>

      {a.type === 'acid' ? (
        <>
          <Slider label="log Kd" helpId="Kd" value={a.logKd} min={-2} max={6} step={0.05} onChange={(v) => onChange({ logKd: v })} decimals={2} />
          <ConstantList
            prefix="pKa"
            values={a.pKas}
            onChange={(v) => onChange({ pKas: v })}
            min={0}
            max={14}
            maxItems={4}
            minItems={0}
            initialValue={4.76}
          />
          {a.pKas.length > 1 && (
            <p className="hint">{t('extraccionLiquido.neutralFormIndexHint', { idx: a.neutralIdx })}
              {' '}
              <button
                style={{ fontSize: 12, background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: '1px 6px' }}
                onClick={() => onChange({ neutralIdx: (a.neutralIdx + 1) % (a.pKas.length + 1) })}
              >
                +1
              </button>
            </p>
          )}
        </>
      ) : (
        <>
          <Slider label="log K_ex" helpId="Kex" value={a.logKd} min={-2} max={20} step={0.1} onChange={(v) => onChange({ logKd: v })} decimals={2} />
          <div className="control">
            <div className="control-header">
              <span className="control-label">{t('extraccionLiquido.metalChargeNLabel')}</span>
              <span className="control-value">{a.n}</span>
            </div>
            <div className="segmented" style={{ marginTop: 4 }}>
              {[1, 2, 3].map((n) => (
                <button key={n} className={a.n === n ? 'seg-btn active' : 'seg-btn'} onClick={() => onChange({ n })}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Slider label="log[HL]_org" value={a.logCHL} min={-4} max={0} step={0.1} onChange={(v) => onChange({ logCHL: v })} decimals={1} />
          <p className="hint">{t('extraccionLiquido.chelateDFormulaHint')}</p>
        </>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExtraccionLiquido() {
  const t = useT();
  const [st, setSt] = useShareableState('extraccion', defaultState());
  const set = <K extends keyof ReturnType<typeof defaultState>>(
    k: K, v: ReturnType<typeof defaultState>[K]
  ) => setSt((p) => ({ ...p, [k]: v }));

  const reset = () => setSt(defaultState());

  const r = st.Vorg / st.Vaq; // volume ratio

  const exportMetadata = useMemo(() => ({
    Módulo: 'Extracción líquido-líquido',
    'Analito 1': st.a1.label,
    ...(st.showA2 ? { 'Analito 2': st.a2.label } : {}),
    'r (Vorg/Vaq)': r.toFixed(2),
    'n extracciones': String(st.nMax),
  }), [st.a1.label, st.showA2, st.a2.label, r, st.nMax]);

  const dimerOpts = useMemo(
    () => ({ enabled: st.showDimer, logK2: st.logK2 }),
    [st.showDimer, st.logK2],
  );

  // ── Curvas ─────────────────────────────────────────────────────────────────

  const pHs = useMemo(() => Array.from({ length: PH_N + 1 }, (_, i) => 14 * i / PH_N), []);

  const D1s = useMemo(() => pHs.map((pH) => distributionD(st.a1, pH, dimerOpts)), [pHs, st.a1, dimerOpts]);
  const D2s = useMemo(() => pHs.map((pH) => distributionD(st.a2, pH)), [pHs, st.a2]);

  const logD1s = useMemo(() => D1s.map((d) => d > 1e-10 ? Math.log10(d) : -10), [D1s]);
  const logD2s = useMemo(() => D2s.map((d) => d > 1e-10 ? Math.log10(d) : -10), [D2s]);

  const pE1s = useMemo(() => D1s.map((d) => percentE1(d, r)), [D1s, r]);
  const pE2s = useMemo(() => D2s.map((d) => percentE1(d, r)), [D2s, r]);

  // ── Valores en el cursor ────────────────────────────────────────────────────

  const D1cur = distributionD(st.a1, st.pH, dimerOpts);
  const D2cur = distributionD(st.a2, st.pH);
  const pE1cur = percentE1(D1cur, r);
  const pE2cur = percentE1(D2cur, r);
  const n99_1 = nFor(D1cur, r, 99);

  // ── Dynamic Y range for log D ──────────────────────────────────────────────

  const allLogD = [...logD1s, ...(st.showA2 ? logD2s : [])];
  const logDMax = Math.ceil(Math.max(st.a1.logKd, st.showA2 ? st.a2.logKd : 0)) + 0.5;
  const logDMin = Math.max(-5, Math.floor(Math.min(...allLogD.filter((v) => v > -9.9))) - 0.5);

  // ── Shapes / anotaciones comunes ────────────────────────────────────────────

  const cursorShape = (yMin: number, yMax: number): Partial<Shape> => ({
    type: 'line', x0: st.pH, x1: st.pH, y0: yMin - 100, y1: yMax + 100,
    line: { color: '#CC79A7', width: 1.5, dash: 'dashdot' },
  });

  const cursorAnnotation = (yMax: number): Partial<Annotations> => ({
    x: st.pH, y: yMax,
    text: `pH ${st.pH.toFixed(1)}`,
    showarrow: false, font: { size: 11, color: '#CC79A7' },
  });

  // ── Multiple extractions (%E vs pH for n=1..nMax) ─────────────────────────

  const multiTraces = useMemo<Data[]>(() => {
    return Array.from({ length: st.nMax }, (_, i) => {
      const n = i + 1;
      return {
        x: pHs,
        y: D1s.map((d) => percentEn(d, r, n)),
        type: 'scatter', mode: 'lines',
        name: `n = ${n}`,
        line: { width: n === 1 ? 3 : 2, color: C_N[i] ?? '#aaaaaa', dash: n === 1 ? undefined : (n === 2 ? 'dash' : 'dot') },
        hovertemplate: `%E = %{y:.1f}%<extra>n=${n}</extra>`,
      };
    });
  }, [pHs, D1s, r, st.nMax]);

  const preconTrace = useMemo<Data[]>(() => {
    const D = distributionD(st.a1, st.pH, dimerOpts);
    const ns = Array.from({ length: st.preconNMax }, (_, i) => i + 1);
    return [{
      x: ns,
      y: ns.map((n) => percentEn(D, r, n)),
      type: 'scatter',
      mode: 'lines+markers',
      name: `%E acumulado (pH ${st.pH.toFixed(1)})`,
      line: { width: 3, color: C1 },
      marker: { size: 6 },
      hovertemplate: 'n = %{x}<br>%E = %{y:.1f}%<extra></extra>',
    }];
  }, [st.a1, st.pH, dimerOpts, st.preconNMax, r]);

  // ── log D traces ──────────────────────────────────────────────────────────

  const logDTraces = useMemo<Data[]>(() => {
    const t: Data[] = [{
      x: pHs, y: logD1s, type: 'scatter', mode: 'lines',
      name: `log D — ${st.a1.label}`,
      line: { width: 3, color: C1 },
      hovertemplate: `log D = %{y:.2f}<extra>${st.a1.label}</extra>`,
    }];
    if (st.showA2) {
      t.push({
        x: pHs, y: logD2s, type: 'scatter', mode: 'lines',
        name: `log D — ${st.a2.label}`,
        line: { width: 3, color: C2 },
        hovertemplate: `log D = %{y:.2f}<extra>${st.a2.label}</extra>`,
      });
    }
    return t;
  }, [pHs, logD1s, logD2s, st.a1, st.a2, st.showA2]);

  // ── %E traces ─────────────────────────────────────────────────────────────

  const pETraces = useMemo<Data[]>(() => {
    const t: Data[] = [{
      x: pHs, y: pE1s, type: 'scatter', mode: 'lines',
      name: st.a1.label,
      line: { width: 3, color: C1 },
      hovertemplate: `%%E = %{y:.1f}%%<extra>${st.a1.label}</extra>`,
    }];
    if (st.showA2) {
      t.push({
        x: pHs, y: pE2s, type: 'scatter', mode: 'lines',
        name: st.a2.label,
        line: { width: 3, color: C2 },
        hovertemplate: `%%E = %{y:.1f}%%<extra>${st.a2.label}</extra>`,
      });
    }
    return t;
  }, [pHs, pE1s, pE2s, st.a1, st.a2, st.showA2]);

  // ── Diagrams ───────────────────────────────────────────────────────────────

  const diagrams = [
    {
      id: 'logd',
      label: 'log D = f(pH)',
      node: (
        <Chart
          data={logDTraces}
          xTitle="pH"
          yTitle="log D"
          xRange={[0, 14]}
          yRange={[logDMin, logDMax]}
          shapes={[cursorShape(logDMin, logDMax)]}
          annotations={[cursorAnnotation(logDMax)]}
          exportName="equilibria-logD-pH"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'pE',
      label: '%E = f(pH)',
      node: (
        <Chart
          data={pETraces}
          xTitle="pH"
          yTitle={t('extraccionLiquido.pctExtractionLabel')}
          xRange={[0, 14]}
          yRange={[0, 100]}
          shapes={[cursorShape(0, 100)]}
          annotations={[cursorAnnotation(100)]}
          exportName="equilibria-pE-pH"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'multi',
      label: t('extraccionLiquido.tabMultipleExtractions'),
      node: (
        <Chart
          data={multiTraces}
          xTitle="pH"
          yTitle={t('extraccionLiquido.pctCumulativeExtractionLabel')}
          xRange={[0, 14]}
          yRange={[0, 100]}
          shapes={[cursorShape(0, 100)]}
          annotations={[cursorAnnotation(100)]}
          exportName="equilibria-multi-pH"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'precon',
      label: t('extraccionLiquido.tabPreconcentration'),
      node: (
        <Chart
          data={preconTrace}
          xTitle={t('extraccionLiquido.numberOfExtractionsLabel')}
          yTitle={t('extraccionLiquido.pctCumulativeExtractionLabel')}
          xRange={[1, st.preconNMax]}
          yRange={[0, 100]}
          exportName="equilibria-preconcentracion"
          exportMetadata={exportMetadata}
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title={t('extraccionLiquido.title')} onReset={reset} moduleId="extraccion">
        <PanelSection title={t('extraccionLiquido.analyte1Section')} icon="①">
          <AnalyteEditor
            a={st.a1}
            color={C1}
            additions={[st.showA2 && t('extraccionLiquido.additionAnalyteComparison'), st.nMax > 1 && t('extraccionLiquido.additionSuccessiveExtractions', { n: st.nMax })]}
            onChange={(p) => set('a1', { ...st.a1, ...p })}
          />
        </PanelSection>

        <PanelSection title={t('extraccionLiquido.analyte2ComparisonSection')} icon="②">
          <Toggle label={t('extraccionLiquido.compareSecondAnalyte')} checked={st.showA2} onChange={(v) => set('showA2', v)} />
          {st.showA2 && (
            <div className="mask-section">
              <AnalyteEditor
                a={st.a2}
                color={C2}
                additions={[st.showA2 && t('extraccionLiquido.additionAnalyteComparison'), st.nMax > 1 && t('extraccionLiquido.additionSuccessiveExtractions', { n: st.nMax })]}
                onChange={(p) => set('a2', { ...st.a2, ...p })}
              />
            </div>
          )}
        </PanelSection>

        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          <Toggle
            label={t('extraccionLiquido.polymerizationToggle')}
            checked={st.showDimer}
            onChange={(v) => set('showDimer', v)}
          />
          {st.showDimer && st.a1.type === 'acid' && (
            <Slider label="log K₂ (dímero)" helpId="logK2" value={st.logK2} min={-1} max={4} step={0.1} onChange={(v) => set('logK2', v)} decimals={1} />
          )}
          <Slider label={t('potencialcond.cursorPHLabel')} value={st.pH} min={0} max={14} step={0.1} onChange={(v) => set('pH', v)} decimals={1} />
          <Slider label="Vaq (mL)" value={st.Vaq} min={1} max={50} step={1} onChange={(v) => set('Vaq', v)} decimals={0} />
          <Slider label="Vorg (mL)" value={st.Vorg} min={1} max={50} step={1} onChange={(v) => set('Vorg', v)} decimals={0} />
          <Slider label={t('extraccionLiquido.extractionsToPlotLabel')} value={st.nMax} min={1} max={5} step={1} onChange={(v) => set('nMax', v)} decimals={0} />
          <Slider label={t('extraccionLiquido.preconcentrationStagesLabel')} value={st.preconNMax} min={3} max={20} step={1} onChange={(v) => set('preconNMax', v)} decimals={0} />
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')} icon="∑">
          <ResultCard items={[
            { label: t('extraccionLiquido.dAtPHLabel', { ph: st.pH.toFixed(1) }), value: D1cur >= 0.001 ? D1cur.toFixed(3) : formatSci(D1cur) },
            { label: 'log D', value: D1cur > 0 ? Math.log10(D1cur).toFixed(2) : '< −10' },
            { label: t('extraccionLiquido.pctE1Label', { r: r.toFixed(1) }), value: `${pE1cur.toFixed(1)} %` },
            { label: `%E · n=2`, value: `${percentEn(D1cur, r, 2).toFixed(1)} %` },
            { label: `%E · n=3`, value: `${percentEn(D1cur, r, 3).toFixed(1)} %` },
            { label: t('extraccionLiquido.extractionsFor99Label'), value: n99_1 !== null ? `${n99_1}` : '> 100' },
            ...(st.showA2 ? [
              { label: t('extraccionLiquido.pctE1DashLabel', { label: st.a2.label }), value: `${pE2cur.toFixed(1)} %` },
              { label: t('extraccionLiquido.separationFactorLabel'), value: D2cur > 0 ? (D1cur / D2cur).toFixed(2) : '∞' },
            ] : []),
          ]} />
        </PanelSection>

        <InfoBox title={t('extraccionLiquido.title')}>
          <p>
            {t('extraccionLiquido.para1Prefix')}<code>{t('extraccionLiquido.para1Code1')}</code>
            {t('extraccionLiquido.para1Mid')}<code>{t('extraccionLiquido.para1Code2')}</code>{t('extraccionLiquido.para1Suffix')}
          </p>
          <p>
            {t('extraccionLiquido.para2Prefix')}<strong>{t('extraccionLiquido.amphotericBold')}</strong>{t('extraccionLiquido.para2Rest')}
          </p>
          <p>
            <strong>{t('extraccionLiquido.polymerizationBold')}</strong>{t('extraccionLiquido.polymerizationRest')}
          </p>
          <p>
            <strong>{t('extraccionLiquido.preconcentrationBold')}</strong>{t('extraccionLiquido.preconcentrationRest')}
          </p>
          <p>
            <strong>{t('extraccionLiquido.multipleExtractionsBold')}</strong>{t('extraccionLiquido.multipleExtractionsRest')}
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="logd" />
        <ResultCardRow items={[
          { label: t('extraccionLiquido.pctE1AtPHLabel', { ph: st.pH.toFixed(1) }), value: Number.isFinite(pE1cur) ? `${pE1cur.toFixed(1)} %` : '—', accent: true },
          { label: 'log D', value: D1cur > 0 ? Math.log10(D1cur).toFixed(2) : '—' },
          { label: t('extraccionLiquido.nFor99Label'), value: n99_1 !== null ? `${n99_1}` : '—' },
        ]} />
      </section>
    </div>
  );
}
