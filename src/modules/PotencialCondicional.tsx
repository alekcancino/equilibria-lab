// Conditional potential E°' = f(pH).
// Shows how the formal potential changes with pH due to H⁺ in the half-reaction.
// Slope is −0.05916·mH/n V/pH.
//
// Capabilities beyond the Redox module (which works at fixed pH):
//   1. E°' = f(pH) as a continuous curve — crossover between couples visible.
//   2. Crossover pH: the pH at which spontaneity predictions reverse.
//   3. Disproportionation: the intermediate species in a Latimer diagram is unstable
//      when E°'(right) > E°'(left).

import { useCallback, useMemo } from 'react';
import { useShareableState } from '../hooks/useShareableState';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { InfoBox, ModelBadge, ResultCard, Slider, Toggle, ConstantList, LabelField, PanelSection, ResultCardRow, Disclosure } from '../components/Controls';
import { CoupleEditor, SideReactionEditor } from '../components/Editors';
import { coupleFromPreset, type CoupleState } from '../lib/editorModels';
import { NERNST_S, conditionalEprime } from '../lib/redox';
import { SPECIES_COLORS } from '../lib/database';
import { alphaH, alphaL } from '../lib/conditional';
import {
  defaultSideEditorState, electrodePotential, e0PrimeAtPH, sideStackFromEditor,
} from '../lib/sideReactions';

const S = NERNST_S;     // 0.05916 V
const PH_POINTS = 400;

// ── Utilities ─────────────────────────────────────────────────────────────────

/** E°'(pH) for a couple with mH protons in its n-electron half-reaction. */
function Eprime(c: CoupleState, pH: number): number {
  return c.E0 - S * (c.mH / c.n) * pH;
}

/**
 * pH where E°'₁ = E°'₂ (intersection of the two lines).
 * Returns null if the lines are parallel or the crossing falls outside [0, 14].
 */
function crossoverPH(c1: CoupleState, c2: CoupleState): number | null {
  const slope1 = -S * c1.mH / c1.n;
  const slope2 = -S * c2.mH / c2.n;
  const dSlope = slope2 - slope1;
  if (Math.abs(dSlope) < 1e-9) return null; // parallel lines
  const pH = (c1.E0 - c2.E0) / dSlope;
  return pH >= 0 && pH <= 14 ? pH : null;
}

/**
 * Every pH where two ALREADY-SAMPLED E°'(pH) curves cross, by linear
 * interpolation at each sign change of (Es1 − Es2), ascending pH. A linear
 * (uncomplexed) couple crosses another line at most once, but once
 * complexation bends a curve it can cross more than once — callers that only
 * want "the" crossover take index 0, but should also check `.length > 1` to
 * warn the user rather than silently dropping later crossings.
 */
function numericCrossings(pHs: number[], Es1: number[], Es2: number[]): number[] {
  const crossings: number[] = [];
  for (let i = 1; i < pHs.length; i++) {
    const d0 = Es1[i - 1] - Es2[i - 1];
    const d1 = Es1[i] - Es2[i];
    if (d0 === 0) {
      crossings.push(pHs[i - 1]);
    } else if ((d0 > 0) !== (d1 > 0)) {
      const t = d0 / (d0 - d1);
      crossings.push(pHs[i - 1] + t * (pHs[i] - pHs[i - 1]));
    }
  }
  return crossings;
}

function numericCrossover(pHs: number[], Es1: number[], Es2: number[]): number | null {
  return numericCrossings(pHs, Es1, Es2)[0] ?? null;
}

// ── Colors ────────────────────────────────────────────────────────────────────

const C1 = SPECIES_COLORS[0]; // orange
const C2 = SPECIES_COLORS[1]; // blue
const C3 = SPECIES_COLORS[2]; // green

// ── State ─────────────────────────────────────────────────────────────────────

