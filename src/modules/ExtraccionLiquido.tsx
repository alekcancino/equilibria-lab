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

import { useMemo, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { InfoBox, ModelBadge, ResultCard, Slider, Toggle, ConstantList, PanelSection, ResultCardRow } from '../components/Controls';
import { alphaFractions } from '../lib/equilibrium';
import { SPECIES_COLORS } from '../lib/database';

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
  // quelato
  n?: number;
  logCHL?: number;
}

const PRESETS: ExtractionPreset[] = [
  { id: 'benzoico',  label: 'Ácido benzoico',         formula: 'C₆H₅COOH', type: 'acid',    logKd:  2.22, pKas: [4.20],         neutralIdx: 0, system: 'CHCl₃/H₂O' },
  { id: 'salicilico',label: 'Ácido salicílico',       formula: 'HOC₆H₄COOH',type: 'acid',   logKd:  2.40, pKas: [3.00, 13.40], neutralIdx: 0, system: 'CHCl₃/H₂O' },
  { id: 'aspirina',  label: 'Ácido acetilsalicílico', formula: 'HC₉H₇O₄',  type: 'acid',    logKd:  1.70, pKas: [3.50],         neutralIdx: 0, system: 'CHCl₃/H₂O' },
  { id: 'acetico',   label: 'Ácido acético',           formula: 'CH₃COOH',  type: 'acid',    logKd: -0.23, pKas: [4.76],         neutralIdx: 0, system: 'Et₂O/H₂O'  },
  { id: '8hq',       label: '8-Hidroxiquinolina',      formula: 'HQ',        type: 'acid',    logKd:  2.70, pKas: [5.13, 9.89],  neutralIdx: 1, system: 'CHCl₃/H₂O' },
  { id: 'dithizone', label: 'Ditizona',                formula: 'H₂Dz',     type: 'acid',    logKd:  4.00, pKas: [4.47],         neutralIdx: 0, system: 'CHCl₃/H₂O' },
  { id: 'I2',        label: 'Yodo molecular',          formula: 'I₂',        type: 'acid',    logKd:  2.83, pKas: [],             neutralIdx: 0, system: 'CCl₄/H₂O'  },
  // Metal chelates — D = K_ex · [HL]^n · 10^(n·pH)
  { id: 'cu_8hq',    label: 'Cu²⁺ + 8-HQ',            formula: 'Cu(Ox)₂',   type: 'chelate', logKd:  9.10, pKas: [], neutralIdx: 0, n: 2, logCHL: -1, system: 'CHCl₃/H₂O' },
  { id: 'zn_8hq',    label: 'Zn²⁺ + 8-HQ',            formula: 'Zn(Ox)₂',   type: 'chelate', logKd:  8.70, pKas: [], neutralIdx: 0, n: 2, logCHL: -1, system: 'CHCl₃/H₂O' },
  { id: 'fe_8hq',    label: 'Fe³⁺ + 8-HQ',            formula: 'Fe(Ox)₃',   type: 'chelate', logKd: 12.10, pKas: [], neutralIdx: 0, n: 3, logCHL: -1, system: 'CHCl₃/H₂O' },
  { id: 'pb_dithiz', label: 'Pb²⁺ + Ditizona',         formula: 'Pb(HDz)₂', type: 'chelate', logKd:  6.30, pKas: [], neutralIdx: 0, n: 2, logCHL: -2, system: 'CHCl₃/H₂O' },
];

// ── Engine ────────────────────────────────────────────────────────────────────

function distributionD(
  a: AnalyteState,
  pH: number,
  dimer?: { enabled: boolean; logK2: number },
): number {
  if (a.type === 'chelate') {
    // D = K_ex · [HL]_org^n · 10^(n·pH)
    return Math.pow(10, a.logKd + a.n * a.logCHL + a.n * pH);
  }
  const Kd = Math.pow(10, a.logKd);
  if (a.pKas.length === 0) return Kd;
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, a.pKas);
  const aN = alphas[Math.min(a.neutralIdx, alphas.length - 1)] ?? 0;
  const Dmono = Kd * aN;
  if (dimer?.enabled && a.type === 'acid') {
    const K2 = Math.pow(10, dimer.logK2);
    // Organic-phase dimer: D_eff = D_mono · (1 + K₂·α²) shifts the log D maximum
    return Dmono * (1 + K2 * aN * aN);
  }
  return Dmono;
}

/** %E en una sola extracción. r = Vorg/Vaq. */
function percentE1(D: number, r: number): number {
  return 100 * D * r / (D * r + 1);
}

/** %E acumulado tras n extracciones iguales. */
function percentEn(D: number, r: number, n: number): number {
  if (D <= 0) return 0;
  const remaining = Math.pow(1 / (1 + D * r), n);
  return 100 * (1 - remaining);
}

