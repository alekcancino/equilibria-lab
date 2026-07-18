import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import { useT } from '../hooks/useT';
import type { Annotations, Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, Disclosure, InfoBox, ModelBadge, PanelSection, ResultCard, ResultCardRow, Segmented, Slider,
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
import { ionPairFractions, overallIonizationConstant } from '../lib/ionPairing';

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

const MODEL_VALIDITY: Record<GammaModel, { maxI: number; plotMax: number }> = {
  dh: { maxI: 0.1, plotMax: 0.25 },
  kielland: { maxI: 0.1, plotMax: 0.25 },
  davies: { maxI: 0.5, plotMax: 1 },
  guntelberg: { maxI: 0.1, plotMax: 0.25 },
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
  const [showIonPairing, setShowIonPairing] = useState(false);
  const [pKi, setPKi] = useState(0.30103);
  const [pKd, setPKd] = useState(4.56864);

  useShareEffect('actividad', { cIon, z, pH, iMode, iDirect, model, ionIdx, showIonPairing, pKi, pKd }, (s) => {
    if (s.cIon !== undefined) setCIon(s.cIon);
    if (s.z !== undefined) setZ(s.z);
    if (s.pH !== undefined) setPH(s.pH);
    if (s.iMode) setIMode(s.iMode);
    if (s.iDirect !== undefined) setIDirect(s.iDirect);
    if (isValidModel(s.model)) setModel(s.model);
    if (typeof s.ionIdx === 'number' && Number.isInteger(s.ionIdx)
      && s.ionIdx >= 0 && s.ionIdx < ION_SIZES.length) setIonIdx(s.ionIdx);
    if (s.showIonPairing !== undefined) setShowIonPairing(s.showIonPairing);
    if (s.pKi !== undefined) setPKi(s.pKi);
    if (s.pKd !== undefined) setPKd(s.pKd);
  });

  function reset() {
    setCIon(0.1);
    setZ(1);
    setPH(7);
    setIMode('electrolyte');
    setIDirect(0.2);
    setModel('dh');
    setIonIdx(0);
    setShowIonPairing(false);
    setPKi(0.30103);
    setPKd(4.56864);
  }

  const ion = ION_SIZES[ionIdx];
  const zEff = model === 'kielland' ? ion.z : z;

  const I = useMemo(
    () => (iMode === 'impose' ? iDirect : ionicStrength([{ c: cIon, z: zEff }, { c: cIon, z: -zEff }])),
    [iMode, iDirect, cIon, zEff],
  );
  const validity = MODEL_VALIDITY[model];
  const chartMaxI = Math.max(validity.plotMax, Math.ceil(I * 1.15 * 20) / 20);
  const outsideValidity = I > validity.maxI + 1e-12;

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
  const pairConstants = { ionization: Math.pow(10, -pKi), dissociation: Math.pow(10, -pKd) };
  const pairFractions = ionPairFractions(pairConstants);
  const overallK = overallIonizationConstant(pairConstants);

  const gammaTraces = useMemo<Data[]>(() => {
    const series = [
      { name: 'γ (z = ±1)', color: '#0072B2', width: 3, value: (ii: number) => gammaOf(model, 1, ii) },
      { name: 'γ (z = ±2)', color: '#D55E00', width: 2.5, value: (ii: number) => gammaOf(model, 2, ii) },
      { name: 'γ (z = ±3)', color: '#009E73', width: 2.5, value: (ii: number) => gammaOf(model, 3, ii) },
    ];
    if (model === 'kielland') {
      series.push({
        name: `γ (${ion.label}, a = ${ion.a} Å)`,
        color: '#CC79A7', width: 3,
        value: (ii: number) => activityCoefficient(ion.z, ii, ion.a),
      });
    }
    const sample = (start: number, end: number) => Array.from({ length: I_POINTS + 1 }, (_, index) => (
      start + (end - start) * index / I_POINTS
    ));
    const validI = sample(0, validity.maxI);
    const approximateI = chartMaxI > validity.maxI ? sample(validity.maxI, chartMaxI) : [];
    const traces: Data[] = series.flatMap((entry) => [
      {
        x: validI, y: validI.map(entry.value), type: 'scatter', mode: 'lines', name: entry.name,
        line: { width: entry.width, color: entry.color },
      } as Data,
      ...(approximateI.length > 0 ? [{
        x: approximateI, y: approximateI.map(entry.value), type: 'scatter', mode: 'lines',
        name: `${entry.name} · ${t('actividad.extrapolationShort')}`,
        showlegend: false,
        line: { width: entry.width, color: entry.color, dash: 'dot' },
        hovertemplate: `I = %{x:.3f} M<br>γ = %{y:.4f}<br>${t('actividad.extrapolatedHover')}<extra></extra>`,
      } as Data] : []),
    ]);
    return traces;
  }, [model, ion, validity.maxI, chartMaxI, t]);

  const validityShapes = useMemo<Partial<Shape>[]>(() => [
    ...(chartMaxI > validity.maxI ? [{
      type: 'rect' as const,
      x0: validity.maxI, x1: chartMaxI, y0: 0, y1: 1, yref: 'paper' as const,
      fillcolor: 'rgba(217, 119, 6, 0.10)', line: { width: 0 }, layer: 'below' as const,
    }, {
      type: 'line' as const,
      x0: validity.maxI, x1: validity.maxI, y0: 0, y1: 1, yref: 'paper' as const,
      line: { color: '#D97706', width: 1.5, dash: 'dash' as const },
    }] : []),
    ...(I > 0 ? [{
      type: 'line' as const, x0: I, x1: I, y0: 0, y1: 1, yref: 'paper' as const,
      line: { color: '#CC79A7', width: 2, dash: 'dashdot' as const },
    }] : []),
  ], [chartMaxI, validity.maxI, I]);

  const validityAnnotations = useMemo<Partial<Annotations>[]>(() => chartMaxI > validity.maxI ? [{
    x: (validity.maxI + chartMaxI) / 2,
    y: 0.97,
    yref: 'paper',
    text: t('actividad.extrapolationRegion'),
    showarrow: false,
    font: { color: '#D97706', size: 11 },
  }] : [], [chartMaxI, validity.maxI, t]);

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
          xRange={[0, chartMaxI]}
          yRange={[0, 1.05]}
          shapes={validityShapes}
          annotations={validityAnnotations}
          exportName="equilibria-actividad-gamma"
          exportMetadata={exportMetadata}
        />
      ),
    },
    ...(showIonPairing ? [{
      id: 'ion-pairing',
      label: t('actividad.ionPairTab'),
      node: (
        <Chart
          data={[{
            x: [t('actividad.molecularSpecies'), t('actividad.ionPairSpecies'), t('actividad.freeIonsSpecies')],
            y: [pairFractions.molecular, pairFractions.ionPair, pairFractions.freeIons],
            type: 'bar', marker: { color: ['#0072B2', '#CC79A7', '#009E73'] },
            hovertemplate: 'α = %{y:.5f}<extra></extra>',
          }]}
          xTitle={t('actividad.chemicalStateAxis')} yTitle={t('actividad.fractionAxis')}
          yRange={[0, 1]} exportName="equilibria-actividad-ion-pairing" exportMetadata={exportMetadata}
        />
      ),
    }] : []),
  ];

  return (
    <div className="module">
      <PanelShell title={t('actividad.title')} onReset={reset} moduleId="actividad" guideId="actividad">
        <PanelSection title={t('acidoBase.systemSection')}>
          <ModelBadge model={modelLabelsT[model]} additions={[t('actividad.recommendedRange', { max: validity.maxI })]} />
          <div className="control">
            <div className="control-header">
              <span className="control-label">{t('actividad.gammaModelLabel')}</span>
            </div>
            <div className="control-input">
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
                className="editor-select control-select"
                value={ionIdx}
                onChange={(e) => setIonIdx(Number(e.target.value))}
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
              <div className="segmented control-input">
                {[1, 2, 3].map((v) => (
                  <button type="button" key={v} className={z === v ? 'seg-btn active' : 'seg-btn'} onClick={() => setZ(v)}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')}>
          <div className="control">
            <div className="control-header">
              <span className="control-label">{t('actividad.iSourceLabel')}</span>
            </div>
            <div className="control-input">
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
          <p className={`model-validity-note ${outsideValidity ? 'warn' : 'ok'}`} role="status">
            {outsideValidity
              ? t('actividad.outsideValidity', { value: I.toPrecision(3), max: validity.maxI })
              : t('actividad.withinValidity', { value: I.toPrecision(3), max: validity.maxI })}
          </p>
        </PanelSection>
        <PanelSection title={t('complejos.resultSection')}>
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
        <Disclosure title={t('actividad.ionPairSection')} open={showIonPairing} onToggle={setShowIonPairing}>
          <>
              <Slider label={t('actividad.pKiLabel')} value={pKi} min={-2} max={12} step={0.01} decimals={2} onChange={setPKi} />
              <Slider label={t('actividad.pKdLabel')} value={pKd} min={-2} max={12} step={0.01} decimals={2} onChange={setPKd} />
              <p className="hint">{t('actividad.ionPairHint')}</p>
          </>
        </Disclosure>
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
          ...(showIonPairing ? [
            { label: t('actividad.overallPKa'), value: (-Math.log10(overallK)).toFixed(3), accent: true },
            { label: t('actividad.ionPairFraction'), value: `${(100 * pairFractions.ionPair).toFixed(2)} %` },
            { label: t('actividad.freeIonFraction'), value: `${(100 * pairFractions.freeIons).toFixed(4)} %` },
          ] : []),
        ]} />
      </section>
    </div>
  );
}
