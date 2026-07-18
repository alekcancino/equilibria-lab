// Conditional solubility of metal hydroxides.
// Core use case: selective separation (precipitate M1 while M2 stays in solution).

import { useMemo } from 'react';
import { useShareableState } from '../hooks/useShareableState';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  Slider, ConstantList, ConcSlider, DbPanel, Disclosure, InfoBox, LabelField,
  ModelBadge, PanelSection, ResultCard, ResultCardRow, Toggle,
} from '../components/Controls';
import { SideReactionEditor } from '../components/Editors';
import Predominance2D from '../components/Predominance2D';
import { alphaOH, hydroxideSolCurve, precipitationPH, solubilityRegimeFractions } from '../lib/conditional';
import { predominanceGrid } from '../lib/predominance2D';
import { logActivityCoefficient } from '../lib/activity';
import {
  defaultSideEditorState,
  hydroxideSolCurveMasked,
  logSThresholdFromConcentration,
  precipitationPHMasked,
  sideStackFromEditor,
  solubilityRegimeFractionsMasked,
  type SideReactionEditorState,
} from '../lib/sideReactions';
import { solubilityPXCurve } from '../lib/solubility';
import { conditionalPKsp, orderPrecipitationStages, sequentialSharedPrecipitation, sharedPrecipitationEquilibrium } from '../lib/conditionalSolubility';
import { SPECIES_COLORS } from '../lib/database';
import { toSub } from '../lib/complexDatabase';
import { useT } from '../hooks/useT';
import { hasRegularSolutionMiscibilityGap, idealSolidSolutionAtComposition, regularSolutionGammas } from '../lib/solidSolution';

// ── Metal hydroxide database ──────────────────────────────────────────────────

interface OHPreset {
  id: string;
  metal: string;
  formula: string;
  n: number;         // OH⁻ stoichiometry
  pKsp: number;
  /** global log β values for soluble hydroxo complexes M(OH)_i */
  logBetasOH: number[];
  group: string;
}

const OH_PRESETS: OHPreset[] = [
  // Trivalent — precipitate at acidic pH
  { id: 'fe3oh', metal: 'Fe³⁺', formula: 'Fe(OH)₃', n: 3, pKsp: 38.7, logBetasOH: [11.81, 21.68, 30.67], group: 'trivalentAcidic' },
  { id: 'al',    metal: 'Al³⁺', formula: 'Al(OH)₃', n: 3, pKsp: 32.9, logBetasOH: [9.01, 17.09, 23.40, 27.68], group: 'trivalentAcidic' },
  { id: 'cr3oh', metal: 'Cr³⁺', formula: 'Cr(OH)₃', n: 3, pKsp: 30.2, logBetasOH: [10.1, 17.8, 24.6, 27.1], group: 'trivalentAcidic' },
  { id: 'la',    metal: 'La³⁺', formula: 'La(OH)₃', n: 3, pKsp: 20.7, logBetasOH: [], group: 'trivalentAcidic' },
  // Bivalent — precipitate at intermediate pH
  { id: 'cu2oh', metal: 'Cu²⁺', formula: 'Cu(OH)₂', n: 2, pKsp: 19.7, logBetasOH: [6.0, 11.8], group: 'divalentIntermediate' },
  { id: 'pb2oh', metal: 'Pb²⁺', formula: 'Pb(OH)₂', n: 2, pKsp: 20.0, logBetasOH: [6.29, 10.89, 13.94], group: 'divalentIntermediate' },
  { id: 'zn2oh', metal: 'Zn²⁺', formula: 'Zn(OH)₂', n: 2, pKsp: 16.2, logBetasOH: [5.04, 10.43, 13.7, 15.2], group: 'divalentIntermediate' },
  { id: 'ni2oh', metal: 'Ni²⁺', formula: 'Ni(OH)₂', n: 2, pKsp: 15.2, logBetasOH: [4.97, 8.55], group: 'divalentIntermediate' },
  { id: 'co2oh', metal: 'Co²⁺', formula: 'Co(OH)₂', n: 2, pKsp: 14.9, logBetasOH: [4.35, 8.4], group: 'divalentIntermediate' },
  { id: 'fe2oh', metal: 'Fe²⁺', formula: 'Fe(OH)₂', n: 2, pKsp: 15.1, logBetasOH: [4.5, 7.4], group: 'divalentIntermediate' },
  { id: 'cd2oh', metal: 'Cd²⁺', formula: 'Cd(OH)₂', n: 2, pKsp: 14.4, logBetasOH: [3.9, 7.7], group: 'divalentIntermediate' },
  { id: 'mn2oh', metal: 'Mn²⁺', formula: 'Mn(OH)₂', n: 2, pKsp: 12.7, logBetasOH: [3.4, 6.2], group: 'divalentIntermediate' },
  // Alkaline earth — precipitate at basic pH
  { id: 'mg2oh', metal: 'Mg²⁺', formula: 'Mg(OH)₂', n: 2, pKsp: 11.2, logBetasOH: [2.6], group: 'divalentSoluble' },
  { id: 'ca2oh', metal: 'Ca²⁺', formula: 'Ca(OH)₂', n: 2, pKsp: 4.7,  logBetasOH: [], group: 'divalentSoluble' },
];

// ── State ──────────────────────────────────────────────────────────────────────

interface MetalState {
  label: string;
  formula: string;
  n: number;
  pKsp: number;
  logBetasOH: number[];
}

function fromPreset(id: string): MetalState {
  const p = OH_PRESETS.find((x) => x.id === id)!;
  return { label: p.metal, formula: p.formula, n: p.n, pKsp: p.pKsp, logBetasOH: [...p.logBetasOH] };
}

interface State {
  m1: MetalState;
  m2: MetalState;
  showM2: boolean;
  logSThreshold: number;
  operatingPH: number;
  ionicStrength: number;
  showPX: boolean;
  ligandX: string;
  logBetasX: number[];
  pHForPX: number;
  showSideMask: boolean;
  side: SideReactionEditorState;
  useCThreshold: boolean;
  cAnalytic: number;
  hydroxoOpen: boolean;
  showBilateral: boolean;
  logAlphaCounterIon: number;
  showStagePlanner: boolean;
  m3: MetalState;
  cPrecipitant: number;
  showSolidSolution: boolean;
  solidXA: number;
  solidInteraction: number;
  stageTargetPHs: number[];
}

