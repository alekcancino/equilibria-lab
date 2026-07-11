import { useEffect, useMemo, useState } from 'react';
import { useShareEffect, hasSharedUrlState } from '../hooks/useShareableState';
import { useComplejosCarryOver, type ComplejosCarryOver } from '../context/ComplejosCarryOverContext';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DUZP from '../components/DUZP';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConcSlider, ConstantList, Disclosure, InfoBox, LabelField, LabelList,
  ModelBadge, PanelSection, ResultCard, ResultCardRow, Slider, SystemPresetPicker,
} from '../components/Controls';
import { SideReactionEditor } from '../components/Editors';
import Predominance2D from '../components/Predominance2D';
import { SPECIES_COLORS } from '../lib/database';
import { xBranchFromEditor } from '../lib/complexation';
import { defaultSideEditorState, type SideReactionEditorState } from '../lib/sideReactions';
import { speciationAtPH, speciationCurve, speciationFractions, predominanceZonesVsPH, type MetalSpeciationSystem } from '../lib/speciation';
import { predominanceGrid } from '../lib/predominance2D';
import { SPECIATION_PRESETS, speciationPresetById } from '../lib/speciationDatabase';
import { toSub } from '../lib/complexDatabase';

const PH_RANGE: [number, number] = [0, 14];
const PH_POINTS = 300;
const MODULE_ID = 'especiacion';

interface SpeciationState {
  metalLabel: string;
  cM: number;
  logBetasOH: number[];
  showAux: boolean;
  ligandLabel: string;
  logBetasL: number[];
  pKasL: number[];
  cL: number;
  showX: boolean;
  side: SideReactionEditorState;
  speciesLabels: string[] | null;
  reference: string | null;
}

function defaultState(): SpeciationState {
  return {
    metalLabel: 'M', cM: 1e-4, logBetasOH: [8], showAux: false,
    // cL stays > 0 even while unused (toSystem zeroes it when showAux is
    // false) — 0 would feed Math.log10(0) = -Infinity into ConcSlider's range input.
    ligandLabel: 'L', logBetasL: [], pKasL: [], cL: 1e-3,
    showX: false, side: defaultSideEditorState(),
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
    showX: false,
    side: defaultSideEditorState(),
    speciesLabels: [...p.speciesLabels],
    reference: p.reference,
  };
}

function genericLabels(metalLabel: string, ligandLabel: string, nOH: number, nL: number, xLabel = 'X', nX = 0): string[] {
  const m = metalLabel || 'M';
  const l = ligandLabel || 'L';
  const xl = xLabel || 'X';
  const labels = [m];
  for (let j = 1; j <= nOH; j++) labels.push(`${m}(OH)${j > 1 ? toSub(j) : ''}`);
  // Parenthesized ligand, matching complexDatabase's genericComplexLabels —
  // bare concatenation reads wrong for multi-character ligands (MNH3, Men2).
  for (let i = 1; i <= nL; i++) labels.push(`${m}(${l})${i > 1 ? toSub(i) : ''}`);
  for (let k = 1; k <= nX; k++) labels.push(`${m}(${xl})${k > 1 ? toSub(k) : ''}`);
  return labels;
}

function activeNX(s: SpeciationState): number {
  return s.showX && s.side.showAux ? s.side.logBetasAux.length : 0;
}

function effectiveLabels(s: SpeciationState): string[] {
  const nL = s.showAux ? s.logBetasL.length : 0;
  const nX = activeNX(s);
  const total = 1 + s.logBetasOH.length + nL + nX;
  const generic = genericLabels(s.metalLabel, s.ligandLabel, s.logBetasOH.length, nL, s.side.auxLabel, nX);
  if (!s.speciesLabels || s.speciesLabels.length !== total) return generic;
  // LabelList's LabelField has no minimum length — fall back per-entry
  // rather than show a blank chart legend / result-card species name.
  return s.speciesLabels.map((l, i) => l.trim() || generic[i]);
}

/** Seeds a fresh mount from the hub's cross-view carry-over: metal hydrolysis
 * (shared with K′ condicional) and ligand/ladder (shared with Equilibrio pL's
 * auxiliary-ligand slot) — see ComplejosCarryOverContext for the field mapping. */
