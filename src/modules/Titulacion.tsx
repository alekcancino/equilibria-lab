import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import { useShareEffect } from '../hooks/useShareableState';
import { useT } from '../hooks/useT';
import { useLanguage } from '../hooks/useLanguage';
import { handleTabKeyDown } from '../lib/tabKeyboard';
import {
  ConcSlider, ConstantList, DbPanel, Disclosure, InfoBox, LabelField, NumberSegmented, PanelSection, ResultCard, ResultCardRow,
  Segmented, ModelBadge, SelectControl, Slider, SystemPresetPicker, Toggle,
} from '../components/Controls';
import {
  AcidSystemEditor, CoupleEditor, SideReactionEditor,
} from '../components/Editors';
import { coupleFromPreset, inferredSystemLabel, isGenericSystemLabel, isValidAcidSystem, strongAcidSystem, systemLabels, type AcidSystem, type CoupleState } from '../lib/editorModels';
import DiagramTabs from '../components/DiagramTabs';
import { INDICATORS } from '../lib/database';
import { formatSci } from '../lib/format';
import { equivalenceResidual, firstDerivative, granPlot, granVeq, quantitativity, secondDerivative, titratableProtons, titrationCurve } from '../lib/titration';
import type { GammaModel } from '../lib/activity';
import type { TKey } from '../i18n/translations';
import {
  alphaY4,
  competitiveEdtaTitrationCurve,
  complexometricSensorCurve,
  edtaAtFraction,
  edtaTitrationCurve,
  EDTA_PKAS,
} from '../lib/edta';
import { defaultSideEditorState, type SideReactionEditorState } from '../lib/sideReactions';
import {
  conditionalEprimeFromStates,
  electronTransferCount,
  NERNST_S,
  peConditional,
  redoxMixtureTitrationCurve,
  redoxTitrationCurve,
  type ConditionalRedoxState,
} from '../lib/redox';
import { redoxNetworkTitrationCurve } from '../lib/redoxNetworks';
import { precipTitrationCurve, mohrEndpointPAg, PRECIP_PRESETS } from '../lib/precipTitration';
import { condLogKCurve, alphaH, alphaOH } from '../lib/conditional';
import { METAL_INDICATORS, EDTA_METAL_PRESETS, type MetalIndicator } from '../lib/indicatorDatabase';
import { SYSTEM_PRESETS, sideFromPreset, systemPresetById } from '../lib/systemPresets';
import { conditionalPKas } from '../lib/acidBaseConditional';
import {
  precipitatingAcidTitrationCurve,
  fitPrecipitationGran,
  precipitationGranTransform,
  solidBufferCapacityAtPH,
} from '../lib/acidBasePrecipitation';
import { biphasicAcidBaseTitrationCurve } from '../lib/biphasicAcidBase';
import { acidBaseResinTitrationCurve } from '../lib/acidBaseResin';
import { SOLVENT_PRESETS, waterThermodynamicState } from '../lib/thermodynamicState';
import { conditionalPrecipSensorCurve } from '../lib/conditionalPrecipSensor';
import { backTitration } from '../lib/titrationProtocols';
import { acidBaseEndpointError, complexometricEndpointError, complexometricIndicatorFraction, precipitationEndpointError, redoxEndpointError } from '../lib/endpointError';
import {
  acidBaseConductometricFromCurve, acidBaseOpticalFromCurve,
  complexometricConductometricFromCurve, complexometricOpticalFromCurve,
  redoxConductometricFromCurve, redoxOpticalFromCurve,
} from '../lib/titrationObservables';
import { equimolarAssociationLogKForTarget, solveReactionExtent } from '../lib/stoichiometricQuantitativity';
import { polynuclearEquivalencePotential } from '../lib/polynuclearRedox';

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
const INDICATOR_NAME_KEYS: Record<string, TKey> = {
  methyl_orange: 'indicator.methylOrange',
  methyl_red: 'indicator.methylRed',
  bromothymol: 'indicator.bromothymolBlue',
  phenolphthalein: 'indicator.phenolphthalein',
  thymolphthalein: 'indicator.thymolphthalein',
};

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
    return <p className="hint indicator-empty">{t('titulacion.noIndicatorDataShort')}</p>;
  }
  return (
    <div className="indicator-list">
      {results.map(({ ind, logKprimeMIn, deltaLogK, badge }) => (
        <div key={ind.id} className="indicator-card">
          <div className="indicator-card-head">
            <span className="indicator-name">{ind.abbrev} — {ind.name}</span>
            <span className={`${IND_BADGE_CLS[badge]} indicator-status`}>{IND_BADGE_LABEL[badge]}</span>
          </div>
          <div className="indicator-metrics">
            <span>log K′(MIn) = <strong>{logKprimeMIn.toFixed(1)}</strong></span>
            <span>ΔlogK = <strong>{deltaLogK.toFixed(1)}</strong></span>
          </div>
          <div className="indicator-transition">
            <span className="indicator-swatch" style={{ background: ind.colorFree }} title={t('titulacion.freeColorTitle')} />
            <span aria-hidden>→</span>
            <span className="indicator-swatch" style={{ background: ind.colorMIn }} title={t('titulacion.mInColorTitle')} />
            <span>pH {ind.pHRange[0]}–{ind.pHRange[1]}</span>
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
  const lang = useLanguage();
  const [system, setSystem] = useState<AcidSystem>(() => strongAcidSystem(false, lang));
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [indicatorId, setIndicatorId] = useState('phenolphthalein');
  const [showIndicator, setShowIndicator] = useState(false);
  const [showDerivative, setShowDerivative] = useState(false);
  const [ionicStrength, setIonicStrength] = useState(0);
  const [gammaModel, setGammaModel] = useState<GammaModel>('dh');
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);
  const [useConditionalAcidBase, setUseConditionalAcidBase] = useState(false);
  const [logStateAlphas, setLogStateAlphas] = useState<number[]>([0]);
  const [showConditionalSweep, setShowConditionalSweep] = useState(false);
  const [stateLogBetas, setStateLogBetas] = useState<number[]>([0]);
  const [conditionalPX, setConditionalPX] = useState(4);
  const [useInitialMixture, setUseInitialMixture] = useState(false);
  const [initialEquivalents, setInitialEquivalents] = useState(0);
  const [showPrecipCoupling, setShowPrecipCoupling] = useState(false);
  const [coupledPKsp, setCoupledPKsp] = useState(10);
  const [coupledPM, setCoupledPM] = useState(0);
  const [granHydroxideStoich, setGranHydroxideStoich] = useState(1);
  const [showBiphasic, setShowBiphasic] = useState(false);
  const [organicKD, setOrganicKD] = useState(100);
  const [organicVolume, setOrganicVolume] = useState(25);
  const [showResinCoupling, setShowResinCoupling] = useState(false);
  const [resinCapacity, setResinCapacity] = useState(0.001);
  const [resinKBinding, setResinKBinding] = useState(1e3);
  const couplingMedium = showPrecipCoupling ? 'precip' : showBiphasic ? 'biphasic' : showResinCoupling ? 'resin' : 'none';
  const setCouplingMedium = (medium: 'none' | 'precip' | 'biphasic' | 'resin') => {
    setShowPrecipCoupling(medium === 'precip');
    setShowBiphasic(medium === 'biphasic');
    setShowResinCoupling(medium === 'resin');
  };
  const [solventId, setSolventId] = useState<'water' | 'dmf' | 'ethanol'>('water');
  const [temperatureC, setTemperatureC] = useState(25);
  const [showBackProtocol, setShowBackProtocol] = useState(false);
  const [primaryReagentVolume, setPrimaryReagentVolume] = useState(40);
  const [showAlternativeSignals, setShowAlternativeSignals] = useState(false);
  const [productEpsilon, setProductEpsilon] = useState(100);
  const [lambdaSpectator, setLambdaSpectator] = useState(50);

  useShareEffect('titulacion', {
    mode, system, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, indicatorId, showIndicator, showDerivative,
    ionicStrength, gammaModel, startIndex, endIndex, useConditionalAcidBase, logStateAlphas,
    useInitialMixture, initialEquivalents, showConditionalSweep, stateLogBetas, conditionalPX,
    showPrecipCoupling, coupledPKsp, coupledPM, granHydroxideStoich,
    showBiphasic, organicKD, organicVolume, showResinCoupling, resinCapacity, resinKBinding,
    solventId, temperatureC, showBackProtocol, primaryReagentVolume, showAlternativeSignals, productEpsilon, lambdaSpectator,
  }, (s) => {
    if (isValidAcidSystem(s.system)) {
      setSystem(s.system);
      const restoredIsAcid = s.titrantIsAcid === true;
      if (s.startIndex === undefined) setStartIndex(restoredIsAcid ? s.system.pKas.length : 0);
      if (s.endIndex === undefined) setEndIndex(restoredIsAcid ? 0 : s.system.pKas.length);
    }
    if (s.titrantIsAcid !== undefined) setTitrantIsAcid(s.titrantIsAcid);
    if (s.cAnalyte !== undefined) setCAnalyte(s.cAnalyte);
    if (s.vAnalyte !== undefined) setVAnalyte(s.vAnalyte);
    if (s.cTitrant !== undefined) setCTitrant(s.cTitrant);
    if (s.indicatorId) setIndicatorId(s.indicatorId);
    if (s.showIndicator !== undefined) setShowIndicator(s.showIndicator);
    if (s.showDerivative !== undefined) setShowDerivative(s.showDerivative);
    if (s.ionicStrength !== undefined) setIonicStrength(s.ionicStrength);
    if (isValidGammaModel(s.gammaModel)) setGammaModel(s.gammaModel);
    if (typeof s.startIndex === 'number') setStartIndex(s.startIndex);
    if (typeof s.endIndex === 'number') setEndIndex(s.endIndex);
    if (s.useConditionalAcidBase !== undefined) setUseConditionalAcidBase(s.useConditionalAcidBase);
    if (Array.isArray(s.logStateAlphas)) setLogStateAlphas(s.logStateAlphas);
    if (s.useInitialMixture !== undefined) setUseInitialMixture(s.useInitialMixture);
    if (typeof s.initialEquivalents === 'number') setInitialEquivalents(s.initialEquivalents);
    if (s.showConditionalSweep !== undefined) setShowConditionalSweep(s.showConditionalSweep);
    if (Array.isArray(s.stateLogBetas)) setStateLogBetas(s.stateLogBetas);
    if (typeof s.conditionalPX === 'number') setConditionalPX(s.conditionalPX);
    if (s.showPrecipCoupling !== undefined) setShowPrecipCoupling(Boolean(s.showPrecipCoupling));
    if (typeof s.coupledPKsp === 'number') setCoupledPKsp(s.coupledPKsp);
    if (typeof s.coupledPM === 'number') setCoupledPM(s.coupledPM);
    if (typeof s.granHydroxideStoich === 'number') setGranHydroxideStoich(s.granHydroxideStoich);
    if (s.showBiphasic !== undefined) setShowBiphasic(Boolean(s.showBiphasic));
    if (typeof s.organicKD === 'number') setOrganicKD(s.organicKD);
    if (typeof s.organicVolume === 'number') setOrganicVolume(s.organicVolume);
    if (s.showResinCoupling !== undefined) setShowResinCoupling(Boolean(s.showResinCoupling));
    if (typeof s.resinCapacity === 'number') setResinCapacity(s.resinCapacity);
    if (typeof s.resinKBinding === 'number') setResinKBinding(s.resinKBinding);
    if (s.solventId === 'water' || s.solventId === 'dmf' || s.solventId === 'ethanol') setSolventId(s.solventId);
    if (typeof s.temperatureC === 'number') setTemperatureC(s.temperatureC);
    if (s.showBackProtocol !== undefined) setShowBackProtocol(s.showBackProtocol);
    if (typeof s.primaryReagentVolume === 'number') setPrimaryReagentVolume(s.primaryReagentVolume);
    if (s.showAlternativeSignals !== undefined) setShowAlternativeSignals(s.showAlternativeSignals);
    if (typeof s.productEpsilon === 'number') setProductEpsilon(s.productEpsilon);
    if (typeof s.lambdaSpectator === 'number') setLambdaSpectator(s.lambdaSpectator);
  });

  function reset() {
    setSystem(strongAcidSystem(false, lang)); setTitrantIsAcid(false);
    setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setIndicatorId('phenolphthalein'); setShowIndicator(false); setShowDerivative(false);
    setIonicStrength(0); setGammaModel('dh');
    setStartIndex(0); setEndIndex(0);
    setUseConditionalAcidBase(false); setLogStateAlphas([0]);
    setUseInitialMixture(false); setInitialEquivalents(0);
    setShowConditionalSweep(false); setStateLogBetas([0]); setConditionalPX(4);
    setShowPrecipCoupling(false); setCoupledPKsp(10); setCoupledPM(0); setGranHydroxideStoich(1);
    setShowBiphasic(false); setOrganicKD(100); setOrganicVolume(25);
    setShowResinCoupling(false); setResinCapacity(0.001); setResinKBinding(1e3);
    setSolventId('water'); setTemperatureC(25);
    setShowBackProtocol(false); setPrimaryReagentVolume(40);
    setShowAlternativeSignals(false); setProductEpsilon(100);
  }

  const indicator = INDICATORS.find((i) => i.id === indicatorId)!;
  const localizedSystem = isGenericSystemLabel(system.label)
    ? { ...system, label: inferredSystemLabel(system.z0, system.pKas, lang) }
    : system;
  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';
  const analyteKind = system.pKas.length > 0
    ? 'equilibrium' as const
    : system.z0 > 0 ? 'strong-base' as const : 'strong-acid' as const;
  const validStart = Math.min(Math.max(startIndex, 0), system.pKas.length);
  const validEnd = Math.min(Math.max(endIndex, 0), system.pKas.length);
  const equilibriumDirectionValid = analyteKind !== 'equilibrium'
    || (titrantIsAcid ? validEnd < validStart : validEnd > validStart);
  const effectiveEndIndex = equilibriumDirectionValid
    ? validEnd
    : validStart;
  const validInitialEquivalents = Math.min(Math.max(initialEquivalents, 0), system.pKas.length);
  const initialFractions = useMemo(() => {
    if (!useInitialMixture || analyteKind !== 'equilibrium') return undefined;
    const lower = Math.floor(validInitialEquivalents);
    const upper = Math.ceil(validInitialEquivalents);
    const fractions = new Array(system.pKas.length + 1).fill(0);
    if (lower === upper) fractions[lower] = 1;
    else {
      fractions[lower] = upper - validInitialEquivalents;
      fractions[upper] = validInitialEquivalents - lower;
    }
    return fractions;
  }, [useInitialMixture, analyteKind, validInitialEquivalents, system.pKas.length]);
  const normalizedLogAlphas = logStateAlphas.length === system.pKas.length + 1
    ? logStateAlphas
    : new Array(system.pKas.length + 1).fill(0);
  const normalizedLogBetas = stateLogBetas.length === system.pKas.length + 1
    ? stateLogBetas
    : new Array(system.pKas.length + 1).fill(0);
  const stateAlphas = showConditionalSweep
    ? normalizedLogBetas.map((logBeta) => 1 + Math.pow(10, logBeta - conditionalPX))
    : normalizedLogAlphas.map((value) => Math.pow(10, value));
  const effectivePKas = useConditionalAcidBase && analyteKind === 'equilibrium'
    ? conditionalPKas(system.pKas, stateAlphas)
    : system.pKas;
  const startingEquivalent = initialFractions ? validInitialEquivalents : validStart;
  const nProtons = analyteKind === 'equilibrium'
    ? (equilibriumDirectionValid ? Math.abs(effectiveEndIndex - startingEquivalent) : 0)
    : 1;
  const vEqLast = (nProtons * cAnalyte * vAnalyte) / cTitrant;
  const singleEquivalentVolume = (cAnalyte * vAnalyte) / cTitrant;
  const vMax = Math.max(vEqLast * 1.6, singleEquivalentVolume * 1.6);
  const vAnalyteL = vAnalyte / 1000;
  const vMaxL = vMax / 1000;
  const organicVolumeL = organicVolume / 1000;
  const thermoState = useMemo(() => solventId === 'water'
    ? (temperatureC === 25
      ? { ...SOLVENT_PRESETS.water, pKw: 14, acidityRange: [-2, 16] as [number, number] }
      : waterThermodynamicState(temperatureC))
    : SOLVENT_PRESETS[solventId], [solventId, temperatureC]);

  const curve = useMemo(
    () => titrationCurve({
      analyte: {
        z0: system.z0,
        pKas: effectivePKas,
        kind: analyteKind,
        startIndex: validStart,
        endIndex: effectiveEndIndex,
        initialFractions,
      },
      titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax, I: ionicStrength, model: gammaModel,
      pKw: thermoState.pKw, pHRange: thermoState.acidityRange,
    }),
    [system.z0, effectivePKas, analyteKind, validStart, effectiveEndIndex, initialFractions, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax, ionicStrength, gammaModel, thermoState.pKw, thermoState.acidityRange],
  );
  const couplingEligible = analyteKind === 'equilibrium' && system.pKas.length === 1 && !titrantIsAcid;
  const precipCurve = useMemo(() => showPrecipCoupling && couplingEligible
    ? precipitatingAcidTitrationCurve({
        pKa: effectivePKas[0],
        pKsp: coupledPKsp,
        cAnalyte,
        vAnalyte: vAnalyteL,
        cMetal: Math.pow(10, -coupledPM),
        cTitrant,
        maxFraction: vMaxL / Math.max(vEqLast / 1000, 1e-300),
        points: 500,
        pKw: thermoState.pKw,
      })
    : null,
  [showPrecipCoupling, couplingEligible, effectivePKas, coupledPKsp, cAnalyte, vAnalyteL, coupledPM, cTitrant, vMaxL, vEqLast, thermoState.pKw]);
  const biphasicCurve = useMemo(() => showBiphasic && couplingEligible
    ? biphasicAcidBaseTitrationCurve({
        pKas: effectivePKas,
        z0: system.z0,
        cAnalyte,
        vAnalyte: vAnalyteL,
        cTitrant,
        organicVolume: organicVolumeL,
        stateKDs: effectivePKas.map((_, index) => index).concat(effectivePKas.length)
          .map((index) => index === validStart ? organicKD : 0),
        vMax: vMaxL,
        points: 500,
        pKw: thermoState.pKw,
      })
    : null,
  [showBiphasic, couplingEligible, effectivePKas, system.z0, cAnalyte, vAnalyteL, cTitrant, organicVolumeL, validStart, organicKD, vMaxL, thermoState.pKw]);
  const resinCurve = useMemo(() => showResinCoupling && couplingEligible
    ? acidBaseResinTitrationCurve({
        analytes: [{
          label: system.label,
          c: cAnalyte,
          pKas: effectivePKas,
          z0: system.z0,
          bindingIndex: effectiveEndIndex,
          kBinding: resinKBinding,
        }],
        vAnalyte: vAnalyteL,
        cTitrant,
        vMax: vMaxL,
        resinCapacityMoles: resinCapacity,
        counterIonConcentration: cTitrant,
        counterIonCharge: system.z0 - effectiveEndIndex,
        points: 500,
        pKw: thermoState.pKw,
      })
    : null,
  [showResinCoupling, couplingEligible, system.label, system.z0, cAnalyte, effectivePKas, effectiveEndIndex, resinKBinding, vAnalyteL, cTitrant, vMaxL, resinCapacity, thermoState.pKw]);
  const displayCurve = useMemo(() => ({
    volumes: precipCurve?.map((point) => point.volume * 1000)
      ?? biphasicCurve?.volumes.map((volume) => volume * 1000)
      ?? resinCurve?.volumes.map((volume) => volume * 1000)
      ?? curve.volumes,
    pHs: precipCurve?.map((point) => point.pH) ?? biphasicCurve?.pHs ?? resinCurve?.pHs ?? curve.pHs,
    equivalenceVolumes: precipCurve || biphasicCurve || resinCurve ? [vEqLast] : curve.equivalenceVolumes,
  }), [precipCurve, biphasicCurve, resinCurve, curve, vEqLast]);
  const precipitationGran = useMemo(() => showPrecipCoupling
    ? precipitationGranTransform(displayCurve.volumes, displayCurve.pHs, vAnalyte, granHydroxideStoich)
    : null,
  [showPrecipCoupling, displayCurve, vAnalyte, granHydroxideStoich]);
  const precipitationGranFit = useMemo(
    () => precipitationGran ? fitPrecipitationGran(precipitationGran, vEqLast * 0.9) : null,
    [precipitationGran, vEqLast],
  );
  const solidBetaAtEq = useMemo(() => showPrecipCoupling && couplingEligible
    ? solidBufferCapacityAtPH({
        pKas: effectivePKas,
        z0: system.z0,
        totalAnalyte: cAnalyte,
        pKsp: coupledPKsp,
        freeMetal: Math.pow(10, -coupledPM),
        pKw: thermoState.pKw,
      }, 0.5 * (effectivePKas[0] - coupledPKsp + coupledPM + 14))
    : null,
  [showPrecipCoupling, couplingEligible, effectivePKas, system.z0, cAnalyte, coupledPKsp, coupledPM, thermoState.pKw]);

  const { traces, shapes, annotations, eqInfo } = useMemo(() => {
    const data: Data[] = [{
      x: displayCurve.volumes, y: displayCurve.pHs, type: 'scatter', mode: 'lines', name: 'pH',
      line: { width: 3, color: '#0072B2' },
      hovertemplate: 'V = %{x:.2f} mL<br>pH = %{y:.2f}<extra></extra>',
    }];
    if (showDerivative) {
      const der = firstDerivative(displayCurve.volumes, displayCurve.pHs);
      const maxD = Math.max(...der.d.map(Math.abs), 1e-9);
      data.push({
        x: der.v, y: der.d.map((d) => thermoState.acidityRange[0] + (Math.abs(d) / maxD) * (thermoState.acidityRange[1] - thermoState.acidityRange[0])),
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
    displayCurve.equivalenceVolumes.forEach((veq, k) => {
      shapeList.push({
        type: 'line', x0: veq, x1: veq, y0: thermoState.acidityRange[0], y1: thermoState.acidityRange[1],
        line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
      });
      const idx = displayCurve.volumes.findIndex((v) => v >= veq);
      const pHeq = idx > 0 ? displayCurve.pHs[idx] : NaN;
      annList.push({
        x: veq, y: thermoState.acidityRange[1] - 0.5,
        text: `${t('titulacion.pE')}${displayCurve.equivalenceVolumes.length > 1 ? ` ${k + 1}` : ''}`,
        showarrow: false, font: { color: '#2C3E50', size: 12 },
      });
      info.push({
        label: `${t('titulacion.equivalenceLabel')}${displayCurve.equivalenceVolumes.length > 1 ? ` ${k + 1}` : ''}`,
        value: `${veq.toFixed(2)} mL · pH ${pHeq.toFixed(2)}`,
      });
    });
    return { traces: data, shapes: shapeList, annotations: annList, eqInfo: info };
  }, [displayCurve, showIndicator, showDerivative, indicator, vMax, thermoState.acidityRange, t]);

  const lastEq = displayCurve.equivalenceVolumes[displayCurve.equivalenceVolumes.length - 1];
  const lastIdx = lastEq !== undefined ? displayCurve.volumes.findIndex((v) => v >= lastEq) : -1;
  const pHLastEq = lastIdx > 0 ? displayCurve.pHs[lastIdx] : NaN;
  const indicatorOk = pHLastEq >= indicator.range[0] - 1 && pHLastEq <= indicator.range[1] + 1;
  const endpointPH = 0.5 * (indicator.range[0] + indicator.range[1]);
  const endpointMetric = acidBaseEndpointError({
    kind: analyteKind === 'equilibrium' ? (titrantIsAcid ? 'weak-base' : 'weak-acid') : 'strong-acid',
    endpointPH: analyteKind === 'equilibrium' || !titrantIsAcid ? endpointPH : thermoState.pKw - endpointPH,
    analyteConcentration: cAnalyte, analyteVolumeML: vAnalyte, titrantConcentration: cTitrant,
    pKa: effectivePKas[0], pKw: thermoState.pKw,
  });
  const backProtocol = backTitration({
    analyteMoles: cAnalyte * vAnalyte / 1000,
    primaryAddedMoles: cTitrant * primaryReagentVolume / 1000,
    backTitrantConcentration: cTitrant,
  });
  const observableParams = useMemo(() => ({
    volumesML: displayCurve.volumes,
    pHs: displayCurve.pHs,
    cAnalyte,
    vAnalyteML: vAnalyte,
    cTitrant,
    titrantIsAcid,
    analyteKind,
    z0: system.z0,
    pKas: effectivePKas,
    startIndex: validStart,
    productIndex: effectiveEndIndex,
    pKw: thermoState.pKw,
    productEpsilon,
    lambdaSpectator,
  }), [
    displayCurve.volumes, displayCurve.pHs, cAnalyte, vAnalyte, cTitrant, titrantIsAcid,
    analyteKind, system.z0, effectivePKas, validStart, effectiveEndIndex, thermoState.pKw, productEpsilon, lambdaSpectator,
  ]);
  const opticalTrace = useMemo<Data>(() => {
    const optical = acidBaseOpticalFromCurve(observableParams);
    return {
      x: optical.volumes, y: optical.absorbance, type: 'scatter', mode: 'lines', name: 'A',
      line: { width: 3, color: '#CC79A7' },
    };
  }, [observableParams]);
  const conductometricCurve = useMemo(
    () => acidBaseConductometricFromCurve(observableParams),
    [observableParams],
  );

  // ── Gran plot + quantitativity ───────────────────────────────────────────────
  const gran = useMemo(
    () => granPlot(displayCurve.volumes, displayCurve.pHs, vAnalyte, titrantIsAcid, thermoState.pKw, analyteKind === 'equilibrium'),
    [displayCurve.volumes, displayCurve.pHs, vAnalyte, titrantIsAcid, thermoState.pKw, analyteKind],
  );
  const granVeqDetected = useMemo(
    () => granVeq(displayCurve.volumes, displayCurve.pHs, vAnalyte, titrantIsAcid, thermoState.pKw, analyteKind === 'equilibrium'),
    [displayCurve.volumes, displayCurve.pHs, vAnalyte, titrantIsAcid, thermoState.pKw, analyteKind],
  );
  // q% = (1 − ε/Co)·100. The residual analyte-side species follows the
  // titration direction: H⁺ for acid titrant, OH⁻ for base titrant.
  const cAtEq = (cAnalyte * vAnalyte) / (vAnalyte + vEqLast);
  const epsLimiting = Number.isFinite(pHLastEq)
    ? equivalenceResidual(pHLastEq, titrantIsAcid, thermoState.pKw)
    : NaN;
  const qPercent = quantitativity(epsLimiting, cAtEq);
  const granErrorPct = Number.isFinite(granVeqDetected) && vEqLast > 0
    ? ((granVeqDetected - vEqLast) / vEqLast) * 100
    : NaN;
  const granHintKey = analyteKind === 'equilibrium'
    ? titrantIsAcid ? 'titulacion.granHintPrefixWeakAcidTitrant' : 'titulacion.granHintPrefixWeakBaseTitrant'
    : titrantIsAcid ? 'titulacion.granHintPrefixStrongAcidTitrant' : 'titulacion.granHintPrefixStrongBaseTitrant';

  const granTraces = useMemo<Data[]>(() => precipitationGran ? [{
    x: precipitationGran.map((point) => point.volume),
    y: precipitationGran.map((point) => point.transformed),
    type: 'scatter', mode: 'lines', name: t('titulacion.precipitationGranTrace'),
    line: { width: 3, color: '#0072B2' },
  }] : [
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
  ], [gran, precipitationGran, t]);

  const conditionalSweepTraces = useMemo<Data[]>(() => {
    if (!useConditionalAcidBase || !showConditionalSweep || system.pKas.length === 0) return [];
    const pXs = Array.from({ length: 281 }, (_, i) => (14 * i) / 280);
    return system.pKas.map((_, step) => ({
      x: pXs,
      y: pXs.map((pX) => conditionalPKas(
        system.pKas,
        normalizedLogBetas.map((logBeta) => 1 + Math.pow(10, logBeta - pX)),
      )[step]),
      type: 'scatter',
      mode: 'lines',
      name: `pKa′${system.pKas.length > 1 ? step + 1 : ''}`,
      line: { width: 3, color: ['#0072B2', '#D55E00', '#009E73', '#CC79A7'][step % 4] },
    }));
  }, [useConditionalAcidBase, showConditionalSweep, system.pKas, normalizedLogBetas]);

  const granShapes = useMemo<Partial<Shape>[]>(() => {
    const list: Partial<Shape>[] = displayCurve.equivalenceVolumes.map((veq) => ({
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
  }, [displayCurve.equivalenceVolumes, granVeqDetected]);

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
      <PanelShell title={t('titulacion.acidBaseTitle')} onReset={reset} moduleId="titulacion" guideId="titulacion-acidobase">
        <PanelSection title={t('acidoBase.systemSection')}>
          <Segmented
            options={[
              { value: 'base', label: t('titulacion.titrantBaseSeg') },
              { value: 'acid', label: t('titulacion.titrantAcidSeg') },
            ]}
            value={titrantIsAcid ? 'acid' : 'base'}
            onChange={(v) => {
              const nextIsAcid = v === 'acid';
              setTitrantIsAcid(nextIsAcid);
              if (system.pKas.length === 0) {
                setSystem(strongAcidSystem(nextIsAcid, lang));
              } else {
                setStartIndex(nextIsAcid ? system.pKas.length : 0);
                setEndIndex(nextIsAcid ? 0 : system.pKas.length);
              }
            }}
          />
          <ModelBadge
            model={t('titulacion.acidBaseModelBadge', {
              titrant: titrantIsAcid ? t('titulacion.titrantAcidWord') : t('titulacion.titrantBaseWord'),
              kind: systemKind,
            })}
            additions={[showIndicator && t('titulacion.addVisualIndicator'), showDerivative && t('mezclas.additionDerivative'), showPrecipCoupling && t('titulacion.addPrecipCoupling'), showBiphasic && t('titulacion.addBiphasic'), showResinCoupling && t('titulacion.addResinCoupling')]}
          />
          <AcidSystemEditor
            system={localizedSystem}
            onChange={(next) => {
              const shapeChanged = next.z0 !== system.z0 || next.pKas.length !== system.pKas.length;
              setSystem(next);
              if (shapeChanged) {
                setStartIndex(titrantIsAcid ? next.pKas.length : 0);
                setEndIndex(titrantIsAcid ? 0 : next.pKas.length);
                setLogStateAlphas(new Array(next.pKas.length + 1).fill(0));
                setStateLogBetas(new Array(next.pKas.length + 1).fill(0));
                setInitialEquivalents(titrantIsAcid ? next.pKas.length : 0);
              }
            }}
            includeStrong
            allowNoConstants
            showModel={false}
            allowAquaCations
          />
          {analyteKind === 'equilibrium' && (
            <div className="control-grid-2">
              <SelectControl
                label={t('titulacion.startingFormLabel')}
                value={String(validStart)}
                options={systemLabels(system).map((label, index) => ({ value: String(index), label }))}
                onChange={(value) => setStartIndex(Number(value))}
              />
              <SelectControl
                label={t('titulacion.targetFormLabel')}
                value={String(validEnd)}
                options={systemLabels(system).map((label, index) => ({ value: String(index), label }))
                  .filter((option) => (titrantIsAcid ? Number(option.value) < validStart : Number(option.value) > validStart))}
                onChange={(value) => setEndIndex(Number(value))}
              />
            </div>
          )}
          {analyteKind === 'equilibrium' && !equilibriumDirectionValid && (
            <p className="badge warn">{t('titulacion.impossibleTitrationDirection')}</p>
          )}
          {analyteKind === 'equilibrium' && equilibriumDirectionValid && nProtons === 0 && (
            <p className="badge warn">{t('titulacion.noFormalReaction')}</p>
          )}
          {analyteKind === 'equilibrium' && (
            <Disclosure title={t('titulacion.initialCompositionDisclosure')}>
              <Toggle
                label={t('titulacion.useInitialMixture')}
                checked={useInitialMixture}
                onChange={(checked) => {
                  setUseInitialMixture(checked);
                  if (checked) setInitialEquivalents(validStart);
                }}
              />
              {useInitialMixture && (
                <Slider
                  label={t('titulacion.initialEquivalentsLabel')}
                  value={validInitialEquivalents}
                  min={0}
                  max={system.pKas.length}
                  step={0.01}
                  onChange={setInitialEquivalents}
                  decimals={2}
                />
              )}
              <Toggle
                label={t('titulacion.useConditionalPKas')}
                checked={useConditionalAcidBase}
                onChange={setUseConditionalAcidBase}
              />
              {useConditionalAcidBase && (
                <Toggle label={t('titulacion.sweepConditionalPKas')} checked={showConditionalSweep} onChange={setShowConditionalSweep} />
              )}
              {useConditionalAcidBase && showConditionalSweep && (
                <Slider label="pX" value={conditionalPX} min={0} max={14} step={0.1} onChange={setConditionalPX} decimals={1} />
              )}
              {useConditionalAcidBase && systemLabels(system).map((species, index) => (
                <Slider
                  key={`${species}-${index}`}
                  label={t(showConditionalSweep ? 'titulacion.logBetaStateLabel' : 'titulacion.logAlphaStateLabel', { species })}
                  value={showConditionalSweep ? normalizedLogBetas[index] : normalizedLogAlphas[index]}
                  min={0}
                  max={20}
                  step={0.1}
                  onChange={(value) => showConditionalSweep
                    ? setStateLogBetas(normalizedLogBetas.map((current, i) => i === index ? value : current))
                    : setLogStateAlphas(normalizedLogAlphas.map((current, i) => i === index ? value : current))}
                  decimals={1}
                />
              ))}
              {useConditionalAcidBase && (
                <p className="hint">pKa′: {effectivePKas.map((value) => value.toFixed(2)).join(' · ')}</p>
              )}
            </Disclosure>
          )}
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')}>
          <SelectControl
            label={t('titulacion.solventLabel')}
            value={solventId}
            options={[
              { value: 'water', label: t('titulacion.solventWater') },
              { value: 'dmf', label: 'DMF' },
              { value: 'ethanol', label: t('titulacion.solventEthanol') },
            ]}
            onChange={(value) => setSolventId(value as 'water' | 'dmf' | 'ethanol')}
          />
          {solventId === 'water' && <Slider label={t('titulacion.temperatureLabel')} value={temperatureC} min={10} max={100} step={5} onChange={setTemperatureC} unit="°C" decimals={0} />}
          <p className="hint">{t('titulacion.solventStateHint', { pkw: thermoState.pKw.toFixed(3), lionium: thermoState.lioniumLabel, lyate: thermoState.lyateLabel })}</p>
          <ConcSlider label={t('titulacion.analyteConcLabel')} value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
          <Slider label={t('titulacion.sampleVolumeLabel')} value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfLabel', { name: titrantName })} value={cTitrant} onChange={setCTitrant} min={-4} max={0} />
          <Disclosure title={t('titulacion.coupledMediaTitle')}>
            <Segmented
              ariaLabel={t('titulacion.coupledMediaTitle')}
              options={[
                { value: 'none', label: t('titulacion.couplingMediumNone') },
                { value: 'precip', label: t('titulacion.couplingMediumPrecip') },
                { value: 'biphasic', label: t('titulacion.couplingMediumBiphasic') },
                { value: 'resin', label: t('titulacion.couplingMediumResin') },
              ]}
              value={couplingMedium}
              onChange={(value) => setCouplingMedium(value as 'none' | 'precip' | 'biphasic' | 'resin')}
            />
            {showPrecipCoupling && (
              <div className="mask-section">
                <Slider label={t('titulacion.pKspShort')} value={coupledPKsp} min={0} max={40} step={0.1} onChange={setCoupledPKsp} decimals={1} />
                <Slider label="pM" value={coupledPM} min={-2} max={20} step={0.1} onChange={setCoupledPM} decimals={1} />
                <Slider label={t('titulacion.hydroxideStoichLabel')} value={granHydroxideStoich} min={1} max={6} step={1} onChange={setGranHydroxideStoich} decimals={0} />
              </div>
            )}
            {showBiphasic && (
              <div className="mask-section">
                <Slider label="log KD" value={Math.log10(organicKD)} min={-2} max={8} step={0.1} onChange={(value) => setOrganicKD(Math.pow(10, value))} decimals={1} />
                <Slider label="Vorg" value={organicVolume} min={0} max={100} step={1} onChange={setOrganicVolume} unit="mL" decimals={0} />
              </div>
            )}
            {showResinCoupling && (
              <div className="mask-section">
                <ConcSlider label={t('titulacion.resinCapacityLabel')} value={resinCapacity} onChange={setResinCapacity} min={-6} max={-1} />
                <Slider label="log Kres" value={Math.log10(resinKBinding)} min={-2} max={12} step={0.1} onChange={(value) => setResinKBinding(Math.pow(10, value))} decimals={1} />
              </div>
            )}
            {!couplingEligible && couplingMedium !== 'none' && <p className="hint">{t('titulacion.couplingEligibilityHint')}</p>}
          </Disclosure>
        </PanelSection>
        <PanelSection title={t('titulacion.detectionSection')}>
          <SelectControl
            label={t('titulacion.visualIndicatorLabel')}
            value={indicatorId}
            options={INDICATORS.map((i) => ({
              value: i.id,
              label: `${INDICATOR_NAME_KEYS[i.id] ? t(INDICATOR_NAME_KEYS[i.id]) : i.name} (${i.range[0]}–${i.range[1]})`,
            }))}
            onChange={setIndicatorId}
          />
          <Toggle label={t('titulacion.showTransitionRangeToggle')} checked={showIndicator} onChange={setShowIndicator} />
          <Toggle label={t('titulacion.showDerivativeDpHToggle')} checked={showDerivative} onChange={setShowDerivative} />
          <Toggle label={t('titulacion.alternativeSignalsToggle')} checked={showAlternativeSignals} onChange={setShowAlternativeSignals} />
          {showAlternativeSignals && (
            <>
              <Slider label={t('titulacion.productEpsilon')} value={productEpsilon} min={0} max={1000} step={10} decimals={0} onChange={setProductEpsilon} />
              <Slider label={t('titulacion.lambdaSpectator')} value={lambdaSpectator} min={10} max={400} step={5} decimals={0} onChange={setLambdaSpectator} />
            </>
          )}
          <Toggle label={t('titulacion.backProtocolToggle')} checked={showBackProtocol} onChange={setShowBackProtocol} />
          {showBackProtocol && <Slider label={t('titulacion.primaryReagentVolume')} value={primaryReagentVolume} min={0} max={100} step={0.5} decimals={1} unit="mL" onChange={setPrimaryReagentVolume} />}
          <details className="section-collapse">
            <summary className="section-collapse-title">{t('acidoBase.activityCorrection')}<span className="ui-chevron" aria-hidden /></summary>
            <Slider label={t('acidoBase.ionicStrengthLabel')} helpId="ionicStrength" value={ionicStrength} min={0} max={0.5} step={0.01} onChange={setIonicStrength} decimals={2} />
            <div className="control-input">
              <Segmented
                options={gammaModelsT}
                value={gammaModel}
                onChange={(v) => setGammaModel(isValidGammaModel(v) ? v : 'dh')}
              />
            </div>
            <p className="hint">{t('titulacion.activityHint')}</p>
          </details>
        </PanelSection>
        <PanelSection title={t('complejos.resultSection')}>
          {eqInfo.length > 0 && <ResultCard items={eqInfo} />}
          {showIndicator && Number.isFinite(pHLastEq) && (
            <p className={indicatorOk ? 'badge ok' : 'badge warn'}>
              {indicatorOk
                ? t('titulacion.indicatorOkMsg', { name: indicator.name })
                : t('titulacion.indicatorFarMsg', { name: indicator.name, ph: pHLastEq.toFixed(1) })}
            </p>
          )}
          {showIndicator && <ResultCard items={[
            { label: t('titulacion.endpointVolume'), value: `${endpointMetric.volumeTP.toFixed(3)} mL` },
            { label: t('titulacion.absoluteIndicatorError'), value: endpointMetric.absoluteErrorMoles.toExponential(3) + ' mol' },
            { label: t('titulacion.relativeIndicatorError'), value: `${endpointMetric.relativeErrorPercent.toFixed(5)} %` },
          ]} />}
          {showBackProtocol && <ResultCard items={[
            { label: t('titulacion.primaryExcess'), value: `${(1000 * backProtocol.primaryExcessMoles).toFixed(3)} mmol` },
            { label: t('titulacion.backTitrantVolume'), value: `${backProtocol.backVolumeML.toFixed(3)} mL` },
            { label: t('titulacion.recoveredAnalyte'), value: `${(1000 * backProtocol.recoveredAnalyteMoles).toFixed(3)} mmol` },
          ]} />}
          {solidBetaAtEq !== null && <ResultCard items={[{
            label: t('titulacion.solidBufferCapacityLabel'),
            value: solidBetaAtEq.toExponential(3),
          }, ...(precipitationGranFit ? [{
            label: t('titulacion.precipitationGranInterceptLabel'),
            value: `${precipitationGranFit.xIntercept.toFixed(3)} mL · R² ${precipitationGranFit.r2.toFixed(5)}`,
          }] : [])]} />}
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
                  yRange={thermoState.acidityRange}
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
                <div className="chart-with-caption">
                  <div className="chart-with-caption-plot">
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
                  <p className="hint chart-caption">
                    {t(granHintKey)}<em>{t('titulacion.granHintBeforeEm')}</em>{t('titulacion.granHintMid')}
                    <sub>eq</sub> = {Number.isFinite(granVeqDetected) ? `${granVeqDetected.toFixed(2)} mL` : '—'}.
                  </p>
                </div>
              ),
            },
            ...(conditionalSweepTraces.length > 0 ? [{
              id: 'pka-conditional',
              label: t('titulacion.conditionalPKaTab'),
              node: (
                <Chart
                  data={conditionalSweepTraces}
                  xTitle="pX"
                  yTitle="pKa′"
                  xRange={[0, 14]}
                  shapes={[{
                    type: 'line', x0: conditionalPX, x1: conditionalPX, y0: 0, y1: 1,
                    yref: 'paper', line: { color: '#7F8C8D', width: 1.5, dash: 'dash' },
                  }]}
                  exportName="equilibria-titulacion-pka-condicional"
                  exportMetadata={exportMetadata}
                />
              ),
            }] : []),
            ...(showAlternativeSignals ? [
              {
                id: 'optical', label: t('titulacion.absorbanceTab'),
                node: <Chart data={[opticalTrace]} xTitle={t('mezclas.volumeAddedLabel', { titrant: titrantName })} yTitle="A" xRange={[0, vMax]} exportName="equilibria-titulacion-absorbancia" exportMetadata={exportMetadata} />,
              },
              {
                id: 'conductivity', label: t('titulacion.conductivityTab'),
                node: <Chart data={[{ x: conductometricCurve.volumes, y: conductometricCurve.conductivity, type: 'scatter', mode: 'lines', name: 'κ', line: { width: 3, color: '#009E73' } }]} xTitle={t('mezclas.volumeAddedLabel', { titrant: titrantName })} yTitle="κ" xRange={[0, vMax]} exportName="equilibria-titulacion-conductividad" exportMetadata={exportMetadata} />,
              },
            ] : []),
          ]}
        />
        <ResultCardRow items={[
          { label: t('titulacion.pHAtEquivalence'), value: Number.isFinite(pHLastEq) ? pHLastEq.toFixed(2) : '—', accent: true },
          { label: t('titulacion.granVolumeLabel'), value: Number.isFinite(granVeqDetected) ? `${granVeqDetected.toFixed(2)} mL` : '—', helpId: 'gran' },
          { label: t('titulacion.qQuantitativity'), value: Number.isFinite(qPercent) ? `${qPercent >= 99.95 ? qPercent.toFixed(3) : qPercent.toFixed(1)} %` : '—' },
          ...(Number.isFinite(granErrorPct)
            ? [{ label: t('titulacion.pctErrorPE'), value: `${granErrorPct.toFixed(2)} %` }]
            : []),
          ...(showIndicator ? [{ label: t('titulacion.relativeIndicatorError'), value: `${endpointMetric.relativeErrorPercent.toFixed(4)} %` }] : []),
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
  const [showSecondMetal, setShowSecondMetal] = useState(false);
  const [secondLabel, setSecondLabel] = useState('Mg²⁺');
  const [secondConc, setSecondConc] = useState(0.01);
  const [secondLogKCond, setSecondLogKCond] = useState(8.2);
  const [showSensor, setShowSensor] = useState(false);
  const [sensorKind, setSensorKind] = useState<'metal' | 'redox-indicator'>('metal');
  const [sensorE0, setSensorE0] = useState(0.3);
  const [sensorN, setSensorN] = useState(2);
  const [sensorLogKOx, setSensorLogKOx] = useState(8);
  const [sensorLogKRed, setSensorLogKRed] = useState(2);
  const [showAlternativeSignals, setShowAlternativeSignals] = useState(false);
  const [productEpsilon, setProductEpsilon] = useState(100);
  const [lambdaSpectator, setLambdaSpectator] = useState(50);
  const [showIndicatorError, setShowIndicatorError] = useState(false);

  useShareEffect('titulacion', {
    mode, metalId, label, logKf, logBetasOH, side, edtaInFlask, pH, cFlask, vFlask, cBuret, axis, traceY,
    showSecondMetal, secondLabel, secondConc, secondLogKCond, showSensor, sensorKind, sensorE0, sensorN,
    sensorLogKOx, sensorLogKRed, showAlternativeSignals, productEpsilon, lambdaSpectator, showIndicatorError,
  }, (s) => {
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
    if (s.showSecondMetal !== undefined) setShowSecondMetal(s.showSecondMetal);
    if (typeof s.secondLabel === 'string') setSecondLabel(s.secondLabel);
    if (typeof s.secondConc === 'number') setSecondConc(s.secondConc);
    if (typeof s.secondLogKCond === 'number') setSecondLogKCond(s.secondLogKCond);
    if (s.showSensor !== undefined) setShowSensor(s.showSensor);
    if (s.sensorKind === 'metal' || s.sensorKind === 'redox-indicator') setSensorKind(s.sensorKind);
    if (typeof s.sensorE0 === 'number') setSensorE0(s.sensorE0);
    if (typeof s.sensorN === 'number') setSensorN(s.sensorN);
    if (typeof s.sensorLogKOx === 'number') setSensorLogKOx(s.sensorLogKOx);
    if (typeof s.sensorLogKRed === 'number') setSensorLogKRed(s.sensorLogKRed);
    if (s.showAlternativeSignals !== undefined) setShowAlternativeSignals(s.showAlternativeSignals);
    if (typeof s.productEpsilon === 'number') setProductEpsilon(s.productEpsilon);
    if (typeof s.lambdaSpectator === 'number') setLambdaSpectator(s.lambdaSpectator);
    if (s.showIndicatorError !== undefined) setShowIndicatorError(s.showIndicatorError);
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
    setShowSecondMetal(false); setSecondLabel('Mg²⁺'); setSecondConc(0.01); setSecondLogKCond(8.2);
    setShowSensor(false); setSensorKind('metal'); setSensorE0(0.3); setSensorN(2);
    setSensorLogKOx(8); setSensorLogKRed(2);
    setShowAlternativeSignals(false); setProductEpsilon(100); setLambdaSpectator(50);
    setShowIndicatorError(false);
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

  const vMax = (((cFlask + (showSecondMetal ? secondConc : 0)) * vFlask) / cBuret) * 1.8;
  const curve = useMemo(
    () => edtaTitrationCurve({
      logKf, pH, cMetal: cFlask, vMetal: vFlask, cEdta: cBuret, vMax, edtaInFlask,
      sideEditor: { ...side, showOH: side.showOH || logBetasOH.length > 0, logBetasOH: side.showOH ? side.logBetasOH : logBetasOH },
      axis,
      xMax: 2,
    }),
    [logKf, pH, logBetasOH, side, cFlask, vFlask, cBuret, vMax, edtaInFlask, axis],
  );
  const competitiveCurve = useMemo(() => showSecondMetal
    ? competitiveEdtaTitrationCurve({
        metals: [
          { label, c: cFlask, logKfCond: curve.logKfCond },
          { label: secondLabel, c: secondConc, logKfCond: secondLogKCond },
        ],
        vSample: vFlask,
        cEdta: cBuret,
        vMax,
      })
    : null,
  [showSecondMetal, label, cFlask, curve.logKfCond, secondLabel, secondConc, secondLogKCond, vFlask, cBuret, vMax]);

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

  const activeAxis = showSecondMetal ? 'volume' : axis;
  const xData = competitiveCurve?.volumes ?? (activeAxis === 'x' ? curve.xs : curve.volumes);
  const xTitle = activeAxis === 'x' ? 'x = n_Y / n_M⁰' : t('mezclas.volumeAddedLabel', { titrant: edtaInFlask ? label : 'EDTA' });
  const eqXs = useMemo(
    () => competitiveCurve?.equivalenceVolumes ?? [activeAxis === 'x' ? curve.xEq : curve.vEq],
    [competitiveCurve, activeAxis, curve.xEq, curve.vEq],
  );
  const displayVolumes = competitiveCurve?.volumes ?? curve.volumes;
  const displayPMs = competitiveCurve?.pMetals[0] ?? curve.pMs;
  const displayPYs = competitiveCurve?.pY ?? curve.pYs;
  const metalCharge = useMemo(() => {
    const preset = EDTA_METAL_PRESETS.find((p) => p.id === metalId);
    return preset?.group === 'M³⁺' ? 3 : 2;
  }, [metalId]);
  const edtaObservableParams = useMemo(() => ({
    volumesML: displayVolumes,
    pMs: displayPMs,
    pYs: displayPYs,
    cMetal: cFlask,
    vMetalML: vFlask,
    metalCharge,
    productEpsilon,
    lambdaSpectator,
  }), [displayVolumes, displayPMs, displayPYs, cFlask, vFlask, metalCharge, productEpsilon, lambdaSpectator]);
  const edtaOpticalTrace = useMemo<Data>(() => {
    const optical = complexometricOpticalFromCurve(edtaObservableParams);
    return {
      x: optical.volumes, y: optical.absorbance, type: 'scatter', mode: 'lines', name: 'A',
      line: { width: 3, color: '#CC79A7' },
    };
  }, [edtaObservableParams]);
  const edtaConductometricCurve = useMemo(
    () => complexometricConductometricFromCurve(edtaObservableParams),
    [edtaObservableParams],
  );
  const edtaIndicatorEndpoint = useMemo(() => {
    if (showSecondMetal || activeAxis === 'x') return null;
    const candidates = METAL_INDICATORS.flatMap((ind) => {
      const entry = ind.metals.find((metal) => metal.metalId === metalId);
      if (!entry) return [];
      const logKprimeMIn = entry.logKMIn - Math.log10(alphaH(ind.pKas, pH)) - Math.log10(alphaOH(logBetasOH, pH));
      const deltaLogK = logKMY_pH - logKprimeMIn;
      const badge = logKprimeMIn < 4 ? 'weak' : deltaLogK < 2 ? 'blocked' : deltaLogK < 5 ? 'marginal' : 'ok';
      return badge === 'blocked' || badge === 'weak' ? [] : [{ ind, deltaLogK }];
    }).sort((a, b) => b.deltaLogK - a.deltaLogK);
    const best = candidates[0];
    if (!best) return null;
    const atTP = edtaAtFraction({
      logKf, pH, cMetal: cFlask,
      sideEditor: { ...side, showOH: side.showOH || logBetasOH.length > 0, logBetasOH: side.showOH ? side.logBetasOH : logBetasOH },
    }, complexometricIndicatorFraction(best.deltaLogK));
    return {
      indicator: best.ind,
      metric: complexometricEndpointError({
        volumes: displayVolumes,
        pMs: displayPMs,
        indicatorPM: atTP.pM,
        equivalenceVolume: curve.vEq,
        titrantConcentration: cBuret,
        analyteMoles: cFlask * vFlask / 1000,
      }),
    };
  }, [
    showSecondMetal, activeAxis, metalId, pH, logBetasOH, logKMY_pH, logKf, cFlask, side,
    displayVolumes, displayPMs, curve.vEq, cBuret, vFlask,
  ]);

  const titTraces = useMemo<Data[]>(() => {
    if (competitiveCurve) {
      const data: Data[] = competitiveCurve.pMetals.map((values, index) => ({
        x: competitiveCurve.volumes,
        y: values,
        type: 'scatter',
        mode: 'lines',
        name: `p${index === 0 ? label : secondLabel}′`,
        line: { width: index === 0 ? 3.5 : 3, color: index === 0 ? '#0072B2' : '#D55E00' },
        hovertemplate: `V = %{x:.2f} mL<br>pM′ = %{y:.2f}<extra></extra>`,
      }));
      data.push({
        x: competitiveCurve.volumes,
        y: competitiveCurve.pY,
        type: 'scatter',
        mode: 'lines',
        name: "pY′",
        line: { width: 2, color: '#009E73', dash: 'dot' },
      });
      return data;
    }
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
  }, [competitiveCurve, xData, curve, traceY, axis, label, secondLabel]);

  const titShapes = useMemo<Partial<Shape>[]>(() => eqXs.map((eqX) => ({
    type: 'line', x0: eqX, x1: eqX, y0: 0,
    y1: competitiveCurve
      ? Math.max(...competitiveCurve.pMetals.flat(), ...competitiveCurve.pY) + 1
      : Math.max(...curve.pMs, ...curve.pYs) + 1,
    line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
  })), [curve, eqXs, competitiveCurve]);

  const sensorSignal = useMemo(() => complexometricSensorCurve(
    competitiveCurve?.pMetals[0] ?? curve.pMs,
    competitiveCurve?.pY ?? curve.pYs,
    sensorKind === 'metal'
      ? { kind: 'metal', E0: sensorE0, n: sensorN }
      : { kind: 'redox-indicator', E0: sensorE0, n: sensorN, logKfOx: sensorLogKOx, logKfRed: sensorLogKRed },
  ), [competitiveCurve, curve.pMs, curve.pYs, sensorKind, sensorE0, sensorN, sensorLogKOx, sensorLogKRed]);

  const aY = alphaY4(pH);
  const feasible = curve.logKfCond >= 8;
  const exactAssociation = useMemo(() => solveReactionExtent({
    logK: curve.logKfCond,
    reactants: [{ initial: cFlask, stoich: 1 }, { initial: cFlask, stoich: 1 }],
    products: [{ initial: 0, stoich: 1 }],
  }), [curve.logKfCond, cFlask]);
  const target99LogK = equimolarAssociationLogKForTarget(cFlask, 0.99);
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
          yTitle={showSecondMetal ? 'pM′ / pY′' : traceY === 'pY' ? "pY′ (−log[Y′])" : traceY === 'both' ? 'pM′ / pY′' : 'pM′ (−log[M′])'}
          xRange={[0, activeAxis === 'x' ? 2 : vMax]}
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
    ...(showSensor ? [{
      id: 'sensor',
      label: t('titulacion.sensorSignalTab'),
      node: (
        <Chart
          data={[{
            x: competitiveCurve?.volumes ?? curve.volumes,
            y: sensorSignal,
            type: 'scatter',
            mode: 'lines',
            name: 'E',
            line: { width: 3, color: '#CC79A7' },
          }]}
          xTitle={t('mezclas.volumeAddedLabel', { titrant: 'EDTA' })}
          yTitle="E (V)"
          xRange={[0, vMax]}
          shapes={eqXs.map((value) => ({
            type: 'line', x0: value, x1: value, y0: Math.min(...sensorSignal), y1: Math.max(...sensorSignal),
            line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
          }))}
          exportName="equilibria-titulacion-edta-sensor"
          exportMetadata={exportMetadata}
        />
      ),
    }] : []),
    ...(showAlternativeSignals ? [
      {
        id: 'optical', label: t('titulacion.absorbanceTab'),
        node: <Chart data={[edtaOpticalTrace]} xTitle={t('mezclas.volumeAddedLabel', { titrant: buretName })} yTitle="A" xRange={[0, vMax]} exportName="equilibria-titulacion-edta-absorbancia" exportMetadata={exportMetadata} />,
      },
      {
        id: 'conductivity', label: t('titulacion.conductivityTab'),
        node: <Chart data={[{ x: edtaConductometricCurve.volumes, y: edtaConductometricCurve.conductivity, type: 'scatter', mode: 'lines', name: 'κ', line: { width: 3, color: '#009E73' } }]} xTitle={t('mezclas.volumeAddedLabel', { titrant: buretName })} yTitle="κ" xRange={[0, vMax]} exportName="equilibria-titulacion-edta-conductividad" exportMetadata={exportMetadata} />,
      },
    ] : []),
  ], [titTraces, titShapes, xTitle, vMax, activeAxis, traceY, showSecondMetal, metalId, logKf, logBetasOH, pH, exportMetadata, t, showSensor, competitiveCurve, curve.volumes, sensorSignal, eqXs, showAlternativeSignals, edtaOpticalTrace, edtaConductometricCurve, buretName]);

  return (
    <>
      <PanelShell title={t('titulacion.edtaTitle')} onReset={reset} moduleId="titulacion" guideId="titulacion-edta">
        <SystemPresetPicker
          items={SYSTEM_PRESETS.map((p) => ({ id: p.id, name: p.name, group: p.group, detail: p.detail }))}
          onSelect={applyFullSystem}
        />
        <PanelSection title={t('acidoBase.systemSection')}>
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
            additions={[logBetasOH.length > 0 && t('titulacion.addHydrolysisIndicatorSelection'), showSecondMetal && t('titulacion.addCompetitiveMetal'), showSensor && t('titulacion.addPotentiometricSignal')]}
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
          <Toggle
            label={t('titulacion.competitiveMetalToggle')}
            checked={showSecondMetal}
            onChange={(checked) => {
              setShowSecondMetal(checked);
              if (checked) { setEdtaInFlask(false); setAxis('volume'); }
            }}
          />
          {showSecondMetal && (
            <Disclosure title={t('titulacion.secondMetalDisclosure')} defaultOpen>
              <LabelField label={t('titulacion.secondMetalLabel')} value={secondLabel} onChange={setSecondLabel} />
              <ConcSlider label={t('titulacion.secondMetalConc')} value={secondConc} onChange={setSecondConc} min={-4} max={-1} />
              <Slider label={t('titulacion.secondMetalLogKCond')} value={secondLogKCond} min={1} max={28} step={0.1} onChange={setSecondLogKCond} decimals={1} />
            </Disclosure>
          )}
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')}>
          <Slider label={t('titulacion.bufferPHLabel')} value={pH} min={1} max={13} step={0.1} onChange={setPH} decimals={1} />
          <ConcSlider label={t('titulacion.concInFlaskLabel', { name: flaskName })} value={cFlask} onChange={setCFlask} min={-4} max={-1} />
          <Slider label={t('titulacion.flaskVolumeLabel')} value={vFlask} min={5} max={100} step={1} onChange={setVFlask} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfTitrantLabel', { name: buretName })} value={cBuret} onChange={setCBuret} min={-4} max={-1} />
        </PanelSection>
        <PanelSection title={t('titulacion.chartSection')}>
          <div className="control">
            <div className="control-header"><span className="control-label">{t('titulacion.horizontalAxisLabel')}</span></div>
            <div className="segmented control-input">
              <button type="button" className={axis === 'volume' ? 'seg-btn active' : 'seg-btn'} onClick={() => setAxis('volume')}>{t('titulacion.volumeAxisOption')}</button>
              <button type="button" className={axis === 'x' ? 'seg-btn active' : 'seg-btn'} onClick={() => setAxis('x')}>{t('titulacion.progressAxisOption')}</button>
            </div>
          </div>
          <div className="control">
            <div className="control-header"><span className="control-label">{t('titulacion.tracesLabel')}</span></div>
            <div className="segmented control-input">
              {(['pM', 'pY', 'both'] as const).map((tr) => (
                <button type="button" key={tr} className={traceY === tr ? 'seg-btn active' : 'seg-btn'} onClick={() => setTraceY(tr)}>
                  {tr === 'both' ? 'pM′ + pY′' : `${tr}′`}
                </button>
              ))}
            </div>
          </div>
          <Toggle label={t('titulacion.alternativeSignalsToggle')} checked={showAlternativeSignals} onChange={setShowAlternativeSignals} />
          {showAlternativeSignals && (
            <>
              <Slider label={t('titulacion.productEpsilon')} value={productEpsilon} min={0} max={1000} step={10} decimals={0} onChange={setProductEpsilon} />
              <Slider label={t('titulacion.lambdaSpectator')} value={lambdaSpectator} min={10} max={400} step={5} decimals={0} onChange={setLambdaSpectator} />
            </>
          )}
          <Toggle label={t('titulacion.indicatorEndpointToggle')} checked={showIndicatorError} onChange={setShowIndicatorError} />
        </PanelSection>
        <Disclosure title={t('titulacion.sideReactionsDisclosure')}>
          <SideReactionEditor state={side} onChange={setSide} showLigandPKas={false} />
        </Disclosure>
        <Disclosure title={t('titulacion.potentiometricSensorDisclosure')}>
          <Toggle label={t('titulacion.showSensorSignal')} checked={showSensor} onChange={setShowSensor} />
          {showSensor && (
            <>
              <Segmented
                options={[
                  { value: 'metal', label: t('titulacion.metalElectrodeOption') },
                  { value: 'redox-indicator', label: t('titulacion.redoxIndicatorOption') },
                ]}
                value={sensorKind}
                onChange={(value) => setSensorKind(value as 'metal' | 'redox-indicator')}
              />
              <Slider label="E°" value={sensorE0} min={-1} max={2} step={0.01} onChange={setSensorE0} unit="V" decimals={2} />
              <NumberSegmented label="n" value={sensorN} options={[1, 2, 3, 4]} onChange={setSensorN} />
              {sensorKind === 'redox-indicator' && (
                <>
                  <Slider label={t('titulacion.logKfOxLabel')} value={sensorLogKOx} min={0} max={20} step={0.1} onChange={setSensorLogKOx} decimals={1} />
                  <Slider label={t('titulacion.logKfRedLabel')} value={sensorLogKRed} min={0} max={20} step={0.1} onChange={setSensorLogKRed} decimals={1} />
                </>
              )}
            </>
          )}
        </Disclosure>
        <PanelSection title={t('complejos.resultSection')}>
          <ResultCard items={[
            { label: t('titulacion.alphaYAtPHLabel'), value: formatSci(1 / aY, 3) },
            { label: t('titulacion.condLogKfLabel'), value: curve.logKfCond.toFixed(2) },
            { label: showSecondMetal ? t('titulacion.successiveEquivalences') : axis === 'x' ? t('titulacion.xEqLabel') : t('titulacion.volEqLabel'), value: showSecondMetal ? eqXs.map((value) => value.toFixed(2)).join(' / ') + ' mL' : axis === 'x' ? `${curve.xEq.toFixed(2)}` : `${curve.vEq.toFixed(2)} mL` },
            { label: t('titulacion.pMAt50'), value: at50.pM.toFixed(2) },
            { label: t('titulacion.pYAt50'), value: at50.pY.toFixed(2) },
            { label: t('titulacion.pMAt150'), value: at150.pM.toFixed(2) },
            { label: t('titulacion.exactStoichQ'), value: `${(100 * exactAssociation.limitingConversion).toFixed(4)} %` },
            { label: t('titulacion.logKFor99'), value: target99LogK.toFixed(4) },
          ]} />
          <p className={feasible ? 'badge ok' : 'badge warn'}>
            {feasible ? t('titulacion.edtaFeasibleMsg') : t('titulacion.edtaNotFeasibleMsg')}
          </p>
          {showIndicatorError && edtaIndicatorEndpoint && (
            <ResultCard items={[
              { label: t('titulacion.indicatorUsedLabel', { name: edtaIndicatorEndpoint.indicator.abbrev }), value: '' },
              { label: t('titulacion.endpointVolume'), value: `${edtaIndicatorEndpoint.metric.volumeTP.toFixed(3)} mL` },
              { label: t('titulacion.relativeIndicatorError'), value: `${edtaIndicatorEndpoint.metric.relativeErrorPercent.toFixed(5)} %` },
            ]} />
          )}
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
  const [showSecondAnalyte, setShowSecondAnalyte] = useState(false);
  const [secondAnalyte, setSecondAnalyte] = useState<CoupleState>(coupleFromPreset('sn'));
  const [secondAnalyteConc, setSecondAnalyteConc] = useState(0.05);
  const [showConditionalStates, setShowConditionalStates] = useState(false);
  const [oxPolyLogs, setOxPolyLogs] = useState<number[]>([]);
  const [oxPolySlopes, setOxPolySlopes] = useState<number[]>([]);
  const [redPolyLogs, setRedPolyLogs] = useState([11, 15]);
  const [redPolySlopes, setRedPolySlopes] = useState([-1, -2]);
  const [showStateNetwork, setShowStateNetwork] = useState(false);
  const [networkFinalLabel, setNetworkFinalLabel] = useState('A(ox II)');
  const [networkE02, setNetworkE02] = useState(1.0);
  const [networkN2, setNetworkN2] = useState(1);
  const [showPolynuclear, setShowPolynuclear] = useState(false);
  const [analyteUnits, setAnalyteUnits] = useState(1);
  const [polynuclearXeq, setPolynuclearXeq] = useState(0.01);
  const [showAlternativeSignals, setShowAlternativeSignals] = useState(false);
  const [productEpsilon, setProductEpsilon] = useState(100);
  const [lambdaSpectator, setLambdaSpectator] = useState(50);
  const [showIndicatorError, setShowIndicatorError] = useState(false);
  const [indicatorE, setIndicatorE] = useState(0.85);

  useShareEffect('titulacion', {
    mode, analyte, titrant, direction, pH, cAnalyte, vAnalyte, cTitrant, usePe, showDerivative,
    showSecondAnalyte, secondAnalyte, secondAnalyteConc, showConditionalStates,
    oxPolyLogs, oxPolySlopes, redPolyLogs, redPolySlopes,
    showStateNetwork, networkFinalLabel, networkE02, networkN2, showPolynuclear, analyteUnits, polynuclearXeq,
    showAlternativeSignals, productEpsilon, lambdaSpectator, showIndicatorError, indicatorE,
  }, (s) => {
    if (s.analyte) setAnalyte(s.analyte);
    if (s.titrant) setTitrant(s.titrant);
    if (s.direction === 'oxidante' || s.direction === 'reductor') setDirection(s.direction);
    if (s.pH !== undefined) setPH(s.pH);
    if (s.cAnalyte !== undefined) setCAnalyte(s.cAnalyte);
    if (s.vAnalyte !== undefined) setVAnalyte(s.vAnalyte);
    if (s.cTitrant !== undefined) setCTitrant(s.cTitrant);
    if (s.usePe !== undefined) setUsePe(s.usePe);
    if (s.showDerivative !== undefined) setShowDerivative(s.showDerivative);
    if (s.showSecondAnalyte !== undefined) setShowSecondAnalyte(s.showSecondAnalyte);
    if (s.secondAnalyte) setSecondAnalyte(s.secondAnalyte);
    if (typeof s.secondAnalyteConc === 'number') setSecondAnalyteConc(s.secondAnalyteConc);
    if (s.showConditionalStates !== undefined) setShowConditionalStates(Boolean(s.showConditionalStates));
    if (Array.isArray(s.oxPolyLogs)) setOxPolyLogs(s.oxPolyLogs as number[]);
    if (Array.isArray(s.oxPolySlopes)) setOxPolySlopes(s.oxPolySlopes as number[]);
    if (Array.isArray(s.redPolyLogs)) setRedPolyLogs(s.redPolyLogs as number[]);
    if (Array.isArray(s.redPolySlopes)) setRedPolySlopes(s.redPolySlopes as number[]);
    if (s.showStateNetwork !== undefined) setShowStateNetwork(Boolean(s.showStateNetwork));
    if (typeof s.networkFinalLabel === 'string') setNetworkFinalLabel(s.networkFinalLabel);
    if (typeof s.networkE02 === 'number') setNetworkE02(s.networkE02);
    if (typeof s.networkN2 === 'number') setNetworkN2(s.networkN2);
    if (s.showPolynuclear !== undefined) setShowPolynuclear(s.showPolynuclear);
    if (typeof s.analyteUnits === 'number') setAnalyteUnits(s.analyteUnits);
    if (typeof s.polynuclearXeq === 'number') setPolynuclearXeq(s.polynuclearXeq);
    if (s.showAlternativeSignals !== undefined) setShowAlternativeSignals(s.showAlternativeSignals);
    if (typeof s.productEpsilon === 'number') setProductEpsilon(s.productEpsilon);
    if (typeof s.lambdaSpectator === 'number') setLambdaSpectator(s.lambdaSpectator);
    if (s.showIndicatorError !== undefined) setShowIndicatorError(s.showIndicatorError);
    if (typeof s.indicatorE === 'number') setIndicatorE(s.indicatorE);
  });

  function reset() {
    setAnalyte(coupleFromPreset('fe')); setTitrant(coupleFromPreset('ce'));
    setDirection('oxidante'); setPH(0);
    setCAnalyte(0.05); setVAnalyte(50); setCTitrant(0.05);
    setUsePe(false); setShowDerivative(false);
    setShowSecondAnalyte(false); setSecondAnalyte(coupleFromPreset('sn')); setSecondAnalyteConc(0.05);
    setShowConditionalStates(false); setOxPolyLogs([]); setOxPolySlopes([]);
    setRedPolyLogs([11, 15]); setRedPolySlopes([-1, -2]);
    setShowStateNetwork(false); setNetworkFinalLabel('A(ox II)'); setNetworkE02(1); setNetworkN2(1);
    setShowPolynuclear(false); setAnalyteUnits(1); setPolynuclearXeq(0.01);
    setShowAlternativeSignals(false); setProductEpsilon(100); setLambdaSpectator(50);
    setShowIndicatorError(false); setIndicatorE(0.85);
  }

  const polynomialState = useCallback((logs: number[], slopes: number[]): ConditionalRedoxState | undefined => (
    showConditionalStates && logs.length > 0
      ? { intrinsicTerms: logs.map((logCoefficient, index) => ({
          logCoefficient,
          pHSlope: slopes[index] ?? -(index + 1),
        })) }
      : undefined
  ), [showConditionalStates]);
  const analyteOxState = useMemo(
    () => polynomialState(oxPolyLogs, oxPolySlopes),
    [polynomialState, oxPolyLogs, oxPolySlopes],
  );
  const analyteRedState = useMemo(
    () => polynomialState(redPolyLogs, redPolySlopes),
    [polynomialState, redPolyLogs, redPolySlopes],
  );

  const totalElectronMoles = (analyte.n + (showStateNetwork ? networkN2 : 0)) * cAnalyte * vAnalyte
    + (showSecondAnalyte && !showStateNetwork ? secondAnalyte.n * secondAnalyteConc * vAnalyte : 0);
  const vMax = (totalElectronMoles / (titrant.n * cTitrant)) * 1.8;
  const curve = useMemo(
    () => redoxTitrationCurve({
      analyte, titrant, direction, pH, cAnalyte, vAnalyte, cTitrant, vMax,
      analyteOxState, analyteRedState,
    }),
    [analyte, titrant, direction, pH, cAnalyte, vAnalyte, cTitrant, vMax, analyteOxState, analyteRedState],
  );
  const mixtureCurve = useMemo(() => showSecondAnalyte
    ? redoxMixtureTitrationCurve({
        analytes: [
          { couple: analyte, c: cAnalyte, oxState: analyteOxState, redState: analyteRedState },
          { couple: secondAnalyte, c: secondAnalyteConc },
        ],
        titrant,
        direction,
        pH,
        vAnalyte,
        cTitrant,
        vMax,
      })
    : null,
  [showSecondAnalyte, analyte, analyteOxState, analyteRedState, cAnalyte, secondAnalyte, secondAnalyteConc, titrant, direction, pH, vAnalyte, cTitrant, vMax]);
  const networkCurve = useMemo(() => showStateNetwork && direction === 'oxidante' && !showSecondAnalyte
    ? redoxNetworkTitrationCurve({
        analyte: {
          labels: [analyte.red, analyte.ox, networkFinalLabel],
          transitions: [
            { n: analyte.n, pe0: conditionalEprimeFromStates(analyte, pH, analyteOxState, analyteRedState) / NERNST_S },
            { n: networkN2, pe0: networkE02 / NERNST_S },
          ],
        },
        titrant: {
          labels: [titrant.red, titrant.ox],
          transitions: [{ n: titrant.n, pe0: peConditional(titrant, pH) }],
        },
        analyteMoles: cAnalyte * vAnalyte,
        titrantConcentration: cTitrant,
        vMax,
      })
    : null,
  [showStateNetwork, direction, showSecondAnalyte, analyte, networkFinalLabel, pH, analyteOxState, analyteRedState, networkN2, networkE02, titrant, cAnalyte, vAnalyte, cTitrant, vMax]);
  const activeVolumes = networkCurve?.volumes ?? mixtureCurve?.volumes ?? curve.volumes;
  const activePes = networkCurve?.pes ?? mixtureCurve?.pes ?? curve.pes;
  const activeEs = networkCurve?.Es ?? mixtureCurve?.Es ?? curve.Es;
  const activeEquivalences = useMemo(
    () => networkCurve?.equivalenceVolumes ?? mixtureCurve?.equivalenceVolumes ?? [curve.vEq],
    [networkCurve, mixtureCurve, curve.vEq],
  );

  const { traces, shapes, annotations } = useMemo(() => {
    const y = usePe ? activePes : activeEs;
    const data: Data[] = [{
      x: activeVolumes, y, type: 'scatter', mode: 'lines',
      name: usePe ? 'pe' : 'E (V)',
      line: { width: 3, color: '#D55E00' },
      hovertemplate: `V = %{x:.2f} mL<br>${usePe ? 'pe' : 'E'} = %{y:.3f}<extra></extra>`,
    }];
    if (showDerivative) {
      const der = firstDerivative(activeVolumes, y);
      const maxD = Math.max(...der.d.map(Math.abs), 1e-9);
      const span = Math.max(...y) - Math.min(...y);
      data.push({
        x: der.v, y: der.d.map((d) => Math.min(...y) + (Math.abs(d) / maxD) * span),
        type: 'scatter', mode: 'lines', name: t('titulacion.derivativeTraceNameDe'),
        line: { width: 2, color: '#7F8C8D' }, hoverinfo: 'skip',
      });
    }
    const shapeList: Partial<Shape>[] = activeEquivalences.map((value) => ({
      type: 'line', x0: value, x1: value, y0: Math.min(...y), y1: Math.max(...y),
      line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
    }));
    const annList: Partial<Annotations>[] = activeEquivalences.map((value, index) => ({
      x: value, y: Math.max(...y), text: `${t('titulacion.pE')}${activeEquivalences.length > 1 ? ` ${index + 1}` : ''}`, showarrow: false,
      font: { color: '#2C3E50', size: 12 },
    }));
    return { traces: data, shapes: shapeList, annotations: annList };
  }, [activeVolumes, activePes, activeEs, activeEquivalences, usePe, showDerivative, t]);

  const analytePe0 = conditionalEprimeFromStates(analyte, pH, analyteOxState, analyteRedState) / NERNST_S;
  const reactionLogKs = [
    { couple: analyte, pe0: analytePe0 },
    ...(showSecondAnalyte && !showStateNetwork ? [{ couple: secondAnalyte, pe0: peConditional(secondAnalyte, pH) }] : []),
  ].map(({ couple, pe0 }) => direction === 'oxidante'
    ? electronTransferCount(couple.n, titrant.n) * (peConditional(titrant, pH) - pe0)
    : electronTransferCount(couple.n, titrant.n) * (pe0 - peConditional(titrant, pH)));
  const limitingLogK = Math.min(...reactionLogKs);
  const quantitative = limitingLogK >= 6;
  const pHDependent = showConditionalStates || analyte.mH > 0 || titrant.mH > 0 || (showSecondAnalyte && secondAnalyte.mH > 0);
  const buretSpecies = direction === 'oxidante' ? titrant.ox : titrant.red;
  const lastEq = activeEquivalences[activeEquivalences.length - 1];
  const lastEqIndex = activeVolumes.findIndex((value) => value >= lastEq);
  const peAtLastEq = activePes[Math.max(lastEqIndex, 0)];
  const eAtLastEq = activeEs[Math.max(lastEqIndex, 0)];
  const polynuclearEeq = polynuclearEquivalencePotential({
    potentials: [conditionalEprimeFromStates(analyte, pH, analyteOxState, analyteRedState), peConditional(titrant, pH) * NERNST_S],
    electrons: [analyte.n, titrant.n],
    activityCorrection: analyteUnits * polynuclearXeq,
  });

  const exportMetadata = useMemo(() => ({
    Módulo: 'Titulación redox',
    Analito: analyte.name,
    Titulante: titrant.name,
    pH: pH.toFixed(1),
    'CA / M': cAnalyte.toFixed(4),
    'CT / M': cTitrant.toFixed(4),
  }), [analyte.name, titrant.name, pH, cAnalyte, cTitrant]);

  const redoxObservableParams = useMemo(() => ({
    volumesML: activeVolumes,
    pes: activePes,
    pe0Analyte: analytePe0,
    nAnalyte: analyte.n,
    analyteCoupleId: analyte.id,
    direction,
    cAnalyte,
    vAnalyteML: vAnalyte,
    cTitrant,
    productEpsilon,
    lambdaSpectator,
  }), [
    activeVolumes, activePes, analytePe0, analyte.n, analyte.id, direction,
    cAnalyte, vAnalyte, cTitrant, productEpsilon, lambdaSpectator,
  ]);
  const redoxOpticalTrace = useMemo<Data>(() => {
    const optical = redoxOpticalFromCurve(redoxObservableParams);
    return {
      x: optical.volumes, y: optical.absorbance, type: 'scatter', mode: 'lines', name: 'A',
      line: { width: 3, color: '#CC79A7' },
    };
  }, [redoxObservableParams]);
  const redoxConductometricCurve = useMemo(
    () => redoxConductometricFromCurve(redoxObservableParams),
    [redoxObservableParams],
  );
  const redoxIndicatorEndpoint = useMemo(() => {
    const eqVolume = activeEquivalences[activeEquivalences.length - 1];
    if (!Number.isFinite(eqVolume)) return null;
    return redoxEndpointError({
      volumes: activeVolumes,
      signal: activeEs,
      endpointSignal: indicatorE,
      equivalenceVolume: eqVolume,
      titrantConcentration: cTitrant,
      analyteMoles: cAnalyte * vAnalyte / 1000,
    });
  }, [activeVolumes, activeEs, indicatorE, activeEquivalences, cTitrant, cAnalyte, vAnalyte]);

  return (
    <>
      <PanelShell title={t('titulacion.redoxTitle')} onReset={reset} moduleId="titulacion" guideId="titulacion-redox">
        <PanelSection title={t('acidoBase.systemSection')}>
          <Segmented
            options={[
              { value: 'oxidante', label: t('titulacion.oxidationOption') },
              { value: 'reductor', label: t('titulacion.reductionOption') },
            ]}
            value={direction}
            onChange={(v) => {
              const next = v as 'oxidante' | 'reductor';
              setDirection(next);
              if (next === 'reductor') setShowStateNetwork(false);
            }}
          />
          <ModelBadge
            model={direction === 'oxidante' ? t('titulacion.redoxModelOxidation') : t('titulacion.redoxModelReduction')}
            additions={[pHDependent && t('redox.additionPHConditioned'), showSecondAnalyte && !showStateNetwork && t('titulacion.addRedoxMixture'), showStateNetwork && t('titulacion.addRedoxNetwork'), usePe && t('titulacion.addPeAxis'), showDerivative && t('mezclas.additionDerivative')]}
          />
          <p className="hint">
            {direction === 'oxidante'
              ? t('titulacion.analyteStartsAsOx', { analyte: analyte.red, titrant: titrant.ox })
              : t('titulacion.analyteStartsAsOx', { analyte: analyte.ox, titrant: titrant.red })}
          </p>
          <CoupleEditor title={t('titulacion.analytePairTitle')} couple={analyte} onChange={setAnalyte} />
          <Toggle label={t('titulacion.conditionalRedoxStatesToggle')} checked={showConditionalStates} onChange={setShowConditionalStates} />
          {showConditionalStates && (
            <Disclosure title={t('titulacion.conditionalRedoxStatesTitle')} defaultOpen>
              <p className="hint">{t('titulacion.conditionalRedoxStatesHint')}</p>
              <ConstantList prefix="log c(Ox)" values={oxPolyLogs} onChange={setOxPolyLogs} min={-30} max={40} maxItems={5} minItems={0} initialValue={4} />
              <ConstantList prefix={t('titulacion.phSlopeOxPrefix')} values={oxPolySlopes} onChange={setOxPolySlopes} min={-6} max={6} maxItems={5} minItems={0} initialValue={-1} />
              <ConstantList prefix="log c(Red)" values={redPolyLogs} onChange={setRedPolyLogs} min={-30} max={40} maxItems={5} minItems={0} initialValue={11} />
              <ConstantList prefix={t('titulacion.phSlopeRedPrefix')} values={redPolySlopes} onChange={setRedPolySlopes} min={-6} max={6} maxItems={5} minItems={0} initialValue={-1} />
            </Disclosure>
          )}
          {direction === 'oxidante' && !showSecondAnalyte && (
            <Toggle
              label={t('titulacion.redoxNetworkToggle')}
              checked={showStateNetwork}
              onChange={(value) => {
                setShowStateNetwork(value);
                if (value) setShowSecondAnalyte(false);
              }}
            />
          )}
          {(direction !== 'oxidante' || showSecondAnalyte) && (
            <p className="hint">{t('titulacion.redoxNetworkUnavailableHint')}</p>
          )}
          {showStateNetwork && (
            <Disclosure title={t('titulacion.redoxNetworkTitle')} defaultOpen>
              <LabelField label={t('titulacion.finalRedoxStateLabel')} value={networkFinalLabel} onChange={setNetworkFinalLabel} />
              <Slider label="E°′₂ (V)" value={networkE02} min={-1.5} max={2.5} step={0.01} onChange={setNetworkE02} decimals={2} />
              <Slider label="n₂" value={networkN2} min={1} max={6} step={1} onChange={setNetworkN2} decimals={0} />
            </Disclosure>
          )}
          <Toggle label={t('titulacion.addSecondRedoxAnalyte')} checked={showSecondAnalyte} onChange={(checked) => {
            setShowSecondAnalyte(checked);
            if (checked) setShowStateNetwork(false);
          }} />
          {showSecondAnalyte && (
            <Disclosure title={t('titulacion.secondAnalytePairTitle')} defaultOpen>
              <CoupleEditor title={t('titulacion.secondAnalytePairTitle')} couple={secondAnalyte} onChange={setSecondAnalyte} />
              <ConcSlider label={t('titulacion.secondAnalyteConcLabel')} value={secondAnalyteConc} onChange={setSecondAnalyteConc} min={-4} max={-1} />
            </Disclosure>
          )}
          <Toggle label={t('titulacion.polynuclearToggle')} checked={showPolynuclear} onChange={setShowPolynuclear} />
          {showPolynuclear && (
            <Disclosure title={t('titulacion.polynuclearTitle')} defaultOpen>
              <NumberSegmented label={t('titulacion.conservedUnitsPerSpecies')} value={analyteUnits} options={[1, 2, 3, 4, 6]} onChange={setAnalyteUnits} />
              <ConcSlider label="Xeq" value={polynuclearXeq} onChange={setPolynuclearXeq} min={-6} max={-0.3} />
            </Disclosure>
          )}
          <CoupleEditor title={t('titulacion.titrantPairTitle')} couple={titrant} onChange={setTitrant} />
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')}>
          <Slider label={t('titulacion.bufferedMediumPHLabel')} value={pH} min={0} max={14} step={0.1} onChange={setPH} decimals={1} />
          {pHDependent && (
            <p className="hint">{t('titulacion.hInHalfReactionHint')}</p>
          )}
          <ConcSlider label={t('titulacion.analyteConcLabel')} value={cAnalyte} onChange={setCAnalyte} min={-4} max={-1} />
          <Slider label={t('titulacion.sampleVolumeLabel')} value={vAnalyte} min={10} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfTitrantSimpleLabel')} value={cTitrant} onChange={setCTitrant} min={-4} max={-1} />
          <Toggle label={t('titulacion.peAxisToggle')} checked={usePe} onChange={setUsePe} />
          <Toggle label={t('titulacion.showDerivativeDeToggle')} checked={showDerivative} onChange={setShowDerivative} />
          <Toggle label={t('titulacion.alternativeSignalsToggle')} checked={showAlternativeSignals} onChange={setShowAlternativeSignals} />
          {showAlternativeSignals && (
            <>
              <Slider label={t('titulacion.productEpsilon')} value={productEpsilon} min={0} max={1000} step={10} decimals={0} onChange={setProductEpsilon} />
              <Slider label={t('titulacion.lambdaSpectator')} value={lambdaSpectator} min={10} max={400} step={5} decimals={0} onChange={setLambdaSpectator} />
            </>
          )}
          <Toggle label={t('titulacion.indicatorEndpointToggle')} checked={showIndicatorError} onChange={setShowIndicatorError} />
          {showIndicatorError && (
            <Slider label={t('titulacion.redoxIndicatorELabel')} value={indicatorE} min={-0.5} max={2} step={0.01} onChange={setIndicatorE} unit="V" decimals={2} />
          )}
        </PanelSection>
        <PanelSection title={t('complejos.resultSection')}>
          <ResultCard items={[
            { label: showSecondAnalyte ? t('titulacion.successiveEquivalences') : t('titulacion.volEqLabel'), value: `${activeEquivalences.map((value) => value.toFixed(2)).join(' / ')} mL` },
            { label: t('titulacion.eAtEquivalenceLabel'), value: `${eAtLastEq.toFixed(3)} V (pe ${peAtLastEq.toFixed(2)})`, helpId: 'pe' },
            { label: t('titulacion.logKReactionLabel'), value: limitingLogK.toFixed(1) },
            ...(showPolynuclear ? [{ label: t('titulacion.polynuclearEeq'), value: `${polynuclearEeq.toFixed(4)} V` }] : []),
          ]} />
          <p className={quantitative ? 'badge ok' : 'badge warn'}>
            {quantitative
              ? t('titulacion.redoxQuantitativeMsg', { k: limitingLogK.toFixed(0) })
              : t('titulacion.redoxNotQuantitativeMsg', { k: limitingLogK.toFixed(1) })}
          </p>
          {showIndicatorError && redoxIndicatorEndpoint && (
            <ResultCard items={[
              { label: t('titulacion.endpointVolume'), value: `${redoxIndicatorEndpoint.volumeTP.toFixed(3)} mL` },
              { label: t('titulacion.relativeIndicatorError'), value: `${redoxIndicatorEndpoint.relativeErrorPercent.toFixed(5)} %` },
            ]} />
          )}
        </PanelSection>
        <InfoBox title={t('titulacion.calcMethodTitle')}>
          <p>{t('titulacion.redoxInfoBody')}</p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs
          initialId="curve"
          tabs={[
            {
              id: 'curve',
              label: usePe ? 'pe = f(V)' : 'E = f(V)',
              node: (
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
              ),
            },
            ...(showAlternativeSignals ? [
              {
                id: 'optical', label: t('titulacion.absorbanceTab'),
                node: <Chart data={[redoxOpticalTrace]} xTitle={t('mezclas.volumeAddedLabel', { titrant: buretSpecies })} yTitle="A" xRange={[0, vMax]} exportName="equilibria-titulacion-redox-absorbancia" exportMetadata={exportMetadata} />,
              },
              {
                id: 'conductivity', label: t('titulacion.conductivityTab'),
                node: <Chart data={[{ x: redoxConductometricCurve.volumes, y: redoxConductometricCurve.conductivity, type: 'scatter', mode: 'lines', name: 'κ', line: { width: 3, color: '#009E73' } }]} xTitle={t('mezclas.volumeAddedLabel', { titrant: buretSpecies })} yTitle="κ" xRange={[0, vMax]} exportName="equilibria-titulacion-redox-conductividad" exportMetadata={exportMetadata} />,
              },
            ] : []),
          ]}
        />
        <ResultCardRow items={[
          { label: t('titulacion.vOfEquivalenceShort'), value: `${activeEquivalences.map((value) => value.toFixed(2)).join(' / ')} mL`, accent: true },
          { label: usePe ? t('titulacion.peAtEquivalenceShort') : t('titulacion.eAtEquivalenceLabel'), value: usePe ? peAtLastEq.toFixed(2) : `${eAtLastEq.toFixed(3)} V` },
          { label: t('titulacion.logKReactionShort'), value: limitingLogK.toFixed(1) },
          ...(showPolynuclear ? [{ label: t('titulacion.polynuclearEeq'), value: `${polynuclearEeq.toFixed(4)} V` }] : []),
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
  const [showConditionalSensor, setShowConditionalSensor] = useState(false);
  const [logAlphaCation, setLogAlphaCation] = useState(0);
  const [logAlphaAnion, setLogAlphaAnion] = useState(0);
  const [sensorE0, setSensorE0] = useState(0.8);
  const [sensorTemperature, setSensorTemperature] = useState(25);

  useShareEffect('titulacion', { mode, presetId, pKsp, cationName, anionName, saltFormula, isAgSystem, cAnalyte, vAnalyte, cTitrant, m, x, showPCation, showMohr, cChromate, showDerivative, showConditionalSensor, logAlphaCation, logAlphaAnion, sensorE0, sensorTemperature }, (s) => {
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
    if (s.showConditionalSensor !== undefined) setShowConditionalSensor(s.showConditionalSensor);
    if (s.logAlphaCation !== undefined) setLogAlphaCation(s.logAlphaCation);
    if (s.logAlphaAnion !== undefined) setLogAlphaAnion(s.logAlphaAnion);
    if (s.sensorE0 !== undefined) setSensorE0(s.sensorE0);
    if (s.sensorTemperature !== undefined) setSensorTemperature(s.sensorTemperature);
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
    setShowConditionalSensor(false); setLogAlphaCation(0); setLogAlphaAnion(0);
    setSensorE0(0.8); setSensorTemperature(25);
  }

  const vEq0 = (m / x) * ((cAnalyte * vAnalyte) / cTitrant);
  const vMax = vEq0 * 1.6;

  const curve = useMemo(
    () => precipTitrationCurve({ pKsp, cAnalyte, vAnalyte, cTitrant, vMax, m, x }),
    [pKsp, cAnalyte, vAnalyte, cTitrant, vMax, m, x],
  );
  const sensorCurve = useMemo(() => conditionalPrecipSensorCurve({
    pKsp, cAnalyte, vAnalyte, cTitrant, vMax, m, x,
    alphaMetal: Math.pow(10, logAlphaCation), alphaAnalyte: Math.pow(10, logAlphaAnion),
    electrodeE0: sensorE0, electrons: Math.max(1, m), temperatureC: sensorTemperature,
  }), [pKsp, cAnalyte, vAnalyte, cTitrant, vMax, m, x, logAlphaCation, logAlphaAnion, sensorE0, sensorTemperature]);

  const mohrPAg = mohrEndpointPAg(cChromate);
  const mohrEndpointMetric = useMemo(() => {
    if (!showMohr || !showPCation || !isAgSystem) return null;
    return precipitationEndpointError({
      volumes: curve.volumes,
      pTarget: curve.pAgs,
      endpointPTarget: mohrPAg,
      equivalenceVolume: curve.vEq,
      titrantConcentration: cTitrant,
      analyteMoles: cAnalyte * vAnalyte / 1000,
    });
  }, [showMohr, showPCation, isAgSystem, curve.volumes, curve.pAgs, curve.vEq, mohrPAg, cTitrant, cAnalyte, vAnalyte]);

  // showPCation: true → y-axis is p(cation)=pAg, false → p(anion)=pX
  const yVals = showConditionalSensor ? sensorCurve.potentials : showPCation ? curve.pAgs : curve.pXs;
  const pCatLabel = `p${cationName.replace(/[⁺²³⁴⁻]/g, '')}`;
  const pAniLabel = `p${anionName.replace(/[⁺²³⁴⁻]/g, '')}`;
  const yLabel = showConditionalSensor ? 'E (V)' : showPCation
    ? `${pCatLabel} (−log[${cationName}])`
    : `${pAniLabel} (−log[${anionName}])`;
  const finiteY = yVals.filter(Number.isFinite);
  const yMin = showConditionalSensor ? Math.min(...finiteY) - 0.05 : 0;
  const yMax = showConditionalSensor ? Math.max(...finiteY) + 0.05 : Math.ceil(Math.max(...finiteY, curve.pAgEq * 1.2));

  const traces = useMemo<Data[]>(() => {
    const y = showConditionalSensor ? sensorCurve.potentials : showPCation ? curve.pAgs : curve.pXs;
    const data: Data[] = [{
      x: curve.volumes, y, type: 'scatter', mode: 'lines',
      name: showConditionalSensor ? 'E' : showPCation ? pCatLabel : pAniLabel,
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
  }, [curve, sensorCurve.potentials, showConditionalSensor, showPCation, showDerivative, pCatLabel, pAniLabel, t]);

  const shapes = useMemo<Partial<Shape>[]>(() => {
    const list: Partial<Shape>[] = [{
      type: 'line', x0: curve.vEq, x1: curve.vEq, y0: yMin, y1: yMax,
      line: { color: '#2C3E50', width: 1.5, dash: 'dash' },
    }];
    if (showMohr && showPCation && isAgSystem) {
      list.push({
        type: 'line', x0: 0, x1: vMax, y0: mohrPAg, y1: mohrPAg,
        line: { color: '#7F8C8D', width: 1.5, dash: 'dot' },
      });
    }
    return list;
  }, [curve.vEq, showMohr, showPCation, isAgSystem, mohrPAg, vMax, yMin, yMax]);

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
      <PanelShell title={t('titulacion.precipTitle')} onReset={reset} moduleId="titulacion" guideId="titulacion-precipitacion">
        <PanelSection title={t('acidoBase.systemSection')}>
          <ModelBadge
            model={t('titulacion.precipModelBadge', { m, x })}
            additions={[showPCation && t('titulacion.addPCationAxis', { cation: cationName }), showMohr && showPCation && t('titulacion.addMohrIndicator'), showDerivative && t('mezclas.additionDerivative')]}
          />
          <p className="hint">{m > 1 ? `${m}` : ''}{cationName} + {x > 1 ? `${x}` : ''}{anionName} → {saltFormula}↓</p>
          <div className="preset-chip-row preset-chip-row-spaced">
            {PRECIP_PRESETS.map((p) => (
              <button type="button"
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

        <PanelSection title={t('acidoBase.conditionsSection')}>
          <ConcSlider label={t('titulacion.concOfLabel', { name: anionName })} value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
          <Slider label={t('titulacion.sampleVolumeLabel')} value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfLabel', { name: cationName })} value={cTitrant} onChange={setCTitrant} min={-4} max={0} />
        </PanelSection>

        <PanelSection title={t('titulacion.visualizationSection')}>
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
          <Toggle label={t('titulacion.conditionalSensorToggle')} checked={showConditionalSensor} onChange={setShowConditionalSensor} />
          {showConditionalSensor && (
            <>
              <Slider label={t('titulacion.logAlphaCation')} value={logAlphaCation} min={0} max={20} step={0.1} decimals={1} onChange={setLogAlphaCation} />
              <Slider label={t('titulacion.logAlphaAnion')} value={logAlphaAnion} min={0} max={20} step={0.1} decimals={1} onChange={setLogAlphaAnion} />
              <Slider label="E° (V)" value={sensorE0} min={-1.5} max={2.5} step={0.01} decimals={2} onChange={setSensorE0} />
              <Slider label={t('titulacion.temperatureLabel')} value={sensorTemperature} min={0} max={100} step={1} decimals={0} unit="°C" onChange={setSensorTemperature} />
            </>
          )}
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')}>
          <ResultCard items={[
            { label: t('titulacion.volEqLabel'), value: `${curve.vEq.toFixed(2)} mL` },
            { label: m === 1 && x === 1 ? t('titulacion.pAtEquivalenceHalfPKsp') : t('titulacion.pAtEquivalence'), value: curve.pAgEq.toFixed(2) },
            ...(showConditionalSensor ? [{ label: t('titulacion.conditionalPKsp'), value: sensorCurve.pKspConditional.toFixed(3) }] : []),
            ...(isAgSystem && showPCation ? [{
              label: t('titulacion.mohrIndicatorLabel'),
              value: `pAg = ${mohrPAg.toFixed(2)} (Δ = ${(mohrPAg - curve.pAgEq).toFixed(2)})`,
            }] : []),
            ...(mohrEndpointMetric ? [
              { label: t('titulacion.endpointVolume'), value: `${mohrEndpointMetric.volumeTP.toFixed(3)} mL` },
              { label: t('titulacion.relativeIndicatorError'), value: `${mohrEndpointMetric.relativeErrorPercent.toFixed(5)} %` },
            ] : []),
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
          yRange={[yMin, yMax]}
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
          ...(showConditionalSensor ? [{ label: t('titulacion.conditionalPKsp'), value: sensorCurve.pKspConditional.toFixed(3) }] : []),
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
  const lang = useLanguage();
  const [system, setSystem] = useState<AcidSystem>(() => strongAcidSystem(false, lang));
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
    setSystem(strongAcidSystem(false, lang)); setTitrantIsAcid(false);
    setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setKref(400); setShowDeriv1(false); setShowDeriv2(false);
  }

  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';
  const localizedSystem = isGenericSystemLabel(system.label)
    ? { ...system, label: inferredSystemLabel(system.z0, system.pKas, lang) }
    : system;
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
        <div className="chart-with-caption">
          <div className="chart-with-caption-plot">
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
          <p className="hint chart-caption">
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
      <PanelShell title={t('titulacion.potentiometricTitle')} onReset={reset} moduleId="titulacion" guideId="titulacion-potenciometrica">
        <PanelSection title={t('acidoBase.systemSection')}>
          <Segmented
            options={[
              { value: 'base', label: t('titulacion.titrantBaseSeg') },
              { value: 'acid', label: t('titulacion.titrantAcidSeg') },
            ]}
            value={titrantIsAcid ? 'acid' : 'base'}
            onChange={(v) => {
              const nextIsAcid = v === 'acid';
              setTitrantIsAcid(nextIsAcid);
              if (system.pKas.length === 0) setSystem(strongAcidSystem(nextIsAcid, lang));
            }}
          />
          <ModelBadge
            model={t('titulacion.potentiometricModelBadge', {
              titrant: titrantIsAcid ? t('titulacion.titrantAcidWord') : t('titulacion.titrantBaseWord'),
              kind: systemKind,
            })}
            additions={[showDeriv1 && t('titulacion.addFirstDerivative'), showDeriv2 && t('titulacion.addSecondDerivative')]}
          />
          <AcidSystemEditor system={localizedSystem} onChange={setSystem} includeStrong allowNoConstants showModel={false} allowAquaCations />
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')}>
          <ConcSlider label={t('titulacion.analyteConcLabel')} value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
          <Slider label={t('titulacion.sampleVolumeLabel')} value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
          <ConcSlider label={t('titulacion.concOfLabel', { name: titrantName })} value={cTitrant} onChange={setCTitrant} min={-4} max={0} />
        </PanelSection>
        <PanelSection title={t('titulacion.glassElectrodeSection')}>
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
        <PanelSection title={t('complejos.resultSection')}>
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
  const modeTabsRef = useRef<HTMLDivElement>(null);
  const modeLabel = MODES.find((m) => m.value === mode)?.label ?? '';

  useEffect(() => {
    modeTabsRef.current
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [mode]);

  return (
    <div className="module-with-tabs">
      <details className="tit-mode-collapse" open>
        <summary className="tit-mode-summary">{t('titulacion.modeSummary', { mode: modeLabel })}<span className="ui-chevron" aria-hidden /></summary>
        <div ref={modeTabsRef} className="chart-tabs" role="tablist" aria-label={t('titulacion.modeTablist')}>
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="tab"
              aria-selected={mode === m.value}
              tabIndex={mode === m.value ? 0 : -1}
              className={mode === m.value ? 'chart-tab active' : 'chart-tab'}
              onClick={() => setMode(m.value)}
              onKeyDown={handleTabKeyDown}
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
