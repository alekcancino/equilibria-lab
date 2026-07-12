import { useMemo, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import { useShareEffect } from '../hooks/useShareableState';
import { useT } from '../hooks/useT';
import {
  ConcSlider, DbPanel, Disclosure, InfoBox, LabelField, NumberSegmented, PanelSection, ResultCard, ResultCardRow,
  Segmented, ModelBadge, SelectControl, Slider, SystemPresetPicker, Toggle,
} from '../components/Controls';
import {
  AcidSystemEditor, CoupleEditor, SideReactionEditor,
} from '../components/Editors';
import { coupleFromPreset, isValidAcidSystem, strongAcidSystem, type AcidSystem, type CoupleState } from '../lib/editorModels';
import DiagramTabs from '../components/DiagramTabs';
import { INDICATORS } from '../lib/database';
import { formatSci } from '../lib/format';
import { firstDerivative, granPlot, granVeq, quantitativity, secondDerivative, titrationCurve, titratableProtons } from '../lib/titration';
import type { GammaModel } from '../lib/activity';
import { alphaY4, edtaAtFraction, edtaTitrationCurve, EDTA_PKAS } from '../lib/edta';
import { defaultSideEditorState, type SideReactionEditorState } from '../lib/sideReactions';
import { redoxTitrationCurve } from '../lib/redox';
import { precipTitrationCurve, mohrEndpointPAg, PRECIP_PRESETS } from '../lib/precipTitration';
import { condLogKCurve, alphaH, alphaOH } from '../lib/conditional';
import { METAL_INDICATORS, EDTA_METAL_PRESETS, type MetalIndicator } from '../lib/indicatorDatabase';
import { SYSTEM_PRESETS, sideFromPreset, systemPresetById } from '../lib/systemPresets';

const GAMMA_MODELS: { value: GammaModel; label: string }[] = [
  { value: 'dh', label: 'D-H extendida' },
  { value: 'davies', label: 'Davies' },
  { value: 'guntelberg', label: 'Güntelberg' },
];
function isValidGammaModel(v: unknown): v is GammaModel {
  return v === 'dh' || v === 'davies' || v === 'guntelberg';
}

type Mode = 'acidobase' | 'edta' | 'redox' | 'precip' | 'potenciometrica';

const MODE_IDS: Mode[] = ['acidobase', 'edta', 'redox', 'precip', 'potenciometrica'];
function isValidMode(x: unknown): x is Mode {
  return typeof x === 'string' && (MODE_IDS as string[]).includes(x);
}

/**
 * Synchronous, read-only URL check for which of the 5 sub-modes a shared
 * link is for. All 5 share one moduleId ('titulacion' — the app router only
 * registers one view id for this hub) and only one sub-mode is ever mounted
 * at a time, so `mode` must be correct on the very first render — reading it
 * in a child's useEffect (after mount) would flash the wrong sub-mode first.
 * Read-only: the sole writer of ?s= stays each sub-mode's own useShareEffect,
 * so this never races with it.
 */
function initialTitulacionMode(): Mode {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('m') !== 'titulacion') return 'acidobase';
    const s = params.get('s');
    if (!s) return 'acidobase';
    const parsed: unknown = JSON.parse(decodeURIComponent(atob(s)));
    const m = (parsed as { mode?: unknown } | null)?.mode;
    return isValidMode(m) ? m : 'acidobase';
  } catch {
    return 'acidobase';
  }
}

/* ─────────────── Metallochromic indicator panel (embedded) ───────────────── */

const IND_PANEL_COLORS = ['#0072B2', '#D55E00', '#009E73', '#CC79A7'];

interface IndResult {
  ind: MetalIndicator;
  logKprimeMIn: number;
  deltaLogK: number;
  badge: 'ok' | 'marginal' | 'blocked' | 'weak';
}

