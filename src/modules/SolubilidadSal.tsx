import { useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConstantList, InfoBox, LabelField, ModelBadge, ResultCard, Slider, Toggle,
} from '../components/Controls';
import { alphaFractions } from '../lib/equilibrium';

// ── Base de datos ──────────────────────────────────────────────────────────────

interface Preset {
  id: string;
  name: string;
  anionName: string;
  pKsp: number;
  p: number;
  q: number;
  pKas: number[];
  color: string;
}

const PRESETS: Preset[] = [
  { id: 'caco3',   name: 'CaCO₃',      anionName: 'CO₃²⁻',  pKsp: 8.48,  p: 1, q: 1, pKas: [6.35, 10.33],       color: '#0072B2' },
  { id: 'mgco3',   name: 'MgCO₃',      anionName: 'CO₃²⁻',  pKsp: 7.46,  p: 1, q: 1, pKas: [6.35, 10.33],       color: '#56B4E9' },
  { id: 'caf2',    name: 'CaF₂',       anionName: 'F⁻',     pKsp: 10.40, p: 1, q: 2, pKas: [3.17],               color: '#E69F00' },
  { id: 'ca3po4',  name: 'Ca₃(PO₄)₂', anionName: 'PO₄³⁻',  pKsp: 28.92, p: 3, q: 2, pKas: [2.15, 7.20, 12.35], color: '#009E73' },
  { id: 'mg3po4',  name: 'Mg₃(PO₄)₂', anionName: 'PO₄³⁻',  pKsp: 23.28, p: 3, q: 2, pKas: [2.15, 7.20, 12.35], color: '#CC79A7' },
  { id: 'ag3po4',  name: 'Ag₃PO₄',    anionName: 'PO₄³⁻',  pKsp: 17.55, p: 3, q: 1, pKas: [2.15, 7.20, 12.35], color: '#F0A500' },
  { id: 'ag2cro4', name: 'Ag₂CrO₄',   anionName: 'CrO₄²⁻', pKsp: 11.89, p: 2, q: 1, pKas: [6.51],               color: '#D55E00' },
  { id: 'baso4',   name: 'BaSO₄',      anionName: 'SO₄²⁻',  pKsp: 9.97,  p: 1, q: 1, pKas: [1.99],               color: '#888888' },
  { id: 'pbso4',   name: 'PbSO₄',      anionName: 'SO₄²⁻',  pKsp: 7.79,  p: 1, q: 1, pKas: [1.99],               color: '#555555' },
  { id: 'agcl',    name: 'AgCl',        anionName: 'Cl⁻',    pKsp: 9.74,  p: 1, q: 1, pKas: [],                   color: '#999999' },
];

// ── Estado editable ────────────────────────────────────────────────────────────

interface SalState {
  name: string;
  anionName: string;
  pKsp: number;
  p: number;
  q: number;
  pKas: number[];
  color: string;
}

function fromPreset(id: string): SalState {
  const p = PRESETS.find((x) => x.id === id)!;
  return { name: p.name, anionName: p.anionName, pKsp: p.pKsp, p: p.p, q: p.q, pKas: [...p.pKas], color: p.color };
}

const DEFAULT1 = 'agcl';
const DEFAULT2 = 'ca3po4';

// ── Funciones de cálculo ───────────────────────────────────────────────────────

function computeLogS(pH: number, s: SalState): number {
  const h = Math.pow(10, -pH);
  const Ksp = Math.pow(10, -s.pKsp);
  const alphaN = s.pKas.length === 0
    ? 1
    : (() => { const a = alphaFractions(h, s.pKas); return a[a.length - 1]; })();
  if (alphaN <= 0) return -Infinity;
  const coeff = Math.pow(s.p, s.p) * Math.pow(s.q, s.q);
  const S = Math.pow(Ksp / (coeff * Math.pow(alphaN, s.q)), 1 / (s.p + s.q));
  return Math.log10(S);
}

function buildCurve(s: SalState, points = 400) {
  const pHs: number[] = [], logS: number[] = [];
  for (let i = 0; i <= points; i++) {
    const pH = (14 * i) / points;
    const ls = computeLogS(pH, s);
    pHs.push(pH);
    logS.push(Number.isFinite(ls) ? Math.max(ls, -40) : -40);
  }
  return { pHs, logS };
}

