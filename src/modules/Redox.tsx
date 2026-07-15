import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import PredominanceDiagram from '../components/PredominanceDiagram';
import RedoxPredictionScale from '../components/RedoxPredictionScale';
import { InfoBox, ModelBadge, PanelSection, ResultCard, ResultCardRow, Slider } from '../components/Controls';
import { CoupleEditor } from '../components/Editors';
import { coupleFromPreset, type CoupleState } from '../lib/editorModels';
import { alphaRedox, peConditional, NERNST_S } from '../lib/redox';
import { SPECIES_COLORS } from '../lib/database';
import { paddedAxisRange } from '../lib/format';
import type { Zone } from '../lib/ladder';
import { useT } from '../hooks/useT';

const PE_POINTS = 400;

/** Redox diagrams: predominance diagram + α vs pe + prediction scale (Sillén pe convention). */
export default function Redox() {
  const t = useT();
  const [couple1, setCouple1] = useState<CoupleState>(coupleFromPreset('fe'));
  const [couple2, setCouple2] = useState<CoupleState>(coupleFromPreset('ce'));
  const [pH, setPH] = useState(0);

  useShareEffect('redox', { couple1, couple2, pH }, (s) => {
    if (s.couple1) setCouple1(s.couple1);
    if (s.couple2) setCouple2(s.couple2);
    if (s.pH !== undefined) setPH(s.pH);
  });

  function reset() {
    setCouple1(coupleFromPreset('fe'));
    setCouple2(coupleFromPreset('ce'));
    setPH(0);
  }

  const pe01 = peConditional(couple1, pH);
  const pe02 = peConditional(couple2, pH);

  const exportMetadata = useMemo(() => ({
    Módulo: 'Redox',
    'Par 1': couple1.name,
    'Par 2': couple2.name,
    pH: pH.toFixed(1),
  }), [couple1.name, couple2.name, pH]);
  const [peMin, peMax] = paddedAxisRange(Math.min(pe01, pe02), Math.max(pe01, pe02), 8);

  // α distribution vs pe (both couples)
  const alphaView = useMemo(() => {
    const pes: number[] = [];
    const s = { c1Ox: [] as number[], c1Red: [] as number[], c2Ox: [] as number[], c2Red: [] as number[] };
    for (let i = 0; i <= PE_POINTS; i++) {
      const pe = peMin + ((peMax - peMin) * i) / PE_POINTS;
      pes.push(pe);
      const a1 = alphaRedox(pe, pe01, couple1.n);
      const a2 = alphaRedox(pe, pe02, couple2.n);
      s.c1Ox.push(a1.ox);
      s.c1Red.push(a1.red);
      s.c2Ox.push(a2.ox);
      s.c2Red.push(a2.red);
    }
    const data: Data[] = [
      { x: pes, y: s.c1Red, type: 'scatter', mode: 'lines', name: couple1.red, line: { width: 3, color: SPECIES_COLORS[0] } },
      { x: pes, y: s.c1Ox, type: 'scatter', mode: 'lines', name: couple1.ox, line: { width: 3, color: SPECIES_COLORS[0], dash: 'dash' } },
      { x: pes, y: s.c2Red, type: 'scatter', mode: 'lines', name: couple2.red, line: { width: 3, color: SPECIES_COLORS[2] } },
      { x: pes, y: s.c2Ox, type: 'scatter', mode: 'lines', name: couple2.ox, line: { width: 3, color: SPECIES_COLORS[2], dash: 'dash' } },
    ];
    const shapes: Partial<Shape>[] = [pe01, pe02].map((p) => ({
      type: 'line', x0: p, x1: p, y0: 0, y1: 1,
      line: { color: '#aaaaaa', width: 1, dash: 'dot' },
    }));
    const annotations: Partial<Annotations>[] = [
      { x: pe01, y: 1.07, text: `pe°′₁ = ${pe01.toFixed(1)}`, showarrow: false, font: { size: 12, color: SPECIES_COLORS[0] } },
      { x: pe02, y: 1.07, text: `pe°′₂ = ${pe02.toFixed(1)}`, showarrow: false, font: { size: 12, color: SPECIES_COLORS[2] } },
    ];
    return { data, shapes, annotations };
  }, [couple1, couple2, pe01, pe02, peMin, peMax]);

  const scaleCouples = useMemo(() => [
    { ox: couple1.ox, red: couple1.red, pe0: pe01, color: SPECIES_COLORS[0], label: couple1.name },
    { ox: couple2.ox, red: couple2.red, pe0: pe02, color: SPECIES_COLORS[2], label: couple2.name },
  ], [couple1, couple2, pe01, pe02]);

  // Spontaneous reaction prediction
  const strong = pe01 > pe02 ? { ox: couple1, red: couple2 } : { ox: couple2, red: couple1 };
  const logK = strong.ox.n * strong.red.n * Math.abs(pe01 - pe02);

  // Predominance diagram: 3 zonas basadas en los dos pe°′ condicionales
  const predominanceBandZones = useMemo<Zone[]>(() => {
    const c1 = { pe0: pe01, ox: couple1.ox, red: couple1.red, color: SPECIES_COLORS[0] };
    const c2 = { pe0: pe02, ox: couple2.ox, red: couple2.red, color: SPECIES_COLORS[2] };
    const [lo, hi] = c1.pe0 <= c2.pe0 ? [c1, c2] : [c2, c1];
    return [
      { pStart: peMin, pEnd: lo.pe0,  label: `${lo.red} · ${hi.red}`,  index: 0, color: SPECIES_COLORS[0] },
      { pStart: lo.pe0, pEnd: hi.pe0, label: `${lo.ox} · ${hi.red}`,   index: 1, color: SPECIES_COLORS[1] },
      { pStart: hi.pe0, pEnd: peMax,  label: `${lo.ox} · ${hi.ox}`,    index: 2, color: SPECIES_COLORS[2] },
    ];
  }, [pe01, pe02, couple1, couple2, peMin, peMax]);

  const diagrams = [
    {
      id: 'predominance',
      label: t('complejos.tabPredominance'),
      node: (
        <PredominanceDiagram
          zones={predominanceBandZones}
          pMin={peMin}
          pMax={peMax}
          pLabel="pe"
          caption={t('redox.predominanceCaption')}
        />
      ),
    },
    {
      id: 'alpha',
      label: t('complejos.tabAlpha'),
      node: (
        <Chart
          data={alphaView.data}
          xTitle="pe"
          yTitle={t('complejos.alphaFraction')}
          xRange={[peMin, peMax]}
          yRange={[0, 1.12]}
          shapes={alphaView.shapes}
          annotations={alphaView.annotations}
          exportName="equilibria-redox-alfa"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'escala',
      label: t('redox.tabPredictionScale'),
      node: (
        <RedoxPredictionScale
          couples={scaleCouples}
          peMin={peMin}
          peMax={peMax}
          caption={t('redox.scaleCaption')}
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title={t('redox.title')} onReset={reset} moduleId="redox">
        <PanelSection title={t('redox.couplesSection')} icon="⚛">
          <ModelBadge
            model={t('redox.predictionModel')}
            additions={[(couple1.mH > 0 || couple2.mH > 0) && t('redox.additionPHConditioned')]}
          />
          <CoupleEditor title={t('redox.couple1Title')} couple={couple1} onChange={setCouple1} />
          <CoupleEditor title={t('redox.couple2Title')} couple={couple2} onChange={setCouple2} />
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          <Slider label={t('redox.mediumPHLabel')} value={pH} min={0} max={14} step={0.1} onChange={setPH} decimals={1} />
        </PanelSection>
        <PanelSection title={t('complejos.resultSection')} icon="∑">
          <ResultCard items={[
            { label: t('redox.conditionalPE', { ox: couple1.ox, red: couple1.red }), value: `${pe01.toFixed(2)} (${(pe01 * NERNST_S).toFixed(3)} V)`, helpId: 'pe' },
            { label: t('redox.conditionalPE', { ox: couple2.ox, red: couple2.red }), value: `${pe02.toFixed(2)} (${(pe02 * NERNST_S).toFixed(3)} V)`, helpId: 'pe' },
            { label: t('redox.spontaneousReaction'), value: `${strong.ox.ox} + ${strong.red.red}` },
            { label: 'log K', value: logK.toFixed(1) },
          ]} />
        </PanelSection>
        <InfoBox title={t('complejos.howToReadTitle')}>
          <p>
            <strong>{t('complejos.tabPredominance')}</strong>{t('redox.predominanceExplain')}
          </p>
        </InfoBox>
        <InfoBox title={t('redox.scaleInfoTitle')}>
          <p>
            {t('redox.scaleExplainPrefix')}<em>{t('redox.higherEm')}</em>
            {t('redox.scaleExplainMid')}<em>{t('redox.lowerEm')}</em>{t('redox.scaleExplainSuffix')}
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="alpha" />
        <ResultCardRow items={[
          { label: t('redox.spontaneousReaction'), value: `${strong.ox.ox} + ${strong.red.red}`, accent: true },
          { label: 'log K', value: logK.toFixed(1) },
        ]} />
      </section>
    </div>
  );
}
