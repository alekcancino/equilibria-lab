import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, DbPanel, InfoBox, LabelField, ModelBadge, PanelSection,
  ResultCard, ResultCardRow, Slider,
} from '../components/Controls';
import {
  competitiveEquilibrium, competitiveSweep, pAgAtFraction, separationWindow,
  type CompetitiveSalt,
} from '../lib/solubilityCompetitive';
import { formatMolar } from '../lib/format';

/** p-function name from an ion label: pAg from Ag⁺ (charges dropped — the
 * p-notation applies to the ion's concentration, pAg = −log[Ag⁺]). */
function pIon(label: string): string {
  return `p${(label || 'M').replace(/[⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+$/u, '')}`;
}

const C1 = '#0072B2';
const C2 = '#D55E00';
const C_OP = '#CC79A7';
const C_WIN = 'rgba(39,174,96,0.12)';

interface Preset {
  id: string;
  cation: string;
  s1: CompetitiveSalt;
  s2: CompetitiveSalt;
  reference: string;
}

const PRESETS: Preset[] = [
  {
    id: 'clbr', cation: 'Ag⁺',
    s1: { label: 'Cl⁻', pKsp: 9.74, cX: 0.01 },
    s2: { label: 'Br⁻', pKsp: 12.30, cX: 0.01 },
    reference: 'Harris — AgCl/AgBr',
  },
  {
    id: 'bri', cation: 'Ag⁺',
    s1: { label: 'Br⁻', pKsp: 12.30, cX: 0.01 },
    s2: { label: 'I⁻', pKsp: 16.07, cX: 0.01 },
    reference: 'Harris — AgBr/AgI',
  },
  {
    id: 'cli', cation: 'Ag⁺',
    s1: { label: 'Cl⁻', pKsp: 9.74, cX: 0.01 },
    s2: { label: 'I⁻', pKsp: 16.07, cX: 0.01 },
    reference: 'Harris — AgCl/AgI',
  },
];

