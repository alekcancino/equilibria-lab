import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DUZP from '../components/DUZP';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, ConstantList, Disclosure, InfoBox, LabelField,
  ModelBadge, PanelSection, RefBadge, ResultCard, ResultCardRow, Slider, SystemPresetPicker,
} from '../components/Controls';
import { SPECIES_COLORS } from '../lib/database';
import { speciationAtPH, speciationCurve, predominanceZonesVsPH, type MetalSpeciationSystem } from '../lib/speciation';
import { SPECIATION_PRESETS, speciationPresetById } from '../lib/speciationDatabase';
import { toSub } from '../lib/complexDatabase';

const PH_RANGE: [number, number] = [0, 14];
const PH_POINTS = 300;

interface SpeciationState {
  metalLabel: string;
  cM: number;
  logBetasOH: number[];
  showAux: boolean;
  ligandLabel: string;
  logBetasL: number[];
  pKasL: number[];
  cL: number;
  speciesLabels: string[] | null;
  reference: string | null;
}

function defaultState(): SpeciationState {
  return {
    metalLabel: 'M', cM: 1e-4, logBetasOH: [8], showAux: false,
    // cL stays > 0 even while unused (toSystem zeroes it when showAux is
    // false) — 0 would feed Math.log10(0) = -Infinity into ConcSlider's range input.
    ligandLabel: 'L', logBetasL: [], pKasL: [], cL: 1e-3,
    speciesLabels: null, reference: null,
  };
}

function fromPreset(id: string): SpeciationState {
  const p = speciationPresetById(id)!;
  return {
    metalLabel: p.system.metalLabel,
    cM: p.system.cM,
    logBetasOH: [...p.system.logBetasOH],
    showAux: p.system.logBetasL.length > 0,
    ligandLabel: p.system.ligandLabel ?? 'L',
    logBetasL: [...p.system.logBetasL],
    pKasL: [...p.system.pKasL],
    cL: p.system.cL,
    speciesLabels: [...p.speciesLabels],
    reference: p.reference,
  };
}

function genericLabels(metalLabel: string, ligandLabel: string, nOH: number, nL: number): string[] {
  const m = metalLabel || 'M';
  const l = ligandLabel || 'L';
  const labels = [m];
  for (let j = 1; j <= nOH; j++) labels.push(`${m}(OH)${j > 1 ? toSub(j) : ''}`);
  for (let i = 1; i <= nL; i++) labels.push(`${m}${l}${i > 1 ? toSub(i) : ''}`);
  return labels;
}

function effectiveLabels(s: SpeciationState): string[] {
  const nL = s.showAux ? s.logBetasL.length : 0;
  const total = 1 + s.logBetasOH.length + nL;
  if (s.speciesLabels && s.speciesLabels.length === total) return s.speciesLabels;
  return genericLabels(s.metalLabel, s.ligandLabel, s.logBetasOH.length, nL);
}

function toSystem(s: SpeciationState): MetalSpeciationSystem {
  return {
    metalLabel: s.metalLabel || 'M', cM: s.cM, logBetasOH: s.logBetasOH,
    ligandLabel: s.ligandLabel, logBetasL: s.showAux ? s.logBetasL : [],
    pKasL: s.showAux ? s.pKasL : [], cL: s.showAux ? s.cL : 0,
  };
}

/** Metal speciation vs pH: hydrolysis (M–OH) coupled with an optional auxiliary
 * ligand (M–L), species-by-species — the α distribution changes shape as the
 * metal shifts from free ion to hydroxo-complexes to auxiliary complexes. */
