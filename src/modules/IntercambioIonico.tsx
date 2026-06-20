import { useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, LabelField, ModelBadge, ResultCard, Slider } from '../components/Controls';
import {
  batchIonExchange, breakthroughCurve, isothermCurve, selectivityFromKd,
} from '../lib/ionExchange';
import { APPLICATION_PRESETS, RESIN_PRESETS } from '../lib/ionExchangeDatabase';

/** Intercambio iónico: selectividad, lote, isoterma y breakthrough en columna. */
export default function IntercambioIonico() {
  const [resinId, setResinId] = useState('dowex50');
  const [labelA, setLabelA] = useState('Ca²⁺');
  const [labelB, setLabelB] = useState('Na⁺');
  const [cA0, setCA0] = useState(0.005);
  const [cB0, setCB0] = useState(0.01);
  const [selectivity, setSelectivity] = useState(2.4);
  const [resinCapacity, setResinCapacity] = useState(2);
  const [resinVolume, setResinVolume] = useState(0.05);
  const [volume, setVolume] = useState(0.1);
  const [flowRate, setFlowRate] = useState(0.05);

  function applyResin(id: string) {
    const r = RESIN_PRESETS.find((x) => x.id === id);
    if (!r) return;
    setResinId(id);
    setResinCapacity(r.capacity);
    setSelectivity(r.ksel);
    setLabelA(r.ionA);
    setLabelB(r.ionB);
  }

  function reset() {
    applyResin('dowex50');
    setCA0(0.005);
    setCB0(0.01);
    setResinVolume(0.05);
    setVolume(0.1);
    setFlowRate(0.05);
  }

  const baseParams = useMemo(() => ({
    cB0, selectivityAB: selectivity, resinCapacity, resinVolume, volume,
  }), [cB0, selectivity, resinCapacity, resinVolume, volume]);

  const eq = useMemo(
    () => batchIonExchange({ ...baseParams, cA0 }),
    [baseParams, cA0],
  );

  const isotherm = useMemo(
    () => isothermCurve({
      ...baseParams,
      cMin: Math.max(cA0 / 20, 1e-5),
      cMax: Math.max(cA0 * 5, 0.05),
      points: 50,
    }),
    [baseParams, cA0],
  );

  const breakthrough = useMemo(
    () => breakthroughCurve({
      cA0, selectivityAB: selectivity, resinCapacity, resinVolume, flowRate,
    }),
    [cA0, selectivity, resinCapacity, resinVolume, flowRate],
  );

  const kselCurve = useMemo(() => {
    const ks: number[] = [];
    const fracA: number[] = [];
    for (let i = 1; i <= 80; i++) {
      const k = Math.pow(10, (4 * i) / 80 - 2);
      const r = batchIonExchange({ ...baseParams, cA0, selectivityAB: k });
      ks.push(k);
      fracA.push(r.fracAInResin);
    }
    return { ks, fracA };
  }, [baseParams, cA0]);

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
      label: 'Reparto (lote)',
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
      id: 'isotherm',
      label: 'Isoterma q vs C',
      node: (
        <Chart
          data={[{
            x: isotherm.cA,
            y: isotherm.q,
            type: 'scatter',
            mode: 'lines',
            name: `q (${labelA})`,
            line: { width: 3, color: '#0072B2' },
            hovertemplate: 'C = %{x:.2e} M<br>q = %{y:.3f} eq/L<extra></extra>',
          }]}
          xTitle={`[${labelA}] en equilibrio (M)`}
          yTitle="q en resina (eq/L)"
          exportName="quimeq-ion-exchange-isotherm"
        />
      ),
    },
    {
      id: 'column',
      label: 'Breakthrough',
      node: (
        <Chart
          data={[{
            x: breakthrough.bedVolumes,
            y: breakthrough.cRatio,
            type: 'scatter',
            mode: 'lines',
            name: 'C/C₀',
            line: { width: 3, color: '#009E73' },
            hovertemplate: 'BV = %{x:.2f}<br>C/C₀ = %{y:.3f}<extra></extra>',
          }]}
          xTitle="Volúmenes de lecho (BV)"
          yTitle="C / C₀ en el efluente"
          yRange={[0, 1.05]}
          exportName="quimeq-ion-exchange-breakthrough"
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
        <ModelBadge model="equilibrio binario A↔B · isoterma · columna ideal 1D" />
        <p className="hint">Resinas:</p>
        <div className="preset-chip-row" style={{ marginBottom: 8 }}>
          {RESIN_PRESETS.map((p) => (
            <button
              key={p.id}
              className={resinId === p.id ? 'preset-chip active' : 'preset-chip'}
              onClick={() => applyResin(p.id)}
              title={p.reference}
            >
              {p.name.split(' (')[0]}
            </button>
          ))}
        </div>
        <p className="hint">Aplicaciones:</p>
        <div className="preset-chip-row" style={{ marginBottom: 10 }}>
          {APPLICATION_PRESETS.map((p) => (
            <button
              key={p.id}
              className="preset-chip"
              onClick={() => {
                applyResin(p.resinId);
                setLabelA(p.ionA);
                setLabelB(p.ionB);
                setCA0(p.cA0);
                setCB0(p.cB0);
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
        <Slider label="Caudal (L/min, columna)" value={flowRate} min={0.01} max={0.2} step={0.01} onChange={setFlowRate} decimals={2} />
        <ResultCard items={[
          { label: `[${labelA}] final`, value: `${eq.cAeq.toExponential(2)} M` },
          { label: `[${labelB}] final`, value: `${eq.cBeq.toExponential(2)} M` },
          { label: `${labelA} en resina`, value: `${(eq.fracAInResin * 100).toFixed(1)} %` },
          { label: 'Ksel (referencia)', value: selectivityFromKd(selectivity, 1).toFixed(1) },
        ]} />
        <InfoBox title="Selectividad, isoterma y columna">
          <p>
            La ley <code>K_A/B = (y_A·x_B)/(y_B·x_A)</code> gobierna el equilibrio en lote.
            La <strong>isoterma</strong> muestra q (eq/L resina) vs la concentración en solución.
            El <strong>breakthrough</strong> es un modelo ideal: el efluente alcanza C/C₀ ≈ 1
            tras agotar la capacidad del lecho.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <DiagramTabs tabs={tabs} />
      </section>
    </div>
  );
}
