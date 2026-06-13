import { useMemo, useState } from 'react';
import type { Data, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import { InfoBox, SelectControl, Slider, Toggle } from '../components/Controls';
import { availableSystems, buildSystem, waterLines } from '../lib/pourbaix';

/** Diagramas de Pourbaix (E vs pH) derivados de datos termodinámicos primitivos. */
export default function Pourbaix() {
  const systems = availableSystems();
  const [systemId, setSystemId] = useState('fe');
  const [logC, setLogC] = useState(-2);
  const [showWater, setShowWater] = useState(true);

  const diagram = useMemo(() => buildSystem(systemId, logC), [systemId, logC]);

  const { traces, annotations } = useMemo(() => {
    const data: Data[] = diagram.lines.map((l) => ({
      x: l.pH,
      y: l.E,
      type: 'scatter',
      mode: 'lines',
      name: l.name,
      line: { width: 2.5, color: l.color },
      hovertemplate: `${l.equation}<extra>${l.name}</extra>`,
    }));

    if (showWater) {
      const w = waterLines();
      const phs = [0, 14];
      data.push(
        {
          x: phs, y: phs.map((p) => w.o2.A - w.o2.B * p),
          type: 'scatter', mode: 'lines', name: 'O₂/H₂O',
          line: { width: 1.5, color: '#999999', dash: 'dash' },
          hovertemplate: 'O₂ + 4H⁺ + 4e⁻ → 2H₂O<extra>límite O₂</extra>',
        },
        {
          x: phs, y: phs.map((p) => w.h2.A - w.h2.B * p),
          type: 'scatter', mode: 'lines', name: 'H₂O/H₂',
          line: { width: 1.5, color: '#999999', dash: 'dot' },
          hovertemplate: '2H⁺ + 2e⁻ → H₂<extra>límite H₂</extra>',
        },
      );
    }

    const ann: Partial<Annotations>[] = diagram.regions.map((r) => ({
      x: r.labelPH,
      y: r.labelE,
      text: `<b>${r.name}</b>`,
      showarrow: false,
      font: { size: 13, color: '#2c3e50' },
    }));

    return { traces: data, annotations: ann };
  }, [diagram, showWater]);

  return (
    <div className="module">
      <aside className="panel">
        <h2>Diagrama de Pourbaix</h2>
        <SelectControl
          label="Sistema metal–H₂O"
          value={systemId}
          options={systems.map((s) => ({ value: s.id, label: s.name }))}
          onChange={setSystemId}
        />
        <Slider
          label={`log C de especies disueltas (${Math.pow(10, logC).toExponential(0)} M)`}
          value={logC} min={-6} max={0} step={0.5}
          onChange={setLogC}
          decimals={1}
        />
        <Toggle label="Líneas de estabilidad del agua" checked={showWater} onChange={setShowWater} />
        {diagram.excluded.length > 0 && (
          <p className="badge warn">
            Diagrama simplificado — especies excluidas: {diagram.excluded.join(', ')}
          </p>
        )}
        <InfoBox title="¿Cómo se construye este diagrama?">
          <p>
            Solo E° de los pares base y pKsp de los hidróxidos son datos de entrada
            (Bard 1985, Stumm &amp; Morgan 1996). Todos los potenciales de frontera con
            sólidos se <strong>derivan por ley de Hess</strong>, así que los puntos triples
            cierran exactamente — pasa el cursor por cada línea para ver su ecuación.
          </p>
          <p>
            Baja log C y observa cómo crece el dominio de las especies disueltas
            (las fronteras de precipitación se mueven a pH mayor). Entre las líneas
            punteadas grises el agua es estable; fuera de ellas, se oxida a O₂ o se
            reduce a H₂.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle="pH"
          yTitle="E (V vs ENH)"
          xRange={[0, 14]}
          yRange={[-1.6, 2.2]}
          annotations={annotations}
          exportName={`quimeq-pourbaix-${systemId}`}
        />
      </section>
    </div>
  );
}
