import { useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, ModelBadge, ResultCard, Slider } from '../components/Controls';
import {
  ionicStrength,
  logActivityCoefficient,
  activityCoefficient,
  apparentPKw,
} from '../lib/activity';

const I_POINTS = 200;

/** Actividad iónica y corrección de Debye-Hückel (25 °C). */
export default function Actividad() {
  const [cIon, setCIon] = useState(0.1);
  const [z, setZ] = useState(1);
  const [pH, setPH] = useState(7);

  function reset() {
    setCIon(0.1);
    setZ(1);
    setPH(7);
  }

  const I = useMemo(
    () => ionicStrength([{ c: cIon, z }, { c: cIon, z: -z }]),
    [cIon, z],
  );
  const logGamma = logActivityCoefficient(z, I);
  const gamma = activityCoefficient(z, I);
  const gammaH = activityCoefficient(1, I);
  const gammaOH = activityCoefficient(1, I);
  const pKwApp = apparentPKw(gammaH, gammaOH);

  const gammaTraces = useMemo<Data[]>(() => {
    const Is: number[] = [];
    const g1: number[] = [];
    const g2: number[] = [];
    for (let i = 0; i <= I_POINTS; i++) {
      const ii = (2 * i) / I_POINTS;
      Is.push(ii);
      g1.push(activityCoefficient(1, ii));
      g2.push(activityCoefficient(2, ii));
    }
    return [
      { x: Is, y: g1, type: 'scatter', mode: 'lines', name: 'γ (z = ±1)', line: { width: 3, color: '#0072B2' } },
      { x: Is, y: g2, type: 'scatter', mode: 'lines', name: 'γ (z = ±2)', line: { width: 2.5, color: '#D55E00' } },
    ];
  }, []);

  const tabs = [
    {
      id: 'gamma',
      label: 'γ vs I',
      node: (
        <Chart
          data={gammaTraces}
          xTitle="Fuerza iónica I (M)"
          yTitle="Coeficiente de actividad γ"
          xRange={[0, 2]}
          yRange={[0, 1.05]}
          shapes={I > 0 ? [{
            type: 'line', x0: I, x1: I, y0: 0, y1: 1,
            line: { color: '#CC79A7', width: 2, dash: 'dashdot' },
          }] : []}
          exportName="equilibria-actividad-gamma"
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title="Actividad y Debye-Hückel" onReset={reset}>
        <ModelBadge model="electrolito binario z:z en solución acuosa" />
        <ConcSlider label="Concentración del electrolito" value={cIon} onChange={setCIon} min={-3} max={0} />
        <div className="control">
          <div className="control-header">
            <span className="control-label">Carga iónica |z|</span>
            <span className="control-value">{z}</span>
          </div>
          <div className="segmented" style={{ marginTop: 6 }}>
            {[1, 2, 3].map((v) => (
              <button key={v} className={z === v ? 'seg-btn active' : 'seg-btn'} onClick={() => setZ(v)}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <Slider label="pH de referencia" value={pH} min={0} max={14} step={0.1} onChange={setPH} decimals={1} />
        <ResultCard items={[
          { label: 'Fuerza iónica I', value: `${I.toExponential(2)} M` },
          { label: `log γ (z = ${z})`, value: logGamma.toFixed(3) },
          { label: `γ (z = ${z})`, value: gamma.toFixed(3) },
          { label: 'pKw aparente', value: pKwApp.toFixed(2) },
          { label: 'a_H ≈ γ·[H⁺]', value: (gammaH * Math.pow(10, -pH)).toExponential(2) },
        ]} />
        <InfoBox title="Debye-Hückel extendida">
          <p>
            A 25 °C, <code>log γ = −0.51 z² √I / (1 + 0.33·3·√I)</code> (a ≈ 3 Å).
            A I → 0, γ → 1 y las concentraciones aproximan actividades.
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={tabs} />
      </section>
    </div>
  );
}
