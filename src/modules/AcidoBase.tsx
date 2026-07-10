import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data, Shape } from 'plotly.js';
import PanelShell from '../components/PanelShell';
import Chart from '../components/Chart';
import DUZP from '../components/DUZP';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, PanelSection, ResultCardRow, Segmented, Slider, Toggle } from '../components/Controls';
import { AcidSystemEditor } from '../components/Editors';
import { defaultAcidSystem, isValidAcidSystem, systemLabels, type AcidSystem } from '../lib/editorModels';
import { MARKER_COLOR, SPECIES_COLORS } from '../lib/database';
import { ladderFractions, ladderLogC, predominanceZones } from '../lib/ladder';
import { solvePH, saltCounterIons, defaultStartIndex } from '../lib/equilibrium';
import type { GammaModel } from '../lib/activity';
import { useActivityNote } from '../context/ActivityContext';

const PH_POINTS = 400;
const GAMMA_MODELS: { value: GammaModel; label: string }[] = [
  { value: 'dh', label: 'D-H extendida' },
  { value: 'davies', label: 'Davies' },
  { value: 'guntelberg', label: 'Güntelberg' },
];
function isValidGammaModel(v: unknown): v is GammaModel {
  return v === 'dh' || v === 'davies' || v === 'guntelberg';
}

