import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data, Annotations, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import {
  InfoBox, LabelField, ModelBadge, NumberSegmented, PanelSection, ResultCard,
  ResultCardRow, SelectControl, Slider, Toggle,
} from '../components/Controls';
import {
  availableSystems, buildSystem, buildArbitraryDiagram, getSystemDef, presetToArbitrary, waterLines, S_NERNST,
  type ArbSpecies, type ArbCouple,
} from '../lib/pourbaix';
import { formatMolar } from '../lib/format';
import { useT } from '../hooks/useT';
import { generalizedRedoxGrid, isRedoxGraphConnected, redoxGraphPotentials, defaultPoolStoich, type RedoxGraph } from '../lib/generalizedRedoxDiagram';

// ── Arbitrary custom system types ─────────────────────────────────────────────

interface ArbitraryCustom {
  species: ArbSpecies[];
  couples: ArbCouple[];
}

const DEFAULT_ARB: ArbitraryCustom = {
  species: [
    { kind: 'ion',      formula: 'M²⁺',    z: 2 },
    { kind: 'hydroxide',formula: 'M(OH)₂', z: 2, pKsp: 15.8, ionRef: 'M²⁺' },
    { kind: 'metal',    formula: 'M' },
  ],
  couples: [
    { ox: 'M²⁺', red: 'M', E0: -0.257, n: 2 },
  ],
};

// ── Species editor ─────────────────────────────────────────────────────────────

function SpeciesEditor({
  species,
  onChange,
}: {
  species: ArbSpecies[];
  onChange: (s: ArbSpecies[]) => void;
}) {
  const t = useT();
  const ions = species.filter((s) => s.kind === 'ion');

  function update(idx: number, patch: Partial<ArbSpecies>) {
    const next = species.map((s, i) => (i === idx ? { ...s, ...patch } as ArbSpecies : s));
    onChange(next);
  }
  function remove(idx: number) {
    onChange(species.filter((_, i) => i !== idx));
  }
  function addIon() {
    onChange([...species, { kind: 'ion', formula: 'X²⁺', z: 2 }]);
  }
  function addHydrox() {
    const ref = ions[0]?.formula ?? '';
    onChange([...species, { kind: 'hydroxide', formula: 'X(OH)₂', z: 2, pKsp: 15, ionRef: ref }]);
  }
  function addMetal() {
    onChange([...species, { kind: 'metal', formula: 'X' }]);
  }

  return (
    <div className="arbitrary-editor">
      {species.map((sp, i) => (
        <div key={i} className="editor-card">
          <div className="editor-card-header">
            <span className="editor-card-kind">
              {sp.kind === 'ion' ? t('pourbaix.kindIon') : sp.kind === 'hydroxide' ? t('pourbaix.kindHydroxide') : t('pourbaix.kindMetal')}
            </span>
            <button type="button" className="icon-remove-btn" onClick={() => remove(i)} aria-label={t('controls.remove')}>×</button>
          </div>

          <LabelField label={t('pourbaix.formulaLabel')} value={sp.formula} onChange={(formula) => update(i, { formula })} />

          {sp.kind === 'ion' && (
            <NumberSegmented label={t('pourbaix.chargeZLabel')} value={sp.z} options={[1, 2, 3, 4]} onChange={(z) => update(i, { z })} />
          )}

          {sp.kind === 'hydroxide' && (
            <>
              <NumberSegmented label={t('pourbaix.chargeZLabel')} value={sp.z} options={[1, 2, 3, 4]} onChange={(z) => update(i, { z })} />
              <Slider
                label={t('titulacion.pKspShort')}
                helpId="pKsp"
                value={sp.pKsp} min={2} max={50} step={0.1}
                onChange={(pKsp) => update(i, { pKsp })}
                decimals={1}
              />
              <SelectControl
                label={t('pourbaix.referenceIonLabel')}
                value={sp.ionRef}
                options={ions.map((ion) => ({ value: ion.formula, label: ion.formula }))}
                onChange={(ionRef) => update(i, { ionRef })}
              />
            </>
          )}
        </div>
      ))}
      <div className="editor-actions">
        <button type="button" className="editor-add-btn" onClick={addIon}>{t('pourbaix.addIonButton')}</button>
        <button type="button" className="editor-add-btn" onClick={addHydrox}>{t('pourbaix.addHydroxideButton')}</button>
        <button type="button" className="editor-add-btn" onClick={addMetal}>{t('pourbaix.addMetalButton')}</button>
      </div>
    </div>
  );
}

