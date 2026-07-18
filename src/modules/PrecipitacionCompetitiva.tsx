import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, DbPanel, InfoBox, LabelField, ModelBadge, PanelSection,
  ResultCard, ResultCardRow, Slider,
} from '../components/Controls';
import {
  competitiveEquilibrium, competitiveSweep, pAgAtFraction, separationWindow,
  type CompetitiveSalt,
} from '../lib/solubilityCompetitive';
import { formatMolar } from '../lib/format';
import { useT } from '../hooks/useT';

/** p-function name from an ion label: pAg from Ag⁺ (charges dropped — the
 * p-notation applies to the ion's concentration, pAg = −log[Ag⁺]). */
function pIon(label: string): string {
  return `p${(label || 'M').replace(/[⁺⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+$/u, '')}`;
}

const C1 = '#0072B2';
const C2 = '#D55E00';
const C_OP = '#CC79A7';
const C_WIN = 'rgba(39,174,96,0.12)';

interface Preset {
  id: string;
  cation: string;
  s1: CompetitiveSalt;
  s2: CompetitiveSalt;
  reference: string;
}

const PRESETS: Preset[] = [
  {
    id: 'clbr', cation: 'Ag⁺',
    s1: { label: 'Cl⁻', pKsp: 9.74, cX: 0.01 },
    s2: { label: 'Br⁻', pKsp: 12.30, cX: 0.01 },
    reference: 'Harris — AgCl/AgBr',
  },
  {
    id: 'bri', cation: 'Ag⁺',
    s1: { label: 'Br⁻', pKsp: 12.30, cX: 0.01 },
    s2: { label: 'I⁻', pKsp: 16.07, cX: 0.01 },
    reference: 'Harris — AgBr/AgI',
  },
  {
    id: 'cli', cation: 'Ag⁺',
    s1: { label: 'Cl⁻', pKsp: 9.74, cX: 0.01 },
    s2: { label: 'I⁻', pKsp: 16.07, cX: 0.01 },
    reference: 'Harris — AgCl/AgI',
  },
];

