// Conditional Constants module (Ringbom).
// Generates the log K' = f(pH) curve and α coefficients for M + Y systems (EDTA by default).

import { useCallback, useEffect, useMemo } from 'react';
import { useShareableState, hasSharedUrlState } from '../hooks/useShareableState';
import { useComplejosCarryOver, type ComplejosCarryOver } from '../context/ComplejosCarryOverContext';
import { correctedLogBetas } from '../lib/activity';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  Slider, ConcSlider, DbPanel, InfoBox, LabelField, ModelBadge, NumberSegmented, PanelSection, ResultCard, ResultCardRow, Segmented, Toggle,
} from '../components/Controls';
import { fractionFormedExcess, operatingPoint } from '../lib/metrics';
import { SideReactionEditor } from '../components/Editors';
import { feasibilityWindow } from '../lib/conditional';
import {
  condLogKCurveFromStack,
  condLogKCurveMulti,
  condLogKPrimary,
  defaultSideEditorState,
  sideStackFromEditor,
  type PrimaryReaction,
  type SideReactionEditorState,
} from '../lib/sideReactions';
import { EDTA_METAL_PRESETS } from '../lib/indicatorDatabase';
import { useT } from '../hooks/useT';

// ── Base de datos de complejos M–EDTA ───────────────────────────────────────

// ── Estado ───────────────────────────────────────────────────────────────────

interface CondState {
  metalLabel: string;
  logKf: number;
  side: SideReactionEditorState;
  showMask: boolean;
  metal2Label: string;
  logKf2: number;
  logBetasOH2: number[];
  threshold: number;
  showMulti: boolean;
  extraReactions: PrimaryReaction[];
  evalPH: number;
  co: number;
  targetPct: number;
  useActivity: boolean;
  ionicI: number;
  zM: number;
}

function defaultState(): CondState {
  return {
    metalLabel: 'Ca²⁺',
    logKf: 10.65,
    side: defaultSideEditorState(),
    showMask: false,
    metal2Label: 'Mg²⁺',
    logKf2: 8.64,
    logBetasOH2: [],
    threshold: 8,
    showMulti: false,
    extraReactions: [],
    evalPH: 10,
    co: 0.1,
    targetPct: 99.9,
    useActivity: false,
    ionicI: 0.1,
    zM: 2,
  };
}

const MODULE_ID = 'condicionalesedta';

/** Seeds a fresh mount from the hub's cross-view carry-over: metal identity
 * and hydrolysis only (this module's ligand is always EDTA by convention,
 * so the generic ligand/ladder carry-over doesn't apply here). */
function seedFromCarryOver(c: ComplejosCarryOver): CondState {
  const base = defaultState();
  if (hasSharedUrlState(MODULE_ID)) return base;
  if (c.metalLabel) base.metalLabel = c.metalLabel;
  if (c.logBetasOH && c.logBetasOH.length > 0) {
    base.side = { ...base.side, showOH: true, logBetasOH: [...c.logBetasOH] };
  }
  return base;
}

// ── Colores ──────────────────────────────────────────────────────────────────

const C_PRIMARY  = '#0072B2';
const C_MASK     = '#D55E00';
const C_ALPHA_H  = '#CC79A7';
const C_ALPHA_OH = '#009E73';
const C_ALPHA_L  = '#E69F00';
const C_ALPHA_CX = '#56B4E9';
const C_THRESH   = 'rgba(230, 126, 34, 0.85)'; // umbral

// ── Componente principal ─────────────────────────────────────────────────────

const PH_POINTS = 600;
const PH_MIN = 1;
const PH_MAX = 14;