function defaultState() {
  return {
    couple1: coupleFromPreset('mno4'),
    couple2: coupleFromPreset('fe'),
    showCouple3: false,
    couple3: coupleFromPreset('cu1'),
    pH: 2,
    // E°'=f(pH) with complexation on par 1 (Ox and/or Red hydrolyze or bind
    // an auxiliary ligand) — reuses the same composeAlphas machinery as
    // ConstantesCondicionales.tsx, applied per redox state instead of per
    // metal/ligand. Off by default: curve stays the plain proton-only line.
    showComplexPH1: false,
    oxSide1: defaultSideEditorState(),
    redSide1: defaultSideEditorState(),
    // E°' = f(pX): effect of ligand X on the couple's potential
    pxE0: 0.771,          // E° Fe³⁺/Fe²⁺ por defecto
    pxN: 1,
    pxOxLabel: 'Fe³⁺',
    pxRedLabel: 'Fe²⁺',
    pxLigandLabel: 'F⁻',
    pxLogBetasOx: [5.28, 9.30, 12.06],   // FeF²⁺, FeF₂⁺, FeF₃
    pxLogBetasRed: [1.0],                  // FeF⁺ (weak)
    showPX: false,
    // pX′ condicional: X itself protonates (e.g. NH₃/NH₄⁺) — the axis shifts
    // from free [X] to total analytical X at a fixed pH.
    showPXPrime: false,
    pxPKasX: [9.25],
    pxPHFixed: 7,
    showElectrode: false,
    e0Metal: 0.25,
    nElectrode: 2,
    mHElectrode: 0,
    pMPrimeTarget: 4,
    pHElectrode: 10,
    sideElectrode: defaultSideEditorState(),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PotencialCondicional() {
  const [st, setSt] = useShareableState('potencialcond', defaultState());

  const set = <K extends keyof ReturnType<typeof defaultState>>(
    k: K, v: ReturnType<typeof defaultState>[K]
  ) => setSt((p) => ({ ...p, [k]: v }));

  function reset() { setSt(defaultState()); }

  const exportMetadata = useMemo(() => ({
    Módulo: 'Potencial condicional',
    'Par 1': st.couple1.name,
    'Par 2': st.couple2.name,
    ...(st.showCouple3 ? { 'Par 3': st.couple3.name } : {}),
    pH: st.pH.toFixed(1),
    ...(st.showComplexPH1 ? { 'Complejación par 1': 'activa (ver panel Complejación del par 1)' } : {}),
  }), [st.couple1.name, st.couple2.name, st.showCouple3, st.couple3.name, st.pH, st.showComplexPH1]);

  // ── E°' = f(pH) curves ────────────────────────────────────────────────────

  const pHs = useMemo(() => Array.from({ length: PH_POINTS + 1 }, (_, i) => 14 * i / PH_POINTS), []);

  const oxStack1 = useMemo(
    () => (st.showComplexPH1 ? sideStackFromEditor(st.oxSide1) : undefined),
    [st.showComplexPH1, st.oxSide1],
  );
  const redStack1 = useMemo(
    () => (st.showComplexPH1 ? sideStackFromEditor(st.redSide1) : undefined),
    [st.showComplexPH1, st.redSide1],
  );
  // conditionalEprime(couple, pH, undefined, undefined) === Eprime(couple, pH)
  // exactly (tested), so par 1 always goes through it — no branching needed.
  const E1s = useMemo(
    () => pHs.map((pH) => conditionalEprime(st.couple1, pH, oxStack1, redStack1)),
    [pHs, st.couple1, oxStack1, redStack1],
  );
  const E2s = useMemo(() => pHs.map((pH) => Eprime(st.couple2, pH)), [pHs, st.couple2]);
  const E3s = useMemo(
    () => st.showCouple3 ? pHs.map((pH) => Eprime(st.couple3, pH)) : null,
    [pHs, st.couple3, st.showCouple3],
  );

  // ── Crossover ─────────────────────────────────────────────────────────────
  // Complexation makes par 1's curve non-linear, so any crossing involving it
  // needs the numeric (sampled) crossing instead of the closed-form line
  // intersection — cross23 (par 2 vs par 3) is never affected by par 1.

  const cross12 = useMemo(
    () => (st.showComplexPH1 ? numericCrossover(pHs, E1s, E2s) : crossoverPH(st.couple1, st.couple2)),
    [st.showComplexPH1, pHs, E1s, E2s, st.couple1, st.couple2],
  );
  const cross13 = useMemo(() => {
    if (!st.showCouple3) return null;
    if (st.showComplexPH1) return E3s ? numericCrossover(pHs, E1s, E3s) : null;
    return crossoverPH(st.couple1, st.couple3);
  }, [st.showCouple3, st.showComplexPH1, pHs, E1s, E3s, st.couple1, st.couple3]);
  const cross23 = useMemo(
    () => st.showCouple3 ? crossoverPH(st.couple2, st.couple3) : null,
    [st.couple2, st.couple3, st.showCouple3],
  );
  // Only the numeric (complexation-active) path can cross more than once —
  // surface it so "the crossover" doesn't silently understate the curve.
  const cross12HasMore = useMemo(
    () => (st.showComplexPH1 ? numericCrossings(pHs, E1s, E2s).length > 1 : false),
    [st.showComplexPH1, pHs, E1s, E2s],
  );
  const cross13HasMore = useMemo(
    () => (st.showComplexPH1 && st.showCouple3 && E3s ? numericCrossings(pHs, E1s, E3s).length > 1 : false),
    [st.showComplexPH1, st.showCouple3, pHs, E1s, E3s],
  );

  // ── E°' at the cursor pH ──────────────────────────────────────────────────

  const E1cur = conditionalEprime(st.couple1, st.pH, oxStack1, redStack1);
  const E2cur = Eprime(st.couple2, st.pH);
  const E3cur = st.showCouple3 ? Eprime(st.couple3, st.pH) : null;

  // ── Spontaneous reaction ──────────────────────────────────────────────────

  const couples = [
    { c: st.couple1, E: E1cur },
    { c: st.couple2, E: E2cur },
    ...(st.showCouple3 && E3cur !== null ? [{ c: st.couple3, E: E3cur }] : []),
  ].sort((a, b) => b.E - a.E); // sorted by E°' descending

  const strongest = couples[0]; // strongest oxidant (highest E°')
  const weakest = couples[couples.length - 1]; // strongest reductant (lowest E°')
  const pe1cur = E1cur / S;
  const pe2cur = E2cur / S;
  const logKcur = st.couple1.n * st.couple2.n * Math.abs(pe1cur - pe2cur);

  const electrodeE = useMemo(() => {
    if (!st.showElectrode) return null;
    const e0p = e0PrimeAtPH(st.e0Metal, st.mHElectrode, st.nElectrode, st.pHElectrode);
    return electrodePotential(e0p, st.nElectrode, st.pMPrimeTarget);
  }, [st.showElectrode, st.e0Metal, st.mHElectrode, st.nElectrode, st.pHElectrode, st.pMPrimeTarget]);

  // ── Disproportionation: couple 1 (Ox/Int) and couple 3 (Int/Red) in Latimer diagram ─

  const dismutationActive = st.showCouple3 && E3cur !== null && E3cur > E1cur;

  // ── Dynamic Y range ───────────────────────────────────────────────────────

  const allE = [...E1s, ...E2s, ...(E3s ?? [])].filter(Number.isFinite);
  const eMin = Math.floor(Math.min(...allE) * 10) / 10 - 0.1;
  const eMax = Math.ceil(Math.max(...allE) * 10) / 10 + 0.1;

  // ── Shapes and annotations ────────────────────────────────────────────────

  const logKShapes = useMemo<Partial<Shape>[]>(() => {
    const out: Partial<Shape>[] = [
      // pH cursor
      {
        type: 'line', x0: st.pH, x1: st.pH, y0: eMin - 10, y1: eMax + 10,
        line: { color: '#CC79A7', width: 1.5, dash: 'dashdot' },
      },
    ];
    // vertical line at crossover 1–2 — must read couple1's ACTUAL curve
    // (conditionalEprime, not the plain line) once complexation bends it.
    if (cross12 !== null) {
      out.push({
        type: 'line', x0: cross12, x1: cross12, y0: eMin - 10,
        y1: conditionalEprime(st.couple1, cross12, oxStack1, redStack1) + 0.05,
        line: { color: '#aaaaaa', width: 1, dash: 'dot' },
      });
    }
    return out;
  }, [st.pH, cross12, eMin, eMax, st.couple1, oxStack1, redStack1]);

  const logKAnnotations = useMemo<Partial<Annotations>[]>(() => {
    const out: Partial<Annotations>[] = [
      {
        x: st.pH, y: eMax + 0.05,
        text: `pH ${st.pH.toFixed(1)}`,
        showarrow: false, font: { size: 11, color: '#CC79A7' },
      },
    ];
    if (cross12 !== null) {
      out.push({
        x: cross12, y: conditionalEprime(st.couple1, cross12, oxStack1, redStack1),
        text: `×  pH ${cross12.toFixed(1)}`,
        showarrow: false,
        font: { size: 11, color: '#7F8C8D' },
        bgcolor: '#fff', borderpad: 3,
      });
    }
    return out;
  }, [st.pH, cross12, eMax, st.couple1, oxStack1, redStack1]);

  // ── E°' = f(pH) traces ────────────────────────────────────────────────────

  const Eprimetraces = useMemo<Data[]>(() => {
    const t: Data[] = [
      {
        x: pHs, y: E1s, type: 'scatter', mode: 'lines',
        name: `E°' ${st.couple1.ox}/${st.couple1.red}`,
        line: { width: 3, color: C1 },
        hovertemplate: `E°' = %{y:.3f} V<extra>${st.couple1.ox}/${st.couple1.red}</extra>`,
      },
      {
        x: pHs, y: E2s, type: 'scatter', mode: 'lines',
        name: `E°' ${st.couple2.ox}/${st.couple2.red}`,
        line: { width: 3, color: C2 },
        hovertemplate: `E°' = %{y:.3f} V<extra>${st.couple2.ox}/${st.couple2.red}</extra>`,
      },
    ];
    if (E3s) {
      t.push({
        x: pHs, y: E3s, type: 'scatter', mode: 'lines',
        name: `E°' ${st.couple3.ox}/${st.couple3.red}`,
        line: { width: 2.5, color: C3, dash: 'dot' },
        hovertemplate: `E°' = %{y:.3f} V<extra>${st.couple3.ox}/${st.couple3.red}</extra>`,
      });
    }
    return t;
  }, [pHs, E1s, E2s, E3s, st.couple1, st.couple2, st.couple3]);

  // ── Conditional scale (visual, at cursor pH) ──────────────────────────────

  const escalaTraces = useMemo<Data[]>(() => {
    const cs = [
      { c: st.couple1, E: E1cur, color: C1, y: 1 },
      { c: st.couple2, E: E2cur, color: C2, y: 2 },
      ...(st.showCouple3 && E3cur !== null ? [{ c: st.couple3, E: E3cur, color: C3, y: 3 }] : []),
    ];
    return cs.map(({ c, E, color, y }) => ({
      x: [E / S], y: [y], type: 'scatter', mode: 'markers',
      name: `${c.ox}/${c.red}`,
      marker: { size: 16, color, symbol: 'line-ns', line: { width: 3, color } },
      hovertemplate: `pe°′ = ${(E/S).toFixed(2)} · E°′ = ${E.toFixed(3)} V<extra>${c.ox}/${c.red}</extra>`,
    }));
  }, [st.couple1, st.couple2, st.couple3, E1cur, E2cur, E3cur, st.showCouple3]);

  const escalaAnnotations = useMemo<Partial<Annotations>[]>(() => {
    const cs = [
      { c: st.couple1, E: E1cur, color: C1, y: 1 },
      { c: st.couple2, E: E2cur, color: C2, y: 2 },
      ...(st.showCouple3 && E3cur !== null ? [{ c: st.couple3, E: E3cur, color: C3, y: 3 }] : []),
    ];
    return cs.flatMap(({ c, E, color, y }) => [
      { x: E / S, y: y + 0.32, text: `<b>${c.ox}</b>`, showarrow: false, font: { size: 12, color } },
      { x: E / S, y: y - 0.32, text: `<b>${c.red}</b>`, showarrow: false, font: { size: 12, color } },
    ]);
  }, [st.couple1, st.couple2, st.couple3, E1cur, E2cur, E3cur, st.showCouple3]);

  const escalaN = st.showCouple3 ? 3 : 2;
  const escalaPeMin = Math.min(E1cur, E2cur, ...(E3cur !== null ? [E3cur] : [])) / S - 5;
  const escalaPeMax = Math.max(E1cur, E2cur, ...(E3cur !== null ? [E3cur] : [])) / S + 5;
  const escalaShapes = useMemo<Partial<Shape>[]>(
    () => Array.from({ length: escalaN }, (_, i) => ({
      type: 'line', x0: escalaPeMin, x1: escalaPeMax, y0: i + 1, y1: i + 1,
      line: { color: '#e8ecef', width: 1 },
    })),
    [escalaN, escalaPeMin, escalaPeMax],
  );

  // ── E°' = f(pX) ───────────────────────────────────────────────────────────

  const PX_POINTS = 400;
  const pXs = useMemo(() => Array.from({ length: PX_POINTS + 1 }, (_, i) => 14 * i / PX_POINTS), []);

  const EpxCurve = useMemo(() => pXs.map((pX) => {
    const X = Math.pow(10, -pX);
    const aOx = alphaL(st.pxLogBetasOx, X);
    const aRed = alphaL(st.pxLogBetasRed, X);
    // E°' = E° + (S/n) · log(α_Red / α_Ox)
    return st.pxE0 + (S / st.pxN) * Math.log10(aRed / aOx);
  }), [pXs, st.pxE0, st.pxN, st.pxLogBetasOx, st.pxLogBetasRed]);

  // pX′ condicional (Baeza §2.8.1): X itself protonates (e.g. NH₃/NH₄⁺), so
  // the analytical (total) concentration needed for a given FREE [X] is
  // cX_total = [X]_free · α_X(H) ⇒ pX′ = pX_free − log(α_X(H)). The shift is
  // constant at a fixed pH (same pattern as Complejos.tsx's scaleX for pL′).
  const alphaXH = useMemo(
    () => (st.showPXPrime ? alphaH(st.pxPKasX, st.pxPHFixed) : 1),
    [st.showPXPrime, st.pxPKasX, st.pxPHFixed],
  );
  const scalePX = useCallback((pX: number) => pX - Math.log10(alphaXH), [alphaXH]);
  const pxAxisLabel = st.showPXPrime
    ? `pX′ condicional (pH ${st.pxPHFixed.toFixed(1)})`
    : `p[${st.pxLigandLabel}]`;

  const EpxMin = Math.min(...EpxCurve) - 0.1;
  const EpxMax = st.pxE0 + 0.05;

  const pxShapes = useMemo<Partial<import('plotly.js').Shape>[]>(() => [{
    type: 'line', x0: scalePX(0), x1: scalePX(14), y0: st.pxE0, y1: st.pxE0,
    line: { color: '#aaaaaa', width: 1.5, dash: 'dot' },
  }], [st.pxE0, scalePX]);

  // ── Diagram tabs ──────────────────────────────────────────────────────────

  const diagrams = useMemo(() => {
    const all = [
    {
      id: 'eprime',
      label: "E°' = f(pH)",
      node: (
        <Chart
          data={Eprimetraces}
          xTitle="pH"
          yTitle="E°' (V vs ENH)"
          xRange={[0, 14]}
          yRange={[eMin, eMax]}
          shapes={logKShapes}
          annotations={logKAnnotations}
          exportName="equilibria-eprime-ph"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'epx',
      label: "E°'=f(pX)",
      node: (
        <Chart
          data={[{
            x: pXs.map(scalePX), y: EpxCurve, type: 'scatter', mode: 'lines',
            name: `E°'(${st.pxOxLabel}/${st.pxRedLabel})`,
            line: { width: 3, color: C3 },
            hovertemplate: `E°' = %{y:.3f} V<extra>pX=%{x:.1f}</extra>`,
          }]}
          xTitle={pxAxisLabel}
          yTitle="E°' (V vs ENH)"
          xRange={[scalePX(0), scalePX(14)]}
          yRange={[EpxMin, EpxMax]}
          shapes={pxShapes}
          annotations={[{
            x: scalePX(13), y: st.pxE0 + 0.02,
            text: `E° = ${st.pxE0.toFixed(3)} V`,
            showarrow: false, font: { size: 11, color: '#888' },
          }]}
          exportName="equilibria-eprime-px"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'escala',
      label: `Escala (pH ${st.pH.toFixed(1)})`,
      node: (
        <Chart
          data={escalaTraces}
          xTitle="pe°′"
          yTitle=""
          xRange={[escalaPeMin, escalaPeMax]}
          yRange={[0.4, escalaN + 0.6]}
          shapes={escalaShapes}
          annotations={escalaAnnotations}
          showLegend={false}
          exportName="equilibria-escala-cond"
          exportMetadata={exportMetadata}
        />
      ),
    },
  ];
    return st.showPX ? all : all.filter((d) => d.id !== 'epx');
  }, [Eprimetraces, eMin, eMax, logKShapes, logKAnnotations, st.showPX, pXs, scalePX, pxAxisLabel, EpxCurve, st.pxOxLabel, st.pxRedLabel, EpxMin, EpxMax, pxShapes, st.pxE0, escalaTraces, escalaPeMin, escalaPeMax, escalaShapes, escalaAnnotations, st.pH, escalaN, exportMetadata]);

  return (
    <div className="module">
      <PanelShell title="Potencial condicional" onReset={reset} moduleId="potencialcond">
        <PanelSection title="Sistema" icon="⚛">
          <ModelBadge
            model="comparación E°′ = f(pH) entre dos pares"
            additions={[
              st.showCouple3 && 'Latimer y dismutación',
              st.showComplexPH1 && 'complejación por estado (par 1)',
              st.showPX && 'efecto de ligando X',
              st.showPX && st.showPXPrime && 'pX′ condicional',
            ]}
          />

          <CoupleEditor title="Par 1" couple={st.couple1} onChange={(c) => set('couple1', c)} />
          <CoupleEditor title="Par 2" couple={st.couple2} onChange={(c) => set('couple2', c)} />
        </PanelSection>

        <PanelSection title="Complejación del par 1" icon="✦">
          <Toggle
            label="E°'=f(pH) con complejación (par 1)"
            checked={st.showComplexPH1}
            onChange={(v) => set('showComplexPH1', v)}
          />
          {st.showComplexPH1 && (
            <div className="mask-section">
              <Disclosure title={`Reacciones parásitas de ${st.couple1.ox} (oxidante)`}>
                <SideReactionEditor
                  state={st.oxSide1} onChange={(s) => set('oxSide1', s)}
                  showLigandPKas={false} showComplexSection={false}
                />
              </Disclosure>
              <Disclosure title={`Reacciones parásitas de ${st.couple1.red} (reductor)`}>
                <SideReactionEditor
                  state={st.redSide1} onChange={(s) => set('redSide1', s)}
                  showLigandPKas={false} showComplexSection={false}
                />
              </Disclosure>
              <p className="hint">
                Cada forma (Ox y Red) puede hidrolizar y/o unir un ligando auxiliar; el cruce
                y el pH del cursor pasan a usar el punto de intersección numérico de las curvas.
              </p>
            </div>
          )}
        </PanelSection>

        <PanelSection title="Condiciones" icon="⚗">
          <Slider
            label="pH del cursor"
            value={st.pH} min={0} max={14} step={0.1}
            onChange={(v) => set('pH', v)} decimals={1}
          />

          {/* 3rd couple (Latimer diagram / disproportionation) */}
          <Toggle
            label="Agregar 3.er par (Latimer / dismutación)"
            checked={st.showCouple3}
            onChange={(v) => set('showCouple3', v)}
          />
          {st.showCouple3 && (
            <div className="mask-section">
              <CoupleEditor
                title="Par 3 (intermedia → reducida)"
                couple={st.couple3}
                onChange={(c) => set('couple3', c)}
              />
              {dismutationActive ? (
                <div className="badge warn" style={{ marginBottom: 8 }}>
                  ⚠ Dismutación activa a pH {st.pH.toFixed(1)}:
                  E°'(par 3) = {E3cur!.toFixed(3)} V &gt; E°'(par 1) = {E1cur.toFixed(3)} V.
                  La especie <strong>{st.couple1.red}</strong> es inestable y dismuta.
                </div>
              ) : (
                <div className="badge ok" style={{ marginBottom: 8 }}>
                  Especie intermedia estable a pH {st.pH.toFixed(1)}:
                  E°'(par 1) = {E1cur.toFixed(3)} V &gt; E°'(par 3) = {E3cur?.toFixed(3)} V.
                </div>
              )}
              {cross13 !== null && (
                <p className="hint">
                  Cruce par 1–3: pH {cross13.toFixed(1)} (dismutación se invierte)
                  {cross13HasMore && ' — hay más de un cruce en este intervalo, se muestra el primero'}
                </p>
              )}
              {cross23 !== null && (
                <p className="hint">Cruce par 2–3: pH {cross23.toFixed(1)}</p>
              )}
            </div>
          )}
        </PanelSection>

        <PanelSection title="Resultado" icon="∑">
          <ResultCard items={[
            { label: `E°'(${st.couple1.name}) a pH ${st.pH.toFixed(1)}`, value: `${E1cur.toFixed(3)} V  (pe°′ ${(E1cur/S).toFixed(1)})`, helpId: 'Eprime' },
            { label: `E°'(${st.couple2.name}) a pH ${st.pH.toFixed(1)}`, value: `${E2cur.toFixed(3)} V  (pe°′ ${(E2cur/S).toFixed(1)})`, helpId: 'Eprime' },
            {
              label: 'Cruce de pares 1–2',
              value: cross12 !== null
                ? `pH ${cross12.toFixed(2)}${cross12HasMore ? ' (hay más de uno)' : ''}`
                : 'Paralelos (sin cruce)',
            },
            {
              label: 'Reacción espontánea',
              value: `${strongest.c.ox} + ${weakest.c.red} · log K' = ${logKcur.toFixed(1)}`,
            },
          ]} />
        </PanelSection>

        <PanelSection title="Efecto de ligando (pX)" icon="✦">
          <Toggle
            label="E°'=f(pX) — efecto de un ligando"
            checked={st.showPX}
            onChange={(v) => set('showPX', v)}
          />
          {st.showPX && (
            <div className="mask-section">
              <LabelField label="Forma oxidada (Ox)" value={st.pxOxLabel} onChange={(v) => set('pxOxLabel', v)} />
              <LabelField label="Forma reducida (Red)" value={st.pxRedLabel} onChange={(v) => set('pxRedLabel', v)} />
              <LabelField label="Ligando X" value={st.pxLigandLabel} onChange={(v) => set('pxLigandLabel', v)} />
              <Slider label="E° del par (V)" helpId="E0" value={st.pxE0} min={-1.5} max={2.5} step={0.01} onChange={(v) => set('pxE0', v)} decimals={3} />
              <div className="control">
                <div className="control-header">
                  <span className="control-label">n (electrones)</span>
                  <span className="control-value">{st.pxN}</span>
                </div>
                <div className="segmented" style={{ marginTop: 4 }}>
                  {[1, 2, 3].map((n) => (
                    <button key={n} className={st.pxN === n ? 'seg-btn active' : 'seg-btn'} onClick={() => set('pxN', n)}>{n}</button>
                  ))}
                </div>
              </div>
              <Disclosure title="log β de Ox con X">
                <ConstantList prefix="log β(Ox)" helpId="logBeta" values={st.pxLogBetasOx} onChange={(v) => set('pxLogBetasOx', v)} min={0} max={35} maxItems={6} />
              </Disclosure>
              <Disclosure title="log β de Red con X">
                <ConstantList prefix="log β(Red)" helpId="logBeta" values={st.pxLogBetasRed} onChange={(v) => set('pxLogBetasRed', v)} min={0} max={35} maxItems={6} />
              </Disclosure>
              <p className="hint">
                Preset: Fe³⁺/Fe²⁺ + F⁻ · E° = +0.771 V · log β(Fe³⁺) = [5.28, 9.30, 12.06] · log β(Fe²⁺) = [1.0]
              </p>
              <Toggle
                label="Escala pX′ condicional (protonación de X)"
                checked={st.showPXPrime}
                onChange={(v) => set('showPXPrime', v)}
              />
              {st.showPXPrime && (
                <div className="mask-section">
                  <Slider label="pH fijo" value={st.pxPHFixed} min={0} max={14} step={0.1} onChange={(v) => set('pxPHFixed', v)} decimals={1} />
                  <ConstantList prefix="pKa (ácido conjugado de X)" helpId="pKa" values={st.pxPKasX} onChange={(v) => set('pxPKasX', v)} min={0} max={14} maxItems={4} minItems={1} initialValue={9.25} />
                  <p className="hint">pX′ = pX − log α_X(H). NH₃/NH₄⁺: pKa ≈ 9.25 (Baeza §2.8.1).</p>
                </div>
              )}
            </div>
          )}
        </PanelSection>

        <PanelSection title="Electrodo a pM′ fijo (Nernst)" icon="✦">
          <Toggle
            label="Electrodo a pM′ fijo (Nernst)"
            checked={st.showElectrode}
            onChange={(v) => set('showElectrode', v)}
          />
          {st.showElectrode && (
            <div className="mask-section">
              <Slider label="E° (V)" helpId="E0" value={st.e0Metal} min={-1} max={2} step={0.01} onChange={(v) => set('e0Metal', v)} decimals={3} />
              <Slider label="n (electrones)" helpId="n" value={st.nElectrode} min={1} max={4} step={1} onChange={(v) => set('nElectrode', v)} decimals={0} />
              <Slider label="m H⁺ en semirreacción" helpId="mH" value={st.mHElectrode} min={0} max={4} step={1} onChange={(v) => set('mHElectrode', v)} decimals={0} />
              <Slider label="pM′ objetivo" helpId="pMprime" value={st.pMPrimeTarget} min={0} max={14} step={0.1} onChange={(v) => set('pMPrimeTarget', v)} decimals={1} />
              <Slider label="pH del electrodo" value={st.pHElectrode} min={0} max={14} step={0.1} onChange={(v) => set('pHElectrode', v)} decimals={1} />
              {electrodeE !== null && (
                <ResultCard items={[
                  { label: 'E°′ a pH del electrodo', value: `${e0PrimeAtPH(st.e0Metal, st.mHElectrode, st.nElectrode, st.pHElectrode).toFixed(3)} V` },
                  { label: `E a pM′ = ${st.pMPrimeTarget.toFixed(1)}`, value: `${electrodeE.toFixed(3)} V` },
                ]} />
              )}
              <p className="hint">Ej. Ni²⁺/Ni con glicinato como ligando auxiliar (pGly′ = 4) en la escala condicional.</p>
            </div>
          )}
        </PanelSection>

        <InfoBox title="E°' = f(pH): efecto del protón">
          <p>
            Para el par <code>Ox + m H⁺ + n e⁻ ⇌ Red</code>, el potencial formal condicional es
            <code> E°' = E° − 0.05916·(m/n)·pH</code>. La pendiente es −59.16·m/n mV/pH.
          </p>
          <p>
            El <strong>cruce</strong> (de dos rectas, o de las curvas reales si hay complejación
            activa en el par 1) marca el pH donde la reacción cambia de dirección: por encima
            del cruce, el orden de oxidante/reductor se invierte. Este efecto es crucial en
            análisis volumétrico (el mismo oxidante puede ser selectivo a un pH y no a otro).
          </p>
          <p>
            <strong>Dismutación (diagrama de Latimer):</strong> si E°'(derecho) &gt; E°'(izquierdo),
            la especie intermedia es inestable y reacciona consigo misma (ej. Cu⁺ → Cu²⁺ + Cu⁰).
          </p>
          <p>
            <strong>Complejación por estado:</strong> si el oxidante o el reductor del par 1
            hidroliza o se une a un ligando auxiliar, <code>E°' = E° − 0.05916·(m/n)·pH +
            (0.05916/n)·log(α_Red/α_Ox)</code> — complejar el oxidante lo estabiliza y baja
            E°' (oxidante más débil); complejar el reductor lo hace más fuerte como reductor
            y sube E°'. La curva deja de ser una recta.
          </p>
          <p>
            <strong>pX′ condicional:</strong> cuando el ligando X se protona (NH₃/NH₄⁺, F⁻/HF…),
            el eje pasa de p[X] libre a pX′ = −log(concentración analítica total) a un pH fijo —
            se necesita más X total para lograr la misma [X] libre cuanto más se protona.
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="eprime" />
        <ResultCardRow items={[
          { label: `E°' ${st.couple1.ox}/${st.couple1.red}`, value: Number.isFinite(E1cur) ? `${E1cur.toFixed(3)} V` : '—', accent: true, helpId: 'Eprime' },
          { label: `E°' ${st.couple2.ox}/${st.couple2.red}`, value: Number.isFinite(E2cur) ? `${E2cur.toFixed(3)} V` : '—', helpId: 'Eprime' },
          { label: 'Cruce 1–2', value: cross12 !== null ? `pH ${cross12.toFixed(1)}` : '—' },
        ]} />
      </section>
    </div>
  );
}