/** Número mínimo de extracciones para %E ≥ target. */
function nFor(D: number, r: number, target: number): number | null {
  if (D <= 0) return null;
  const base = 1 / (1 + D * r);
  if (base <= 0) return 1;
  const n = Math.ceil(Math.log(1 - target / 100) / Math.log(base));
  return n > 0 && n <= 100 ? n : null;
}

// ── Colors ────────────────────────────────────────────────────────────────────

const C1 = SPECIES_COLORS[0]; // orange — analyte 1
const C2 = SPECIES_COLORS[1]; // blue   — analyte 2 (comparison)
const C_N = ['#D55E00', '#0072B2', '#009E73'];

const PH_N = 400;

// ── State interfaces ──────────────────────────────────────────────────────────

interface AnalyteState {
  label: string;
  type: 'acid' | 'chelate';
  logKd: number;
  pKas: number[];
  neutralIdx: number;
  n: number;        // chelate: metal charge
  logCHL: number;   // chelate: log[HL]_org, chelating agent concentration in organic phase
}

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
  const acidPresets = PRESETS.filter((p) => p.type === 'acid');
  const chelatePresets = PRESETS.filter((p) => p.type === 'chelate');
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
        Nombre / fórmula
      </label>
      <input
        className="text-input"
        value={a.label}
        onChange={(e) => onChange({ label: e.target.value })}
        style={{ width: '100%', marginBottom: 8 }}
      />

      <div className="control" style={{ marginBottom: 6 }}>
        <div className="control-header">
          <span className="control-label">Tipo</span>
        </div>
        <div className="segmented" style={{ marginTop: 4 }}>
          {(['acid', 'chelate'] as const).map((t) => (
            <button
              key={t}
              className={a.type === t ? 'seg-btn active' : 'seg-btn'}
              onClick={() => onChange({ type: t })}
            >
              {t === 'acid' ? 'Ácido / neutral' : 'Quelato metálico'}
            </button>
          ))}
        </div>
      </div>
      <ModelBadge
        model={a.type === 'chelate'
          ? `extracción de quelato metálico (${a.n}:1)`
          : a.pKas.length === 0
            ? 'reparto simple de soluto no ionizable'
            : a.pKas.length === 1
              ? 'reparto condicionado por una ionización'
              : `reparto condicionado por ${a.pKas.length} ionizaciones`}
        additions={additions}
      />

      <p className="hint" style={{ marginBottom: 6 }}>
        {a.type === 'acid'
          ? 'Presets ácidos:'
          : 'Presets quelatos (D = K_ex · [HL]^n · 10^(n·pH)):'}
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        {(a.type === 'acid' ? acidPresets : chelatePresets).map((p) => (
          <button
            key={p.id}
            className="preset-chip"
            title={`${p.system}  logKd=${p.logKd}`}
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
          <Slider label="log Kd" value={a.logKd} min={-2} max={6} step={0.05} onChange={(v) => onChange({ logKd: v })} decimals={2} />
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
            <p className="hint">Índice de la forma neutra (0 = más protonada): {a.neutralIdx}
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
          <Slider label="log K_ex" value={a.logKd} min={-2} max={20} step={0.1} onChange={(v) => onChange({ logKd: v })} decimals={2} />
          <div className="control">
            <div className="control-header">
              <span className="control-label">n (carga del metal)</span>
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
          <p className="hint">D = 10^(log K_ex + n·log[HL] + n·pH) → sube con el pH</p>
        </>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExtraccionLiquido() {
  const [st, setSt] = useState(defaultState);
  const set = <K extends keyof ReturnType<typeof defaultState>>(
    k: K, v: ReturnType<typeof defaultState>[K]
  ) => setSt((p) => ({ ...p, [k]: v }));

  const reset = () => setSt(defaultState());

  const r = st.Vorg / st.Vaq; // volume ratio
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
          yTitle="% extracción"
          xRange={[0, 14]}
          yRange={[0, 100]}
          shapes={[cursorShape(0, 100)]}
          annotations={[cursorAnnotation(100)]}
          exportName="equilibria-pE-pH"
        />
      ),
    },
    {
      id: 'multi',
      label: 'Extracciones múltiples',
      node: (
        <Chart
          data={multiTraces}
          xTitle="pH"
          yTitle="% extracción acumulada"
          xRange={[0, 14]}
          yRange={[0, 100]}
          shapes={[cursorShape(0, 100)]}
          annotations={[cursorAnnotation(100)]}
          exportName="equilibria-multi-pH"
        />
      ),
    },
    {
      id: 'precon',
      label: 'Preconcentración (%E vs n)',
      node: (
        <Chart
          data={preconTrace}
          xTitle="Número de extracciones (n)"
          yTitle="% extracción acumulada"
          xRange={[1, st.preconNMax]}
          yRange={[0, 100]}
          exportName="equilibria-preconcentracion"
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title="Extracción líquido-líquido" onReset={reset}>
        <PanelSection title="Analito 1" icon="①">
          <AnalyteEditor
            a={st.a1}
            color={C1}
            additions={[st.showA2 && 'comparación entre analitos', st.nMax > 1 && `${st.nMax} extracciones sucesivas`]}
            onChange={(p) => set('a1', { ...st.a1, ...p })}
          />
        </PanelSection>

        <PanelSection title="Comparación (Analito 2)" icon="②">
          <Toggle label="Comparar con 2.º analito" checked={st.showA2} onChange={(v) => set('showA2', v)} />
          {st.showA2 && (
            <div className="mask-section">
              <AnalyteEditor
                a={st.a2}
                color={C2}
                additions={[st.showA2 && 'comparación entre analitos', st.nMax > 1 && `${st.nMax} extracciones sucesivas`]}
                onChange={(p) => set('a2', { ...st.a2, ...p })}
              />
            </div>
          )}
        </PanelSection>

        <PanelSection title="Condiciones" icon="⚗">
          <Toggle
            label="Polimerización / dímero en fase orgánica"
            checked={st.showDimer}
            onChange={(v) => set('showDimer', v)}
          />
          {st.showDimer && st.a1.type === 'acid' && (
            <Slider label="log K₂ (dímero)" value={st.logK2} min={-1} max={4} step={0.1} onChange={(v) => set('logK2', v)} decimals={1} />
          )}
          <Slider label="pH del cursor" value={st.pH} min={0} max={14} step={0.1} onChange={(v) => set('pH', v)} decimals={1} />
          <Slider label="Vaq (mL)" value={st.Vaq} min={1} max={50} step={1} onChange={(v) => set('Vaq', v)} decimals={0} />
          <Slider label="Vorg (mL)" value={st.Vorg} min={1} max={50} step={1} onChange={(v) => set('Vorg', v)} decimals={0} />
          <Slider label="Extracciones a graficar (n)" value={st.nMax} min={1} max={5} step={1} onChange={(v) => set('nMax', v)} decimals={0} />
          <Slider label="Etapas en preconcentración" value={st.preconNMax} min={3} max={20} step={1} onChange={(v) => set('preconNMax', v)} decimals={0} />
        </PanelSection>

        <PanelSection title="Resultado" icon="∑">
          <ResultCard items={[
            { label: `D a pH ${st.pH.toFixed(1)}`, value: D1cur >= 0.001 ? D1cur.toFixed(3) : D1cur.toExponential(2) },
            { label: `log D`, value: D1cur > 0 ? Math.log10(D1cur).toFixed(2) : '< −10' },
            { label: `%E · n=1  (Vorg/Vaq=${r.toFixed(1)})`, value: `${pE1cur.toFixed(1)} %` },
            { label: `%E · n=2`, value: `${percentEn(D1cur, r, 2).toFixed(1)} %` },
            { label: `%E · n=3`, value: `${percentEn(D1cur, r, 3).toFixed(1)} %` },
            { label: 'Extracciones para %E ≥ 99 %', value: n99_1 !== null ? `${n99_1}` : '> 100' },
            ...(st.showA2 ? [
              { label: `%E n=1 — ${st.a2.label}`, value: `${pE2cur.toFixed(1)} %` },
              { label: 'Factor separación D₁/D₂', value: D2cur > 0 ? (D1cur / D2cur).toFixed(2) : '∞' },
            ] : []),
          ]} />
        </PanelSection>

        <InfoBox title="Extracción líquido-líquido">
          <p>
            El coeficiente de distribución condicional <code>D = Kd · α_neutral</code> refleja
            cómo la ionización en la fase acuosa reduce la extracción. Para ácidos,
            <code> log D</code> cae con pendiente −1 por encima del pKa.
          </p>
          <p>
            Los <strong>anfotéricos</strong> (8-HQ) tienen una curva en campana: solo la forma
            neutral HQ extrae, y esta domina en una ventana de pH intermedia.
          </p>
          <p>
            <strong>Polimerización</strong>: cuando el analito forma dímero en la fase orgánica,
            D_eff = D_mono · (1 + K₂·α²) y el máximo de log D se desplaza respecto al modelo monomérico.
          </p>
          <p>
            <strong>Preconcentración</strong>: la pestaña %E vs n muestra cuántas extracciones
            sucesivas (mismo Vorg total repartido) se necesitan para alcanzar un %E dado.
          </p>
          <p>
            <strong>Extracciones múltiples</strong>: con el mismo volumen total de disolvente
            orgánico es más eficiente hacer varias extracciones pequeñas que una sola grande
            (teorema de Craig).
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="logd" />
        <ResultCardRow items={[
          { label: `%E (n=1) a pH ${st.pH.toFixed(1)}`, value: Number.isFinite(pE1cur) ? `${pE1cur.toFixed(1)} %` : '—', accent: true },
          { label: 'log D', value: D1cur > 0 ? Math.log10(D1cur).toFixed(2) : '—' },
          { label: 'n para %E ≥ 99 %', value: n99_1 !== null ? `${n99_1}` : '—' },
        ]} />
      </section>
    </div>
  );
}
