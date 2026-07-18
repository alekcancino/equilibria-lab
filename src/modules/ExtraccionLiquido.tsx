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

import { useId, useMemo } from 'react';
import { useShareableState } from '../hooks/useShareableState';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { Disclosure, InfoBox, ModelBadge, ResultCard, Slider, Toggle, ConstantList, PanelSection, ResultCardRow, SelectControl } from '../components/Controls';
import {
  conditionalChelateLogK, distributionD, percentE1, percentEn, nFor, sequentialExtraction, type AnalyteState,
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

// Data note: dithizone logKd/pKa follow Harris (KL = 1.1e4, Ka = 3e-5 in CHCl3/H2O — Harris,
// QCA 8th ed., problems 22-13/22-14), which settled a 100x discrepancy against another source
// (see docs/testing/BOOK-QA-LOG.md finding B-7). pb_dithiz remains unreferenced.
const PRESETS: ExtractionPreset[] = [
  { id: 'benzoico',  label: 'Ácido benzoico',         formula: 'C₆H₅COOH', type: 'acid',    logKd:  2.22, pKas: [4.20],         neutralIdx: 0, system: 'CHCl₃/H₂O', reference: 'Harris, QCA' },
  { id: 'salicilico',label: 'Ácido salicílico',       formula: 'HOC₆H₄COOH',type: 'acid',   logKd:  2.40, pKas: [3.00, 13.40], neutralIdx: 0, system: 'CHCl₃/H₂O', reference: 'Harris, QCA' },
  { id: 'aspirina',  label: 'Ácido acetilsalicílico', formula: 'HC₉H₇O₄',  type: 'acid',    logKd:  1.70, pKas: [3.50],         neutralIdx: 0, system: 'CHCl₃/H₂O', reference: 'Harris, QCA' },
  { id: 'acetico',   label: 'Ácido acético',           formula: 'CH₃COOH',  type: 'acid',    logKd: -0.23, pKas: [4.76],         neutralIdx: 0, system: 'Et₂O/H₂O',  reference: 'Harris, QCA' },
  { id: '8hq',       label: '8-Hidroxiquinolina',      formula: 'HQ',        type: 'acid',    logKd:  2.70, pKas: [5.13, 9.89],  neutralIdx: 1, system: 'CHCl₃/H₂O', reference: 'Skoog, Principles of Analytical Chemistry' },
  { id: 'dithizone', label: 'Ditizona',                formula: 'H₂Dz',     type: 'acid',    logKd:  4.04, pKas: [4.52],         neutralIdx: 0, system: 'CHCl₃/H₂O', reference: 'Harris, QCA' },
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
const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';

function genericAcidForm(totalProtons: number, index: number): string {
  const remaining = Math.max(0, totalProtons - index);
  if (remaining === 0) return 'A';
  if (remaining === 1) return 'HA';
  return `H${String(remaining).split('').map((digit) => SUBSCRIPT_DIGITS[Number(digit)]).join('')}A`;
}

// ── State interfaces ──────────────────────────────────────────────────────────

function presetState(id: string): AnalyteState {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0];
  return {
    label: p.formula,
    type: p.type,
    logKd: p.logKd,
    pKas: [...p.pKas],
    neutralIdx: p.neutralIdx,
    n: p.n ?? 2,
    logCHL: p.logCHL ?? -1,
    logBetasMetalOH: [],
    chelatorPKas: [],
    chelatorPartitionRatio: 1,
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
    logAlphaMetal: 0,
    logAlphaChelator: 0,
    showPlanner: false,
    stagePHs: [5, 2, 8],
    stageRatios: [1, 1, 1],
    stageRoutes: ['organic', 'aqueous', 'organic'] as Array<'aqueous' | 'organic'>,
  };
}

function AnalyteEditor({ a, color, additions, onChange }: {
  a: AnalyteState;
  color: string;
  additions: Array<string | false>;
  onChange: (patch: Partial<AnalyteState>) => void;
}) {
  const t = useT();
  const nameId = useId();
  const acidPresets = PRESETS.filter((p) => p.type === 'acid');
  const chelatePresets = PRESETS.filter((p) => p.type === 'chelate');
  const selectedNeutralIdx = Math.min(a.neutralIdx, a.pKas.length);
  const neutralFormOptions = Array.from({ length: a.pKas.length + 1 }, (_, index) => ({
    value: String(index),
    label: `α${index} · ${genericAcidForm(a.pKas.length, index)} · ${index === 0
      ? t('extraccionLiquido.mostProtonatedForm')
      : index === a.pKas.length
        ? t('extraccionLiquido.mostDeprotonatedForm')
        : t('extraccionLiquido.intermediateForm')}`,
  }));
  return (
    <div className="analyte-editor">
      <label className="analyte-label" htmlFor={nameId}>
        <span className="analyte-dot" aria-hidden style={{ background: color }} />
        {t('extraccionLiquido.nameFormulaLabel')}
      </label>
      <input
        id={nameId}
        className="text-input"
        value={a.label}
        onChange={(e) => onChange({ label: e.target.value })}
      />

      <div className="control analyte-type-control">
        <div className="control-header">
          <span className="control-label">{t('solubilidad.typeLabel')}</span>
        </div>
        <div className="segmented control-input">
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

      <p className="hint analyte-preset-hint">
        {a.type === 'acid'
          ? t('extraccionLiquido.acidPresetsHint')
          : t('extraccionLiquido.chelatePresetsHint')}
      </p>
      <div className="preset-chip-row preset-chip-row-spaced">
        {(a.type === 'acid' ? acidPresets : chelatePresets).map((p) => (
          <button type="button"
            key={p.id}
            className="preset-chip"
            title={`${p.system}  ·  logKd = ${p.logKd}`}
            onClick={() => onChange({
              label: p.formula, type: p.type, logKd: p.logKd,
              pKas: [...p.pKas], neutralIdx: p.neutralIdx,
              n: p.n ?? 2, logCHL: p.logCHL ?? -1,
              logBetasMetalOH: [], chelatorPKas: [], chelatorPartitionRatio: 1,
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
            onChange={(v) => onChange({ pKas: v, neutralIdx: Math.min(a.neutralIdx, v.length) })}
            min={0}
            max={14}
            maxItems={4}
            minItems={0}
            initialValue={4.76}
          />
          {a.pKas.length > 1 && (
            <>
              <SelectControl
                label={t('extraccionLiquido.extractableNeutralFormLabel')}
                value={String(selectedNeutralIdx)}
                options={neutralFormOptions}
                onChange={(value) => onChange({ neutralIdx: Number(value) })}
              />
              <p className="hint">{t('extraccionLiquido.neutralFormConsequence', {
                idx: selectedNeutralIdx,
                form: genericAcidForm(a.pKas.length, selectedNeutralIdx),
                charges: Array.from({ length: a.pKas.length + 1 }, (_, index) => (
                  `${genericAcidForm(a.pKas.length, index)}: z=${selectedNeutralIdx - index > 0 ? '+' : ''}${selectedNeutralIdx - index}`
                )).join(' · '),
              })}</p>
            </>
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
            <div className="segmented control-input">
              {[1, 2, 3].map((n) => (
                <button type="button" key={n} className={a.n === n ? 'seg-btn active' : 'seg-btn'} onClick={() => onChange({ n })}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Slider label="log[HL]_org" value={a.logCHL} min={-4} max={0} step={0.1} onChange={(v) => onChange({ logCHL: v })} decimals={1} />
          <ConstantList
            prefix="log βM(OH)"
            values={a.logBetasMetalOH ?? []}
            onChange={(v) => onChange({ logBetasMetalOH: v })}
            min={0}
            max={40}
            maxItems={4}
            minItems={0}
            initialValue={6}
          />
          <ConstantList
            prefix="pKa(HL)"
            values={a.chelatorPKas ?? []}
            onChange={(v) => onChange({ chelatorPKas: v.slice(0, 2) })}
            min={0}
            max={14}
            maxItems={2}
            minItems={0}
            initialValue={9}
          />
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
  const conditionedState = (analyte: AnalyteState): AnalyteState => analyte.type === 'chelate'
    ? {
        ...analyte,
        logKd: conditionalChelateLogK({
          logKEx: analyte.logKd,
          alphaMetal: Math.pow(10, st.logAlphaMetal ?? 0),
          alphaChelator: Math.pow(10, st.logAlphaChelator ?? 0),
          stoichChelator: analyte.n,
        }),
      }
    : analyte;
  const a1Conditioned = conditionedState(st.a1);
  const a2Conditioned = conditionedState(st.a2);

  // ── Curvas ─────────────────────────────────────────────────────────────────

  const pHs = useMemo(() => Array.from({ length: PH_N + 1 }, (_, i) => 14 * i / PH_N), []);

  const D1s = useMemo(() => pHs.map((pH) => distributionD(a1Conditioned, pH, dimerOpts)), [pHs, a1Conditioned, dimerOpts]);
  const D2s = useMemo(() => pHs.map((pH) => distributionD(a2Conditioned, pH)), [pHs, a2Conditioned]);

  const logD1s = useMemo(() => D1s.map((d) => d > 1e-10 ? Math.log10(d) : -10), [D1s]);
  const logD2s = useMemo(() => D2s.map((d) => d > 1e-10 ? Math.log10(d) : -10), [D2s]);

  const pE1s = useMemo(() => D1s.map((d) => percentE1(d, r)), [D1s, r]);
  const pE2s = useMemo(() => D2s.map((d) => percentE1(d, r)), [D2s, r]);

  // ── Valores en el cursor ────────────────────────────────────────────────────

  const D1cur = distributionD(a1Conditioned, st.pH, dimerOpts);
  const D2cur = distributionD(a2Conditioned, st.pH);
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
    const D = distributionD(a1Conditioned, st.pH, dimerOpts);
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
  }, [a1Conditioned, st.pH, dimerOpts, st.preconNMax, r]);

  const planner = useMemo(() => sequentialExtraction(
    [
      { label: st.a1.label, initialMoles: 1, state: a1Conditioned },
      ...(st.showA2 ? [{ label: st.a2.label, initialMoles: 1, state: a2Conditioned }] : []),
    ],
    (st.stagePHs ?? [5, 2, 8]).map((pH, index) => ({
      pH,
      aqueousVolume: 1,
      organicVolume: (st.stageRatios ?? [1, 1, 1])[index] ?? 1,
      continuePhase: (st.stageRoutes ?? ['organic', 'aqueous', 'organic'])[index] ?? 'organic',
    })),
  ), [st.a1.label, st.a2.label, st.showA2, st.stagePHs, st.stageRatios, st.stageRoutes, a1Conditioned, a2Conditioned]);

  const plannerTraces = useMemo<Data[]>(() => {
    const labels = [st.a1.label, ...(st.showA2 ? [st.a2.label] : [])];
    return labels.map((label, analyteIndex) => ({
      x: [...planner.collected.map((phase, index) => `${index + 1} · ${phase.phase}`), t('extraccionLiquido.continuingPhase')],
      y: [...planner.collected.map((phase) => phase.moles[analyteIndex] * 100), planner.currentMoles[analyteIndex] * 100],
      type: 'bar',
      name: label,
    }));
  }, [planner, st.a1.label, st.a2.label, st.showA2, t]);

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
    ...(st.showPlanner ? [{
      id: 'planner',
      label: t('extraccionLiquido.sequentialPlannerTab'),
      node: (
        <Chart
          data={plannerTraces}
          xTitle={t('extraccionLiquido.stageOrPhaseLabel')}
          yTitle={t('extraccionLiquido.inventoryPctLabel')}
          yRange={[0, 100]}
          exportName="equilibria-extraccion-secuencial"
          exportMetadata={exportMetadata}
        />
      ),
    }] : []),
  ];

  return (
    <div className="module">
      <PanelShell title={t('extraccionLiquido.title')} onReset={reset} moduleId="extraccion" guideId="extraccion">
        <PanelSection title={t('extraccionLiquido.analyte1Section')}>
          <AnalyteEditor
            a={st.a1}
            color={C1}
            additions={[st.showA2 && t('extraccionLiquido.additionAnalyteComparison'), st.nMax > 1 && t('extraccionLiquido.additionSuccessiveExtractions', { n: st.nMax })]}
            onChange={(p) => set('a1', { ...st.a1, ...p })}
          />
        </PanelSection>

        <Disclosure title={t('extraccionLiquido.analyte2ComparisonSection')} open={st.showA2} onToggle={(v) => set('showA2', v)}>
          <div className="mask-section">
              <AnalyteEditor
                a={st.a2}
                color={C2}
                additions={[st.showA2 && t('extraccionLiquido.additionAnalyteComparison'), st.nMax > 1 && t('extraccionLiquido.additionSuccessiveExtractions', { n: st.nMax })]}
                onChange={(p) => set('a2', { ...st.a2, ...p })}
              />
          </div>
        </Disclosure>

        <PanelSection title={t('acidoBase.conditionsSection')}>
          <Toggle
            label={t('extraccionLiquido.polymerizationToggle')}
            checked={st.showDimer}
            onChange={(v) => set('showDimer', v)}
          />
          {st.showDimer && st.a1.type === 'acid' && (
            <Slider label={t('extraccionLiquido.logK2DimerLabel')} helpId="logK2" value={st.logK2} min={-1} max={4} step={0.1} onChange={(v) => set('logK2', v)} decimals={1} />
          )}
          {st.a1.type === 'chelate' && (
            <Disclosure title={t('extraccionLiquido.conditionalChelateDisclosure')}>
              <Slider label={t('extraccionLiquido.logAlphaMetalLabel')} value={st.logAlphaMetal ?? 0} min={0} max={20} step={0.1} onChange={(v) => set('logAlphaMetal', v)} decimals={1} />
              <Slider label={t('extraccionLiquido.logAlphaChelatorLabel')} value={st.logAlphaChelator ?? 0} min={0} max={20} step={0.1} onChange={(v) => set('logAlphaChelator', v)} decimals={1} />
            </Disclosure>
          )}
          <Slider label={t('potencialcond.cursorPHLabel')} value={st.pH} min={0} max={14} step={0.1} onChange={(v) => set('pH', v)} decimals={1} />
          <Slider label="Vaq (mL)" value={st.Vaq} min={1} max={50} step={1} onChange={(v) => set('Vaq', v)} decimals={0} />
          <Slider label="Vorg (mL)" value={st.Vorg} min={1} max={50} step={1} onChange={(v) => set('Vorg', v)} decimals={0} />
          <Slider label={t('extraccionLiquido.extractionsToPlotLabel')} value={st.nMax} min={1} max={5} step={1} onChange={(v) => set('nMax', v)} decimals={0} />
          <Slider label={t('extraccionLiquido.preconcentrationStagesLabel')} value={st.preconNMax} min={3} max={20} step={1} onChange={(v) => set('preconNMax', v)} decimals={0} />
          <Toggle label={t('extraccionLiquido.sequentialPlannerToggle')} checked={st.showPlanner ?? false} onChange={(v) => set('showPlanner', v)} />
          {st.showPlanner && (st.stagePHs ?? [5, 2, 8]).map((stagePH, index) => (
            <Disclosure key={index} title={t('extraccionLiquido.stageN', { n: index + 1 })} defaultOpen={index === 0}>
              <Slider label="pH" value={stagePH} min={0} max={14} step={0.1} onChange={(value) => set('stagePHs', (st.stagePHs ?? [5, 2, 8]).map((current, i) => i === index ? value : current))} decimals={1} />
              <Slider label="Vorg/Vaq" value={(st.stageRatios ?? [1, 1, 1])[index]} min={0.1} max={10} step={0.1} onChange={(value) => set('stageRatios', (st.stageRatios ?? [1, 1, 1]).map((current, i) => i === index ? value : current))} decimals={1} />
              <Toggle
                label={t('extraccionLiquido.continueOrganicToggle')}
                checked={(st.stageRoutes ?? ['organic', 'aqueous', 'organic'])[index] === 'organic'}
                onChange={(checked) => set('stageRoutes', (st.stageRoutes ?? ['organic', 'aqueous', 'organic']).map((current, i) => i === index ? (checked ? 'organic' : 'aqueous') : current))}
              />
            </Disclosure>
          ))}
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')}>
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