/** Competitive precipitation of two 1:1 salts sharing a cation (fractional precipitation). */
export default function PrecipitacionCompetitiva() {
  const t = useT();
  const [cation, setCation] = useState('Ag⁺');
  const [label1, setLabel1] = useState('Cl⁻');
  const [pKsp1, setPKsp1] = useState(9.74);
  const [cX1, setCX1] = useState(0.01);
  const [label2, setLabel2] = useState('Br⁻');
  const [pKsp2, setPKsp2] = useState(12.30);
  const [cX2, setCX2] = useState(0.01);
  const [cM, setCM] = useState(0.015);
  const [quantPct, setQuantPct] = useState(99.9);

  useShareEffect('solcomp', { cation, label1, pKsp1, cX1, label2, pKsp2, cX2, cM, quantPct }, (s) => {
    if (s.cation) setCation(s.cation);
    if (s.label1) setLabel1(s.label1);
    // Positivity/finite guards mirror ConcSlider's own commit validation — a
    // crafted URL with cX = 0 would otherwise produce log10(0) axis ranges.
    if (typeof s.pKsp1 === 'number' && Number.isFinite(s.pKsp1)) setPKsp1(s.pKsp1);
    if (typeof s.cX1 === 'number' && s.cX1 > 0) setCX1(s.cX1);
    if (s.label2) setLabel2(s.label2);
    if (typeof s.pKsp2 === 'number' && Number.isFinite(s.pKsp2)) setPKsp2(s.pKsp2);
    if (typeof s.cX2 === 'number' && s.cX2 > 0) setCX2(s.cX2);
    if (typeof s.cM === 'number' && s.cM > 0) setCM(s.cM);
    if (typeof s.quantPct === 'number' && s.quantPct > 0 && s.quantPct < 100) setQuantPct(s.quantPct);
  });

  function loadPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id)!;
    setCation(p.cation);
    setLabel1(p.s1.label); setPKsp1(p.s1.pKsp); setCX1(p.s1.cX);
    setLabel2(p.s2.label); setPKsp2(p.s2.pKsp); setCX2(p.s2.cX);
  }

  function reset() {
    loadPreset('clbr');
    setCM(0.015);
    setQuantPct(99.9);
  }

  const s1: CompetitiveSalt = useMemo(() => ({ label: label1, pKsp: pKsp1, cX: cX1 }), [label1, pKsp1, cX1]);
  const s2: CompetitiveSalt = useMemo(() => ({ label: label2, pKsp: pKsp2, cX: cX2 }), [label2, pKsp2, cX2]);

  const win = useMemo(() => separationWindow(s1, s2, quantPct / 100), [s1, s2, quantPct]);
  const first = win.firstIdx === 0 ? s1 : s2;
  const second = win.firstIdx === 0 ? s2 : s1;

  const eq = useMemo(() => competitiveEquilibrium(cM, s1, s2), [cM, s1, s2]);

  // pM axis spans from past-quantitative to before the first onset.
  const onsetFirst = pAgAtFraction(first.pKsp, first.cX, 0);
  const pMin = Math.min(win.pAgQuant, win.pAgSecondOnset) - 1.5;
  const pMax = onsetFirst + 1.5;

  const sweep = useMemo(() => competitiveSweep(s1, s2, [pMin, pMax], 500), [s1, s2, pMin, pMax]);

  const exportMetadata = useMemo(() => ({
    Módulo: 'Precipitación competitiva',
    'Ion común': cation,
    [`pKps (${cation}/${label1})`]: pKsp1.toFixed(2),
    [`pKps (${cation}/${label2})`]: pKsp2.toFixed(2),
    'cX1 / M': cX1.toFixed(4),
    'cX2 / M': cX2.toFixed(4),
    'cM añadido / M': cM.toFixed(4),
    'Objetivo de cuantitatividad': `${quantPct.toFixed(2)} %`,
  }), [cation, label1, pKsp1, label2, pKsp2, cX1, cX2, cM, quantPct]);

  const windowShapes = useMemo<Partial<Shape>[]>(() => {
    const shapes: Partial<Shape>[] = [];
    if (win.ok) {
      shapes.push({
        type: 'rect', x0: win.pAgSecondOnset, x1: win.pAgQuant, y0: 0, y1: 1,
        yref: 'paper', fillcolor: C_WIN, line: { width: 0 },
      });
    }
    if (Number.isFinite(eq.pAg)) {
      shapes.push({
        type: 'line', x0: eq.pAg, x1: eq.pAg, y0: 0, y1: 1, yref: 'paper',
        line: { color: C_OP, width: 2, dash: 'dashdot' },
      });
    }
    return shapes;
  }, [win, eq.pAg]);

  const pctTraces = useMemo<Data[]>(() => [
    {
      x: sweep.map((p) => p.pAg), y: sweep.map((p) => (p.p1 / s1.cX) * 100),
      type: 'scatter', mode: 'lines', name: t('precipitacionCompetitiva.pctLabelPrecipitated', { label: label1 }),
      line: { width: 3, color: C1 },
      hovertemplate: `${pIon(cation)} = %{x:.2f}<br>%{y:.2f} %<extra>${label1}</extra>`,
    },
    {
      x: sweep.map((p) => p.pAg), y: sweep.map((p) => (p.p2 / s2.cX) * 100),
      type: 'scatter', mode: 'lines', name: t('precipitacionCompetitiva.pctLabelPrecipitated', { label: label2 }),
      line: { width: 3, color: C2 },
      hovertemplate: `${pIon(cation)} = %{x:.2f}<br>%{y:.2f} %<extra>${label2}</extra>`,
    },
  ], [sweep, s1.cX, s2.cX, label1, label2, cation, t]);

  const logXTraces = useMemo<Data[]>(() => [
    {
      x: sweep.map((p) => p.pAg), y: sweep.map((p) => Math.log10(Math.max(p.freeX1, 1e-30))),
      type: 'scatter', mode: 'lines', name: `log [${label1}]`,
      line: { width: 3, color: C1 },
    },
    {
      x: sweep.map((p) => p.pAg), y: sweep.map((p) => Math.log10(Math.max(p.freeX2, 1e-30))),
      type: 'scatter', mode: 'lines', name: `log [${label2}]`,
      line: { width: 3, color: C2 },
    },
  ], [sweep, label1, label2]);

  const phaseLabel = {
    ninguna: t('precipitacionCompetitiva.noPrecipitates'),
    sal1: t('precipitacionCompetitiva.onlySaltOf', { label: label1 }),
    sal2: t('precipitacionCompetitiva.onlySaltOf', { label: label2 }),
    ambas: t('precipitacionCompetitiva.bothSaltsPresent'),
  }[eq.phases];

  const diagrams = [
    {
      id: 'pct',
      label: t('precipitacionCompetitiva.pctPrecipitatedLabel'),
      node: (
        <Chart
          data={pctTraces}
          xTitle={t('precipitacionCompetitiva.pctXTitle', { pIon: pIon(cation), cation })}
          yTitle={t('precipitacionCompetitiva.pctPrecipitatedLabel')}
          xRange={[pMax, pMin]}
          yRange={[0, 102]}
          shapes={windowShapes}
          exportName="equilibria-solcomp-pct"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'logx',
      label: t('precipitacionCompetitiva.tabLogXFree'),
      node: (
        <Chart
          data={logXTraces}
          xTitle={`${pIon(cation)} (−log[${cation}])`}
          yTitle={t('precipitacionCompetitiva.logXFreeAxisLabel')}
          xRange={[pMax, pMin]}
          yRange={[-12, 0.5]}
          shapes={windowShapes}
          exportName="equilibria-solcomp-logx"
          exportMetadata={exportMetadata}
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title={t('precipitacionCompetitiva.title')} onReset={reset} moduleId="solcomp" guideId="solcomp">
        <PanelSection title={t('acidoBase.systemSection')}>
          <ModelBadge
            model={t('precipitacionCompetitiva.model')}
            additions={[win.ok && t('precipitacionCompetitiva.additionQuantWindow')]}
          />
          <LabelField label={t('precipitacionCompetitiva.commonIonLabel')} value={cation} onChange={setCation} />
          <LabelField label={t('precipitacionCompetitiva.anion1Label')} value={label1} onChange={setLabel1} />
          <Slider label={`${t('titulacion.pKspShort')} (${cation}/${label1})`} helpId="pKsp" value={pKsp1} min={2} max={20} step={0.01} onChange={setPKsp1} decimals={2} />
          <ConcSlider label={t('precipitacionCompetitiva.concentrationOfLabel', { label: label1 })} value={cX1} onChange={setCX1} />
          <LabelField label={t('precipitacionCompetitiva.anion2Label')} value={label2} onChange={setLabel2} />
          <Slider label={`${t('titulacion.pKspShort')} (${cation}/${label2})`} helpId="pKsp" value={pKsp2} min={2} max={20} step={0.01} onChange={setPKsp2} decimals={2} />
          <ConcSlider label={t('precipitacionCompetitiva.concentrationOfLabel', { label: label2 })} value={cX2} onChange={setCX2} />
          <DbPanel
            title={t('complejos.dbExamples')}
            items={PRESETS.map((p) => ({
              id: p.id,
              label: `${p.cation}: ${p.s1.label} / ${p.s2.label}`,
              detail: `${t('titulacion.pKspShort')} ${p.s1.pKsp.toFixed(2)} / ${p.s2.pKsp.toFixed(2)}`,
            }))}
            onSelect={loadPreset}
          />
        </PanelSection>

        <PanelSection title={t('acidoBase.conditionsSection')}>
          <ConcSlider label={t('precipitacionCompetitiva.totalAddedLabel', { cation })} value={cM} onChange={setCM} />
          <p className="hint">
            {t('precipitacionCompetitiva.operatingPointHint')}
          </p>
          <Slider
            label={t('precipitacionCompetitiva.quantitativityTargetLabel')}
            value={quantPct}
            min={90}
            max={99.999}
            step={0.001}
            onChange={setQuantPct}
            decimals={3}
            unit="%"
          />
          <div className="quick-option-row">
            <button type="button" className="preset-chip" onClick={() => setQuantPct(99)}>
              99 %
            </button>
            <button type="button" className="preset-chip" onClick={() => setQuantPct(99.9)}>
              99.9 %
            </button>
            <button type="button" className="preset-chip" onClick={() => setQuantPct(99.99)}>
              99.99 %
            </button>
          </div>
          <p className="hint">
            {t('precipitacionCompetitiva.quantHint')}
          </p>
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')}>
          <ResultCard items={[
            {
              label: t('precipitacionCompetitiva.precipitatesFirstLabel'),
              value: t('precipitacionCompetitiva.saltOfValueTemplate', { label: first.label, pIon: pIon(cation), v: pAgAtFraction(first.pKsp, first.cX, 0).toFixed(2) }),
            },
            {
              label: t('precipitacionCompetitiva.onsetOfSaltLabel', { label: second.label }),
              value: `${pIon(cation)} ${win.pAgSecondOnset.toFixed(2)}`,
            },
            {
              label: t('precipitacionCompetitiva.residualAtOnsetLabel', { label: first.label }),
              value: `${(win.residualFrac * 100).toPrecision(3)} %`,
            },
            {
              label: t('precipitacionCompetitiva.quantSeparationLabel', { v: quantPct.toFixed(2) }),
              value: win.ok
                ? t('precipitacionCompetitiva.yesWindowTemplate', { pIon: pIon(cation), a: win.pAgSecondOnset.toFixed(2), b: win.pAgQuant.toFixed(2) })
                : t('precipitacionCompetitiva.noBeforeTemplate', { v: quantPct.toFixed(2) }),
            },
          ]} />
        </PanelSection>

        <InfoBox title={t('precipitacionCompetitiva.infoBoxTitle')}>
          <p>
            <strong>{t('precipitacionCompetitiva.fractionalBold')}</strong>
            {t('precipitacionCompetitiva.fractionalRest', { cation, pIon: pIon(cation) })}
          </p>
          <p>
            <strong>{t('precipitacionCompetitiva.windowBold')}</strong>
            {t('precipitacionCompetitiva.windowRest', { v: quantPct.toFixed(2) })}
          </p>
          <p>
            <strong>{t('precipitacionCompetitiva.scopeBold')}</strong>{t('precipitacionCompetitiva.scopeRest')}
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="pct" />
        <ResultCardRow items={[
          { label: t('precipitacionCompetitiva.phasesAtOperatingPoint'), value: phaseLabel, accent: true },
          { label: t('precipitacionCompetitiva.pIonOperationLabel', { pIon: pIon(cation) }), value: Number.isFinite(eq.pAg) ? eq.pAg.toFixed(2) : '—' },
          { label: t('precipitacionCompetitiva.pctLabelPrecipitated', { label: label1 }), value: `${((eq.p1 / cX1) * 100).toFixed(1)} %` },
          { label: t('precipitacionCompetitiva.pctLabelPrecipitated', { label: label2 }), value: `${((eq.p2 / cX2) * 100).toFixed(1)} %` },
          { label: t('precipitacionCompetitiva.freeLabelBracket', { label: label1 }), value: formatMolar(eq.freeX1) },
          { label: t('precipitacionCompetitiva.freeLabelBracket', { label: label2 }), value: formatMolar(eq.freeX2) },
        ]} />
      </section>
    </div>
  );
}
