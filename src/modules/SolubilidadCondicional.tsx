// Conditional solubility of metal hydroxides.
// Core use case: selective separation (precipitate M1 while M2 stays in solution).
// Covers QA II.5 + QA III.2.

import { useMemo, useState } from 'react';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  Slider, ConstantList, ConcSlider, DbPanel, Disclosure, InfoBox, LabelField,
  ModelBadge, PanelSection, ResultCard, ResultCardRow, Toggle,
} from '../components/Controls';
import { SideReactionEditor } from '../components/Editors';
import { alphaOH, hydroxideSolCurve, precipitationPH } from '../lib/conditional';
import {
  defaultSideEditorState,
  hydroxideSolCurveMasked,
  logSThresholdFromConcentration,
  precipitationPHMasked,
  sideStackFromEditor,
  type SideReactionEditorState,
} from '../lib/sideReactions';
import { solubilityPXCurve } from '../lib/solubility';

// ── Metal hydroxide database ──────────────────────────────────────────────────

interface OHPreset {
  id: string;
  metal: string;
  formula: string;
  n: number;         // OH⁻ stoichiometry
  pKsp: number;
  /** global log β values for soluble hydroxo complexes M(OH)_i */
  logBetasOH: number[];
  group: string;
}

const OH_PRESETS: OHPreset[] = [
  // Trivalent — precipitate at acidic pH
  { id: 'fe3oh', metal: 'Fe³⁺', formula: 'Fe(OH)₃', n: 3, pKsp: 38.7, logBetasOH: [11.81, 21.68, 30.67], group: 'M³⁺ (precipitan a pH ácido)' },
  { id: 'al',    metal: 'Al³⁺', formula: 'Al(OH)₃', n: 3, pKsp: 32.9, logBetasOH: [9.01, 17.09, 23.40, 27.68], group: 'M³⁺ (precipitan a pH ácido)' },
  { id: 'cr3oh', metal: 'Cr³⁺', formula: 'Cr(OH)₃', n: 3, pKsp: 30.2, logBetasOH: [10.1, 17.8, 24.6, 27.1], group: 'M³⁺ (precipitan a pH ácido)' },
  { id: 'la',    metal: 'La³⁺', formula: 'La(OH)₃', n: 3, pKsp: 20.7, logBetasOH: [], group: 'M³⁺ (precipitan a pH ácido)' },
  // Bivalent — precipitate at intermediate pH
  { id: 'cu2oh', metal: 'Cu²⁺', formula: 'Cu(OH)₂', n: 2, pKsp: 19.7, logBetasOH: [6.0, 11.8], group: 'M²⁺ (precipitan a pH intermedio)' },
  { id: 'pb2oh', metal: 'Pb²⁺', formula: 'Pb(OH)₂', n: 2, pKsp: 20.0, logBetasOH: [6.29, 10.89, 13.94], group: 'M²⁺ (precipitan a pH intermedio)' },
  { id: 'zn2oh', metal: 'Zn²⁺', formula: 'Zn(OH)₂', n: 2, pKsp: 16.2, logBetasOH: [5.04, 10.43, 13.7, 15.2], group: 'M²⁺ (precipitan a pH intermedio)' },
  { id: 'ni2oh', metal: 'Ni²⁺', formula: 'Ni(OH)₂', n: 2, pKsp: 15.2, logBetasOH: [4.97, 8.55], group: 'M²⁺ (precipitan a pH intermedio)' },
  { id: 'co2oh', metal: 'Co²⁺', formula: 'Co(OH)₂', n: 2, pKsp: 14.9, logBetasOH: [4.35, 8.4], group: 'M²⁺ (precipitan a pH intermedio)' },
  { id: 'fe2oh', metal: 'Fe²⁺', formula: 'Fe(OH)₂', n: 2, pKsp: 15.1, logBetasOH: [4.5, 7.4], group: 'M²⁺ (precipitan a pH intermedio)' },
  { id: 'cd2oh', metal: 'Cd²⁺', formula: 'Cd(OH)₂', n: 2, pKsp: 14.4, logBetasOH: [3.9, 7.7], group: 'M²⁺ (precipitan a pH intermedio)' },
  { id: 'mn2oh', metal: 'Mn²⁺', formula: 'Mn(OH)₂', n: 2, pKsp: 12.7, logBetasOH: [3.4, 6.2], group: 'M²⁺ (precipitan a pH intermedio)' },
  // Alkaline earth — precipitate at basic pH
  { id: 'mg2oh', metal: 'Mg²⁺', formula: 'Mg(OH)₂', n: 2, pKsp: 11.2, logBetasOH: [2.6], group: 'M²⁺ más solubles' },
  { id: 'ca2oh', metal: 'Ca²⁺', formula: 'Ca(OH)₂', n: 2, pKsp: 4.7,  logBetasOH: [], group: 'M²⁺ más solubles' },
];

