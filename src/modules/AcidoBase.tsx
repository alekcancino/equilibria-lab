import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data, Shape } from 'plotly.js';
import PanelShell from '../components/PanelShell';
import Chart from '../components/Chart';
import PredominanceDiagram from '../components/PredominanceDiagram';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, PanelSection, ResultCardRow, Segmented, Slider, Toggle } from '../components/Controls';
import { AcidSystemEditor } from '../components/Editors';
import { defaultAcidSystem, isValidAcidSystem, systemLabels, type AcidSystem } from '../lib/editorModels';
import { MARKER_COLOR, SPECIES_COLORS } from '../lib/database';
import { ladderFractions, ladderLogC, predominanceZones } from '../lib/ladder';
import { glycineMacroConstants, glycineMicrostateFractions } from '../lib/acidBaseMicrostates';
import { solvePH, saltCounterIons, defaultStartIndex } from '../lib/equilibrium';
import type { GammaModel } from '../lib/activity';
import { useActivityNote } from '../context/ActivityContext';
import { useT } from '../hooks/useT';

const PH_POINTS = 400;
function isValidGammaModel(v: unknown): v is GammaModel {
  return v === 'dh' || v === 'davies' || v === 'guntelberg';
}

/** Acid-base equilibrium (mono and polyprotic): predominance diagram + α distribution + logC diagram. */
export default function AcidoBase() {
  const t = useT();
  const GAMMA_MODELS: { value: GammaModel; label: string }[] = useMemo(() => [
    { value: 'dh', label: t('acidoBase.gammaDH') },
    { value: 'davies', label: t('acidoBase.gammaDavies') },
    { value: 'guntelberg', label: t('acidoBase.gammaGuntelberg') },
  ], [t]);
  const { showActivityNote } = useActivityNote();
  const [system, setSystem] = useState<AcidSystem>(defaultAcidSystem());
  const [conc, setConc] = useState(0.1);
  const [showSystemPH, setShowSystemPH] = useState(false);
  const [ionicStrength, setIonicStrength] = useState(0);
  const [gammaModel, setGammaModel] = useState<GammaModel>('dh');
  const [showMicrostates, setShowMicrostates] = useState(false);
  const [microPKas, setMicroPKas] = useState([2.31, 9.62, 7.62, 4.31]);

  useShareEffect('acidobase', { system, conc, showSystemPH, ionicStrength, gammaModel, showMicrostates, microPKas }, (s) => {
    // A malformed/stale system (untrusted URL) NaN-poisons solvePH into a
    // silent bogus pH instead of an error — same class of bug fixed in
    // Mezclas.tsx, guarded here too since this module restores AcidSystem
    // the same way.
    if (isValidAcidSystem(s.system)) setSystem(s.system);
    if (s.conc !== undefined) setConc(s.conc);
    if (s.showSystemPH !== undefined) setShowSystemPH(s.showSystemPH);
    if (s.ionicStrength !== undefined) setIonicStrength(s.ionicStrength);
    if (isValidGammaModel(s.gammaModel)) setGammaModel(s.gammaModel);
    if (s.showMicrostates !== undefined) setShowMicrostates(s.showMicrostates);
    if (Array.isArray(s.microPKas) && s.microPKas.length === 4 && s.microPKas.every(Number.isFinite)) setMicroPKas(s.microPKas);
  });

  function reset() {
    setSystem(defaultAcidSystem()); setConc(0.1); setShowSystemPH(false);
    setIonicStrength(0); setGammaModel('dh');
    setShowMicrostates(false); setMicroPKas([2.31, 9.62, 7.62, 4.31]);
  }

  const labels = systemLabels(system);
  const logCtotal = Math.log10(conc);

  const exportMetadata = useMemo(() => ({
    Módulo: 'Ácido-Base',
    Sistema: system.label,
    'C / M': conc.toFixed(4),
    'I / M': ionicStrength.toFixed(3),
    'Modelo γ': GAMMA_MODELS.find((m) => m.value === gammaModel)?.label ?? gammaModel,
  }), [system.label, conc, ionicStrength, gammaModel, GAMMA_MODELS]);

  const pHSystem = useMemo(() => {
    // "pH disolución pura" dissolves the system at its default ladder index
    // (the neutral species when one exists; the parent ion itself for an
    // aqua-acid cation that never reaches neutral, e.g. Fe³⁺) — see
    // saltCounterIons/defaultStartIndex in equilibrium.ts for the general
    // derivation, shared with titration.ts's analyte handling.
    const { cations, anions } = saltCounterIons(system.z0, defaultStartIndex(system.z0, system.pKas.length));
    return solvePH([{ c: conc, z0: system.z0, pKas: system.pKas }], cations * conc, anions * conc, ionicStrength, gammaModel);
  }, [system, conc, ionicStrength, gammaModel]);
  const pHInvalid = !Number.isFinite(pHSystem);

  // α distribution vs pH
  const alphaTraces = useMemo<Data[]>(() => {
    const phs: number[] = [];
    const series: number[][] = system.pKas.map(() => []).concat([[]]);
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      ladderFractions(pH, system.pKas, true, system.z0, ionicStrength, gammaModel).forEach((a, j) => series[j].push(a));
    }
    return series.map((ys, j) => ({
      x: phs, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? t('acidoBase.speciesFallback', { n: j }),
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `α = %{y:.3f}<extra>${labels[j] ?? ''}</extra>`,
    }));
  }, [system, labels, ionicStrength, gammaModel, t]);

  // logC vs pH diagram (Sillén) with H₃O⁺/OH⁻ lines
  const logCTraces = useMemo<Data[]>(() => {
    const phs: number[] = [];
    const series: number[][] = system.pKas.map(() => []).concat([[]]);
    const hLine: number[] = [];
    const ohLine: number[] = [];
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      ladderLogC(pH, system.pKas, true, logCtotal, system.z0, ionicStrength, gammaModel).forEach((lc, j) => series[j].push(lc));
      hLine.push(-pH);
      ohLine.push(pH - 14);
    }
    const data: Data[] = series.map((ys, j) => ({
      x: phs, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? t('acidoBase.speciesFallback', { n: j }),
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `log C = %{y:.2f}<extra>${labels[j] ?? ''}</extra>`,
    }));
    data.push(
      { x: phs, y: hLine, type: 'scatter', mode: 'lines', name: 'H₃O⁺', line: { width: 2, color: '#7f8c8d', dash: 'dash' } },
      { x: phs, y: ohLine, type: 'scatter', mode: 'lines', name: 'OH⁻', line: { width: 2, color: '#95a5a6', dash: 'dot' } },
    );
    return data;
  }, [system, labels, logCtotal, ionicStrength, gammaModel, t]);

  const zones = useMemo(
    () => predominanceZones(system.pKas, labels, 0, 14, true, system.z0, ionicStrength, gammaModel),
    [system, labels, ionicStrength, gammaModel],
  );

  const systemShape = useMemo<Partial<Shape>[]>(() => {
    if (!showSystemPH) return [];
    return [{ type: 'line', x0: pHSystem, x1: pHSystem, y0: -14, y1: 1.02, line: { color: MARKER_COLOR, width: 2, dash: 'dashdot' } }];
  }, [showSystemPH, pHSystem]);

  const alphasAtPH = Number.isFinite(pHSystem)
    ? ladderFractions(pHSystem, system.pKas, true, system.z0, ionicStrength, gammaModel)
    : system.pKas.map(() => 0);
  const domIdx = alphasAtPH.indexOf(Math.max(...alphasAtPH));

  // "% + operating point" metrics.
  // pH for 50 % of the active transition = the pKa nearest to the system pH
  // (at pH = pKa the conjugate pair crosses at 50 %).
  const pctDominante = (alphasAtPH[domIdx] ?? 0) * 100;
  const transitionPKa = useMemo(() => {
    if (system.pKas.length === 0 || !Number.isFinite(pHSystem)) return null;
    return system.pKas.reduce((best, pk) =>
      Math.abs(pk - pHSystem) < Math.abs(best - pHSystem) ? pk : best, system.pKas[0]);
  }, [system.pKas, pHSystem]);

  const microConstants = useMemo(() => ({
    pKaToZwitterion: microPKas[0],
    pKaFromZwitterion: microPKas[1],
    pKaToNeutral: microPKas[2],
    pKaFromNeutral: microPKas[3],
  }), [microPKas]);
  const microMacro = useMemo(() => glycineMacroConstants(microConstants), [microConstants]);
  const microTraces = useMemo<Data[]>(() => {
    const phs = Array.from({ length: PH_POINTS + 1 }, (_, i) => 14 * i / PH_POINTS);
    const values = phs.map((value) => glycineMicrostateFractions(microConstants, value));
    return [
      { key: 'protonated', label: 'H₂A⁺' },
      { key: 'zwitterion', label: '⁺H₃N–CHR–COO⁻' },
      { key: 'neutral', label: 'H₂N–CHR–COOH' },
      { key: 'deprotonated', label: 'A⁻' },
    ].map(({ key, label }, index) => ({
      x: phs,
      y: values.map((fractions) => fractions[key as keyof typeof fractions]),
      type: 'scatter', mode: 'lines', name: label,
      line: { width: 3, color: SPECIES_COLORS[index % SPECIES_COLORS.length] },
      hovertemplate: `α = %{y:.4f}<extra>${label}</extra>`,
    }));
  }, [microConstants]);

  const diagrams = [
    {
      id: 'predominance',
      label: t('acidoBase.tabPredominance'),
      node: (
        <PredominanceDiagram
          zones={zones}
          pMin={0}
          pMax={14}
          pLabel="pH"
          marker={showSystemPH ? { p: pHSystem, label: t('acidoBase.pureSolutionMarker', { ph: pHSystem.toFixed(2) }) } : undefined}
          caption={t('acidoBase.predominanceCaption')}
        />
      ),
    },
    {
      id: 'alpha',
      label: t('acidoBase.tabAlpha'),
      node: (
        <Chart data={alphaTraces} xTitle="pH" yTitle="Fracción α" xRange={[0, 14]} yRange={[0, 1.02]}
          shapes={showSystemPH ? [{ type: 'line', x0: pHSystem, x1: pHSystem, y0: 0, y1: 1.02, line: { color: MARKER_COLOR, width: 2, dash: 'dashdot' } }] : []}
          exportName="equilibria-acidobase-alfa" exportMetadata={exportMetadata} />
      ),
    },
    {
      id: 'logc',
      label: t('acidoBase.tabLogC'),
      node: (
        <Chart data={logCTraces} xTitle="pH" yTitle="log C" xRange={[0, 14]} yRange={[-12, 0.5]}
          shapes={systemShape} exportName="equilibria-acidobase-logc" exportMetadata={exportMetadata} />
      ),
    },
    ...(showMicrostates ? [{
      id: 'microstates',
      label: t('acidoBase.microstateTab'),
      node: (
        <Chart data={microTraces} xTitle="pH" yTitle={t('acidoBase.microstateFractionAxis')}
          xRange={[0, 14]} yRange={[0, 1.02]}
          exportName="equilibria-acidobase-microstates" exportMetadata={exportMetadata} />
      ),
    }] : []),
  ];

  return (
    <div className="module">
      <PanelShell title={t('acidoBase.title')} onReset={reset} moduleId="acidobase">
        <PanelSection title={t('acidoBase.systemSection')} icon="⚛">
          <AcidSystemEditor system={system} onChange={setSystem} allowAquaCations />
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          <ConcSlider label={t('acidoBase.concLabel')} value={conc} onChange={setConc} />
          <Toggle label={t('acidoBase.markPureSolutionPH')} checked={showSystemPH} onChange={setShowSystemPH} />
          <details className="section-collapse">
            <summary>{t('acidoBase.activityCorrection')}</summary>
            <Slider label={t('acidoBase.ionicStrengthLabel')} helpId="ionicStrength" value={ionicStrength} min={0} max={0.5} step={0.01} onChange={setIonicStrength} decimals={2} />
            <div style={{ marginTop: 6 }}>
              <Segmented
                options={GAMMA_MODELS}
                value={gammaModel}
                onChange={(v) => setGammaModel(isValidGammaModel(v) ? v : 'dh')}
              />
            </div>
            <p className="hint">{t('acidoBase.activityHint')}</p>
          </details>
        </PanelSection>
        <PanelSection title={t('acidoBase.microstateSection')} icon="⇌">
          <Toggle label={t('acidoBase.showMicrostates')} checked={showMicrostates} onChange={setShowMicrostates} />
          {showMicrostates && (
            <>
              {[
                t('acidoBase.microPKaHZ'), t('acidoBase.microPKaZA'),
                t('acidoBase.microPKaHN'), t('acidoBase.microPKaNA'),
              ].map((label, index) => (
                <Slider key={label} label={label} value={microPKas[index]} min={0} max={14} step={0.01}
                  decimals={2} onChange={(value) => setMicroPKas((current) => current.map((item, i) => i === index ? value : item))} />
              ))}
              <p className="hint">{t('acidoBase.microstateHint')}</p>
            </>
          )}
        </PanelSection>
        {showActivityNote && (
          <InfoBox title={t('acidoBase.activityNoteTitle')}>
            <p>
              {t('acidoBase.activityNoteBody1')}<strong>{t('acidoBase.activityNoteBold')}</strong>
              {t('acidoBase.activityNoteBody2')}
              <strong>{t('acidoBase.activityNoteModule')}</strong>{t('acidoBase.activityNoteBody3')}
            </p>
          </InfoBox>
        )}
        <InfoBox title={t('acidoBase.howToReadTitle')}>
          <p>
            <strong>{t('acidoBase.tabPredominance')}</strong>{t('acidoBase.predominanceExplain')}
          </p>
          <p>
            <strong>{t('acidoBase.tabAlpha')}</strong>{t('acidoBase.alphaExplain')}
          </p>
          <p>
            <strong>{t('acidoBase.tabLogC')}</strong>{t('acidoBase.logCExplain')}
          </p>
        </InfoBox>
        <InfoBox title={t('acidoBase.saltFormTitle')}>
          <p>
            {t('acidoBase.saltFormBody1')}<strong>{t('acidoBase.saltFormBold')}</strong>
            {t('acidoBase.saltFormBody2')}<strong>{t('acidoBase.saltFormBold2')}</strong>
            {t('acidoBase.saltFormBody3')}
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={diagrams} />
        <ResultCardRow items={[
          {
            label: t('acidoBase.pureSolutionPH'),
            value: pHInvalid ? '—' : pHSystem.toFixed(2),
            accent: true,
          },
          {
            label: t('acidoBase.pctDominantSpecies', {
              species: pHInvalid ? t('acidoBase.pctDominantSpeciesFallback') : labels[domIdx],
              ph: pHInvalid ? '—' : pHSystem.toFixed(2),
            }),
            value: pHInvalid ? '—' : `${pctDominante.toFixed(1)} %`,
          },
          {
            label: t('acidoBase.transitionPH'),
            value: transitionPKa !== null ? transitionPKa.toFixed(2) : '—',
          },
          ...(showMicrostates ? [
            { label: t('acidoBase.macroPKa1'), value: microMacro.pKa1.toFixed(3) },
            { label: t('acidoBase.macroPKa2'), value: microMacro.pKa2.toFixed(3) },
            { label: t('acidoBase.isoelectricPoint'), value: microMacro.pI.toFixed(3), accent: true },
            { label: t('acidoBase.tautomerizationK'), value: microMacro.tautomerizationK.toExponential(2) },
          ] : []),
        ]} />
      </section>
    </div>
  );
}