export default function ConstantesCondicionales() {
  const t = useT();
  const { carryOver, setCarryOver } = useComplejosCarryOver();
  // Computed once at mount — seedFromCarryOver is only ever consumed by
  // useShareableState's own internal lazy useState initializer, but eagerly
  // recomputing it (re-parsing the URL, re-allocating CondState) on every
  // render would be wasted work.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seed = useMemo(() => seedFromCarryOver(carryOver), []);
  const [s, setS] = useShareableState<CondState>(MODULE_ID, seed);

  const set = <K extends keyof CondState>(k: K, v: CondState[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    // Gate on actual data, not just the showOH Disclosure flag — see the
    // matching comment in EspeciacionMetal.tsx's push effect.
    const hasOH = s.side.showOH && s.side.logBetasOH.length > 0;
    setCarryOver((prev) => ({
      ...prev,
      metalLabel: s.metalLabel,
      logBetasOH: hasOH ? s.side.logBetasOH : undefined,
    }));
  }, [s.metalLabel, s.side.showOH, s.side.logBetasOH, setCarryOver]);

  function reset() { setS(defaultState()); }

  function applyPreset(id: string) {
    const p = EDTA_METAL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setS((prev) => ({
      ...prev,
      metalLabel: p.metal,
      logKf: p.logKf,
      side: {
        ...prev.side,
        showOH: p.logBetasOH.length > 0,
        logBetasOH: [...p.logBetasOH],
      },
    }));
  }

  function applyPreset2(id: string) {
    const p = EDTA_METAL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setS((prev) => ({
      ...prev,
      metal2Label: p.metal,
      logKf2: p.logKf,
      logBetasOH2: [...p.logBetasOH],
    }));
  }

  // ── Curvas ─────────────────────────────────────────────────────────────────

  const exportMetadata = useMemo(() => ({
    Módulo: 'Constantes condicionales (EDTA)',
    Metal: s.metalLabel,
    'log Kf': s.logKf.toFixed(2),
    ...(s.useActivity ? { 'I / M': s.ionicI.toFixed(4), zM: String(s.zM) } : {}),
    'pH evaluación': s.evalPH.toFixed(1),
    'Co / M': s.co.toFixed(4),
  }), [s.metalLabel, s.logKf, s.evalPH, s.co, s.useActivity, s.ionicI, s.zM]);

  const stack = useMemo(() => sideStackFromEditor(s.side), [s.side]);

  // Activity-corrected formation constants (EDTA is Y^4- so zY = -4); the same
  // (zM, zY) correction is applied to every M-Y reaction shown so the Ringbom
  // comparisons stay consistent. The sliders keep the ideal (I = 0) values.
  const corrK = useCallback(
    (logK: number) => (s.useActivity ? correctedLogBetas([logK], s.zM, -4, s.ionicI)[0] : logK),
    [s.useActivity, s.zM, s.ionicI],
  );
  const logKfEff = corrK(s.logKf);
  const logKf2Eff = corrK(s.logKf2);

  const curve1 = useMemo(() =>
    condLogKCurveFromStack(logKfEff, stack, [PH_MIN, PH_MAX], PH_POINTS),
    [logKfEff, stack],
  );

  const multiCurves = useMemo(() => {
    if (!s.showMulti || s.extraReactions.length === 0) return null;
    const reactions = [{ label: s.metalLabel, logKf: logKfEff }, ...s.extraReactions.map((r) => ({ ...r, logKf: corrK(r.logKf) }))];
    return condLogKCurveMulti(reactions, stack, [PH_MIN, PH_MAX], PH_POINTS);
  }, [s.showMulti, s.extraReactions, s.metalLabel, logKfEff, corrK, stack]);

  const curve2 = useMemo(() =>
    s.showMask
      ? condLogKCurveFromStack(
          logKf2Eff,
          { ligandPKas: [...s.side.ligandPKas], hydrolysis: s.logBetasOH2.length ? { logBetasOH: s.logBetasOH2 } : undefined },
          [PH_MIN, PH_MAX],
          PH_POINTS,
        )
      : null,
    [s.showMask, logKf2Eff, s.side.ligandPKas, s.logBetasOH2],
  );

  const logKAtEval = useMemo(
    () => condLogKPrimary(logKfEff, s.evalPH, stack),
    [logKfEff, s.evalPH, stack],
  );

  /** Local slope d(log K′)/dpH at the evaluation pH (linear segment, 2nd-order). */
  const slopeAtEval = useMemo(() => {
    const h = 0.25;
    const lo = condLogKPrimary(logKfEff, Math.max(PH_MIN, s.evalPH - h), stack);
    const hi = condLogKPrimary(logKfEff, Math.min(PH_MAX, s.evalPH + h), stack);
    return (hi - lo) / (2 * h);
  }, [logKfEff, s.evalPH, stack]);

  // "% + operating point" metric: fraction formed of M+Y at Co (ligand in excess) using log K′(pH).
  // pH para 10/50/90 % por bisección sobre f(pH) = K'(pH)·Co / (1 + K'(pH)·Co).
  const pctFormado = useMemo(
    () => fractionFormedExcess(logKAtEval, s.co) * 100,
    [logKAtEval, s.co],
  );
  const formedMetric = useCallback(
    (pH: number) => fractionFormedExcess(condLogKPrimary(logKfEff, pH, stack), s.co) * 100,
    [logKfEff, stack, s.co],
  );
  const phForPct = useMemo(() => ({
    p10: operatingPoint(formedMetric, 10, PH_MIN, PH_MAX),
    p50: operatingPoint(formedMetric, 50, PH_MIN, PH_MAX),
    p90: operatingPoint(formedMetric, 90, PH_MIN, PH_MAX),
  }), [formedMetric]);
  // P6: free-form masking target (0.1 % = negligible reaction, 99.9 % = fully
  // masked — the standard pair asked in selective-masking problems).
  const phForTarget = useMemo(
    () => operatingPoint(formedMetric, s.targetPct, PH_MIN, PH_MAX),
    [formedMetric, s.targetPct],
  );
  const fmtPH = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');

  // ── Resultado ──────────────────────────────────────────────────────────────

  const peakIdx = useMemo(() => {
    let idx = 0;
    for (let i = 1; i < curve1.logKs.length; i++) {
      if (curve1.logKs[i] > curve1.logKs[idx]) idx = i;
    }
    return idx;
  }, [curve1]);

  const pHopt = curve1.pHs[peakIdx];
  const logKmax = curve1.logKs[peakIdx];
  const feasWin = useMemo(
    () => feasibilityWindow(curve1.pHs, curve1.logKs, s.threshold),
    [curve1, s.threshold],
  );
  const feasWin2 = useMemo(
    () => curve2 ? feasibilityWindow(curve2.pHs, curve2.logKs, s.threshold) : null,
    [curve2, s.threshold],
  );

  const yMin = useMemo(() => {
    const allK = [...curve1.logKs, ...(curve2?.logKs ?? [])];
    return Math.max(Math.floor(Math.min(...allK)) - 2, -5);
  }, [curve1, curve2]);
  const yMax = logKmax + 3;

  // ── Shapes del diagrama log K' ──────────────────────────────────────────────

  const logKShapes = useMemo<Partial<Shape>[]>(() => {
    const out: Partial<Shape>[] = [
      {
        type: 'line', x0: PH_MIN, x1: PH_MAX, y0: s.threshold, y1: s.threshold,
        line: { color: C_THRESH, width: 2, dash: 'dash' },
      },
    ];
    if (feasWin) {
      out.push({
        type: 'rect', x0: feasWin[0], x1: feasWin[1], y0: yMin - 99, y1: yMax + 99,
        fillcolor: 'rgba(41, 128, 185, 0.09)', line: { width: 0 },
        layer: 'below',
      });
    }
    return out;
  }, [s.threshold, feasWin, yMin, yMax]);

  // ── Trazas diagrama log K' ─────────────────────────────────────────────────

  const logKTraces = useMemo<Data[]>(() => {
    const traces: Data[] = [];
    if (multiCurves) {
      multiCurves.curves.forEach((c, i) => {
        traces.push({
          x: multiCurves.pHs, y: c.logKs, type: 'scatter', mode: 'lines',
          name: `log K′(${c.label})`,
          line: { width: i === 0 ? 3 : 2, color: i === 0 ? C_PRIMARY : C_MASK, dash: i === 0 ? undefined : 'dot' },
          hovertemplate: `log K′ = %{y:.2f}<extra>${c.label}</extra>`,
        });
      });
    } else {
      traces.push({
        x: curve1.pHs, y: curve1.logKs, type: 'scatter', mode: 'lines',
        name: `log K′(${s.metalLabel}–EDTA)`,
        line: { width: 3, color: C_PRIMARY },
        hovertemplate: `log K′ = %{y:.2f}<extra>${s.metalLabel}</extra>`,
      });
    }
    if (curve2) {
      traces.push({
        x: curve2.pHs, y: curve2.logKs, type: 'scatter', mode: 'lines',
        name: `log K′(${s.metal2Label}–EDTA)`,
        line: { width: 2.5, color: C_MASK, dash: 'dot' },
        hovertemplate: `log K′ = %{y:.2f}<extra>${s.metal2Label}</extra>`,
      });
    }
    return traces;
  }, [curve1, curve2, multiCurves, s.metalLabel, s.metal2Label]);

  // ── Trazas diagrama coeficientes α ────────────────────────────────────────

  const alphaTraces = useMemo<Data[]>(() => {
    const traces: Data[] = [
      {
        x: curve1.pHs, y: curve1.logAlphaH, type: 'scatter', mode: 'lines',
        name: t('condicionales.traceProtonationY'),
        line: { width: 2.5, color: C_ALPHA_H },
        hovertemplate: `log α_Y(H) = %{y:.2f}<extra>α_Y(H)</extra>`,
      },
    ];
    if (s.side.showOH && s.side.logBetasOH.length > 0) {
      traces.push({
        x: curve1.pHs, y: curve1.logAlphaOH, type: 'scatter', mode: 'lines',
        name: t('condicionales.traceHydrolysis'),
        line: { width: 2.5, color: C_ALPHA_OH },
        hovertemplate: `log α_M(OH) = %{y:.2f}<extra>α_M(OH)</extra>`,
      });
    }
    if (s.side.showAux && s.side.logBetasAux.length > 0) {
      traces.push({
        x: curve1.pHs, y: curve1.logAlphaL, type: 'scatter', mode: 'lines',
        name: t('condicionales.traceAux', { x: s.side.auxLabel }),
        line: { width: 2.5, color: C_ALPHA_L },
        hovertemplate: `log α_M(L) = %{y:.2f}<extra>α_M(${s.side.auxLabel})</extra>`,
      });
    }
    if (s.side.showComplex) {
      traces.push({
        x: curve1.pHs, y: curve1.logAlphaComplex, type: 'scatter', mode: 'lines',
        name: t('condicionales.traceComplex'),
        line: { width: 2.5, color: C_ALPHA_CX },
        hovertemplate: `log α_MY = %{y:.2f}<extra>α_MY</extra>`,
      });
    }
    return traces;
  }, [curve1, s.side, t]);

  // ── Veredicto ──────────────────────────────────────────────────────────────

  const verdict = useMemo(() => {
    if (logKmax < s.threshold) return { text: t('condicionales.notFeasible'), ok: false };
    if (!feasWin) return { text: t('condicionales.feasibleNarrow'), ok: false };
    const width = feasWin[1] - feasWin[0];
    if (width < 0.5) return { text: t('condicionales.veryNarrowWindow', { width: width.toFixed(1) }), ok: false };
    return { text: t('condicionales.feasibleOk', { a: feasWin[0].toFixed(1), b: feasWin[1].toFixed(1) }), ok: true };
  }, [logKmax, s.threshold, feasWin, t]);

  // ── UI ─────────────────────────────────────────────────────────────────────

  const dbItems = EDTA_METAL_PRESETS.map((p) => ({
    id: p.id,
    label: p.metal,
    detail: `log Kf = ${p.logKf.toFixed(2)}`,
    group: p.group === 'M²⁺' ? t('condicionales.divalentMetals') : t('condicionales.trivalentMetals'),
  }));

  const diagrams = [
    {
      id: 'logk',
      label: t('condicionales.tabLogKPrime'),
      node: (
        <Chart
          data={logKTraces}
          xTitle="pH"
          yTitle="log K'"
          xRange={[PH_MIN, PH_MAX]}
          yRange={[yMin, yMax]}
          shapes={logKShapes}
          exportName="equilibria-cond-logk"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'alpha',
      label: t('condicionales.tabAlphaCoefficients'),
      node: (
        <Chart
          data={alphaTraces}
          xTitle="pH"
          yTitle="log α"
          xRange={[PH_MIN, PH_MAX]}
          exportName="equilibria-cond-alpha"
          exportMetadata={exportMetadata}
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title={t('condicionales.title')} onReset={reset} moduleId="condicionalesedta" guideId="condicionalesedta">
        <PanelSection title={t('condicionales.metalLigandSection')}>
        <ModelBadge
          model={t('condicionales.primaryEquilibrium')}
          additions={[
            s.side.ligandPKas.length > 0 && t('condicionales.additionLigandProtonation'),
            s.side.showOH && t('condicionales.additionMetalHydrolysis'),
            s.side.showAux && t('condicionales.additionAuxLigand'),
            s.side.showComplex && t('condicionales.additionComplexProtonation'),
            s.showMask && t('condicionales.additionMetalCompetition'),
            s.showMulti && t('condicionales.additionMultipleReactions'),
            s.useActivity && t('condicionales.additionActivityCorrected', { i: s.ionicI.toPrecision(2) }),
          ]}
        />
        <LabelField label={t('condicionales.metalMLabel')} value={s.metalLabel} onChange={(v) => set('metalLabel', v)} />
        <Slider
          label="log Kf (M–Y)"
          helpId="logKf"
          value={s.logKf}
          min={1}
          max={30}
          step={0.1}
          onChange={(v) => set('logKf', v)}
          decimals={2}
        />

        <SideReactionEditor
          state={s.side}
          onChange={(side) => set('side', side)}
        />

        <Toggle
          label={t('condicionales.multiReactionsToggle')}
          checked={s.showMulti}
          onChange={(v) => set('showMulti', v)}
        />
        {s.showMulti && (
          <div className="mask-section">
            {s.extraReactions.map((rx, i) => (
              <div key={i} className="repeated-editor-row">
                <LabelField
                  label={t('condicionales.reactionN', { n: i + 2 })}
                  value={rx.label}
                  onChange={(label) => {
                    const next = [...s.extraReactions];
                    next[i] = { ...next[i], label };
                    set('extraReactions', next);
                  }}
                />
                <Slider
                  label="log Kf"
                  helpId="logKf"
                  value={rx.logKf}
                  min={1}
                  max={30}
                  step={0.01}
                  onChange={(logKf) => {
                    const next = [...s.extraReactions];
                    next[i] = { ...next[i], logKf };
                    set('extraReactions', next);
                  }}
                  decimals={2}
                />
                <button type="button"
                  className="preset-chip"
                  onClick={() => set('extraReactions', s.extraReactions.filter((_, j) => j !== i))}
                >
                  {t('condicionales.removeButton')}
                </button>
              </div>
            ))}
            <button type="button"
              className="preset-chip"
              onClick={() => set('extraReactions', [...s.extraReactions, { label: 'M–L₂', logKf: 8 }])}
            >
              {t('condicionales.addReactionButton')}
            </button>
          </div>
        )}

        <Slider
          label={t('condicionales.evalAtPHLabel')}
          value={s.evalPH}
          min={1}
          max={14}
          step={0.1}
          onChange={(v) => set('evalPH', v)}
          decimals={1}
        />
        <ConcSlider
          label={t('condicionales.analyticalConcLabel')}
          helpId="co"
          value={s.co}
          onChange={(v) => set('co', v)}
          min={-4}
          max={0}
        />
        <p className="hint">
          {t('condicionales.pctFormedHint')}
        </p>
        <Slider
          label={t('condicionales.targetPctLabel')}
          value={s.targetPct}
          min={0.01}
          max={99.99}
          step={0.01}
          onChange={(v) => set('targetPct', v)}
          decimals={2}
          unit="%"
        />
        <div className="quick-option-row">
          <button type="button" className="preset-chip" onClick={() => set('targetPct', 0.1)}>
            {t('condicionales.negligibleChip')}
          </button>
          <button type="button" className="preset-chip" onClick={() => set('targetPct', 99.9)}>
            {t('condicionales.maskedChip')}
          </button>
        </div>
        <p className="hint">
          {t('condicionales.targetPctHint', { pct: s.targetPct.toFixed(2) })}
        </p>
        </PanelSection>

        <PanelSection title={t('condicionales.paramsSection')}>
        <div className="control">
          <div className="control-header">
            <span className="control-label">{t('condicionales.thresholdLabel')}</span>
          </div>
          <div className="control-input">
            <Segmented
              compact
              ariaLabel={t('condicionales.thresholdLabel')}
              options={([6, 8, 10] as const).map((th) => ({ value: String(th), label: String(th) }))}
              value={String(s.threshold)}
              onChange={(v) => set('threshold', Number(v) as 6 | 8 | 10)}
            />
          </div>
          <p className="hint">{t('condicionales.thresholdHint')}</p>
        </div>

        <Toggle
          label={t('condicionales.activityToggle')}
          checked={s.useActivity}
          onChange={(v) => set('useActivity', v)}
        />
        {s.useActivity && (
          <div className="mask-section">
            <ConcSlider label={t('complejos.ionicStrengthLabel')} helpId="ionicStrength" value={s.ionicI} onChange={(v) => set('ionicI', v)} min={-3} max={0} />
            <NumberSegmented label={t('complejos.metalChargeLabel')} value={s.zM} options={[1, 2, 3, 4]} onChange={(v) => set('zM', v)} />
            <p className="hint">
              {t('condicionales.activityHint')}
            </p>
          </div>
        )}

        {/* 2nd metal — comparison / masking */}
        <Toggle
          label={t('condicionales.compareSecondMetal')}
          checked={s.showMask}
          onChange={(v) => set('showMask', v)}
        />
        {s.showMask && (
          <div className="mask-section">
            <DbPanel
              items={dbItems}
              onSelect={applyPreset2}
              title={t('condicionales.presetsSecondMetal')}
            />
            <LabelField label={t('condicionales.secondMetalLabel')} value={s.metal2Label} onChange={(v) => set('metal2Label', v)} />
            <Slider
              label={t('condicionales.logKf2Label')}
              value={s.logKf2}
              min={1}
              max={30}
              step={0.1}
              onChange={(v) => set('logKf2', v)}
              decimals={2}
            />
            {feasWin2 && (
              <p className="hint">
                {t('condicionales.secondMetalWindow', { a: feasWin2[0].toFixed(1), b: feasWin2[1].toFixed(1) })}
                {feasWin && (
                  (() => {
                    const overlap = [Math.max(feasWin[0], feasWin2[0]), Math.min(feasWin[1], feasWin2[1])];
                    return overlap[0] < overlap[1]
                      ? t('condicionales.overlapText', { a: overlap[0].toFixed(1), b: overlap[1].toFixed(1) })
                      : t('condicionales.noOverlapText');
                  })()
                )}
              </p>
            )}
          </div>
        )}

        <DbPanel
          items={dbItems}
          onSelect={applyPreset}
          title={t('condicionales.presetsMEDTA')}
        />
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')}>
        <ResultCard items={[
          { label: t('condicionales.optimalPH'), value: pHopt.toFixed(1) },
          { label: t('condicionales.logKmax'), value: logKmax.toFixed(1), helpId: 'logKprime' },
          { label: t('condicionales.logKAtPH', { ph: s.evalPH.toFixed(1) }), value: logKAtEval.toFixed(2), helpId: 'logKprime' },
          { label: t('condicionales.slopeAtPH', { ph: s.evalPH.toFixed(1) }), value: slopeAtEval.toFixed(2) },
          { label: t('condicionales.optimalWindow'), value: feasWin ? `pH ${feasWin[0].toFixed(1)}–${feasWin[1].toFixed(1)}` : t('condicionales.belowThreshold') },
          { label: t('condicionales.pctFormedAtCo', { ph: s.evalPH.toFixed(1) }), value: `${pctFormado.toFixed(1)} %` },
          { label: t('condicionales.phFor10_50_90'), value: `${fmtPH(phForPct.p10)} / ${fmtPH(phForPct.p50)} / ${fmtPH(phForPct.p90)}` },
          { label: t('condicionales.phForPctFormed', { pct: s.targetPct.toFixed(2) }), value: fmtPH(phForTarget) },
          {
            label: t('condicionales.feasibility'),
            value: verdict.text,
          },
        ]} />
        </PanelSection>

        <InfoBox title={t('condicionales.infoBoxTitle')}>
          <p>
            {t('condicionales.para1Prefix')}<strong>{t('condicionales.para1Bold')}</strong>{t('condicionales.para1Rest')}
            <code>{t('condicionales.para1Code')}</code>.
          </p>
          <p>
            <strong>{t('condicionales.para2AlphaYBold')}</strong>{t('condicionales.para2AlphaYRest')}{' '}
            <strong>{t('condicionales.para2AlphaMBold')}</strong>{t('condicionales.para2AlphaMRest')}
            <em>{t('condicionales.para2BellEm')}</em>{t('condicionales.para2BellRest')}
          </p>
          <p>
            {t('condicionales.para3Prefix')}<strong>{t('condicionales.para3BandBold')}</strong>{t('condicionales.para3BandRest')}
            <strong>{t('condicionales.para3ThresholdBold')}</strong>{t('condicionales.para3ThresholdRest')}
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="logk" />
        <ResultCardRow items={[
          { label: t('condicionales.pctFormedAtCoShort'), value: `${pctFormado.toFixed(1)} %`, accent: true },
          { label: t('condicionales.ph50'), value: fmtPH(phForPct.p50) },
          { label: t('condicionales.optimalPH'), value: pHopt.toFixed(1) },
          { label: t('condicionales.logKmax'), value: logKmax.toFixed(1), helpId: 'logKprime' },
          { label: t('condicionales.logKAtPHShort', { ph: s.evalPH.toFixed(1) }), value: logKAtEval.toFixed(1), helpId: 'logKprime' },
        ]} />
      </section>
    </div>
  );
}
