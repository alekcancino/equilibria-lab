import { useMemo, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import DUZP from '../components/DUZP';
import RedoxPredictionScale from '../components/RedoxPredictionScale';
import { InfoBox, ModelBadge, PanelSection, ResultCard, ResultChips, Slider } from '../components/Controls';
import { CoupleEditor } from '../components/Editors';
import { coupleFromPreset, type CoupleState } from '../lib/editorModels';
import { alphaRedox, peConditional, NERNST_S } from '../lib/redox';
import { SPECIES_COLORS } from '../lib/database';
import { paddedAxisRange } from '../lib/format';
import type { Zone } from '../lib/ladder';

const PE_POINTS = 400;

/** Diagramas redox: DUZP + α vs pe + escala de predicción (Baeza). */
export default function Redox() {
  const [couple1, setCouple1] = useState<CoupleState>(coupleFromPreset('fe'));
  const [couple2, setCouple2] = useState<CoupleState>(coupleFromPreset('ce'));
  const [pH, setPH] = useState(0);

  function reset() {
    setCouple1(coupleFromPreset('fe'));
    setCouple2(coupleFromPreset('ce'));
    setPH(0);
  }

  const pe01 = peConditional(couple1, pH);
  const pe02 = peConditional(couple2, pH);
  const [peMin, peMax] = paddedAxisRange(Math.min(pe01, pe02), Math.max(pe01, pe02), 8);

  // Distribución α vs pe (ambos pares)
  const alphaView = useMemo(() => {
    const pes: number[] = [];
    const s = { c1Ox: [] as number[], c1Red: [] as number[], c2Ox: [] as number[], c2Red: [] as number[] };
    for (let i = 0; i <= PE_POINTS; i++) {
      const pe = peMin + ((peMax - peMin) * i) / PE_POINTS;
      pes.push(pe);
      const a1 = alphaRedox(pe, pe01, couple1.n);
      const a2 = alphaRedox(pe, pe02, couple2.n);
      s.c1Ox.push(a1.ox);
      s.c1Red.push(a1.red);
      s.c2Ox.push(a2.ox);
      s.c2Red.push(a2.red);
    }
    const data: Data[] = [
      { x: pes, y: s.c1Red, type: 'scatter', mode: 'lines', name: couple1.red, line: { width: 3, color: SPECIES_COLORS[0] } },
      { x: pes, y: s.c1Ox, type: 'scatter', mode: 'lines', name: couple1.ox, line: { width: 3, color: SPECIES_COLORS[0], dash: 'dash' } },
      { x: pes, y: s.c2Red, type: 'scatter', mode: 'lines', name: couple2.red, line: { width: 3, color: SPECIES_COLORS[2] } },
      { x: pes, y: s.c2Ox, type: 'scatter', mode: 'lines', name: couple2.ox, line: { width: 3, color: SPECIES_COLORS[2], dash: 'dash' } },
    ];
    const shapes: Partial<Shape>[] = [pe01, pe02].map((p) => ({
      type: 'line', x0: p, x1: p, y0: 0, y1: 1,
      line: { color: '#aaaaaa', width: 1, dash: 'dot' },
    }));
    const annotations: Partial<Annotations>[] = [
      { x: pe01, y: 1.07, text: `pe°′₁ = ${pe01.toFixed(1)}`, showarrow: false, font: { size: 12, color: SPECIES_COLORS[0] } },
      { x: pe02, y: 1.07, text: `pe°′₂ = ${pe02.toFixed(1)}`, showarrow: false, font: { size: 12, color: SPECIES_COLORS[2] } },
    ];
    return { data, shapes, annotations };
  }, [couple1, couple2, pe01, pe02, peMin, peMax]);

  const scaleCouples = useMemo(() => [
    { ox: couple1.ox, red: couple1.red, pe0: pe01, color: SPECIES_COLORS[0], label: couple1.name },
    { ox: couple2.ox, red: couple2.red, pe0: pe02, color: SPECIES_COLORS[2], label: couple2.name },
  ], [couple1, couple2, pe01, pe02]);

  // Predicción de reacción espontánea
  const strong = pe01 > pe02 ? { ox: couple1, red: couple2 } : { ox: couple2, red: couple1 };
  const logK = strong.ox.n * strong.red.n * Math.abs(pe01 - pe02);

  // DUZP: 3 zonas basadas en los dos pe°′ condicionales
  const duzpZones = useMemo<Zone[]>(() => {
    const c1 = { pe0: pe01, ox: couple1.ox, red: couple1.red, color: SPECIES_COLORS[0] };
    const c2 = { pe0: pe02, ox: couple2.ox, red: couple2.red, color: SPECIES_COLORS[2] };
    const [lo, hi] = c1.pe0 <= c2.pe0 ? [c1, c2] : [c2, c1];
    return [
      { pStart: peMin, pEnd: lo.pe0,  label: `${lo.red} · ${hi.red}`,  index: 0, color: SPECIES_COLORS[0] },
      { pStart: lo.pe0, pEnd: hi.pe0, label: `${lo.ox} · ${hi.red}`,   index: 1, color: SPECIES_COLORS[1] },
      { pStart: hi.pe0, pEnd: peMax,  label: `${lo.ox} · ${hi.ox}`,    index: 2, color: SPECIES_COLORS[2] },
    ];
  }, [pe01, pe02, couple1, couple2, peMin, peMax]);

  const diagrams = [
    {
      id: 'duzp',
      label: 'DUZP',
      node: (
        <DUZP
          zones={duzpZones}
          pMin={peMin}
          pMax={peMax}
          pLabel="pe"
          caption="Zonas de predominio (pe°′ condicional)"
        />
      ),
    },
    {
      id: 'alpha',
      label: 'Distribución α',
      node: (
        <Chart
          data={alphaView.data}
          xTitle="pe"
          yTitle="Fracción α"
          xRange={[peMin, peMax]}
          yRange={[0, 1.12]}
          shapes={alphaView.shapes}
          annotations={alphaView.annotations}
          exportName="equilibria-redox-alfa"
        />
      ),
    },
    {
      id: 'escala',
      label: 'Escala de predicción',
      node: (
        <RedoxPredictionScale
          couples={scaleCouples}
          peMin={peMin}
          peMax={peMax}
          caption="Oxidante arriba · reductor abajo · pe°′ condicional"
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title="Equilibrio redox" onReset={reset}>
        <PanelSection title="Pares redox" icon="⚛">
          <ModelBadge
            model="predicción de reacción entre dos pares redox"
            additions={[(couple1.mH > 0 || couple2.mH > 0) && 'potencial condicionado por pH']}
          />
          <CoupleEditor title="Par 1" couple={couple1} onChange={setCouple1} />
          <CoupleEditor title="Par 2" couple={couple2} onChange={setCouple2} />
        </PanelSection>
        <PanelSection title="Condiciones" icon="⚗">
          <Slider label="pH del medio" value={pH} min={0} max={14} step={0.1} onChange={setPH} decimals={1} />
        </PanelSection>
        <PanelSection title="Resultado" icon="∑">
          <ResultCard items={[
            { label: `pe°′ ${couple1.ox}/${couple1.red}`, value: `${pe01.toFixed(2)} (${(pe01 * NERNST_S).toFixed(3)} V)` },
            { label: `pe°′ ${couple2.ox}/${couple2.red}`, value: `${pe02.toFixed(2)} (${(pe02 * NERNST_S).toFixed(3)} V)` },
            { label: 'Reacción espontánea', value: `${strong.ox.ox} + ${strong.red.red}` },
            { label: 'log K', value: logK.toFixed(1) },
          ]} />
        </PanelSection>
        <InfoBox title="Cómo leer la escala de predicción">
          <p>
            En la escala de pe (Baeza), cada par se coloca en su pe°′ condicional con el
            oxidante arriba y el reductor abajo. El oxidante del par con pe°′ <em>mayor</em>{' '}
            reacciona espontáneamente con el reductor del par con pe°′ <em>menor</em>,
            con log K = n₁·n₂·Δpe°′. Mueve el pH y observa cómo los pares con H⁺
            en su semirreacción se desplazan — un oxidante puede dejar de serlo al subir el pH.
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={diagrams} />
        <ResultChips items={[
          { label: 'Reacción espontánea', value: `${strong.ox.ox} + ${strong.red.red}`, accent: true },
          { label: 'log K', value: logK.toFixed(1) },
        ]} />
      </section>
    </div>
  );
}
