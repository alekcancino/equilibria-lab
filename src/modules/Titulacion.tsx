import { useMemo, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import {
  ConcSlider, DbPanel, InfoBox, LabelField, ResultCard, Segmented,
  ModelBadge, RefBadge, SelectControl, Slider, Toggle,
} from '../components/Controls';
import {
  AcidSystemEditor, CoupleEditor,
} from '../components/Editors';
import { coupleFromPreset, strongAcidSystem, type AcidSystem, type CoupleState } from '../lib/editorModels';
import DiagramTabs from '../components/DiagramTabs';
import { INDICATORS } from '../lib/database';
import { firstDerivative, granPlot, secondDerivative, titrationCurve, titratableProtons } from '../lib/titration';
import { alphaY4, edtaTitrationCurve, EDTA_PKAS } from '../lib/edta';
import { redoxTitrationCurve } from '../lib/redox';
import { precipTitrationCurve, mohrEndpointPAg, PRECIP_PRESETS } from '../lib/precipTitration';
import { condLogKCurve, alphaH, alphaOH } from '../lib/conditional';
import { METAL_INDICATORS, EDTA_METAL_PRESETS, type MetalIndicator } from '../lib/indicatorDatabase';

type Mode = 'acidobase' | 'edta' | 'redox' | 'precip' | 'potenciometrica';

/* ─────────────── Panel de indicadores metalocrómicos (embebido) ──────────── */

const IND_PANEL_COLORS = ['#0072B2', '#D55E00', '#009E73', '#CC79A7'];

interface IndResult {
  ind: MetalIndicator;
  logKprimeMIn: number;
  deltaLogK: number;
  badge: 'ok' | 'marginal' | 'blocked' | 'weak';
}

const IND_BADGE_LABEL: Record<string, string> = { ok: '✅ Apto', marginal: '🟡 Marginal', blocked: '⚠ Bloqueado', weak: '✗ Débil' };
const IND_BADGE_CLS: Record<string, string>   = { ok: 'badge ok', marginal: 'badge warn', blocked: 'badge warn', weak: 'badge warn' };

/** Badges de indicadores — va en el panel lateral. */
function IndicadorBadges({ metalId, logBetasOH, pH, logKMY_pH }: {
  metalId: string; logBetasOH: number[]; pH: number; logKMY_pH: number;
}) {
  const results = useMemo((): IndResult[] =>
    METAL_INDICATORS.flatMap((ind) => {
      const entry = ind.metals.find((m) => m.metalId === metalId);
      if (!entry) return [];
      const lAIn  = Math.log10(alphaH(ind.pKas, pH));
      const lAMOH = Math.log10(alphaOH(logBetasOH, pH));
      const logKp = entry.logKMIn - lAIn - lAMOH;
      const dK    = logKMY_pH - logKp;
      const badge: IndResult['badge'] =
        logKp < 4 ? 'weak' : dK < 2 ? 'blocked' : dK < 5 ? 'marginal' : 'ok';
      return [{ ind, logKprimeMIn: logKp, deltaLogK: dK, badge }];
    }),
    [metalId, logBetasOH, pH, logKMY_pH],
  );

  if (results.length === 0) {
    return <p className="hint" style={{ marginTop: 6 }}>Sin datos de indicadores para este metal.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {results.map(({ ind, logKprimeMIn, deltaLogK, badge }) => (
        <div key={ind.id} style={{ background: 'var(--bg-alt)', borderRadius: 8, padding: '8px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{ind.abbrev} — {ind.name}</span>
            <span className={IND_BADGE_CLS[badge]} style={{ fontSize: 11 }}>{IND_BADGE_LABEL[badge]}</span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
            <span>log K′(MIn) = <strong style={{ color: 'var(--text)' }}>{logKprimeMIn.toFixed(1)}</strong></span>
            <span>ΔlogK = <strong style={{ color: 'var(--text)' }}>{deltaLogK.toFixed(1)}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 24, height: 12, borderRadius: 3, background: ind.colorFree, border: '1px solid #ccc' }} title="Color libre" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
            <div style={{ width: 24, height: 12, borderRadius: 3, background: ind.colorMIn, border: '1px solid #ccc' }} title="Color M-In" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>pH {ind.pHRange[0]}–{ind.pHRange[1]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Gráfica log K′ = f(pH) de indicadores — va en DiagramTabs. */
function IndicadorChart({ metalId, logKf, logBetasOH, pH }: {
  metalId: string; logKf: number; logBetasOH: number[]; pH: number;
}) {
  const curveMY = useMemo(() =>
    condLogKCurve(logKf, EDTA_PKAS, logBetasOH, [], 0, [1, 14], 400),
    [logKf, logBetasOH],
  );

  const indCurves = useMemo(() => {
    const out: { ind: MetalIndicator; pHs: number[]; logKs: number[] }[] = [];
    for (const ind of METAL_INDICATORS) {
      const entry = ind.metals.find((m) => m.metalId === metalId);
      if (!entry) continue;
      const pHs: number[] = [], logKs: number[] = [];
      for (let i = 0; i <= 400; i++) {
        const p = 1 + 13 * i / 400;
        pHs.push(p);
        logKs.push(entry.logKMIn - Math.log10(alphaH(ind.pKas, p)) - Math.log10(alphaOH(logBetasOH, p)));
      }
      out.push({ ind, pHs, logKs });
    }
    return out;
  }, [metalId, logBetasOH]);

  const chartTraces = useMemo<Data[]>(() => [
    {
      x: curveMY.pHs, y: curveMY.logKs, type: 'scatter', mode: 'lines',
      name: "log K′(M-EDTA)", line: { width: 3, color: '#2c3e50' },
      hovertemplate: "log K′(MY) = %{y:.2f}<extra>M-EDTA</extra>",
    },
    ...indCurves.map((c, i) => ({
      x: c.pHs, y: c.logKs, type: 'scatter' as const, mode: 'lines' as const,
      name: `log K′(M-${c.ind.abbrev})`,
      line: { width: 2, color: IND_PANEL_COLORS[i % IND_PANEL_COLORS.length] },
      hovertemplate: `log K′(M-${c.ind.abbrev}) = %{y:.2f}<extra>${c.ind.abbrev}</extra>`,
    })),
  ], [curveMY, indCurves]);

  const allY = [...curveMY.logKs, ...indCurves.flatMap((c) => c.logKs)];
  const yMin = Math.max(Math.floor(Math.min(...allY)) - 1, -5);
  const yMax = Math.ceil(logKf) + 2;

  const shapes = useMemo<Partial<Shape>[]>(() => [
    { type: 'line', x0: pH, x1: pH, y0: yMin - 99, y1: yMax + 99, line: { color: '#CC79A7', width: 1.5, dash: 'dashdot' } },
  ], [pH, yMin, yMax]);

  if (indCurves.length === 0) {
    return (
      <div className="empty-plot">
        <p>Sin datos de indicadores para este metal en la base de datos.</p>
        <p className="hint">Selecciona un metal del panel para ver los indicadores disponibles.</p>
      </div>
    );
  }

  return (
    <Chart
      data={chartTraces}
      xTitle="pH"
      yTitle="log K′"
      xRange={[1, 14]}
      yRange={[yMin, yMax]}
      shapes={shapes}
      exportName="quimeq-indicadores-edta"
    />
  );
}

/* ───────────────────────── Ácido-base ───────────────────────── */

function AcidBaseTitration() {
  const [system, setSystem] = useState<AcidSystem>(() => strongAcidSystem());
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [indicatorId, setIndicatorId] = useState('phenolphthalein');
  const [showIndicator, setShowIndicator] = useState(false);
  const [showDerivative, setShowDerivative] = useState(false);

  function reset() {
    setSystem(strongAcidSystem()); setTitrantIsAcid(false);
    setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setIndicatorId('phenolphthalein'); setShowIndicator(false); setShowDerivative(false);
  }

  const indicator = INDICATORS.find((i) => i.id === indicatorId)!;
  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';
  const analyteKind = system.pKas.length > 0
    ? 'equilibrium' as const
    : system.z0 > 0 ? 'strong-base' as const : 'strong-acid' as const;
  const nProtons = analyteKind === 'equilibrium' ? titratableProtons(system.pKas) : 1;
  const vEqLast = (nProtons * cAnalyte * vAnalyte) / cTitrant;
  const vMax = vEqLast * 1.6;

  const curve = useMemo(
    () => titrationCurve({
      analyte: { z0: system.z0, pKas: system.pKas, kind: analyteKind },
      titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax,
    }),
    [system, analyteKind, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax],
  );

  const { traces, shapes, annotations, eqInfo } = useMemo(() => {
    const data: Data[] = [{
      x: curve.volumes, y: curve.pHs, type: 'scatter', mode: 'lines', name: 'pH',
      line: { width: 3, color: '#0072B2' },
      hovertemplate: 'V = %{x:.2f} mL<br>pH = %{y:.2f}<extra></extra>',
    }];
    if (showDerivative) {
      const der = firstDerivative(curve.volumes, curve.pHs);
      const maxD = Math.max(...der.d.map(Math.abs), 1e-9);
      data.push({
        x: der.v, y: der.d.map((d) => (Math.abs(d) / maxD) * 14),
        type: 'scatter', mode: 'lines', name: '|dpH/dV| (escalada)',
        line: { width: 2, color: '#E69F00' }, hoverinfo: 'skip',
      });
    }
    const shapeList: Partial<Shape>[] = [];
    if (showIndicator) {
      shapeList.push({
        type: 'rect', x0: 0, x1: vMax, y0: indicator.range[0], y1: indicator.range[1],
        fillcolor: indicator.colors[1], opacity: 0.15, line: { width: 0 },
      });
    }
    const annList: Partial<Annotations>[] = [];
    const info: { label: string; value: string }[] = [];
    curve.equivalenceVolumes.forEach((veq, k) => {
      shapeList.push({
        type: 'line', x0: veq, x1: veq, y0: 0, y1: 14,
        line: { color: '#009E73', width: 1.5, dash: 'dash' },
      });
      const idx = curve.volumes.findIndex((v) => v >= veq);
      const pHeq = idx > 0 ? curve.pHs[idx] : NaN;
      annList.push({
        x: veq, y: 13.5,
        text: `P.E.${curve.equivalenceVolumes.length > 1 ? ` ${k + 1}` : ''}`,
        showarrow: false, font: { color: '#009E73', size: 12 },
      });
      info.push({
        label: `Equivalencia${curve.equivalenceVolumes.length > 1 ? ` ${k + 1}` : ''}`,
        value: `${veq.toFixed(2)} mL · pH ${pHeq.toFixed(2)}`,
      });
    });
    return { traces: data, shapes: shapeList, annotations: annList, eqInfo: info };
  }, [curve, showIndicator, showDerivative, indicator, vMax]);

  const lastEq = curve.equivalenceVolumes[curve.equivalenceVolumes.length - 1];
  const lastIdx = lastEq !== undefined ? curve.volumes.findIndex((v) => v >= lastEq) : -1;
  const pHLastEq = lastIdx > 0 ? curve.pHs[lastIdx] : NaN;
  const indicatorOk = pHLastEq >= indicator.range[0] - 1 && pHLastEq <= indicator.range[1] + 1;

  return (
    <>
      <aside className="panel">
        <div className="panel-header">
          <h2>Titulación ácido-base</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <Segmented
          options={[
            { value: 'base', label: 'Alcalimetría (NaOH)' },
            { value: 'acid', label: 'Acidimetría (HCl)' },
          ]}
          value={titrantIsAcid ? 'acid' : 'base'}
          onChange={(v) => {
            const nextIsAcid = v === 'acid';
            setTitrantIsAcid(nextIsAcid);
            if (system.pKas.length === 0) setSystem(strongAcidSystem(nextIsAcid));
          }}
        />
        <ModelBadge
          model={`titulación ${titrantIsAcid ? 'acidimétrica' : 'alcalimétrica'} de ${
            analyteKind === 'equilibrium'
              ? system.pKas.length > 1 ? 'sistema poliprótico' : 'sistema débil'
              : analyteKind === 'strong-base' ? 'base fuerte' : 'ácido fuerte'
          }`}
          additions={[showIndicator && 'indicador visual', showDerivative && 'derivada']}
        />
        <AcidSystemEditor system={system} onChange={setSystem} includeStrong allowNoConstants showModel={false} />
        <h3>Condiciones</h3>
        <ConcSlider label="Concentración del analito" value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
        <Slider label="Volumen de la muestra" value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
        <ConcSlider label={`Concentración de ${titrantName}`} value={cTitrant} onChange={setCTitrant} min={-4} max={0} />
        <h3>Detección</h3>
        <SelectControl
          label="Indicador visual"
          value={indicatorId}
          options={INDICATORS.map((i) => ({ value: i.id, label: `${i.name} (${i.range[0]}–${i.range[1]})` }))}
          onChange={setIndicatorId}
        />
        <Toggle label="Mostrar zona de vire" checked={showIndicator} onChange={setShowIndicator} />
        <Toggle label="Mostrar derivada dpH/dV" checked={showDerivative} onChange={setShowDerivative} />
        {eqInfo.length > 0 && <ResultCard items={eqInfo} />}
        {showIndicator && Number.isFinite(pHLastEq) && (
          <p className={indicatorOk ? 'badge ok' : 'badge warn'}>
            {indicatorOk
              ? `✓ ${indicator.name} vira cerca del punto de equivalencia`
              : `⚠ ${indicator.name} vira lejos de la equivalencia (pH ${pHLastEq.toFixed(1)})`}
          </p>
        )}
        <InfoBox title="Método de cálculo">
          <p>
            Balance de cargas exacto resuelto por bisección con dilución incluida —
            válido para ácidos y bases fuertes, débiles y polipróticos. Sin pKa el
            analito se trata como electrolito fuerte; al agregar constantes, el modelo
            cambia automáticamente a un equilibrio débil.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle={`Volumen de ${titrantName} agregado (mL)`}
          yTitle="pH"
          xRange={[0, vMax]}
          yRange={[0, 14]}
          shapes={shapes}
          annotations={annotations}
          exportName="quimeq-titulacion-acidobase"
        />
      </section>
    </>
  );
}

/* ───────────────────────── Complejométrica (EDTA) ───────────────────────── */

function EdtaTitration() {
  const defaultPreset = EDTA_METAL_PRESETS[0]; // Ca²⁺
  const [metalId, setMetalId] = useState(defaultPreset.id);
  const [label, setLabel] = useState(`${defaultPreset.metal}`);
  const [logKf, setLogKf] = useState(defaultPreset.logKf);
  const [logBetasOH, setLogBetasOH] = useState<number[]>(defaultPreset.logBetasOH);
  const [edtaInFlask, setEdtaInFlask] = useState(false);
  const [pH, setPH] = useState(10);
  const [cFlask, setCFlask] = useState(0.01);
  const [vFlask, setVFlask] = useState(50);
  const [cBuret, setCBuret] = useState(0.01);

  function reset() {
    setMetalId(defaultPreset.id); setLabel(defaultPreset.metal);
    setLogKf(defaultPreset.logKf); setLogBetasOH([...defaultPreset.logBetasOH]);
    setEdtaInFlask(false); setPH(10); setCFlask(0.01); setVFlask(50); setCBuret(0.01);
  }

  function applyPreset(id: string) {
    const p = EDTA_METAL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setMetalId(p.id); setLabel(p.metal);
    setLogKf(p.logKf); setLogBetasOH([...p.logBetasOH]);
  }

  const vMax = ((cFlask * vFlask) / cBuret) * 1.8;
  const curve = useMemo(
    () => edtaTitrationCurve({ logKf, pH, logBetasOH, cMetal: cFlask, vMetal: vFlask, cEdta: cBuret, vMax, edtaInFlask }),
    [logKf, pH, logBetasOH, cFlask, vFlask, cBuret, vMax, edtaInFlask],
  );

  // log K'(MY) al pH actual para el panel de indicadores
  const logKMY_pH = useMemo(() => curve.logKfCond, [curve.logKfCond]);

  const titTraces = useMemo<Data[]>(() => [{
    x: curve.volumes, y: curve.pMs, type: 'scatter', mode: 'lines', name: 'pM',
    line: { width: 3, color: '#009E73' },
    hovertemplate: 'V = %{x:.2f} mL<br>pM = %{y:.2f}<extra></extra>',
  }], [curve]);

  const titShapes = useMemo<Partial<Shape>[]>(() => [{
    type: 'line', x0: curve.vEq, x1: curve.vEq, y0: 0, y1: Math.max(...curve.pMs) + 1,
    line: { color: '#009E73', width: 1.5, dash: 'dash' },
  }], [curve]);

  const aY = alphaY4(pH);
  const feasible = curve.logKfCond >= 8;
  const buretName = edtaInFlask ? label : 'EDTA';
  const flaskName = edtaInFlask ? 'EDTA' : label;
  const loadedMetal = EDTA_METAL_PRESETS.find((p) => p.id === metalId);
  const presetIsUnedited = loadedMetal !== undefined
    && label === loadedMetal.metal
    && logKf === loadedMetal.logKf
    && JSON.stringify(logBetasOH) === JSON.stringify(loadedMetal.logBetasOH);

  const diagrams = useMemo(() => [
    {
      id: 'tit',
      label: 'Curva de titulación',
      node: (
        <Chart
          data={titTraces}
          xTitle={`Volumen de ${buretName} agregado (mL)`}
          yTitle="pM (−log[M])"
          xRange={[0, vMax]}
          shapes={titShapes}
          exportName="quimeq-titulacion-edta"
        />
      ),
    },
    {
      id: 'ind',
      label: 'Indicadores',
      node: (
        <IndicadorChart
          metalId={metalId}
          logKf={logKf}
          logBetasOH={logBetasOH}
          pH={pH}
        />
      ),
    },
  ], [titTraces, titShapes, buretName, vMax, metalId, logKf, logBetasOH, pH]);

  return (
    <>
      <aside className="panel">
        <div className="panel-header">
          <h2>Titulación complejométrica</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <Segmented
          options={[
            { value: 'direct', label: 'Metal + EDTA (directa)' },
            { value: 'inverse', label: 'EDTA + metal (retro)' },
          ]}
          value={edtaInFlask ? 'inverse' : 'direct'}
          onChange={(v) => setEdtaInFlask(v === 'inverse')}
        />
        <ModelBadge
          model={edtaInFlask ? 'titulación complejométrica por retroceso' : 'titulación complejométrica directa'}
          additions={[logBetasOH.length > 0 && 'hidrólisis en selección de indicador']}
        />
        <div className="editor">
          <LabelField label="Ion metálico (nombre libre)" value={label} onChange={setLabel} />
          <Slider
            label="log Kf del complejo M–EDTA"
            value={logKf} min={1} max={28} step={0.01}
            onChange={(v) => setLogKf(v)}
          />
          <DbPanel
            title="Metales (base de datos)"
            items={EDTA_METAL_PRESETS.map((p) => ({
              id: p.id,
              label: p.metal,
              detail: `log Kf = ${p.logKf.toFixed(2)}`,
              group: p.group === 'M²⁺' ? 'Metales bivalentes' : 'Metales trivalentes',
            }))}
            onSelect={applyPreset}
          />
          <RefBadge reference={presetIsUnedited ? 'Harris, QCA 9.ª ed., tabla 12-1; Ringbom.' : undefined} />
        </div>
        <h3>Condiciones</h3>
        <Slider label="pH del tampón" value={pH} min={1} max={13} step={0.1} onChange={setPH} decimals={1} />
        <ConcSlider label={`Concentración en el matraz (${flaskName})`} value={cFlask} onChange={setCFlask} min={-4} max={-1} />
        <Slider label="Volumen del matraz" value={vFlask} min={5} max={100} step={1} onChange={setVFlask} unit="mL" decimals={0} />
        <ConcSlider label={`Concentración del titulante (${buretName})`} value={cBuret} onChange={setCBuret} min={-4} max={-1} />
        <ResultCard items={[
          { label: 'α(Y⁴⁻) a este pH', value: (1 / aY).toExponential(3) },
          { label: "log K′f condicional", value: curve.logKfCond.toFixed(2) },
          { label: 'Volumen de equivalencia', value: `${curve.vEq.toFixed(2)} mL` },
        ]} />
        <p className={feasible ? 'badge ok' : 'badge warn'}>
          {feasible
            ? "✓ Titulación factible (log K′f ≥ 8): salto nítido"
            : "⚠ log K′f < 8: salto pobre. Sube el pH o elige un metal con Kf mayor"}
        </p>

        <details className="section-collapse" style={{ marginTop: 12 }}>
          <summary className="section-collapse-title">Indicadores metalocrómicos a pH {pH.toFixed(1)}</summary>
          <div style={{ padding: '8px 10px 10px' }}>
            <IndicadorBadges
              metalId={metalId}
              logBetasOH={logBetasOH}
              pH={pH}
              logKMY_pH={logKMY_pH}
            />
          </div>
        </details>

        <InfoBox title="Método de cálculo">
          <p>
            K′f = Kf / (αM(OH) · αY(H)) al pH del tampón. Balance de masas cuadrático exacto en
            cada punto. Retro: EDTA en exceso en el matraz, se titula con el metal.
            La pestaña <em>Indicadores</em> muestra el criterio ΔlogK ≥ 5 (Harris).
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <DiagramTabs tabs={diagrams} />
      </section>
    </>
  );
}

/* ───────────────────────── Redox ───────────────────────── */

function RedoxTitration() {
  const [analyte, setAnalyte] = useState<CoupleState>(coupleFromPreset('fe'));
  const [titrant, setTitrant] = useState<CoupleState>(coupleFromPreset('ce'));
  const [direction, setDirection] = useState<'oxidante' | 'reductor'>('oxidante');
  const [pH, setPH] = useState(0);
  const [cAnalyte, setCAnalyte] = useState(0.05);
  const [vAnalyte, setVAnalyte] = useState(50);
  const [cTitrant, setCTitrant] = useState(0.05);
  const [usePe, setUsePe] = useState(false);
  const [showDerivative, setShowDerivative] = useState(false);

  function reset() {
    setAnalyte(coupleFromPreset('fe')); setTitrant(coupleFromPreset('ce'));
    setDirection('oxidante'); setPH(0);
    setCAnalyte(0.05); setVAnalyte(50); setCTitrant(0.05);
    setUsePe(false); setShowDerivative(false);
  }

  const vMax = ((analyte.n * cAnalyte * vAnalyte) / (titrant.n * cTitrant)) * 1.8;
  const curve = useMemo(
    () => redoxTitrationCurve({ analyte, titrant, direction, pH, cAnalyte, vAnalyte, cTitrant, vMax }),
    [analyte, titrant, direction, pH, cAnalyte, vAnalyte, cTitrant, vMax],
  );

  const { traces, shapes, annotations } = useMemo(() => {
    const y = usePe ? curve.pes : curve.Es;
    const data: Data[] = [{
      x: curve.volumes, y, type: 'scatter', mode: 'lines',
      name: usePe ? 'pe' : 'E (V)',
      line: { width: 3, color: '#D55E00' },
      hovertemplate: `V = %{x:.2f} mL<br>${usePe ? 'pe' : 'E'} = %{y:.3f}<extra></extra>`,
    }];
    if (showDerivative) {
      const der = firstDerivative(curve.volumes, y);
      const maxD = Math.max(...der.d.map(Math.abs), 1e-9);
      const span = Math.max(...y) - Math.min(...y);
      data.push({
        x: der.v, y: der.d.map((d) => Math.min(...y) + (Math.abs(d) / maxD) * span),
        type: 'scatter', mode: 'lines', name: '|dE/dV| (escalada)',
        line: { width: 2, color: '#E69F00' }, hoverinfo: 'skip',
      });
    }
    const shapeList: Partial<Shape>[] = [{
      type: 'line', x0: curve.vEq, x1: curve.vEq, y0: Math.min(...y), y1: Math.max(...y),
      line: { color: '#009E73', width: 1.5, dash: 'dash' },
    }];
    const annList: Partial<Annotations>[] = [{
      x: curve.vEq, y: Math.max(...y), text: 'P.E.', showarrow: false,
      font: { color: '#009E73', size: 12 },
    }];
    return { traces: data, shapes: shapeList, annotations: annList };
  }, [curve, usePe, showDerivative]);

  const quantitative = curve.logK >= 6;
  const pHDependent = analyte.mH > 0 || titrant.mH > 0;
  const buretSpecies = direction === 'oxidante' ? titrant.ox : titrant.red;

  return (
    <>
      <aside className="panel">
        <div className="panel-header">
          <h2>Titulación redox</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <Segmented
          options={[
            { value: 'oxidante', label: 'Oxidimetría' },
            { value: 'reductor', label: 'Reductimetría' },
          ]}
          value={direction}
          onChange={(v) => setDirection(v as 'oxidante' | 'reductor')}
        />
        <ModelBadge
          model={direction === 'oxidante' ? 'titulación por oxidimetría' : 'titulación por reductimetría'}
          additions={[pHDependent && 'potencial condicionado por pH', usePe && 'eje pe', showDerivative && 'derivada']}
        />
        <p className="hint">
          {direction === 'oxidante'
            ? `Analito inicia como ${analyte.red}; titulante: ${titrant.ox}.`
            : `Analito inicia como ${analyte.ox}; titulante: ${titrant.red}.`}
        </p>
        <CoupleEditor title="Par del analito" couple={analyte} onChange={setAnalyte} />
        <CoupleEditor title="Par del titulante" couple={titrant} onChange={setTitrant} />
        <h3>Condiciones</h3>
        <Slider label="pH del medio (amortiguado)" value={pH} min={0} max={8} step={0.1} onChange={setPH} decimals={1} />
        {pHDependent && (
          <p className="hint">⚠ Hay H⁺ en la semirreacción: pe°′ condicional depende del pH.</p>
        )}
        <ConcSlider label="Concentración del analito" value={cAnalyte} onChange={setCAnalyte} min={-4} max={-1} />
        <Slider label="Volumen de la muestra" value={vAnalyte} min={10} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
        <ConcSlider label="Concentración del titulante" value={cTitrant} onChange={setCTitrant} min={-4} max={-1} />
        <Toggle label="Eje en pe (en lugar de E)" checked={usePe} onChange={setUsePe} />
        <Toggle label="Mostrar derivada dE/dV" checked={showDerivative} onChange={setShowDerivative} />
        <ResultCard items={[
          { label: 'Volumen de equivalencia', value: `${curve.vEq.toFixed(2)} mL` },
          { label: 'E en equivalencia', value: `${curve.EEq.toFixed(3)} V (pe ${curve.peEq.toFixed(2)})` },
          { label: 'log K de la reacción', value: curve.logK.toFixed(1) },
        ]} />
        <p className={quantitative ? 'badge ok' : 'badge warn'}>
          {quantitative
            ? `✓ Reacción cuantitativa (log K = ${curve.logK.toFixed(0)} ≥ 6)`
            : `⚠ log K = ${curve.logK.toFixed(1)} < 6: reacción no cuantitativa`}
        </p>
        <InfoBox title="Método de cálculo">
          <p>
            Balance de electrones exacto por bisección, convención pe = E/0.05916
            (Sillén/Baeza). Soporta estequiometría n₁ ≠ n₂ y pe°′ condicional al
            pH para pares con H⁺ en la semirreacción.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle={`Volumen de ${buretSpecies} agregado (mL)`}
          yTitle={usePe ? 'pe' : 'E (V vs ENH)'}
          xRange={[0, vMax]}
          shapes={shapes}
          annotations={annotations}
          exportName="quimeq-titulacion-redox"
        />
      </section>
    </>
  );
}

/* ───────────────────────── Precipitación ─────────────────────────────────── */

function PrecipTitration() {
  const [presetId, setPresetId] = useState('cl');
  const [pKsp, setPKsp] = useState(9.74);
  const [cationName, setCationName] = useState('Ag⁺');
  const [anionName, setAnionName] = useState('Cl⁻');
  const [saltFormula, setSaltFormula] = useState('AgCl');
  const [isAgSystem, setIsAgSystem] = useState(true);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [showPCation, setShowPCation] = useState(false);
  const [showMohr, setShowMohr] = useState(false);
  const [showDerivative, setShowDerivative] = useState(false);

  function loadPreset(id: string) {
    const p = PRECIP_PRESETS.find((x) => x.id === id)!;
    setPresetId(id); setPKsp(p.pKsp);
    setCationName(p.cation); setAnionName(p.anion); setSaltFormula(p.formula);
    setIsAgSystem(p.isAg);
    if (!p.isAg) { setShowMohr(false); setShowPCation(false); }
  }

  function reset() {
    loadPreset('cl'); setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setShowMohr(false); setShowPCation(false); setShowDerivative(false);
  }

  const vEq0 = (cAnalyte * vAnalyte) / cTitrant;
  const vMax = vEq0 * 1.6;

  const curve = useMemo(
    () => precipTitrationCurve({ pKsp, cAnalyte, vAnalyte, cTitrant, vMax }),
    [pKsp, cAnalyte, vAnalyte, cTitrant, vMax],
  );

  const mohrPAg = mohrEndpointPAg(0.005);

  // showPCation: true → eje en p(catión)=pAg, false → p(anión)=pX
  const yVals = showPCation ? curve.pAgs : curve.pXs;
  const pCatLabel = `p${cationName.replace(/[⁺²³⁴⁻]/g, '')}`;
  const pAniLabel = `p${anionName.replace(/[⁺²³⁴⁻]/g, '')}`;
  const yLabel = showPCation
    ? `${pCatLabel} (−log[${cationName}])`
    : `${pAniLabel} (−log[${anionName}])`;
  const yMax = Math.ceil(Math.max(...yVals.filter(Number.isFinite), curve.pAgEq * 1.2));

  const traces = useMemo<Data[]>(() => {
    const y = showPCation ? curve.pAgs : curve.pXs;
    const data: Data[] = [{
      x: curve.volumes, y, type: 'scatter', mode: 'lines',
      name: showPCation ? pCatLabel : pAniLabel,
      line: { width: 3, color: '#8E44AD' },
      hovertemplate: `V = %{x:.2f} mL<br>p = %{y:.2f}<extra></extra>`,
    }];
    if (showDerivative) {
      const der = firstDerivative(curve.volumes, y);
      const maxD = Math.max(...der.d.map(Math.abs), 1e-9);
      const span = Math.max(...y.filter(Number.isFinite)) - Math.min(...y.filter(Number.isFinite));
      data.push({
        x: der.v, y: der.d.map((d) => (Math.abs(d) / maxD) * span * 0.6),
        type: 'scatter', mode: 'lines', name: '|dp/dV| (escalada)',
        line: { width: 2, color: '#E69F00' }, hoverinfo: 'skip',
      });
    }
    return data;
  }, [curve, showPCation, showDerivative, pCatLabel, pAniLabel]);

  const shapes = useMemo<Partial<Shape>[]>(() => {
    const list: Partial<Shape>[] = [{
      type: 'line', x0: curve.vEq, x1: curve.vEq, y0: 0, y1: yMax,
      line: { color: '#009E73', width: 1.5, dash: 'dash' },
    }];
    if (showMohr && showPCation && isAgSystem) {
      list.push({
        type: 'line', x0: 0, x1: vMax, y0: mohrPAg, y1: mohrPAg,
        line: { color: '#E69F00', width: 1.5, dash: 'dot' },
      });
    }
    return list;
  }, [curve.vEq, showMohr, showPCation, isAgSystem, mohrPAg, vMax, yMax]);

  const annotations = useMemo<Partial<Annotations>[]>(() => {
    const list: Partial<Annotations>[] = [{
      x: curve.vEq, y: yMax, text: 'P.E.', showarrow: false,
      font: { color: '#009E73', size: 12 },
    }];
    if (showMohr && showPCation && isAgSystem) {
      list.push({
        x: vMax * 0.05, y: mohrPAg + 0.3,
        text: `Mohr: ${pCatLabel} = ${mohrPAg.toFixed(1)}`,
        showarrow: false, font: { color: '#E69F00', size: 11 },
        xanchor: 'left',
      });
    }
    return list;
  }, [curve.vEq, showMohr, showPCation, isAgSystem, mohrPAg, vMax, yMax, pCatLabel]);

  const sharpness = pKsp >= 6;
  const loadedPrecip = PRECIP_PRESETS.find((p) => p.id === presetId);
  const presetIsUnedited = loadedPrecip !== undefined
    && pKsp === loadedPrecip.pKsp
    && cationName === loadedPrecip.cation
    && anionName === loadedPrecip.anion
    && saltFormula === loadedPrecip.formula;

  return (
    <>
      <aside className="panel">
        <div className="panel-header">
          <h2>Titulación por precipitación</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>

        <h3>Sistema</h3>
        <ModelBadge
          model="titulación por precipitación 1:1"
          additions={[showPCation && `eje p(${cationName})`, showMohr && showPCation && 'indicador Mohr', showDerivative && 'derivada']}
        />
        <p className="hint">{cationName} + {anionName} → {saltFormula}↓</p>

        {/* Presets */}
        <div className="preset-chip-row" style={{ marginBottom: 8 }}>
          {PRECIP_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset-chip${presetId === p.id ? ' active' : ''}`}
              onClick={() => loadPreset(p.id)}
            >
              {p.formula}
            </button>
          ))}
        </div>

        {/* Campos editables */}
        <div className="editor">
          <LabelField label="Catión titulante" value={cationName} onChange={setCationName} />
          <LabelField label="Anión analito" value={anionName} onChange={setAnionName} />
          <LabelField label="Fórmula del precipitado" value={saltFormula} onChange={setSaltFormula} />
          <Slider label="pKsp del precipitado" value={pKsp} min={2} max={22} step={0.01} onChange={setPKsp} decimals={2} />
          <RefBadge reference={presetIsUnedited ? 'Harris, QCA 9.ª ed., cap. 16; Skoog, Fundamentos de Química Analítica.' : undefined} />
        </div>

        <h3>Condiciones</h3>
        <ConcSlider label={`Concentración de ${anionName}`} value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
        <Slider label="Volumen de la muestra" value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
        <ConcSlider label={`Concentración de ${cationName}`} value={cTitrant} onChange={setCTitrant} min={-4} max={0} />

        <h3>Visualización</h3>
        <Toggle label={`Eje en p(${cationName}) en lugar de p(${anionName})`} checked={showPCation} onChange={setShowPCation} />
        {isAgSystem && showPCation && (
          <Toggle label="Marcador indicador Mohr ([CrO₄²⁻] = 5 mM)" checked={showMohr} onChange={setShowMohr} />
        )}
        <Toggle label="Mostrar derivada dp/dV" checked={showDerivative} onChange={setShowDerivative} />

        <ResultCard items={[
          { label: 'Volumen de equivalencia', value: `${curve.vEq.toFixed(2)} mL` },
          { label: `p en equivalencia (½ pKsp)`, value: curve.pAgEq.toFixed(2) },
          ...(isAgSystem && showPCation ? [{
            label: 'Indicador Mohr',
            value: `pAg = ${mohrPAg.toFixed(2)} (Δ = ${(mohrPAg - curve.pAgEq).toFixed(2)})`,
          }] : []),
        ]} />
        <p className={sharpness ? 'badge ok' : 'badge warn'}>
          {sharpness
            ? `✓ Salto nítido esperado (pKsp = ${pKsp.toFixed(2)} ≥ 6)`
            : `⚠ pKsp < 6: el salto puede ser difuso`}
        </p>

        <InfoBox title="Métodos de detección del punto final">
          <p>
            <strong>Mohr</strong> (solo Ag⁺): indicador K₂CrO₄; el Ag₂CrO₄ rojo precipita
            al superar la equivalencia. Válido para Cl⁻ y Br⁻ en medio neutro.
          </p>
          <p>
            <strong>Volhard</strong>: retrotitulación con SCN⁻ y Fe³⁺; funciona en
            medio ácido para Cl⁻, Br⁻, I⁻ y SCN⁻.
          </p>
          <p>
            <strong>Fajans</strong>: indicador de adsorción (fluoresceína); el cambio de
            color ocurre en la superficie del precipitado en el punto de equivalencia.
          </p>
          <p>
            <strong>Otros sistemas</strong>: BaSO₄, CaC₂O₄, PbSO₄ se titulan por
            potenciometría directa o por retrogravimetría.
          </p>
          <p>
            <strong>Alcance del motor</strong>: este módulo modela solo titulaciones
            1:1 (un catión + un anión). Estequiometrías m:x ≠ 1:1 no están implementadas.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle={`Volumen de ${cationName} agregado (mL)`}
          yTitle={yLabel}
          xRange={[0, vMax]}
          yRange={[0, yMax]}
          shapes={shapes}
          annotations={annotations}
          exportName="quimeq-titulacion-precip"
        />
      </section>
    </>
  );
}

/* ───────────────────────── Potenciométrica ───────────────────────── */

// Factor de Nernst a 25 °C para electrodo de vidrio: S = 59.16 mV/pH.
// E_celda = K_ref − S · pH   (donde K_ref engloba E_referencia + E_junta)
const S_POT = 59.16; // mV / pH

function PotenciometricaTitration() {
  const [system, setSystem] = useState<AcidSystem>(() => strongAcidSystem());
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [Kref, setKref] = useState(400);      // mV
  const [showDeriv1, setShowDeriv1] = useState(false);
  const [showDeriv2, setShowDeriv2] = useState(false);

  function reset() {
    setSystem(strongAcidSystem()); setTitrantIsAcid(false);
    setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setKref(400); setShowDeriv1(false); setShowDeriv2(false);
  }

  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';
  const analyteKind = system.pKas.length > 0
    ? 'equilibrium' as const
    : system.z0 > 0 ? 'strong-base' as const : 'strong-acid' as const;
  const nProtons = analyteKind === 'equilibrium' ? titratableProtons(system.pKas) : 1;
  const vEqLast = (nProtons * cAnalyte * vAnalyte) / cTitrant;
  const vMax = vEqLast * 1.6;

  const curve = useMemo(
    () => titrationCurve({
      analyte: { z0: system.z0, pKas: system.pKas, kind: analyteKind },
      titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax,
    }),
    [system, analyteKind, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax],
  );

  // pH → E (mV)
  const Es = useMemo(
    () => curve.pHs.map((pH) => (Number.isFinite(pH) ? Kref - S_POT * pH : NaN)),
    [curve.pHs, Kref],
  );

  // Derivadas
  const d1 = useMemo(() => firstDerivative(curve.volumes, Es), [curve.volumes, Es]);
  const d2 = useMemo(() => secondDerivative(d1.v, d1.d), [d1]);

  // Cruce por cero de d²E/dV² — selecciona el cruce donde |dE/dV| es máximo
  // (el punto de inflexión real), descartando cruces espurios en los extremos.
  const zeroCrossing = useMemo(() => {
    if (d2.v.length < 3) return null;
    const maxD1 = Math.max(...d1.d.map(Math.abs), 1e-9);
    let bestV: number | null = null;
    let bestWeight = 0;
    for (let i = 1; i < d2.v.length; i++) {
      if (d2.d[i - 1] * d2.d[i] >= 0) continue;
      const midV = (d2.v[i - 1] + d2.v[i]) / 2;
      const j = d1.v.findIndex((v) => v >= midV);
      const weight = j >= 0 ? Math.abs(d1.d[j]) / maxD1 : 0;
      if (weight > bestWeight) {
        bestWeight = weight;
        const t = -d2.d[i - 1] / (d2.d[i] - d2.d[i - 1]);
        bestV = d2.v[i - 1] + t * (d2.v[i] - d2.v[i - 1]);
      }
    }
    return bestV;
  }, [d2, d1]);

  // Escala dE/dV y d²E/dV² para la gráfica superpuesta
  const eMin = Math.min(...Es.filter(Number.isFinite));
  const eMax = Math.max(...Es.filter(Number.isFinite));
  const eSpan = eMax - eMin;

  const d1Scaled = useMemo(() => {
    const maxD = Math.max(...d1.d.map(Math.abs), 1e-9);
    return d1.d.map((d) => eMin + (Math.abs(d) / maxD) * eSpan * 0.8);
  }, [d1, eMin, eSpan]);

  const d2Max = useMemo(() => Math.max(...d2.d.map(Math.abs), 1e-9), [d2]);
  const d2Scaled = useMemo(
    () => d2.d.map((d) => (d / d2Max) * eSpan * 0.4 + (eMax + eMin) / 2),
    [d2, d2Max, eSpan, eMax, eMin],
  );

  // Trazas E = f(V)
  const efVTraces = useMemo<Data[]>(() => {
    const t: Data[] = [{
      x: curve.volumes, y: Es, type: 'scatter', mode: 'lines', name: 'E (mV)',
      line: { width: 3, color: '#0072B2' },
      hovertemplate: 'V = %{x:.2f} mL<br>E = %{y:.1f} mV<extra></extra>',
    }];
    if (showDeriv1) t.push({
      x: d1.v, y: d1Scaled, type: 'scatter', mode: 'lines',
      name: '|dE/dV| (escalada)', line: { width: 2, color: '#E69F00' }, hoverinfo: 'skip',
    });
    if (showDeriv2) t.push({
      x: d2.v, y: d2Scaled, type: 'scatter', mode: 'lines',
      name: 'd²E/dV² (escalada)', line: { width: 2, color: '#D55E00', dash: 'dash' }, hoverinfo: 'skip',
    });
    return t;
  }, [curve.volumes, Es, showDeriv1, showDeriv2, d1, d1Scaled, d2, d2Scaled]);

  const efVShapes = useMemo<Partial<Shape>[]>(() => {
    const s: Partial<Shape>[] = curve.equivalenceVolumes.map((veq) => ({
      type: 'line', x0: veq, x1: veq, y0: eMin - 50, y1: eMax + 50,
      line: { color: '#009E73', width: 1.5, dash: 'dash' },
    }));
    if (showDeriv2 && zeroCrossing !== null) s.push({
      type: 'line', x0: zeroCrossing, x1: zeroCrossing, y0: eMin - 50, y1: eMax + 50,
      line: { color: '#D55E00', width: 1, dash: 'dot' },
    });
    return s;
  }, [curve.equivalenceVolumes, showDeriv2, zeroCrossing, eMin, eMax]);

  const efVAnnotations = useMemo<Partial<Annotations>[]>(() => {
    const a: Partial<Annotations>[] = curve.equivalenceVolumes.map((veq) => ({
      x: veq, y: eMax, text: 'P.E.', showarrow: false, font: { color: '#009E73', size: 12 },
    }));
    if (showDeriv2 && zeroCrossing !== null) a.push({
      x: zeroCrossing, y: eMin + eSpan * 0.1,
      text: `d²E/dV²=0<br>${zeroCrossing.toFixed(2)} mL`,
      showarrow: false, font: { color: '#D55E00', size: 10 },
    });
    return a;
  }, [curve.equivalenceVolumes, showDeriv2, zeroCrossing, eMax, eMin, eSpan]);

  // Gran plot
  const gran = useMemo(
    () => granPlot(curve.volumes, curve.pHs, vAnalyte),
    [curve.volumes, curve.pHs, vAnalyte],
  );

  const granTraces = useMemo<Data[]>(() => [
    {
      x: gran.v1, y: gran.F1, type: 'scatter', mode: 'lines', name: 'F₁ (antes del P.E.)',
      line: { width: 2.5, color: '#0072B2' },
      hovertemplate: 'V = %{x:.2f} mL<br>F₁ = %{y:.2e}<extra>Antes P.E.</extra>',
    },
    {
      x: gran.v2, y: gran.F2, type: 'scatter', mode: 'lines', name: 'F₂ (después del P.E.)',
      line: { width: 2.5, color: '#D55E00', dash: 'dash' },
      hovertemplate: 'V = %{x:.2f} mL<br>F₂ = %{y:.2e}<extra>Después P.E.</extra>',
    },
  ], [gran]);

  const granShapes = useMemo<Partial<Shape>[]>(
    () => curve.equivalenceVolumes.map((veq) => ({
      type: 'line', x0: veq, x1: veq, y0: 0, y1: 1,
      yref: 'paper', xref: 'x',
      line: { color: '#009E73', width: 1.5, dash: 'dash' },
    })),
    [curve.equivalenceVolumes],
  );

  const diagrams = [
    {
      id: 'efV',
      label: 'E = f(V)',
      node: (
        <Chart
          data={efVTraces}
          xTitle={`Volumen de ${titrantName} (mL)`}
          yTitle="E (mV)"
          xRange={[0, vMax]}
          yRange={[eMin - 20, eMax + 20]}
          shapes={efVShapes}
          annotations={efVAnnotations}
          exportName="quimeq-potenciometrica-efV"
        />
      ),
    },
    {
      id: 'gran',
      label: 'Gráfica de Gran',
      node: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Chart
              data={granTraces}
              xTitle={`Volumen de ${titrantName} (mL)`}
              yTitle="Función de Gran F"
              xRange={[0, vMax]}
              shapes={granShapes}
              exportName="quimeq-gran"
            />
          </div>
          <p className="hint" style={{ margin: '4px 8px 2px' }}>
            F₁ es lineal solo <em>antes</em> del P.E.; F₂ es lineal solo <em>después</em>. Las colas curvas son artefacto — extrapolando el segmento lineal hasta F=0 se obtiene V<sub>eq</sub>.
          </p>
        </div>
      ),
    },
  ];

  const veqFromZero = zeroCrossing;
  const veqFromCurve = curve.equivalenceVolumes[curve.equivalenceVolumes.length - 1];

  return (
    <>
      <aside className="panel">
        <div className="panel-header">
          <h2>Titulación potenciométrica</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <Segmented
          options={[
            { value: 'base', label: 'Alcalimetría (NaOH)' },
            { value: 'acid', label: 'Acidimetría (HCl)' },
          ]}
          value={titrantIsAcid ? 'acid' : 'base'}
          onChange={(v) => {
            const nextIsAcid = v === 'acid';
            setTitrantIsAcid(nextIsAcid);
            if (system.pKas.length === 0) setSystem(strongAcidSystem(nextIsAcid));
          }}
        />
        <ModelBadge
          model={`titulación potenciométrica de ${
            analyteKind === 'equilibrium'
              ? system.pKas.length > 1 ? 'sistema poliprótico' : 'sistema débil'
              : analyteKind === 'strong-base' ? 'base fuerte' : 'ácido fuerte'
          }`}
          additions={[showDeriv1 && 'primera derivada', showDeriv2 && 'segunda derivada']}
        />
        <AcidSystemEditor system={system} onChange={setSystem} includeStrong allowNoConstants showModel={false} />
        <h3>Condiciones</h3>
        <ConcSlider label="Concentración del analito" value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
        <Slider label="Volumen de la muestra" value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
        <ConcSlider label={`Concentración de ${titrantName}`} value={cTitrant} onChange={setCTitrant} min={-4} max={0} />
        <h3>Electrodo de vidrio</h3>
        <Slider
          label="K_ref (constante del electrodo, mV)"
          value={Kref} min={0} max={800} step={10}
          onChange={setKref} decimals={0}
        />
        <p className="hint">E = K_ref − 59.16·pH · S ≈ 59 mV/pH a 25 °C (factor de Nernst)</p>
        <Toggle label="Mostrar |dE/dV| (1.ª derivada)" checked={showDeriv1} onChange={setShowDeriv1} />
        <Toggle label="Mostrar d²E/dV² (2.ª derivada)" checked={showDeriv2} onChange={setShowDeriv2} />
        <ResultCard items={[
          { label: 'V_eq (del balance exacto)', value: `${veqFromCurve?.toFixed(2) ?? '—'} mL` },
          ...(showDeriv2 ? [{
            label: 'V_eq (cruce d²E/dV² = 0)',
            value: veqFromZero !== null ? `${veqFromZero.toFixed(2)} mL` : '—',
          }] : []),
          { label: 'E en el P.E.', value: veqFromCurve !== undefined ? (() => {
              const idx = curve.volumes.findIndex((v) => v >= veqFromCurve);
              return idx > 0 ? `${Es[idx].toFixed(1)} mV (pH ${curve.pHs[idx].toFixed(2)})` : '—';
            })() : '—' },
        ]} />
        <InfoBox title="Métodos de localización del P.E.">
          <p>
            <strong>1.ª derivada</strong>: el máximo de |dE/dV| señala el punto de inflexión
            (punto de equivalencia). Ambiguo si el salto es asimétrico.
          </p>
          <p>
            <strong>2.ª derivada</strong>: el cruce por cero de d²E/dV² es más preciso y no
            depende de la simetría del salto. Es el estándar en instrumentación moderna.
          </p>
          <p>
            <strong>Gráfica de Gran</strong>: linealiza el segmento pre- y post-equivalencia.
            F₁ = (V₀+V)·[H⁺] cae a cero en V_eq; F₂ = (V₀+V)·[OH⁻] sube desde cero.
            Excelente para detectar P.E. con <strong>poco salto</strong>.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="efV" />
      </section>
    </>
  );
}

/* ───────────────────────── Contenedor ───────────────────────── */

const MODES: { value: Mode; label: string }[] = [
  { value: 'acidobase', label: 'Ácido-base' },
  { value: 'edta', label: 'Complejométrica' },
  { value: 'redox', label: 'Redox' },
  { value: 'precip', label: 'Precipitación' },
  { value: 'potenciometrica', label: 'Potenciométrica' },
];

export default function Titulacion() {
  const [mode, setMode] = useState<Mode>('acidobase');
  const modeLabel = MODES.find((m) => m.value === mode)?.label ?? '';
  return (
    <div className="module-with-tabs">
      <details className="tit-mode-collapse" open>
        <summary className="tit-mode-summary">Tipo de titulación: {modeLabel}</summary>
        <div className="chart-tabs">
          {MODES.map((m) => (
            <button
              key={m.value}
              className={mode === m.value ? 'chart-tab active' : 'chart-tab'}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </details>
      <div className="module">
        {mode === 'acidobase' && <AcidBaseTitration />}
        {mode === 'edta' && <EdtaTitration />}
        {mode === 'redox' && <RedoxTitration />}
        {mode === 'precip' && <PrecipTitration />}
        {mode === 'potenciometrica' && <PotenciometricaTitration />}
      </div>
    </div>
  );
}