/** Competitive precipitation of two 1:1 salts sharing a cation (fractional precipitation). */
export default function PrecipitacionCompetitiva() {
  const [cation, setCation] = useState('Ag⁺');
  const [label1, setLabel1] = useState('Cl⁻');
  const [pKsp1, setPKsp1] = useState(9.74);
  const [cX1, setCX1] = useState(0.01);
  const [label2, setLabel2] = useState('Br⁻');
  const [pKsp2, setPKsp2] = useState(12.30);
  const [cX2, setCX2] = useState(0.01);
  const [cM, setCM] = useState(0.015);
  const [quantPct, setQuantPct] = useState(99.9);

  useShareEffect('solcomp', { cation, label1, pKsp1, cX1, label2, pKsp2, cX2, cM, quantPct }, (s) => {
    if (s.cation) setCation(s.cation);
    if (s.label1) setLabel1(s.label1);
    // Positivity/finite guards mirror ConcSlider's own commit validation — a
    // crafted URL with cX = 0 would otherwise produce log10(0) axis ranges.
    if (typeof s.pKsp1 === 'number' && Number.isFinite(s.pKsp1)) setPKsp1(s.pKsp1);
    if (typeof s.cX1 === 'number' && s.cX1 > 0) setCX1(s.cX1);
    if (s.label2) setLabel2(s.label2);
    if (typeof s.pKsp2 === 'number' && Number.isFinite(s.pKsp2)) setPKsp2(s.pKsp2);
    if (typeof s.cX2 === 'number' && s.cX2 > 0) setCX2(s.cX2);
    if (typeof s.cM === 'number' && s.cM > 0) setCM(s.cM);
    if (typeof s.quantPct === 'number' && s.quantPct > 0 && s.quantPct < 100) setQuantPct(s.quantPct);
  });

  function loadPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id)!;
    setCation(p.cation);
    setLabel1(p.s1.label); setPKsp1(p.s1.pKsp); setCX1(p.s1.cX);
    setLabel2(p.s2.label); setPKsp2(p.s2.pKsp); setCX2(p.s2.cX);
  }

  function reset() {
    loadPreset('clbr');
    setCM(0.015);
    setQuantPct(99.9);
  }

  const s1: CompetitiveSalt = useMemo(() => ({ label: label1, pKsp: pKsp1, cX: cX1 }), [label1, pKsp1, cX1]);
  const s2: CompetitiveSalt = useMemo(() => ({ label: label2, pKsp: pKsp2, cX: cX2 }), [label2, pKsp2, cX2]);

  const win = useMemo(() => separationWindow(s1, s2, quantPct / 100), [s1, s2, quantPct]);
  const first = win.firstIdx === 0 ? s1 : s2;
  const second = win.firstIdx === 0 ? s2 : s1;

  const eq = useMemo(() => competitiveEquilibrium(cM, s1, s2), [cM, s1, s2]);

  // pM axis spans from past-quantitative to before the first onset.
  const onsetFirst = pAgAtFraction(first.pKsp, first.cX, 0);
  const pMin = Math.min(win.pAgQuant, win.pAgSecondOnset) - 1.5;
  const pMax = onsetFirst + 1.5;

  const sweep = useMemo(() => competitiveSweep(s1, s2, [pMin, pMax], 500), [s1, s2, pMin, pMax]);

  const exportMetadata = useMemo(() => ({
    Módulo: 'Precipitación competitiva',
    'Ion común': cation,
    [`pKps (${cation}/${label1})`]: pKsp1.toFixed(2),
    [`pKps (${cation}/${label2})`]: pKsp2.toFixed(2),
    'cX1 / M': cX1.toFixed(4),
    'cX2 / M': cX2.toFixed(4),
    'cM añadido / M': cM.toFixed(4),
    'Objetivo de cuantitatividad': `${quantPct.toFixed(2)} %`,
  }), [cation, label1, pKsp1, label2, pKsp2, cX1, cX2, cM, quantPct]);

  const windowShapes = useMemo<Partial<Shape>[]>(() => {
    const shapes: Partial<Shape>[] = [];
    if (win.ok) {
      shapes.push({
        type: 'rect', x0: win.pAgSecondOnset, x1: win.pAgQuant, y0: 0, y1: 1,
        yref: 'paper', fillcolor: C_WIN, line: { width: 0 },
      });
    }
    if (Number.isFinite(eq.pAg)) {
      shapes.push({
        type: 'line', x0: eq.pAg, x1: eq.pAg, y0: 0, y1: 1, yref: 'paper',
        line: { color: C_OP, width: 2, dash: 'dashdot' },
      });
    }
    return shapes;
  }, [win, eq.pAg]);

  const pctTraces = useMemo<Data[]>(() => [
    {
      x: sweep.map((p) => p.pAg), y: sweep.map((p) => (p.p1 / s1.cX) * 100),
      type: 'scatter', mode: 'lines', name: `% ${label1} precipitado`,
      line: { width: 3, color: C1 },
      hovertemplate: `${pIon(cation)} = %{x:.2f}<br>%{y:.2f} %<extra>${label1}</extra>`,
    },
    {
      x: sweep.map((p) => p.pAg), y: sweep.map((p) => (p.p2 / s2.cX) * 100),
      type: 'scatter', mode: 'lines', name: `% ${label2} precipitado`,
      line: { width: 3, color: C2 },
      hovertemplate: `${pIon(cation)} = %{x:.2f}<br>%{y:.2f} %<extra>${label2}</extra>`,
    },
  ], [sweep, s1.cX, s2.cX, label1, label2, cation]);

  const logXTraces = useMemo<Data[]>(() => [
    {
      x: sweep.map((p) => p.pAg), y: sweep.map((p) => Math.log10(Math.max(p.freeX1, 1e-30))),
      type: 'scatter', mode: 'lines', name: `log [${label1}]`,
      line: { width: 3, color: C1 },
    },
    {
      x: sweep.map((p) => p.pAg), y: sweep.map((p) => Math.log10(Math.max(p.freeX2, 1e-30))),
      type: 'scatter', mode: 'lines', name: `log [${label2}]`,
      line: { width: 3, color: C2 },
    },
  ], [sweep, label1, label2]);

  const phaseLabel = {
    ninguna: 'sin precipitados',
    sal1: `solo la sal de ${label1}`,
    sal2: `solo la sal de ${label2}`,
    ambas: 'ambas sales presentes',
  }[eq.phases];

  const diagrams = [
    {
      id: 'pct',
      label: '% precipitado',
      node: (
        <Chart
          data={pctTraces}
          xTitle={`${pIon(cation)} (−log[${cation}]) — añadir ${cation} avanza hacia la derecha`}
          yTitle="% precipitado"
          xRange={[pMax, pMin]}
          yRange={[0, 102]}
          shapes={windowShapes}
          exportName="equilibria-solcomp-pct"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'logx',
      label: 'log [X] libre',
      node: (
        <Chart
          data={logXTraces}
          xTitle={`${pIon(cation)} (−log[${cation}])`}
          yTitle="log [X] libre"
          xRange={[pMax, pMin]}
          yRange={[-12, 0.5]}
          shapes={windowShapes}
          exportName="equilibria-solcomp-logx"
          exportMetadata={exportMetadata}
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title="Precipitación competitiva" onReset={reset} moduleId="solcomp">
        <PanelSection title="Sistema" icon="⚛">
          <ModelBadge
            model="dos sales 1:1 con catión común — selección de fases por prueba de combinaciones"
            additions={[win.ok && 'ventana de separación cuantitativa']}
          />
          <LabelField label="Ion común (catión)" value={cation} onChange={setCation} />
          <LabelField label="Anión 1" value={label1} onChange={setLabel1} />
          <Slider label={`pKps (${cation}/${label1})`} value={pKsp1} min={2} max={20} step={0.01} onChange={setPKsp1} decimals={2} />
          <ConcSlider label={`Concentración de ${label1}`} value={cX1} onChange={setCX1} />
          <LabelField label="Anión 2" value={label2} onChange={setLabel2} />
          <Slider label={`pKps (${cation}/${label2})`} value={pKsp2} min={2} max={20} step={0.01} onChange={setPKsp2} decimals={2} />
          <ConcSlider label={`Concentración de ${label2}`} value={cX2} onChange={setCX2} />
          <DbPanel
            title="Ejemplos de la base de datos"
            items={PRESETS.map((p) => ({
              id: p.id,
              label: `${p.cation}: ${p.s1.label} / ${p.s2.label}`,
              detail: `pKsp ${p.s1.pKsp.toFixed(2)} / ${p.s2.pKsp.toFixed(2)} · ${p.reference}`,
            }))}
            onSelect={loadPreset}
          />
        </PanelSection>

        <PanelSection title="Condiciones" icon="⚗">
          <ConcSlider label={`${cation} total añadido (cM)`} value={cM} onChange={setCM} />
          <p className="hint">
            El punto de operación (línea rosa) se resuelve con cM total: qué fases existen
            se decide probando las combinaciones (ninguna / sal 1 / sal 2 / ambas) y
            aceptando la única termodinámicamente consistente.
          </p>
          <Slider
            label="Objetivo de cuantitatividad"
            value={quantPct}
            min={90}
            max={99.999}
            step={0.001}
            onChange={setQuantPct}
            decimals={3}
            unit="%"
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <button className="preset-chip" onClick={() => setQuantPct(99)}>
              99 %
            </button>
            <button className="preset-chip" onClick={() => setQuantPct(99.9)}>
              99.9 % (Harris)
            </button>
            <button className="preset-chip" onClick={() => setQuantPct(99.99)}>
              99.99 %
            </button>
          </div>
          <p className="hint">
            % de la primera sal que debe haber precipitado para considerar la separación
            cuantitativa — define el borde derecho de la ventana verde.
          </p>
        </PanelSection>

        <PanelSection title="Resultado" icon="∑">
          <ResultCard items={[
            {
              label: 'Precipita primero',
              value: `sal de ${first.label} (${pIon(cation)} ${pAgAtFraction(first.pKsp, first.cX, 0).toFixed(2)})`,
            },
            {
              label: `Inicio de la sal de ${second.label}`,
              value: `${pIon(cation)} ${win.pAgSecondOnset.toFixed(2)}`,
            },
            {
              label: `${first.label} residual al iniciar la 2.ª sal`,
              value: `${(win.residualFrac * 100).toPrecision(3)} %`,
            },
            {
              label: `Separación cuantitativa (${quantPct.toFixed(2)} %)`,
              value: win.ok
                ? `sí · ventana ${pIon(cation)} ${win.pAgSecondOnset.toFixed(2)}–${win.pAgQuant.toFixed(2)}`
                : `no — la 2.ª sal arranca antes del ${quantPct.toFixed(2)} %`,
            },
          ]} />
        </PanelSection>

        <InfoBox title="Cómo leer este módulo">
          <p>
            <strong>Precipitación fraccionada</strong>: al añadir {cation}, {pIon(cation)} baja
            (el eje avanza hacia la derecha) y precipita primero la sal que necesita menos catión
            ({pIon(cation)} de inicio = pKps + log cX).
          </p>
          <p>
            <strong>Ventana de separación</strong> (franja verde): entre el {quantPct.toFixed(2)} % de
            la primera sal y el inicio de la segunda. El residuo de la primera cuando arranca
            la segunda es Kps₁·cX₂/(Kps₂·cX₁) — independiente de cuánto catión se añada, y de
            dónde se fije el objetivo de cuantitatividad.
          </p>
          <p>
            <strong>Alcance</strong>: sales 1:1 con actividades ≈ concentraciones; sin
            complejos solubles del catión (p. ej. AgCl₂⁻ a Cl⁻ alto queda fuera del modelo).
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="pct" />
        <ResultCardRow items={[
          { label: 'Fases en el punto de operación', value: phaseLabel, accent: true },
          { label: `${pIon(cation)} operación`, value: Number.isFinite(eq.pAg) ? eq.pAg.toFixed(2) : '—' },
          { label: `% ${label1} precipitado`, value: `${((eq.p1 / cX1) * 100).toFixed(1)} %` },
          { label: `% ${label2} precipitado`, value: `${((eq.p2 / cX2) * 100).toFixed(1)} %` },
          { label: `[${label1}] libre`, value: formatMolar(eq.freeX1) },
          { label: `[${label2}] libre`, value: formatMolar(eq.freeX2) },
        ]} />
      </section>
    </div>
  );
}
