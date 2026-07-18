import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, LabelField, ModelBadge, NumberSegmented, PanelSection, ResultCard, ResultCardRow, Slider, Toggle } from '../components/Controls';
import { SideReactionEditor } from '../components/Editors';
import {
  batchIonExchange, breakthroughCurve, competitiveIonExchange, craigBreakthrough, isothermCurve, selectivityFromKd,
  exchangeDistributionCurve, optimalElutionPH3C, defaultSideEditorState,
  type SideReactionEditorState,
} from '../lib/ionExchange';
import { sideStackFromEditor } from '../lib/sideReactions';
import { formatMolar } from '../lib/format';
import { APPLICATION_PRESETS, RESIN_PRESETS } from '../lib/ionExchangeDatabase';
import { useT } from '../hooks/useT';

/** Ion exchange: selectivity, batch, isotherm, and column breakthrough. */
export default function IntercambioIonico() {
  const t = useT();
  const [resinId, setResinId] = useState('dowex50');
  const [labelA, setLabelA] = useState('Ca²⁺');
  const [labelB, setLabelB] = useState('Na⁺');
  const [zA, setZA] = useState(2);
  const [zB, setZB] = useState(1);
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
  const [showCraig, setShowCraig] = useState(false);
  const [nPlates, setNPlates] = useState(20);
  const [labelC, setLabelC] = useState('Mg²⁺');
  const [cC0, setCC0] = useState(0.003);
  const [kCB, setKCB] = useState(1.7);
  const [showIonD, setShowIonD] = useState(false);
  const [labelD, setLabelD] = useState('Sr²⁺');
  const [cD0, setCD0] = useState(0.002);
  const [kDB, setKDB] = useState(3.5);

  useShareEffect('ionexchange', {
    labelA, labelB, zA, zB, cA0, cB0, selectivity, resinCapacity, resinVolume, flowRate,
    showCraig, nPlates, labelC, cC0, kCB, showIonD, labelD, cD0, kDB,
  }, (s) => {
    if (s.labelA !== undefined) setLabelA(s.labelA as string);
    if (s.labelB !== undefined) setLabelB(s.labelB as string);
    if (typeof s.zA === 'number' && Number.isInteger(s.zA) && s.zA >= 1 && s.zA <= 4) setZA(s.zA);
    if (typeof s.zB === 'number' && Number.isInteger(s.zB) && s.zB >= 1 && s.zB <= 4) setZB(s.zB);
    if (s.cA0 !== undefined) setCA0(s.cA0 as number);
    if (s.cB0 !== undefined) setCB0(s.cB0 as number);
    if (s.selectivity !== undefined) setSelectivity(s.selectivity as number);
    if (s.resinCapacity !== undefined) setResinCapacity(s.resinCapacity as number);
    if (s.resinVolume !== undefined) setResinVolume(s.resinVolume as number);
    if (s.flowRate !== undefined) setFlowRate(s.flowRate as number);
    if (s.showCraig !== undefined) setShowCraig(s.showCraig as boolean);
    if (s.nPlates !== undefined) setNPlates(s.nPlates as number);
    if (s.labelC !== undefined) setLabelC(s.labelC as string);
    if (s.cC0 !== undefined) setCC0(s.cC0 as number);
    if (s.kCB !== undefined) setKCB(s.kCB as number);
    if (s.showIonD !== undefined) setShowIonD(s.showIonD as boolean);
    if (s.labelD !== undefined) setLabelD(s.labelD as string);
    if (s.cD0 !== undefined) setCD0(s.cD0 as number);
    if (s.kDB !== undefined) setKDB(s.kDB as number);
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
    setZA(r.zA);
    setZB(r.zB);
  }

  function reset() {
    applyResin('dowex50');
    setCA0(0.005);
    setCB0(0.01);
    setResinVolume(0.05);
    setVolume(0.1);
    setFlowRate(0.05);
    setShowCraig(false);
    setNPlates(20);
    setLabelC('Mg²⁺');
    setCC0(0.003);
    setKCB(1.7);
    setShowIonD(false);
    setLabelD('Sr²⁺');
    setCD0(0.002);
    setKDB(3.5);
  }

  const exportMetadata = useMemo(() => ({
    Módulo: 'Intercambio iónico',
    Resina: resinId,
    'Ión A': `${labelA} (z=${zA})`,
    'Ión B': `${labelB} (z=${zB})`,
    'K_BA': selectivity.toFixed(2),
    'Capacidad / meq g⁻¹': resinCapacity.toFixed(2),
  }), [resinId, labelA, labelB, zA, zB, selectivity, resinCapacity]);

  const baseParams = useMemo(() => ({
    cB0, selectivityAB: selectivity, resinCapacity, resinVolume, volume, zA, zB,
  }), [cB0, selectivity, resinCapacity, resinVolume, volume, zA, zB]);

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
      kHSquared, stack, hResin, ciMeq, massResinG, volumeL, [1, 14], 200, zA,
    ),
    [kHSquared, stack, hResin, ciMeq, massResinG, volumeL, zA],
  );
  const elution = useMemo(
    () => optimalElutionPH3C({
      nNiResin, vEdta, cEdta, logKfNiY, stack,
      kSelSquared: kHSquared, hResin, charge: zA,
    }),
    [nNiResin, vEdta, cEdta, logKfNiY, stack, kHSquared, hResin, zA],
  );
  const phiAtBulk = useMemo(() => {
    const idx = distCurve.pHs.reduce((best, pH, i) =>
      Math.abs(pH - pHBulk) < Math.abs(distCurve.pHs[best] - pHBulk) ? i : best, 0);
    return distCurve.phi[idx];
  }, [distCurve, pHBulk]);

  const craigResult = useMemo(
    () => craigBreakthrough({
      ions: [
        { label: labelA, c0: cA0, kSel: selectivity },
        { label: labelC, c0: cC0, kSel: kCB },
        ...(showIonD ? [{ label: labelD, c0: cD0, kSel: kDB }] : []),
      ],
      resinCapacity,
      resinVolume,
      nPlates,
    }),
    [labelA, cA0, selectivity, labelC, cC0, kCB, showIonD, labelD, cD0, kDB, resinCapacity, resinVolume, nPlates],
  );
  const exactCompetitive = useMemo(() => competitiveIonExchange({
    ions: [
      { label: labelA, c0: cA0, charge: zA, kSelectivity: selectivity },
      { label: labelC, c0: cC0, charge: zA, kSelectivity: kCB },
      ...(showIonD ? [{ label: labelD, c0: cD0, charge: zA, kSelectivity: kDB }] : []),
    ],
    counterIonConcentration: cB0,
    counterIonCharge: zB,
    capacityEq: resinCapacity * resinVolume,
    solutionVolume: volume,
  }), [labelA, cA0, zA, selectivity, labelC, cC0, kCB, showIonD, labelD, cD0, kDB, cB0, zB, resinCapacity, resinVolume, volume]);

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
      x: [
        t('intercambioIonico.solutionLabel', { label: labelA }),
        t('intercambioIonico.solutionLabel', { label: labelB }),
        t('intercambioIonico.resinLabel', { label: labelA }),
        t('intercambioIonico.resinLabel', { label: labelB }),
      ],
      y: [eq.cAeq, eq.cBeq, eq.fracAInResin, eq.fracBInResin],
      type: 'bar',
      marker: { color: ['#0072B2', '#D55E00', '#0072B2', '#D55E00'] },
      hovertemplate: '%{x}<br>=%{y:.4f}<extra></extra>',
    },
  ], [eq, labelA, labelB, t]);

  const tabs = [
    {
      id: 'bars',
      label: t('intercambioIonico.tabBatchDistribution'),
      node: (
        <Chart
          data={barTraces}
          xTitle=""
          yTitle={t('intercambioIonico.concOrResinFractionLabel')}
          exportName="equilibria-ion-exchange-bars"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'isotherm',
      label: t('intercambioIonico.tabIsotherm'),
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
          xTitle={t('intercambioIonico.equilibriumConcLabel', { label: labelA })}
          yTitle={t('intercambioIonico.qInResinLabel')}
          exportName="equilibria-ion-exchange-isotherm"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'column',
      label: t('intercambioIonico.tabBreakthrough'),
      node: (
        <Chart
          data={[{
            x: breakthrough.bedVolumes,
            y: breakthrough.cRatio,
            type: 'scatter',
            mode: 'lines',
            name: 'C/C₀',
            line: { width: 3, color: '#0072B2' },
            hovertemplate: 'BV = %{x:.2f}<br>C/C₀ = %{y:.3f}<extra></extra>',
          }]}
          xTitle={t('intercambioIonico.bedVolumesLabel')}
          yTitle={t('intercambioIonico.cOverC0EffluentLabel')}
          yRange={[0, 1.05]}
          exportName="equilibria-ion-exchange-breakthrough"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'ksel',
      label: t('intercambioIonico.tabKselVsCharge'),
      node: (
        <Chart
          data={[{
            x: kselCurve.ks,
            y: kselCurve.fracA,
            type: 'scatter',
            mode: 'lines',
            name: t('intercambioIonico.pctInResinLabel', { label: labelA }),
            line: { width: 3, color: '#0072B2' },
          }]}
          xTitle={t('intercambioIonico.kselPreferredLabel')}
          yTitle={t('intercambioIonico.fractionInResinLabel', { label: labelA })}
          xRange={[0.01, 100]}
          shapes={[{
            type: 'line',
            x0: selectivity, x1: selectivity, y0: 0, y1: 1,
            line: { color: '#7F8C8D', width: 2, dash: 'dash' },
          }]}
          exportName="equilibria-ion-exchange-ksel"
          exportMetadata={exportMetadata}
        />
      ),
    },
    ...(showCraig && craigResult.bv.length > 0 ? [{
      id: 'multizona',
      label: t('intercambioIonico.tabMultizone'),
      node: (
        <Chart
          data={[labelA, labelC, ...(showIonD ? [labelD] : [])].map((label, i) => ({
            x: craigResult.bv,
            y: craigResult.cRatios[i],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: label,
            line: { width: 3, color: ['#0072B2', '#D55E00', '#009E73'][i] },
            hovertemplate: 'BV = %{x:.1f}<br>C/C₀ = %{y:.3f}<extra></extra>',
          }))}
          xTitle={t('intercambioIonico.bedVolumesLabel')}
          yTitle="C / C₀"
          yRange={[0, 1.05]}
          exportName="equilibria-ion-exchange-multizona"
          exportMetadata={exportMetadata}
        />
      ),
    }] : []),
    ...(showCompetitive ? [{
      id: 'dph',
      label: t('intercambioIonico.tabDPhiVsPH'),
      node: (
        <Chart
          data={[
            {
              x: distCurve.pHs, y: distCurve.logD, type: 'scatter', mode: 'lines',
              name: 'log D', line: { width: 3, color: '#0072B2' },
            },
            {
              x: distCurve.pHs, y: distCurve.phi, type: 'scatter', mode: 'lines',
              name: t('intercambioIonico.phiFractionLabel'), line: { width: 2.5, color: '#D55E00', dash: 'dot' },
              yaxis: 'y2',
            },
          ]}
          xTitle="pH"
          yTitle="log D"
          exportName="equilibria-ion-exchange-dph"
          exportMetadata={exportMetadata}
        />
      ),
    }] : []),
    ...(showCompetitive && showElution ? [{
      id: 'elution',
      label: t('intercambioIonico.tabEdtaElution'),
      node: (
        <Chart
          data={[{
            x: elution.pHs, y: elution.fractions.map((f) => f * 100),
            type: 'scatter', mode: 'lines',
            name: t('intercambioIonico.pctNiEluted'), line: { width: 3, color: '#009E73' },
            hovertemplate: 'pH = %{x:.1f}<br>%{y:.1f} % eluido<extra></extra>',
          }]}
          xTitle={t('intercambioIonico.elutionPHLabel')}
          yTitle={t('intercambioIonico.pctNiRecoveredLabel')}
          yRange={[0, 105]}
          shapes={[{
            type: 'line', x0: elution.pH, x1: elution.pH, y0: 0, y1: 105,
            line: { color: '#CC79A7', width: 2, dash: 'dashdot' },
          }]}
          exportName="equilibria-ion-exchange-elution"
          exportMetadata={exportMetadata}
        />
      ),
    }] : []),
  ];

  return (
    <div className="module">
      <PanelShell title={t('intercambioIonico.title')} onReset={reset} moduleId="ionexchange" guideId="ionexchange">
        <PanelSection title={t('acidoBase.systemSection')}>
        <ModelBadge
          model={t('intercambioIonico.model')}
          additions={[zA !== zB ? t('intercambioIonico.chargesAddition', { a: zA, b: zB }) : null, showCraig && t('intercambioIonico.addExactCompetition')]}
        />
        <p className="hint">{t('intercambioIonico.resinsHint')}</p>
        <div className="preset-chip-row preset-chip-row-spaced">
          {RESIN_PRESETS.map((p) => (
            <button type="button"
              key={p.id}
              className={resinId === p.id ? 'preset-chip active' : 'preset-chip'}
              onClick={() => applyResin(p.id)}
            >
              {p.name.split(' (')[0]}
            </button>
          ))}
        </div>
        <p className="hint">{t('intercambioIonico.applicationsHint')}</p>
        <div className="preset-chip-row preset-chip-row-roomy">
          {APPLICATION_PRESETS.map((p) => (
            <button type="button"
              key={p.id}
              className="preset-chip"
              onClick={() => {
                applyResin(p.resinId);
                setLabelA(p.ionA);
                setLabelB(p.ionB);
                setZA(p.zA);
                setZB(p.zB);
                setCA0(p.cA0);
                setCB0(p.cB0);
                setSelectivity(p.ksel);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <LabelField label={t('intercambioIonico.cationALabel')} value={labelA} onChange={setLabelA} />
        <NumberSegmented label={t('intercambioIonico.chargeOfLabel', { label: labelA, z: 'zA' })} value={zA} options={[1, 2, 3, 4]} onChange={setZA} />
        <LabelField label={t('intercambioIonico.cationBLabel')} value={labelB} onChange={setLabelB} />
        <NumberSegmented label={t('intercambioIonico.chargeOfLabel', { label: labelB, z: 'zB' })} value={zB} options={[1, 2, 3, 4]} onChange={setZB} />
        <ConcSlider label={t('intercambioIonico.initialConcLabel', { label: labelA })} value={cA0} onChange={setCA0} min={-4} max={-1} />
        <ConcSlider label={t('intercambioIonico.initialConcLabel', { label: labelB })} value={cB0} onChange={setCB0} min={-4} max={-1} />
        <Slider label={t('intercambioIonico.kselOverLabel')} helpId="Ksel" value={selectivity} min={0.1} max={50} step={0.1} onChange={setSelectivity} decimals={1} />
        {zA !== zB && (
          <p className="hint">
            {t('intercambioIonico.stoichiometryHint', { zA, zB })}
          </p>
        )}
        <Slider label={t('intercambioIonico.resinCapacityLabel')} helpId="capacity" value={resinCapacity} min={0.5} max={5} step={0.1} onChange={setResinCapacity} decimals={1} />
        <Slider label={t('intercambioIonico.resinVolumeLabel')} value={resinVolume} min={0.01} max={0.2} step={0.01} onChange={setResinVolume} decimals={2} />
        <Slider label={t('intercambioIonico.solutionVolumeLabel')} value={volume} min={0.05} max={0.5} step={0.01} onChange={setVolume} decimals={2} />
        <Slider label={t('intercambioIonico.flowRateLabel')} value={flowRate} min={0.01} max={0.2} step={0.01} onChange={setFlowRate} decimals={2} />
        </PanelSection>

        <PanelSection title={t('intercambioIonico.hCompetitionSection')}>
        <Toggle
          label={t('intercambioIonico.cationicCompetitionToggle')}
          checked={showCompetitive}
          onChange={setShowCompetitive}
        />
        {showCompetitive && (
          <div className="mask-section">
            <Slider label="K²_H/M" helpId="K2HM" value={kHSquared} min={0.1} max={20} step={0.1} onChange={setKHSquared} decimals={1} />
            <Slider label={t('intercambioIonico.pHBulkLabel')} value={pHBulk} min={1} max={14} step={0.1} onChange={setPHBulk} decimals={1} />
            <ConcSlider label={t('intercambioIonico.hResinConcLabel')} value={hResin} onChange={setHResin} min={-4} max={-1} />
            <Slider label={t('intercambioIonico.ciLabel')} value={ciMeq} min={1} max={10} step={0.5} onChange={setCiMeq} decimals={1} />
            <Slider label="m_R (g)" value={massResinG} min={0.1} max={5} step={0.1} onChange={setMassResinG} decimals={1} />
            <Slider label="V (L)" value={volumeL} min={0.05} max={1} step={0.05} onChange={setVolumeL} decimals={2} />
            <SideReactionEditor state={side} onChange={setSide} showLigandPKas={false} />
            <Toggle label={t('intercambioIonico.edtaElutionToggle')} checked={showElution} onChange={setShowElution} />
            {showElution && (
              <>
                <Slider label="log Kf NiY" helpId="logKf" value={logKfNiY} min={10} max={25} step={0.01} onChange={setLogKfNiY} decimals={2} />
                <ConcSlider label="[EDTA] (M)" value={cEdta} onChange={setCEdta} min={-3} max={0} />
                <Slider label="V EDTA (L)" value={vEdta} min={0.05} max={0.5} step={0.05} onChange={setVEdta} decimals={2} />
                <Slider label={t('intercambioIonico.nNiInResinLabel')} value={nNiResin} min={0.0001} max={0.01} step={0.0001} onChange={setNNiResin} decimals={4} />
              </>
            )}
          </div>
        )}
        </PanelSection>

        <PanelSection title={t('intercambioIonico.multizoneColumnSection')} collapsible defaultOpen={false}>
          <Toggle
            label={t('intercambioIonico.craigModelToggle')}
            checked={showCraig}
            onChange={setShowCraig}
          />
          {showCraig && (
            <div className="mask-section">
              <Slider
                label={t('intercambioIonico.theoreticalPlatesLabel')}
                value={nPlates}
                min={1}
                max={50}
                step={1}
                onChange={setNPlates}
                decimals={0}
              />
              <p className="hint">{t('intercambioIonico.plateHint')}</p>
              <LabelField label={t('intercambioIonico.secondIonLabel', { label: labelB })} value={labelC} onChange={setLabelC} />
              <ConcSlider label={t('intercambioIonico.initialConcLabel', { label: labelC })} value={cC0} onChange={setCC0} min={-4} max={-1} />
              <Slider
                label={t('intercambioIonico.kselRatioLabel', { a: labelC, b: labelB })}
                value={kCB}
                min={0.1}
                max={20}
                step={0.1}
                onChange={setKCB}
                decimals={1}
              />
              <Toggle
                label={t('intercambioIonico.addThirdIonToggle')}
                checked={showIonD}
                onChange={setShowIonD}
              />
              {showIonD && (
                <>
                  <LabelField label={t('intercambioIonico.thirdIonLabel', { label: labelB })} value={labelD} onChange={setLabelD} />
                  <ConcSlider label={t('intercambioIonico.initialConcLabel', { label: labelD })} value={cD0} onChange={setCD0} min={-4} max={-1} />
                  <Slider
                    label={t('intercambioIonico.kselRatioLabel', { a: labelD, b: labelB })}
                    value={kDB}
                    min={0.1}
                    max={20}
                    step={0.1}
                    onChange={setKDB}
                    decimals={1}
                  />
                </>
              )}
            </div>
          )}
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')}>
          <ResultCard items={[
            { label: t('intercambioIonico.finalConcLabel', { label: labelA }), value: formatMolar(eq.cAeq) },
            { label: t('intercambioIonico.finalConcLabel', { label: labelB }), value: formatMolar(eq.cBeq) },
            { label: t('intercambioIonico.labelInResinLabel', { label: labelA }), value: `${(eq.fracAInResin * 100).toFixed(1)} %` },
            { label: t('intercambioIonico.kselReferenceLabel'), value: selectivityFromKd(selectivity, 1).toFixed(1) },
            ...(showCompetitive ? [
              { label: t('intercambioIonico.phiAtPHLabel', { ph: pHBulk.toFixed(1) }), value: `${(phiAtBulk * 100).toFixed(1)} %` },
              ...(showElution ? [
                { label: t('intercambioIonico.optimalElutionPHLabel'), value: elution.pH.toFixed(1) },
                { label: t('intercambioIonico.elutedFractionLabel'), value: `${(elution.fractionEluted * 100).toFixed(0)} %` },
              ] : []),
            ] : []),
            ...(showCraig ? [
              { label: t('intercambioIonico.exactAqueousLabel', { label: labelA }), value: formatMolar(exactCompetitive.aqueous[0]) },
              { label: t('intercambioIonico.exactAqueousLabel', { label: labelC }), value: formatMolar(exactCompetitive.aqueous[1]) },
              { label: t('intercambioIonico.exactCounterIonLabel', { label: labelB }), value: formatMolar(exactCompetitive.counterIonAqueous) },
            ] : []),
          ]} />
        </PanelSection>

        <InfoBox title={t('intercambioIonico.infoBoxTitle')}>
          <p>
            {t('intercambioIonico.para1Prefix')}<code>{t('intercambioIonico.para1Code')}</code>
            {t('intercambioIonico.para1Mid1')}<strong>{t('intercambioIonico.isothermBold')}</strong>
            {t('intercambioIonico.para1Mid2')}<strong>{t('intercambioIonico.breakthroughBold')}</strong>{t('intercambioIonico.para1Suffix')}
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={tabs} />
        <ResultCardRow items={[
          { label: t('intercambioIonico.labelInResinLabel', { label: labelA }), value: `${(eq.fracAInResin * 100).toFixed(1)} %`, accent: true },
          ...(showCompetitive
            ? [{ label: t('intercambioIonico.phiAtPHLabel', { ph: pHBulk.toFixed(1) }), value: `${(phiAtBulk * 100).toFixed(1)} %` }]
            : []),
          ...(showCompetitive && showElution
            ? [{ label: t('intercambioIonico.elutionPHShortLabel'), value: elution.pH.toFixed(1) }]
            : []),
          ...(showCraig && craigResult.bvBreaks.length >= 2 ? [
            { label: t('intercambioIonico.bv50Label', { label: labelA }), value: craigResult.bvBreaks[0].toFixed(0) },
            { label: t('intercambioIonico.bv50Label', { label: labelC }), value: craigResult.bvBreaks[1].toFixed(0) },
            ...(showIonD && craigResult.bvBreaks.length >= 3
              ? [{ label: t('intercambioIonico.bv50Label', { label: labelD }), value: craigResult.bvBreaks[2].toFixed(0) }]
              : []),
          ] : []),
        ]} />
      </section>
    </div>
  );
}
