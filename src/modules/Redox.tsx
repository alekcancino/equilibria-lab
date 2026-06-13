import { useMemo, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import { InfoBox, ResultCard, Slider } from '../components/Controls';
import { CoupleEditor, coupleFromPreset, type CoupleState } from '../components/Editors';
import { alphaRedox, peConditional, NERNST_S } from '../lib/redox';

type View = 'alpha' | 'escala';

/** Diagramas redox: α vs pe y escala de predicción de reacciones (Baeza). */
export default function Redox() {
  const [view, setView] = useState<View>('alpha');
  const [couple1, setCouple1] = useState<CoupleState>(coupleFromPreset('fe'));
  const [couple2, setCouple2] = useState<CoupleState>(coupleFromPreset('ce'));
  const [pH, setPH] = useState(0);

  const pe01 = peConditional(couple1, pH);
  const pe02 = peConditional(couple2, pH);

  const alphaView = useMemo(() => {
    const peMin = Math.min(pe01, pe02) - 8;
    const peMax = Math.max(pe01, pe02) + 8;
    const N = 400;
    const pes: number[] = [];
    const s = { c1Ox: [] as number[], c1Red: [] as number[], c2Ox: [] as number[], c2Red: [] as number[] };
    for (let i = 0; i <= N; i++) {
      const pe = peMin + ((peMax - peMin) * i) / N;
      pes.push(pe);
      const a1 = alphaRedox(pe, pe01, couple1.n);
      const a2 = alphaRedox(pe, pe02, couple2.n);
      s.c1Ox.push(a1.ox);
      s.c1Red.push(a1.red);
      s.c2Ox.push(a2.ox);
      s.c2Red.push(a2.red);
    }
    const data: Data[] = [
      { x: pes, y: s.c1Red, type: 'scatter', mode: 'lines', name: couple1.red, line: { width: 3, color: '#0072B2' } },
      { x: pes, y: s.c1Ox, type: 'scatter', mode: 'lines', name: couple1.ox, line: { width: 3, color: '#0072B2', dash: 'dash' } },
      { x: pes, y: s.c2Red, type: 'scatter', mode: 'lines', name: couple2.red, line: { width: 3, color: '#D55E00' } },
      { x: pes, y: s.c2Ox, type: 'scatter', mode: 'lines', name: couple2.ox, line: { width: 3, color: '#D55E00', dash: 'dash' } },
    ];
    const shapes: Partial<Shape>[] = [pe01, pe02].map((p) => ({
      type: 'line', x0: p, x1: p, y0: 0, y1: 1,
      line: { color: '#999999', width: 1, dash: 'dot' },
    }));
    const annotations: Partial<Annotations>[] = [
      { x: pe01, y: 1.05, text: `pe°′ = ${pe01.toFixed(1)}`, showarrow: false, font: { size: 11, color: '#0072B2' } },
      { x: pe02, y: 1.05, text: `pe°′ = ${pe02.toFixed(1)}`, showarrow: false, font: { size: 11, color: '#D55E00' } },
    ];
    return { data, shapes, annotations, range: [peMin, peMax] as [number, number] };
  }, [couple1, couple2, pe01, pe02]);

  const escalaView = useMemo(() => {
    // Escala de predicción: eje pe horizontal; oxidantes arriba, reductores abajo.
    const couples = [
      { c: couple1, pe0: pe01, color: '#0072B2', y: 1 },
      { c: couple2, pe0: pe02, color: '#D55E00', y: 2 },
    ];
    const peMin = Math.min(pe01, pe02) - 6;
    const peMax = Math.max(pe01, pe02) + 6;
    const data: Data[] = couples.map(({ c, pe0, color, y }) => ({
      x: [pe0], y: [y], type: 'scatter', mode: 'markers',
      name: `${c.ox}/${c.red}`,
      marker: { size: 14, color, symbol: 'line-ns', line: { width: 3, color } },
      hovertemplate: `pe°′ = ${pe0.toFixed(2)} (E°′ = ${(pe0 * NERNST_S).toFixed(3)} V)<extra>${c.ox}/${c.red}</extra>`,
    }));
    const annotations: Partial<Annotations>[] = couples.flatMap(({ c, pe0, color, y }) => [
      { x: pe0, y: y + 0.28, text: `<b>${c.ox}</b>`, showarrow: false, font: { size: 13, color } },
      { x: pe0, y: y - 0.28, text: `<b>${c.red}</b>`, showarrow: false, font: { size: 13, color } },
    ]);
    const shapes: Partial<Shape>[] = [
      { type: 'line', x0: peMin, x1: peMax, y0: 1, y1: 1, line: { color: '#e8ecef', width: 1 } },
      { type: 'line', x0: peMin, x1: peMax, y0: 2, y1: 2, line: { color: '#e8ecef', width: 1 } },
    ];
    return { data, shapes, annotations, range: [peMin, peMax] as [number, number] };
  }, [couple1, couple2, pe01, pe02]);

  // Predicción: reacciona el oxidante del par con pe°' mayor con el reductor del otro.
  const strong = pe01 > pe02 ? { ox: couple1, red: couple2 } : { ox: couple2, red: couple1 };
  const logK = strong.ox.n * strong.red.n * Math.abs(pe01 - pe02);

  return (
    <div className="module-with-tabs">
      <div className="chart-tabs">
        <button className={view === 'alpha' ? 'chart-tab active' : 'chart-tab'} onClick={() => setView('alpha')}>
          Distribución α vs pe
        </button>
        <button className={view === 'escala' ? 'chart-tab active' : 'chart-tab'} onClick={() => setView('escala')}>
          Escala de predicción
        </button>
      </div>
      <div className="module">
        <aside className="panel">
          <h2>Equilibrio redox</h2>
          <CoupleEditor title="Par 1" couple={couple1} onChange={setCouple1} />
          <CoupleEditor title="Par 2" couple={couple2} onChange={setCouple2} />
          <h3>Condiciones</h3>
          <Slider label="pH del medio" value={pH} min={0} max={14} step={0.1} onChange={setPH} decimals={1} />
          <ResultCard items={[
            { label: `pe°′ ${couple1.ox}/${couple1.red}`, value: `${pe01.toFixed(2)} (${(pe01 * NERNST_S).toFixed(3)} V)` },
            { label: `pe°′ ${couple2.ox}/${couple2.red}`, value: `${pe02.toFixed(2)} (${(pe02 * NERNST_S).toFixed(3)} V)` },
            { label: 'Reacción espontánea', value: `${strong.ox.ox} + ${strong.red.red}` },
            { label: 'log K', value: logK.toFixed(1) },
          ]} />
          <InfoBox title="Cómo leer la escala de predicción">
            <p>
              En la escala de pe (Baeza), cada par se coloca en su pe°′ condicional con el
              oxidante arriba y el reductor abajo. El oxidante de pe°′ <em>mayor</em> reacciona
              espontáneamente con el reductor de pe°′ <em>menor</em>, con
              log K = n₁·n₂·Δpe°′. Mueve el pH y observa cómo se desplazan los pares con H⁺
              en su semirreacción — un par puede dejar de ser oxidante útil al subir el pH.
            </p>
          </InfoBox>
        </aside>
        <section className="plot-area">
          {view === 'alpha' ? (
            <Chart
              data={alphaView.data}
              xTitle="pe"
              yTitle="Fracción α"
              xRange={alphaView.range}
              yRange={[0, 1.1]}
              shapes={alphaView.shapes}
              annotations={alphaView.annotations}
              exportName="quimeq-redox-alfa"
            />
          ) : (
            <Chart
              data={escalaView.data}
              xTitle="pe"
              yTitle=""
              xRange={escalaView.range}
              yRange={[0.4, 2.6]}
              shapes={escalaView.shapes}
              annotations={escalaView.annotations}
              showLegend={false}
              exportName="quimeq-escala-prediccion"
            />
          )}
        </section>
      </div>
    </div>
  );
}
