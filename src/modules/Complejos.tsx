import { useCallback, useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DUZP from '../components/DUZP';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, ConstantList, DbPanel, InfoBox, LabelField,
  ModelBadge, PanelSection, RefBadge, ResultCard, ResultCardRow, Slider, Toggle,
} from '../components/Controls';
import { SideReactionEditor } from '../components/Editors';
import { SPECIES_COLORS } from '../lib/database';
import { predominanceZones } from '../lib/ladder';
import {
  complexFractions, bjerrumNumber, solvePL, logBetasToStepwise,
} from '../lib/complexation';
import { percentFormed, percentDissociated, pLForPercentFormed } from '../lib/metrics';
import {
  composeAlphas, defaultSideEditorState, sideStackFromEditor,
  type SideReactionEditorState,
} from '../lib/sideReactions';
import {
  COMPLEX_PRESETS, genericComplexLabels, type ComplexPreset,
} from '../lib/complexDatabase';

const PL_POINTS = 400;

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

/** Equilibrio de complejación multi-ligante: DUZP + distribución α + Bjerrum + logC. */
export default function Complejos() {
  const [sys, setSys] = useState<ComplexState>(defaultState);
  const [cM, setCM] = useState(0.01);
  const [cL, setCL] = useState(0.04);
  const [showEquil, setShowEquil] = useState(true);
  const [showPXPrime, setShowPXPrime] = useState(false);
  const [pHScale, setPHScale] = useState(10);
  const [side, setSide] = useState<SideReactionEditorState>(defaultSideEditorState);

  function reset() {
    setSys(defaultState()); setCM(0.01); setCL(0.04); setShowEquil(false);
    setShowPXPrime(false); setPHScale(10); setSide(defaultSideEditorState());
  }

  const logAlphaM = useMemo(() => {
    if (!showPXPrime) return 0;
    const br = composeAlphas(pHScale, sideStackFromEditor(side));
    return Math.log10(Math.max(br.alphaOH * br.alphaL, 1e-30));
  }, [showPXPrime, pHScale, side]);

  const scaleX = useCallback((pL: number) => pL + logAlphaM, [logAlphaM]);
  const xLabel = showPXPrime
    ? `pX′ condicional (pH ${pHScale.toFixed(1)})`
    : 'pL (−log[L])';

  const labels = effectiveLabels(sys);
  const n = sys.logBetas.length;
  const stepwise = useMemo(() => logBetasToStepwise(sys.logBetas), [sys.logBetas]);

  // rango pL: 0 a logβₙ + 3
  const pLmax = useMemo(() => Math.max(sys.logBetas[n - 1] + 3, 6), [sys.logBetas, n]);
  const xMax = scaleX(pLmax);

  // pL de equilibrio
  const pLEq = useMemo(() => solvePL(cM, cL, sys.logBetas), [cM, cL, sys.logBetas]);
  const pLEqClipped = Math.min(pLEq, pLmax - 0.05);

  // Distribución α vs pL
  const alphaTraces = useMemo<Data[]>(() => {
    const pls: number[] = [];
    const series: number[][] = Array.from({ length: n + 1 }, () => []);
    for (let i = 0; i <= PL_POINTS; i++) {
      const pL = (pLmax * i) / PL_POINTS;
      pls.push(scaleX(pL));
      complexFractions(pL, sys.logBetas).forEach((a, j) => series[j].push(a));
    }
    return series.map((ys, j) => ({
      x: pls, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? `ML${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `α = %{y:.3f}<extra>${labels[j] ?? ''}</extra>`,
    }));
  }, [sys.logBetas, labels, n, pLmax, scaleX]);

  // Función de Bjerrum n̄ vs pL
  const bjerrumTraces = useMemo<Data[]>(() => {
    const pls: number[] = [];
    const nBar: number[] = [];
    for (let i = 0; i <= PL_POINTS; i++) {
      const pL = (pLmax * i) / PL_POINTS;
      pls.push(scaleX(pL));
      nBar.push(bjerrumNumber(pL, sys.logBetas));
    }
    const trace: Data[] = [{
      x: pls, y: nBar, type: 'scatter', mode: 'lines',
      name: 'n̄', line: { width: 3, color: '#0072B2' },
      hovertemplate: 'pL = %{x:.2f}<br>n̄ = %{y:.2f}<extra></extra>',
    }];
    // marcas en pL = log Kᵢ (escalonada) — donde n̄ tiene sus inflexiones
    stepwise.forEach((lk, i) => {
      const nAtK = bjerrumNumber(lk, sys.logBetas);
      trace.push({
        x: [lk], y: [nAtK], type: 'scatter', mode: 'text+markers',
        text: [`log K${i + 1}`], textposition: 'top center',
        marker: { size: 8, color: SPECIES_COLORS[i % SPECIES_COLORS.length] },
        name: `log K${i + 1} = ${lk.toFixed(2)}`,
        showlegend: false,
        hovertemplate: `log K${i + 1} = ${lk.toFixed(2)}<br>n̄ = %{y:.2f}<extra></extra>`,
      });
    });
    return trace;
  }, [sys.logBetas, stepwise, pLmax, scaleX]);

  // Diagrama logC vs pL
  const logCTraces = useMemo<Data[]>(() => {
    const pls: number[] = [];
    const series: number[][] = Array.from({ length: n + 1 }, () => []);
    for (let i = 0; i <= PL_POINTS; i++) {
      const pL = (pLmax * i) / PL_POINTS;
      pls.push(scaleX(pL));
      complexFractions(pL, sys.logBetas).forEach((a, j) => {
        series[j].push(Math.log10(Math.max(a * cM, 1e-30)));
      });
    }
    return series.map((ys, j) => ({
      x: pls, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? `ML${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `log C = %{y:.2f}<extra>${labels[j] ?? ''}</extra>`,
    }));
  }, [sys.logBetas, labels, n, pLmax, cM, scaleX]);

  // DUZP
  const zones = useMemo(() => {
    const z = predominanceZones(stepwise, labels, 0, pLmax, false);
    if (!showPXPrime) return z;
    return z.map((zone) => ({
      ...zone,
      pStart: scaleX(zone.pStart),
      pEnd: scaleX(zone.pEnd),
    }));
  }, [stepwise, labels, pLmax, showPXPrime, scaleX]);

  const equilMarker = showEquil && pLEq < pLmax + 1
    ? { p: scaleX(pLEqClipped), label: `equil. · ${showPXPrime ? 'pX′' : 'pL'} ${scaleX(pLEq).toFixed(2)}` }
    : undefined;

  const equilShape = showEquil && pLEq < pLmax + 1
    ? [{ type: 'line' as const, x0: scaleX(pLEqClipped), x1: scaleX(pLEqClipped), y0: 0, y1: 1.02, line: { color: '#CC79A7', width: 2, dash: 'dashdot' as const } }]
    : [];

  const equilShapeLogC = showEquil && pLEq < pLmax + 1
    ? [{ type: 'line' as const, x0: scaleX(pLEqClipped), x1: scaleX(pLEqClipped), y0: -20, y1: 1, line: { color: '#CC79A7', width: 2, dash: 'dashdot' as const } }]
    : [];

  // especie dominante en pL de equilibrio
  const alphasEq = complexFractions(pLEqClipped, sys.logBetas);
  const domIdx = alphasEq.indexOf(Math.max(...alphasEq));
  const nBarEq = bjerrumNumber(pLEqClipped, sys.logBetas);

  // Métricas "% + punto de operación" (spec issue #4 · C1). Para un complejo 1:1
  // % formado = ñ·100 y % disociado = (1−ñ)·100; el pL para 50 % = log β₁.
  const pctFormado = percentFormed(pLEqClipped, sys.logBetas);
  const pctDisociado = percentDissociated(pLEqClipped, sys.logBetas);
  const pL50 = pLForPercentFormed(sys.logBetas, 50);

  const diagrams = [
    {
      id: 'equil',
      label: 'Equilibrio (pL)',
      node: (
        <Chart
          data={alphaTraces}
          xTitle={xLabel}
          yTitle="Fracción α"
          xRange={[0, xMax]}
          yRange={[0, 1.02]}
          shapes={equilShape}
          exportName="equilibria-complejos-equilibrio"
        />
      ),
    },
    {
      id: 'duzp',
      label: 'DUZP',
      node: (
        <DUZP
          zones={zones}
          pMin={0}
          pMax={xMax}
          pLabel={showPXPrime ? 'pX′' : 'pL'}
          marker={equilMarker}
          caption="Zonas de predominio"
        />
      ),
    },
    {
      id: 'alpha',
      label: 'Distribución α',
      node: (
        <Chart
          data={alphaTraces}
          xTitle={xLabel}
          yTitle="Fracción α"
          xRange={[0, xMax]}
          yRange={[0, 1.02]}
          shapes={equilShape}
          exportName="equilibria-complejos-alfa"
        />
      ),
    },
    {
      id: 'bjerrum',
      label: 'Bjerrum n̄',
      node: (
        <Chart
          data={bjerrumTraces}
          xTitle={xLabel}
          yTitle="n̄ (ligandos coordinados)"
          xRange={[0, xMax]}
          yRange={[0, n + 0.2]}
          shapes={showEquil && pLEq < pLmax + 1 ? [{ type: 'line', x0: scaleX(pLEqClipped), x1: scaleX(pLEqClipped), y0: 0, y1: n + 0.2, line: { color: '#CC79A7', width: 2, dash: 'dashdot' } }] : []}
          exportName="equilibria-complejos-bjerrum"
        />
      ),
    },
    {
      id: 'logc',
      label: 'log C',
      node: (
        <Chart
          data={logCTraces}
          xTitle={xLabel}
          yTitle="log C"
          xRange={[0, xMax]}
          yRange={[-12, 0.5]}
          shapes={equilShapeLogC}
          exportName="equilibria-complejos-logc"
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title="Equilibrio de complejación" onReset={reset}>
        <PanelSection title="Sistema" icon="⚛">
          <ModelBadge
            model={sys.logBetas.length === 1
              ? 'complejo 1:1 (ML)'
              : `complejación sucesiva hasta ML${sys.logBetas.length}`}
            additions={[showEquil && 'balance de masa y pL de equilibrio', showPXPrime && 'escala pX′ condicional']}
          />
          <LabelField
            label="Metal (nombre libre)"
            value={sys.metalLabel}
            onChange={(metalLabel) => setSys({ ...sys, metalLabel, speciesLabels: null, reference: null })}
          />
          <LabelField
            label="Ligando (nombre libre)"
            value={sys.ligandLabel}
            onChange={(ligandLabel) => setSys({ ...sys, ligandLabel, speciesLabels: null, reference: null })}
          />
          <ConstantList
            prefix="log β"
            values={sys.logBetas}
            min={0}
            max={30}
            maxItems={8}
            onChange={(logBetas) => setSys({ ...sys, logBetas, speciesLabels: null, reference: null })}
          />
          <RefBadge reference={sys.reference ?? undefined} />
          <DbPanel
            title="Ejemplos de la base de datos"
            items={COMPLEX_PRESETS.map((p) => ({
              id: p.id,
              label: `${p.metalLabel} / ${p.ligandLabel}`,
              detail: `log β: ${p.logBetas.map((b) => b.toFixed(2)).join(', ')}`,
              group: p.group,
            }))}
            onSelect={(id) => {
              const p = COMPLEX_PRESETS.find((x) => x.id === id)!;
              setSys(fromPreset(p));
            }}
          />
        </PanelSection>

        <PanelSection title="Condiciones" icon="⚗">
          <ConcSlider label="Concentración total del metal (cM)" value={cM} onChange={setCM} />
          <ConcSlider label="Concentración total del ligando (cL)" value={cL} onChange={setCL} />
          <Toggle label="Marcar pL de equilibrio en diagramas" checked={showEquil} onChange={setShowEquil} />
          <Toggle
            label="Escala pX′ condicional (parásitas del metal)"
            checked={showPXPrime}
            onChange={setShowPXPrime}
          />
          {showPXPrime && (
            <div className="mask-section">
              <Slider label="pH fijo" value={pHScale} min={0} max={14} step={0.1} onChange={setPHScale} decimals={1} />
              <SideReactionEditor state={side} onChange={setSide} showLigandPKas={false} />
              <p className="hint">pX′ = pL + log α_M (hidrólisis + auxiliar) a pH fijo.</p>
            </div>
          )}
        </PanelSection>

        <PanelSection title="Resultado" icon="∑">
          <ResultCard items={[
            { label: 'pL de equilibrio', value: pLEq > pLmax ? `> ${pLmax.toFixed(0)} (sin ligando)` : pLEq.toFixed(3) },
            { label: 'n̄ en equilibrio', value: nBarEq.toFixed(2) },
            { label: 'Especie dominante', value: `${labels[domIdx]} (α = ${alphasEq[domIdx].toFixed(3)})` },
          ]} />
        </PanelSection>

        <InfoBox title="Cómo leer estos diagramas">
          <p>
            <strong>DUZP</strong>: en cada tramo de pL domina una especie.
            La escala crece hacia la derecha (pL alto = poco ligando libre = metal sin complejarse).
          </p>
          <p>
            <strong>Bjerrum n̄</strong>: número medio de ligandos coordinados;
            sus inflexiones ocurren cerca de cada log Kᵢ escalonada.
          </p>
          <p>
            <strong>Distribución α / log C</strong>: igual que en ácido-base
            pero sobre el eje pL. La línea rosa marca el pL del sistema real.
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="equil" />
        <ResultCardRow items={[
          {
            label: n === 1 ? '% formado' : '% formado (ñ·100)',
            value: `${pctFormado.toFixed(1)} %`,
            accent: true,
          },
          ...(n === 1 ? [{ label: '% disociado', value: `${pctDisociado.toFixed(1)} %` }] : []),
          { label: 'pL para 50 %', value: Number.isFinite(pL50) ? pL50.toFixed(2) : '—' },
          {
            label: showPXPrime ? 'pX′ equilibrio' : 'pL equilibrio',
            value: pLEq > pLmax ? `>${pLmax.toFixed(0)}` : scaleX(pLEq).toFixed(2),
          },
          { label: 'n̄ equilibrio', value: nBarEq.toFixed(2) },
          { label: 'Dominante', value: `${labels[domIdx]}` },
        ]} />
      </section>
    </div>
  );
}