export default function EspeciacionMetal() {
  const [sys, setSys] = useState<SpeciationState>(defaultState);
  const [pHRead, setPHRead] = useState(7);

  useShareEffect('especiacion', { sys, pHRead }, (s) => {
    if (s.sys) setSys(s.sys);
    if (s.pHRead !== undefined) setPHRead(s.pHRead);
  });

  function reset() {
    setSys(defaultState());
    setPHRead(7);
  }

  // Only the fields that feed the math are in the dep list — metalLabel edits
  // (a keystroke per change) must not retrigger the 300-point curve + 1500-point
  // DUZP sweep, since neither reads a label.
  const system = useMemo(
    () => toSystem(sys),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sys.cM, sys.logBetasOH, sys.showAux, sys.logBetasL, sys.pKasL, sys.cL],
  );
  const labels = useMemo(
    () => effectiveLabels(sys),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sys.speciesLabels, sys.metalLabel, sys.ligandLabel, sys.logBetasOH.length, sys.logBetasL.length, sys.showAux],
  );
  const nOH = sys.logBetasOH.length;
  const nL = sys.showAux ? sys.logBetasL.length : 0;
  const nSpecies = 1 + nOH + nL;

  const curve = useMemo(() => speciationCurve(system, PH_RANGE, PH_POINTS), [system]);
  const hasNaN = useMemo(() => curve.some((pt) => Number.isNaN(pt.pL)), [curve]);

  const readPoint = useMemo(() => speciationAtPH(system, pHRead), [system, pHRead]);
  const readValid = !Number.isNaN(readPoint.fractions[0]);
  const domIdx = readValid ? readPoint.fractions.indexOf(Math.max(...readPoint.fractions)) : -1;
  const famFree = readValid ? readPoint.fractions[0] : NaN;
  const famOH = readValid ? readPoint.fractions.slice(1, 1 + nOH).reduce((a, b) => a + b, 0) : NaN;
  const famL = readValid ? readPoint.fractions.slice(1 + nOH).reduce((a, b) => a + b, 0) : NaN;

  const exportMetadata = useMemo(() => ({
    Módulo: 'Especiación del metal',
    Metal: sys.metalLabel || 'M',
    Ligando: sys.showAux ? (sys.ligandLabel || 'L') : '(ninguno)',
    'CM / M': system.cM.toExponential(3),
    'CL / M': system.cL.toExponential(3),
  }), [sys.metalLabel, sys.ligandLabel, sys.showAux, system.cM, system.cL]);

  const readLine = (y0: number, y1: number) => [{
    type: 'line' as const, x0: pHRead, x1: pHRead, y0, y1,
    line: { color: '#CC79A7', width: 2, dash: 'dashdot' as const },
  }];
  const alphaReadShape = readLine(0, 1.02);
  const logCReadShape = readLine(-12, 0.5);

  const alphaTraces = useMemo<Data[]>(() => {
    const xs = curve.map((pt) => pt.pH);
    return Array.from({ length: nSpecies }, (_, j) => ({
      x: xs,
      y: curve.map((pt) => (Number.isNaN(pt.fractions[j]) ? null : pt.fractions[j])),
      type: 'scatter' as const, mode: 'lines' as const,
      name: labels[j] ?? `S${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `α = %{y:.3f}<extra>${labels[j] ?? ''}</extra>`,
      connectgaps: false,
    }));
  }, [curve, nSpecies, labels]);

  const logCTraces = useMemo<Data[]>(() => {
    const xs = curve.map((pt) => pt.pH);
    return Array.from({ length: nSpecies }, (_, j) => ({
      x: xs,
      y: curve.map((pt) => (Number.isNaN(pt.fractions[j])
        ? null
        : Math.log10(Math.max(pt.fractions[j] * system.cM, 1e-30)))),
      type: 'scatter' as const, mode: 'lines' as const,
      name: labels[j] ?? `S${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `log C = %{y:.2f}<extra>${labels[j] ?? ''}</extra>`,
      connectgaps: false,
    }));
  }, [curve, nSpecies, labels, system.cM]);

  const zones = useMemo(
    () => predominanceZonesVsPH(system, labels, PH_RANGE),
    [system, labels],
  );

  const diagrams = [
    {
      id: 'alpha',
      label: 'Distribución α',
      node: (
        <Chart
          data={alphaTraces}
          xTitle="pH"
          yTitle="Fracción α"
          xRange={PH_RANGE}
          yRange={[0, 1.02]}
          shapes={alphaReadShape}
          exportName="equilibria-especiacion-alfa"
          exportMetadata={exportMetadata}
        />
      ),
    },
    {
      id: 'duzp',
      label: 'DUZP',
      node: (
        <DUZP
          zones={zones}
          pMin={PH_RANGE[0]}
          pMax={PH_RANGE[1]}
          pLabel="pH"
          marker={{ p: pHRead, label: `pH ${pHRead.toFixed(1)}` }}
          caption="Zonas de predominio"
        />
      ),
    },
    {
      id: 'logc',
      label: 'log C',
      node: (
        <Chart
          data={logCTraces}
          xTitle="pH"
          yTitle="log C"
          xRange={PH_RANGE}
          yRange={[-12, 0.5]}
          shapes={logCReadShape}
          exportName="equilibria-especiacion-logc"
          exportMetadata={exportMetadata}
        />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title="Especiación del metal (M–OH–L vs pH)" onReset={reset}>
        <PanelSection title="Metal e hidrólisis" icon="⚛">
          <ModelBadge
            model={nOH === 0 ? 'sin hidrólisis modelada' : `hidrólisis hasta M(OH)${toSub(nOH)}`}
            additions={[nL > 0 && `complejación con ${sys.ligandLabel || 'L'} hasta ML${toSub(nL)}`]}
          />
          <LabelField
            label="Metal (nombre libre)"
            value={sys.metalLabel}
            onChange={(metalLabel) => setSys({ ...sys, metalLabel, speciesLabels: null, reference: null })}
          />
          <ConcSlider label="Concentración total del metal (cM)" value={sys.cM} onChange={(cM) => setSys({ ...sys, cM })} />
          <ConstantList
            prefix="log β(OH)"
            helpId="logBetaOH"
            values={sys.logBetasOH}
            min={-50}
            max={40}
            maxItems={6}
            minItems={0}
            initialValue={5}
            onChange={(logBetasOH) => setSys({ ...sys, logBetasOH, speciesLabels: null, reference: null })}
          />
          <RefBadge reference={sys.reference ?? undefined} />
          <SystemPresetPicker
            title="Sistemas de ejemplo"
            items={SPECIATION_PRESETS.map((p) => ({ id: p.id, name: p.name, group: p.group, detail: p.detail }))}
            onSelect={(id) => setSys(fromPreset(id))}
          />
        </PanelSection>

        <Disclosure
          title="Ligando auxiliar M–L"
          open={sys.showAux}
          onToggle={(showAux) => setSys({ ...sys, showAux })}
        >
          <LabelField
            label="Ligando auxiliar"
            value={sys.ligandLabel}
            onChange={(ligandLabel) => setSys({ ...sys, ligandLabel, speciesLabels: null, reference: null })}
          />
          <ConstantList
            prefix="log β"
            helpId="logBeta"
            values={sys.logBetasL}
            min={0}
            max={25}
            maxItems={6}
            minItems={0}
            onChange={(logBetasL) => setSys({ ...sys, logBetasL, showAux: true, speciesLabels: null, reference: null })}
          />
          <ConcSlider label="Concentración total del ligando (cL)" value={sys.cL} onChange={(cL) => setSys({ ...sys, cL })} min={-6} max={1} />
          <ConstantList
            prefix="pKa (ácido conjugado)"
            helpId="pKa"
            values={sys.pKasL}
            min={0}
            max={14}
            maxItems={4}
            minItems={0}
            initialValue={9.25}
            onChange={(pKasL) => setSys({ ...sys, pKasL })}
          />
          <p className="hint">NH₃/NH₄⁺: pKa ≈ 9,25. Sin pKa: se asume el ligando ya libre (sin protonación).</p>
        </Disclosure>

        <PanelSection title="Lectura" icon="∑">
          <Slider label="pH de lectura" value={pHRead} min={0} max={14} step={0.1} onChange={setPHRead} decimals={1} />
          {readValid ? (
            <ResultCard items={[
              { label: 'Especie dominante', value: `${labels[domIdx]} (α = ${readPoint.fractions[domIdx].toFixed(3)})` },
              { label: 'pL libre', value: Number.isFinite(readPoint.pL) ? readPoint.pL.toFixed(3) : '∞ (sin ligando)' },
              { label: 'n̄ (L coordinados)', value: readPoint.nBar.toFixed(2) },
              { label: '% M libre / hidroxo / L-complejado', value: `${(famFree * 100).toFixed(1)} / ${(famOH * 100).toFixed(1)} / ${(famL * 100).toFixed(1)}` },
            ]} />
          ) : (
            <p className="hint">
              ⚠ El balance de masa del ligando no tiene solución física a este pH
              (c<sub>L</sub> insuficiente frente a c<sub>M</sub>·n̄). Sube c<sub>L</sub> o baja c<sub>M</sub>.
            </p>
          )}
          {hasNaN && (
            <p className="hint">⚠ Algunos tramos de pH no tienen solución física — la curva muestra un hueco ahí.</p>
          )}
        </PanelSection>

        <InfoBox title="Cómo leer estos diagramas">
          <p>
            <strong>Distribución α</strong>: a cada pH se resuelve primero el ligando libre
            (balance de masa) y luego se reparte el metal entre M libre, M(OH)ⱼ y MLᵢ —
            las curvas de hidrólisis y de complejación auxiliar están acopladas por el
            mismo denominador.
          </p>
          <p>
            <strong>DUZP</strong>: qué especie domina en cada tramo de pH.
          </p>
          <p>
            <strong>Supuestos</strong>: especie mononuclear (sin dímeros/polinucleares),
            sin fase sólida, actividades ≈ concentraciones.
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="alpha" />
        <ResultCardRow items={[
          { label: 'Dominante a pH lectura', value: readValid ? labels[domIdx] : '—', accent: true },
          { label: 'pL libre', value: readValid && Number.isFinite(readPoint.pL) ? readPoint.pL.toFixed(2) : '—' },
          { label: 'n̄', value: readValid ? readPoint.nBar.toFixed(2) : '—' },
          { label: '% M libre', value: readValid ? `${(famFree * 100).toFixed(1)} %` : '—' },
          { label: '% hidroxo', value: readValid ? `${(famOH * 100).toFixed(1)} %` : '—' },
          { label: '% L-complejado', value: readValid ? `${(famL * 100).toFixed(1)} %` : '—' },
        ]} />
      </section>
    </div>
  );
}
