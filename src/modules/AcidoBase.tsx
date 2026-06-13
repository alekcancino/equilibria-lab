import { useMemo, useState } from 'react';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import DUZP from '../components/DUZP';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, ResultCard, Toggle } from '../components/Controls';
import { AcidSystemEditor } from '../components/Editors';
import { defaultAcidSystem, systemLabels, type AcidSystem } from '../lib/editorModels';
import { SPECIES_COLORS } from '../lib/database';
import { ladderFractions, ladderLogC, predominanceZones } from '../lib/ladder';
import { solvePH } from '../lib/equilibrium';

const PH_POINTS = 400;

/** Equilibrio ácido-base (mono y poliprótico): DUZP + distribución α + diagrama logC. */
export default function AcidoBase() {
  const [system, setSystem] = useState<AcidSystem>(defaultAcidSystem());
  const [conc, setConc] = useState(0.1);
  const [showSystemPH, setShowSystemPH] = useState(false);

  function reset() { setSystem(defaultAcidSystem()); setConc(0.1); setShowSystemPH(false); }

  const labels = systemLabels(system);
  const logCtotal = Math.log10(conc);

  const pHSystem = useMemo(
    () => solvePH([{ c: conc, z0: system.z0, pKas: system.pKas }]),
    [system, conc],
  );

  // Distribución α vs pH
  const alphaTraces = useMemo<Data[]>(() => {
    const phs: number[] = [];
    const series: number[][] = system.pKas.map(() => []).concat([[]]);
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      ladderFractions(pH, system.pKas, true).forEach((a, j) => series[j].push(a));
    }
    return series.map((ys, j) => ({
      x: phs, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? `Especie ${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: `α = %{y:.3f}<extra>${labels[j] ?? ''}</extra>`,
    }));
  }, [system, labels]);

  // Diagrama logC vs pH (Sillén) con líneas H₃O⁺/OH⁻
  const logCTraces = useMemo<Data[]>(() => {
    const phs: number[] = [];
    const series: number[][] = system.pKas.map(() => []).concat([[]]);
    const hLine: number[] = [];
    const ohLine: number[] = [];
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      ladderLogC(pH, system.pKas, true, logCtotal).forEach((lc, j) => series[j].push(lc));
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
  }, [system, labels, logCtotal]);

  const zones = useMemo(
    () => predominanceZones(system.pKas, labels, 0, 14, true),
    [system, labels],
  );

  const systemShape = useMemo<Partial<Shape>[]>(() => {
    if (!showSystemPH) return [];
    return [{ type: 'line', x0: pHSystem, x1: pHSystem, y0: -14, y1: 1.02, line: { color: '#CC79A7', width: 2, dash: 'dashdot' } }];
  }, [showSystemPH, pHSystem]);

  const alphasAtPH = ladderFractions(pHSystem, system.pKas, true);
  const domIdx = alphasAtPH.indexOf(Math.max(...alphasAtPH));

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
          shapes={showSystemPH ? [{ type: 'line', x0: pHSystem, x1: pHSystem, y0: 0, y1: 1.02, line: { color: '#CC79A7', width: 2, dash: 'dashdot' } }] : []}
          exportName="quimeq-acidobase-alfa" />
      ),
    },
    {
      id: 'logc',
      label: 'log C',
      node: (
        <Chart data={logCTraces} xTitle="pH" yTitle="log C" xRange={[0, 14]} yRange={[-12, 0.5]}
          shapes={systemShape} exportName="quimeq-acidobase-logc" />
      ),
    },
  ];

  return (
    <div className="module">
      <aside className="panel">
        <div className="panel-header">
          <h2>Equilibrio ácido-base</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <AcidSystemEditor system={system} onChange={setSystem} />
        <h3>Condiciones</h3>
        <ConcSlider label="Concentración analítica" value={conc} onChange={setConc} />
        <Toggle label="Marcar pH de la disolución pura" checked={showSystemPH} onChange={setShowSystemPH} />
        <ResultCard items={[
          { label: 'pH de la disolución pura', value: pHSystem.toFixed(2) },
          { label: 'Especie dominante', value: `${labels[domIdx]} (α = ${alphasAtPH[domIdx].toFixed(2)})` },
        ]} />
        <InfoBox title="Cómo leer estos diagramas">
          <p>
            <strong>DUZP</strong> (zonas de predominio): en cada tramo de pH domina una
            especie; las fronteras están en los pKa. Es la lectura rápida estilo UNAM.
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
      </aside>
      <section className="plot-area">
        <DiagramTabs tabs={diagrams} />
      </section>
    </div>
  );
}