// ── State ──────────────────────────────────────────────────────────────────────

interface MetalState {
  label: string;
  formula: string;
  n: number;
  pKsp: number;
  logBetasOH: number[];
}

function fromPreset(id: string): MetalState {
  const p = OH_PRESETS.find((x) => x.id === id)!;
  return { label: p.metal, formula: p.formula, n: p.n, pKsp: p.pKsp, logBetasOH: [...p.logBetasOH] };
}

interface State {
  m1: MetalState;
  m2: MetalState;
  showM2: boolean;
  logSThreshold: number;
  operatingPH: number;
  showPX: boolean;
  ligandX: string;
  logBetasX: number[];
  pHForPX: number;
  showSideMask: boolean;
  side: SideReactionEditorState;
  useCThreshold: boolean;
  cAnalytic: number;
  hydroxoOpen: boolean;
}

// ── Presets anfóteros (spec issue #4 · C4) ───────────────────────────────────
// Cargan pKsp + log β_OH del hidroxo-complejo aniónico y EXPANDEN la sección
// "Complejos hidroxo de M1" para que la curva U se vea sin abrir nada a mano.
interface AnfoteroPreset { id: string; label: string; metal: MetalState; }
const ANFOTERO_PRESETS: AnfoteroPreset[] = [
  { id: 'zn', label: 'Zn(OH)₂', metal: { label: 'Zn²⁺', formula: 'Zn(OH)₂', n: 2, pKsp: 16.2, logBetasOH: [5.04, 10.43, 13.7, 15.2] } },
  { id: 'al', label: 'Al(OH)₃', metal: { label: 'Al³⁺', formula: 'Al(OH)₃', n: 3, pKsp: 32.9, logBetasOH: [9.01, 17.09, 23.40, 27.68] } },
  // Pb(OH)₂ del examen QAIII: pKs=15.17, logβ_OH = [6.2, 10.3, 13.3] (n=1,2,3).
  { id: 'pb', label: 'Pb(OH)₂', metal: { label: 'Pb²⁺', formula: 'Pb(OH)₂', n: 2, pKsp: 15.17, logBetasOH: [6.2, 10.3, 13.3] } },
];

function defaultState(): State {
  return {
    m1: { label: 'M²⁺', formula: 'M(OH)₂', n: 2, pKsp: 15, logBetasOH: [] },
    m2: fromPreset('ni2oh'),
    showM2: false,
    logSThreshold: -5,
    operatingPH: 9,
    showPX: false,
    ligandX: 'NH₃',
    logBetasX: [4.04, 7.47, 10.27],
    pHForPX: 10,
    showSideMask: false,
    side: defaultSideEditorState(),
    useCThreshold: false,
    cAnalytic: 0.01,
    hydroxoOpen: false,
  };
}

// ── Colors ────────────────────────────────────────────────────────────────────

const C1 = '#0072B2';               // blue — metal 1
const C2 = '#D55E00';
const C_WIN = 'rgba(39,174,96,0.12)'; // selective window (soft green)
const C_THRESH = 'rgba(127,140,141,0.9)'; // threshold line


// ── Component ─────────────────────────────────────────────────────────────────

