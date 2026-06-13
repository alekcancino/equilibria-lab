import { useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import DiagramTabs from '../components/DiagramTabs';
import { InfoBox, ResultCard, Slider, Toggle } from '../components/Controls';
import { alphaFractions } from '../lib/equilibrium';

// ── Base de datos ──────────────────────────────────────────────────────────────

interface Preset {
  id: string;
  name: string;
  formula: string;       // fórmula del sólido
  anionName: string;     // nombre del anión base conjugada
  pKsp: number;
  p: number;             // estequiometría catión
  q: number;             // estequiometría anión
  pKas: number[];        // pKa del ácido conjugado del anión (vacío = fuerte → α=1 siempre)
  color: string;
}

const PRESETS: Preset[] = [
  { id: 'caco3',   name: 'CaCO₃',      formula: 'CaCO₃',      anionName: 'CO₃²⁻',  pKsp: 8.48,  p: 1, q: 1, pKas: [6.35, 10.33], color: '#0072B2' },
  { id: 'mgco3',   name: 'MgCO₃',      formula: 'MgCO₃',      anionName: 'CO₃²⁻',  pKsp: 7.46,  p: 1, q: 1, pKas: [6.35, 10.33], color: '#56B4E9' },
  { id: 'caf2',    name: 'CaF₂',       formula: 'CaF₂',       anionName: 'F⁻',     pKsp: 10.40, p: 1, q: 2, pKas: [3.17],         color: '#E69F00' },
  { id: 'ca3po4',  name: 'Ca₃(PO₄)₂', formula: 'Ca₃(PO₄)₂', anionName: 'PO₄³⁻',  pKsp: 28.92, p: 3, q: 2, pKas: [2.15, 7.20, 12.35], color: '#009E73' },
  { id: 'mg3po4',  name: 'Mg₃(PO₄)₂', formula: 'Mg₃(PO₄)₂', anionName: 'PO₄³⁻',  pKsp: 23.28, p: 3, q: 2, pKas: [2.15, 7.20, 12.35], color: '#CC79A7' },
  { id: 'ag3po4',  name: 'Ag₃PO₄',    formula: 'Ag₃PO₄',    anionName: 'PO₄³⁻',  pKsp: 17.55, p: 3, q: 1, pKas: [2.15, 7.20, 12.35], color: '#F0A500' },
  { id: 'ag2cro4', name: 'Ag₂CrO₄',   formula: 'Ag₂CrO₄',   anionName: 'CrO₄²⁻', pKsp: 11.89, p: 2, q: 1, pKas: [6.51],         color: '#D55E00' },
  { id: 'baso4',   name: 'BaSO₄',      formula: 'BaSO₄',      anionName: 'SO₄²⁻',  pKsp: 9.97,  p: 1, q: 1, pKas: [1.99],         color: '#888888' },
  { id: 'pbso4',   name: 'PbSO₄',      formula: 'PbSO₄',      anionName: 'SO₄²⁻',  pKsp: 7.79,  p: 1, q: 1, pKas: [1.99],         color: '#555555' },
  { id: 'agcl',    name: 'AgCl',        formula: 'AgCl',        anionName: 'Cl⁻',    pKsp: 9.74,  p: 1, q: 1, pKas: [],             color: '#999999' },
];

// ── Funciones de cálculo ───────────────────────────────────────────────────────

/** log₁₀ S del sólido M_p A_q a un pH dado.
 *  S = (Ksp / (p^p · q^q · αN^q))^(1/(p+q))
 *  αN es la fracción de anión totalmente desprotonado.
 */
function computeLogS(pH: number, preset: Preset): number {
  const h = Math.pow(10, -pH);
  const Ksp = Math.pow(10, -preset.pKsp);
  let alphaN: number;
  if (preset.pKas.length === 0) {
    alphaN = 1; // anión de ácido fuerte → siempre libre
  } else {
    const alphas = alphaFractions(h, preset.pKas);
    alphaN = alphas[alphas.length - 1]; // fracción totalmente desprotonada
  }
  if (alphaN <= 0) return -Infinity;
  const coeff = Math.pow(preset.p, preset.p) * Math.pow(preset.q, preset.q);
  const S = Math.pow(Ksp / (coeff * Math.pow(alphaN, preset.q)), 1 / (preset.p + preset.q));
  return Math.log10(S);
}

function buildCurve(preset: Preset, points = 400): { pHs: number[]; logS: number[] } {
  const pHs: number[] = [];
  const logS: number[] = [];
  for (let i = 0; i <= points; i++) {
    const pH = (14 * i) / points;
    const ls = computeLogS(pH, preset);
    pHs.push(pH);
    logS.push(Number.isFinite(ls) ? Math.max(ls, -40) : -40);
  }
  return { pHs, logS };
}

function buildAlphaCurve(
  pKas: number[],
  points = 400,
): { pHs: number[]; alphaTraces: number[][] } {
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

// ── Componente ─────────────────────────────────────────────────────────────────

export default function SolubilidadSal() {
  const [id1, setId1] = useState('caco3');
  const [showP2, setShowP2] = useState(true);
  const [id2, setId2] = useState('ca3po4');

  const p1 = PRESETS.find((p) => p.id === id1)!;
  const p2 = PRESETS.find((p) => p.id === id2)!;

  const curve1 = useMemo(() => buildCurve(p1), [p1]);
  const curve2 = useMemo(() => (showP2 ? buildCurve(p2) : null), [p2, showP2]);

  // α del anión de p1 para la segunda pestaña
  const alphaCurve = useMemo(() => buildAlphaCurve(p1.pKas), [p1.pKas]);

  // Rango Y dinámico
  const yRange = useMemo<[number, number]>(() => {
    const all = [...curve1.logS, ...(curve2?.logS ?? [])].filter(Number.isFinite);
    const lo = Math.floor(Math.min(...all)) - 0.5;
    const hi = Math.ceil(Math.max(...all)) + 0.5;
    return [Math.max(lo, -35), Math.min(hi, 2)];
  }, [curve1, curve2]);

  // pH de mínima solubilidad para cada sistema
  const minS1 = useMemo(() => {
    const idx = curve1.logS.indexOf(Math.min(...curve1.logS));
    return { logS: curve1.logS[idx], pH: curve1.pHs[idx] };
  }, [curve1]);

  // ── Trazas ────────────────────────────────────────────────────────────────────

  const ALPHA_COLORS = ['#e74c3c', '#e67e22', '#27ae60', '#2980b9', '#8e44ad'];
  const ALPHA_LABELS_SUFFIX = ['H₃A', 'H₂A⁻', 'HA²⁻', 'A³⁻'];

  const solTraces = useMemo<Data[]>(() => {
    const out: Data[] = [{
      x: curve1.pHs, y: curve1.logS, type: 'scatter', mode: 'lines',
      name: p1.formula,
      line: { width: 3, color: p1.color },
      hovertemplate: `pH=%{x:.2f}<br>log S=%{y:.2f}<extra>${p1.formula}</extra>`,
    }];
    if (curve2) {
      out.push({
        x: curve2.pHs, y: curve2.logS, type: 'scatter', mode: 'lines',
        name: p2.formula,
        line: { width: 2.5, color: p2.color, dash: 'dot' },
        hovertemplate: `pH=%{x:.2f}<br>log S=%{y:.2f}<extra>${p2.formula}</extra>`,
      });
    }
    return out;
  }, [curve1, curve2, p1, p2, showP2]);

  const alphaTraces = useMemo<Data[]>(() => {
    const nSpecies = p1.pKas.length + 1;
    // Build labels: for 1 pKa → [HA, A⁻]; for 2 → [H₂A, HA⁻, A²⁻]; etc.
    const labels = nSpecies === 1
      ? [p1.anionName]
      : nSpecies === 2
        ? [`H${p1.anionName}`, p1.anionName]
        : nSpecies === 3
          ? [`H₂${p1.anionName}`, `H${p1.anionName}`, p1.anionName]
          : ALPHA_LABELS_SUFFIX.slice(0, nSpecies).map((s, i) => i === nSpecies - 1 ? p1.anionName : s);

    return alphaCurve.alphaTraces.map((trace, i) => ({
      x: alphaCurve.pHs,
      y: trace,
      type: 'scatter',
      mode: 'lines',
      name: labels[i] ?? `α${i}`,
      line: { width: 2.5, color: ALPHA_COLORS[i % ALPHA_COLORS.length] },
      hovertemplate: `pH=%{x:.2f}<br>α=%{y:.3f}<extra>${labels[i] ?? `α${i}`}</extra>`,
    } as Data));
  }, [alphaCurve, p1]);

  const resultItems = [
    { label: `S mínima de ${p1.formula}`, value: `log S = ${minS1.logS.toFixed(2)}  (pH ${minS1.pH.toFixed(1)})` },
    ...(p1.pKas.length === 0 ? [{ label: 'Dependencia del pH', value: 'Ninguna (anión de ácido fuerte)' }] : []),
  ];

  return (
    <div className="module">
      <aside className="panel">
        <h2>Solubilidad y pH</h2>

        <div className="control">
          <span className="control-label">Sistema 1</span>
          <div className="preset-chip-row" style={{ marginTop: 6 }}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={`preset-chip${id1 === p.id ? ' active' : ''}`}
                style={{ borderColor: p.color }}
                onClick={() => setId1(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <Toggle label="Comparar con 2.º sistema" checked={showP2} onChange={setShowP2} />
        {showP2 && (
          <div className="mask-section control">
            <span className="control-label">Sistema 2</span>
            <div className="preset-chip-row" style={{ marginTop: 6 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`preset-chip${id2 === p.id ? ' active' : ''}`}
                  style={{ borderColor: p.color }}
                  onClick={() => setId2(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <ResultCard items={resultItems} />

        <InfoBox title="Solubilidad condicional de sales">
          <p>
            Para M_p A_q, la solubilidad depende del pH porque el anión A^n⁻ se protona:
          </p>
          <p>
            <code>S = (Kps / (p^p · q^q · αₙ^q))^(1/(p+q))</code>
          </p>
          <p>
            αₙ = fracción del anión totalmente desprotonado. A pH ácido αₙ↓ → S↑.
            Cuantos más pKa tenga el anión (fosfato &gt; carbonato &gt; fluoruro &gt;
            sulfato), mayor es la pendiente de solubilidad con el pH.
          </p>
          <p>
            El <strong>sulfato</strong> (pKa₁=1.99) y el <strong>cloruro</strong>
            (ácido fuerte, αCl=1) son casi independientes del pH en condiciones normales.
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
                yTitle="log S  (molL⁻¹)"
                xRange={[0, 14]}
                yRange={yRange}
                exportName="quimeq-sol-sal"
              />
            ),
          },
          {
            id: 'alpha',
            label: `Distribución α — ${p1.anionName}`,
            node: p1.pKas.length === 0 ? (
              <div className="empty-plot">
                <p>El anión {p1.anionName} es la base conjugada de un ácido fuerte.</p>
                <p className="hint">α = 1 en todo el rango de pH → la solubilidad no depende del pH.</p>
              </div>
            ) : (
              <Chart
                data={alphaTraces}
                xTitle="pH"
                yTitle="Fracción molar α"
                xRange={[0, 14]}
                yRange={[0, 1]}
                showLegend
                exportName="quimeq-sol-sal-alpha"
              />
            ),
          },
        ]} />
      </section>
    </div>
  );
}
