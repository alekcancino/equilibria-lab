import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
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
  logGammaDavies,
  gammaDavies,
  logGammaGuntelberg,
  gammaGuntelberg,
  apparentPKw,
  ION_SIZES,
} from '../lib/activity';
import { formatMolar, formatSci } from '../lib/format';

const I_POINTS = 200;

type GammaModel = 'dh' | 'kielland' | 'davies' | 'guntelberg';

function isValidModel(v: unknown): v is GammaModel {
  return v === 'dh' || v === 'kielland' || v === 'davies' || v === 'guntelberg';
}

const MODEL_LABELS: Record<GammaModel, string> = {
  dh: 'D-H extendida (a = 3 Å)',
  kielland: 'D-H con a por ion (Kielland)',
  davies: 'Davies',
  guntelberg: 'Güntelberg',
};

/** Generic-charge γ for the selected model (Kielland's per-ion size only
 * applies to a specific ion, so its generic curves fall back to a = 3 Å). */
function gammaOf(model: GammaModel, z: number, I: number): number {
  if (model === 'davies') return gammaDavies(z, I);
  if (model === 'guntelberg') return gammaGuntelberg(z, I);
  return activityCoefficient(z, I);
}

function logGammaOf(model: GammaModel, z: number, I: number): number {
  if (model === 'davies') return logGammaDavies(z, I);
  if (model === 'guntelberg') return logGammaGuntelberg(z, I);
  return logActivityCoefficient(z, I);
}