export default function SolubilidadCondicional() {
  const [s, setS] = useState<State>(defaultState);

  const setM1 = (patch: Partial<MetalState>) =>
    setS((prev) => ({ ...prev, m1: { ...prev.m1, ...patch } }));
  const setM2 = (patch: Partial<MetalState>) =>
    setS((prev) => ({ ...prev, m2: { ...prev.m2, ...patch } }));

  function reset() { setS(defaultState()); }

  function applyAnfotero(id: string) {
    const p = ANFOTERO_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setS((prev) => ({ ...prev, m1: { ...p.metal, logBetasOH: [...p.metal.logBetasOH] }, hydroxoOpen: true }));
  }

  // ── Solubility curves ─────────────────────────────────────────────────────

  const sideStack = useMemo(() => {
    const st = { ...s.side, showOH: true, logBetasOH: s.m1.logBetasOH };
    return sideStackFromEditor(st);
  }, [s.side, s.m1.logBetasOH]);

  const logSThreshold = s.useCThreshold
    ? logSThresholdFromConcentration(s.cAnalytic)
    : s.logSThreshold;

  const curve1 = useMemo(
    () => s.showSideMask
      ? hydroxideSolCurveMasked(s.m1.pKsp, s.m1.n, sideStack, [0, 14], 600)
      : hydroxideSolCurve(s.m1.pKsp, s.m1.n, s.m1.logBetasOH, [0, 14], 600),
    [s.m1.pKsp, s.m1.n, s.m1.logBetasOH, s.showSideMask, sideStack],
  );
  const curve2 = useMemo(
    () => s.showM2 ? hydroxideSolCurve(s.m2.pKsp, s.m2.n, s.m2.logBetasOH, [0, 14], 600) : null,
    [s.m2.pKsp, s.m2.n, s.m2.logBetasOH, s.showM2],
  );

  // ── Precipitation pH (first threshold crossing) ───────────────────────────

  const pH1precip = useMemo(
    () => s.showSideMask
      ? precipitationPHMasked(s.m1.pKsp, s.m1.n, sideStack, logSThreshold, [0, 14], 'falling')
      : precipitationPH(s.m1.pKsp, s.m1.n, s.m1.logBetasOH, logSThreshold, [0, 14], 'falling'),
    [s.m1, logSThreshold, s.showSideMask, sideStack],
  );
  const pH2precip = useMemo(
    () => s.showM2 ? precipitationPH(s.m2.pKsp, s.m2.n, s.m2.logBetasOH, logSThreshold, [0, 14], 'falling') : null,
    [s.m2, logSThreshold, s.showM2],
  );

  // Selective window: [pH where M1 precipitates, pH where M2 starts to precipitate]
  const selectiveWindow: [number, number] | null = useMemo(() => {
    if (!s.showM2 || pH1precip === null || pH2precip === null) return null;
    if (pH1precip >= pH2precip) return null; // no separation possible
    return [pH1precip, pH2precip];
  }, [s.showM2, pH1precip, pH2precip]);

  // ── Dynamic Y range ───────────────────────────────────────────────────────

  const yMin = useMemo(() => {
    const all = [...curve1.logS, ...(curve2?.logS ?? [])].filter(Number.isFinite);
    return Math.max(Math.floor(Math.min(...all)) - 1, -40);
  }, [curve1, curve2]);
  const yMax = useMemo(() => {
    const all = [...curve1.logS, ...(curve2?.logS ?? [])].filter(Number.isFinite);
    return Math.min(Math.ceil(Math.max(...all)) + 1, 3);
  }, [curve1, curve2]);

  const logSAt = (curve: { pHs: number[]; logS: number[] }, pH: number) => {
    let best = curve.logS[0];
    let bestD = Math.abs(curve.pHs[0] - pH);
    for (let i = 1; i < curve.pHs.length; i++) {
      const d = Math.abs(curve.pHs[i] - pH);
      if (d < bestD) { bestD = d; best = curve.logS[i]; }
    }
    return best;
  };

  /** U-curve minimum: pH of minimum solubility and log s there (Ord-5a). */
  const minSolubility = useMemo(() => {
    let minIdx = 0;
    for (let i = 1; i < curve1.logS.length; i++) {
      if (Number.isFinite(curve1.logS[i]) && curve1.logS[i] < curve1.logS[minIdx]) minIdx = i;
    }
    return { pH: curve1.pHs[minIdx], logS: curve1.logS[minIdx] };
  }, [curve1]);

  /** Minimum is interior (true U-curve) when it does not fall at the range endpoints. */
  const minHasInterior = minSolubility.pH > 0.3 && minSolubility.pH < 13.7;

  /** pH where the U-curve recrosses the threshold (amphoteric re-dissolution). */
  const redissolutionPH = useMemo(() => {
    if (s.m1.logBetasOH.length === 0) return null;
    let minIdx = 0;
    for (let i = 1; i < curve1.logS.length; i++) {
      if (curve1.logS[i] < curve1.logS[minIdx]) minIdx = i;
    }
    for (let i = minIdx + 1; i < curve1.logS.length; i++) {
      if (curve1.logS[i] >= logSThreshold) return curve1.pHs[i];
    }
    return null;
  }, [curve1, s.m1.logBetasOH, logSThreshold]);

  // ── Shapes and traces ─────────────────────────────────────────────────────

  const shapes = useMemo<Partial<Shape>[]>(() => {
    const out: Partial<Shape>[] = [
      {
        type: 'line', x0: 0, x1: 14, y0: logSThreshold, y1: logSThreshold,
        line: { color: C_THRESH, width: 1.5, dash: 'dot' },
      },
    ];
    if (selectiveWindow) {
      out.push({
        type: 'rect',
        x0: selectiveWindow[0], x1: selectiveWindow[1],
        y0: yMin - 99, y1: yMax + 99,
        fillcolor: C_WIN, line: { width: 0 },
        layer: 'below',
      });
    }
    out.push({
      type: 'line', x0: s.operatingPH, x1: s.operatingPH, y0: yMin - 99, y1: yMax + 99,
      line: { color: '#CC79A7', width: 1.5, dash: 'dashdot' },
    });
    if (redissolutionPH !== null) {
      out.push({
        type: 'line', x0: redissolutionPH, x1: redissolutionPH, y0: yMin - 99, y1: yMax + 99,
        line: { color: '#7F8C8D', width: 1.5, dash: 'dot' },
      });
    }
    // U-curve minimum marker (minimum solubility), only when interior
    if (minHasInterior) {
      out.push({
        type: 'line', x0: minSolubility.pH, x1: minSolubility.pH, y0: yMin - 99, y1: minSolubility.logS,
        line: { color: '#009E73', width: 1.5, dash: 'dash' },
      });
    }
    return out;
  }, [logSThreshold, s.operatingPH, selectiveWindow, redissolutionPH, yMin, yMax, minHasInterior, minSolubility]);

  const traces = useMemo<Data[]>(() => {
    const out: Data[] = [
      {
        x: curve1.pHs, y: curve1.logS, type: 'scatter', mode: 'lines',
        name: `log s (${s.m1.formula})`,
        line: { width: 3, color: C1 },
        hovertemplate: `log s = %{y:.2f}<extra>${s.m1.formula}</extra>`,
      },
    ];
    if (curve2) {
      out.push({
        x: curve2.pHs, y: curve2.logS, type: 'scatter', mode: 'lines',
        name: `log s (${s.m2.formula})`,
        line: { width: 2.5, color: C2, dash: 'dot' },
        hovertemplate: `log s = %{y:.2f}<extra>${s.m2.formula}</extra>`,
      });
    }
    return out;
  }, [curve1, curve2, s.m1.formula, s.m2.formula]);

  // ── Separation verdict ────────────────────────────────────────────────────

  const verdict = useMemo(() => {
    if (!s.showM2) return null;
    if (selectiveWindow) {
      const w = selectiveWindow[1] - selectiveWindow[0];
      return { text: `Separación posible ✓ — ventana de ${w.toFixed(1)} unid. pH`, ok: true };
    }
    if (pH1precip !== null && pH2precip !== null && pH1precip >= pH2precip) {
      return { text: `M2 precipita antes que M1 — sin separación selectiva`, ok: false };
    }
    return { text: 'Uno de los metales no alcanza el umbral en pH 0–14', ok: false };
  }, [s.showM2, selectiveWindow, pH1precip, pH2precip]);

  const purityAtM1Precip = useMemo(() => {
    if (!s.showM2 || pH1precip === null || !curve2) return null;
    const s1 = Math.pow(10, logSAt(curve1, pH1precip));
    const s2 = Math.pow(10, logSAt(curve2, pH1precip));
    if (s1 + s2 <= 0) return null;
    return 100 * s1 / (s1 + s2);
  }, [s.showM2, pH1precip, curve1, curve2]);

  const coprecipAtOp = useMemo(() => {
    if (!s.showM2 || !curve2) return null;
    const logS1 = logSAt(curve1, s.operatingPH);
    const logS2 = logSAt(curve2, s.operatingPH);
    const s1 = Math.pow(10, logS1);
    const s2 = Math.pow(10, logS2);
    if (s1 + s2 <= 0) return null;
    return {
      logS1, logS2, s1, s2,
      purityM1: 100 * s1 / (s1 + s2),
      fracM2: 100 * s2 / (s1 + s2),
    };
  }, [s.showM2, s.operatingPH, curve1, curve2]);

  const pxCurve = useMemo(() => {
    if (!s.showPX) return null;
    const salt = {
      id: 'custom', name: s.m1.label, formula: s.m1.formula,
      pKsp: s.m1.pKsp, m: 1, x: s.m1.n,
      anionLabel: 'OH⁻', cationLabel: s.m1.label,
    };
    return solubilityPXCurve(salt, s.pHForPX, s.logBetasX, 0, 14, 400);
  }, [s.showPX, s.m1, s.pHForPX, s.logBetasX]);

  // ── Database items ────────────────────────────────────────────────────────

  const dbItems = OH_PRESETS.map((p) => ({
    id: p.id, label: p.formula, detail: `${p.metal} · pKsp ${p.pKsp}`, group: p.group,
  }));

  // ── pKsp' = f(pH) curve ───────────────────────────────────────────────────

  const pKspCurve1 = useMemo(() => {
    const N = 300;
    const pHs: number[] = [];
    const pKsps: number[] = [];
    for (let i = 0; i <= N; i++) {
      const pH = 14 * i / N;
      const logA = Math.log10(alphaOH(s.m1.logBetasOH, pH));
      pHs.push(pH);
      pKsps.push(s.m1.pKsp - logA);
    }
    return { pHs, pKsps };
  }, [s.m1.pKsp, s.m1.logBetasOH]);

  const pKspCurve2 = useMemo(() => {
    if (!s.showM2) return null;
    const N = 300;
    const pHs: number[] = [];
    const pKsps: number[] = [];
    for (let i = 0; i <= N; i++) {
      const pH = 14 * i / N;
      const logA = Math.log10(alphaOH(s.m2.logBetasOH, pH));
      pHs.push(pH);
      pKsps.push(s.m2.pKsp - logA);
    }
    return { pHs, pKsps };
  }, [s.showM2, s.m2.pKsp, s.m2.logBetasOH]);

  const pKspTraces = useMemo(() => {
    const out: import('plotly.js').Data[] = [
      {
        x: pKspCurve1.pHs, y: pKspCurve1.pKsps,
        type: 'scatter', mode: 'lines',
        name: `pKsp' (${s.m1.formula})`,
        line: { width: 3, color: C1 },
        hovertemplate: `pKsp' = %{y:.2f}<extra>${s.m1.formula}</extra>`,
      },
      {
        x: pKspCurve1.pHs, y: pKspCurve1.pHs.map(() => s.m1.pKsp),
        type: 'scatter', mode: 'lines',
        name: `pKsp termodinámico (${s.m1.formula})`,
        line: { width: 1.5, color: C1, dash: 'dot' },
        hovertemplate: `pKsp = ${s.m1.pKsp}<extra>referencia</extra>`,
      },
    ];
    if (pKspCurve2) {
      out.push({
        x: pKspCurve2.pHs, y: pKspCurve2.pKsps,
        type: 'scatter', mode: 'lines',
        name: `pKsp' (${s.m2.formula})`,
        line: { width: 2.5, color: C2, dash: 'dot' },
        hovertemplate: `pKsp' = %{y:.2f}<extra>${s.m2.formula}</extra>`,
      });
    }
    return out;
  }, [pKspCurve1, pKspCurve2, s.m1.formula, s.m1.pKsp, s.m2.formula]);

  const pKspYMin = useMemo(() => {
    const all = [...pKspCurve1.pKsps, ...(pKspCurve2?.pKsps ?? [])].filter(Number.isFinite);
    return Math.max(Math.floor(Math.min(...all)) - 1, 0);
  }, [pKspCurve1, pKspCurve2]);
  const pKspYMax = Math.max(s.m1.pKsp, s.showM2 ? s.m2.pKsp : 0) + 3;

  // ── Diagrams ──────────────────────────────────────────────────────────────

  const tabs = [
    {
      id: 'logs',
      label: 'log s = f(pH)',
      node: (
        <Chart
          data={traces}
          xTitle="pH"
          yTitle="log s  (solubilidad molar)"
          xRange={[0, 14]}
          yRange={[yMin, yMax]}
          shapes={shapes}
          exportName="equilibria-sol-cond"
        />
      ),
    },
    {
      id: 'pksp',
      label: "pKsp' = f(pH)",
      node: (
        <Chart
          data={pKspTraces}
          xTitle="pH"
          yTitle="pKsp' (producto de solubilidad condicional)"
          xRange={[0, 14]}
          yRange={[pKspYMin, pKspYMax]}
          exportName="equilibria-pksp-cond"
        />
      ),
    },
    ...(pxCurve ? [{
      id: 'px',
      label: 'log s = f(pX)',
      node: (
        <Chart
          data={[{
            x: pxCurve.pXs, y: pxCurve.logS, type: 'scatter', mode: 'lines',
            name: `log s (${s.m1.formula})`,
            line: { width: 3, color: '#7c3aed' },
          }]}
          xTitle={`p[${s.ligandX}]`}
          yTitle="log s (solubilidad molar)"
          xRange={[0, 14]}
          yRange={[yMin, yMax]}
          exportName="equilibria-sol-px"
        />
      ),
    }] : []),
  ];

  return (
    <div className="module">
      <PanelShell title="Precipitación selectiva" onReset={reset}>
        <PanelSection title="Metal 1 (precipitar)" icon="①">
          <ModelBadge
            model={s.m1.logBetasOH.length === 0
              ? 'precipitación simple del hidróxido'
              : `precipitación con ${s.m1.logBetasOH.length} complejo(s) hidroxo soluble(s)`}
            additions={[s.showM2 && 'separación selectiva entre dos metales', minHasInterior && 'mínimo de solubilidad (curva en U)']}
          />
          <DbPanel items={dbItems} onSelect={(id) => setM1({ ...fromPreset(id) })} title="Presets M(OH)n" />
          <p className="hint" style={{ marginBottom: 4 }}>Presets anfóteros (curva U por redisolución):</p>
          <div className="preset-chip-row" style={{ marginBottom: 8 }}>
            {ANFOTERO_PRESETS.map((p) => (
              <button key={p.id} className="preset-chip" onClick={() => applyAnfotero(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <LabelField label="Metal" value={s.m1.label} onChange={(v) => setM1({ label: v })} />
          <LabelField label="Fórmula" value={s.m1.formula} onChange={(v) => setM1({ formula: v })} />
          <Slider label="pKsp" value={s.m1.pKsp} min={2} max={45} step={0.1} onChange={(v) => setM1({ pKsp: v })} decimals={1} />
          <div className="control">
            <div className="control-header">
              <span className="control-label">Estequiometría n (M(OH)_n)</span>
              <span className="control-value">{s.m1.n}</span>
            </div>
            <div className="segmented" style={{ marginTop: 6 }}>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  className={s.m1.n === n ? 'seg-btn active' : 'seg-btn'}
                  onClick={() => setM1({ n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Disclosure
            title="Complejos hidroxo de M1 (log β)"
            open={s.hydroxoOpen}
            onToggle={(open) => setS((p) => ({ ...p, hydroxoOpen: open }))}
          >
            <ConstantList
              prefix="log β(OH)"
              values={s.m1.logBetasOH}
              onChange={(v) => setM1({ logBetasOH: v })}
              min={-50} max={40} maxItems={5} minItems={0} initialValue={5}
            />
            <p className="hint">Incluir formas anfotéricas (β₄ para M(OH)₄⁻) da forma de U a la curva.</p>
          </Disclosure>
          <Toggle
            label="Enmascaramiento por ligando auxiliar (NH₃, glicinato…)"
            checked={s.showSideMask}
            onChange={(v) => setS((p) => ({ ...p, showSideMask: v }))}
          />
          {s.showSideMask && (
            <div className="mask-section">
              <SideReactionEditor
                state={s.side}
                onChange={(side) => setS((p) => ({ ...p, side }))}
                showLigandPKas={false}
              />
            </div>
          )}
        </PanelSection>

        <PanelSection title="Comparar 2.º metal" icon="②">
          <Toggle label="Separación selectiva entre dos metales" checked={s.showM2} onChange={(v) => setS((p) => ({ ...p, showM2: v }))} />
          {s.showM2 && (
            <div className="mask-section">
              <DbPanel items={dbItems} onSelect={(id) => setM2({ ...fromPreset(id) })} title="Presets M2" />
              <LabelField label="2.º metal" value={s.m2.label} onChange={(v) => setM2({ label: v })} />
              <LabelField label="Fórmula" value={s.m2.formula} onChange={(v) => setM2({ formula: v })} />
              <Slider label="pKsp" value={s.m2.pKsp} min={2} max={45} step={0.1} onChange={(v) => setM2({ pKsp: v })} decimals={1} />
              <div className="control">
                <div className="control-header">
                  <span className="control-label">Estequiometría n</span>
                  <span className="control-value">{s.m2.n}</span>
                </div>
                <div className="segmented" style={{ marginTop: 6 }}>
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      className={s.m2.n === n ? 'seg-btn active' : 'seg-btn'}
                      onClick={() => setM2({ n })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </PanelSection>

        <PanelSection title="Umbral y operación" icon="⚗">
          <Toggle
            label="Umbral desde concentración analítica C"
            checked={s.useCThreshold}
            onChange={(v) => setS((p) => ({ ...p, useCThreshold: v }))}
          />
          {s.useCThreshold ? (
            <ConcSlider label="C analítica (M)" value={s.cAnalytic} onChange={(v) => setS((p) => ({ ...p, cAnalytic: v }))} min={-4} max={-1} />
          ) : (
            <Slider
              label="log s_umbral"
              value={s.logSThreshold}
              min={-10}
              max={-1}
              step={0.5}
              onChange={(v) => setS((p) => ({ ...p, logSThreshold: v }))}
              decimals={1}
            />
          )}
          <Slider
            label="pH de operación (co-precipitación)"
            value={s.operatingPH}
            min={0}
            max={14}
            step={0.1}
            onChange={(v) => setS((p) => ({ ...p, operatingPH: v }))}
            decimals={1}
          />
          <p className="hint">
            Precipitación "completa" cuando s &lt; 10^{s.logSThreshold.toFixed(0)} M
            {' '}(línea punteada gris). Banda verde: ventana selectiva. Rosa: pH de operación;
            naranja punteada: redisolución; verde discontinua: mínimo de solubilidad.
          </p>
        </PanelSection>

        <PanelSection title="Resultado" icon="∑">
        <ResultCard items={[
          {
            label: `pH donde ${s.m1.formula} precipita`,
            value: pH1precip !== null ? `pH ${pH1precip.toFixed(1)}` : 'No alcanza umbral',
          },
          ...(minHasInterior ? [{
            label: `Mínima solubilidad de ${s.m1.formula}`,
            value: `pH ${minSolubility.pH.toFixed(1)} · log s ${minSolubility.logS.toFixed(2)}`,
          }] : []),
          ...(s.showM2 ? [{
            label: `pH donde ${s.m2.formula} precipita`,
            value: pH2precip !== null ? `pH ${pH2precip.toFixed(1)}` : 'No alcanza umbral',
          }] : []),
          ...(selectiveWindow ? [{
            label: 'Ventana selectiva',
            value: `pH ${selectiveWindow[0].toFixed(1)}–${selectiveWindow[1].toFixed(1)}`,
          }] : []),
          ...(verdict ? [{ label: 'Veredicto', value: verdict.text }] : []),
          ...(purityAtM1Precip !== null ? [{
            label: 'Pureza teórica de M1 al precipitar',
            value: `${purityAtM1Precip.toFixed(1)} % (s₁/(s₁+s₂) a pH ${pH1precip!.toFixed(1)})`,
          }] : []),
          ...(redissolutionPH !== null ? [{
            label: `Redisolución de ${s.m1.formula}`,
            value: `pH ≈ ${redissolutionPH.toFixed(1)} (curva en U)`,
          }] : []),
          ...(coprecipAtOp ? [
            {
              label: `log s₁ a pH ${s.operatingPH.toFixed(1)}`,
              value: coprecipAtOp.logS1.toFixed(2),
            },
            {
              label: `log s₂ a pH ${s.operatingPH.toFixed(1)}`,
              value: coprecipAtOp.logS2.toFixed(2),
            },
            {
              label: 'Pureza M1 en operación',
              value: `${coprecipAtOp.purityM1.toFixed(1)} % · co-precip. M2: ${coprecipAtOp.fracM2.toFixed(2)} %`,
            },
          ] : []),
        ]} />
        </PanelSection>

        <PanelSection title="Efecto de complejante (pX)" icon="✦">
          <Toggle
            label="log s = f(pX) — efecto de complejante"
            checked={s.showPX}
            onChange={(v) => setS((p) => ({ ...p, showPX: v }))}
          />
          {s.showPX && (
            <div className="mask-section">
              <LabelField label="Complejante X" value={s.ligandX} onChange={(v) => setS((p) => ({ ...p, ligandX: v }))} />
              <Slider label="pH fijo" value={s.pHForPX} min={0} max={14} step={0.1} onChange={(v) => setS((p) => ({ ...p, pHForPX: v }))} decimals={1} />
              <ConstantList
                prefix="log β(X)"
                values={s.logBetasX}
                onChange={(v) => setS((p) => ({ ...p, logBetasX: v }))}
                min={0} max={25} maxItems={6}
              />
            </div>
          )}
        </PanelSection>

        <InfoBox title="Separación selectiva de hidróxidos">
          <p>
            La solubilidad de M(OH)_n sigue <code>log s = −pKsp + n·pOH</code> (pendiente −n
            por unidad de pH). Los metales con mayor pKsp o menor n precipitan a pH más alto.
            Controlando el pH se puede <strong>precipitar selectivamente</strong> un metal sin
            afectar al otro.
          </p>
          <p>
            Para metales <strong>anfotéricos</strong> (Al, Zn, Cr, Pb) la curva es en U: suben
            de nuevo a pH muy alto por formación de hidroxocomplejos aniónicos (Al(OH)₄⁻,
            Zn(OH)₄²⁻). Los log β del panel modelan este efecto.
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={tabs} initialId="logs" />
        <ResultCardRow items={[
          {
            label: `${s.m1.formula} precipita`,
            value: pH1precip !== null ? `pH ${pH1precip.toFixed(1)}` : '—',
            accent: true,
          },
          ...(minHasInterior
            ? [{ label: 'Mín. solubilidad', value: `pH ${minSolubility.pH.toFixed(1)}` }]
            : []),
          ...(selectiveWindow
            ? [{ label: 'Ventana selectiva', value: `${selectiveWindow[0].toFixed(1)}–${selectiveWindow[1].toFixed(1)}` }]
            : []),
        ]} />
      </section>
    </div>
  );
}
