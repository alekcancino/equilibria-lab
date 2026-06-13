import { useMemo, useState } from 'react';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import { ConcSlider, InfoBox, ResultCard, Toggle } from '../components/Controls';
import { AcidSystemEditor, defaultAcidSystem, systemLabels, type AcidSystem } from '../components/Editors';
import { SPECIES_COLORS } from '../lib/database';
import { alphaFractions, solvePH } from '../lib/equilibrium';

const PH_POINTS = 400;
type View = 'alpha' | 'logc';

/** Equilibrios ácido-base: distribución de especies y diagramas logC (Sillén). */
export default function AcidoBase() {
  const [view, setView] = useState<View>('alpha');
  const [system, setSystem] = useState<AcidSystem>(defaultAcidSystem());
  const [conc, setConc] = useState(0.1);
  const [showSystemPH, setShowSystemPH] = useState(true);

  const labels = systemLabels(system);

  const pHSystem = useMemo(
    () => solvePH([{ c: conc, z0: system.z0, pKas: system.pKas }]),
    [system, conc],
  );

  const { traces, shapes } = useMemo(() => {
    const phs: number[] = [];
    const series: number[][] = system.pKas.map(() => []).concat([[]]);
    const hLine: number[] = [];
    const ohLine: number[] = [];

    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      const alphas = alphaFractions(Math.pow(10, -pH), system.pKas);
      alphas.forEach((a, j) => {
        series[j].push(view === 'alpha' ? a : Math.log10(Math.max(a * conc, 1e-20)));
      });
      hLine.push(-pH);
      ohLine.push(pH - 14);
    }

    const data: Data[] = series.map((ys, j) => ({
      x: phs, y: ys, type: 'scatter', mode: 'lines',
      name: labels[j] ?? `Especie ${j}`,
      line: { width: 3, color: SPECIES_COLORS[j % SPECIES_COLORS.length] },
      hovertemplate: view === 'alpha'
        ? `α = %{y:.3f}<extra>${labels[j] ?? ''}</extra>`
        : `log C = %{y:.2f}<extra>${labels[j] ?? ''}</extra>`,
    }));

    if (view === 'logc') {
      data.push(
        {
          x: phs, y: hLine, type: 'scatter', mode: 'lines', name: 'H₃O⁺',
          line: { width: 2, color: '#7f8c8d', dash: 'dash' },
        },
        {
          x: phs, y: ohLine, type: 'scatter', mode: 'lines', name: 'OH⁻',
          line: { width: 2, color: '#95a5a6', dash: 'dot' },
        },
      );
    }

    const shapeList: Partial<Shape>[] = [];
    if (showSystemPH) {
      shapeList.push({
        type: 'line', x0: pHSystem, x1: pHSystem,
        y0: view === 'alpha' ? 0 : -14, y1: view === 'alpha' ? 1 : 0,
        line: { color: '#CC79A7', width: 2, dash: 'dashdot' },
      });
    }
    // marcas en cada pKa
    for (const pk of system.pKas) {
      if (pk >= 0 && pk <= 14) {
        shapeList.push({
          type: 'line', x0: pk, x1: pk,
          y0: view === 'alpha' ? 0 : -14, y1: view === 'alpha' ? 1 : 0,
          line: { color: '#cbd5dc', width: 1, dash: 'dot' },
        });
      }
    }
    return { traces: data, shapes: shapeList };
  }, [system, conc, view, showSystemPH, pHSystem, labels]);

  // especie dominante al pH de la disolución
  const alphasAtPH = alphaFractions(Math.pow(10, -pHSystem), system.pKas);
  const domIdx = alphasAtPH.indexOf(Math.max(...alphasAtPH));

  return (
    <div className="module-with-tabs">
      <div className="chart-tabs">
        <button className={view === 'alpha' ? 'chart-tab active' : 'chart-tab'} onClick={() => setView('alpha')}>
          Distribución α
        </button>
        <button className={view === 'logc' ? 'chart-tab active' : 'chart-tab'} onClick={() => setView('logc')}>
          logC – pH (Sillén)
        </button>
      </div>
      <div className="module">
        <aside className="panel">
          <h2>Equilibrio ácido-base</h2>
          <AcidSystemEditor system={system} onChange={setSystem} />
          <h3>Condiciones</h3>
          <ConcSlider label="Concentración analítica" value={conc} onChange={setConc} />
          <Toggle
            label="Marcar pH de la disolución pura"
            checked={showSystemPH}
            onChange={setShowSystemPH}
          />
          <ResultCard items={[
            { label: 'pH de la disolución pura', value: pHSystem.toFixed(2) },
            { label: 'Especie dominante', value: `${labels[domIdx]} (α = ${alphasAtPH[domIdx].toFixed(2)})` },
          ]} />
          <InfoBox title="Cómo leer estos diagramas">
            <p>
              <strong>Distribución α:</strong> fracción molar de cada especie vs pH; en
              pH = pKa las especies conjugadas se cruzan (α = 0.5) y el sistema amortigua mejor.
            </p>
            <p>
              <strong>logC–pH (Sillén):</strong> el log de la concentración de cada especie con
              las líneas de H₃O⁺/OH⁻. La línea rosa marca el pH real de la disolución pura: el
              punto donde se cumple la condición protónica, útil para resolver el equilibrio
              gráficamente.
            </p>
          </InfoBox>
        </aside>
        <section className="plot-area">
          <Chart
            data={traces}
            xTitle="pH"
            yTitle={view === 'alpha' ? 'Fracción α' : 'log C'}
            xRange={[0, 14]}
            yRange={view === 'alpha' ? [0, 1.02] : [-12, 0.5]}
            shapes={shapes}
            exportName={view === 'alpha' ? 'quimeq-distribucion' : 'quimeq-logc'}
          />
        </section>
      </div>
    </div>
  );
}
