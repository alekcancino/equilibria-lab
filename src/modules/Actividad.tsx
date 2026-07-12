import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import { useT } from '../hooks/useT';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, InfoBox, ModelBadge, PanelSection, ResultCard, ResultCardRow, Segmented, Slider,
} from '../components/Controls';
import {
  ionicStrength,
  activityCoefficient,
  logActivityCoefficient,
  apparentPKw,
  ION_SIZES,
  gammaOf as libGammaOf,
  logGammaOf as libLogGammaOf,
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
 * applies to a specific ion, so its generic curves fall back to a = 3 Å —
 * same as the shared lib dispatcher's default branch). Delegates to
 * activity.ts's shared GammaModel dispatcher for the three models it also
 * offers to engine-side callers (AcidoBase, Mezclas, Solubilidad); 'kielland'
 * is Actividad-only (needs the ION_SIZES table), so it stays local. */
function gammaOf(model: GammaModel, z: number, I: number): number {
  if (model === 'davies' || model === 'guntelberg' || model === 'dh') return libGammaOf(model, z, I);
  return activityCoefficient(z, I);
}

function logGammaOf(model: GammaModel, z: number, I: number): number {
  if (model === 'davies' || model === 'guntelberg' || model === 'dh') return libLogGammaOf(model, z, I);
  return logActivityCoefficient(z, I);
}

/** Ionic activity: extended Debye-Hückel, Kielland sizes, Davies, Güntelberg (25 °C). */
export default function Actividad() {
  const t = useT();
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

  const modelLabelsT: Record<GammaModel, string> = {
    dh: t('actividad.modelDH'),
    kielland: t('actividad.modelKielland'),
    davies: t('actividad.modelDavies'),
    guntelberg: t('actividad.modelGuntelberg'),
  };

  const tabs = [
    {
      id: 'gamma',
      label: 'γ vs I',
      node: (
        <Chart
          data={gammaTraces}
          xTitle={t('actividad.ionicStrengthAxisLabel')}
          yTitle={t('actividad.gammaAxisLabel')}
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
      <PanelShell title={t('actividad.title')} onReset={reset} moduleId="actividad">
        <PanelSection title={t('acidoBase.systemSection')} icon="⚛">
          <ModelBadge model={modelLabelsT[model]} />
          <div className="control">
            <div className="control-header">
              <span className="control-label">{t('actividad.gammaModelLabel')}</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <Segmented
                options={[
                  { value: 'dh', label: t('actividad.extendedOption') },
                  { value: 'kielland', label: t('actividad.kiellandOption') },
                  { value: 'davies', label: t('actividad.modelDavies') },
                  { value: 'guntelberg', label: t('actividad.modelGuntelberg') },
                ]}
                value={model}
                onChange={(v) => setModel(isValidModel(v) ? v : 'dh')}
              />
            </div>
          </div>
          {model === 'kielland' ? (
            <div className="control">
              <div className="control-header">
                <span className="control-label">{t('actividad.kiellandIonLabel')}</span>
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
                <span className="control-label">{t('actividad.ionicChargeLabel')}</span>
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
        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          <div className="control">
            <div className="control-header">
              <span className="control-label">{t('actividad.iSourceLabel')}</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <Segmented
                options={[
                  { value: 'impose', label: t('actividad.imposeIOption') },
                  { value: 'electrolyte', label: t('actividad.byElectrolyteOption') },
                ]}
                value={iMode}
                onChange={(v) => setIMode(v as 'impose' | 'electrolyte')}
              />
            </div>
          </div>
          {iMode === 'impose' ? (
            <>
              <ConcSlider label={t('actividad.imposedIonicStrengthLabel')} helpId="ionicStrength" value={iDirect} onChange={setIDirect} min={-3} max={0} />
              <p className="hint">{t('actividad.fixedIHint')}</p>
            </>
          ) : (
            <ConcSlider label={t('actividad.electrolyteConcLabel')} value={cIon} onChange={setCIon} min={-3} max={0} />
          )}
          <Slider label={t('actividad.referencePHLabel')} value={pH} min={0} max={14} step={0.1} onChange={setPH} decimals={1} />
        </PanelSection>
        <PanelSection title={t('complejos.resultSection')} icon="∑">
          <ResultCard items={[
            { label: t('acidoBase.ionicStrengthLabel'), value: formatMolar(I) },
            { label: model === 'kielland' ? t('actividad.gammaZ1A3Label') : 'γ (z = 1)', value: gamma1.toFixed(3) },
            { label: model === 'kielland' ? t('actividad.gammaZ2A3Label') : 'γ (z = 2)', value: gamma2.toFixed(3) },
            { label: model === 'kielland' ? t('actividad.gammaZ3A3Label') : 'γ (z = 3)', value: gamma3.toFixed(3) },
            {
              label: model === 'kielland' ? `log γ (${ion.label})` : `log γ (z = ${z})`,
              value: logGammaMain.toFixed(3),
            },
            ...(model === 'kielland'
              ? [{ label: `γ (${ion.label})`, value: gammaMain.toFixed(3) }]
              : []),
            { label: t('actividad.apparentPKw'), value: pKwApp.toFixed(2), helpId: 'pKwApp' },
            { label: 'a_H ≈ γ·[H⁺]', value: formatSci(gammaH * Math.pow(10, -pH)) },
          ]} />
        </PanelSection>
        <InfoBox title={t('actividad.activityCoeffModelsTitle')}>
          <p>
            <strong>{t('actividad.dhExtendedBold')}</strong>: <code>log γ = −0.51 z² √I / (1 + 0.33·a·√I)</code>{t('actividad.dhExtendedBody')}
          </p>
          <p>
            <strong>{t('actividad.kiellandBold')}</strong>{t('actividad.kiellandBody')}
          </p>
          <p>
            <strong>{t('actividad.daviesBold')}</strong>: <code>log γ = −0.51 z² (√I/(1+√I) − 0.3·I)</code>{t('actividad.daviesBody')}
          </p>
          <p>
            <strong>{t('actividad.guntelbergBold')}</strong>: <code>log γ = −0.5 z² √I/(1+√I)</code>{t('actividad.guntelbergBody')}
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={tabs} />
        <ResultCardRow items={[
          {
            label: t('acidoBase.ionicStrengthLabel'),
            value: Number.isFinite(I) ? formatMolar(I) : '—',
            accent: true,
          },
          { label: 'γ (z = 1)', value: Number.isFinite(gamma1) ? gamma1.toFixed(3) : '—' },
          { label: 'γ (z = 2)', value: Number.isFinite(gamma2) ? gamma2.toFixed(2) : '—' },
          { label: 'γ (z = 3)', value: Number.isFinite(gamma3) ? gamma3.toFixed(2) : '—' },
          { label: t('actividad.apparentPKw'), value: Number.isFinite(pKwApp) ? pKwApp.toFixed(2) : '—', helpId: 'pKwApp' },
        ]} />
      </section>
    </div>
  );
}