/** Indicator badges — rendered in the side panel. */
function IndicadorBadges({ metalId, logBetasOH, pH, logKMY_pH }: {
  metalId: string; logBetasOH: number[]; pH: number; logKMY_pH: number;
}) {
  const t = useT();
  const IND_BADGE_LABEL: Record<string, string> = {
    ok: t('titulacion.badgeSuitable'), marginal: t('titulacion.badgeMarginal'),
    blocked: t('titulacion.badgeBlocked'), weak: t('titulacion.badgeWeak'),
  };
  const IND_BADGE_CLS: Record<string, string> = { ok: 'badge ok', marginal: 'badge warn', blocked: 'badge warn', weak: 'badge warn' };

  const results = useMemo((): IndResult[] =>
    METAL_INDICATORS.flatMap((ind) => {
      const entry = ind.metals.find((m) => m.metalId === metalId);
      if (!entry) return [];
      const lAIn  = Math.log10(alphaH(ind.pKas, pH));
      const lAMOH = Math.log10(alphaOH(logBetasOH, pH));
      const logKp = entry.logKMIn - lAIn - lAMOH;
      const dK    = logKMY_pH - logKp;
      const badge: IndResult['badge'] =
        logKp < 4 ? 'weak' : dK < 2 ? 'blocked' : dK < 5 ? 'marginal' : 'ok';
      return [{ ind, logKprimeMIn: logKp, deltaLogK: dK, badge }];
    }),
    [metalId, logBetasOH, pH, logKMY_pH],
  );

  if (results.length === 0) {
    return <p className="hint" style={{ marginTop: 6 }}>{t('titulacion.noIndicatorDataShort')}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {results.map(({ ind, logKprimeMIn, deltaLogK, badge }) => (
        <div key={ind.id} style={{ background: 'var(--bg-alt)', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{ind.abbrev} — {ind.name}</span>
            <span className={IND_BADGE_CLS[badge]} style={{ fontSize: 12 }}>{IND_BADGE_LABEL[badge]}</span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
            <span>log K′(MIn) = <strong style={{ color: 'var(--text)' }}>{logKprimeMIn.toFixed(1)}</strong></span>
            <span>ΔlogK = <strong style={{ color: 'var(--text)' }}>{deltaLogK.toFixed(1)}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 24, height: 12, borderRadius: 3, background: ind.colorFree, border: '1px solid #ccc' }} title={t('titulacion.freeColorTitle')} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>→</span>
            <div style={{ width: 24, height: 12, borderRadius: 3, background: ind.colorMIn, border: '1px solid #ccc' }} title={t('titulacion.mInColorTitle')} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>pH {ind.pHRange[0]}–{ind.pHRange[1]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** log K′ = f(pH) chart for indicators — rendered in DiagramTabs. */
function IndicadorChart({ metalId, logKf, logBetasOH, pH }: {
  metalId: string; logKf: number; logBetasOH: number[]; pH: number;
}) {
  const t = useT();
  const curveMY = useMemo(() =>
    condLogKCurve(logKf, EDTA_PKAS, logBetasOH, [], 0, [1, 14], 400),
    [logKf, logBetasOH],
  );

  const indCurves = useMemo(() => {
    const out: { ind: MetalIndicator; pHs: number[]; logKs: number[] }[] = [];
    for (const ind of METAL_INDICATORS) {
      const entry = ind.metals.find((m) => m.metalId === metalId);
      if (!entry) continue;
      const pHs: number[] = [], logKs: number[] = [];
      for (let i = 0; i <= 400; i++) {
        const p = 1 + 13 * i / 400;
        pHs.push(p);
        logKs.push(entry.logKMIn - Math.log10(alphaH(ind.pKas, p)) - Math.log10(alphaOH(logBetasOH, p)));
      }
      out.push({ ind, pHs, logKs });
    }
    return out;
  }, [metalId, logBetasOH]);

  const chartTraces = useMemo<Data[]>(() => [
    {
      x: curveMY.pHs, y: curveMY.logKs, type: 'scatter', mode: 'lines',
      name: "log K′(M-EDTA)", line: { width: 3, color: '#7B5CD6' },
      hovertemplate: "log K′(MY) = %{y:.2f}<extra>M-EDTA</extra>",
    },
    ...indCurves.map((c, i) => ({
      x: c.pHs, y: c.logKs, type: 'scatter' as const, mode: 'lines' as const,
      name: `log K′(M-${c.ind.abbrev})`,
      line: { width: 2, color: IND_PANEL_COLORS[i % IND_PANEL_COLORS.length] },
      hovertemplate: `log K′(M-${c.ind.abbrev}) = %{y:.2f}<extra>${c.ind.abbrev}</extra>`,
    })),
  ], [curveMY, indCurves]);

  const allY = [...curveMY.logKs, ...indCurves.flatMap((c) => c.logKs)];
  const yMin = Math.max(Math.floor(Math.min(...allY)) - 1, -5);
  const yMax = Math.ceil(logKf) + 2;

  const shapes = useMemo<Partial<Shape>[]>(() => [
    { type: 'line', x0: pH, x1: pH, y0: yMin - 99, y1: yMax + 99, line: { color: '#CC79A7', width: 1.5, dash: 'dashdot' } },
  ], [pH, yMin, yMax]);

  if (indCurves.length === 0) {
    return (
      <div className="empty-plot">
        <p>{t('titulacion.noIndicatorDataDb')}</p>
        <p className="hint">{t('titulacion.selectMetalHint')}</p>
      </div>
    );
  }

  return (
    <Chart
      data={chartTraces}
      xTitle="pH"
      yTitle="log K′"
      xRange={[1, 14]}
      yRange={[yMin, yMax]}
      shapes={shapes}
      exportName="equilibria-indicadores-edta"
    />
  );
}

/* ───────────────────────── Acid–base ───────────────────────── */

function AcidBaseTitration({ mode }: { mode: Mode }) {
  const t = useT();
  const [system, setSystem] = useState<AcidSystem>(() => strongAcidSystem());
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [indicatorId, setIndicatorId] = useState('phenolphthalein');
  const [showIndicator, setShowIndicator] = useState(false);
  const [showDerivative, setShowDerivative] = useState(false);
  const [ionicStrength, setIonicStrength] = useState(0);
  const [gammaModel, setGammaModel] = useState<GammaModel>('dh');

  useShareEffect('titulacion', {
    mode, system, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, indicatorId, showIndicator, showDerivative,
    ionicStrength, gammaModel,
  }, (s) => {
    if (isValidAcidSystem(s.system)) setSystem(s.system);
    if (s.titrantIsAcid !== undefined) setTitrantIsAcid(s.titrantIsAcid);
    if (s.cAnalyte !== undefined) setCAnalyte(s.cAnalyte);
    if (s.vAnalyte !== undefined) setVAnalyte(s.vAnalyte);
    if (s.cTitrant !== undefined) setCTitrant(s.cTitrant);
    if (s.indicatorId) setIndicatorId(s.indicatorId);
    if (s.showIndicator !== undefined) setShowIndicator(s.showIndicator);
    if (s.showDerivative !== undefined) setShowDerivative(s.showDerivative);
    if (s.ionicStrength !== undefined) setIonicStrength(s.ionicStrength);
    if (isValidGammaModel(s.gammaModel)) setGammaModel(s.gammaModel);
  });

  function reset() {
    setSystem(strongAcidSystem()); setTitrantIsAcid(false);
    setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setIndicatorId('phenolphthalein'); setShowIndicator(false); setShowDerivative(false);
    setIonicStrength(0); setGammaModel('dh');
  }

  const indicator = INDICATORS.find((i) => i.id === indicatorId)!;
  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';
  const analyteKind = system.pKas.length > 0
    ? 'equilibrium' as const
    : system.z0 > 0 ? 'strong-base' as const : 'strong-acid' as const;
  const nProtons = analyteKind === 'equilibrium' ? titratableProtons(system.pKas) : 1;
  const vEqLast = (nProtons * cAnalyte * vAnalyte) / cTitrant;
  const vMax = vEqLast * 1.6;

  const curve = useMemo(
    () => titrationCurve({
      analyte: { z0: system.z0, pKas: system.pKas, kind: analyteKind },
      titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax, I: ionicStrength, model: gammaModel,
    }),
    [system, analyteKind, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax, ionicStrength, gammaModel],
  );

  const { traces, shapes, annotations, eqInfo } = useMemo(() => {
    const data: Data[] = [{
      x: curve.volumes, y: curve.pHs, type: 'scatter', mode: 'lines', name: 'pH',
      line: { width: 3, color: '#0072B2' },
      hovertemplate: 'V = %{x:.2f} mL<br>pH = %{y:.2f}<extra></extra>',
    }];
    if (showDerivative) {
      const der = firstDerivative(curve.volumes, curve.pHs);
      const maxD = Math.max(...der.d.map(Math.abs), 1e-9);
      data.push({
        x: der.v, y: der.d.map((d) => (Math.abs(d) / maxD) * 14),
        type: 'scatter', mode: 'lines', name: t('mezclas.derivativeTraceName'),
        line: { width: 2, color: '#7F8C8D' }, hoverinfo: 'skip',
      });
    }
    const shapeList: Partial<Shape>[] = [];
    if (showIndicator) {
      shapeList.push({
        type: 'rect', x0: 0, x1: vMax, y0: indicator.range[0], y1: indicator.range[1],
        fillcolor: indicator.colors[1], opacity: 0.15, line: { width: 0 },
      });
    }
    const annList: Partial<Annotations>[] = [];
    const info: { label: string; value: string }[] = [];
    curve.equivalenceVolumes.forEach((veq, k) => {
      shapeList.push({
        type: 'line', x0: veq, x1: veq, y0: 0, y1: 14,
        line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
      });
      const idx = curve.volumes.findIndex((v) => v >= veq);
      const pHeq = idx > 0 ? curve.pHs[idx] : NaN;
      annList.push({
        x: veq, y: 13.5,
        text: `${t('titulacion.pE')}${curve.equivalenceVolumes.length > 1 ? ` ${k + 1}` : ''}`,
        showarrow: false, font: { color: '#2C3E50', size: 12 },
      });
      info.push({
        label: `${t('titulacion.equivalenceLabel')}${curve.equivalenceVolumes.length > 1 ? ` ${k + 1}` : ''}`,
        value: `${veq.toFixed(2)} mL · pH ${pHeq.toFixed(2)}`,
      });
    });
    return { traces: data, shapes: shapeList, annotations: annList, eqInfo: info };
  }, [curve, showIndicator, showDerivative, indicator, vMax, t]);

  const lastEq = curve.equivalenceVolumes[curve.equivalenceVolumes.length - 1];
  const lastIdx = lastEq !== undefined ? curve.volumes.findIndex((v) => v >= lastEq) : -1;
  const pHLastEq = lastIdx > 0 ? curve.pHs[lastIdx] : NaN;
  const indicatorOk = pHLastEq >= indicator.range[0] - 1 && pHLastEq <= indicator.range[1] + 1;

  // ── Gran plot + quantitativity ───────────────────────────────────────────────
  const gran = useMemo(
    () => granPlot(curve.volumes, curve.pHs, vAnalyte),
    [curve.volumes, curve.pHs, vAnalyte],
  );
  const granVeqDetected = useMemo(
    () => granVeq(curve.volumes, curve.pHs, vAnalyte),
    [curve.volumes, curve.pHs, vAnalyte],
  );
  // q% = (1 − ε/Co)·100. ε = especie limitante residual en el P.E. (H⁺ si se
  // titula un ácido con base; OH⁻ si se titula una base con ácido); Co = conc.
  // analítica diluida en Veq.
  const cAtEq = (cAnalyte * vAnalyte) / (vAnalyte + vEqLast);
  const epsLimiting = Number.isFinite(pHLastEq)
    ? (titrantIsAcid ? Math.pow(10, pHLastEq - 14) : Math.pow(10, -pHLastEq))
    : NaN;
  const qPercent = quantitativity(epsLimiting, cAtEq);
  const granErrorPct = Number.isFinite(granVeqDetected) && vEqLast > 0
    ? ((granVeqDetected - vEqLast) / vEqLast) * 100
    : NaN;

  const granTraces = useMemo<Data[]>(() => [
    {
      x: gran.v1, y: gran.F1, type: 'scatter', mode: 'lines', name: t('titulacion.granBeforePE'),
      line: { width: 2.5, color: '#0072B2' },
      hovertemplate: `V = %{x:.2f} mL<br>F₁ = %{y:.2e}<extra>${t('titulacion.granBeforePEShort')}</extra>`,
    },
    {
      x: gran.v2, y: gran.F2, type: 'scatter', mode: 'lines', name: t('titulacion.granAfterPE'),
      line: { width: 2.5, color: '#D55E00', dash: 'dash' },
      hovertemplate: `V = %{x:.2f} mL<br>F₂ = %{y:.2e}<extra>${t('titulacion.granAfterPEShort')}</extra>`,
    },
  ], [gran, t]);

  const granShapes = useMemo<Partial<Shape>[]>(() => {
    const list: Partial<Shape>[] = curve.equivalenceVolumes.map((veq) => ({
      type: 'line', x0: veq, x1: veq, y0: 0, y1: 1, yref: 'paper', xref: 'x',
      line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
    }));
    if (Number.isFinite(granVeqDetected)) {
      list.push({
        type: 'line', x0: granVeqDetected, x1: granVeqDetected, y0: 0, y1: 1,
        yref: 'paper', xref: 'x', line: { color: '#009E73', width: 1.5, dash: 'dot' },
      });
    }
    return list;
  }, [curve.equivalenceVolumes, granVeqDetected]);

  const exportMetadata = useMemo(() => ({
    Módulo: 'Titulación ácido-base',
    Analito: system.label,
    Titulante: titrantName,
    'CA / M': cAnalyte.toFixed(4),
    'VA / mL': vAnalyte.toFixed(0),
    'CT / M': cTitrant.toFixed(4),
    'I / M': ionicStrength.toFixed(3),
    'Modelo γ': GAMMA_MODELS.find((m) => m.value === gammaModel)?.label ?? gammaModel,
  }), [system.label, titrantName, cAnalyte, vAnalyte, cTitrant, ionicStrength, gammaModel]);

  const gammaModelsT: { value: GammaModel; label: string }[] = [
    { value: 'dh', label: t('acidoBase.gammaDH') },
    { value: 'davies', label: t('acidoBase.gammaDavies') },
    { value: 'guntelberg', label: t('acidoBase.gammaGuntelberg') },
  ];

  const systemKind = analyteKind === 'equilibrium'
    ? system.pKas.length > 1 ? t('titulacion.kindPolyprotic') : t('titulacion.kindWeak')
    : analyteKind === 'strong-base' ? t('titulacion.kindStrongBase') : t('titulacion.kindStrongAcid');

  return (
    <>
      <PanelShell title={t('titulacion.acidBaseTitle')} onReset={reset} moduleId="titulacion">
        <PanelSection title={t('acidoBase.systemSection')} icon="⚛">
          <Segmented
            options={[
              { value: 'base', label: t('titulacion.titrantBaseSeg') },
              { value: 'acid', label: t('titulacion.titrantAcidSeg') },
            ]}
            value={titrantIsAcid ? 'acid' : 'base'}
            onChange={(v) => {
              const nextIsAcid = v === 'acid';
              setTitrantIsAcid(nextIsAcid);
              if (system.pKas.length === 0) setSystem(strongAcidSystem(nextIsAcid));
            }}
          />
          <ModelBadge
            model={t('titulacion.acidBaseModelBadge', {
              titrant: titrantIsAcid ? t('titulacion.titrantAcidWord') : t('titulacion.titrantBaseWord'),
              kind: systemKind,
            })}
            additions={[showIndicator && t('titulacion.addVisualIndicator'), showDerivative && t('mezclas.additionDerivative')]}
          />
          <AcidSystemEditor system={system} onChange={setSystem} includeStrong allowNoConstants showModel={false} allowAquaCations />
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          <ConcSlider label={t('titulacion.analyteConcLabel')} value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
          <Slider label={t('titulacion.sampleVolumeLabel')} value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfLabel', { name: titrantName })} value={cTitrant} onChange={setCTitrant} min={-4} max={0} />
        </PanelSection>
        <PanelSection title={t('titulacion.detectionSection')} icon="✦">
          <SelectControl
            label={t('titulacion.visualIndicatorLabel')}
            value={indicatorId}
            options={INDICATORS.map((i) => ({ value: i.id, label: `${i.name} (${i.range[0]}–${i.range[1]})` }))}
            onChange={setIndicatorId}
          />
          <Toggle label={t('titulacion.showTransitionRangeToggle')} checked={showIndicator} onChange={setShowIndicator} />
          <Toggle label={t('titulacion.showDerivativeDpHToggle')} checked={showDerivative} onChange={setShowDerivative} />
          <details className="section-collapse">
            <summary>{t('acidoBase.activityCorrection')}</summary>
            <Slider label={t('acidoBase.ionicStrengthLabel')} helpId="ionicStrength" value={ionicStrength} min={0} max={0.5} step={0.01} onChange={setIonicStrength} decimals={2} />
            <div style={{ marginTop: 6 }}>
              <Segmented
                options={gammaModelsT}
                value={gammaModel}
                onChange={(v) => setGammaModel(isValidGammaModel(v) ? v : 'dh')}
              />
            </div>
            <p className="hint">{t('titulacion.activityHint')}</p>
          </details>
        </PanelSection>
        <PanelSection title={t('complejos.resultSection')} icon="∑">
          {eqInfo.length > 0 && <ResultCard items={eqInfo} />}
          {showIndicator && Number.isFinite(pHLastEq) && (
            <p className={indicatorOk ? 'badge ok' : 'badge warn'}>
              {indicatorOk
                ? t('titulacion.indicatorOkMsg', { name: indicator.name })
                : t('titulacion.indicatorFarMsg', { name: indicator.name, ph: pHLastEq.toFixed(1) })}
            </p>
          )}
        </PanelSection>
        <InfoBox title={t('titulacion.calcMethodTitle')}>
          <p>{t('titulacion.acidBaseInfoBody')}</p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs
          initialId="ph"
          tabs={[
            {
              id: 'ph',
              label: 'pH = f(V)',
              node: (
                <Chart
                  data={traces}
                  xTitle={t('mezclas.volumeAddedLabel', { titrant: titrantName })}
                  yTitle="pH"
                  xRange={[0, vMax]}
                  yRange={[0, 14]}
                  shapes={shapes}
                  annotations={annotations}
                  exportName="equilibria-titulacion-acidobase"
                  exportMetadata={exportMetadata}
                />
              ),
            },
            {
              id: 'gran',
              label: 'Gran',
              node: (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <Chart
                      data={granTraces}
                      xTitle={t('mezclas.volumeAddedLabel', { titrant: titrantName })}
                      yTitle={t('titulacion.granFunctionYTitle')}
                      xRange={[0, vMax]}
                      shapes={granShapes}
                      exportName="equilibria-titulacion-gran"
                      exportMetadata={exportMetadata}
                    />
                  </div>
                  <p className="hint" style={{ margin: '4px 8px 2px' }}>
                    {t('titulacion.granHintPrefix')}<em>{t('titulacion.granHintBeforeEm')}</em>{t('titulacion.granHintMid')}
                    <sub>eq</sub> = {Number.isFinite(granVeqDetected) ? `${granVeqDetected.toFixed(2)} mL` : '—'}.
                  </p>
                </div>
              ),
            },
          ]}
        />
        <ResultCardRow items={[
          { label: t('titulacion.pHAtEquivalence'), value: Number.isFinite(pHLastEq) ? pHLastEq.toFixed(2) : '—', accent: true },
          { label: 'Veq (Gran)', value: Number.isFinite(granVeqDetected) ? `${granVeqDetected.toFixed(2)} mL` : '—', helpId: 'gran' },
          { label: t('titulacion.qQuantitativity'), value: Number.isFinite(qPercent) ? `${qPercent >= 99.95 ? qPercent.toFixed(3) : qPercent.toFixed(1)} %` : '—' },
          ...(Number.isFinite(granErrorPct)
            ? [{ label: t('titulacion.pctErrorPE'), value: `${granErrorPct.toFixed(2)} %` }]
            : []),
        ]} />
      </section>
    </>
  );
}

/* ───────────────────────── Complexometric (EDTA) ────────────────────────── */

function EdtaTitration({ mode }: { mode: Mode }) {
  const t = useT();
  const defaultPreset = EDTA_METAL_PRESETS[0]; // Ca²⁺
  const [metalId, setMetalId] = useState(defaultPreset.id);
  const [label, setLabel] = useState(`${defaultPreset.metal}`);
  const [logKf, setLogKf] = useState(defaultPreset.logKf);
  const [logBetasOH, setLogBetasOH] = useState<number[]>(defaultPreset.logBetasOH);
  const [side, setSide] = useState<SideReactionEditorState>(() => {
    const st = defaultSideEditorState();
    st.showOH = defaultPreset.logBetasOH.length > 0;
    st.logBetasOH = [...defaultPreset.logBetasOH];
    return st;
  });
  const [edtaInFlask, setEdtaInFlask] = useState(false);
  const [pH, setPH] = useState(10);
  const [cFlask, setCFlask] = useState(0.01);
  const [vFlask, setVFlask] = useState(50);
  const [cBuret, setCBuret] = useState(0.01);
  const [axis, setAxis] = useState<'volume' | 'x'>('volume');
  const [traceY, setTraceY] = useState<'pM' | 'pY' | 'both'>('pM');

  useShareEffect('titulacion', { mode, metalId, label, logKf, logBetasOH, side, edtaInFlask, pH, cFlask, vFlask, cBuret, axis, traceY }, (s) => {
    if (s.metalId) setMetalId(s.metalId);
    if (s.label) setLabel(s.label);
    if (s.logKf !== undefined) setLogKf(s.logKf);
    if (s.logBetasOH) setLogBetasOH(s.logBetasOH);
    if (s.side) setSide(s.side);
    if (s.edtaInFlask !== undefined) setEdtaInFlask(s.edtaInFlask);
    if (s.pH !== undefined) setPH(s.pH);
    if (s.cFlask !== undefined) setCFlask(s.cFlask);
    if (s.vFlask !== undefined) setVFlask(s.vFlask);
    if (s.cBuret !== undefined) setCBuret(s.cBuret);
    if (s.axis === 'volume' || s.axis === 'x') setAxis(s.axis);
    if (s.traceY === 'pM' || s.traceY === 'pY' || s.traceY === 'both') setTraceY(s.traceY);
  });

  function reset() {
    setMetalId(defaultPreset.id); setLabel(defaultPreset.metal);
    setLogKf(defaultPreset.logKf); setLogBetasOH([...defaultPreset.logBetasOH]);
    setSide(() => {
      const st = defaultSideEditorState();
      st.showOH = defaultPreset.logBetasOH.length > 0;
      st.logBetasOH = [...defaultPreset.logBetasOH];
      return st;
    });
    setEdtaInFlask(false); setPH(10); setCFlask(0.01); setVFlask(50); setCBuret(0.01);
    setAxis('volume'); setTraceY('pM');
  }

  function applyPreset(id: string) {
    const p = EDTA_METAL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setMetalId(p.id); setLabel(p.metal);
    setLogKf(p.logKf); setLogBetasOH([...p.logBetasOH]);
    setSide((prev) => ({
      ...prev,
      showOH: p.logBetasOH.length > 0,
      logBetasOH: [...p.logBetasOH],
    }));
  }

  /** Loads a full editable system (metal + EDTA + side reactions + conditions). */
  function applyFullSystem(id: string) {
    const p = systemPresetById(id);
    if (!p) return;
    if (p.metalId) setMetalId(p.metalId);
    setLabel(p.metalLabel);
    setLogKf(p.logKf);
    setLogBetasOH([...p.side.logBetasOH]);
    setSide(sideFromPreset(p));
    setPH(p.pH);
    setCFlask(p.cAnalytic);
    setEdtaInFlask(false);
  }

  const vMax = ((cFlask * vFlask) / cBuret) * 1.8;
  const curve = useMemo(
    () => edtaTitrationCurve({
      logKf, pH, cMetal: cFlask, vMetal: vFlask, cEdta: cBuret, vMax, edtaInFlask,
      sideEditor: { ...side, showOH: side.showOH || logBetasOH.length > 0, logBetasOH: side.showOH ? side.logBetasOH : logBetasOH },
      axis,
      xMax: 2,
    }),
    [logKf, pH, logBetasOH, side, cFlask, vFlask, cBuret, vMax, edtaInFlask, axis],
  );

  const at50 = useMemo(
    () => edtaAtFraction({
      logKf, pH, cMetal: cFlask,
      sideEditor: { ...side, showOH: side.showOH || logBetasOH.length > 0, logBetasOH: side.showOH ? side.logBetasOH : logBetasOH },
    }, 0.5),
    [logKf, pH, cFlask, side, logBetasOH],
  );
  const at150 = useMemo(
    () => edtaAtFraction({
      logKf, pH, cMetal: cFlask,
      sideEditor: { ...side, showOH: side.showOH || logBetasOH.length > 0, logBetasOH: side.showOH ? side.logBetasOH : logBetasOH },
    }, 1.5),
    [logKf, pH, cFlask, side, logBetasOH],
  );

  const logKMY_pH = useMemo(() => curve.logKfCond, [curve.logKfCond]);

  const pHOptimo = useMemo(() => {
    const kCurve = condLogKCurve(logKf, EDTA_PKAS, logBetasOH, [], 0, [1, 14], 400);
    const idx = kCurve.pHs.findIndex((_, i) => kCurve.logKs[i] >= 8);
    return idx >= 0 ? kCurve.pHs[idx] : null;
  }, [logKf, logBetasOH]);

  const xData = axis === 'x' ? curve.xs : curve.volumes;
  const xTitle = axis === 'x' ? 'x = n_Y / n_M⁰' : t('mezclas.volumeAddedLabel', { titrant: edtaInFlask ? label : 'EDTA' });
  const eqX = axis === 'x' ? curve.xEq : curve.vEq;

  const titTraces = useMemo<Data[]>(() => {
    const traces: Data[] = [];
    if (traceY === 'pM' || traceY === 'both') {
      traces.push({
        x: xData, y: curve.pMs, type: 'scatter', mode: 'lines', name: "pM′",
        line: { width: 3.5, color: '#0072B2' },
        fill: traceY === 'pM' ? 'tozeroy' : undefined,
        fillcolor: 'rgba(0, 114, 178, 0.07)',
        hovertemplate: axis === 'x' ? 'x = %{x:.2f}<br>pM′ = %{y:.2f}<extra></extra>' : 'V = %{x:.2f} mL<br>pM′ = %{y:.2f}<extra></extra>',
      });
    }
    if (traceY === 'pY' || traceY === 'both') {
      traces.push({
        x: xData, y: curve.pYs, type: 'scatter', mode: 'lines', name: "pY′",
        line: { width: 2.5, color: '#0072B2', dash: traceY === 'both' ? 'dot' : undefined },
        hovertemplate: axis === 'x' ? 'x = %{x:.2f}<br>pY′ = %{y:.2f}<extra></extra>' : 'V = %{x:.2f} mL<br>pY′ = %{y:.2f}<extra></extra>',
      });
    }
    return traces;
  }, [xData, curve, traceY, axis]);

  const titShapes = useMemo<Partial<Shape>[]>(() => [{
    type: 'line', x0: eqX, x1: eqX, y0: 0, y1: Math.max(...curve.pMs, ...curve.pYs) + 1,
    line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
  }], [curve, eqX]);

  const aY = alphaY4(pH);
  const feasible = curve.logKfCond >= 8;
  const buretName = edtaInFlask ? label : 'EDTA';
  const flaskName = edtaInFlask ? 'EDTA' : label;

  const exportMetadata = useMemo(() => ({
    Módulo: 'Titulación complejométrica (EDTA)',
    Metal: label,
    'log Kf': logKf.toFixed(2),
    pH: pH.toFixed(1),
    'C / M': cFlask.toFixed(4),
    'V / mL': vFlask.toFixed(0),
  }), [label, logKf, pH, cFlask, vFlask]);

  const diagrams = useMemo(() => [
    {
      id: 'tit',
      label: t('titulacion.titrationCurveTab'),
      node: (
        <Chart
          data={titTraces}
          xTitle={xTitle}
          yTitle={traceY === 'pY' ? "pY′ (−log[Y′])" : traceY === 'both' ? 'pM′ / pY′' : 'pM′ (−log[M′])'}
          xRange={[0, axis === 'x' ? 2 : vMax]}
          shapes={titShapes}
          exportName="equilibria-titulacion-edta"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'ind',
      label: t('titulacion.indicatorsTab'),
      node: (
        <IndicadorChart
          metalId={metalId}
          logKf={logKf}
          logBetasOH={logBetasOH}
          pH={pH}
        />
      ),
    },
  ], [titTraces, titShapes, xTitle, vMax, axis, traceY, metalId, logKf, logBetasOH, pH, exportMetadata, t]);

  return (
    <>
      <PanelShell title={t('titulacion.edtaTitle')} onReset={reset} moduleId="titulacion">
        <SystemPresetPicker
          items={SYSTEM_PRESETS.map((p) => ({ id: p.id, name: p.name, group: p.group, detail: p.detail }))}
          onSelect={applyFullSystem}
        />
        <PanelSection title={t('acidoBase.systemSection')} icon="⚛">
          <Segmented
            options={[
              { value: 'direct', label: t('titulacion.directMode') },
              { value: 'inverse', label: t('titulacion.backTitrationMode') },
            ]}
            value={edtaInFlask ? 'inverse' : 'direct'}
            onChange={(v) => setEdtaInFlask(v === 'inverse')}
          />
          <ModelBadge
            model={edtaInFlask ? t('titulacion.edtaModelBack') : t('titulacion.edtaModelDirect')}
            additions={[logBetasOH.length > 0 && t('titulacion.addHydrolysisIndicatorSelection')]}
          />
          <LabelField label={t('titulacion.metalIonFreeNameLabel')} value={label} onChange={setLabel} />
          <Slider
            label={t('titulacion.logKfComplexLabel')}
            helpId="logKf"
            value={logKf} min={1} max={28} step={0.01}
            onChange={(v) => setLogKf(v)}
          />
          <DbPanel
            title={t('titulacion.metalsDbTitle')}
            items={EDTA_METAL_PRESETS.map((p) => ({
              id: p.id,
              label: p.metal,
              detail: `log Kf = ${p.logKf.toFixed(2)}`,
              group: p.group === 'M²⁺' ? t('condicionales.divalentMetals') : t('condicionales.trivalentMetals'),
            }))}
            onSelect={applyPreset}
          />
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          <Slider label={t('titulacion.bufferPHLabel')} value={pH} min={1} max={13} step={0.1} onChange={setPH} decimals={1} />
          <ConcSlider label={t('titulacion.concInFlaskLabel', { name: flaskName })} value={cFlask} onChange={setCFlask} min={-4} max={-1} />
          <Slider label={t('titulacion.flaskVolumeLabel')} value={vFlask} min={5} max={100} step={1} onChange={setVFlask} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfTitrantLabel', { name: buretName })} value={cBuret} onChange={setCBuret} min={-4} max={-1} />
        </PanelSection>
        <PanelSection title={t('titulacion.chartSection')} icon="∿">
          <div className="control">
            <div className="control-header"><span className="control-label">{t('titulacion.horizontalAxisLabel')}</span></div>
            <div className="segmented" style={{ marginTop: 6 }}>
              <button className={axis === 'volume' ? 'seg-btn active' : 'seg-btn'} onClick={() => setAxis('volume')}>{t('titulacion.volumeAxisOption')}</button>
              <button className={axis === 'x' ? 'seg-btn active' : 'seg-btn'} onClick={() => setAxis('x')}>{t('titulacion.progressAxisOption')}</button>
            </div>
          </div>
          <div className="control">
            <div className="control-header"><span className="control-label">{t('titulacion.tracesLabel')}</span></div>
            <div className="segmented" style={{ marginTop: 6 }}>
              {(['pM', 'pY', 'both'] as const).map((tr) => (
                <button key={tr} className={traceY === tr ? 'seg-btn active' : 'seg-btn'} onClick={() => setTraceY(tr)}>
                  {tr === 'both' ? 'pM′ + pY′' : `${tr}′`}
                </button>
              ))}
            </div>
          </div>
        </PanelSection>
        <Disclosure title={t('titulacion.sideReactionsDisclosure')}>
          <SideReactionEditor state={side} onChange={setSide} showLigandPKas={false} />
        </Disclosure>
        <PanelSection title={t('complejos.resultSection')} icon="∑">
          <ResultCard items={[
            { label: t('titulacion.alphaYAtPHLabel'), value: formatSci(1 / aY, 3) },
            { label: t('titulacion.condLogKfLabel'), value: curve.logKfCond.toFixed(2) },
            { label: axis === 'x' ? t('titulacion.xEqLabel') : t('titulacion.volEqLabel'), value: axis === 'x' ? `${curve.xEq.toFixed(2)}` : `${curve.vEq.toFixed(2)} mL` },
            { label: t('titulacion.pMAt50'), value: at50.pM.toFixed(2) },
            { label: t('titulacion.pYAt50'), value: at50.pY.toFixed(2) },
            { label: t('titulacion.pMAt150'), value: at150.pM.toFixed(2) },
          ]} />
          <p className={feasible ? 'badge ok' : 'badge warn'}>
            {feasible ? t('titulacion.edtaFeasibleMsg') : t('titulacion.edtaNotFeasibleMsg')}
          </p>
        </PanelSection>

        <Disclosure title={t('titulacion.metallochromicDisclosure', { ph: pH.toFixed(1) })}>
          <IndicadorBadges
            metalId={metalId}
            logBetasOH={logBetasOH}
            pH={pH}
            logKMY_pH={logKMY_pH}
          />
        </Disclosure>

        <InfoBox title={t('titulacion.calcMethodTitle')}>
          <p>
            {t('titulacion.edtaInfoBodyPrefix')}<em>{t('titulacion.edtaInfoIndicatorsEm')}</em>{t('titulacion.edtaInfoBodySuffix')}
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={diagrams} />
        <ResultCardRow items={[
          {
            label: axis === 'x' ? t('titulacion.xEquivalenceShort') : t('titulacion.vEquivalenceShort'),
            value: axis === 'x' ? curve.xEq.toFixed(2) : `${curve.vEq.toFixed(1)} mL`,
          },
          { label: t('titulacion.pMAt50'), value: at50.pM.toFixed(2), accent: true },
          { label: t('titulacion.pMAt150'), value: at150.pM.toFixed(2) },
          { label: t('titulacion.minOptimalPH'), value: pHOptimo !== null ? `≥ ${pHOptimo.toFixed(1)}` : '> 14' },
        ]} />
      </section>
    </>
  );
}

/* ───────────────────────── Redox ───────────────────────── */

function RedoxTitration({ mode }: { mode: Mode }) {
  const t = useT();
  const [analyte, setAnalyte] = useState<CoupleState>(coupleFromPreset('fe'));
  const [titrant, setTitrant] = useState<CoupleState>(coupleFromPreset('ce'));
  const [direction, setDirection] = useState<'oxidante' | 'reductor'>('oxidante');
  const [pH, setPH] = useState(0);
  const [cAnalyte, setCAnalyte] = useState(0.05);
  const [vAnalyte, setVAnalyte] = useState(50);
  const [cTitrant, setCTitrant] = useState(0.05);
  const [usePe, setUsePe] = useState(false);
  const [showDerivative, setShowDerivative] = useState(false);

  useShareEffect('titulacion', { mode, analyte, titrant, direction, pH, cAnalyte, vAnalyte, cTitrant, usePe, showDerivative }, (s) => {
    if (s.analyte) setAnalyte(s.analyte);
    if (s.titrant) setTitrant(s.titrant);
    if (s.direction === 'oxidante' || s.direction === 'reductor') setDirection(s.direction);
    if (s.pH !== undefined) setPH(s.pH);
    if (s.cAnalyte !== undefined) setCAnalyte(s.cAnalyte);
    if (s.vAnalyte !== undefined) setVAnalyte(s.vAnalyte);
    if (s.cTitrant !== undefined) setCTitrant(s.cTitrant);
    if (s.usePe !== undefined) setUsePe(s.usePe);
    if (s.showDerivative !== undefined) setShowDerivative(s.showDerivative);
  });

  function reset() {
    setAnalyte(coupleFromPreset('fe')); setTitrant(coupleFromPreset('ce'));
    setDirection('oxidante'); setPH(0);
    setCAnalyte(0.05); setVAnalyte(50); setCTitrant(0.05);
    setUsePe(false); setShowDerivative(false);
  }

  const vMax = ((analyte.n * cAnalyte * vAnalyte) / (titrant.n * cTitrant)) * 1.8;
  const curve = useMemo(
    () => redoxTitrationCurve({ analyte, titrant, direction, pH, cAnalyte, vAnalyte, cTitrant, vMax }),
    [analyte, titrant, direction, pH, cAnalyte, vAnalyte, cTitrant, vMax],
  );

  const { traces, shapes, annotations } = useMemo(() => {
    const y = usePe ? curve.pes : curve.Es;
    const data: Data[] = [{
      x: curve.volumes, y, type: 'scatter', mode: 'lines',
      name: usePe ? 'pe' : 'E (V)',
      line: { width: 3, color: '#D55E00' },
      hovertemplate: `V = %{x:.2f} mL<br>${usePe ? 'pe' : 'E'} = %{y:.3f}<extra></extra>`,
    }];
    if (showDerivative) {
      const der = firstDerivative(curve.volumes, y);
      const maxD = Math.max(...der.d.map(Math.abs), 1e-9);
      const span = Math.max(...y) - Math.min(...y);
      data.push({
        x: der.v, y: der.d.map((d) => Math.min(...y) + (Math.abs(d) / maxD) * span),
        type: 'scatter', mode: 'lines', name: t('titulacion.derivativeTraceNameDe'),
        line: { width: 2, color: '#7F8C8D' }, hoverinfo: 'skip',
      });
    }
    const shapeList: Partial<Shape>[] = [{
      type: 'line', x0: curve.vEq, x1: curve.vEq, y0: Math.min(...y), y1: Math.max(...y),
      line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
    }];
    const annList: Partial<Annotations>[] = [{
      x: curve.vEq, y: Math.max(...y), text: t('titulacion.pE'), showarrow: false,
      font: { color: '#2C3E50', size: 12 },
    }];
    return { traces: data, shapes: shapeList, annotations: annList };
  }, [curve, usePe, showDerivative, t]);

  const quantitative = curve.logK >= 6;
  const pHDependent = analyte.mH > 0 || titrant.mH > 0;
  const buretSpecies = direction === 'oxidante' ? titrant.ox : titrant.red;

  const exportMetadata = useMemo(() => ({
    Módulo: 'Titulación redox',
    Analito: analyte.name,
    Titulante: titrant.name,
    pH: pH.toFixed(1),
    'CA / M': cAnalyte.toFixed(4),
    'CT / M': cTitrant.toFixed(4),
  }), [analyte.name, titrant.name, pH, cAnalyte, cTitrant]);

  return (
    <>
      <PanelShell title={t('titulacion.redoxTitle')} onReset={reset} moduleId="titulacion">
        <PanelSection title={t('acidoBase.systemSection')} icon="⚛">
          <Segmented
            options={[
              { value: 'oxidante', label: t('titulacion.oxidationOption') },
              { value: 'reductor', label: t('titulacion.reductionOption') },
            ]}
            value={direction}
            onChange={(v) => setDirection(v as 'oxidante' | 'reductor')}
          />
          <ModelBadge
            model={direction === 'oxidante' ? t('titulacion.redoxModelOxidation') : t('titulacion.redoxModelReduction')}
            additions={[pHDependent && t('redox.additionPHConditioned'), usePe && t('titulacion.addPeAxis'), showDerivative && t('mezclas.additionDerivative')]}
          />
          <p className="hint">
            {direction === 'oxidante'
              ? t('titulacion.analyteStartsAsOx', { analyte: analyte.red, titrant: titrant.ox })
              : t('titulacion.analyteStartsAsOx', { analyte: analyte.ox, titrant: titrant.red })}
          </p>
          <CoupleEditor title={t('titulacion.analytePairTitle')} couple={analyte} onChange={setAnalyte} />
          <CoupleEditor title={t('titulacion.titrantPairTitle')} couple={titrant} onChange={setTitrant} />
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          <Slider label={t('titulacion.bufferedMediumPHLabel')} value={pH} min={0} max={8} step={0.1} onChange={setPH} decimals={1} />
          {pHDependent && (
            <p className="hint">{t('titulacion.hInHalfReactionHint')}</p>
          )}
          <ConcSlider label={t('titulacion.analyteConcLabel')} value={cAnalyte} onChange={setCAnalyte} min={-4} max={-1} />
          <Slider label={t('titulacion.sampleVolumeLabel')} value={vAnalyte} min={10} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfTitrantSimpleLabel')} value={cTitrant} onChange={setCTitrant} min={-4} max={-1} />
          <Toggle label={t('titulacion.peAxisToggle')} checked={usePe} onChange={setUsePe} />
          <Toggle label={t('titulacion.showDerivativeDeToggle')} checked={showDerivative} onChange={setShowDerivative} />
        </PanelSection>
        <PanelSection title={t('complejos.resultSection')} icon="∑">
          <ResultCard items={[
            { label: t('titulacion.volEqLabel'), value: `${curve.vEq.toFixed(2)} mL` },
            { label: t('titulacion.eAtEquivalenceLabel'), value: `${curve.EEq.toFixed(3)} V (pe ${curve.peEq.toFixed(2)})` },
            { label: t('titulacion.logKReactionLabel'), value: curve.logK.toFixed(1) },
          ]} />
          <p className={quantitative ? 'badge ok' : 'badge warn'}>
            {quantitative
              ? t('titulacion.redoxQuantitativeMsg', { k: curve.logK.toFixed(0) })
              : t('titulacion.redoxNotQuantitativeMsg', { k: curve.logK.toFixed(1) })}
          </p>
        </PanelSection>
        <InfoBox title={t('titulacion.calcMethodTitle')}>
          <p>{t('titulacion.redoxInfoBody')}</p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle={t('mezclas.volumeAddedLabel', { titrant: buretSpecies })}
          yTitle={usePe ? 'pe' : 'E (V vs ENH)'}
          xRange={[0, vMax]}
          shapes={shapes}
          annotations={annotations}
          exportName="equilibria-titulacion-redox"
          exportMetadata={exportMetadata}
        />
        <ResultCardRow items={[
          { label: t('titulacion.vOfEquivalenceShort'), value: `${curve.vEq.toFixed(2)} mL`, accent: true },
          { label: usePe ? t('titulacion.peAtEquivalenceShort') : t('titulacion.eAtEquivalenceLabel'), value: usePe ? curve.peEq.toFixed(2) : `${curve.EEq.toFixed(3)} V` },
          { label: t('titulacion.logKReactionShort'), value: curve.logK.toFixed(1) },
        ]} />
      </section>
    </>
  );
}

/* ───────────────────────── Precipitation ─────────────────────────────────── */

function PrecipTitration({ mode }: { mode: Mode }) {
  const t = useT();
  const [presetId, setPresetId] = useState('cl');
  const [pKsp, setPKsp] = useState(9.74);
  const [cationName, setCationName] = useState('Ag⁺');
  const [anionName, setAnionName] = useState('Cl⁻');
  const [saltFormula, setSaltFormula] = useState('AgCl');
  const [isAgSystem, setIsAgSystem] = useState(true);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [m, setM] = useState(1);
  const [x, setX] = useState(1);
  const [showPCation, setShowPCation] = useState(false);
  const [showMohr, setShowMohr] = useState(false);
  const [cChromate, setCChromate] = useState(0.005);
  const [showDerivative, setShowDerivative] = useState(false);

  useShareEffect('titulacion', { mode, presetId, pKsp, cationName, anionName, saltFormula, isAgSystem, cAnalyte, vAnalyte, cTitrant, m, x, showPCation, showMohr, cChromate, showDerivative }, (s) => {
    if (s.presetId) setPresetId(s.presetId);
    if (s.pKsp !== undefined) setPKsp(s.pKsp);
    if (s.cationName) setCationName(s.cationName);
    if (s.anionName) setAnionName(s.anionName);
    if (s.saltFormula) setSaltFormula(s.saltFormula);
    if (s.isAgSystem !== undefined) setIsAgSystem(s.isAgSystem);
    if (s.cAnalyte !== undefined) setCAnalyte(s.cAnalyte);
    if (s.vAnalyte !== undefined) setVAnalyte(s.vAnalyte);
    if (s.cTitrant !== undefined) setCTitrant(s.cTitrant);
    // 1-4: the only values NumberSegmented's options can ever produce; a
    // value outside that range would desync the control from real state
    // and (for m=0 or x=0) divide by zero in precipTitrationCurve.
    if (typeof s.m === 'number' && Number.isInteger(s.m) && s.m >= 1 && s.m <= 4) setM(s.m);
    if (typeof s.x === 'number' && Number.isInteger(s.x) && s.x >= 1 && s.x <= 4) setX(s.x);
    if (s.showPCation !== undefined) setShowPCation(s.showPCation);
    if (s.showMohr !== undefined) setShowMohr(s.showMohr);
    if (typeof s.cChromate === 'number' && s.cChromate > 0) setCChromate(s.cChromate);
    if (s.showDerivative !== undefined) setShowDerivative(s.showDerivative);
  });

  function loadPreset(id: string) {
    const p = PRECIP_PRESETS.find((x2) => x2.id === id)!;
    setPresetId(id); setPKsp(p.pKsp);
    setCationName(p.cation); setAnionName(p.anion); setSaltFormula(p.formula);
    setIsAgSystem(p.isAg);
    setM(1); setX(1); // every current preset is MX (1:1 molar, regardless of ion charge)
    if (!p.isAg) { setShowMohr(false); setShowPCation(false); }
  }

  function reset() {
    loadPreset('cl'); setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setShowMohr(false); setShowPCation(false); setCChromate(0.005); setShowDerivative(false);
  }

  const vEq0 = (m / x) * ((cAnalyte * vAnalyte) / cTitrant);
  const vMax = vEq0 * 1.6;

  const curve = useMemo(
    () => precipTitrationCurve({ pKsp, cAnalyte, vAnalyte, cTitrant, vMax, m, x }),
    [pKsp, cAnalyte, vAnalyte, cTitrant, vMax, m, x],
  );

  const mohrPAg = mohrEndpointPAg(cChromate);

  // showPCation: true → y-axis is p(cation)=pAg, false → p(anion)=pX
  const yVals = showPCation ? curve.pAgs : curve.pXs;
  const pCatLabel = `p${cationName.replace(/[⁺²³⁴⁻]/g, '')}`;
  const pAniLabel = `p${anionName.replace(/[⁺²³⁴⁻]/g, '')}`;
  const yLabel = showPCation
    ? `${pCatLabel} (−log[${cationName}])`
    : `${pAniLabel} (−log[${anionName}])`;
  const yMax = Math.ceil(Math.max(...yVals.filter(Number.isFinite), curve.pAgEq * 1.2));

  const traces = useMemo<Data[]>(() => {
    const y = showPCation ? curve.pAgs : curve.pXs;
    const data: Data[] = [{
      x: curve.volumes, y, type: 'scatter', mode: 'lines',
      name: showPCation ? pCatLabel : pAniLabel,
      line: { width: 3, color: '#D55E00' },
      hovertemplate: `V = %{x:.2f} mL<br>p = %{y:.2f}<extra></extra>`,
    }];
    if (showDerivative) {
      const der = firstDerivative(curve.volumes, y);
      const maxD = Math.max(...der.d.map(Math.abs), 1e-9);
      const span = Math.max(...y.filter(Number.isFinite)) - Math.min(...y.filter(Number.isFinite));
      data.push({
        x: der.v, y: der.d.map((d) => (Math.abs(d) / maxD) * span * 0.6),
        type: 'scatter', mode: 'lines', name: t('titulacion.derivativeTraceNameDp'),
        line: { width: 2, color: '#7F8C8D' }, hoverinfo: 'skip',
      });
    }
    return data;
  }, [curve, showPCation, showDerivative, pCatLabel, pAniLabel, t]);

  const shapes = useMemo<Partial<Shape>[]>(() => {
    const list: Partial<Shape>[] = [{
      type: 'line', x0: curve.vEq, x1: curve.vEq, y0: 0, y1: yMax,
      line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
    }];
    if (showMohr && showPCation && isAgSystem) {
      list.push({
        type: 'line', x0: 0, x1: vMax, y0: mohrPAg, y1: mohrPAg,
        line: { color: '#7F8C8D', width: 1.5, dash: 'dot' },
      });
    }
    return list;
  }, [curve.vEq, showMohr, showPCation, isAgSystem, mohrPAg, vMax, yMax]);

  const annotations = useMemo<Partial<Annotations>[]>(() => {
    const list: Partial<Annotations>[] = [{
      x: curve.vEq, y: yMax, text: t('titulacion.pE'), showarrow: false,
      font: { color: '#2C3E50', size: 12 },
    }];
    if (showMohr && showPCation && isAgSystem) {
      list.push({
        x: vMax * 0.05, y: mohrPAg + 0.3,
        text: `Mohr: ${pCatLabel} = ${mohrPAg.toFixed(1)}`,
        showarrow: false, font: { color: '#7F8C8D', size: 11 },
        xanchor: 'left',
      });
    }
    return list;
  }, [curve.vEq, showMohr, showPCation, isAgSystem, mohrPAg, vMax, yMax, pCatLabel, t]);

  const sharpness = pKsp >= 6;
  return (
    <>
      <PanelShell title={t('titulacion.precipTitle')} onReset={reset} moduleId="titulacion">
        <PanelSection title={t('acidoBase.systemSection')} icon="⚛">
          <ModelBadge
            model={t('titulacion.precipModelBadge', { m, x })}
            additions={[showPCation && t('titulacion.addPCationAxis', { cation: cationName }), showMohr && showPCation && t('titulacion.addMohrIndicator'), showDerivative && t('mezclas.additionDerivative')]}
          />
          <p className="hint">{m > 1 ? `${m}` : ''}{cationName} + {x > 1 ? `${x}` : ''}{anionName} → {saltFormula}↓</p>
          <div className="preset-chip-row" style={{ marginBottom: 8 }}>
            {PRECIP_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`preset-chip${presetId === p.id ? ' active' : ''}`}
                onClick={() => loadPreset(p.id)}
              >
                {p.formula}
              </button>
            ))}
          </div>
          <LabelField label={t('titulacion.titrantCationLabel')} value={cationName} onChange={setCationName} />
          <LabelField label={t('titulacion.analyteAnionLabel')} value={anionName} onChange={setAnionName} />
          <LabelField label={t('titulacion.precipitateFormulaLabel')} value={saltFormula} onChange={setSaltFormula} />
          <NumberSegmented label={t('titulacion.stoichCationLabel')} value={m} options={[1, 2, 3, 4]} onChange={setM} />
          <NumberSegmented label={t('titulacion.stoichAnionLabel')} value={x} options={[1, 2, 3, 4]} onChange={setX} />
          <Slider label={t('titulacion.pKspLabel')} helpId="pKsp" value={pKsp} min={2} max={22} step={0.01} onChange={setPKsp} decimals={2} />
        </PanelSection>

        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          <ConcSlider label={t('titulacion.concOfLabel', { name: anionName })} value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
          <Slider label={t('titulacion.sampleVolumeLabel')} value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfLabel', { name: cationName })} value={cTitrant} onChange={setCTitrant} min={-4} max={0} />
        </PanelSection>

        <PanelSection title={t('titulacion.visualizationSection')} icon="✦">
          <Toggle label={t('titulacion.pCationAxisToggle', { cation: cationName, anion: anionName })} checked={showPCation} onChange={setShowPCation} />
          {isAgSystem && showPCation && (
            <Toggle label={t('titulacion.mohrMarkerToggle')} checked={showMohr} onChange={setShowMohr} />
          )}
          {isAgSystem && showPCation && showMohr && (
            <>
              <ConcSlider
                label={t('titulacion.chromateConcLabel')}
                value={cChromate}
                onChange={setCChromate}
                min={-4}
                max={-1}
              />
              <p className="hint">{t('titulacion.mohrClassicHint')}</p>
            </>
          )}
          <Toggle label={t('titulacion.showDerivativeDpToggle')} checked={showDerivative} onChange={setShowDerivative} />
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')} icon="∑">
          <ResultCard items={[
            { label: t('titulacion.volEqLabel'), value: `${curve.vEq.toFixed(2)} mL` },
            { label: m === 1 && x === 1 ? t('titulacion.pAtEquivalenceHalfPKsp') : t('titulacion.pAtEquivalence'), value: curve.pAgEq.toFixed(2) },
            ...(isAgSystem && showPCation ? [{
              label: t('titulacion.mohrIndicatorLabel'),
              value: `pAg = ${mohrPAg.toFixed(2)} (Δ = ${(mohrPAg - curve.pAgEq).toFixed(2)})`,
            }] : []),
          ]} />
          <p className={sharpness ? 'badge ok' : 'badge warn'}>
            {sharpness
              ? t('titulacion.sharpJumpMsg', { ksp: pKsp.toFixed(2) })
              : t('titulacion.diffuseJumpMsg')}
          </p>
        </PanelSection>

        <InfoBox title={t('titulacion.endpointMethodsTitle')}>
          <p><strong>{t('titulacion.mohrBold')}</strong>{t('titulacion.mohrBody')}</p>
          <p><strong>{t('titulacion.volhardBold')}</strong>{t('titulacion.volhardBody')}</p>
          <p><strong>{t('titulacion.fajansBold')}</strong>{t('titulacion.fajansBody')}</p>
          <p><strong>{t('titulacion.otherSystemsBold')}</strong>{t('titulacion.otherSystemsBody')}</p>
          <p><strong>{t('titulacion.stoichiometryBold')}</strong>{t('titulacion.stoichiometryBody')}</p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle={t('mezclas.volumeAddedLabel', { titrant: cationName })}
          yTitle={yLabel}
          xRange={[0, vMax]}
          yRange={[0, yMax]}
          shapes={shapes}
          annotations={annotations}
          exportName="equilibria-titulacion-precip"
          exportMetadata={{
            Módulo: 'Titulación por precipitación',
            Sal: saltFormula,
            'Estequiometría MmXx': `${m}:${x}`,
            pKsp: pKsp.toFixed(2),
            'CA / M': cAnalyte.toFixed(4),
            'CT / M': cTitrant.toFixed(4),
            ...(isAgSystem && showPCation && showMohr ? { '[CrO₄²⁻] indicador / M': cChromate.toFixed(4) } : {}),
          }}
        />
        <ResultCardRow items={[
          { label: t('titulacion.vOfEquivalenceShort'), value: `${curve.vEq.toFixed(2)} mL`, accent: true },
          { label: t('titulacion.pAtEquivalence'), value: curve.pAgEq.toFixed(2) },
          ...(isAgSystem && showPCation
            ? [{ label: `${t('titulacion.mohrIndicatorLabel')} (pAg)`, value: mohrPAg.toFixed(2) }]
            : [{ label: t('titulacion.pKspShort'), value: pKsp.toFixed(2) }]),
        ]} />
      </section>
    </>
  );
}

/* ───────────────────────── Potentiometric ────────────────────────── */

// Nernst factor at 25 °C for a glass electrode: S = 59.16 mV/pH.
// E_cell = K_ref − S · pH   (K_ref absorbs reference electrode + junction potential)
const S_POT = 59.16; // mV / pH

function PotenciometricaTitration({ mode }: { mode: Mode }) {
  const t = useT();
  const [system, setSystem] = useState<AcidSystem>(() => strongAcidSystem());
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [Kref, setKref] = useState(400);      // mV
  const [showDeriv1, setShowDeriv1] = useState(false);
  const [showDeriv2, setShowDeriv2] = useState(false);

  useShareEffect('titulacion', { mode, system, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, Kref, showDeriv1, showDeriv2 }, (s) => {
    if (isValidAcidSystem(s.system)) setSystem(s.system);
    if (s.titrantIsAcid !== undefined) setTitrantIsAcid(s.titrantIsAcid);
    if (s.cAnalyte !== undefined) setCAnalyte(s.cAnalyte);
    if (s.vAnalyte !== undefined) setVAnalyte(s.vAnalyte);
    if (s.cTitrant !== undefined) setCTitrant(s.cTitrant);
    if (s.Kref !== undefined) setKref(s.Kref);
    if (s.showDeriv1 !== undefined) setShowDeriv1(s.showDeriv1);
    if (s.showDeriv2 !== undefined) setShowDeriv2(s.showDeriv2);
  });

  function reset() {
    setSystem(strongAcidSystem()); setTitrantIsAcid(false);
    setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setKref(400); setShowDeriv1(false); setShowDeriv2(false);
  }

  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';
  const analyteKind = system.pKas.length > 0
    ? 'equilibrium' as const
    : system.z0 > 0 ? 'strong-base' as const : 'strong-acid' as const;
  const nProtons = analyteKind === 'equilibrium' ? titratableProtons(system.pKas) : 1;
  const vEqLast = (nProtons * cAnalyte * vAnalyte) / cTitrant;
  const vMax = vEqLast * 1.6;

  const curve = useMemo(
    () => titrationCurve({
      analyte: { z0: system.z0, pKas: system.pKas, kind: analyteKind },
      titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax,
    }),
    [system, analyteKind, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax],
  );

  // pH → E (mV)
  const Es = useMemo(
    () => curve.pHs.map((pH) => (Number.isFinite(pH) ? Kref - S_POT * pH : NaN)),
    [curve.pHs, Kref],
  );

  // Derivatives
  const d1 = useMemo(() => firstDerivative(curve.volumes, Es), [curve.volumes, Es]);
  const d2 = useMemo(() => secondDerivative(d1.v, d1.d), [d1]);

  // Zero-crossing of d²E/dV² — picks the crossing where |dE/dV| is maximum
  // (the true inflection point), discarding spurious crossings at the extremes.
  const zeroCrossing = useMemo(() => {
    if (d2.v.length < 3) return null;
    const maxD1 = Math.max(...d1.d.map(Math.abs), 1e-9);
    let bestV: number | null = null;
    let bestWeight = 0;
    for (let i = 1; i < d2.v.length; i++) {
      if (d2.d[i - 1] * d2.d[i] >= 0) continue;
      const midV = (d2.v[i - 1] + d2.v[i]) / 2;
      const j = d1.v.findIndex((v) => v >= midV);
      const weight = j >= 0 ? Math.abs(d1.d[j]) / maxD1 : 0;
      if (weight > bestWeight) {
        bestWeight = weight;
        const frac = -d2.d[i - 1] / (d2.d[i] - d2.d[i - 1]);
        bestV = d2.v[i - 1] + frac * (d2.v[i] - d2.v[i - 1]);
      }
    }
    return bestV;
  }, [d2, d1]);

  // Scale dE/dV and d²E/dV² for the overlay chart
  const eMin = Math.min(...Es.filter(Number.isFinite));
  const eMax = Math.max(...Es.filter(Number.isFinite));
  const eSpan = eMax - eMin;

  const d1Scaled = useMemo(() => {
    const maxD = Math.max(...d1.d.map(Math.abs), 1e-9);
    return d1.d.map((d) => eMin + (Math.abs(d) / maxD) * eSpan * 0.8);
  }, [d1, eMin, eSpan]);

  const d2Max = useMemo(() => Math.max(...d2.d.map(Math.abs), 1e-9), [d2]);
  const d2Scaled = useMemo(
    () => d2.d.map((d) => (d / d2Max) * eSpan * 0.4 + (eMax + eMin) / 2),
    [d2, d2Max, eSpan, eMax, eMin],
  );

  // E = f(V) traces
  const efVTraces = useMemo<Data[]>(() => {
    const arr: Data[] = [{
      x: curve.volumes, y: Es, type: 'scatter', mode: 'lines', name: 'E (mV)',
      line: { width: 3, color: '#0072B2' },
      hovertemplate: 'V = %{x:.2f} mL<br>E = %{y:.1f} mV<extra></extra>',
    }];
    if (showDeriv1) arr.push({
      x: d1.v, y: d1Scaled, type: 'scatter', mode: 'lines',
      name: t('titulacion.derivativeTraceNameDe'), line: { width: 2, color: '#7F8C8D' }, hoverinfo: 'skip',
    });
    if (showDeriv2) arr.push({
      x: d2.v, y: d2Scaled, type: 'scatter', mode: 'lines',
      name: t('titulacion.derivativeTraceNameD2e'), line: { width: 2, color: '#CC79A7', dash: 'dash' }, hoverinfo: 'skip',
    });
    return arr;
  }, [curve.volumes, Es, showDeriv1, showDeriv2, d1, d1Scaled, d2, d2Scaled, t]);

  const efVShapes = useMemo<Partial<Shape>[]>(() => {
    const s: Partial<Shape>[] = curve.equivalenceVolumes.map((veq) => ({
      type: 'line', x0: veq, x1: veq, y0: eMin - 50, y1: eMax + 50,
      line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
    }));
    if (showDeriv2 && zeroCrossing !== null) s.push({
      type: 'line', x0: zeroCrossing, x1: zeroCrossing, y0: eMin - 50, y1: eMax + 50,
      line: { color: '#CC79A7', width: 1, dash: 'dot' },
    });
    return s;
  }, [curve.equivalenceVolumes, showDeriv2, zeroCrossing, eMin, eMax]);

  const efVAnnotations = useMemo<Partial<Annotations>[]>(() => {
    const a: Partial<Annotations>[] = curve.equivalenceVolumes.map((veq) => ({
      x: veq, y: eMax, text: t('titulacion.pE'), showarrow: false, font: { color: '#2C3E50', size: 12 },
    }));
    if (showDeriv2 && zeroCrossing !== null) a.push({
      x: zeroCrossing, y: eMin + eSpan * 0.1,
      text: `d²E/dV²=0<br>${zeroCrossing.toFixed(2)} mL`,
      showarrow: false, font: { color: '#CC79A7', size: 10 },
    });
    return a;
  }, [curve.equivalenceVolumes, showDeriv2, zeroCrossing, eMax, eMin, eSpan, t]);

  // Gran plot
  const gran = useMemo(
    () => granPlot(curve.volumes, curve.pHs, vAnalyte),
    [curve.volumes, curve.pHs, vAnalyte],
  );

  const granTraces = useMemo<Data[]>(() => [
    {
      x: gran.v1, y: gran.F1, type: 'scatter', mode: 'lines', name: t('titulacion.granBeforePE'),
      line: { width: 2.5, color: '#0072B2' },
      hovertemplate: `V = %{x:.2f} mL<br>F₁ = %{y:.2e}<extra>${t('titulacion.granBeforePEShort')}</extra>`,
    },
    {
      x: gran.v2, y: gran.F2, type: 'scatter', mode: 'lines', name: t('titulacion.granAfterPE'),
      line: { width: 2.5, color: '#D55E00', dash: 'dash' },
      hovertemplate: `V = %{x:.2f} mL<br>F₂ = %{y:.2e}<extra>${t('titulacion.granAfterPEShort')}</extra>`,
    },
  ], [gran, t]);

  const granShapes = useMemo<Partial<Shape>[]>(
    () => curve.equivalenceVolumes.map((veq) => ({
      type: 'line', x0: veq, x1: veq, y0: 0, y1: 1,
      yref: 'paper', xref: 'x',
      line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
    })),
    [curve.equivalenceVolumes],
  );

  const exportMetadata = useMemo(() => ({
    Módulo: 'Titulación potenciométrica',
    Analito: system.label,
    Titulante: titrantName,
    'CA / M': cAnalyte.toFixed(4),
    'VA / mL': vAnalyte.toFixed(0),
    'CT / M': cTitrant.toFixed(4),
    'Kref / mV': Kref.toFixed(0),
  }), [system.label, titrantName, cAnalyte, vAnalyte, cTitrant, Kref]);

  const diagrams = [
    {
      id: 'efV',
      label: t('titulacion.efVTab'),
      node: (
        <Chart
          data={efVTraces}
          xTitle={t('titulacion.volumeOfLabel', { titrant: titrantName })}
          yTitle="E (mV)"
          xRange={[0, vMax]}
          yRange={[eMin - 20, eMax + 20]}
          shapes={efVShapes}
          annotations={efVAnnotations}
          exportName="equilibria-potenciometrica-efV"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'gran',
      label: t('titulacion.granChartTab'),
      node: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Chart
              data={granTraces}
              xTitle={t('titulacion.volumeOfLabel', { titrant: titrantName })}
              yTitle={t('titulacion.granFunctionYTitle')}
              xRange={[0, vMax]}
              shapes={granShapes}
              exportName="equilibria-gran"
              exportMetadata={exportMetadata}
            />
          </div>
          <p className="hint" style={{ margin: '4px 8px 2px' }}>
            {t('titulacion.granOnlyBeforeAfterHint')}<em>{t('titulacion.beforeEm')}</em>{t('titulacion.granOnlyMid')}<em>{t('titulacion.afterEm')}</em>{t('titulacion.granOnlySuffix')}<sub>eq</sub>.
          </p>
        </div>
      ),
    },
  ];

  const veqFromZero = zeroCrossing;
  const veqFromCurve = curve.equivalenceVolumes[curve.equivalenceVolumes.length - 1];

  const systemKind = analyteKind === 'equilibrium'
    ? system.pKas.length > 1 ? t('titulacion.kindPolyprotic') : t('titulacion.kindWeak')
    : analyteKind === 'strong-base' ? t('titulacion.kindStrongBase') : t('titulacion.kindStrongAcid');

  return (
    <>
      <PanelShell title={t('titulacion.potentiometricTitle')} onReset={reset} moduleId="titulacion">
        <PanelSection title={t('acidoBase.systemSection')} icon="⚛">
          <Segmented
            options={[
              { value: 'base', label: t('titulacion.titrantBaseSeg') },
              { value: 'acid', label: t('titulacion.titrantAcidSeg') },
            ]}
            value={titrantIsAcid ? 'acid' : 'base'}
            onChange={(v) => {
              const nextIsAcid = v === 'acid';
              setTitrantIsAcid(nextIsAcid);
              if (system.pKas.length === 0) setSystem(strongAcidSystem(nextIsAcid));
            }}
          />
          <ModelBadge
            model={t('titulacion.potentiometricModelBadge', {
              titrant: titrantIsAcid ? t('titulacion.titrantAcidWord') : t('titulacion.titrantBaseWord'),
              kind: systemKind,
            })}
            additions={[showDeriv1 && t('titulacion.addFirstDerivative'), showDeriv2 && t('titulacion.addSecondDerivative')]}
          />
          <AcidSystemEditor system={system} onChange={setSystem} includeStrong allowNoConstants showModel={false} allowAquaCations />
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          <ConcSlider label={t('titulacion.analyteConcLabel')} value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
          <Slider label={t('titulacion.sampleVolumeLabel')} value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfLabel', { name: titrantName })} value={cTitrant} onChange={setCTitrant} min={-4} max={0} />
        </PanelSection>
        <PanelSection title={t('titulacion.glassElectrodeSection')} icon="✦">
          <Slider
            label={t('titulacion.krefLabel')}
            helpId="Kref"
            value={Kref} min={0} max={800} step={10}
            onChange={setKref} decimals={0}
          />
          <p className="hint">{t('titulacion.nernstHint')}</p>
          <Toggle label={t('titulacion.showFirstDerivativeToggle')} checked={showDeriv1} onChange={setShowDeriv1} />
          <Toggle label={t('titulacion.showSecondDerivativeToggle')} checked={showDeriv2} onChange={setShowDeriv2} />
        </PanelSection>
        <PanelSection title={t('complejos.resultSection')} icon="∑">
          <ResultCard items={[
            { label: t('titulacion.veqExactBalanceLabel'), value: `${veqFromCurve?.toFixed(2) ?? '—'} mL` },
            ...(showDeriv2 ? [{
              label: t('titulacion.veqZeroCrossingLabel'),
              value: veqFromZero !== null ? `${veqFromZero.toFixed(2)} mL` : '—',
            }] : []),
            { label: t('titulacion.eAtPELabel'), value: veqFromCurve !== undefined ? (() => {
                const idx = curve.volumes.findIndex((v) => v >= veqFromCurve);
                return idx > 0 ? `${Es[idx].toFixed(1)} mV (pH ${curve.pHs[idx].toFixed(2)})` : '—';
              })() : '—' },
          ]} />
        </PanelSection>
        <InfoBox title={t('titulacion.endpointLocationTitle')}>
          <p><strong>{t('titulacion.firstDerivBold')}</strong>{t('titulacion.firstDerivBody')}</p>
          <p><strong>{t('titulacion.secondDerivBold')}</strong>{t('titulacion.secondDerivBody')}</p>
          <p>
            <strong>{t('titulacion.granChartBold')}</strong>{t('titulacion.granChartBodyPrefix')}<strong>{t('titulacion.smallJumpBold')}</strong>.
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="efV" />
        <ResultCardRow items={[
          { label: t('titulacion.vOfEquivalenceShort'), value: veqFromCurve !== undefined ? `${veqFromCurve.toFixed(2)} mL` : '—', accent: true },
          ...(showDeriv2 && veqFromZero !== null
            ? [{ label: t('titulacion.vEqZeroCrossingShort'), value: `${veqFromZero.toFixed(2)} mL` }]
            : []),
          { label: t('titulacion.eAtPELabel'), value: veqFromCurve !== undefined ? (() => {
              const idx = curve.volumes.findIndex((v) => v >= veqFromCurve);
              return idx > 0 ? `${Es[idx].toFixed(0)} mV` : '—';
            })() : '—' },
        ]} />
      </section>
    </>
  );
}

/* ───────────────────────── Contenedor ───────────────────────── */

export default function Titulacion() {
  const t = useT();
  const MODES: { value: Mode; label: string }[] = [
    { value: 'acidobase', label: t('titulacion.modeAcidBase') },
    { value: 'edta', label: t('titulacion.modeEdta') },
    { value: 'redox', label: t('titulacion.modeRedox') },
    { value: 'precip', label: t('titulacion.modePrecip') },
    { value: 'potenciometrica', label: t('titulacion.modePotentiometric') },
  ];
  const [mode, setMode] = useState<Mode>(initialTitulacionMode);
  const modeLabel = MODES.find((m) => m.value === mode)?.label ?? '';
  return (
    <div className="module-with-tabs">
      <details className="tit-mode-collapse" open>
        <summary className="tit-mode-summary">{t('titulacion.modeSummary', { mode: modeLabel })}</summary>
        <div className="chart-tabs">
          {MODES.map((m) => (
            <button
              key={m.value}
              className={mode === m.value ? 'chart-tab active' : 'chart-tab'}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </details>
      <div className="module">
        {mode === 'acidobase' && <AcidBaseTitration mode={mode} />}
        {mode === 'edta' && <EdtaTitration mode={mode} />}
        {mode === 'redox' && <RedoxTitration mode={mode} />}
        {mode === 'precip' && <PrecipTitration mode={mode} />}
        {mode === 'potenciometrica' && <PotenciometricaTitration mode={mode} />}
      </div>
    </div>
  );
}
