import { useMemo, useState } from 'react';
import type { Data, Annotations, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import { InfoBox, LabelField, ModelBadge, ResultCard, SelectControl, Slider, Toggle } from '../components/Controls';
import { availableSystems, buildSystem, waterLines, S_NERNST } from '../lib/pourbaix';

// ── Sistema simple custom (M^n+ / M + M(OH)n) ─────────────────────────────────

interface SimpleCustom {
  ionName: string;     // "Ni²⁺"
  metalName: string;   // "Ni"
  hydroxide: string;   // "Ni(OH)₂"
  E0: number;          // E°(M^n+/M) en V
  n: number;           // electrones
  pKsp: number;        // pKsp de M(OH)n
}

function buildSimpleDiagram(p: SimpleCustom, logC: number): { data: Data[]; annotations: Partial<Annotations>[] } {
  const S = S_NERNST;
  const E_dep = p.E0 + (S / p.n) * logC;                     // aqueous boundary (horizontal)
  const pH_p = 14 - (p.pKsp + logC) / p.n;                   // precipitation pH at logC
  const E0_sol = p.E0 + S * (14 - p.pKsp / p.n);             // standard potential M(OH)n/M
  const E_sol = (pH: number) => E0_sol - S * pH;              // solid boundary vs pH

  const COLOR_AQ = '#2980b9';
  const COLOR_V  = '#8e44ad';
  const COLOR_SO = '#16a085';

  const data: Data[] = [
    {
      x: [0, pH_p], y: [E_dep, E_dep], type: 'scatter', mode: 'lines',
      name: `${p.ionName}/${p.metalName}`,
      line: { width: 2.5, color: COLOR_AQ },
      hovertemplate: `${p.ionName} + ${p.n}e⁻ → ${p.metalName}(s)<extra>frontera acuosa</extra>`,
    },
    {
      x: [pH_p, pH_p], y: [E_sol(pH_p), E_dep], type: 'scatter', mode: 'lines',
      name: `precipitación ${p.hydroxide}`,
      line: { width: 2.5, color: COLOR_V, dash: 'dot' },
      hovertemplate: `pH = ${pH_p.toFixed(1)} — precipita ${p.hydroxide}<extra>frontera vertical</extra>`,
    },
    {
      x: [pH_p, 14], y: [E_sol(pH_p), E_sol(14)], type: 'scatter', mode: 'lines',
      name: `${p.hydroxide}/${p.metalName}`,
      line: { width: 2.5, color: COLOR_SO },
      hovertemplate: `${p.hydroxide} + ${p.n}H⁺ + ${p.n}e⁻ → ${p.metalName} + ${p.n}H₂O<extra>frontera sólido</extra>`,
    },
  ];

  const annotations: Partial<Annotations>[] = [
    { x: pH_p / 2,      y: E_dep + 0.12, text: `<b>${p.ionName}</b>`,    showarrow: false, font: { size: 12, color: '#2c3e50' } },
    { x: (pH_p + 14) / 2, y: E_sol((pH_p + 14) / 2) + 0.15, text: `<b>${p.hydroxide}</b>`, showarrow: false, font: { size: 12, color: '#2c3e50' } },
    { x: (pH_p + 14) / 2, y: E_sol((pH_p + 14) / 2) - 0.3,  text: `<b>${p.metalName}(s)</b>`, showarrow: false, font: { size: 12, color: '#2c3e50' } },
  ];

  return { data, annotations };
}

function customRegionAt(p: SimpleCustom, logC: number, pH: number, E: number): string {
  const S = S_NERNST;
  const E_dep = p.E0 + (S / p.n) * logC;
  const pH_p = 14 - (p.pKsp + logC) / p.n;
  const E0_sol = p.E0 + S * (14 - p.pKsp / p.n);
  const E_sol = E0_sol - S * pH;
  if (pH < pH_p) return E > E_dep ? p.ionName : `${p.metalName}(s)`;
  return E > E_sol ? p.hydroxide : `${p.metalName}(s)`;
}

function nearestRegionName(
  regions: { name: string; labelPH: number; labelE: number }[],
  pH: number,
  E: number,
): string {
  if (regions.length === 0) return '—';
  let best = regions[0];
  let bestD = (pH - best.labelPH) ** 2 + (E - best.labelE) ** 2;
  for (const r of regions.slice(1)) {
    const d = (pH - r.labelPH) ** 2 + (E - r.labelE) ** 2;
    if (d < bestD) { best = r; bestD = d; }
  }
  return best.name;
}

// ── Componente ─────────────────────────────────────────────────────────────────

/** Diagramas de Pourbaix (E vs pH) derivados de datos termodinámicos primitivos. */
export default function Pourbaix() {
  const systems = availableSystems();
  const [systemId, setSystemId] = useState('fe');
  const [useCustom, setUseCustom] = useState(true);
  const [logC, setLogC] = useState(-2);
  const [showWater, setShowWater] = useState(false);
  const [cursorPH, setCursorPH] = useState(7);
  const [cursorE, setCursorE] = useState(0);
  const [custom, setCustom] = useState<SimpleCustom>({
    ionName: 'M²⁺', metalName: 'M', hydroxide: 'M(OH)₂',
    E0: -0.257, n: 2, pKsp: 15.8,
  });

  function reset() {
    setSystemId('fe');
    setUseCustom(true);
    setLogC(-2);
    setShowWater(false);
    setCursorPH(7);
    setCursorE(0);
    setCustom({ ionName: 'M²⁺', metalName: 'M', hydroxide: 'M(OH)₂', E0: -0.257, n: 2, pKsp: 15.8 });
  }

  const diagram = useMemo(
    () => (!useCustom ? buildSystem(systemId, logC) : null),
    [systemId, logC, useCustom],
  );

  const customDiagram = useMemo(
    () => (useCustom ? buildSimpleDiagram(custom, logC) : null),
    [custom, logC, useCustom],
  );

  const { traces, annotations } = useMemo(() => {
    const data: Data[] = [];
    const ann: Partial<Annotations>[] = [];

    if (diagram) {
      diagram.lines.forEach((l) =>
        data.push({
          x: l.pH, y: l.E, type: 'scatter', mode: 'lines', name: l.name,
          line: { width: 2.5, color: l.color },
          hovertemplate: `${l.equation}<extra>${l.name}</extra>`,
        }),
      );
      diagram.regions.forEach((r) =>
        ann.push({ x: r.labelPH, y: r.labelE, text: `<b>${r.name}</b>`, showarrow: false, font: { size: 13, color: '#2c3e50' } }),
      );
    }

    if (customDiagram) {
      customDiagram.data.forEach((d) => data.push(d));
      customDiagram.annotations.forEach((a) => ann.push(a));
    }

    if (showWater) {
      const w = waterLines();
      const phs = [0, 14];
      data.push(
        { x: phs, y: phs.map((p) => w.o2.A - w.o2.B * p), type: 'scatter', mode: 'lines', name: 'O₂/H₂O', line: { width: 1.5, color: '#999999', dash: 'dash' }, hovertemplate: 'O₂ + 4H⁺ + 4e⁻ → 2H₂O<extra>límite O₂</extra>' },
        { x: phs, y: phs.map((p) => w.h2.A - w.h2.B * p), type: 'scatter', mode: 'lines', name: 'H₂O/H₂', line: { width: 1.5, color: '#999999', dash: 'dot' },  hovertemplate: '2H⁺ + 2e⁻ → H₂<extra>límite H₂</extra>' },
      );
    }

    return { traces: data, annotations: ann };
  }, [diagram, customDiagram, showWater]);

  const predominant = useMemo(() => {
    if (useCustom) return customRegionAt(custom, logC, cursorPH, cursorE);
    if (diagram) return nearestRegionName(diagram.regions, cursorPH, cursorE);
    return '—';
  }, [useCustom, custom, logC, cursorPH, cursorE, diagram]);

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
      <PanelShell title="Diagrama de Pourbaix" onReset={reset}>
        <ModelBadge
          model={useCustom ? 'sistema simple Mⁿ⁺ / M / M(OH)ₙ' : 'sistema metal–agua de múltiples especies'}
          additions={[!useCustom && 'especies de base de datos', showWater && 'estabilidad del agua']}
        />

        <Toggle label="Modo personalizado (sistema propio)" checked={useCustom} onChange={setUseCustom} />

        {!useCustom ? (
          <>
            <SelectControl
              label="Sistema metal–H₂O"
              value={systemId}
              options={systems.map((s) => ({ value: s.id, label: s.name }))}
              onChange={setSystemId}
            />
            {diagram && diagram.excluded.length > 0 && (
              <p className="badge warn">
                Diagrama simplificado — especies excluidas: {diagram.excluded.join(', ')}
              </p>
            )}
          </>
        ) : (
          <div className="editor">
            <p className="editor-title" style={{ color: '#2980b9' }}>Sistema M^n⁺ / M / M(OH)ₙ</p>
            <LabelField label="Ion disuelto (ej. Ni²⁺)" value={custom.ionName}
              onChange={(ionName) => setCustom((c) => ({ ...c, ionName }))} />
            <LabelField label="Metal (ej. Ni)" value={custom.metalName}
              onChange={(metalName) => setCustom((c) => ({ ...c, metalName }))} />
            <LabelField label="Hidróxido (ej. Ni(OH)₂)" value={custom.hydroxide}
              onChange={(hydroxide) => setCustom((c) => ({ ...c, hydroxide }))} />
            <Slider label={`E° (M^n+/M) = ${custom.E0.toFixed(3)} V`}
              value={custom.E0} min={-2} max={2} step={0.001}
              onChange={(E0) => setCustom((c) => ({ ...c, E0 }))} decimals={3} />
            <div className="control">
              <div className="control-header">
                <span className="control-label">Electrones transferidos n</span>
                <span className="control-value">{custom.n}</span>
              </div>
              <div className="segmented" style={{ marginTop: 4 }}>
                {[1, 2, 3, 4].map((v) => (
                  <button key={v} className={custom.n === v ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => setCustom((c) => ({ ...c, n: v }))}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <Slider label={`pKsp M(OH)ₙ = ${custom.pKsp.toFixed(1)}`}
              value={custom.pKsp} min={5} max={40} step={0.1}
              onChange={(pKsp) => setCustom((c) => ({ ...c, pKsp }))} decimals={1} />
          </div>
        )}

        <Slider
          label={`log C de especies disueltas (${Math.pow(10, logC).toExponential(0)} M)`}
          value={logC} min={-6} max={0} step={0.5}
          onChange={setLogC}
          decimals={1}
        />
        <Toggle label="Líneas de estabilidad del agua" checked={showWater} onChange={setShowWater} />

        <h3>Cursor</h3>
        <Slider label="pH del cursor" value={cursorPH} min={0} max={14} step={0.1} onChange={setCursorPH} decimals={1} />
        <Slider label="E del cursor (V)" value={cursorE} min={-1.6} max={2.2} step={0.05} onChange={setCursorE} decimals={2} />
        <ResultCard items={[
          { label: 'Condiciones', value: `pH ${cursorPH.toFixed(1)} · E ${cursorE.toFixed(2)} V` },
          { label: 'Especie predominante (aprox.)', value: predominant },
        ]} />

        <InfoBox title="¿Cómo se construye este diagrama?">
          <p>
            Solo E° de los pares base y pKsp de los hidróxidos son datos de entrada
            (Bard 1985, Stumm &amp; Morgan 1996). Todos los potenciales de frontera con
            sólidos se <strong>derivan por ley de Hess</strong>, así que los puntos triples
            cierran exactamente — pasa el cursor por cada línea para ver su ecuación.
          </p>
          <p>
            En modo personalizado ingresa cualquier metal con geometría
            M^n⁺ / M / M(OH)ₙ. Baja log C para ver cómo se expande el dominio acuoso.
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle="pH"
          yTitle="E (V vs ENH)"
          xRange={[0, 14]}
          yRange={[-1.6, 2.2]}
          shapes={cursorShapes}
          annotations={annotations}
          exportName={`quimeq-pourbaix-${useCustom ? 'custom' : systemId}`}
        />
      </section>
    </div>
  );
}
