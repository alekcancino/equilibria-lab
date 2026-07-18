import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShareEffect, hasSharedUrlState } from '../hooks/useShareableState';
import { useComplejosCarryOver, type ComplejosCarryOver } from '../context/ComplejosCarryOverContext';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import PredominanceDiagram from '../components/PredominanceDiagram';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, ConstantList, DbPanel, Disclosure, InfoBox, LabelField,
  ModelBadge, NumberSegmented, PanelSection, ResultCard, ResultCardRow, Segmented, Slider, Toggle,
} from '../components/Controls';
import { SideReactionEditor } from '../components/Editors';
import Predominance2D from '../components/Predominance2D';
import { useT } from '../hooks/useT';
import { SPECIES_COLORS } from '../lib/database';
import { predominanceZones } from '../lib/ladder';
import { predominanceGrid } from '../lib/predominance2D';
import {
  complexFractions, bjerrumNumber, solvePL, logBetasToStepwise,
  solvePXAtPL, solveTwoLigandEquilibrium, twoLigandCurve,
  twoLigandFractions, twoLigandPredominanceZones, xBranchFromEditor,
} from '../lib/complexation';
import { percentComplexed, pLForPercentComplexed } from '../lib/metrics';
import { correctedLogBetas } from '../lib/activity';
import {
  composeAlphas, defaultSideEditorState, sideStackFromEditor,
  type SideReactionEditorState,
} from '../lib/sideReactions';
import {
  COMPLEX_PRESETS, genericComplexLabels, type ComplexPreset,
} from '../lib/complexDatabase';

const PL_POINTS = 400;
const MODULE_ID = 'complejos';

/** How metal side reactions enter the diagrams: not at all, as a Ringbom pX′
 * axis shift (exact only at [X] fijo), or as the coupled two-ligand solve. */
type SideMode = 'ninguna' | 'ringbom' | 'acoplada';

function isValidSideMode(v: unknown): v is SideMode {
  return v === 'ninguna' || v === 'ringbom' || v === 'acoplada';
}

interface ComplexState {
  metalLabel: string;
  ligandLabel: string;
  logBetas: number[];
  speciesLabels: string[] | null;
  reference: string | null;
}

function defaultState(): ComplexState {
  return {
    metalLabel: 'M',
    ligandLabel: 'L',
    logBetas: [8],
    speciesLabels: null,
    reference: null,
  };
}

/** Seeds a fresh mount from the hub's cross-view carry-over (metal + generic
 * ligand ladder only — see ComplejosCarryOverContext for the field mapping). */
function seedFromCarryOver(c: ComplejosCarryOver): ComplexState {
  const base = defaultState();
  if (hasSharedUrlState(MODULE_ID)) return base;
  if (c.metalLabel) base.metalLabel = c.metalLabel;
  if (c.ligandLabel) base.ligandLabel = c.ligandLabel;
  if (c.logBetas && c.logBetas.length > 0) base.logBetas = [...c.logBetas];
  return base;
}

function fromPreset(p: ComplexPreset): ComplexState {
  return {
    metalLabel: p.metalLabel,
    ligandLabel: p.ligandLabel,
    logBetas: [...p.logBetas],
    speciesLabels: [...p.speciesLabels],
    reference: p.reference,
  };
}

function effectiveLabels(s: ComplexState): string[] {
  if (s.speciesLabels && s.speciesLabels.length === s.logBetas.length + 1) {
    return s.speciesLabels;
  }
  return genericComplexLabels(s.metalLabel || 'M', s.ligandLabel || 'L', s.logBetas.length);
}