function seedFromCarryOver(c: ComplejosCarryOver): SpeciationState {
  const base = defaultState();
  if (hasSharedUrlState(MODULE_ID)) return base;
  if (c.metalLabel) base.metalLabel = c.metalLabel;
  if (c.logBetasOH && c.logBetasOH.length > 0) base.logBetasOH = [...c.logBetasOH];
  if (c.ligandLabel && c.logBetas && c.logBetas.length > 0) {
    base.showAux = true;
    base.ligandLabel = c.ligandLabel;
    base.logBetasL = [...c.logBetas];
  }
  return base;
}

function toSystem(s: SpeciationState): MetalSpeciationSystem {
  return {
    metalLabel: s.metalLabel || 'M', cM: s.cM, logBetasOH: s.logBetasOH,
    ligandLabel: s.ligandLabel, logBetasL: s.showAux ? s.logBetasL : [],
    pKasL: s.showAux ? s.pKasL : [], cL: s.showAux ? s.cL : 0,
    x: s.showX ? xBranchFromEditor(s.side) ?? undefined : undefined,
  };
}

/** Metal speciation vs pH: hydrolysis (M–OH) coupled with an optional auxiliary
 * ligand (M–L), species-by-species — the α distribution changes shape as the
 * metal shifts from free ion to hydroxo-complexes to auxiliary complexes. */
