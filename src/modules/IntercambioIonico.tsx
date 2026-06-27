import { useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, LabelField, ModelBadge, PanelSection, ResultCard, ResultChips, Slider, Toggle } from '../components/Controls';
import { SideReactionEditor } from '../components/Editors';
import {
  batchIonExchange, breakthroughCurve, isothermCurve, selectivityFromKd,
  exchangeDistributionCurve, optimalElutionPH, defaultSideEditorState,
  type SideReactionEditorState,
} from '../lib/ionExchange';
import { sideStackFromEditor } from '../lib/sideReactions';
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
  const [showCompetitive, setShowCompetitive] = useState(false);
  const [kHSquared, setKHSquared] = useState(3);
  const [pHBulk, setPHBulk] = useState(4);
  const [hResin, setHResin] = useState(0.005);
  const [ciMeq, setCiMeq] = useState(5);
  const [massResinG, setMassResinG] = useState(1);
  const [volumeL, setVolumeL] = useState(0.2);
  const [side, setSide] = useState<SideReactionEditorState>(() => {
    const st = defaultSideEditorState();
    st.showOH = true;
    st.logBetasOH = [4.97, 8.55];
    return st;
  });
  const [showElution, setShowElution] = useState(false);
  const [logKfNiY, setLogKfNiY] = useState(18.62);
  const [cEdta, setCEdta] = useState(0.1);
  const [vEdta, setVEdta] = useState(0.2);
  const [nNiResin, setNNiResin] = useState(0.001);

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

  const stack = useMemo(() => sideStackFromEditor(side), [side]);
  const distCurve = useMemo(
    () => exchangeDistributionCurve(
      kHSquared, stack, hResin, ciMeq, massResinG, volumeL, [1, 14], 200,
    ),
    [kHSquared, stack, hResin, ciMeq, massResinG, volumeL],
  );
  const elution = useMemo(
    () => optimalElutionPH({
      nNiResin, vEdta, cEdta, logKfNiY, stack,
    }),
    [nNiResin, vEdta, cEdta, logKfNiY, stack],
  );
  const phiAtBulk = useMemo(() => {
    const idx = distCurve.pHs.reduce((best, pH, i) =>
      Math.abs(pH - pHBulk) < Math.abs(distCurve.pHs[best] - pHBulk) ? i : best, 0);
    return distCurve.phi[idx];
  }, [distCurve, pHBulk]);

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
          exportName="equilibria-ion-exchange-bars"
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
          exportName="equilibria-ion-exchange-isotherm"
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
            line: { width: 3, color: '#2C3E50' },
            hovertemplate: 'BV = %{x:.2f}<br>C/C₀ = %{y:.3f}<extra></extra>',
          }]}
          xTitle="Volúmenes de lecho (BV)"
          yTitle="C / C₀ en el efluente"
          yRange={[0, 1.05]}
          exportName="equilibria-ion-exchange-breakthrough"
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
            line: { color: '#7F8C8D', width: 2, dash: 'dash' },
          }]}
          exportName="equilibria-ion-exchange-ksel"
        />
      ),
    },
    ...(showCompetitive ? [{
      id: 'dph',
      label: 'D y φ vs pH',
      node: (
        <Chart
          data={[
            {
              x: distCurve.pHs, y: distCurve.logD, type: 'scatter', mode: 'lines',
              name: 'log D', line: { width: 3, color: '#0072B2' },
            },
            {
              x: distCurve.pHs, y: distCurve.phi, type: 'scatter', mode: 'lines',
              name: 'φ (fracción en resina)', line: { width: 2.5, color: '#D55E00', dash: 'dot' },
              yaxis: 'y2',
            },
          ]}
          xTitle="pH"
          yTitle="log D"
          exportName="equilibria-ion-exchange-dph"
        />
      ),
    }] : []),
  ];

  return (
    <div className="module">
      <PanelShell title="Intercambio iónico" onReset={reset}>
        <PanelSection title="Sistema" icon="⚛">
        <ModelBadge model="equilibrio binario A↔B · isoterma · columna ideal 1D" />
        <p className="hint">Resinas:</p>
        <div className="preset-chip-row" style={{ marginBottom: 8 }}>
          {RESIN_PRESETS.map((p) => (
            <button
              key={p.id}
              className={resinId === p.id ? 'preset-chip active' : 'preset-chip'}
              onClick={() => applyResin(p.id)}
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
        </PanelSection>

        <PanelSection title="Competencia con H⁺ (pH)" icon="⚗">
        <Toggle
          label="Competencia catiónica con H⁺ (D vs pH)"
          checked={showCompetitive}
          onChange={setShowCompetitive}
        />
        {showCompetitive && (
          <div className="mask-section">
            <Slider label="K²_H/M" value={kHSquared} min={0.1} max={20} step={0.1} onChange={setKHSquared} decimals={1} />
            <Slider label="pH bulk" value={pHBulk} min={1} max={14} step={0.1} onChange={setPHBulk} decimals={1} />
            <ConcSlider label="[H⁺]_resina (M)" value={hResin} onChange={setHResin} min={-4} max={-1} />
            <Slider label="CI (meq/g)" value={ciMeq} min={1} max={10} step={0.5} onChange={setCiMeq} decimals={1} />
            <Slider label="m_R (g)" value={massResinG} min={0.1} max={5} step={0.1} onChange={setMassResinG} decimals={1} />
            <Slider label="V (L)" value={volumeL} min={0.05} max={1} step={0.05} onChange={setVolumeL} decimals={2} />
            <SideReactionEditor state={side} onChange={setSide} showLigandPKas={false} />
            <Toggle label="Elución con EDTA (acoplado)" checked={showElution} onChange={setShowElution} />
            {showElution && (
              <>
                <Slider label="log Kf NiY" value={logKfNiY} min={10} max={25} step={0.01} onChange={setLogKfNiY} decimals={2} />
                <ConcSlider label="[EDTA] (M)" value={cEdta} onChange={setCEdta} min={-3} max={0} />
                <Slider label="V EDTA (L)" value={vEdta} min={0.05} max={0.5} step={0.05} onChange={setVEdta} decimals={2} />
                <Slider label="n Ni en resina (mol)" value={nNiResin} min={0.0001} max={0.01} step={0.0001} onChange={setNNiResin} decimals={4} />
              </>
            )}
          </div>
        )}
        </PanelSection>

        <PanelSection title="Resultado" icon="∑">
          <ResultCard items={[
            { label: `[${labelA}] final`, value: `${eq.cAeq.toExponential(2)} M` },
            { label: `[${labelB}] final`, value: `${eq.cBeq.toExponential(2)} M` },
            { label: `${labelA} en resina`, value: `${(eq.fracAInResin * 100).toFixed(1)} %` },
            { label: 'Ksel (referencia)', value: selectivityFromKd(selectivity, 1).toFixed(1) },
            ...(showCompetitive ? [
              { label: `φ a pH ${pHBulk.toFixed(1)}`, value: `${(phiAtBulk * 100).toFixed(1)} %` },
              ...(showElution ? [
                { label: 'pH óptimo elución EDTA', value: elution.pH.toFixed(1) },
                { label: 'Fracción eluida (modelo)', value: `${(elution.fractionEluted * 100).toFixed(0)} %` },
              ] : []),
            ] : []),
          ]} />
        </PanelSection>

        <InfoBox title="Selectividad, isoterma y columna">
          <p>
            La ley <code>K_A/B = (y_A·x_B)/(y_B·x_A)</code> gobierna el equilibrio en lote.
            La <strong>isoterma</strong> muestra q (eq/L resina) vs la concentración en solución.
            El <strong>breakthrough</strong> es un modelo ideal: el efluente alcanza C/C₀ ≈ 1
            tras agotar la capacidad del lecho.
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={tabs} />
        <ResultChips items={[
          { label: `${labelA} en resina`, value: `${(eq.fracAInResin * 100).toFixed(0)} %`, accent: true },
          ...(showCompetitive
            ? [{ label: `φ a pH ${pHBulk.toFixed(1)}`, value: `${(phiAtBulk * 100).toFixed(0)} %` }]
            : []),
          ...(showCompetitive && showElution
            ? [{ label: 'pH elución', value: elution.pH.toFixed(1) }]
            : []),
        ]} />
      </section>
    </div>
  );
}