/** Multi-ligand complexation equilibrium: predominance diagram + α distribution + Bjerrum + logC. */
export default function Complejos() {
  const t = useT();
  const { carryOver, setCarryOver } = useComplejosCarryOver();
  const [sys, setSys] = useState<ComplexState>(() => seedFromCarryOver(carryOver));
  const [cM, setCM] = useState(0.01);
  const [cL, setCL] = useState(0.04);
  const [showEquil, setShowEquil] = useState(true);
  const [sideMode, setSideMode] = useState<SideMode>('ninguna');
  const [pHScale, setPHScale] = useState(10);
  const [side, setSide] = useState<SideReactionEditorState>(defaultSideEditorState);
  const [useActivity, setUseActivity] = useState(false);
  const [ionicI, setIonicI] = useState(0.1);
  const [zM, setZM] = useState(2);
  const [zL, setZL] = useState(0);

  useEffect(() => {
    // Don't push the untouched placeholder ('M'/'L') — otherwise the very
    // first tab switch out of a fresh Complejos mount pollutes the other two
    // views with a meaningless logβ=8 stub before the user has done anything.
    const touched = sys.metalLabel !== 'M' || sys.ligandLabel !== 'L';
    if (!touched) return;
    setCarryOver((prev) => ({
      ...prev, metalLabel: sys.metalLabel, ligandLabel: sys.ligandLabel, logBetas: sys.logBetas,
    }));
  }, [sys.metalLabel, sys.ligandLabel, sys.logBetas, setCarryOver]);

  useShareEffect('complejos', { sys, cM, cL, showEquil, sideMode, pHScale, side, useActivity, ionicI, zM, zL }, (s) => {
    if (s.sys) setSys(s.sys);
    if (s.cM !== undefined) setCM(s.cM);
    if (s.cL !== undefined) setCL(s.cL);
    if (s.showEquil !== undefined) setShowEquil(s.showEquil);
    if (isValidSideMode(s.sideMode)) setSideMode(s.sideMode);
    if (s.pHScale !== undefined) setPHScale(s.pHScale);
    if (s.side) setSide(s.side);
    if (s.useActivity !== undefined) setUseActivity(s.useActivity);
    if (s.ionicI !== undefined) setIonicI(s.ionicI);
    if (typeof s.zM === 'number' && Number.isInteger(s.zM) && s.zM >= 1 && s.zM <= 4) setZM(s.zM);
    if (typeof s.zL === 'number' && Number.isInteger(s.zL) && s.zL >= -4 && s.zL <= 0) setZL(s.zL);
  });

  function reset() {
    setSys(defaultState()); setCM(0.01); setCL(0.04); setShowEquil(false);
    setSideMode('ninguna'); setPHScale(10); setSide(defaultSideEditorState());
    setUseActivity(false); setIonicI(0.1); setZM(2); setZL(0);
  }

  const logAlphaM = useMemo(() => {
    if (sideMode !== 'ringbom') return 0;
    const br = composeAlphas(pHScale, sideStackFromEditor(side));
    return Math.log10(Math.max(br.alphaM, 1e-30));
  }, [sideMode, pHScale, side]);

  const scaleX = useCallback((pL: number) => pL + logAlphaM, [logAlphaM]);
  const xLabel = sideMode === 'ringbom'
    ? t('complejos.conditionalPXLabel', { ph: pHScale.toFixed(1) })
    : t('complejos.pLAxisLabel');

  // Coupled X branch — non-null only in 'acoplada' mode with the aux ligand enabled.
  const xBranch = useMemo(
    () => (sideMode === 'acoplada' ? xBranchFromEditor(side) : null),
    [sideMode, side],
  );

  const labels = useMemo(() => {
    const base = effectiveLabels(sys);
    if (!xBranch) return base;
    const xLabels = genericComplexLabels(
      sys.metalLabel || 'M', side.auxLabel || 'X', xBranch.logBetasX.length,
    ).slice(1);
    return [...base, ...xLabels];
  }, [sys, xBranch, side.auxLabel]);
  const n = sys.logBetas.length;
  // Diagrams consume the activity-corrected beta' (the editor keeps the ideal beta).
  const logBetasEff = useMemo(
    () => (useActivity ? correctedLogBetas(sys.logBetas, zM, zL, ionicI) : sys.logBetas),
    [useActivity, sys.logBetas, zM, zL, ionicI],
  );
  const stepwise = useMemo(() => logBetasToStepwise(logBetasEff), [logBetasEff]);

  const exportMetadata = useMemo(() => ({
    Módulo: 'Complejos',
    Metal: sys.metalLabel || 'M',
    Ligante: sys.ligandLabel || 'L',
    'CM / M': cM.toFixed(4),
    'CL / M': cL.toFixed(4),
    ...(xBranch ? { 'Ligando X (acoplado)': side.auxLabel || 'X' } : {}),
    ...(useActivity ? { 'I / M': ionicI.toFixed(4), 'zM / zL': `${zM} / ${zL}` } : {}),
  }), [sys.metalLabel, sys.ligandLabel, cM, cL, xBranch, side.auxLabel, useActivity, ionicI, zM, zL]);

  // pL range: 0 to logβₙ + 3
  const pLmax = useMemo(() => Math.max(logBetasEff[n - 1] + 3, 6), [logBetasEff, n]);
  const xMax = scaleX(pLmax);

  // Coupled sweep + operating point (both mass balances), only in 'acoplada' mode.
  const coupledCurve = useMemo(
    () => (xBranch ? twoLigandCurve(cM, logBetasEff, xBranch, pHScale, [0, pLmax], PL_POINTS) : null),
    [xBranch, cM, logBetasEff, pHScale, pLmax],
  );
  const coupledEq = useMemo(
    () => (xBranch ? solveTwoLigandEquilibrium(cM, cL, logBetasEff, xBranch, pHScale) : null),
    [xBranch, cM, cL, logBetasEff, pHScale],
  );

  // equilibrium pL
  const pLEq = useMemo(
    () => (coupledEq ? coupledEq.pL : solvePL(cM, cL, logBetasEff)),
    [coupledEq, cM, cL, logBetasEff],
  );
  const pLEqClipped = Math.min(pLEq, pLmax - 0.05);

  // Species fractions per pL sample: coupled sweep when the X branch is
  // active, plain one-ligand fractions otherwise.
  const fractionSamples = useMemo(() => {
    if (coupledCurve) {
      return coupledCurve.map((pt) => ({ x: pt.pL, fractions: pt.fractions }));
    }
    const out: { x: number; fractions: number[] }[] = [];
    for (let i = 0; i <= PL_POINTS; i++) {
      const pL = (pLmax * i) / PL_POINTS;
      out.push({ x: scaleX(pL), fractions: complexFractions(pL, logBetasEff) });
    }
    return out;
  }, [coupledCurve, logBetasEff, pLmax, scaleX]);

  // α distribution vs pL
  const alphaTraces = useMemo<Data[]>(() => {
    const pls = fractionSamples.map((s) => s.x);
    const series: number[][] = Array.from({ length: labels.length }, () => []);
    fractionSamples.forEach((s) => s.fractions.forEach((a, j) => series[j].push(a)));
    return series.map((ys, j) => ({
      x: pls, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? `ML${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `α = %{y:.3f}<extra>${labels[j] ?? ''}</extra>`,
    }));
  }, [fractionSamples, labels]);

  // Bjerrum function n̄ vs pL
  const bjerrumTraces = useMemo<Data[]>(() => {
    if (coupledCurve) {
      const pls = coupledCurve.map((pt) => pt.pL);
      return [
        {
          x: pls, y: coupledCurve.map((pt) => pt.nBarL), type: 'scatter', mode: 'lines',
          name: `n̅ (${sys.ligandLabel || 'L'})`, line: { width: 3, color: '#0072B2' },
          hovertemplate: 'pL = %{x:.2f}<br>n̅_L = %{y:.2f}<extra></extra>',
        },
        {
          x: pls, y: coupledCurve.map((pt) => pt.nBarX), type: 'scatter', mode: 'lines',
          name: `n̅ (${side.auxLabel || 'X'})`, line: { width: 3, color: '#D55E00', dash: 'dash' },
          hovertemplate: 'pL = %{x:.2f}<br>n̅_X = %{y:.2f}<extra></extra>',
        },
      ];
    }
    const pls: number[] = [];
    const nBar: number[] = [];
    for (let i = 0; i <= PL_POINTS; i++) {
      const pL = (pLmax * i) / PL_POINTS;
      pls.push(scaleX(pL));
      nBar.push(bjerrumNumber(pL, logBetasEff));
    }
    const trace: Data[] = [{
      x: pls, y: nBar, type: 'scatter', mode: 'lines',
      name: 'n̅', line: { width: 3, color: '#0072B2' },
      hovertemplate: 'pL = %{x:.2f}<br>n̅ = %{y:.2f}<extra></extra>',
    }];
    // marcas en pL = log Kᵢ (escalonada) — donde n̄ tiene sus inflexiones
    stepwise.forEach((lk, i) => {
      const nAtK = bjerrumNumber(lk, logBetasEff);
      trace.push({
        x: [lk], y: [nAtK], type: 'scatter', mode: 'text+markers',
        text: [`log K${i + 1}`], textposition: 'top center',
        marker: { size: 8, color: SPECIES_COLORS[i % SPECIES_COLORS.length] },
        name: `log K${i + 1} = ${lk.toFixed(2)}`,
        showlegend: false,
        hovertemplate: `log K${i + 1} = ${lk.toFixed(2)}<br>n̅ = %{y:.2f}<extra></extra>`,
      });
    });
    return trace;
  }, [coupledCurve, logBetasEff, sys.ligandLabel, side.auxLabel, stepwise, pLmax, scaleX]);

  // Diagrama logC vs pL
  const logCTraces = useMemo<Data[]>(() => {
    const pls = fractionSamples.map((s) => s.x);
    const series: number[][] = Array.from({ length: labels.length }, () => []);
    fractionSamples.forEach((s) => s.fractions.forEach((a, j) => {
      series[j].push(Math.log10(Math.max(a * cM, 1e-30)));
    }));
    return series.map((ys, j) => ({
      x: pls, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? `ML${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `log C = %{y:.2f}<extra>${labels[j] ?? ''}</extra>`,
    }));
  }, [fractionSamples, labels, cM]);

  // Predominance diagram
  const zones = useMemo(() => {
    if (xBranch) {
      return twoLigandPredominanceZones(cM, logBetasEff, xBranch, pHScale, labels, [0, pLmax]);
    }
    const z = predominanceZones(stepwise, labels, 0, pLmax, false);
    if (sideMode !== 'ringbom') return z;
    return z.map((zone) => ({
      ...zone,
      pStart: scaleX(zone.pStart),
      pEnd: scaleX(zone.pEnd),
    }));
  }, [xBranch, cM, logBetasEff, pHScale, stepwise, labels, pLmax, sideMode, scaleX]);

  const equilMarker = showEquil && pLEq < pLmax + 1
    ? { p: scaleX(pLEqClipped), label: `equil. · ${sideMode === 'ringbom' ? 'pX′' : 'pL'} ${scaleX(pLEq).toFixed(2)}` }
    : undefined;

  const equilShape = showEquil && pLEq < pLmax + 1
    ? [{ type: 'line' as const, x0: scaleX(pLEqClipped), x1: scaleX(pLEqClipped), y0: 0, y1: 1.02, line: { color: '#CC79A7', width: 2, dash: 'dashdot' as const } }]
    : [];

  const equilShapeLogC = showEquil && pLEq < pLmax + 1
    ? [{ type: 'line' as const, x0: scaleX(pLEqClipped), x1: scaleX(pLEqClipped), y0: -20, y1: 1, line: { color: '#CC79A7', width: 2, dash: 'dashdot' as const } }]
    : [];

  // especie dominante en pL de equilibrio
  const pXAtEq = xBranch ? solvePXAtPL(pLEqClipped, cM, xBranch, pHScale, logBetasEff) : Infinity;
  const alphasEq = xBranch
    ? twoLigandFractions(pLEqClipped, pXAtEq, logBetasEff, xBranch.logBetasX)
    : complexFractions(pLEqClipped, logBetasEff);
  // indexOf(Math.max) is -1 when the solve failed (NaN fractions) — every
  // consumer below must degrade to '—' instead of indexing with -1.
  const domIdx = alphasEq.indexOf(Math.max(...alphasEq));
  const eqValid = domIdx >= 0;
  const nBarEq = xBranch
    ? alphasEq.slice(1, 1 + n).reduce((s, a, i) => s + (i + 1) * a, 0)
    : bjerrumNumber(pLEqClipped, logBetasEff);
  const pctEnX = xBranch
    ? alphasEq.slice(1 + n).reduce((s, a) => s + a, 0) * 100
    : 0;
  const nBarMax = xBranch ? Math.max(n, xBranch.logBetasX.length) : n;

  // "% + operating point" metrics, from the free-metal fraction (alphasEq[0]),
  // never from ñ (bjerrumNumber/nBarEq): ñ is a mean coordination number, not
  // a fraction — for an N-step ladder it ranges 0..N, so ñ·100 isn't a real
  // percentage (a 4-step Zn–NH₃ system showed "312.5 %"). (1 − α_free) is
  // always in [0, 1] regardless of how many steps the ladder has, in both
  // plain and coupled (X–M–L) mode, since alphasEq[0] is the free-M fraction
  // in either case.
  const pctFormado = percentComplexed(alphasEq[0] ?? 0);
  const pctDisociado = (alphasEq[0] ?? 0) * 100;
  const pL50 = pLForPercentComplexed(logBetasEff, 50);

  // 2D predominance map (pL–pX): the metal split between the primary ligand L
  // and the second agent X, with both free concentrations as independent axes.
  // Only defined in the coupled X–M–L mode (needs a real second species set).
  const pXmax2D = useMemo(
    () => (xBranch ? Math.max(Math.max(0, ...xBranch.logBetasX) + 4, 8) : 8),
    [xBranch],
  );
  const grid2D = useMemo(
    () => (xBranch
      ? predominanceGrid(
        (pL, pX) => twoLigandFractions(pL, pX, logBetasEff, xBranch.logBetasX),
        [0, pLmax], [0, pXmax2D],
      )
      : null),
    [xBranch, logBetasEff, pLmax, pXmax2D],
  );

  const diagrams = [
    {
      id: 'equil',
      label: t('complejos.tabEquil'),
      node: (
        <Chart
          data={alphaTraces}
          xTitle={xLabel}
          yTitle={t('complejos.alphaFraction')}
          xRange={[0, xMax]}
          yRange={[0, 1.02]}
          shapes={equilShape}
          exportName="equilibria-complejos-equilibrio"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'predominance',
      label: t('complejos.tabPredominance'),
      node: (
        <PredominanceDiagram
          zones={zones}
          pMin={0}
          pMax={xMax}
          pLabel={sideMode === 'ringbom' ? 'pX′' : 'pL'}
          marker={equilMarker}
          caption={t('complejos.predominanceCaption')}
        />
      ),
    },
    {
      id: 'alpha',
      label: t('complejos.tabAlpha'),
      node: (
        <Chart
          data={alphaTraces}
          xTitle={xLabel}
          yTitle={t('complejos.alphaFraction')}
          xRange={[0, xMax]}
          yRange={[0, 1.02]}
          shapes={equilShape}
          exportName="equilibria-complejos-alfa"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'bjerrum',
      label: t('complejos.tabBjerrum'),
      node: (
        <Chart
          data={bjerrumTraces}
          xTitle={xLabel}
          yTitle={t('complejos.bjerrumYTitle')}
          xRange={[0, xMax]}
          yRange={[0, nBarMax + 0.2]}
          shapes={showEquil && pLEq < pLmax + 1 ? [{ type: 'line', x0: scaleX(pLEqClipped), x1: scaleX(pLEqClipped), y0: 0, y1: nBarMax + 0.2, line: { color: '#CC79A7', width: 2, dash: 'dashdot' } }] : []}
          exportName="equilibria-complejos-bjerrum"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'logc',
      label: t('complejos.tabLogC'),
      node: (
        <Chart
          data={logCTraces}
          xTitle={xLabel}
          yTitle="log C"
          xRange={[0, xMax]}
          yRange={[-12, 0.5]}
          shapes={equilShapeLogC}
          exportName="equilibria-complejos-logc"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'map2d',
      label: t('complejos.tabMap2D'),
      node: grid2D ? (
        <Predominance2D
          grid={grid2D}
          colors={SPECIES_COLORS}
          labels={labels}
          xLabel={`pL (−log[${sys.ligandLabel || 'L'}])`}
          yLabel={`pX (−log[${side.auxLabel || 'X'}])`}
          marker={coupledEq && Number.isFinite(coupledEq.pL) && Number.isFinite(coupledEq.pX)
            ? { x: coupledEq.pL, y: coupledEq.pX, label: t('complejos.map2dEquilLabel') }
            : undefined}
          caption={t('complejos.map2dCaption')}
          exportName="equilibria-complejos-map2d"
          exportMetadata={exportMetadata}
        />
      ) : (
        <div className="map2d-empty map2d-empty-actionable">
          <div>
            <p>
            {t('complejos.map2dEmptyPrefix')} <strong>{t('complejos.map2dEmptyModeBold')}</strong>{' '}
            {t('complejos.map2dEmptyMid')} <strong>{t('complejos.tabAlpha')}</strong>{' '}
            {t('complejos.map2dEmptyOr')} <strong>{t('complejos.tabPredominance')}</strong>{t('complejos.map2dEmptySuffix')}
            </p>
            <button type="button" className="empty-plot-action" onClick={() => {
              setSideMode('acoplada');
              setSide((current) => ({ ...current, showAux: true }));
            }}>
              {t('complejos.activateMap2D')}
            </button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title={t('complejos.title')} onReset={reset} moduleId="complejos" guideId="complejos">
        <PanelSection title={t('complejos.systemSection')}>
          <ModelBadge
            model={sys.logBetas.length === 1
              ? t('complejos.model11')
              : t('complejos.modelSuccessive', { n: sys.logBetas.length })}
            additions={[
              showEquil && t('complejos.additionMassBalance'),
              sideMode === 'ringbom' && t('complejos.additionCondScale'),
              xBranch !== null && t('complejos.additionCoupled'),
              useActivity && t('complejos.additionActivity', { i: ionicI.toPrecision(2) }),
            ]}
          />
          <LabelField
            label={t('complejos.metalLabel')}
            value={sys.metalLabel}
            onChange={(metalLabel) => setSys({ ...sys, metalLabel, speciesLabels: null, reference: null })}
          />
          <LabelField
            label={t('complejos.ligandLabel')}
            value={sys.ligandLabel}
            onChange={(ligandLabel) => setSys({ ...sys, ligandLabel, speciesLabels: null, reference: null })}
          />
          <ConstantList
            prefix="log β"
            helpId="logBeta"
            values={sys.logBetas}
            min={0}
            max={30}
            maxItems={8}
            onChange={(logBetas) => setSys({ ...sys, logBetas, speciesLabels: null, reference: null })}
          />
          <DbPanel
            title={t('complejos.dbExamples')}
            items={COMPLEX_PRESETS.map((p) => ({
              id: p.id,
              label: `${p.metalLabel} / ${p.ligandLabel}`,
              detail: `log β: ${p.logBetas.map((b) => b.toFixed(2)).join(', ')}`,
              group: p.group === 'Metal / etilendiamina'
                ? t('complejos.groupEthylenediamine')
                : p.group,
            }))}
            onSelect={(id) => {
              const p = COMPLEX_PRESETS.find((x) => x.id === id)!;
              setSys(fromPreset(p));
            }}
          />
        </PanelSection>

        <PanelSection title={t('complejos.conditionsSection')}>
          <ConcSlider label={t('complejos.cmLabel')} value={cM} onChange={setCM} />
          <ConcSlider label={t('complejos.clLabel')} value={cL} onChange={setCL} />
          <Toggle label={t('complejos.markEquilPL')} checked={showEquil} onChange={setShowEquil} />
        </PanelSection>

        <Disclosure
          title={t('complejos.activityToggle')}
          open={useActivity}
          onToggle={setUseActivity}
        >
          <ConcSlider label={t('complejos.ionicStrengthLabel')} helpId="ionicStrength" value={ionicI} onChange={setIonicI} min={-3} max={0} />
          <NumberSegmented label={t('complejos.metalChargeLabel')} value={zM} options={[1, 2, 3, 4]} onChange={setZM} />
          <NumberSegmented label={t('complejos.ligandChargeLabel')} value={zL} options={[-4, -3, -2, -1, 0]} onChange={setZL} />
          <p className="hint">
            {t('complejos.activityHint')}
            {xBranch !== null && t('complejos.activityHintXBranch')}
          </p>
        </Disclosure>

        <Disclosure title={t('complejos.advancedEquilibriaSection')} defaultOpen={sideMode !== 'ninguna'}>
          <div className="control">
            <div className="control-header">
              <span className="control-label">{t('complejos.treatmentLabel')}</span>
            </div>
            <div className="control-input">
              <Segmented
                options={[
                  { value: 'ninguna', label: t('complejos.sideModeNone') },
                  { value: 'ringbom', label: t('complejos.sideModeRingbom') },
                  { value: 'acoplada', label: t('complejos.sideModeCoupled') },
                ]}
                value={sideMode}
                onChange={(v) => {
                  const next = isValidSideMode(v) ? v : 'ninguna';
                  setSideMode(next);
                  // Jump straight to the X editor instead of leaving it collapsed
                  // behind a second click — this is the whole point of the mode.
                  if (next === 'acoplada') setSide((s) => ({ ...s, showAux: true }));
                }}
              />
            </div>
          </div>
          {sideMode === 'ringbom' && (
            <div className="advanced-layer-body">
              <Slider label={t('complejos.fixedPHLabel')} value={pHScale} min={0} max={14} step={0.1} onChange={setPHScale} decimals={1} />
              <SideReactionEditor state={side} onChange={setSide} showLigandPKas={false} />
              <p className="hint">{t('complejos.ringbomHint')}</p>
            </div>
          )}
          {sideMode === 'acoplada' && (
            <div className="advanced-layer-body">
              <Slider label={t('complejos.fixedPHLabel')} value={pHScale} min={0} max={14} step={0.1} onChange={setPHScale} decimals={1} />
              <SideReactionEditor
                state={side}
                onChange={setSide}
                showLigandPKas={false}
                showComplexSection={false}
                showHydrolysisSection={false}
                auxLigandTitle={t('complejos.xLigandTitle', { x: side.auxLabel || 'X' })}
              />
              {xBranch === null && (
                <p className="hint">
                  {t('complejos.enableAuxHint')}
                </p>
              )}
              <p className="hint">
                <strong>{t('complejos.xIsAgentBold')}</strong>{' '}
                {t('complejos.xIsAgentRest', { ligand: sys.ligandLabel || 'L' })}
              </p>
              <p className="hint">
                {t('complejos.coupledHint', { ligand: sys.ligandLabel || 'L' })}
              </p>
            </div>
          )}
        </Disclosure>

        <PanelSection title={t('complejos.resultSection')}>
          <ResultCard items={[
            {
              label: t('complejos.pLEquilResult'),
              value: Number.isNaN(pLEq)
                ? t('complejos.noSolution')
                : pLEq > pLmax ? `> ${pLmax.toFixed(0)} (${t('complejos.noLigand')})` : pLEq.toFixed(3),
            },
            ...(coupledEq ? [{
              label: t('complejos.pXEquilResult'),
              value: Number.isFinite(coupledEq.pX) ? coupledEq.pX.toFixed(3) : '—',
            }] : []),
            { label: t('complejos.nBarEquilResult'), value: eqValid ? nBarEq.toFixed(2) : '—' },
            {
              label: t('complejos.dominantSpecies'),
              value: eqValid ? `${labels[domIdx]} (α = ${alphasEq[domIdx].toFixed(3)})` : '—',
            },
          ]} />
        </PanelSection>

        <InfoBox title={t('complejos.howToReadTitle')}>
          <p>
            <strong>{t('complejos.tabPredominance')}</strong>{t('complejos.predominanceExplain')}
          </p>
          <p>
            <strong>{t('complejos.bjerrumExplainTitle')}</strong>{t('complejos.bjerrumExplain')}
          </p>
          <p>
            <strong>{t('complejos.alphaLogCTitle')}</strong>{t('complejos.alphaLogCExplain')}
          </p>
          {xBranch !== null && (
            <>
              <p>
                <strong>{t('complejos.xmlTitle')}</strong>{t('complejos.xmlExplain')}
              </p>
              <p>
                {t('complejos.solventNote')}
              </p>
            </>
          )}
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="equil" />
        <ResultCardRow items={[
          {
            label: t('complejos.pctFormed'),
            value: eqValid ? `${pctFormado.toFixed(1)} %` : '—',
            accent: true,
          },
          { label: t('complejos.pctFree'), value: eqValid ? `${pctDisociado.toFixed(1)} %` : '—' },
          ...(xBranch !== null
            ? [{ label: t('complejos.pctInX', { x: side.auxLabel || 'X' }), value: eqValid ? `${pctEnX.toFixed(1)} %` : '—' }]
            : [{ label: t('complejos.pLFor50'), value: Number.isFinite(pL50) ? pL50.toFixed(2) : '—' }]),
          {
            label: sideMode === 'ringbom' ? t('complejos.pXEquilPH') : t('complejos.pLEquilPH'),
            value: Number.isNaN(pLEq)
              ? '—'
              : pLEq > pLmax ? `>${pLmax.toFixed(0)}` : scaleX(pLEq).toFixed(2),
          },
          ...(coupledEq ? [{
            label: t('complejos.pXEquilibrium'),
            value: Number.isFinite(coupledEq.pX) ? coupledEq.pX.toFixed(2) : '—',
          }] : []),
          { label: t('complejos.nBarEquilibrium'), value: eqValid ? nBarEq.toFixed(2) : '—' },
          { label: t('complejos.dominant'), value: eqValid ? `${labels[domIdx]}` : '—' },
        ]} />
      </section>
    </div>
  );
}
