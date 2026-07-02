import { useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, InfoBox, ModelBadge, PanelSection, ResultCard, ResultCardRow, Segmented, Slider,
} from '../components/Controls';
import {
  ionicStrength,
  logActivityCoefficient,
  activityCoefficient,
  apparentPKw,
} from '../lib/activity';
import { formatMolar } from '../lib/format';

const I_POINTS = 200;

/** Ionic activity and Debye-Hückel correction (25 °C). */
export default function Actividad() {
  const [cIon, setCIon] = useState(0.1);
  const [z, setZ] = useState(1);
  const [pH, setPH] = useState(7);
  // Fuente de I: 'impose' fija I directamente (cambiar z NO cambia I);
  // 'electrolyte' la deriva del electrolito binario z:z (comportamiento previo).
  const [iMode, setIMode] = useState<'impose' | 'electrolyte'>('electrolyte');
  const [iDirect, setIDirect] = useState(0.2);

  function reset() {
    setCIon(0.1);
    setZ(1);
    setPH(7);
    setIMode('electrolyte');
    setIDirect(0.2);
  }

  const I = useMemo(
    () => (iMode === 'impose' ? iDirect : ionicStrength([{ c: cIon, z }, { c: cIon, z: -z }])),
    [iMode, iDirect, cIon, z],
  );
  const logGamma = logActivityCoefficient(z, I);
  // γ para las tres cargas más comunes a la I actual (spec issue #4 · C2).
  const gamma1 = activityCoefficient(1, I);
  const gamma2 = activityCoefficient(2, I);
  const gamma3 = activityCoefficient(3, I);
  const gammaH = gamma1;
  const gammaOH = gamma1;
  const pKwApp = apparentPKw(gammaH, gammaOH);

  const gammaTraces = useMemo<Data[]>(() => {
    const Is: number[] = [];
    const g1: number[] = [];
    const g2: number[] = [];
    const g3: number[] = [];
    for (let i = 0; i <= I_POINTS; i++) {
      const ii = (2 * i) / I_POINTS;
      Is.push(ii);
      g1.push(activityCoefficient(1, ii));
      g2.push(activityCoefficient(2, ii));
      g3.push(activityCoefficient(3, ii));
    }
    return [
      { x: Is, y: g1, type: 'scatter', mode: 'lines', name: 'γ (z = ±1)', line: { width: 3, color: '#0072B2' } },
      { x: Is, y: g2, type: 'scatter', mode: 'lines', name: 'γ (z = ±2)', line: { width: 2.5, color: '#D55E00' } },
      { x: Is, y: g3, type: 'scatter', mode: 'lines', name: 'γ (z = ±3)', line: { width: 2.5, color: '#009E73' } },
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
        <PanelSection title="Sistema" icon="⚛">
          <ModelBadge model="electrolito binario z:z en solución acuosa" />
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
        </PanelSection>
        <PanelSection title="Condiciones" icon="⚗">
          <div className="control">
            <div className="control-header">
              <span className="control-label">Fuente de I</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <Segmented
                options={[
                  { value: 'impose', label: 'Imponer I' },
                  { value: 'electrolyte', label: 'Por electrolito' },
                ]}
                value={iMode}
                onChange={(v) => setIMode(v as 'impose' | 'electrolyte')}
              />
            </div>
          </div>
          {iMode === 'impose' ? (
            <>
              <ConcSlider label="Fuerza iónica I impuesta" value={iDirect} onChange={setIDirect} min={-3} max={0} />
              <p className="hint">I fija: cambiar la carga z no altera I (útil para leer γ a I constante).</p>
            </>
          ) : (
            <ConcSlider label="Concentración del electrolito" value={cIon} onChange={setCIon} min={-3} max={0} />
          )}
          <Slider label="pH de referencia" value={pH} min={0} max={14} step={0.1} onChange={setPH} decimals={1} />
        </PanelSection>
        <PanelSection title="Resultado" icon="∑">
          <ResultCard items={[
            { label: 'Fuerza iónica I', value: `${I.toExponential(2)} M` },
            { label: 'γ (z = 1)', value: gamma1.toFixed(3) },
            { label: 'γ (z = 2)', value: gamma2.toFixed(3) },
            { label: 'γ (z = 3)', value: gamma3.toFixed(3) },
            { label: `log γ (z = ${z})`, value: logGamma.toFixed(3) },
            { label: 'pKw aparente', value: pKwApp.toFixed(2) },
            { label: 'a_H ≈ γ·[H⁺]', value: (gammaH * Math.pow(10, -pH)).toExponential(2) },
          ]} />
        </PanelSection>
        <InfoBox title="Debye-Hückel extendida">
          <p>
            A 25 °C, <code>log γ = −0.51 z² √I / (1 + 0.33·3·√I)</code> (a ≈ 3 Å).
            A I → 0, γ → 1 y las concentraciones aproximan actividades.
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={tabs} />
        <ResultCardRow items={[
          {
            label: 'Fuerza iónica I',
            value: Number.isFinite(I) ? formatMolar(I) : '—',
            accent: true,
          },
          { label: 'γ (z = 1)', value: Number.isFinite(gamma1) ? gamma1.toFixed(3) : '—' },
          { label: 'γ (z = 2)', value: Number.isFinite(gamma2) ? gamma2.toFixed(2) : '—' },
          { label: 'γ (z = 3)', value: Number.isFinite(gamma3) ? gamma3.toFixed(2) : '—' },
          { label: 'pKw aparente', value: Number.isFinite(pKwApp) ? pKwApp.toFixed(2) : '—' },
        ]} />
      </section>
    </div>
  );
}