// ── Amphoteric presets ────────────────────────────────────────────────────────
// Cargan pKsp + log β_OH del hidroxo-complejo aniónico y EXPANDEN la sección
// "Complejos hidroxo de M1" para que la curva U se vea sin abrir nada a mano.
interface AnfoteroPreset { id: string; label: string; metal: MetalState; }
const ANFOTERO_PRESETS: AnfoteroPreset[] = [
  { id: 'zn', label: 'Zn(OH)₂', metal: { label: 'Zn²⁺', formula: 'Zn(OH)₂', n: 2, pKsp: 16.2, logBetasOH: [5.04, 10.43, 13.7, 15.2] } },
  { id: 'al', label: 'Al(OH)₃', metal: { label: 'Al³⁺', formula: 'Al(OH)₃', n: 3, pKsp: 32.9, logBetasOH: [9.01, 17.09, 23.40, 27.68] } },
  // Pb(OH)₂ del examen QAIII: pKs=15.17, logβ_OH = [6.2, 10.3, 13.3] (n=1,2,3).
  { id: 'pb', label: 'Pb(OH)₂', metal: { label: 'Pb²⁺', formula: 'Pb(OH)₂', n: 2, pKsp: 15.17, logBetasOH: [6.2, 10.3, 13.3] } },
];

function defaultState(): State {
  return {
    m1: { label: 'M²⁺', formula: 'M(OH)₂', n: 2, pKsp: 15, logBetasOH: [] },
    m2: fromPreset('ni2oh'),
    showM2: false,
    logSThreshold: -5,
    operatingPH: 9,
    ionicStrength: 0,
    showPX: false,
    ligandX: 'NH₃',
    logBetasX: [4.04, 7.47, 10.27],
    pHForPX: 10,
    showSideMask: false,
    side: defaultSideEditorState(),
    useCThreshold: false,
    cAnalytic: 0.01,
    hydroxoOpen: false,
    showBilateral: false,
    logAlphaCounterIon: 0,
    showStagePlanner: false,
    m3: fromPreset('mn2oh'),
    cPrecipitant: 0.01,
    showSolidSolution: false,
    solidXA: 0.5,
    solidInteraction: 0,
    stageTargetPHs: [],
  };
}

// ── Colors ────────────────────────────────────────────────────────────────────

const C1 = '#0072B2';               // blue — metal 1
const C2 = '#D55E00';
const C_WIN = 'rgba(39,174,96,0.12)'; // selective window (soft green)
const C_THRESH = 'rgba(127,140,141,0.9)'; // threshold line


// ── Component ─────────────────────────────────────────────────────────────────

