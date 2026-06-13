import { useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import DUZP from '../components/DUZP';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, ConstantList, DbPanel, InfoBox, LabelField,
  ModelBadge, RefBadge, ResultCard, Toggle,
} from '../components/Controls';
import { SPECIES_COLORS } from '../lib/database';
import { predominanceZones } from '../lib/ladder';
import {
  complexFractions, bjerrumNumber, solvePL, logBetasToStepwise,
} from '../lib/complexation';
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
  const [showEquil, setShowEquil] = useState(false);

  function reset() { setSys(defaultState()); setCM(0.01); setCL(0.04); setShowEquil(false); }

  const labels = effectiveLabels(sys);
  const n = sys.logBetas.length;
  const stepwise = useMemo(() => logBetasToStepwise(sys.logBetas), [sys.logBetas]);

  // rango pL: 0 a logβₙ + 3
  const pLmax = useMemo(() => Math.max(sys.logBetas[n - 1] + 3, 6), [sys.logBetas, n]);

  // pL de equilibrio
  const pLEq = useMemo(() => solvePL(cM, cL, sys.logBetas), [cM, cL, sys.logBetas]);
  const pLEqClipped = Math.min(pLEq, pLmax - 0.05);

  // Distribución α vs pL
  const alphaTraces = useMemo<Data[]>(() => {
    const pls: number[] = [];
    const series: number[][] = Array.from({ length: n + 1 }, () => []);
    for (let i = 0; i <= PL_POINTS; i++) {
      const pL = (pLmax * i) / PL_POINTS;
      pls.push(pL);
      complexFractions(pL, sys.logBetas).forEach((a, j) => series[j].push(a));
    }
    return series.map((ys, j) => ({
      x: pls, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? `ML${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `α = %{y:.3f}<extra>${labels[j] ?? ''}</extra>`,
    }));
  }, [sys.logBetas, labels, n, pLmax]);

  // Función de Bjerrum n̄ vs pL
  const bjerrumTraces = useMemo<Data[]>(() => {
    const pls: number[] = [];
    const nBar: number[] = [];
    for (let i = 0; i <= PL_POINTS; i++) {
      const pL = (pLmax * i) / PL_POINTS;
      pls.push(pL);
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
  }, [sys.logBetas, stepwise, pLmax]);

  // Diagrama logC vs pL
  const logCTraces = useMemo<Data[]>(() => {
    const pls: number[] = [];
    const series: number[][] = Array.from({ length: n + 1 }, () => []);
    const logCM = Math.log10(cM);
    for (let i = 0; i <= PL_POINTS; i++) {
      const pL = (pLmax * i) / PL_POINTS;
      pls.push(pL);
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
    // supress unused warning
    void logCM;
  }, [sys.logBetas, labels, n, pLmax, cM]);

  // DUZP
  const zones = useMemo(
    () => predominanceZones(stepwise, labels, 0, pLmax, false),
    [stepwise, labels, pLmax],
  );

  const equilMarker = showEquil && pLEq < pLmax + 1
    ? { p: pLEqClipped, label: `equil. · pL ${pLEq.toFixed(2)}` }
    : undefined;

  const equilShape = showEquil && pLEq < pLmax + 1
    ? [{ type: 'line' as const, x0: pLEqClipped, x1: pLEqClipped, y0: 0, y1: 1.02, line: { color: '#CC79A7', width: 2, dash: 'dashdot' as const } }]
    : [];

  const equilShapeLogC = showEquil && pLEq < pLmax + 1
    ? [{ type: 'line' as const, x0: pLEqClipped, x1: pLEqClipped, y0: -20, y1: 1, line: { color: '#CC79A7', width: 2, dash: 'dashdot' as const } }]
    : [];

  // especie dominante en pL de equilibrio
  const alphasEq = complexFractions(pLEqClipped, sys.logBetas);
  const domIdx = alphasEq.indexOf(Math.max(...alphasEq));
  const nBarEq = bjerrumNumber(pLEqClipped, sys.logBetas);

  const diagrams = [
    {
      id: 'duzp',
      label: 'DUZP',
      node: (
        <DUZP
          zones={zones}
          pMin={0}
          pMax={pLmax}
          pLabel="pL"
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
          xTitle="pL (−log[L])"
          yTitle="Fracción α"
          xRange={[0, pLmax]}
          yRange={[0, 1.02]}
          shapes={equilShape}
          exportName="quimeq-complejos-alfa"
        />
      ),
    },
    {
      id: 'bjerrum',
      label: 'Bjerrum n̄',
      node: (
        <Chart
          data={bjerrumTraces}
          xTitle="pL (−log[L])"
          yTitle="n̄ (ligandos coordinados)"
          xRange={[0, pLmax]}
          yRange={[0, n + 0.2]}
          shapes={showEquil && pLEq < pLmax + 1 ? [{ type: 'line', x0: pLEqClipped, x1: pLEqClipped, y0: 0, y1: n + 0.2, line: { color: '#CC79A7', width: 2, dash: 'dashdot' } }] : []}
          exportName="quimeq-complejos-bjerrum"
        />
      ),
    },
    {
      id: 'logc',
      label: 'log C',
      node: (
        <Chart
          data={logCTraces}
          xTitle="pL (−log[L])"
          yTitle="log C"
          xRange={[0, pLmax]}
          yRange={[-12, 0.5]}
          shapes={equilShapeLogC}
          exportName="quimeq-complejos-logc"
        />
      ),
    },
  ];

  return (
    <div className="module">
      <aside className="panel">
        <div className="panel-header">
          <h2>Equilibrio de complejación</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>

        <div className="editor">
          <ModelBadge
            model={sys.logBetas.length === 1
              ? 'complejo 1:1 (ML)'
              : `complejación sucesiva hasta ML${sys.logBetas.length}`}
            additions={[showEquil && 'balance de masa y pL de equilibrio']}
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
        </div>

        <h3>Condiciones</h3>
        <ConcSlider label="Concentración total del metal (cM)" value={cM} onChange={setCM} />
        <ConcSlider label="Concentración total del ligando (cL)" value={cL} onChange={setCL} />
        <Toggle label="Marcar pL de equilibrio" checked={showEquil} onChange={setShowEquil} />

        {showEquil && (
          <ResultCard items={[
            { label: 'pL de equilibrio', value: pLEq > pLmax ? `> ${pLmax.toFixed(0)} (sin ligando)` : pLEq.toFixed(3) },
            { label: 'n̄ en equilibrio', value: nBarEq.toFixed(2) },
            { label: 'Especie dominante', value: `${labels[domIdx]} (α = ${alphasEq[domIdx].toFixed(3)})` },
          ]} />
        )}

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
      </aside>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} />
      </section>
    </div>
  );
}
