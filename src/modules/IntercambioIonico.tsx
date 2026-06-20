import { useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, LabelField, ModelBadge, ResultCard, Slider } from '../components/Controls';
import { batchIonExchange, selectivityFromKd } from '../lib/ionExchange';

const PRESETS = [
  { id: 'na-ca', label: 'Na⁺ / Ca²⁺', ksel: 2.5, cA: 0.01, cB: 0.005 },
  { id: 'ca-mg', label: 'Ca²⁺ / Mg²⁺', ksel: 1.8, cA: 0.005, cB: 0.01 },
  { id: 'pb-ca', label: 'Pb²⁺ / Ca²⁺', ksel: 45, cA: 0.001, cB: 0.01 },
];

/** Intercambio iónico: selectividad Ksel y reparto en equilibrio (lote). */
export default function IntercambioIonico() {
  const [labelA, setLabelA] = useState('Na⁺');
  const [labelB, setLabelB] = useState('Ca²⁺');
  const [cA0, setCA0] = useState(0.01);
  const [cB0, setCB0] = useState(0.005);
  const [selectivity, setSelectivity] = useState(2.5);
  const [resinCapacity, setResinCapacity] = useState(2);
  const [resinVolume, setResinVolume] = useState(0.05);
  const [volume, setVolume] = useState(0.1);

  function reset() {
    setLabelA('Na⁺');
    setLabelB('Ca²⁺');
    setCA0(0.01);
    setCB0(0.005);
    setSelectivity(2.5);
    setResinCapacity(2);
    setResinVolume(0.05);
    setVolume(0.1);
  }

  const eq = useMemo(
    () => batchIonExchange({
      cA0, cB0, selectivityAB: selectivity, resinCapacity, resinVolume, volume,
    }),
    [cA0, cB0, selectivity, resinCapacity, resinVolume, volume],
  );

  const kselCurve = useMemo(() => {
    const ks: number[] = [];
    const fracA: number[] = [];
    for (let i = 1; i <= 80; i++) {
      const k = Math.pow(10, (4 * i) / 80 - 2);
      const r = batchIonExchange({
        cA0, cB0, selectivityAB: k, resinCapacity, resinVolume, volume,
      });
      ks.push(k);
      fracA.push(r.fracAInResin);
    }
    return { ks, fracA };
  }, [cA0, cB0, resinCapacity, resinVolume, volume]);

  const barTraces = useMemo<Data[]>(() => [
    {
      x: [`Solución (${labelA})`, `Solución (${labelB})`, `Resina (${labelA})`, `Resina (${labelB})`],
      y: [eq.cAeq, eq.cBeq, eq.fracAInResin, eq.fracBInResin],
      type: 'bar',
      marker: { color: ['#0072B2', '#D55E00', '#0072B2', '#D55E00'] },
      hovertemplate: '%{x}<br>=%{y:.4f}<extra></extra>',
    },
  ], [eq, labelA, labelB]);

  const tabs = [
    {
      id: 'bars',
      label: 'Reparto',
      node: (
        <Chart
          data={barTraces}
          xTitle=""
          yTitle="Concentración (M) o fracción en resina"
          exportName="quimeq-ion-exchange-bars"
        />
      ),
    },
    {
      id: 'ksel',
      label: 'Ksel vs carga',
      node: (
        <Chart
          data={[{
            x: kselCurve.ks,
            y: kselCurve.fracA,
            type: 'scatter',
            mode: 'lines',
            name: `% ${labelA} en resina`,
            line: { width: 3, color: '#0072B2' },
          }]}
          xTitle="Ksel (A preferido sobre B)"
          yTitle={`Fracción de ${labelA} en resina`}
          xRange={[0.01, 100]}
          shapes={[{
            type: 'line',
            x0: selectivity, x1: selectivity, y0: 0, y1: 1,
            line: { color: '#E69F00', width: 2, dash: 'dash' },
          }]}
          exportName="quimeq-ion-exchange-ksel"
        />
      ),
    },
  ];

  return (
    <div className="module">
      <aside className="panel">
        <div className="panel-header">
          <h2>Intercambio iónico</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <ModelBadge model="equilibrio binario A↔B en resina de intercambio" />
        <p className="hint">Presets:</p>
        <div className="preset-chip-row" style={{ marginBottom: 10 }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className="preset-chip"
              onClick={() => {
                const [a, b] = p.label.split(' / ');
                setLabelA(a);
                setLabelB(b);
                setCA0(p.cA);
                setCB0(p.cB);
                setSelectivity(p.ksel);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <LabelField label="Catión A" value={labelA} onChange={setLabelA} />
        <LabelField label="Catión B" value={labelB} onChange={setLabelB} />
        <ConcSlider label={`[${labelA}] inicial`} value={cA0} onChange={setCA0} min={-4} max={-1} />
        <ConcSlider label={`[${labelB}] inicial`} value={cB0} onChange={setCB0} min={-4} max={-1} />
        <Slider label="Ksel (A sobre B)" value={selectivity} min={0.1} max={50} step={0.1} onChange={setSelectivity} decimals={1} />
        <Slider label="Capacidad de resina (eq/L)" value={resinCapacity} min={0.5} max={5} step={0.1} onChange={setResinCapacity} decimals={1} />
        <Slider label="Volumen de resina (L)" value={resinVolume} min={0.01} max={0.2} step={0.01} onChange={setResinVolume} decimals={2} />
        <Slider label="Volumen de solución (L)" value={volume} min={0.05} max={0.5} step={0.01} onChange={setVolume} decimals={2} />
        <ResultCard items={[
          { label: `[${labelA}] final`, value: `${eq.cAeq.toExponential(2)} M` },
          { label: `[${labelB}] final`, value: `${eq.cBeq.toExponential(2)} M` },
          { label: `${labelA} en resina`, value: `${(eq.fracAInResin * 100).toFixed(1)} %` },
          { label: 'Ksel (referencia)', value: selectivityFromKd(selectivity, 1).toFixed(1) },
        ]} />
        <InfoBox title="Selectividad y reparto">
          <p>
            La ley de selectividad <code>K_A/B = (y_A·x_B)/(y_B·x_A)</code> relaciona las
            fracciones en resina (y) y en solución (x). K &gt; 1 favorece la retención de A.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <DiagramTabs tabs={tabs} />
      </section>
    </div>
  );
}