export default function SolubilidadCondicional() {
  const t = useT();
  const [s, setS] = useShareableState<State>('solcond', defaultState());

  const setM1 = (patch: Partial<MetalState>) =>
    setS((prev) => ({ ...prev, m1: { ...prev.m1, ...patch } }));
  const setM2 = (patch: Partial<MetalState>) =>
    setS((prev) => ({ ...prev, m2: { ...prev.m2, ...patch } }));
  const setM3 = (patch: Partial<MetalState>) =>
    setS((prev) => ({ ...prev, m3: { ...prev.m3, ...patch } }));

  function reset() { setS(defaultState()); }

  function applyAnfotero(id: string) {
    const p = ANFOTERO_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setS((prev) => ({ ...prev, m1: { ...p.metal, logBetasOH: [...p.metal.logBetasOH] }, hydroxoOpen: true }));
  }

  const exportMetadata = useMemo(() => ({
    Módulo: 'Solubilidad condicional',
    'Hidróxido 1': s.m1.formula,
    'pKsp 1': s.m1.pKsp.toFixed(2),
    ...(s.showM2 ? { 'Hidróxido 2': s.m2.formula, 'pKsp 2': s.m2.pKsp.toFixed(2) } : {}),
  }), [s.m1.formula, s.m1.pKsp, s.showM2, s.m2.formula, s.m2.pKsp]);
  const solidSolution = useMemo(() => {
    const gammas = regularSolutionGammas(s.solidXA, s.solidInteraction);
    return idealSolidSolutionAtComposition({
      kspA: Math.pow(10, -s.m1.pKsp), kspB: Math.pow(10, -s.m2.pKsp),
      xA: s.solidXA, commonIonActivity: Math.pow(10, s.operatingPH - 14),
      gammaSolidA: gammas.gammaA, gammaSolidB: gammas.gammaB,
    });
  }, [s.solidXA, s.solidInteraction, s.m1.pKsp, s.m2.pKsp, s.operatingPH]);

  // ── Solubility curves ─────────────────────────────────────────────────────

  const sideStack = useMemo(() => {
    const st = { ...s.side, showOH: true, logBetasOH: s.m1.logBetasOH };
    return sideStackFromEditor(st);
  }, [s.side, s.m1.logBetasOH]);

  const logSThreshold = s.useCThreshold
    ? logSThresholdFromConcentration(s.cAnalytic)
    : s.logSThreshold;

  const curve1 = useMemo(
    () => s.showSideMask
      ? hydroxideSolCurveMasked(s.m1.pKsp, s.m1.n, sideStack, [0, 14], 600, s.ionicStrength)
      : hydroxideSolCurve(s.m1.pKsp, s.m1.n, s.m1.logBetasOH, [0, 14], 600, s.ionicStrength),
    [s.m1.pKsp, s.m1.n, s.m1.logBetasOH, s.showSideMask, sideStack, s.ionicStrength],
  );
  const curve2 = useMemo(
    () => s.showM2 ? hydroxideSolCurve(s.m2.pKsp, s.m2.n, s.m2.logBetasOH, [0, 14], 600, s.ionicStrength) : null,
    [s.m2.pKsp, s.m2.n, s.m2.logBetasOH, s.showM2, s.ionicStrength],
  );

  // ── Precipitation pH (first threshold crossing) ───────────────────────────

  const pH1precip = useMemo(
    () => s.showSideMask
      ? precipitationPHMasked(s.m1.pKsp, s.m1.n, sideStack, logSThreshold, [0, 14], 'falling', s.ionicStrength)
      : precipitationPH(s.m1.pKsp, s.m1.n, s.m1.logBetasOH, logSThreshold, [0, 14], 'falling', s.ionicStrength),
    [s.m1, logSThreshold, s.showSideMask, sideStack, s.ionicStrength],
  );
  const pH2precip = useMemo(
    () => s.showM2 ? precipitationPH(s.m2.pKsp, s.m2.n, s.m2.logBetasOH, logSThreshold, [0, 14], 'falling', s.ionicStrength) : null,
    [s.m2, logSThreshold, s.showM2, s.ionicStrength],
  );
  const pH3precip = useMemo(
    () => s.showStagePlanner
      ? precipitationPH(s.m3.pKsp, s.m3.n, s.m3.logBetasOH, logSThreshold, [0, 14], 'falling', s.ionicStrength)
      : null,
    [s.showStagePlanner, s.m3, logSThreshold, s.ionicStrength],
  );

  const precipitationStages = useMemo(() => orderPrecipitationStages([
    ...(pH1precip === null ? [] : [{
      label: s.m1.formula,
      freePrecipitantOnset: pH1precip,
      conditionalPKsp: s.m1.pKsp,
    }]),
    ...(s.showM2 && pH2precip !== null ? [{
      label: s.m2.formula,
      freePrecipitantOnset: pH2precip,
      conditionalPKsp: s.m2.pKsp,
    }] : []),
    ...(s.showStagePlanner && pH3precip !== null ? [{
      label: s.m3.formula,
      freePrecipitantOnset: pH3precip,
      conditionalPKsp: s.m3.pKsp,
    }] : []),
  ]), [pH1precip, pH2precip, pH3precip, s.m1, s.m2, s.m3, s.showM2, s.showStagePlanner]);

  const stagePHs = s.stageTargetPHs.length === precipitationStages.length
    ? s.stageTargetPHs
    : precipitationStages.map((stage) => stage.freePrecipitantOnset);

  const plannerMetals = useMemo(
    () => [s.m1, ...(s.showM2 ? [s.m2] : []), s.m3],
    [s.m1, s.showM2, s.m2, s.m3],
  );

  const sequentialStages = useMemo(() => {
    if (!s.showStagePlanner || precipitationStages.length === 0) return null;
    return sequentialSharedPrecipitation({
      salts: plannerMetals.map((metal) => ({
        label: metal.formula,
        pKsp: metal.pKsp,
        m: 1,
        x: metal.n,
        totalFormulaMoles: s.cAnalytic,
        alphaM: 1,
      })),
      logBetasOHBySalt: plannerMetals.map((metal) => metal.logBetasOH),
      totalPrecipitantMoles: s.cPrecipitant,
      volume: 1,
      alphaX: s.showBilateral ? Math.pow(10, s.logAlphaCounterIon) : 1,
      stagePHs,
      alphaMetalAtPH: alphaOH,
    });
  }, [s.showStagePlanner, precipitationStages.length, plannerMetals, s.cAnalytic, s.cPrecipitant, s.showBilateral, s.logAlphaCounterIon, stagePHs]);

  const sharedPool = useMemo(() => {
    if (!s.showStagePlanner) return null;
    if (sequentialStages && sequentialStages.length > 0) {
      return sequentialStages[sequentialStages.length - 1].result;
    }
    const metals = [s.m1, ...(s.showM2 ? [s.m2] : []), s.m3];
    return sharedPrecipitationEquilibrium({
      salts: metals.map((metal) => ({
        label: metal.formula,
        pKsp: metal.pKsp,
        m: 1,
        x: metal.n,
        totalFormulaMoles: s.cAnalytic,
        alphaM: alphaOH(metal.logBetasOH, s.operatingPH),
      })),
      totalPrecipitantMoles: s.cPrecipitant,
      volume: 1,
      alphaX: s.showBilateral ? Math.pow(10, s.logAlphaCounterIon) : 1,
    });
  }, [s.showStagePlanner, sequentialStages, s.m1, s.showM2, s.m2, s.m3, s.cAnalytic, s.operatingPH, s.cPrecipitant, s.showBilateral, s.logAlphaCounterIon]);

  // Selective window: [pH where M1 precipitates, pH where M2 starts to precipitate]
  const selectiveWindow: [number, number] | null = useMemo(() => {
    if (!s.showM2 || pH1precip === null || pH2precip === null) return null;
    if (pH1precip >= pH2precip) return null; // no separation possible
    return [pH1precip, pH2precip];
  }, [s.showM2, pH1precip, pH2precip]);

  // ── Dynamic Y range ───────────────────────────────────────────────────────

  const yMin = useMemo(() => {
    const all = [...curve1.logS, ...(curve2?.logS ?? [])].filter(Number.isFinite);
    return Math.max(Math.floor(Math.min(...all)) - 1, -40);
  }, [curve1, curve2]);
  const yMax = useMemo(() => {
    const all = [...curve1.logS, ...(curve2?.logS ?? [])].filter(Number.isFinite);
    return Math.min(Math.ceil(Math.max(...all)) + 1, 3);
  }, [curve1, curve2]);

  const logSAt = (curve: { pHs: number[]; logS: number[] }, pH: number) => {
    let best = curve.logS[0];
    let bestD = Math.abs(curve.pHs[0] - pH);
    for (let i = 1; i < curve.pHs.length; i++) {
      const d = Math.abs(curve.pHs[i] - pH);
      if (d < bestD) { bestD = d; best = curve.logS[i]; }
    }
    return best;
  };

  /** U-curve minimum: pH of minimum solubility and log s there (Ord-5a). */
  const minSolubility = useMemo(() => {
    let minIdx = 0;
    for (let i = 1; i < curve1.logS.length; i++) {
      if (Number.isFinite(curve1.logS[i]) && curve1.logS[i] < curve1.logS[minIdx]) minIdx = i;
    }
    return { pH: curve1.pHs[minIdx], logS: curve1.logS[minIdx] };
  }, [curve1]);

  /** Minimum is interior (true U-curve) when it does not fall at the range endpoints. */
  const minHasInterior = minSolubility.pH > 0.3 && minSolubility.pH < 13.7;

  /** pH where the U-curve recrosses the threshold (amphoteric re-dissolution). */
  const redissolutionPH = useMemo(() => {
    if (s.m1.logBetasOH.length === 0) return null;
    let minIdx = 0;
    for (let i = 1; i < curve1.logS.length; i++) {
      if (curve1.logS[i] < curve1.logS[minIdx]) minIdx = i;
    }
    for (let i = minIdx + 1; i < curve1.logS.length; i++) {
      if (curve1.logS[i] >= logSThreshold) return curve1.pHs[i];
    }
    return null;
  }, [curve1, s.m1.logBetasOH, logSThreshold]);

  // ── Shapes and traces ─────────────────────────────────────────────────────

  const shapes = useMemo<Partial<Shape>[]>(() => {
    const out: Partial<Shape>[] = [
      {
        type: 'line', x0: 0, x1: 14, y0: logSThreshold, y1: logSThreshold,
        line: { color: C_THRESH, width: 1.5, dash: 'dot' },
      },
    ];
    if (selectiveWindow) {
      out.push({
        type: 'rect',
        x0: selectiveWindow[0], x1: selectiveWindow[1],
        y0: yMin - 99, y1: yMax + 99,
        fillcolor: C_WIN, line: { width: 0 },
        layer: 'below',
      });
    }
    out.push({
      type: 'line', x0: s.operatingPH, x1: s.operatingPH, y0: yMin - 99, y1: yMax + 99,
      line: { color: '#CC79A7', width: 1.5, dash: 'dashdot' },
    });
    if (redissolutionPH !== null) {
      out.push({
        type: 'line', x0: redissolutionPH, x1: redissolutionPH, y0: yMin - 99, y1: yMax + 99,
        line: { color: '#7F8C8D', width: 1.5, dash: 'dot' },
      });
    }
    // U-curve minimum marker (minimum solubility), only when interior
    if (minHasInterior) {
      out.push({
        type: 'line', x0: minSolubility.pH, x1: minSolubility.pH, y0: yMin - 99, y1: minSolubility.logS,
        line: { color: '#009E73', width: 1.5, dash: 'dash' },
      });
    }
    return out;
  }, [logSThreshold, s.operatingPH, selectiveWindow, redissolutionPH, yMin, yMax, minHasInterior, minSolubility]);

  const traces = useMemo<Data[]>(() => {
    const out: Data[] = [
      {
        x: curve1.pHs, y: curve1.logS, type: 'scatter', mode: 'lines',
        name: `log s (${s.m1.formula})`,
        line: { width: 3, color: C1 },
        hovertemplate: `log s = %{y:.2f}<extra>${s.m1.formula}</extra>`,
      },
    ];
    if (curve2) {
      out.push({
        x: curve2.pHs, y: curve2.logS, type: 'scatter', mode: 'lines',
        name: `log s (${s.m2.formula})`,
        line: { width: 2.5, color: C2, dash: 'dot' },
        hovertemplate: `log s = %{y:.2f}<extra>${s.m2.formula}</extra>`,
      });
    }
    return out;
  }, [curve1, curve2, s.m1.formula, s.m2.formula]);

  // ── Separation verdict ────────────────────────────────────────────────────

  const verdict = useMemo(() => {
    if (!s.showM2) return null;
    if (selectiveWindow) {
      const w = selectiveWindow[1] - selectiveWindow[0];
      return { text: t('solubilidadCondicional.separationPossible', { w: w.toFixed(1) }), ok: true };
    }
    if (pH1precip !== null && pH2precip !== null && pH1precip >= pH2precip) {
      return { text: t('solubilidadCondicional.m2PrecipitatesFirst'), ok: false };
    }
    return { text: t('solubilidadCondicional.noThresholdReached'), ok: false };
  }, [s.showM2, selectiveWindow, pH1precip, pH2precip, t]);

  const purityAtM1Precip = useMemo(() => {
    if (!s.showM2 || pH1precip === null || !curve2) return null;
    const s1 = Math.pow(10, logSAt(curve1, pH1precip));
    const s2 = Math.pow(10, logSAt(curve2, pH1precip));
    if (s1 + s2 <= 0) return null;
    return 100 * s1 / (s1 + s2);
  }, [s.showM2, pH1precip, curve1, curve2]);

  const coprecipAtOp = useMemo(() => {
    if (!s.showM2 || !curve2) return null;
    const logS1 = logSAt(curve1, s.operatingPH);
    const logS2 = logSAt(curve2, s.operatingPH);
    const s1 = Math.pow(10, logS1);
    const s2 = Math.pow(10, logS2);
    if (s1 + s2 <= 0) return null;
    return {
      logS1, logS2, s1, s2,
      purityM1: 100 * s1 / (s1 + s2),
      fracM2: 100 * s2 / (s1 + s2),
    };
  }, [s.showM2, s.operatingPH, curve1, curve2]);

  const pxCurve = useMemo(() => {
    if (!s.showPX) return null;
    const salt = {
      id: 'custom', name: s.m1.label, formula: s.m1.formula,
      pKsp: s.m1.pKsp, m: 1, x: s.m1.n,
      anionLabel: 'OH⁻', cationLabel: s.m1.label,
      zCation: s.m1.n, zAnion: 1,
    };
    return solubilityPXCurve(salt, s.pHForPX, s.logBetasX, 0, 14, 400, 0, s.ionicStrength);
  }, [s.showPX, s.m1, s.pHForPX, s.logBetasX, s.ionicStrength]);

  // ── Database items ────────────────────────────────────────────────────────

  const groupLabels: Record<string, string> = {
    trivalentAcidic: t('solubilidadCondicional.groupTrivalentAcidic'),
    divalentIntermediate: t('solubilidadCondicional.groupDivalentIntermediate'),
    divalentSoluble: t('solubilidadCondicional.groupDivalentSoluble'),
  };
  const dbItems = OH_PRESETS.map((p) => ({
    id: p.id, label: p.formula, detail: `${p.metal} · ${t('titulacion.pKspShort')} ${p.pKsp}`, group: groupLabels[p.group] ?? p.group,
  }));

  // ── pKsp' = f(pH) curve ───────────────────────────────────────────────────

  const pKspCurve1 = useMemo(() => {
    // Apply DH correction: pKsp_app = pKsp + logγ(n, I) + n·logγ(1, I)
    const pKspApp = s.ionicStrength > 0
      ? s.m1.pKsp + logActivityCoefficient(s.m1.n, s.ionicStrength) + s.m1.n * logActivityCoefficient(1, s.ionicStrength)
      : s.m1.pKsp;
    const N = 300;
    const pHs: number[] = [];
    const pKsps: number[] = [];
    for (let i = 0; i <= N; i++) {
      const pH = 14 * i / N;
      const logA = Math.log10(alphaOH(s.m1.logBetasOH, pH));
      pHs.push(pH);
      pKsps.push(conditionalPKsp({
        label: s.m1.formula,
        pKsp: pKspApp,
        m: 1,
        x: s.m1.n,
        alphaM: Math.pow(10, logA),
        alphaX: s.showBilateral ? Math.pow(10, s.logAlphaCounterIon) : 1,
      }));
    }
    return { pHs, pKsps, pKspBase: pKspApp };
  }, [s.m1.formula, s.m1.pKsp, s.m1.n, s.m1.logBetasOH, s.ionicStrength, s.showBilateral, s.logAlphaCounterIon]);

  const pKspCurve2 = useMemo(() => {
    if (!s.showM2) return null;
    const pKspApp = s.ionicStrength > 0
      ? s.m2.pKsp + logActivityCoefficient(s.m2.n, s.ionicStrength) + s.m2.n * logActivityCoefficient(1, s.ionicStrength)
      : s.m2.pKsp;
    const N = 300;
    const pHs: number[] = [];
    const pKsps: number[] = [];
    for (let i = 0; i <= N; i++) {
      const pH = 14 * i / N;
      const logA = Math.log10(alphaOH(s.m2.logBetasOH, pH));
      pHs.push(pH);
      pKsps.push(conditionalPKsp({
        label: s.m2.formula,
        pKsp: pKspApp,
        m: 1,
        x: s.m2.n,
        alphaM: Math.pow(10, logA),
        alphaX: s.showBilateral ? Math.pow(10, s.logAlphaCounterIon) : 1,
      }));
    }
    return { pHs, pKsps, pKspBase: pKspApp };
  }, [s.showM2, s.m2.formula, s.m2.pKsp, s.m2.n, s.m2.logBetasOH, s.ionicStrength, s.showBilateral, s.logAlphaCounterIon]);

  const pKspTraces = useMemo(() => {
    const out: import('plotly.js').Data[] = [
      {
        x: pKspCurve1.pHs, y: pKspCurve1.pKsps,
        type: 'scatter', mode: 'lines',
        name: `${t('solubilidadCondicional.pKspPrimeShort')} (${s.m1.formula})`,
        line: { width: 3, color: C1 },
        hovertemplate: `${t('solubilidadCondicional.pKspPrimeShort')} = %{y:.2f}<extra>${s.m1.formula}</extra>`,
      },
      {
        x: pKspCurve1.pHs, y: pKspCurve1.pHs.map(() => pKspCurve1.pKspBase),
        type: 'scatter', mode: 'lines',
        name: s.ionicStrength > 0
          ? t('solubilidadCondicional.pKspRefCorr', { formula: s.m1.formula })
          : t('solubilidadCondicional.pKspRefThermo', { formula: s.m1.formula }),
        line: { width: 1.5, color: C1, dash: 'dot' },
        hovertemplate: `${t('titulacion.pKspShort')} = ${pKspCurve1.pKspBase.toFixed(2)}<extra>${t('solubilidadCondicional.referenceTag')}</extra>`,
      },
    ];
    if (pKspCurve2) {
      out.push({
        x: pKspCurve2.pHs, y: pKspCurve2.pKsps,
        type: 'scatter', mode: 'lines',
        name: `${t('solubilidadCondicional.pKspPrimeShort')} (${s.m2.formula})`,
        line: { width: 2.5, color: C2, dash: 'dot' },
        hovertemplate: `${t('solubilidadCondicional.pKspPrimeShort')} = %{y:.2f}<extra>${s.m2.formula}</extra>`,
      });
    }
    return out;
  }, [pKspCurve1, pKspCurve2, s.m1.formula, s.m2.formula, s.ionicStrength, t]);

  const pKspYMin = useMemo(() => {
    const all = [...pKspCurve1.pKsps, ...(pKspCurve2?.pKsps ?? [])].filter(Number.isFinite);
    return Math.max(Math.floor(Math.min(...all)) - 1, 0);
  }, [pKspCurve1, pKspCurve2]);
  const pKspYMax = Math.max(pKspCurve1.pKspBase, pKspCurve2 ? pKspCurve2.pKspBase : 0) + 3;

  // ── 2D Sillén map (pH–log[M]) for M1 ──────────────────────────────────────
  // logM range mirrors the 1D log-s chart's own yMin/yMax so both tabs read
  // on the same vertical scale. When the side-reaction mask is active, the
  // dissolved ladder gains the masking ligand's own complexes (see
  // solubilityRegimeFractionsMasked); when M2 is shown, its own saturation
  // line is overlaid for a direct visual of the separation window.
  const bareM1 = s.m1.label.replace(/[⁺²³⁴]+$/, '');
  const map2DLabels = useMemo(() => {
    const base = [
      `${s.m1.formula} (s)`,
      s.m1.label,
      ...s.m1.logBetasOH.map((_, j) => `${bareM1}(OH)${toSub(j + 1)}`),
    ];
    if (s.showSideMask && sideStack.auxLigand) {
      const auxLabel = s.side.auxLabel || 'X';
      return [...base, ...sideStack.auxLigand.logBetasL.map((_, k) => `${bareM1}(${auxLabel})${toSub(k + 1)}`)];
    }
    return base;
  }, [s.m1.formula, s.m1.label, s.m1.logBetasOH, bareM1, s.showSideMask, sideStack, s.side.auxLabel]);
  const map2DColors = useMemo(() => ['#94A3B8', ...SPECIES_COLORS], []);
  const grid2D = useMemo(
    () => predominanceGrid(
      s.showSideMask
        ? (pH, logM) => solubilityRegimeFractionsMasked(pH, logM, s.m1.pKsp, s.m1.n, sideStack, s.ionicStrength)
        : (pH, logM) => solubilityRegimeFractions(pH, logM, s.m1.pKsp, s.m1.n, s.m1.logBetasOH, s.ionicStrength),
      [0, 14], [yMin, yMax],
    ),
    [s.m1.pKsp, s.m1.n, s.m1.logBetasOH, s.showSideMask, sideStack, s.ionicStrength, yMin, yMax],
  );
  const map2DOverlay = useMemo(() => {
    if (!curve2) return undefined;
    return {
      points: curve2.pHs.map((pH, i) => ({ x: pH, y: curve2.logS[i] })),
      color: C2,
      label: t('solubilidadCondicional.saturatesLabel', { formula: s.m2.formula }),
    };
  }, [curve2, s.m2.formula, t]);

  // ── Diagrams ──────────────────────────────────────────────────────────────

  const tabs = [
    {
      id: 'logs',
      label: 'log s = f(pH)',
      node: (
        <Chart
          data={traces}
          xTitle="pH"
          yTitle={t('solubilidadCondicional.logSAxisLabel')}
          xRange={[0, 14]}
          yRange={[yMin, yMax]}
          shapes={shapes}
          exportName="equilibria-sol-cond"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'pksp',
      label: `${t('solubilidadCondicional.pKspPrimeShort')} = f(pH)`,
      node: (
        <Chart
          data={pKspTraces}
          xTitle="pH"
          yTitle={t('solubilidadCondicional.pKspAxisLabel')}
          xRange={[0, 14]}
          yRange={[pKspYMin, pKspYMax]}
          exportName="equilibria-pksp-cond"
          exportMetadata={exportMetadata}
        />
      ),
    },
    ...(pxCurve ? [{
      id: 'px',
      label: 'log s = f(pX)',
      node: (
        <Chart
          data={[{
            x: pxCurve.pXs, y: pxCurve.logS, type: 'scatter', mode: 'lines',
            name: `log s (${s.m1.formula})`,
            line: { width: 3, color: '#7c3aed' },
          }]}
          xTitle={`p[${s.ligandX}]`}
          yTitle={t('solubilidadCondicional.logSAxisLabel')}
          xRange={[0, 14]}
          yRange={[yMin, yMax]}
          exportName="equilibria-sol-px"
          exportMetadata={exportMetadata}
        />
      ),
    }] : []),
    {
      id: 'map2d',
      label: t('solubilidadCondicional.tabMap2D'),
      node: (
        <Predominance2D
          grid={grid2D}
          colors={map2DColors}
          labels={map2DLabels}
          xLabel="pH"
          yLabel={`log[${s.m1.label}] total`}
          marker={{ x: minSolubility.pH, y: minSolubility.logS, label: t('solubilidadCondicional.minSolubilityMarker') }}
          caption={t('solubilidadCondicional.map2dCaptionDash', { formula: s.m1.formula })}
          overlayCurve={map2DOverlay}
          exportName="equilibria-sol-map2d"
          exportMetadata={exportMetadata}
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title={t('solubilidadCondicional.title')} onReset={reset} moduleId="solcond" guideId="solcond">
        <PanelSection title={t('solubilidadCondicional.metal1Section')}>
          <ModelBadge
            model={s.m1.logBetasOH.length === 0
              ? t('solubilidadCondicional.simplePrecipitationModel')
              : t('solubilidadCondicional.complexPrecipitationModel', { n: s.m1.logBetasOH.length })}
            additions={[s.showM2 && t('solubilidadCondicional.selectiveSeparationAddition'), minHasInterior && t('solubilidadCondicional.uCurveAddition')]}
          />
          <DbPanel items={dbItems} onSelect={(id) => setM1({ ...fromPreset(id) })} title={t('solubilidadCondicional.presetsMOHn')} />
          <p className="hint compact-hint">{t('solubilidadCondicional.amphotericPresetsHint')}</p>
          <div className="preset-chip-row preset-chip-row-spaced">
            {ANFOTERO_PRESETS.map((p) => (
              <button type="button" key={p.id} className="preset-chip" onClick={() => applyAnfotero(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <LabelField label={t('solubilidadCondicional.metalLabel')} value={s.m1.label} onChange={(v) => setM1({ label: v })} />
          <LabelField label={t('pourbaix.formulaLabel')} value={s.m1.formula} onChange={(v) => setM1({ formula: v })} />
          <Slider label={t('titulacion.pKspShort')} helpId="pKsp" value={s.m1.pKsp} min={2} max={45} step={0.1} onChange={(v) => setM1({ pKsp: v })} decimals={1} />
          <div className="control">
            <div className="control-header">
              <span className="control-label">{t('solubilidadCondicional.stoichiometryN')}</span>
              <span className="control-value">{s.m1.n}</span>
            </div>
            <div className="segmented control-input">
              {[1, 2, 3].map((n) => (
                <button type="button"
                  key={n}
                  className={s.m1.n === n ? 'seg-btn active' : 'seg-btn'}
                  onClick={() => setM1({ n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <Disclosure
            title={t('solubilidadCondicional.hydroxoComplexesM1Title')}
            open={s.hydroxoOpen}
            onToggle={(open) => setS((p) => ({ ...p, hydroxoOpen: open }))}
          >
            <ConstantList
              prefix="log β(OH)"
              helpId="logBetaOH"
              values={s.m1.logBetasOH}
              onChange={(v) => setM1({ logBetasOH: v })}
              min={-50} max={40} maxItems={5} minItems={0} initialValue={5}
            />
            <p className="hint">{t('solubilidadCondicional.amphotericFormsHint')}</p>
          </Disclosure>
          <Toggle
            label={t('solubilidadCondicional.maskingToggle')}
            checked={s.showSideMask}
            onChange={(v) => setS((p) => ({ ...p, showSideMask: v }))}
          />
          {s.showSideMask && (
            <div className="mask-section">
              <SideReactionEditor
                state={s.side}
                onChange={(side) => setS((p) => ({ ...p, side }))}
                showLigandPKas={false}
              />
            </div>
          )}
        </PanelSection>

        <PanelSection title={t('solubilidadCondicional.compareSecondMetalSection')}>
          <Toggle label={t('solubilidadCondicional.selectiveSeparationToggle')} checked={s.showM2} onChange={(v) => setS((p) => ({ ...p, showM2: v }))} />
          {s.showM2 && (
            <div className="mask-section">
              <DbPanel items={dbItems} onSelect={(id) => setM2({ ...fromPreset(id) })} title={t('solubilidadCondicional.presetsM2')} />
              <LabelField label={t('condicionales.secondMetalLabel')} value={s.m2.label} onChange={(v) => setM2({ label: v })} />
              <LabelField label={t('pourbaix.formulaLabel')} value={s.m2.formula} onChange={(v) => setM2({ formula: v })} />
              <Slider label={t('titulacion.pKspShort')} helpId="pKsp" value={s.m2.pKsp} min={2} max={45} step={0.1} onChange={(v) => setM2({ pKsp: v })} decimals={1} />
              <div className="control">
                <div className="control-header">
                  <span className="control-label">{t('solubilidadCondicional.stoichiometryNShort')}</span>
                  <span className="control-value">{s.m2.n}</span>
                </div>
                <div className="segmented control-input">
                  {[1, 2, 3].map((n) => (
                    <button type="button"
                      key={n}
                      className={s.m2.n === n ? 'seg-btn active' : 'seg-btn'}
                      onClick={() => setM2({ n })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {s.showM2 && (
            <>
              <Toggle label={t('solubilidadCondicional.solidSolutionToggle')} checked={s.showSolidSolution} onChange={(showSolidSolution) => setS((prev) => ({ ...prev, showSolidSolution }))} />
              {s.showSolidSolution && (
                <>
                  <Slider label={t('solubilidadCondicional.solidMoleFraction')} value={s.solidXA} min={0} max={1} step={0.01} decimals={2} onChange={(solidXA) => setS((prev) => ({ ...prev, solidXA }))} />
                  <Slider label={t('solubilidadCondicional.solidInteraction')} value={s.solidInteraction} min={0} max={6} step={0.1} decimals={1} onChange={(solidInteraction) => setS((prev) => ({ ...prev, solidInteraction }))} />
                </>
              )}
            </>
          )}
          <Toggle
            label={t('solubilidadCondicional.stagePlannerToggle')}
            checked={s.showStagePlanner}
            onChange={(v) => setS((p) => ({ ...p, showStagePlanner: v }))}
          />
          {s.showStagePlanner && (
            <Disclosure title={t('solubilidadCondicional.thirdCandidateTitle')} defaultOpen>
              <ConcSlider label={t('solubilidadCondicional.totalPrecipitantLabel')} value={s.cPrecipitant} onChange={(v) => setS((p) => ({ ...p, cPrecipitant: v }))} min={-5} max={0} />
              <DbPanel items={dbItems} onSelect={(id) => setM3({ ...fromPreset(id) })} title={t('solubilidadCondicional.presetsM3')} />
              <LabelField label={t('solubilidadCondicional.thirdMetalLabel')} value={s.m3.label} onChange={(v) => setM3({ label: v })} />
              <LabelField label={t('pourbaix.formulaLabel')} value={s.m3.formula} onChange={(v) => setM3({ formula: v })} />
              <Slider label={t('titulacion.pKspShort')} helpId="pKsp" value={s.m3.pKsp} min={2} max={45} step={0.1} onChange={(v) => setM3({ pKsp: v })} decimals={1} />
              {precipitationStages.map((stage, index) => (
                <Slider
                  key={stage.label}
                  label={t('solubilidadCondicional.stagePHLabel', { n: index + 1, formula: stage.label })}
                  value={stagePHs[index] ?? stage.freePrecipitantOnset}
                  min={0}
                  max={14}
                  step={0.1}
                  decimals={1}
                  onChange={(value) => {
                    const next = precipitationStages.map((_, stageIndex) => stagePHs[stageIndex] ?? precipitationStages[stageIndex].freePrecipitantOnset);
                    next[index] = value;
                    setS((prev) => ({ ...prev, stageTargetPHs: next }));
                  }}
                />
              ))}
            </Disclosure>
          )}
        </PanelSection>

        <PanelSection title={t('solubilidadCondicional.thresholdOperationSection')}>
          <Slider
            label={t('complejos.ionicStrengthLabel')}
            helpId="ionicStrength"
            value={s.ionicStrength}
            min={0} max={0.5} step={0.01}
            onChange={(v) => setS((p) => ({ ...p, ionicStrength: v }))}
            decimals={2}
          />
          <Toggle
            label={t('solubilidadCondicional.bilateralConditionalToggle')}
            checked={s.showBilateral}
            onChange={(v) => setS((p) => ({ ...p, showBilateral: v }))}
          />
          {s.showBilateral && (
            <div className="mask-section">
              <Slider
                label={t('solubilidadCondicional.logAlphaCounterIonLabel')}
                value={s.logAlphaCounterIon}
                min={0}
                max={8}
                step={0.1}
                onChange={(v) => setS((p) => ({ ...p, logAlphaCounterIon: v }))}
                decimals={1}
              />
              <p className="hint">{t('solubilidadCondicional.bilateralConditionalHint')}</p>
            </div>
          )}
          <Toggle
            label={t('solubilidadCondicional.thresholdFromConcToggle')}
            checked={s.useCThreshold}
            onChange={(v) => setS((p) => ({ ...p, useCThreshold: v }))}
          />
          {s.useCThreshold ? (
            <ConcSlider label={t('solubilidadCondicional.analyticalCLabel')} value={s.cAnalytic} onChange={(v) => setS((p) => ({ ...p, cAnalytic: v }))} min={-4} max={-1} />
          ) : (
            <Slider
              label={t('solubilidadCondicional.logSThresholdLabel')}
              value={s.logSThreshold}
              min={-10}
              max={-1}
              step={0.5}
              onChange={(v) => setS((p) => ({ ...p, logSThreshold: v }))}
              decimals={1}
            />
          )}
          <Slider
            label={t('solubilidadCondicional.operatingPHLabel')}
            value={s.operatingPH}
            min={0}
            max={14}
            step={0.1}
            onChange={(v) => setS((p) => ({ ...p, operatingPH: v }))}
            decimals={1}
          />
          <p className="hint">
            {t('solubilidadCondicional.thresholdHint', { v: s.logSThreshold.toFixed(0) })}
          </p>
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')}>
        <ResultCard items={[
          {
            label: t('solubilidadCondicional.pHWherePrecipitates', { formula: s.m1.formula }),
            value: pH1precip !== null ? `pH ${pH1precip.toFixed(1)}` : t('solubilidadCondicional.doesNotReachThreshold'),
          },
          ...(minHasInterior ? [{
            label: t('solubilidadCondicional.minSolubilityOf', { formula: s.m1.formula }),
            value: `pH ${minSolubility.pH.toFixed(1)} · log s ${minSolubility.logS.toFixed(2)}`,
          }] : []),
          ...(s.showM2 ? [{
            label: t('solubilidadCondicional.pHWherePrecipitates', { formula: s.m2.formula }),
            value: pH2precip !== null ? `pH ${pH2precip.toFixed(1)}` : t('solubilidadCondicional.doesNotReachThreshold'),
          }] : []),
          ...(selectiveWindow ? [{
            label: t('solubilidadCondicional.selectiveWindowLabel'),
            value: `pH ${selectiveWindow[0].toFixed(1)}–${selectiveWindow[1].toFixed(1)}`,
          }] : []),
          ...(verdict ? [{ label: t('solubilidadCondicional.verdictLabel'), value: verdict.text }] : []),
          ...(purityAtM1Precip !== null ? [{
            label: t('solubilidadCondicional.theoreticalPurityLabel'),
            value: t('solubilidadCondicional.purityValueTemplate', { v: purityAtM1Precip.toFixed(1), ph: pH1precip!.toFixed(1) }),
          }] : []),
          ...(redissolutionPH !== null ? [{
            label: t('solubilidadCondicional.redissolutionOf', { formula: s.m1.formula }),
            value: t('solubilidadCondicional.redissolutionValueTemplate', { v: redissolutionPH.toFixed(1) }),
          }] : []),
          ...(s.showStagePlanner && precipitationStages.length > 0 ? [{
            label: t('solubilidadCondicional.precipitationOrderLabel'),
            value: precipitationStages
              .map((stage, index) => `${index + 1}. ${stage.label} (pH ${stage.freePrecipitantOnset.toFixed(1)})`)
              .join(' → '),
          }] : []),
          ...(sequentialStages ? sequentialStages.map((stage, index) => ({
            label: t('solubilidadCondicional.stageRecoveryLabel', { n: index + 1, ph: stage.operatingPH.toFixed(1) }),
            value: plannerMetals
              .map((metal, metalIndex) => `${metal.formula}: ${(100 * stage.result.precipitatedFormulaMoles[metalIndex] / s.cAnalytic).toFixed(1)}%`)
              .join(' · '),
          })) : []),
          ...(sharedPool ? [{
            label: t('solubilidadCondicional.sharedPoolRecoveryLabel'),
            value: [s.m1, ...(s.showM2 ? [s.m2] : []), s.m3]
              .map((metal, index) => `${metal.formula}: ${(100 * sharedPool.precipitatedFormulaMoles[index] / s.cAnalytic).toFixed(1)}%`)
              .join(' · '),
          }, {
            label: t('solubilidadCondicional.freePrecipitantLabel'),
            value: sharedPool.freePrecipitant.toExponential(3),
          }] : []),
          ...(coprecipAtOp ? [
            {
              label: t('solubilidadCondicional.logS1AtPH', { ph: s.operatingPH.toFixed(1) }),
              value: coprecipAtOp.logS1.toFixed(2),
            },
            {
              label: t('solubilidadCondicional.logS2AtPH', { ph: s.operatingPH.toFixed(1) }),
              value: coprecipAtOp.logS2.toFixed(2),
            },
            {
              label: t('solubilidadCondicional.purityM1Operating'),
              value: t('solubilidadCondicional.purityOperatingValueTemplate', { v: coprecipAtOp.purityM1.toFixed(1), v2: coprecipAtOp.fracM2.toFixed(2) }),
            },
          ] : []),
          ...(s.showM2 && s.showSolidSolution ? [{
            label: t('solubilidadCondicional.solidSolutionDissolvedRatio'),
            value: (solidSolution.aqueousB / Math.max(solidSolution.aqueousA, 1e-300)).toExponential(3),
          }, {
            label: t('solubilidadCondicional.miscibilityGap'),
            value: hasRegularSolutionMiscibilityGap(s.solidInteraction) ? t('solubilidadCondicional.possible') : t('solubilidadCondicional.noIdealGap'),
          }] : []),
        ]} />
        </PanelSection>

        <Disclosure
          title={t('solubilidadCondicional.complexantEffectSection')}
          open={s.showPX}
          onToggle={(showPX) => setS((p) => ({ ...p, showPX }))}
        >
          <div className="mask-section">
              <LabelField label={t('solubilidadCondicional.complexantXLabel')} value={s.ligandX} onChange={(v) => setS((p) => ({ ...p, ligandX: v }))} />
              <Slider label={t('complejos.fixedPHLabel')} value={s.pHForPX} min={0} max={14} step={0.1} onChange={(v) => setS((p) => ({ ...p, pHForPX: v }))} decimals={1} />
              <ConstantList
                prefix="log β(X)"
                helpId="logBeta"
                values={s.logBetasX}
                onChange={(v) => setS((p) => ({ ...p, logBetasX: v }))}
                min={0} max={25} maxItems={6}
              />
          </div>
        </Disclosure>

        <InfoBox title={t('solubilidadCondicional.infoBoxTitle')}>
          <p>
            {t('solubilidadCondicional.para1Prefix')}<code>{t('solubilidadCondicional.para1Code')}</code>
            {t('solubilidadCondicional.para1Mid')}<strong>{t('solubilidadCondicional.selectivelyPrecipitateBold')}</strong>{t('solubilidadCondicional.para1Suffix')}
          </p>
          <p>
            {t('solubilidadCondicional.para2Prefix')}<strong>{t('solubilidadCondicional.amphotericBold')}</strong>{t('solubilidadCondicional.para2Suffix')}
          </p>
          <p>
            <strong>{t('solubilidadCondicional.map2dBold')}</strong>
            {t('solubilidadCondicional.para3Rest', { formula: s.m1.formula, aux: s.side.auxLabel || 'X' })}
            {s.showM2 && t('solubilidadCondicional.para3M2Suffix', { m2Formula: s.m2.formula, m1Formula: s.m1.formula })}
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={tabs} initialId="logs" />
        <ResultCardRow items={[
          {
            label: t('solubilidadCondicional.formulaPrecipitates', { formula: s.m1.formula }),
            value: pH1precip !== null ? `pH ${pH1precip.toFixed(1)}` : '—',
            accent: true,
          },
          ...(minHasInterior
            ? [{ label: t('solubilidadCondicional.minSolubilityShort'), value: `pH ${minSolubility.pH.toFixed(1)}` }]
            : []),
          ...(selectiveWindow
            ? [{ label: t('solubilidadCondicional.selectiveWindowLabel'), value: `${selectiveWindow[0].toFixed(1)}–${selectiveWindow[1].toFixed(1)}` }]
            : []),
        ]} />
      </section>
    </div>
  );
}
