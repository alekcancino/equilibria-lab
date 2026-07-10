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
  Slider, ConcSlider, DbPanel, InfoBox, LabelField, ModelBadge, NumberSegmented, PanelSection, ResultCard, ResultCardRow, Toggle,
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
        name: 'log α_Y(H) — protonación',
        line: { width: 2.5, color: C_ALPHA_H },
        hovertemplate: `log α_Y(H) = %{y:.2f}<extra>α_Y(H)</extra>`,
      },
    ];
    if (s.side.showOH && s.side.logBetasOH.length > 0) {
      traces.push({
        x: curve1.pHs, y: curve1.logAlphaOH, type: 'scatter', mode: 'lines',
        name: 'log α_M(OH) — hidrólisis',
        line: { width: 2.5, color: C_ALPHA_OH },
        hovertemplate: `log α_M(OH) = %{y:.2f}<extra>α_M(OH)</extra>`,
      });
    }
    if (s.side.showAux && s.side.logBetasAux.length > 0) {
      traces.push({
        x: curve1.pHs, y: curve1.logAlphaL, type: 'scatter', mode: 'lines',
        name: `log α_M(${s.side.auxLabel}) — aux`,
        line: { width: 2.5, color: C_ALPHA_L },
        hovertemplate: `log α_M(L) = %{y:.2f}<extra>α_M(${s.side.auxLabel})</extra>`,
      });
    }
    if (s.side.showComplex) {
      traces.push({
        x: curve1.pHs, y: curve1.logAlphaComplex, type: 'scatter', mode: 'lines',
        name: 'log α_MY — complejo',
        line: { width: 2.5, color: C_ALPHA_CX },
        hovertemplate: `log α_MY = %{y:.2f}<extra>α_MY</extra>`,
      });
    }
    return traces;
  }, [curve1, s.side]);

  // ── Veredicto ──────────────────────────────────────────────────────────────

  const verdict = useMemo(() => {
    if (logKmax < s.threshold) return { text: 'No factible al umbral elegido', ok: false };
    if (!feasWin) return { text: 'Factible pero ventana muy estrecha', ok: false };
    const width = feasWin[1] - feasWin[0];
    if (width < 0.5) return { text: `Ventana muy estrecha (${width.toFixed(1)} unid. pH)`, ok: false };
    return { text: `Factible ✓ · pH ${feasWin[0].toFixed(1)}–${feasWin[1].toFixed(1)}`, ok: true };
  }, [logKmax, s.threshold, feasWin]);

  // ── UI ─────────────────────────────────────────────────────────────────────

  const dbItems = EDTA_METAL_PRESETS.map((p) => ({
    id: p.id,
    label: p.metal,
    detail: `log Kf = ${p.logKf.toFixed(2)}`,
    group: p.group === 'M²⁺' ? 'Metales bivalentes' : 'Metales trivalentes',
  }));

  const diagrams = [
    {
      id: 'logk',
      label: "log K′ = f(pH)",
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
      label: 'Coeficientes α',
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
      <PanelShell title="Constantes condicionales" onReset={reset} moduleId="condicionalesedta">
        <PanelSection title="Metal y ligando" icon="⚛">
        <ModelBadge
          model="equilibrio principal M–Y"
          additions={[
            s.side.ligandPKas.length > 0 && 'protonación del ligando',
            s.side.showOH && 'hidrólisis del metal',
            s.side.showAux && 'ligando auxiliar',
            s.side.showComplex && 'protonación del complejo',
            s.showMask && 'competencia entre metales',
            s.showMulti && 'varias reacciones principales',
            s.useActivity && `K′f corregida a I = ${s.ionicI.toPrecision(2)} M`,
          ]}
        />
        <LabelField label="Metal (M)" value={s.metalLabel} onChange={(v) => set('metalLabel', v)} />
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
          label="Varias reacciones principales (NiGly₁,₂,₃…)"
          checked={s.showMulti}
          onChange={(v) => set('showMulti', v)}
        />
        {s.showMulti && (
          <div className="mask-section">
            {s.extraReactions.map((rx, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <LabelField
                  label={`Reacción ${i + 2}`}
                  value={rx.label}
                  onChange={(label) => {
                    const next = [...s.extraReactions];
                    next[i] = { ...next[i], label };
                    set('extraReactions', next);
                  }}
                />
                <Slider
                  label="log Kf"
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
                <button
                  className="preset-chip"
                  onClick={() => set('extraReactions', s.extraReactions.filter((_, j) => j !== i))}
                >
                  Quitar
                </button>
              </div>
            ))}
            <button
              className="preset-chip"
              onClick={() => set('extraReactions', [...s.extraReactions, { label: 'M–L₂', logKf: 8 }])}
            >
              + reacción principal
            </button>
          </div>
        )}

        <Slider
          label="Evaluar log K′ en pH"
          value={s.evalPH}
          min={1}
          max={14}
          step={0.1}
          onChange={(v) => set('evalPH', v)}
          decimals={1}
        />
        <ConcSlider
          label="Concentración del complejante Co (exceso)"
          helpId="co"
          value={s.co}
          onChange={(v) => set('co', v)}
          min={-4}
          max={0}
        />
        <p className="hint">
          % formado a Co: fracción del metal complejada con el ligando en exceso;
          pH 10/50/90 % marcan la ventana de la reacción.
        </p>
        <Slider
          label="% formado objetivo (enmascaramiento)"
          value={s.targetPct}
          min={0.01}
          max={99.99}
          step={0.01}
          onChange={(v) => set('targetPct', v)}
          decimals={2}
          unit="%"
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <button className="preset-chip" onClick={() => set('targetPct', 0.1)}>
            0.1 % (reacción despreciable)
          </button>
          <button className="preset-chip" onClick={() => set('targetPct', 99.9)}>
            99.9 % (enmascarado)
          </button>
        </div>
        <p className="hint">
          ¿A qué pH el metal queda {s.targetPct.toFixed(2)} % formado con el ligando en exceso?
          — pregunta estándar de enmascaramiento selectivo.
        </p>
        </PanelSection>

        <PanelSection title="Parámetros" icon="⚙">
        <div className="control">
          <div className="control-header">
            <span className="control-label">Umbral de cuantitatividad</span>
            <span className="control-value">{s.threshold}</span>
          </div>
          <div className="segmented" style={{ marginTop: 6 }}>
            {([6, 8, 10] as const).map((t) => (
              <button
                key={t}
                className={s.threshold === t ? 'seg-btn active' : 'seg-btn'}
                onClick={() => set('threshold', t)}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="hint">6 = reacción cuantitativa · 8 = titulación nítida (0.01 M)</p>
        </div>

        <Toggle
          label="Corrección de actividad (K′f a I > 0)"
          checked={s.useActivity}
          onChange={(v) => set('useActivity', v)}
        />
        {s.useActivity && (
          <div className="mask-section">
            <ConcSlider label="Fuerza iónica I" helpId="ionicStrength" value={s.ionicI} onChange={(v) => set('ionicI', v)} min={-3} max={0} />
            <NumberSegmented label="Carga del metal (zM)" value={s.zM} options={[1, 2, 3, 4]} onChange={(v) => set('zM', v)} />
            <p className="hint">
              log K′f = log Kf + log γ_M + log γ_Y − log γ(MY), con Y⁴⁻ (zY = −4) y
              z(MY) = zM − 4 (Debye–Hückel extendida, a = 3 Å). La misma corrección se
              aplica a todos los metales mostrados (se asume la misma zM).
            </p>
          </div>
        )}

        {/* 2nd metal — comparison / masking */}
        <Toggle
          label="Comparar con 2.º metal"
          checked={s.showMask}
          onChange={(v) => set('showMask', v)}
        />
        {s.showMask && (
          <div className="mask-section">
            <DbPanel
              items={dbItems}
              onSelect={applyPreset2}
              title="Presets 2.º metal"
            />
            <LabelField label="2.º metal" value={s.metal2Label} onChange={(v) => set('metal2Label', v)} />
            <Slider
              label="log Kf (2.º metal–EDTA)"
              value={s.logKf2}
              min={1}
              max={30}
              step={0.1}
              onChange={(v) => set('logKf2', v)}
              decimals={2}
            />
            {feasWin2 && (
              <p className="hint">
                2.º metal: pH {feasWin2[0].toFixed(1)}–{feasWin2[1].toFixed(1)}
                {feasWin && (
                  (() => {
                    const overlap = [Math.max(feasWin[0], feasWin2[0]), Math.min(feasWin[1], feasWin2[1])];
                    return overlap[0] < overlap[1]
                      ? ` · Solapan en pH ${overlap[0].toFixed(1)}–${overlap[1].toFixed(1)}`
                      : ' · Sin solapamiento → separación selectiva posible';
                  })()
                )}
              </p>
            )}
          </div>
        )}

        <DbPanel
          items={dbItems}
          onSelect={applyPreset}
          title="Presets M–EDTA"
        />
        </PanelSection>

        <PanelSection title="Resultado" icon="∑">
        <ResultCard items={[
          { label: 'pH óptimo', value: pHopt.toFixed(1) },
          { label: 'log K\'máx', value: logKmax.toFixed(1), helpId: 'logKprime' },
          { label: `log K′ a pH ${s.evalPH.toFixed(1)}`, value: logKAtEval.toFixed(2), helpId: 'logKprime' },
          { label: `pendiente d(log K′)/dpH a pH ${s.evalPH.toFixed(1)}`, value: slopeAtEval.toFixed(2) },
          { label: 'Ventana óptima', value: feasWin ? `pH ${feasWin[0].toFixed(1)}–${feasWin[1].toFixed(1)}` : 'No supera el umbral' },
          { label: `% formado a Co (pH ${s.evalPH.toFixed(1)})`, value: `${pctFormado.toFixed(1)} %` },
          { label: 'pH para 10 / 50 / 90 %', value: `${fmtPH(phForPct.p10)} / ${fmtPH(phForPct.p50)} / ${fmtPH(phForPct.p90)}` },
          { label: `pH para ${s.targetPct.toFixed(2)} % formado`, value: fmtPH(phForTarget) },
          {
            label: 'Factibilidad',
            value: verdict.text,
          },
        ]} />
        </PanelSection>

        <InfoBox title="Constante condicional de Ringbom">
          <p>
            Las <strong>reacciones parásitas</strong> (secundarias) consumen metal o ligando,
            reduciendo la constante efectiva: <code>log K' = log K − log α_M − log α_Y</code>.
          </p>
          <p>
            <strong>α_Y(H)</strong>: a pH bajo el EDTA se protona (H₄Y, H₃Y⁻…) y queda menos
            Y⁴⁻ libre → K' cae. <strong>α_M(OH)</strong>: a pH alto el metal hidroliza → K' también cae.
            La <em>campana</em> es el resultado de ambos efectos opuestos.
          </p>
          <p>
            La <strong>banda azul</strong> marca la ventana donde log K' ≥ umbral; la línea naranja
            punteada es el umbral. <strong>log K' ≥ 8</strong> garantiza una titulación nítida
            a concentración típica (0.01 M).
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="logk" />
        <ResultCardRow items={[
          { label: `% formado a Co`, value: `${pctFormado.toFixed(1)} %`, accent: true },
          { label: 'pH 50 %', value: fmtPH(phForPct.p50) },
          { label: 'pH óptimo', value: pHopt.toFixed(1) },
          { label: "log K′máx", value: logKmax.toFixed(1), helpId: 'logKprime' },
          { label: `log K′ pH ${s.evalPH.toFixed(1)}`, value: logKAtEval.toFixed(1), helpId: 'logKprime' },
        ]} />
      </section>
    </div>
  );
}
