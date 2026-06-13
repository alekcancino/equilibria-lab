// Módulo de Constantes Condicionales (Ringbom).
// Genera la curva log K' = f(pH) y los coeficientes α para sistemas M + Y (EDTA por defecto).
// Cubre QA II.2 + QA III.1 completos.

import { useMemo, useState } from 'react';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import DiagramTabs from '../components/DiagramTabs';
import {
  Slider, ConstantList, ConcSlider, DbPanel, InfoBox, LabelField, ModelBadge, ResultCard, Toggle,
} from '../components/Controls';
import { condLogKCurve, feasibilityWindow } from '../lib/conditional';
import { COMPLEX_PRESETS } from '../lib/complexDatabase';

// ── Base de datos de complejos M–EDTA ───────────────────────────────────────

interface EdtaPreset {
  id: string;
  metal: string;
  logKf: number;
  /** log β globales de los hidroxocomplejos M(OH)₁, M(OH)₂, ... */
  logBetasOH: number[];
  group: string;
}

const EDTA_PRESETS: EdtaPreset[] = [
  // Metales bivalentes — Harris QCA 9.ª ed., Skoog Anal. Chem. 9.ª ed.
  { id: 'ca', metal: 'Ca²⁺', logKf: 10.65, logBetasOH: [], group: 'M²⁺' },
  { id: 'mg', metal: 'Mg²⁺', logKf: 8.64,  logBetasOH: [], group: 'M²⁺' },
  { id: 'mn', metal: 'Mn²⁺', logKf: 13.81, logBetasOH: [3.4], group: 'M²⁺' },
  { id: 'zn', metal: 'Zn²⁺', logKf: 16.50, logBetasOH: [5.04, 10.43, 13.7, 15.2], group: 'M²⁺' },
  { id: 'cu', metal: 'Cu²⁺', logKf: 18.80, logBetasOH: [6.0, 11.8], group: 'M²⁺' },
  { id: 'ni', metal: 'Ni²⁺', logKf: 18.56, logBetasOH: [4.97, 8.55], group: 'M²⁺' },
  { id: 'pb', metal: 'Pb²⁺', logKf: 18.04, logBetasOH: [6.29, 10.89], group: 'M²⁺' },
  { id: 'hg', metal: 'Hg²⁺', logKf: 21.70, logBetasOH: [10.60], group: 'M²⁺' },
  // Metales trivalentes
  { id: 'fe3', metal: 'Fe³⁺', logKf: 25.10, logBetasOH: [11.81, 21.68, 30.67], group: 'M³⁺' },
  { id: 'al',  metal: 'Al³⁺', logKf: 16.13, logBetasOH: [9.01, 17.09, 23.40, 27.68], group: 'M³⁺' },
  { id: 'ga',  metal: 'Ga³⁺', logKf: 20.27, logBetasOH: [11.4, 22.1, 30.7], group: 'M³⁺' },
];

// ── Estado ───────────────────────────────────────────────────────────────────

interface CondState {
  metalLabel: string;
  logKf: number;
  pKasY: number[];
  logBetasOH: number[];
  showOH: boolean;
  showAux: boolean;
  auxLabel: string;
  logBetasAux: number[];
  cAux: number;
  showMask: boolean;
  metal2Label: string;
  logKf2: number;
  logBetasOH2: number[];
  threshold: number;
}

function defaultState(): CondState {
  return {
    metalLabel: 'M',
    logKf: 10,
    pKasY: [],
    logBetasOH: [],
    showOH: false,
    showAux: false,
    auxLabel: 'NH₃',
    logBetasAux: [4.04, 7.47, 10.27, 12.03],
    cAux: 0.01,
    showMask: false,
    metal2Label: 'Mg²⁺',
    logKf2: 8.64,
    logBetasOH2: [],
    threshold: 8,
  };
}

// ── Colores ──────────────────────────────────────────────────────────────────