function buildAlphaCurve(pKas: number[], points = 400) {
  const pHs: number[] = [];
  const alphaTraces: number[][] = Array.from({ length: pKas.length + 1 }, () => []);
  for (let i = 0; i <= points; i++) {
    const pH = (14 * i) / points;
    const h = Math.pow(10, -pH);
    const alphas = pKas.length === 0 ? [1] : alphaFractions(h, pKas);
    pHs.push(pH);
    alphas.forEach((a, j) => alphaTraces[j]?.push(a));
  }
  return { pHs, alphaTraces };
}

// ── Sub-editor ─────────────────────────────────────────────────────────────────

function SalEditor({ title, color, sal, onChange }: {
  title: string;
  color: string;
  sal: SalState;
  onChange: (patch: Partial<SalState>) => void;
}) {
  const activePreset = PRESETS.find(
    (p) => p.name === sal.name && p.pKsp === sal.pKsp && p.p === sal.p && p.q === sal.q,
  );

  return (
    <div className="editor">
      <p className="editor-title" style={{ color }}>{title}</p>

      {/* Chips de preset */}
      <div className="preset-chip-row" style={{ marginBottom: 8 }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className={`preset-chip${activePreset?.id === p.id ? ' active' : ''}`}
            style={{ borderColor: p.color }}
            onClick={() => onChange(fromPreset(p.id))}
          >
            {p.name}
          </button>
        ))}
      </div>

      <LabelField label="Nombre del sólido" value={sal.name} onChange={(name) => onChange({ name })} />
      <LabelField label="Nombre del anión" value={sal.anionName} onChange={(anionName) => onChange({ anionName })} />
      <Slider label="pKps" value={sal.pKsp} min={1} max={40} step={0.01} onChange={(pKsp) => onChange({ pKsp })} decimals={2} />

      <div className="control">
        <div className="control-header">
          <span className="control-label">Estequiometría p (catión)</span>
          <span className="control-value">{sal.p}</span>
        </div>
        <div className="segmented" style={{ marginTop: 4 }}>
          {[1, 2, 3].map((n) => (
            <button key={n} className={sal.p === n ? 'seg-btn active' : 'seg-btn'} onClick={() => onChange({ p: n })}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="control">
        <div className="control-header">
          <span className="control-label">Estequiometría q (anión)</span>
          <span className="control-value">{sal.q}</span>
        </div>
        <div className="segmented" style={{ marginTop: 4 }}>
          {[1, 2, 3].map((n) => (
            <button key={n} className={sal.q === n ? 'seg-btn active' : 'seg-btn'} onClick={() => onChange({ q: n })}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <ConstantList
        prefix="pKa (anión)"
        values={sal.pKas}
        onChange={(pKas) => onChange({ pKas })}
        min={0} max={14} maxItems={4} minItems={0} initialValue={7}
      />
      {sal.pKas.length > 0 && (
        <button className="mini-btn" style={{ marginTop: 2 }} onClick={() => onChange({ pKas: [] })}>
          Anión de ácido fuerte (sin pKa)
        </button>
      )}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────────

const ALPHA_COLORS = ['#e74c3c', '#e67e22', '#27ae60', '#2980b9', '#8e44ad'];

export default function SolubilidadSal() {
  const [sal1, setSal1] = useState<SalState>(fromPreset(DEFAULT1));
  const [showP2, setShowP2] = useState(false);
  const [sal2, setSal2] = useState<SalState>(fromPreset(DEFAULT2));

  function reset() {
    setSal1(fromPreset(DEFAULT1));
    setSal2(fromPreset(DEFAULT2));
    setShowP2(false);
  }

  const curve1 = useMemo(() => buildCurve(sal1), [sal1]);
  const curve2 = useMemo(() => (showP2 ? buildCurve(sal2) : null), [sal2, showP2]);
  const alphaCurve = useMemo(() => buildAlphaCurve(sal1.pKas), [sal1.pKas]);

  const yRange = useMemo<[number, number]>(() => {
    const all = [...curve1.logS, ...(curve2?.logS ?? [])].filter(Number.isFinite);
    return [Math.max(Math.floor(Math.min(...all)) - 0.5, -35), Math.min(Math.ceil(Math.max(...all)) + 0.5, 2)];
  }, [curve1, curve2]);

  const minS1 = useMemo(() => {
    const idx = curve1.logS.indexOf(Math.min(...curve1.logS));
    return { logS: curve1.logS[idx], pH: curve1.pHs[idx] };
  }, [curve1]);

  const solTraces = useMemo<Data[]>(() => {
    const out: Data[] = [{
      x: curve1.pHs, y: curve1.logS, type: 'scatter', mode: 'lines',
      name: sal1.name, line: { width: 3, color: sal1.color },
      hovertemplate: `pH=%{x:.2f}<br>log S=%{y:.2f}<extra>${sal1.name}</extra>`,
    }];
    if (curve2) out.push({
      x: curve2.pHs, y: curve2.logS, type: 'scatter', mode: 'lines',
      name: sal2.name, line: { width: 2.5, color: sal2.color, dash: 'dot' },
      hovertemplate: `pH=%{x:.2f}<br>log S=%{y:.2f}<extra>${sal2.name}</extra>`,
    });
    return out;
  }, [curve1, curve2, sal1, sal2, showP2]);

  const alphaTraces = useMemo<Data[]>(() => {
    const n = sal1.pKas.length + 1;
    const labels =
      n === 1 ? [sal1.anionName] :
      n === 2 ? [`H${sal1.anionName}`, sal1.anionName] :
      n === 3 ? [`H₂${sal1.anionName}`, `H${sal1.anionName}`, sal1.anionName] :
                [`H₃${sal1.anionName}`, `H₂${sal1.anionName}`, `H${sal1.anionName}`, sal1.anionName];
    return alphaCurve.alphaTraces.map((trace, i) => ({
      x: alphaCurve.pHs, y: trace, type: 'scatter', mode: 'lines',
      name: labels[i] ?? `α${i}`,
      line: { width: 2.5, color: ALPHA_COLORS[i % ALPHA_COLORS.length] },
      hovertemplate: `pH=%{x:.2f}<br>α=%{y:.3f}<extra>${labels[i] ?? `α${i}`}</extra>`,
    } as Data));
  }, [alphaCurve, sal1]);

  return (
    <div className="module">
      <aside className="panel">
        <div className="panel-header">
          <h2>Solubilidad y pH</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>

        <ModelBadge
          model={sal1.pKas.length === 0 ? 'solubilidad intrínseca' : 'solubilidad condicionada por pH'}
          additions={[showP2 && 'comparación entre sistemas']}
        />
        <SalEditor title="Sistema 1" color={sal1.color} sal={sal1} onChange={(p) => setSal1((s) => ({ ...s, ...p }))} />

        <Toggle label="Comparar con 2.º sistema" checked={showP2} onChange={setShowP2} />
        {showP2 && (
          <div className="mask-section">
            <SalEditor title="Sistema 2" color={sal2.color} sal={sal2} onChange={(p) => setSal2((s) => ({ ...s, ...p }))} />
          </div>
        )}

        <ResultCard items={[
          { label: `S mínima — ${sal1.name}`, value: `log S = ${minS1.logS.toFixed(2)}  (pH ${minS1.pH.toFixed(1)})` },
          { label: 'Fórmula (p, q)', value: `M_${sal1.p} A_${sal1.q}  →  S = (Kps / ${sal1.p ** sal1.p}·${sal1.q ** sal1.q}·αₙ^${sal1.q})^{1/${sal1.p + sal1.q}}` },
        ]} />

        <InfoBox title="Solubilidad condicional de sales">
          <p>
            Para M_p A_q: <code>S = (Kps / (p^p·q^q·αₙ^q))^(1/(p+q))</code>
          </p>
          <p>
            αₙ = fracción del anión totalmente desprotonado. A pH ácido αₙ↓ → S↑.
            PO₄³⁻ &gt; CO₃²⁻ &gt; F⁻ &gt; SO₄²⁻ en sensibilidad al pH.
            Anión de ácido fuerte (Cl⁻): α=1 siempre → sin dependencia de pH.
          </p>
        </InfoBox>
      </aside>

      <section className="plot-area">
        <DiagramTabs tabs={[
          {
            id: 'logs',
            label: 'log S = f(pH)',
            node: (
              <Chart
                data={solTraces}
                xTitle="pH"
                yTitle="log S  (mol L⁻¹)"
                xRange={[0, 14]}
                yRange={yRange}
                exportName="quimeq-sol-sal"
              />
            ),
          },
          {
            id: 'alpha',
            label: `Distribución α — ${sal1.anionName}`,
            node: sal1.pKas.length === 0 ? (
              <div className="empty-plot">
                <p>El anión {sal1.anionName} es la base conjugada de un ácido fuerte.</p>
                <p className="hint">α = 1 en todo el rango de pH → solubilidad independiente del pH.</p>
              </div>
            ) : (
              <Chart
                data={alphaTraces}
                xTitle="pH"
                yTitle="Fracción molar α"
                xRange={[0, 14]}
                yRange={[0, 1]}
                exportName="quimeq-sol-sal-alpha"
              />
            ),
          },
        ]} />
      </section>
    </div>
  );
}
