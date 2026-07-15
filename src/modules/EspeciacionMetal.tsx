import { useEffect, useMemo, useState } from 'react';
import { useShareEffect, hasSharedUrlState } from '../hooks/useShareableState';
import { useComplejosCarryOver, type ComplejosCarryOver } from '../context/ComplejosCarryOverContext';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import PredominanceDiagram from '../components/PredominanceDiagram';
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
import { useT } from '../hooks/useT';

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
  const t = useT();
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
  // predominance-diagram sweep, since neither reads a label.
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
      label: t('complejos.tabAlpha'),
      node: (
        <Chart
          data={alphaTraces}
          xTitle="pH"
          yTitle={t('complejos.alphaFraction')}
          xRange={PH_RANGE}
          yRange={[0, 1.02]}
          shapes={alphaReadShape}
          exportName="equilibria-especiacion-alfa"
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
          pMin={PH_RANGE[0]}
          pMax={PH_RANGE[1]}
          pLabel="pH"
          marker={{ p: pHRead, label: `pH ${pHRead.toFixed(1)}` }}
          caption={t('complejos.predominanceCaption')}
        />
      ),
    },
    {
      id: 'logc',
      label: t('complejos.tabLogC'),
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
      label: t('especiacion.tabMap2D'),
      node: grid2D ? (
        <Predominance2D
          grid={grid2D}
          colors={SPECIES_COLORS}
          labels={labels2D}
          xLabel="pH"
          yLabel={`pL (−log[${sys.ligandLabel || 'L'}])`}
          marker={Number.isFinite(readPoint.pL) ? { x: pHRead, y: readPoint.pL, label: `pH ${pHRead.toFixed(1)}` } : undefined}
          caption={t('complejos.map2dCaption')}
          exportName="equilibria-especiacion-map2d"
          exportMetadata={exportMetadata}
        />
      ) : (
        <div className="map2d-empty">
          <p>
            {t('especiacion.map2dEmptyPrefix')} <strong>{t('especiacion.map2dEmptyModeBold')}</strong>{' '}
            {t('especiacion.map2dEmptyMid')} <strong>{t('complejos.tabAlpha')}</strong>{' '}
            {t('complejos.map2dEmptyOr')} <strong>{t('complejos.tabPredominance')}</strong>{t('complejos.map2dEmptySuffix')}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title={t('especiacion.title', { x: nX > 0 ? '–X' : '' })} onReset={reset} moduleId="especiacion">
        <PanelSection title={t('especiacion.metalHydrolysisSection')} icon="⚛">
          <ModelBadge
            model={nOH === 0 ? t('especiacion.noHydrolysis') : t('especiacion.hydrolysisUpTo', { n: toSub(nOH) })}
            additions={[
              nL > 0 && t('especiacion.complexationWith', { ligand: sys.ligandLabel || 'L', n: toSub(nL) }),
              nX > 0 && t('especiacion.secondAgentUpTo', { x: sys.side.auxLabel || 'X', n: toSub(nX) }),
            ]}
          />
          <LabelField
            label={t('complejos.metalLabel')}
            value={sys.metalLabel}
            onChange={(metalLabel) => setSys({ ...sys, metalLabel, speciesLabels: null, reference: null })}
          />
          <ConcSlider label={t('complejos.cmLabel')} value={sys.cM} onChange={(cM) => setSys({ ...sys, cM })} />
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
            title={t('especiacion.exampleSystems')}
            items={SPECIATION_PRESETS.map((p) => ({ id: p.id, name: p.name, group: p.group, detail: p.detail }))}
            onSelect={(id) => setSys(fromPreset(id))}
          />
        </PanelSection>

        <Disclosure
          title={t('especiacion.auxLigandSectionTitle')}
          open={sys.showAux}
          onToggle={(showAux) => setSys({ ...sys, showAux })}
        >
          <LabelField
            label={t('especiacion.auxLigandFieldLabel')}
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
          <ConcSlider label={t('complejos.clLabel')} value={sys.cL} onChange={(cL) => setSys({ ...sys, cL })} min={-6} max={1} />
          <ConstantList
            prefix={t('sideReactionEditor.conjugateAcidPrefix')}
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
            {t('especiacion.auxLigandHint', { ligand: sys.ligandLabel || 'L' })}
          </p>
        </Disclosure>

        <Disclosure
          title={t('complejos.secondAgentLabel')}
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
            auxLigandTitle={t('complejos.xLigandTitle', { x: sys.side.auxLabel || 'X' })}
          />
          <p className="hint">
            <strong>{t('complejos.xIsAgentBold')}</strong>{' '}
            {t('especiacion.xIsAgentRest', { ligand: sys.ligandLabel || 'L' })}
          </p>
          <p className="hint">
            {t('especiacion.coupledHint', { ligand: sys.ligandLabel || 'L' })}
          </p>
        </Disclosure>

        <Disclosure title={t('especiacion.speciesNamesSection')}>
          <LabelList
            prefix={t('especiacion.speciesPrefix')}
            values={labels}
            onChange={(speciesLabels) => setSys({ ...sys, speciesLabels })}
          />
          <p className="hint">
            {t('especiacion.speciesNamesHint')}
          </p>
        </Disclosure>

        <PanelSection title={t('especiacion.readingSection')} icon="∑">
          <Slider label={t('especiacion.readPHLabel')} value={pHRead} min={0} max={14} step={0.1} onChange={setPHRead} decimals={1} />
          {readValid ? (
            <ResultCard items={[
              { label: t('complejos.dominantSpecies'), value: `${labels[domIdx]} (α = ${readPoint.fractions[domIdx].toFixed(3)})` },
              { label: t('especiacion.pLFree'), value: Number.isFinite(readPoint.pL) ? readPoint.pL.toFixed(3) : t('especiacion.pLFreeNoLigand') },
              ...(nX > 0 ? [{ label: t('especiacion.pXFree'), value: Number.isFinite(readPoint.pX) ? readPoint.pX.toFixed(3) : '∞' }] : []),
              { label: t('especiacion.nBarLabel'), value: readPoint.nBar.toFixed(2) },
              {
                label: nX > 0 ? t('especiacion.pctBreakdownX') : t('especiacion.pctBreakdownNoX'),
                value: nX > 0
                  ? `${(famFree * 100).toFixed(1)} / ${(famOH * 100).toFixed(1)} / ${(famL * 100).toFixed(1)} / ${(famX * 100).toFixed(1)}`
                  : `${(famFree * 100).toFixed(1)} / ${(famOH * 100).toFixed(1)} / ${(famL * 100).toFixed(1)}`,
              },
            ]} />
          ) : (
            <p className="hint">
              {t('especiacion.noSolutionPart1')}<sub>L</sub>{t('especiacion.noSolutionPart2')}<sub>M</sub>
              {t('especiacion.noSolutionPart3')}<sub>L</sub>{t('especiacion.noSolutionPart4')}<sub>M</sub>{t('especiacion.noSolutionPart5')}
            </p>
          )}
          {hasNaN && (
            <p className="hint">{t('especiacion.gapWarning')}</p>
          )}
        </PanelSection>

        <InfoBox title={t('complejos.howToReadTitle')}>
          <p>
            <strong>{t('complejos.tabAlpha')}</strong>{t('especiacion.alphaExplainBody')}
          </p>
          <p>
            <strong>{t('complejos.tabPredominance')}</strong>{t('especiacion.predominanceExplainBody')}
          </p>
          <p>
            <strong>{t('especiacion.assumptionsTitle')}</strong>{t('especiacion.assumptionsBody')}
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="alpha" />
        <ResultCardRow items={[
          { label: t('especiacion.dominantAtReadPH'), value: readValid ? labels[domIdx] : '—', accent: true },
          { label: t('especiacion.pLFree'), value: readValid && Number.isFinite(readPoint.pL) ? readPoint.pL.toFixed(2) : '—' },
          { label: t('especiacion.nBarShort'), value: readValid ? readPoint.nBar.toFixed(2) : '—' },
          { label: t('especiacion.pctFreeM'), value: readValid ? `${(famFree * 100).toFixed(1)} %` : '—' },
          { label: t('especiacion.pctHydroxo'), value: readValid ? `${(famOH * 100).toFixed(1)} %` : '—' },
          { label: t('especiacion.pctLComplexed'), value: readValid ? `${(famL * 100).toFixed(1)} %` : '—' },
          ...(nX > 0 ? [{ label: t('especiacion.pctXComplexed'), value: readValid ? `${(famX * 100).toFixed(1)} %` : '—' }] : []),
        ]} />
      </section>
    </div>
  );
}