/** Acid-base equilibrium (mono and polyprotic): DUZP + α distribution + logC diagram. */
export default function AcidoBase() {
  const { showActivityNote } = useActivityNote();
  const [system, setSystem] = useState<AcidSystem>(defaultAcidSystem());
  const [conc, setConc] = useState(0.1);
  const [showSystemPH, setShowSystemPH] = useState(false);
  const [ionicStrength, setIonicStrength] = useState(0);
  const [gammaModel, setGammaModel] = useState<GammaModel>('dh');

  useShareEffect('acidobase', { system, conc, showSystemPH, ionicStrength, gammaModel }, (s) => {
    // A malformed/stale system (untrusted URL) NaN-poisons solvePH into a
    // silent bogus pH instead of an error — same class of bug fixed in
    // Mezclas.tsx, guarded here too since this module restores AcidSystem
    // the same way.
    if (isValidAcidSystem(s.system)) setSystem(s.system);
    if (s.conc !== undefined) setConc(s.conc);
    if (s.showSystemPH !== undefined) setShowSystemPH(s.showSystemPH);
    if (s.ionicStrength !== undefined) setIonicStrength(s.ionicStrength);
    if (isValidGammaModel(s.gammaModel)) setGammaModel(s.gammaModel);
  });

  function reset() {
    setSystem(defaultAcidSystem()); setConc(0.1); setShowSystemPH(false);
    setIonicStrength(0); setGammaModel('dh');
  }

  const labels = systemLabels(system);
  const logCtotal = Math.log10(conc);

  const exportMetadata = useMemo(() => ({
    Módulo: 'Ácido-Base',
    Sistema: system.label,
    'C / M': conc.toFixed(4),
    'I / M': ionicStrength.toFixed(3),
    'Modelo γ': GAMMA_MODELS.find((m) => m.value === gammaModel)?.label ?? gammaModel,
  }), [system.label, conc, ionicStrength, gammaModel]);

  const pHSystem = useMemo(() => {
    // "pH disolución pura" dissolves the system at its default ladder index
    // (the neutral species when one exists; the parent ion itself for an
    // aqua-acid cation that never reaches neutral, e.g. Fe³⁺) — see
    // saltCounterIons/defaultStartIndex in equilibrium.ts for the general
    // derivation, shared with titration.ts's analyte handling.
    const { cations, anions } = saltCounterIons(system.z0, defaultStartIndex(system.z0, system.pKas.length));
    return solvePH([{ c: conc, z0: system.z0, pKas: system.pKas }], cations * conc, anions * conc, ionicStrength, gammaModel);
  }, [system, conc, ionicStrength, gammaModel]);
  const pHInvalid = !Number.isFinite(pHSystem);

  // α distribution vs pH
  const alphaTraces = useMemo<Data[]>(() => {
    const phs: number[] = [];
    const series: number[][] = system.pKas.map(() => []).concat([[]]);
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      ladderFractions(pH, system.pKas, true, system.z0, ionicStrength, gammaModel).forEach((a, j) => series[j].push(a));
    }
    return series.map((ys, j) => ({
      x: phs, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? `Especie ${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `α = %{y:.3f}<extra>${labels[j] ?? ''}</extra>`,
    }));
  }, [system, labels, ionicStrength, gammaModel]);

  // logC vs pH diagram (Sillén) with H₃O⁺/OH⁻ lines
  const logCTraces = useMemo<Data[]>(() => {
    const phs: number[] = [];
    const series: number[][] = system.pKas.map(() => []).concat([[]]);
    const hLine: number[] = [];
    const ohLine: number[] = [];
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      ladderLogC(pH, system.pKas, true, logCtotal, system.z0, ionicStrength, gammaModel).forEach((lc, j) => series[j].push(lc));
      hLine.push(-pH);
      ohLine.push(pH - 14);
    }
    const data: Data[] = series.map((ys, j) => ({
      x: phs, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? `Especie ${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `log C = %{y:.2f}<extra>${labels[j] ?? ''}</extra>`,
    }));
    data.push(
      { x: phs, y: hLine, type: 'scatter', mode: 'lines', name: 'H₃O⁺', line: { width: 2, color: '#7f8c8d', dash: 'dash' } },
      { x: phs, y: ohLine, type: 'scatter', mode: 'lines', name: 'OH⁻', line: { width: 2, color: '#95a5a6', dash: 'dot' } },
    );
    return data;
  }, [system, labels, logCtotal, ionicStrength, gammaModel]);

  const zones = useMemo(
    () => predominanceZones(system.pKas, labels, 0, 14, true, system.z0, ionicStrength, gammaModel),
    [system, labels, ionicStrength, gammaModel],
  );

  const systemShape = useMemo<Partial<Shape>[]>(() => {
    if (!showSystemPH) return [];
    return [{ type: 'line', x0: pHSystem, x1: pHSystem, y0: -14, y1: 1.02, line: { color: MARKER_COLOR, width: 2, dash: 'dashdot' } }];
  }, [showSystemPH, pHSystem]);

  const alphasAtPH = Number.isFinite(pHSystem)
    ? ladderFractions(pHSystem, system.pKas, true, system.z0, ionicStrength, gammaModel)
    : system.pKas.map(() => 0);
  const domIdx = alphasAtPH.indexOf(Math.max(...alphasAtPH));

  // "% + operating point" metrics.
  // pH for 50 % of the active transition = the pKa nearest to the system pH
  // (at pH = pKa the conjugate pair crosses at 50 %).
  const pctDominante = (alphasAtPH[domIdx] ?? 0) * 100;
  const transitionPKa = useMemo(() => {
    if (system.pKas.length === 0 || !Number.isFinite(pHSystem)) return null;
    return system.pKas.reduce((best, pk) =>
      Math.abs(pk - pHSystem) < Math.abs(best - pHSystem) ? pk : best, system.pKas[0]);
  }, [system.pKas, pHSystem]);

  const diagrams = [
    {
      id: 'duzp',
      label: 'DUZP',
      node: (
        <DUZP
          zones={zones}
          pMin={0}
          pMax={14}
          pLabel="pH"
          marker={showSystemPH ? { p: pHSystem, label: `disol. pura · pH ${pHSystem.toFixed(2)}` } : undefined}
          caption="Zonas de predominio"
        />
      ),
    },
    {
      id: 'alpha',
      label: 'Distribución α',
      node: (
        <Chart data={alphaTraces} xTitle="pH" yTitle="Fracción α" xRange={[0, 14]} yRange={[0, 1.02]}
          shapes={showSystemPH ? [{ type: 'line', x0: pHSystem, x1: pHSystem, y0: 0, y1: 1.02, line: { color: MARKER_COLOR, width: 2, dash: 'dashdot' } }] : []}
          exportName="equilibria-acidobase-alfa" exportMetadata={exportMetadata} />
      ),
    },
    {
      id: 'logc',
      label: 'log C',
      node: (
        <Chart data={logCTraces} xTitle="pH" yTitle="log C" xRange={[0, 14]} yRange={[-12, 0.5]}
          shapes={systemShape} exportName="equilibria-acidobase-logc" exportMetadata={exportMetadata} />
      ),
    },
  ];

  return (
    <div className="module">
      <PanelShell title="Equilibrio ácido-base" onReset={reset} moduleId="acidobase">
        <PanelSection title="Sistema" icon="⚛">
          <AcidSystemEditor system={system} onChange={setSystem} allowAquaCations />
        </PanelSection>
        <PanelSection title="Condiciones" icon="⚗">
          <ConcSlider label="Concentración analítica" value={conc} onChange={setConc} />
          <Toggle label="Marcar pH de la disolución pura" checked={showSystemPH} onChange={setShowSystemPH} />
          <details className="section-collapse">
            <summary>Corrección por actividad</summary>
            <Slider label="Fuerza iónica I" helpId="ionicStrength" value={ionicStrength} min={0} max={0.5} step={0.01} onChange={setIonicStrength} decimals={2} />
            <div style={{ marginTop: 6 }}>
              <Segmented
                options={GAMMA_MODELS}
                value={gammaModel}
                onChange={(v) => setGammaModel(isValidGammaModel(v) ? v : 'dh')}
              />
            </div>
            <p className="hint">I = 0 → γ = 1 (resultado termodinámico). A I &gt; 0.1 M los pKa aparentes aumentan y el pH calculado cambia. Davies es válida hasta I ≈ 0.5 M; D-H extendida pierde precisión pasando I ≈ 0.1 M.</p>
          </details>
        </PanelSection>
        {showActivityNote && (
          <InfoBox title="Actividad vs concentración">
            <p>
              Este módulo (y la mayoría de motores) asume <strong>actividades ≈ concentraciones</strong>.
              A I &gt; 0.1 M la corrección Debye-Hückel puede desviar el pH real; use el módulo
              <strong> Actividad / Debye-Hückel</strong> para estimar γ.
            </p>
          </InfoBox>
        )}
        <InfoBox title="Cómo leer estos diagramas">
          <p>
            <strong>DUZP</strong> (zonas de predominio): en cada tramo de pH domina una
            especie; las fronteras están en los pKa.
          </p>
          <p>
            <strong>Distribución α</strong>: fracción de cada especie vs pH; en pH = pKa las
            especies conjugadas se cruzan (α = 0.5).
          </p>
          <p>
            <strong>log C</strong> (Sillén): log de cada concentración con las líneas H₃O⁺/OH⁻.
            La línea rosa marca el pH real de la disolución pura.
          </p>
        </InfoBox>
        <InfoBox title="¿Disolviste la sal de una forma intermedia?">
          <p>
            Este módulo siempre disuelve la forma <strong>más protonada</strong> (z₀) directamente.
            Para calcular el pH de la sal de una forma intermedia o final de un sistema poliprótico
            (ej. NaHCO₃, Na₂HPO₄, KHP) usa <strong>Mezclas</strong> — ahí el selector
            "Forma de partida" agrega el contraión espectador correcto automáticamente.
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs tabs={diagrams} />
        <ResultCardRow items={[
          {
            label: 'pH disolución pura',
            value: pHInvalid ? '—' : pHSystem.toFixed(2),
            accent: true,
          },
          {
            label: `% de ${pHInvalid ? 'especie dom.' : labels[domIdx]} a pH`,
            value: pHInvalid ? '—' : `${pctDominante.toFixed(1)} %`,
          },
          {
            label: 'pH 50 % transición (pKa)',
            value: transitionPKa !== null ? transitionPKa.toFixed(2) : '—',
          },
        ]} />
      </section>
    </div>
  );
}