export default function EspeciacionMetal() {
  const { carryOver, setCarryOver } = useComplejosCarryOver();
  const [sys, setSys] = useState<SpeciationState>(() => seedFromCarryOver(carryOver));
  const [pHRead, setPHRead] = useState(7);

  useEffect(() => {
    // Gate on actual data (array length), not just the Disclosure's open
    // flag — opening "Ligando auxiliar" without entering anything, or
    // clearing it back to empty, must clear the field from the shared
    // context (push undefined) instead of leaving a stale ladder behind.
    const hasAux = sys.showAux && sys.logBetasL.length > 0;
    setCarryOver((prev) => ({
      ...prev,
      // Skip the untouched placeholder so it doesn't overwrite a more
      // meaningful metal name (e.g. ConstantesCondicionales' 'Ca²⁺' default).
      ...(sys.metalLabel !== 'M' ? { metalLabel: sys.metalLabel } : {}),
      logBetasOH: sys.logBetasOH.length > 0 ? sys.logBetasOH : undefined,
      ligandLabel: hasAux ? sys.ligandLabel : undefined,
      logBetas: hasAux ? sys.logBetasL : undefined,
    }));
  }, [sys.metalLabel, sys.logBetasOH, sys.showAux, sys.ligandLabel, sys.logBetasL, setCarryOver]);

  useShareEffect('especiacion', { sys, pHRead }, (s) => {
    // Merge over defaults: saved links from before the X branch existed lack
    // showX/side and would otherwise crash on s.side.* reads.
    if (s.sys) setSys({ ...defaultState(), ...s.sys });
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
    [sys.cM, sys.logBetasOH, sys.showAux, sys.logBetasL, sys.pKasL, sys.cL, sys.showX, sys.side],
  );
  const labels = useMemo(
    () => effectiveLabels(sys),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sys.speciesLabels, sys.metalLabel, sys.ligandLabel, sys.logBetasOH.length, sys.logBetasL.length, sys.showAux, sys.showX, sys.side.showAux, sys.side.auxLabel, sys.side.logBetasAux.length],
  );
  const nOH = sys.logBetasOH.length;
  const nL = sys.showAux ? sys.logBetasL.length : 0;
  const nX = system.x?.logBetasX.length ?? 0;
  const nSpecies = 1 + nOH + nL + nX;

  const curve = useMemo(() => speciationCurve(system, PH_RANGE, PH_POINTS), [system]);
  // Keyed on fractions, not pL: in the X-only 'total' path pL stays Infinity
  // while an unsolvable X balance poisons the fractions via pX = NaN.
  const hasNaN = useMemo(() => curve.some((pt) => Number.isNaN(pt.fractions[0])), [curve]);

  const readPoint = useMemo(() => speciationAtPH(system, pHRead), [system, pHRead]);
  const readValid = !Number.isNaN(readPoint.fractions[0]);
  const domIdx = readValid ? readPoint.fractions.indexOf(Math.max(...readPoint.fractions)) : -1;
  const famFree = readValid ? readPoint.fractions[0] : NaN;
  const famOH = readValid ? readPoint.fractions.slice(1, 1 + nOH).reduce((a, b) => a + b, 0) : NaN;
  const famL = readValid ? readPoint.fractions.slice(1 + nOH, 1 + nOH + nL).reduce((a, b) => a + b, 0) : NaN;
  const famX = readValid ? readPoint.fractions.slice(1 + nOH + nL).reduce((a, b) => a + b, 0) : NaN;

  const exportMetadata = useMemo(() => ({
    Módulo: 'Especiación del metal',
    Metal: sys.metalLabel || 'M',
    Ligando: sys.showAux ? (sys.ligandLabel || 'L') : '(ninguno)',
    'Agente X': nX > 0 ? (sys.side.auxLabel || 'X') : '(ninguno)',
    'CM / M': system.cM.toExponential(3),
    'CL / M': system.cL.toExponential(3),
  }), [sys.metalLabel, sys.ligandLabel, sys.showAux, sys.side.auxLabel, nX, system.cM, system.cL]);

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

  // Geometry only depends on the system — labels are attached in a cheap
  // second pass so renaming species doesn't re-run the 1500-sample sweep
  // (each sample is a nested bisection when X is an analytical total).
  const zoneGeometry = useMemo(
    () => predominanceZonesVsPH(system, [], PH_RANGE),
    [system],
  );
  const zones = useMemo(
    () => zoneGeometry.map((z) => ({ ...z, label: labels[z.index] ?? z.label })),
    [zoneGeometry, labels],
  );

  // 2D predominance map (pL–pH): metal + hydrolysis + primary ligand L, with pH
  // and free pL as independent axes. X is intentionally excluded here — a second
  // ligand is the pL–pX map's job (Complejos). Needs a ligand for the pL axis to
  // mean anything; without one the field is just vertical pH stripes.
  const has2D = nL > 0;
  const pLmax2D = useMemo(
    () => Math.max((sys.showAux ? Math.max(0, ...sys.logBetasL) : 0) + 4, 8),
    [sys.showAux, sys.logBetasL],
  );
  const grid2D = useMemo(
    () => (has2D
      ? predominanceGrid(
        (pH, pL) => speciationFractions(pH, pL, sys.logBetasOH, sys.logBetasL),
        PH_RANGE, [0, pLmax2D],
      )
      : null),
    [has2D, sys.logBetasOH, sys.logBetasL, pLmax2D],
  );
  const labels2D = useMemo(() => labels.slice(0, 1 + nOH + nL), [labels, nOH, nL]);

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
    {
      id: 'map2d',
      label: 'Mapa 2D (pL–pH)',
      node: grid2D ? (
        <Predominance2D
          grid={grid2D}
          colors={SPECIES_COLORS}
          labels={labels2D}
          xLabel="pH"
          yLabel={`pL (−log[${sys.ligandLabel || 'L'}])`}
          marker={Number.isFinite(readPoint.pL) ? { x: pHRead, y: readPoint.pL, label: `pH ${pHRead.toFixed(1)}` } : undefined}
          caption="Zonas de predominio en 2D"
        />
      ) : (
        <div className="map2d-empty">
          <p>
            Activa un <strong>ligando auxiliar (M–L)</strong> con al menos un log β para dibujar
            el mapa 2D pL–pH. Sin ligando, la especiación solo depende del pH — usa
            <strong> Distribución α</strong> o <strong>DUZP</strong>.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title={`Especiación del metal (M–OH–L${nX > 0 ? '–X' : ''} vs pH)`} onReset={reset} moduleId="especiacion">
        <PanelSection title="Metal e hidrólisis" icon="⚛">
          <ModelBadge
            model={nOH === 0 ? 'sin hidrólisis modelada' : `hidrólisis hasta M(OH)${toSub(nOH)}`}
            additions={[
              nL > 0 && `complejación con ${sys.ligandLabel || 'L'} hasta ML${toSub(nL)}`,
              nX > 0 && `segundo agente ${sys.side.auxLabel || 'X'} hasta MX${toSub(nX)}`,
            ]}
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
          <p className="hint">
            {sys.ligandLabel || 'L'} es un ligando disuelto que se une al metal (NH₃, citrato, en…).
            NH₃/NH₄⁺: pKa ≈ 9.25. Sin pKa: se asume el ligando ya libre (sin protonación).
          </p>
        </Disclosure>

        <Disclosure
          title="Segundo agente complejante (X)"
          open={sys.showX}
          onToggle={(showX) => setSys({
            ...sys,
            showX,
            // Jump straight to the X editor instead of leaving it collapsed
            // behind a second click — same UX as Complejos' coupled mode.
            side: showX ? { ...sys.side, showAux: true } : sys.side,
            speciesLabels: null,
            reference: null,
          })}
        >
          <SideReactionEditor
            state={sys.side}
            onChange={(side) => setSys({ ...sys, side, speciesLabels: null, reference: null })}
            showLigandPKas={false}
            showComplexSection={false}
            showHydrolysisSection={false}
            auxLigandTitle={`Ligando X (${sys.side.auxLabel || 'X'}) — presets y log β`}
          />
          <p className="hint">
            <strong>X es un segundo agente complejante disuelto</strong> (NH₃, citrato, en…) que
            compite con {sys.ligandLabel || 'L'} por el metal. El disolvente (agua) no es X: ya
            está incluido en los log β.
          </p>
          <p className="hint">
            M se reparte entre OH⁻, {sys.ligandLabel || 'L'} y X resolviendo los balances de masa
            acoplados en cada pH — sin especies mixtas (M(OH)L, MLX…). Si X se da como total
            analítico con pKa, su protonación entra vía α_X(H) a cada pH.
          </p>
        </Disclosure>

        <Disclosure title="Nombres de especies">
          <LabelList
            prefix="Especie"
            values={labels}
            onChange={(speciesLabels) => setSys({ ...sys, speciesLabels })}
          />
          <p className="hint">
            Solo cambia cómo se muestran las especies en gráficas y resultados, no el cálculo.
            Editar una constante (log β, metal, ligando) restablece los nombres genéricos.
          </p>
        </Disclosure>

        <PanelSection title="Lectura" icon="∑">
          <Slider label="pH de lectura" value={pHRead} min={0} max={14} step={0.1} onChange={setPHRead} decimals={1} />
          {readValid ? (
            <ResultCard items={[
              { label: 'Especie dominante', value: `${labels[domIdx]} (α = ${readPoint.fractions[domIdx].toFixed(3)})` },
              { label: 'pL libre', value: Number.isFinite(readPoint.pL) ? readPoint.pL.toFixed(3) : '∞ (sin ligando)' },
              ...(nX > 0 ? [{ label: 'pX libre', value: Number.isFinite(readPoint.pX) ? readPoint.pX.toFixed(3) : '∞' }] : []),
              { label: 'n̄ (L coordinados)', value: readPoint.nBar.toFixed(2) },
              {
                label: nX > 0 ? '% M libre / hidroxo / L / X' : '% M libre / hidroxo / L-complejado',
                value: nX > 0
                  ? `${(famFree * 100).toFixed(1)} / ${(famOH * 100).toFixed(1)} / ${(famL * 100).toFixed(1)} / ${(famX * 100).toFixed(1)}`
                  : `${(famFree * 100).toFixed(1)} / ${(famOH * 100).toFixed(1)} / ${(famL * 100).toFixed(1)}`,
              },
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
            <strong>Distribución α</strong>: a cada pH se resuelven los ligandos libres
            (balances de masa) y el metal se reparte entre M libre, M(OH)ⱼ, MLᵢ y — si lo
            activas — MXₖ del segundo agente complejante; todas las ramas están acopladas
            por el mismo denominador.
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
          ...(nX > 0 ? [{ label: '% X-complejado', value: readValid ? `${(famX * 100).toFixed(1)} %` : '—' }] : []),
        ]} />
      </section>
    </div>
  );
}