const C_PRIMARY  = '#0072B2'; // azul — metal principal
const C_MASK     = '#D55E00'; // naranja — 2.º metal / enmascarante
const C_ALPHA_H  = '#CC79A7'; // rosa — α_Y(H)
const C_ALPHA_OH = '#009E73'; // verde — α_M(OH)
const C_ALPHA_L  = '#E69F00'; // ámbar — α_M(L)
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
    const p = EDTA_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setS((prev) => ({
      ...prev,
      metalLabel: p.metal,
      logKf: p.logKf,
      logBetasOH: [...p.logBetasOH],
      showOH: p.logBetasOH.length > 0,
    }));
  }

  function applyPreset2(id: string) {
    const p = EDTA_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setS((prev) => ({
      ...prev,
      metal2Label: p.metal,
      logKf2: p.logKf,
      logBetasOH2: [...p.logBetasOH],
    }));
  }

  // ── Curvas ─────────────────────────────────────────────────────────────────

  const curve1 = useMemo(() =>
    condLogKCurve(
      s.logKf,
      s.pKasY,
      s.showOH ? s.logBetasOH : [],
      s.showAux ? s.logBetasAux : [],
      s.showAux ? s.cAux : 0,
      [PH_MIN, PH_MAX],
      PH_POINTS,
    ),
    [s.logKf, s.pKasY, s.logBetasOH, s.showOH, s.logBetasAux, s.cAux, s.showAux],
  );

  const curve2 = useMemo(() =>
    s.showMask
      ? condLogKCurve(
          s.logKf2,
          s.pKasY,
          s.logBetasOH2,
          [],
          0,
          [PH_MIN, PH_MAX],
          PH_POINTS,
        )
      : null,
    [s.showMask, s.logKf2, s.pKasY, s.logBetasOH2],
  );

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
        // @ts-ignore — layer es válido en Plotly pero no siempre tipado
        layer: 'below',
      });
    }
    return out;
  }, [s.threshold, feasWin, yMin, yMax]);

  // ── Trazas diagrama log K' ─────────────────────────────────────────────────

  const logKTraces = useMemo<Data[]>(() => {
    const traces: Data[] = [
      {
        x: curve1.pHs, y: curve1.logKs, type: 'scatter', mode: 'lines',
        name: `log K'(${s.metalLabel}–EDTA)`,
        line: { width: 3, color: C_PRIMARY },
        hovertemplate: `log K' = %{y:.2f}<extra>${s.metalLabel}</extra>`,
      },
    ];
    if (curve2) {
      traces.push({
        x: curve2.pHs, y: curve2.logKs, type: 'scatter', mode: 'lines',
        name: `log K'(${s.metal2Label}–EDTA)`,
        line: { width: 2.5, color: C_MASK, dash: 'dot' },
        hovertemplate: `log K' = %{y:.2f}<extra>${s.metal2Label}</extra>`,
      });
    }
    return traces;
  }, [curve1, curve2, s.metalLabel, s.metal2Label]);

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
    if (s.showOH && s.logBetasOH.length > 0) {
      traces.push({
        x: curve1.pHs, y: curve1.logAlphaOH, type: 'scatter', mode: 'lines',
        name: 'log α_M(OH) — hidrólisis',
        line: { width: 2.5, color: C_ALPHA_OH },
        hovertemplate: `log α_M(OH) = %{y:.2f}<extra>α_M(OH)</extra>`,
      });
    }
    if (s.showAux && s.logBetasAux.length > 0) {
      traces.push({
        x: curve1.pHs, y: curve1.logAlphaL, type: 'scatter', mode: 'lines',
        name: `log α_M(${s.auxLabel}) — aux`,
        line: { width: 2.5, color: C_ALPHA_L },
        hovertemplate: `log α_M(L) = %{y:.2f}<extra>α_M(${s.auxLabel})</extra>`,
      });
    }
    return traces;
  }, [curve1, s.showOH, s.logBetasOH, s.showAux, s.logBetasAux, s.auxLabel]);

  // ── Veredicto ──────────────────────────────────────────────────────────────

  const verdict = useMemo(() => {
    if (logKmax < s.threshold) return { text: 'No factible al umbral elegido', ok: false };
    if (!feasWin) return { text: 'Factible pero ventana muy estrecha', ok: false };
    const width = feasWin[1] - feasWin[0];
    if (width < 0.5) return { text: `Ventana muy estrecha (${width.toFixed(1)} unid. pH)`, ok: false };
    return { text: `Factible ✓ · pH ${feasWin[0].toFixed(1)}–${feasWin[1].toFixed(1)}`, ok: true };
  }, [logKmax, s.threshold, feasWin]);

  // ── UI ─────────────────────────────────────────────────────────────────────

  const dbItems = EDTA_PRESETS.map((p) => ({
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
          exportName="quimeq-cond-logk"
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
          exportName="quimeq-cond-alpha"
        />
      ),
    },
  ];

  return (
    <div className="module">
      <aside className="panel">
        <div className="panel-header">
          <h2>Constantes condicionales</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>

        {/* Selector de metal desde DB */}
        <DbPanel
          items={dbItems}
          onSelect={applyPreset}
          title="Presets M–EDTA"
        />

        <h3>Metal y ligante</h3>
        <ModelBadge
          model="equilibrio principal M–Y"
          additions={[
            s.pKasY.length > 0 && 'protonación del ligante',
            s.showOH && 'hidrólisis del metal',
            s.showAux && 'ligando auxiliar',
            s.showMask && 'competencia entre metales',
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

        <details className="section-collapse">
          <summary className="section-collapse-title">pKas del ligante Y (EDTA por defecto)</summary>
          <ConstantList
            prefix="pKa"
            values={s.pKasY}
            onChange={(v) => set('pKasY', v)}
            min={0}
            max={14}
            maxItems={8}
            minItems={0}
            initialValue={4.76}
          />
        </details>

        {/* Hidrólisis del metal */}
        <details className="section-collapse" open={s.showOH} onToggle={(e) => set('showOH', (e.target as HTMLDetailsElement).open)}>
          <summary className="section-collapse-title">Hidrólisis del metal α_M(OH)</summary>
          <ConstantList
            prefix="log β(OH)"
            values={s.logBetasOH}
            onChange={(v) => {
              set('logBetasOH', v);
              if (!s.showOH) set('showOH', true);
            }}
            min={0}
            max={40}
            maxItems={6}
            minItems={0}
            initialValue={5}
          />
        </details>

        {/* Ligando auxiliar */}
        <details className="section-collapse" open={s.showAux} onToggle={(e) => set('showAux', (e.target as HTMLDetailsElement).open)}>
          <summary className="section-collapse-title">Ligando auxiliar α_M(L)</summary>
          <p className="hint" style={{ marginBottom: 6 }}>Presets (metal + ligando):</p>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {COMPLEX_PRESETS.map((cp) => (
              <button
                key={cp.id}
                className="preset-chip"
                title={`log β: [${cp.logBetas.join(', ')}]`}
                onClick={() => {
                  setS((prev) => ({
                    ...prev,
                    auxLabel: cp.ligandLabel,
                    logBetasAux: [...cp.logBetas],
                    showAux: true,
                  }));
                }}
              >
                {cp.metalLabel}/{cp.ligandLabel}
              </button>
            ))}
          </div>
          <LabelField label="Ligando auxiliar" value={s.auxLabel} onChange={(v) => set('auxLabel', v)} />
          <ConstantList
            prefix="log β"
            values={s.logBetasAux}
            onChange={(v) => set('logBetasAux', v)}
            min={0}
            max={25}
            maxItems={6}
          />
          <ConcSlider label="[L] libre" value={s.cAux} onChange={(v) => set('cAux', v)} />
        </details>

        <h3>Parámetros</h3>
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

        {/* Resultado */}
        <ResultCard items={[
          { label: 'pH óptimo', value: pHopt.toFixed(1) },
          { label: 'log K\'máx', value: logKmax.toFixed(1) },
          { label: 'Ventana óptima', value: feasWin ? `pH ${feasWin[0].toFixed(1)}–${feasWin[1].toFixed(1)}` : 'No supera el umbral' },
          {
            label: 'Factibilidad',
            value: verdict.text,
          },
        ]} />

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
      </aside>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="logk" />
      </section>
    </div>
  );
}