// ── Couple editor ──────────────────────────────────────────────────────────────

function CoupleEditorArb({
  couples,
  species,
  onChange,
}: {
  couples: ArbCouple[];
  species: ArbSpecies[];
  onChange: (c: ArbCouple[]) => void;
}) {
  const t = useT();
  const ions   = species.filter((s) => s.kind === 'ion').map((s) => s.formula);
  const metals = species.filter((s) => s.kind === 'metal').map((s) => s.formula);
  const redOpts = [...ions, ...metals];

  function update(idx: number, patch: Partial<ArbCouple>) {
    onChange(couples.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function remove(idx: number) {
    onChange(couples.filter((_, i) => i !== idx));
  }
  function addCouple() {
    const ox = ions[0] ?? '';
    const red = metals[0] ?? ions[1] ?? '';
    onChange([...couples, { ox, red, E0: 0, n: 2 }]);
  }

  return (
    <div className="arbitrary-editor">
      {couples.map((c, i) => (
        <div key={i} className="editor-card">
          <div className="editor-card-header">
            <span className="editor-card-kind">
              {t('pourbaix.redoxCoupleN', { n: i + 1 })}
            </span>
            <button type="button" className="icon-remove-btn" onClick={() => remove(i)} aria-label={t('controls.remove')}>×</button>
          </div>

          <div className="control-grid-2">
            <SelectControl label={t('pourbaix.oxLeftLabel')} value={c.ox} options={ions.map((f) => ({ value: f, label: f }))} onChange={(ox) => update(i, { ox })} />
            <SelectControl label={t('pourbaix.redRightLabel')} value={c.red} options={redOpts.map((f) => ({ value: f, label: f }))} onChange={(red) => update(i, { red })} />
          </div>

          <Slider
            label={`E° = ${c.E0.toFixed(3)} V`}
            helpId="E0"
            value={c.E0} min={-2} max={2} step={0.001}
            onChange={(E0) => update(i, { E0 })}
            decimals={3}
          />

          <NumberSegmented label={t('pourbaix.electronsNLabel')} value={c.n} options={[1, 2, 3, 4]} onChange={(n) => update(i, { n })} />
        </div>
      ))}
      <button type="button" className="editor-add-btn" onClick={addCouple}>{t('pourbaix.addCoupleButton')}</button>
    </div>
  );
}

function nearestRegionName(
  regions: { name: string; labelPH: number; labelE: number }[],
  pH: number,
  E: number,
): string {
  if (regions.length === 0) return '—';
  // Normalize axes to equal weight: pH spans 0–14, E spans –1.6 to 2.2 (3.8 V)
  const pHRange = 14, ERange = 3.8;
  const dist = (r: { labelPH: number; labelE: number }) =>
    ((pH - r.labelPH) / pHRange) ** 2 + ((E - r.labelE) / ERange) ** 2;
  let best = regions[0];
  let bestD = dist(best);
  for (const r of regions.slice(1)) {
    const d = dist(r);
    if (d < bestD) { best = r; bestD = d; }
  }
  return best.name;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Pourbaix diagrams (E vs pH) derived from primitive thermodynamic data. */
export default function Pourbaix() {
  const t = useT();
  const systems = availableSystems();
  const [systemId, setSystemId] = useState('fe');
  const [useCustom, setUseCustom] = useState(false);
  const [logC, setLogC] = useState(-2);
  const [showWater, setShowWater] = useState(false);
  const [cursorPH, setCursorPH] = useState(7);
  const [cursorE, setCursorE] = useState(0);
  const [arb, setArb] = useState<ArbitraryCustom>(DEFAULT_ARB);
  const [editWarnings, setEditWarnings] = useState<string[]>([]);
  const [showGeneralizedGraph, setShowGeneralizedGraph] = useState(false);
  const [graphPX, setGraphPX] = useState(0);
  const [ligandShift, setLigandShift] = useState(0);

  function editCurrentSystem() {
    const def = getSystemDef(systemId);
    if (!def) return;
    const { arb: converted, warnings } = presetToArbitrary(def);
    setArb(converted);
    setEditWarnings(warnings);
    setUseCustom(true);
  }

  const exportMetadata = useMemo(() => ({
    Módulo: 'Pourbaix',
    Sistema: useCustom ? `personalizado (${arb.species.find((s) => s.kind === 'ion')?.formula ?? 'M'})` : systemId,
    'log C': logC.toFixed(1),
  }), [useCustom, arb.species, systemId, logC]);

  useShareEffect('pourbaix', { systemId, useCustom, logC, showWater, cursorPH, cursorE, arb, showGeneralizedGraph, graphPX, ligandShift }, (s) => {
    if (s.systemId) setSystemId(s.systemId);
    if (s.useCustom !== undefined) setUseCustom(s.useCustom);
    if (s.logC !== undefined) setLogC(s.logC);
    if (s.showWater !== undefined) setShowWater(s.showWater);
    if (s.cursorPH !== undefined) setCursorPH(s.cursorPH);
    if (s.cursorE !== undefined) setCursorE(s.cursorE);
    if (s.arb) setArb(s.arb);
    if (s.showGeneralizedGraph !== undefined) setShowGeneralizedGraph(s.showGeneralizedGraph);
    if (s.graphPX !== undefined) setGraphPX(s.graphPX);
    if (s.ligandShift !== undefined) setLigandShift(s.ligandShift);
  });

  function reset() {
    setSystemId('fe');
    setUseCustom(false);
    setLogC(-2);
    setShowWater(false);
    setCursorPH(7);
    setCursorE(0);
    setArb(DEFAULT_ARB);
    setEditWarnings([]);
    setShowGeneralizedGraph(false); setGraphPX(0); setLigandShift(0);
  }

  const diagram = useMemo(
    () => (!useCustom ? buildSystem(systemId, logC) : null),
    [systemId, logC, useCustom],
  );

  const arbDiagram = useMemo(
    () => (useCustom ? buildArbitraryDiagram(arb.species, arb.couples, logC) : null),
    [arb, logC, useCustom],
  );
  const redoxGraph = useMemo<RedoxGraph>(() => ({
    nodes: arb.species.map((species) => ({
      id: species.formula, label: species.formula,
      phase: species.kind === 'ion' ? 'aqueous' as const : 'solid' as const,
      logActivity: species.kind === 'ion' ? logC : 0,
      poolStoich: defaultPoolStoich(species.kind),
    })),
    edges: [
      ...arb.couples.map((couple) => ({
        from: couple.ox, to: couple.red,
        logK0: couple.n * couple.E0 / S_NERNST,
        pHCoefficient: -(couple.mH ?? 0), pXCoefficient: ligandShift,
        peCoefficient: -couple.n,
      })),
      ...arb.species.filter((species) => species.kind === 'hydroxide').map((species) => ({
        from: species.ionRef, to: species.formula,
        logK0: species.pKsp - 14 * species.z,
        pHCoefficient: species.z,
      })),
    ],
  }), [arb, logC, ligandShift]);
  const redoxGraphConnected = useMemo(
    () => isRedoxGraphConnected(redoxGraph),
    [redoxGraph],
  );
  const graphGrid = useMemo(() => {
    if (!showGeneralizedGraph || !useCustom || !redoxGraphConnected) return null;
    return generalizedRedoxGrid(redoxGraph, [0, 14], [-1.6 / S_NERNST, 2.2 / S_NERNST], graphPX, 100, 100);
  }, [showGeneralizedGraph, useCustom, redoxGraphConnected, redoxGraph, graphPX]);
  const graphPoint = useMemo(() => {
    if (!showGeneralizedGraph || !useCustom || !redoxGraphConnected) return null;
    try {
      return redoxGraphPotentials(redoxGraph, cursorPH, graphPX, cursorE / S_NERNST);
    } catch {
      return null;
    }
  }, [showGeneralizedGraph, useCustom, redoxGraphConnected, redoxGraph, cursorPH, graphPX, cursorE]);
  const graphDominant = graphPoint
    ? redoxGraph.nodes[graphPoint.fractions.indexOf(Math.max(...graphPoint.fractions))]?.label ?? '—'
    : null;

  const { traces, annotations } = useMemo(() => {
    const data: Data[] = [];
    const ann: Partial<Annotations>[] = [];

    if (graphGrid) {
      data.push({
        x: Array.from({ length: graphGrid.nx }, (_, i) => 14 * i / (graphGrid.nx - 1)),
        y: Array.from({ length: graphGrid.ny }, (_, i) => -1.6 + 3.8 * i / (graphGrid.ny - 1)),
        z: graphGrid.dominant, type: 'heatmap', showscale: false, opacity: 0.22,
        hovertemplate: 'pH %{x:.2f}<br>E %{y:.3f} V<extra></extra>',
      });
    }

    const src = diagram ?? arbDiagram;
    if (src) {
      src.lines.forEach((l) =>
        data.push({
          x: l.pH, y: l.E, type: 'scatter', mode: 'lines', name: l.name,
          line: { width: 2.5, color: l.color },
          hovertemplate: `${l.equation}<extra>${l.name}</extra>`,
        }),
      );
      src.regions.forEach((r) =>
        ann.push({ x: r.labelPH, y: r.labelE, text: `<b>${r.name}</b>`, showarrow: false, font: { size: 13, color: '#2c3e50' } }),
      );
    }

    if (showWater) {
      const w = waterLines();
      const phs = [0, 14];
      data.push(
        { x: phs, y: phs.map((p) => w.o2.A - w.o2.B * p), type: 'scatter', mode: 'lines', name: 'O₂/H₂O', line: { width: 1.5, color: '#7F8C8D', dash: 'dash' }, hovertemplate: `O₂ + 4H⁺ + 4e⁻ → 2H₂O<extra>${t('pourbaix.o2LimitLabel')}</extra>` },
        { x: phs, y: phs.map((p) => w.h2.A - w.h2.B * p), type: 'scatter', mode: 'lines', name: 'H₂O/H₂', line: { width: 1.5, color: '#7F8C8D', dash: 'dot' },  hovertemplate: `2H⁺ + 2e⁻ → H₂<extra>${t('pourbaix.h2LimitLabel')}</extra>` },
      );
    }

    return { traces: data, annotations: ann };
  }, [diagram, arbDiagram, graphGrid, showWater, t]);

  const predominant = useMemo(() => {
    const src = diagram ?? arbDiagram;
    if (!src) return '—';
    return nearestRegionName(src.regions, cursorPH, cursorE);
  }, [diagram, arbDiagram, cursorPH, cursorE]);

  const cursorShapes = useMemo<Partial<Shape>[]>(() => [
    {
      type: 'line', x0: cursorPH, x1: cursorPH, y0: -1.6, y1: 2.2,
      line: { color: '#CC79A7', width: 1.5, dash: 'dashdot' },
    },
    {
      type: 'line', x0: 0, x1: 14, y0: cursorE, y1: cursorE,
      line: { color: '#0072B2', width: 1.5, dash: 'dot' },
    },
  ], [cursorPH, cursorE]);

  return (
    <div className="module">
      <PanelShell title={t('pourbaix.title')} onReset={reset} moduleId="pourbaix" guideId="pourbaix">
        <PanelSection title={t('acidoBase.systemSection')}>
          <ModelBadge
            model={useCustom ? t('pourbaix.arbitrarySystemModel') : t('pourbaix.metalWaterSystemModel')}
            additions={[!useCustom && t('pourbaix.additionDbSpecies'), showWater && t('pourbaix.additionWaterStability')]}
          />

          <Toggle
            label={t('pourbaix.customModeToggle')}
            checked={useCustom}
            onChange={(v) => { setUseCustom(v); setEditWarnings([]); }}
          />

          {!useCustom ? (
            <>
              <SelectControl
                label={t('pourbaix.metalWaterSystemLabel')}
                value={systemId}
                options={systems.map((s) => ({ value: s.id, label: s.name }))}
                onChange={(v) => { setSystemId(v); setEditWarnings([]); }}
              />
              {diagram && diagram.excluded.length > 0 && (
                <p className="badge warn">
                  {t('pourbaix.simplifiedDiagramWarning', { list: diagram.excluded.join(', ') })}
                </p>
              )}
              <button type="button" className="add-btn" onClick={editCurrentSystem}>
                {t('pourbaix.editSystemButton')}
              </button>
              <p className="hint">
                {t('pourbaix.editSystemHint')}
              </p>
            </>
          ) : (
            <>
              {editWarnings.length > 0 && (
                <p className="badge warn">
                  {t('pourbaix.notConvertedWarning', { list: editWarnings.join(', ') })}
                </p>
              )}
              <p className="editor-title pourbaix-editor-title">{t('pourbaix.speciesTitle')}</p>
              <SpeciesEditor species={arb.species} onChange={(species) => setArb((a) => ({ ...a, species }))} />
              <p className="editor-title pourbaix-editor-title pourbaix-editor-title-next">{t('pourbaix.fundamentalCouplesTitle')}</p>
              <CoupleEditorArb couples={arb.couples} species={arb.species} onChange={(couples) => setArb((a) => ({ ...a, couples }))} />
            </>
          )}
        </PanelSection>

        <PanelSection title={t('acidoBase.conditionsSection')}>
          <Slider
            label={t('pourbaix.logCLabel', { molar: formatMolar(Math.pow(10, logC)) })}
            value={logC} min={-6} max={0} step={0.5}
            onChange={setLogC}
            decimals={1}
          />
          <Toggle label={t('pourbaix.waterStabilityLinesToggle')} checked={showWater} onChange={setShowWater} />
          {useCustom && (
            <>
              <Toggle label={t('pourbaix.generalizedGraphToggle')} checked={showGeneralizedGraph} onChange={setShowGeneralizedGraph} />
              {showGeneralizedGraph && (
                <>
                  <Slider label="pX" value={graphPX} min={-5} max={30} step={0.1} decimals={1} onChange={setGraphPX} />
                  <Slider label={t('pourbaix.ligandEdgeCoefficient')} value={ligandShift} min={-6} max={6} step={1} decimals={0} onChange={setLigandShift} />
                  {!redoxGraphConnected && (
                    <p className="badge warn">{t('pourbaix.disconnectedGraphHint')}</p>
                  )}
                </>
              )}
            </>
          )}
        </PanelSection>

        <PanelSection title={t('pourbaix.cursorSection')}>
          <Slider label={t('potencialcond.cursorPHLabel')} value={cursorPH} min={0} max={14} step={0.1} onChange={setCursorPH} decimals={1} />
          <Slider label={t('pourbaix.cursorELabel')} value={cursorE} min={-1.6} max={2.2} step={0.05} onChange={setCursorE} decimals={2} />
        </PanelSection>

        {graphDominant && (
        <PanelSection title={t('complejos.resultSection')}>
          <ResultCard items={[
            { label: t('pourbaix.graphPredominant'), value: graphDominant },
            { label: t('pourbaix.hessCycleError'), value: graphPoint!.maxCycleError.toExponential(1) },
            { label: t('pourbaix.poolConservationError'), value: graphPoint!.poolError.toExponential(1) },
          ]} />
        </PanelSection>
        )}

        <InfoBox title={t('pourbaix.infoBoxTitle')}>
          <p>
            {t('pourbaix.para1Prefix')}<strong>{t('pourbaix.hessBold')}</strong>{t('pourbaix.para1Suffix')}
          </p>
          <p>
            {t('pourbaix.para2')}
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle="pH"
          yTitle={t('pourbaix.eAxisLabel')}
          xRange={[0, 14]}
          yRange={[-1.6, 2.2]}
          shapes={cursorShapes}
          annotations={annotations}
          exportName={`equilibria-lab-pourbaix-${useCustom ? 'custom' : systemId}`}
          exportMetadata={exportMetadata}
        />
        <ResultCardRow items={[
          { label: t('pourbaix.predominantSpeciesLabel'), value: predominant, accent: true },
          { label: t('pourbaix.conditionsResultLabel'), value: `pH ${cursorPH.toFixed(1)} · E ${cursorE.toFixed(2)} V` },
          { label: t('pourbaix.logCDissolvedLabel'), value: formatMolar(Math.pow(10, logC)) },
        ]} />
      </section>
    </div>
  );
}
