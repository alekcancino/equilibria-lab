// Módulo de Constantes Condicionales (Ringbom).
// Genera la curva log K' = f(pH) y los coeficientes α para sistemas M + Y (EDTA por defecto).
// Cubre QA II.2 + QA III.1 completos.

import { useMemo, useState } from 'react';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  Slider, DbPanel, InfoBox, LabelField, ModelBadge, PanelSection, ResultCard, ResultCardRow, Toggle,
} from '../components/Controls';
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
  };
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
  const [s, setS] = useState<CondState>(defaultState);

  const set = <K extends keyof CondState>(k: K, v: CondState[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

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

  const stack = useMemo(() => sideStackFromEditor(s.side), [s.side]);

  const curve1 = useMemo(() =>
    condLogKCurveFromStack(s.logKf, stack, [PH_MIN, PH_MAX], PH_POINTS),
    [s.logKf, stack],
  );

  const multiCurves = useMemo(() => {
    if (!s.showMulti || s.extraReactions.length === 0) return null;
    const reactions = [{ label: s.metalLabel, logKf: s.logKf }, ...s.extraReactions];
    return condLogKCurveMulti(reactions, stack, [PH_MIN, PH_MAX], PH_POINTS);
  }, [s.showMulti, s.extraReactions, s.metalLabel, s.logKf, stack]);

  const curve2 = useMemo(() =>
    s.showMask
      ? condLogKCurveFromStack(
          s.logKf2,
          { ligandPKas: [...s.side.ligandPKas], hydrolysis: s.logBetasOH2.length ? { logBetasOH: s.logBetasOH2 } : undefined },
          [PH_MIN, PH_MAX],
          PH_POINTS,
        )
      : null,
    [s.showMask, s.logKf2, s.side.ligandPKas, s.logBetasOH2],
  );

  const logKAtEval = useMemo(
    () => condLogKPrimary(s.logKf, s.evalPH, stack),
    [s.logKf, s.evalPH, stack],
  );

  /** Pendiente local d(log K′)/dpH en el pH de evaluación (tramo lineal, Ord-2). */
  const slopeAtEval = useMemo(() => {
    const h = 0.25;
    const lo = condLogKPrimary(s.logKf, Math.max(PH_MIN, s.evalPH - h), stack);
    const hi = condLogKPrimary(s.logKf, Math.min(PH_MAX, s.evalPH + h), stack);
    return (hi - lo) / (2 * h);
  }, [s.logKf, s.evalPH, stack]);

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
          name: `log K'(${c.label})`,
          line: { width: i === 0 ? 3 : 2, color: i === 0 ? C_PRIMARY : C_MASK, dash: i === 0 ? undefined : 'dot' },
          hovertemplate: `log K' = %{y:.2f}<extra>${c.label}</extra>`,
        });
      });
    } else {
      traces.push({
        x: curve1.pHs, y: curve1.logKs, type: 'scatter', mode: 'lines',
        name: `log K'(${s.metalLabel}–EDTA)`,
        line: { width: 3, color: C_PRIMARY },
        hovertemplate: `log K' = %{y:.2f}<extra>${s.metalLabel}</extra>`,
      });
    }
    if (curve2) {
      traces.push({
        x: curve2.pHs, y: curve2.logKs, type: 'scatter', mode: 'lines',
        name: `log K'(${s.metal2Label}–EDTA)`,
        line: { width: 2.5, color: C_MASK, dash: 'dot' },
        hovertemplate: `log K' = %{y:.2f}<extra>${s.metal2Label}</extra>`,
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
      label: "log K' = f(pH)",
      node: (
        <Chart
          data={logKTraces}
          xTitle="pH"
          yTitle="log K'"
          xRange={[PH_MIN, PH_MAX]}
          yRange={[yMin, yMax]}
          shapes={logKShapes}
          exportName="equilibria-cond-logk"
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
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title="Constantes condicionales" onReset={reset}>
        <PanelSection title="Metal y ligante" icon="⚛">
        <ModelBadge
          model="equilibrio principal M–Y"
          additions={[
            s.side.ligandPKas.length > 0 && 'protonación del ligante',
            s.side.showOH && 'hidrólisis del metal',
            s.side.showAux && 'ligando auxiliar',
            s.side.showComplex && 'protonación del complejo',
            s.showMask && 'competencia entre metales',
            s.showMulti && 'varias reacciones principales',
          ]}
        />
        <LabelField label="Metal (M)" value={s.metalLabel} onChange={(v) => set('metalLabel', v)} />
        <Slider
          label="log Kf (M–Y)"
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

        {/* 2.º metal — comparación / enmascaramiento */}
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
          { label: 'log K\'máx', value: logKmax.toFixed(1) },
          { label: `log K′ a pH ${s.evalPH.toFixed(1)}`, value: logKAtEval.toFixed(2) },
          { label: `pendiente d(log K′)/dpH a pH ${s.evalPH.toFixed(1)}`, value: slopeAtEval.toFixed(2) },
          { label: 'Ventana óptima', value: feasWin ? `pH ${feasWin[0].toFixed(1)}–${feasWin[1].toFixed(1)}` : 'No supera el umbral' },
          {
            label: 'Factibilidad',
            value: verdict.text,
          },
        ]} />
        </PanelSection>

        <InfoBox title="Constante condicional de Ringbom">
          <p>
            Las <strong>reacciones parásitas</strong> (secundarias) consumen metal o ligante,
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
          { label: 'pH óptimo', value: pHopt.toFixed(1), accent: true },
          { label: "log K′máx", value: logKmax.toFixed(1) },
          { label: `log K′ pH ${s.evalPH.toFixed(1)}`, value: logKAtEval.toFixed(1) },
        ]} />
      </section>
    </div>
  );
}
