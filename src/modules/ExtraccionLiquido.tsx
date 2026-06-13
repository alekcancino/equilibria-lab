// Extracción líquido-líquido — módulo ② de Equilibrios múltiples.
//
// Modela la distribución de un analito entre dos fases inmiscibles en función
// del pH. El coeficiente de distribución condicional D' captura cómo la
// ionización en la fase acuosa reduce la extracción:
//
//   D = Kd × α_neutral        α_neutral = fracción de la forma extraíble
//   %E = 100 · D·r / (D·r + 1)   donde r = Vorg/Vaq
//
// Para n extracciones sucesivas: %Eₙ = 100 · (1 − (1/(1+D·r))^n)
//
// Comportamientos cubiertos:
//   • Ácidos: D cae monotónamente para pH > pKa  (slope −1 en log D)
//   • Anfotéricos (8-HQ): D tiene máximo bell-shaped
//   • No ionizables (I₂): D constante = Kd

import { useMemo, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import DiagramTabs from '../components/DiagramTabs';
import { InfoBox, ResultCard, Slider, Toggle } from '../components/Controls';
import { alphaFractions } from '../lib/equilibrium';
import { SPECIES_COLORS } from '../lib/database';

// ── Presets ───────────────────────────────────────────────────────────────────

interface ExtractionPreset {
  id: string;
  label: string;
  formula: string;
  logKd: number;
  pKas: number[];
  neutralIdx: number; // índice en alphaFractions[] de la forma extraíble
  system: string;
}

const PRESETS: ExtractionPreset[] = [
  { id: 'benzoico',  label: 'Ácido benzoico',         formula: 'C₆H₅COOH', logKd:  2.22, pKas: [4.20],         neutralIdx: 0, system: 'CHCl₃/H₂O' },
  { id: 'salicilico',label: 'Ácido salicílico',       formula: 'HOC₆H₄COOH',logKd:  2.40, pKas: [3.00, 13.40], neutralIdx: 0, system: 'CHCl₃/H₂O' },
  { id: 'aspirina',  label: 'Ácido acetilsalicílico', formula: 'HC₉H₇O₄',  logKd:  1.70, pKas: [3.50],         neutralIdx: 0, system: 'CHCl₃/H₂O' },
  { id: 'acetico',   label: 'Ácido acético',           formula: 'CH₃COOH',   logKd: -0.23, pKas: [4.76],         neutralIdx: 0, system: 'Et₂O/H₂O'  },
  { id: '8hq',       label: '8-Hidroxiquinolina',      formula: 'HQ',         logKd:  2.70, pKas: [5.13, 9.89],  neutralIdx: 1, system: 'CHCl₃/H₂O' },
  { id: 'dithizone', label: 'Ditizona',                formula: 'H₂Dz',      logKd:  4.00, pKas: [4.47],         neutralIdx: 0, system: 'CHCl₃/H₂O' },
  { id: 'I2',        label: 'Yodo molecular',          formula: 'I₂',         logKd:  2.83, pKas: [],             neutralIdx: 0, system: 'CCl₄/H₂O'  },
];

// ── Motor ─────────────────────────────────────────────────────────────────────

function distributionD(logKd: number, pKas: number[], neutralIdx: number, pH: number): number {
  const Kd = Math.pow(10, logKd);
  if (pKas.length === 0) return Kd;
  const h = Math.pow(10, -pH);
  const alphas = alphaFractions(h, pKas);
  const aN = alphas[Math.min(neutralIdx, alphas.length - 1)] ?? 0;
  return Kd * aN;
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

// ── Colores ───────────────────────────────────────────────────────────────────

const C1 = SPECIES_COLORS[0]; // naranja — analito 1
const C2 = SPECIES_COLORS[1]; // azul    — analito 2 (comparación)
const C_N = ['#D55E00', '#0072B2', '#009E73']; // n=1,2,3 extracciones

const PH_N = 400;

// ── Interfaces de estado ──────────────────────────────────────────────────────

interface AnalyteState {
  label: string;
  logKd: number;
  pKas: number[];
  neutralIdx: number;
}

function presetState(id: string): AnalyteState {
  const p = PRESETS.find((x) => x.id === id) ?? PRESETS[0];
  return { label: p.label, logKd: p.logKd, pKas: [...p.pKas], neutralIdx: p.neutralIdx };
}

function defaultState() {
  return {
    a1: presetState('benzoico'),
    a2: presetState('8hq'),
    showA2: false,
    Vaq: 10,        // mL
    Vorg: 10,       // mL
    nMax: 3,        // extracciones a mostrar en la 3.ª pestaña
    pH: 5,          // cursor
  };
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function ExtraccionLiquido() {
  const [st, setSt] = useState(defaultState);
  const set = <K extends keyof ReturnType<typeof defaultState>>(
    k: K, v: ReturnType<typeof defaultState>[K]
  ) => setSt((p) => ({ ...p, [k]: v }));

  const reset = () => setSt(defaultState());

  const r = st.Vorg / st.Vaq; // ratio de volúmenes

  // ── Curvas ─────────────────────────────────────────────────────────────────

  const pHs = useMemo(() => Array.from({ length: PH_N + 1 }, (_, i) => 14 * i / PH_N), []);

  const D1s = useMemo(() => pHs.map((pH) => distributionD(st.a1.logKd, st.a1.pKas, st.a1.neutralIdx, pH)), [pHs, st.a1]);
  const D2s = useMemo(() => pHs.map((pH) => distributionD(st.a2.logKd, st.a2.pKas, st.a2.neutralIdx, pH)), [pHs, st.a2]);

  const logD1s = useMemo(() => D1s.map((d) => d > 1e-10 ? Math.log10(d) : -10), [D1s]);
  const logD2s = useMemo(() => D2s.map((d) => d > 1e-10 ? Math.log10(d) : -10), [D2s]);

  const pE1s = useMemo(() => D1s.map((d) => percentE1(d, r)), [D1s, r]);
  const pE2s = useMemo(() => D2s.map((d) => percentE1(d, r)), [D2s, r]);

  // ── Valores en el cursor ────────────────────────────────────────────────────

  const D1cur = distributionD(st.a1.logKd, st.a1.pKas, st.a1.neutralIdx, st.pH);
  const D2cur = distributionD(st.a2.logKd, st.a2.pKas, st.a2.neutralIdx, st.pH);
  const pE1cur = percentE1(D1cur, r);
  const pE2cur = percentE1(D2cur, r);
  const n99_1 = nFor(D1cur, r, 99);

  // ── Rango Y dinámico para log D ────────────────────────────────────────────

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

  // ── Extracciones múltiples (%E vs pH para n=1..nMax) ─────────────────────

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

  // ── Trazas log D ───────────────────────────────────────────────────────────

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

  // ── Trazas %E ─────────────────────────────────────────────────────────────

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
          exportName="quimeq-logD-pH"
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
          exportName="quimeq-pE-pH"
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
          exportName="quimeq-multi-pH"
        />
      ),
    },
  ];

  // ── Panel de edición de analito ────────────────────────────────────────────

  function AnalyteEditor({ a, color, onChange }: {
    a: AnalyteState;
    color: string;
    onChange: (patch: Partial<AnalyteState>) => void;
  }) {
    return (
      <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10, marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
          Nombre / fórmula
        </label>
        <input
          className="text-input"
          value={a.label}
          onChange={(e) => onChange({ label: e.target.value })}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className="preset-chip"
              title={`${p.system}  logKd=${p.logKd}  pKas=[${p.pKas.join(',')}]`}
              onClick={() => onChange({ label: p.label, logKd: p.logKd, pKas: [...p.pKas], neutralIdx: p.neutralIdx })}
            >
              {p.formula}
            </button>
          ))}
        </div>
        <Slider label="log Kd" value={a.logKd} min={-2} max={6} step={0.05} onChange={(v) => onChange({ logKd: v })} decimals={2} />
        <Slider
          label={`pKa (${a.pKas.length === 0 ? 'no ionizable' : a.pKas.map((v) => v.toFixed(2)).join(', ')})`}
          value={a.pKas[0] ?? 7}
          min={0} max={14} step={0.05}
          onChange={(v) => {
            const arr = a.pKas.length === 0 ? [] : a.pKas.map((_, i) => i === 0 ? v : a.pKas[i]);
            onChange({ pKas: arr });
          }}
          decimals={2}
        />
        {a.pKas.length > 1 && (
          <Slider
            label={`pKa₂ (${a.pKas[1]?.toFixed(2)})`}
            value={a.pKas[1] ?? 10}
            min={0} max={14} step={0.05}
            onChange={(v) => { const arr = [...a.pKas]; arr[1] = v; onChange({ pKas: arr }); }}
            decimals={2}
          />
        )}
      </div>
    );
  }

  return (
    <div className="module">
      <aside className="panel">
        <div className="panel-header">
          <h2>Extracción líquido-líquido</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>

        <h3>Analito 1</h3>
        <AnalyteEditor a={st.a1} color={C1} onChange={(p) => set('a1', { ...st.a1, ...p })} />

        <Toggle label="Comparar con 2.º analito" checked={st.showA2} onChange={(v) => set('showA2', v)} />
        {st.showA2 && (
          <div className="mask-section">
            <h3>Analito 2</h3>
            <AnalyteEditor a={st.a2} color={C2} onChange={(p) => set('a2', { ...st.a2, ...p })} />
          </div>
        )}

        <h3>Condiciones</h3>
        <Slider label="pH del cursor" value={st.pH} min={0} max={14} step={0.1} onChange={(v) => set('pH', v)} decimals={1} />
        <Slider label="Vaq (mL)" value={st.Vaq} min={1} max={50} step={1} onChange={(v) => set('Vaq', v)} decimals={0} />
        <Slider label="Vorg (mL)" value={st.Vorg} min={1} max={50} step={1} onChange={(v) => set('Vorg', v)} decimals={0} />
        <Slider label="Extracciones a graficar (n)" value={st.nMax} min={1} max={5} step={1} onChange={(v) => set('nMax', v)} decimals={0} />

        <ResultCard items={[
          { label: `D a pH ${st.pH.toFixed(1)}`, value: D1cur >= 0.001 ? D1cur.toFixed(3) : D1cur.toExponential(2) },
          { label: `log D`, value: D1cur > 0 ? Math.log10(D1cur).toFixed(2) : '< −10' },
          { label: `%E (1 extracción, Vorg/Vaq = ${(r).toFixed(1)})`, value: `${pE1cur.toFixed(1)} %` },
          { label: 'Extracciones para %E ≥ 99 %', value: n99_1 !== null ? `${n99_1}` : '> 100' },
          ...(st.showA2 ? [
            { label: `%E — ${st.a2.label}`, value: `${pE2cur.toFixed(1)} %` },
            { label: 'Factor separación D₁/D₂', value: D2cur > 0 ? (D1cur / D2cur).toFixed(2) : '∞' },
          ] : []),
        ]} />

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
            <strong>Extracciones múltiples</strong>: con el mismo volumen total de disolvente
            orgánico es más eficiente hacer varias extracciones pequeñas que una sola grande
            (teorema de Craig).
          </p>
        </InfoBox>
      </aside>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="logd" />
      </section>
    </div>
  );
}