/** Ionic activity: extended Debye-Hückel, Kielland sizes, Davies, Güntelberg (25 °C). */
export default function Actividad() {
  const [cIon, setCIon] = useState(0.1);
  const [z, setZ] = useState(1);
  const [pH, setPH] = useState(7);
  // Fuente de I: 'impose' fija I directamente (cambiar z NO cambia I);
  // 'electrolyte' la deriva del electrolito binario z:z (comportamiento previo).
  const [iMode, setIMode] = useState<'impose' | 'electrolyte'>('electrolyte');
  const [iDirect, setIDirect] = useState(0.2);
  const [model, setModel] = useState<GammaModel>('dh');
  const [ionIdx, setIonIdx] = useState(0);

  useShareEffect('actividad', { cIon, z, pH, iMode, iDirect, model, ionIdx }, (s) => {
    if (s.cIon !== undefined) setCIon(s.cIon);
    if (s.z !== undefined) setZ(s.z);
    if (s.pH !== undefined) setPH(s.pH);
    if (s.iMode) setIMode(s.iMode);
    if (s.iDirect !== undefined) setIDirect(s.iDirect);
    if (isValidModel(s.model)) setModel(s.model);
    if (typeof s.ionIdx === 'number' && Number.isInteger(s.ionIdx)
      && s.ionIdx >= 0 && s.ionIdx < ION_SIZES.length) setIonIdx(s.ionIdx);
  });

  function reset() {
    setCIon(0.1);
    setZ(1);
    setPH(7);
    setIMode('electrolyte');
    setIDirect(0.2);
    setModel('dh');
    setIonIdx(0);
  }

  const ion = ION_SIZES[ionIdx];
  const zEff = model === 'kielland' ? ion.z : z;

  const I = useMemo(
    () => (iMode === 'impose' ? iDirect : ionicStrength([{ c: cIon, z: zEff }, { c: cIon, z: -zEff }])),
    [iMode, iDirect, cIon, zEff],
  );

  const logGammaMain = model === 'kielland'
    ? logActivityCoefficient(ion.z, I, ion.a)
    : logGammaOf(model, z, I);
  const gammaMain = Math.pow(10, logGammaMain);

  // γ for the three most common charge magnitudes at the current I.
  const gamma1 = gammaOf(model, 1, I);
  const gamma2 = gammaOf(model, 2, I);
  const gamma3 = gammaOf(model, 3, I);
  // pKw′ uses the ion-specific sizes when available (H⁺ a=9, OH⁻ a=3.5).
  const gammaH = model === 'kielland' ? activityCoefficient(1, I, 9) : gamma1;
  const gammaOH = model === 'kielland' ? activityCoefficient(1, I, 3.5) : gamma1;
  const pKwApp = apparentPKw(gammaH, gammaOH);

  const gammaTraces = useMemo<Data[]>(() => {
    const Is: number[] = [];
    const g1: number[] = [];
    const g2: number[] = [];
    const g3: number[] = [];
    const gIon: number[] = [];
    for (let i = 0; i <= I_POINTS; i++) {
      const ii = (2 * i) / I_POINTS;
      Is.push(ii);
      g1.push(gammaOf(model, 1, ii));
      g2.push(gammaOf(model, 2, ii));
      g3.push(gammaOf(model, 3, ii));
      if (model === 'kielland') gIon.push(activityCoefficient(ion.z, ii, ion.a));
    }
    const traces: Data[] = [
      { x: Is, y: g1, type: 'scatter', mode: 'lines', name: 'γ (z = ±1)', line: { width: 3, color: '#0072B2' } },
      { x: Is, y: g2, type: 'scatter', mode: 'lines', name: 'γ (z = ±2)', line: { width: 2.5, color: '#D55E00' } },
      { x: Is, y: g3, type: 'scatter', mode: 'lines', name: 'γ (z = ±3)', line: { width: 2.5, color: '#009E73' } },
    ];
    if (model === 'kielland') {
      traces.push({
        x: Is, y: gIon, type: 'scatter', mode: 'lines',
        name: `γ (${ion.label}, a = ${ion.a} Å)`,
        line: { width: 3, color: '#CC79A7', dash: 'dash' },
      });
    }
    return traces;
  }, [model, ion]);

  const exportMetadata = useMemo(() => ({
    Módulo: 'Actividad',
    Modelo: MODEL_LABELS[model],
    'Carga |z|': String(zEff),
    'C / M': cIon.toFixed(4),
    'I / M': I.toFixed(4),
    ...(model === 'kielland' ? { Ion: ion.label, 'a / Å': String(ion.a) } : {}),
  }), [model, zEff, cIon, I, ion]);

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
          exportMetadata={exportMetadata}
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title="Actividad y Debye-Hückel" onReset={reset} moduleId="actividad">
        <PanelSection title="Sistema" icon="⚛">
          <ModelBadge model={MODEL_LABELS[model]} />
          <div className="control">
            <div className="control-header">
              <span className="control-label">Modelo de γ</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <Segmented
                options={[
                  { value: 'dh', label: 'D-H (a=3 Å)' },
                  { value: 'kielland', label: 'Kielland' },
                  { value: 'davies', label: 'Davies' },
                  { value: 'guntelberg', label: 'Güntelberg' },
                ]}
                value={model}
                onChange={(v) => setModel(isValidModel(v) ? v : 'dh')}
              />
            </div>
          </div>
          {model === 'kielland' ? (
            <div className="control">
              <div className="control-header">
                <span className="control-label">Ion (a de Kielland)</span>
                <span className="control-value">a = {ion.a} Å · z = {ion.z}</span>
              </div>
              <select
                className="editor-select"
                value={ionIdx}
                onChange={(e) => setIonIdx(Number(e.target.value))}
                style={{ marginTop: 6, width: '100%' }}
              >
                {ION_SIZES.map((it, i) => (
                  <option key={it.label} value={i}>{it.label} (a = {it.a} Å)</option>
                ))}
              </select>
            </div>
          ) : (
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
          )}
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
              <ConcSlider label="Fuerza iónica I impuesta" helpId="ionicStrength" value={iDirect} onChange={setIDirect} min={-3} max={0} />
              <p className="hint">I fija: cambiar la carga z no altera I (útil para leer γ a I constante).</p>
            </>
          ) : (
            <ConcSlider label="Concentración del electrolito" value={cIon} onChange={setCIon} min={-3} max={0} />
          )}
          <Slider label="pH de referencia" value={pH} min={0} max={14} step={0.1} onChange={setPH} decimals={1} />
        </PanelSection>
        <PanelSection title="Resultado" icon="∑">
          <ResultCard items={[
            { label: 'Fuerza iónica I', value: formatMolar(I) },
            { label: 'γ (z = 1)', value: gamma1.toFixed(3) },
            { label: 'γ (z = 2)', value: gamma2.toFixed(3) },
            { label: 'γ (z = 3)', value: gamma3.toFixed(3) },
            {
              label: model === 'kielland' ? `log γ (${ion.label})` : `log γ (z = ${z})`,
              value: logGammaMain.toFixed(3),
            },
            ...(model === 'kielland'
              ? [{ label: `γ (${ion.label})`, value: gammaMain.toFixed(3) }]
              : []),
            { label: 'pKw aparente', value: pKwApp.toFixed(2), helpId: 'pKwApp' },
            { label: 'a_H ≈ γ·[H⁺]', value: formatSci(gammaH * Math.pow(10, -pH)) },
          ]} />
        </PanelSection>
        <InfoBox title="Modelos de coeficiente de actividad">
          <p>
            <strong>D-H extendida</strong>: <code>log γ = −0.51 z² √I / (1 + 0.33·a·√I)</code> con
            a = 3 Å genérico; válida hasta I ≈ 0.1 M.
          </p>
          <p>
            <strong>Kielland</strong>: la misma ecuación con el tamaño a tabulado por ion
            (Kielland 1937; Harris tabla 8-1) — ej. a = 9 Å para H⁺, 6 Å para Ca²⁺.
          </p>
          <p>
            <strong>Davies</strong>: <code>log γ = −0.51 z² (√I/(1+√I) − 0.3·I)</code>; sin
            parámetro de tamaño, usable hasta I ≈ 0.5 M. Es la forma que usa Spana/HALTAFALL.
          </p>
          <p>
            <strong>Güntelberg</strong>: <code>log γ = −0.5 z² √I/(1+√I)</code> — la forma
            simplificada de muchos cursos. A I = 0.2 y z = 2 da γ = 0.241, mientras la D-H
            extendida con a = 3 Å da 0.233: si tu libro reporta otro valor, revisa qué
            convención usa.
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
          { label: 'pKw aparente', value: Number.isFinite(pKwApp) ? pKwApp.toFixed(2) : '—', helpId: 'pKwApp' },
        ]} />
      </section>
    </div>
  );
}
