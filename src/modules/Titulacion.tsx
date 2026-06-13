import { useMemo, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import {
  ConcSlider, DbPanel, InfoBox, LabelField, ResultCard, Segmented,
  SelectControl, Slider, Toggle,
} from '../components/Controls';
import {
  AcidSystemEditor, CoupleEditor, coupleFromPreset, defaultAcidSystem,
  type AcidSystem, type CoupleState,
} from '../components/Editors';
import DiagramTabs from '../components/DiagramTabs';
import { INDICATORS, METALS } from '../lib/database';
import { firstDerivative, granPlot, secondDerivative, titrationCurve, titratableProtons } from '../lib/titration';
import { alphaY4, edtaTitrationCurve } from '../lib/edta';
import { redoxTitrationCurve } from '../lib/redox';
import {
  precipTitrationCurve, mohrEndpointPAg, PRECIP_ANALYTES,
} from '../lib/precipTitration';

type Mode = 'acidobase' | 'edta' | 'redox' | 'precip' | 'potenciometrica';

/* ───────────────────────── Ácido-base ───────────────────────── */

function AcidBaseTitration() {
  const [system, setSystem] = useState<AcidSystem>(defaultAcidSystem());
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [indicatorId, setIndicatorId] = useState('phenolphthalein');
  const [showIndicator, setShowIndicator] = useState(true);
  const [showDerivative, setShowDerivative] = useState(false);

  function reset() {
    setSystem(defaultAcidSystem()); setTitrantIsAcid(false);
    setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setIndicatorId('phenolphthalein'); setShowIndicator(true); setShowDerivative(false);
  }

  const indicator = INDICATORS.find((i) => i.id === indicatorId)!;
  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';
  const nProtons = titratableProtons(system.pKas);
  const vEqLast = (nProtons * cAnalyte * vAnalyte) / cTitrant;
  const vMax = vEqLast * 1.6;

  const curve = useMemo(
    () => titrationCurve({
      analyte: { z0: system.z0, pKas: system.pKas },
      titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax,
    }),
    [system, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax],
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
          onChange={(v) => setTitrantIsAcid(v === 'acid')}
        />
        <AcidSystemEditor system={system} onChange={setSystem} />
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
            válido para ácidos y bases fuertes, débiles y polipróticos en cualquier
            dirección. Define tu propio sistema con los pKa o elige uno de la base de datos.
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
  const [label, setLabel] = useState('Calcio (Ca²⁺)');
  const [logKf, setLogKf] = useState(10.69);
  const [edtaInFlask, setEdtaInFlask] = useState(false);
  const [pH, setPH] = useState(10);
  const [cFlask, setCFlask] = useState(0.01);
  const [vFlask, setVFlask] = useState(50);
  const [cBuret, setCBuret] = useState(0.01);

  function reset() {
    setLabel('Calcio (Ca²⁺)'); setLogKf(10.69); setEdtaInFlask(false);
    setPH(10); setCFlask(0.01); setVFlask(50); setCBuret(0.01);
  }

  const vMax = ((cFlask * vFlask) / cBuret) * 1.8;
  const curve = useMemo(
    () => edtaTitrationCurve({ logKf, pH, cMetal: cFlask, vMetal: vFlask, cEdta: cBuret, vMax, edtaInFlask }),
    [logKf, pH, cFlask, vFlask, cBuret, vMax, edtaInFlask],
  );

  const traces = useMemo<Data[]>(() => [{
    x: curve.volumes, y: curve.pMs, type: 'scatter', mode: 'lines', name: 'pM',
    line: { width: 3, color: '#009E73' },
    hovertemplate: 'V = %{x:.2f} mL<br>pM = %{y:.2f}<extra></extra>',
  }], [curve]);

  const shapes = useMemo<Partial<Shape>[]>(() => [{
    type: 'line', x0: curve.vEq, x1: curve.vEq, y0: 0, y1: Math.max(...curve.pMs) + 1,
    line: { color: '#009E73', width: 1.5, dash: 'dash' },
  }], [curve]);

  const aY = alphaY4(pH);
  const feasible = curve.logKfCond >= 8;
  const buretName = edtaInFlask ? label : 'EDTA';
  const flaskName = edtaInFlask ? 'EDTA' : label;

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
        <div className="editor">
          <LabelField label="Ion metálico (nombre libre)" value={label} onChange={setLabel} />
          <Slider
            label="log Kf del complejo M–EDTA"
            value={logKf} min={6} max={28} step={0.01}
            onChange={(v) => setLogKf(v)}
          />
          <DbPanel
            items={METALS.map((m) => ({
              id: m.id,
              label: m.symbol,
              detail: `${m.name} · log Kf = ${m.logKf}`,
            }))}
            onSelect={(id) => {
              const m = METALS.find((x) => x.id === id)!;
              setLabel(`${m.name} (${m.symbol})`);
              setLogKf(m.logKf);
            }}
          />
        </div>
        <h3>Condiciones</h3>
        <Slider label="pH del tampón" value={pH} min={1} max={13} step={0.1} onChange={setPH} decimals={1} />
        <ConcSlider label={`Concentración en el matraz (${flaskName})`} value={cFlask} onChange={setCFlask} min={-4} max={-1} />
        <Slider label="Volumen del matraz" value={vFlask} min={5} max={100} step={1} onChange={setVFlask} unit="mL" decimals={0} />
        <ConcSlider label={`Concentración del titulante (${buretName})`} value={cBuret} onChange={setCBuret} min={-4} max={-1} />
        <ResultCard items={[
          { label: 'α(Y⁴⁻) a este pH', value: aY.toExponential(2) },
          { label: "log K′f condicional", value: curve.logKfCond.toFixed(2) },
          { label: 'Volumen de equivalencia', value: `${curve.vEq.toFixed(2)} mL` },
        ]} />
        <p className={feasible ? 'badge ok' : 'badge warn'}>
          {feasible
            ? "✓ Titulación factible (log K′f ≥ 8): salto nítido"
            : "⚠ log K′f < 8: salto pobre. Sube el pH o usa un metal con Kf mayor"}
        </p>
        <InfoBox title="Método de cálculo">
          <p>
            Constante condicional K′f = α(Y⁴⁻)·Kf al pH del tampón. La cuadrática del
            balance de masas da [M] exacto en cada punto. Retrotitulación: el EDTA en
            exceso queda en el matraz y se titula con el ion metálico.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle={`Volumen de ${buretName} agregado (mL)`}
          yTitle="pM (−log[M])"
          xRange={[0, vMax]}
          shapes={shapes}
          exportName="quimeq-titulacion-edta"
        />
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

/* ───────────────────────── Precipitación (argentométrica) ───────────────────────── */

function PrecipTitration() {
  const [analyteId, setAnalyteId] = useState('cl');
  const [pKsp, setPKsp] = useState(9.74);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [showPAg, setShowPAg] = useState(true);
  const [showMohr, setShowMohr] = useState(true);
  const [showDerivative, setShowDerivative] = useState(false);

  function reset() {
    setAnalyteId('cl'); setPKsp(9.74); setCAnalyte(0.1); setVAnalyte(25);
    setCTitrant(0.1); setShowPAg(true); setShowMohr(true); setShowDerivative(false);
  }

  const analyte = PRECIP_ANALYTES.find((a) => a.id === analyteId)!;

  const vEq0 = (cAnalyte * vAnalyte) / cTitrant;
  const vMax = vEq0 * 1.6;

  const curve = useMemo(
    () => precipTitrationCurve({ pKsp, cAnalyte, vAnalyte, cTitrant, vMax }),
    [pKsp, cAnalyte, vAnalyte, cTitrant, vMax],
  );

  const mohrPAg = mohrEndpointPAg(0.005);
  const yVals = showPAg ? curve.pAgs : curve.pXs;
  const yLabel = showPAg ? 'pAg (−log[Ag⁺])' : `p${analyte.label.replace('⁻', '')} (−log[X⁻])`;
  const yMax = Math.ceil(Math.max(...yVals.filter(Number.isFinite), curve.pAgEq * 1.2));

  const traces = useMemo<Data[]>(() => {
    const y = showPAg ? curve.pAgs : curve.pXs;
    const data: Data[] = [{
      x: curve.volumes, y, type: 'scatter', mode: 'lines',
      name: showPAg ? 'pAg' : 'pX',
      line: { width: 3, color: '#8E44AD' },
      hovertemplate: 'V = %{x:.2f} mL<br>p = %{y:.2f}<extra></extra>',
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
  }, [curve, showPAg, showDerivative]);

  const shapes = useMemo<Partial<Shape>[]>(() => {
    const list: Partial<Shape>[] = [{
      type: 'line', x0: curve.vEq, x1: curve.vEq, y0: 0, y1: yMax,
      line: { color: '#009E73', width: 1.5, dash: 'dash' },
    }];
    if (showMohr && showPAg) {
      list.push({
        type: 'line', x0: 0, x1: vMax, y0: mohrPAg, y1: mohrPAg,
        line: { color: '#E69F00', width: 1.5, dash: 'dot' },
      });
    }
    return list;
  }, [curve.vEq, showMohr, showPAg, mohrPAg, vMax, yMax]);

  const annotations = useMemo<Partial<Annotations>[]>(() => {
    const list: Partial<Annotations>[] = [{
      x: curve.vEq, y: yMax, text: 'P.E.', showarrow: false,
      font: { color: '#009E73', size: 12 },
    }];
    if (showMohr && showPAg) {
      list.push({
        x: vMax * 0.05, y: mohrPAg + 0.3,
        text: `Mohr: pAg = ${mohrPAg.toFixed(1)}`,
        showarrow: false, font: { color: '#E69F00', size: 11 },
        xanchor: 'left',
      });
    }
    return list;
  }, [curve.vEq, showMohr, showPAg, mohrPAg, vMax, yMax]);

  const saltName = analyte?.formula ?? 'AgX';
  const sharpness = pKsp >= 6;

  return (
    <>
      <aside className="panel">
        <div className="panel-header">
          <h2>Titulación por precipitación</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <p className="hint">Argentometría: Ag⁺ + X⁻ → {saltName}↓</p>
        <h3>Analito</h3>
        <SelectControl
          label="Especie a titular"
          value={analyteId}
          options={PRECIP_ANALYTES.map((a) => ({ value: a.id, label: `${a.label} → ${a.formula} (pKps ${a.pKsp})` }))}
          onChange={(id) => {
            setAnalyteId(id);
            const found = PRECIP_ANALYTES.find((a) => a.id === id);
            if (found) setPKsp(found.pKsp);
          }}
        />
        <Slider label="pKps del precipitado" value={pKsp} min={4} max={22} step={0.01} onChange={setPKsp} decimals={2} />
        <h3>Condiciones</h3>
        <ConcSlider label={`Concentración de ${analyte?.label ?? 'X⁻'}`} value={cAnalyte} onChange={setCAnalyte} min={-4} max={0} />
        <Slider label="Volumen de la muestra" value={vAnalyte} min={1} max={100} step={1} onChange={setVAnalyte} unit="mL" decimals={0} />
        <ConcSlider label="Concentración de AgNO₃" value={cTitrant} onChange={setCTitrant} min={-4} max={0} />
        <h3>Visualización</h3>
        <Toggle label="Mostrar pAg (en lugar de pX)" checked={showPAg} onChange={setShowPAg} />
        <Toggle label="Marcador indicador Mohr ([CrO₄²⁻]=5 mM)" checked={showMohr} onChange={setShowMohr} />
        <Toggle label="Mostrar derivada dp/dV" checked={showDerivative} onChange={setShowDerivative} />
        <ResultCard items={[
          { label: 'Volumen de equivalencia', value: `${curve.vEq.toFixed(2)} mL` },
          { label: `pAg en equivalencia (½ pKps)`, value: curve.pAgEq.toFixed(2) },
          { label: 'pAg indicador Mohr', value: `${mohrPAg.toFixed(2)} (Δ = ${(mohrPAg - curve.pAgEq).toFixed(2)})` },
        ]} />
        <p className={sharpness ? 'badge ok' : 'badge warn'}>
          {sharpness
            ? `✓ Salto nítido esperado (pKps = ${pKsp.toFixed(2)} ≥ 6)`
            : `⚠ pKps < 6: el salto puede ser difuso`}
        </p>
        <InfoBox title="Métodos argentométricos">
          <p>
            <strong>Mohr</strong>: indicador K₂CrO₄; el Ag₂CrO₄ rojo precipita al superar
            el punto de equivalencia del AgX. Funciona bien para Cl⁻ y Br⁻ en medio neutro.
          </p>
          <p>
            <strong>Volhard</strong>: retrotitulación con SCN⁻ y Fe³⁺ como indicador; se usa
            para Cl⁻, Br⁻, I⁻ y SCN⁻, incluso en medio ácido.
          </p>
          <p>
            <strong>Fajans</strong>: indicador de adsorción (fluoresceína, diclorofluoresceína);
            el coloide del precipitado cambia de color en el punto de equivalencia.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle="Volumen de AgNO₃ agregado (mL)"
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
  const [system, setSystem] = useState<AcidSystem>(defaultAcidSystem());
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cAnalyte, setCAnalyte] = useState(0.1);
  const [vAnalyte, setVAnalyte] = useState(25);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [Kref, setKref] = useState(400);      // mV
  const [showDeriv1, setShowDeriv1] = useState(false);
  const [showDeriv2, setShowDeriv2] = useState(true);

  function reset() {
    setSystem(defaultAcidSystem()); setTitrantIsAcid(false);
    setCAnalyte(0.1); setVAnalyte(25); setCTitrant(0.1);
    setKref(400); setShowDeriv1(false); setShowDeriv2(true);
  }

  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';
  const nProtons = titratableProtons(system.pKas);
  const vEqLast = (nProtons * cAnalyte * vAnalyte) / cTitrant;
  const vMax = vEqLast * 1.6;

  const curve = useMemo(
    () => titrationCurve({
      analyte: { z0: system.z0, pKas: system.pKas },
      titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax,
    }),
    [system, titrantIsAcid, cAnalyte, vAnalyte, cTitrant, vMax],
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
    if (zeroCrossing !== null) s.push({
      type: 'line', x0: zeroCrossing, x1: zeroCrossing, y0: eMin - 50, y1: eMax + 50,
      line: { color: '#D55E00', width: 1, dash: 'dot' },
    });
    return s;
  }, [curve.equivalenceVolumes, zeroCrossing, eMin, eMax]);

  const efVAnnotations = useMemo<Partial<Annotations>[]>(() => {
    const a: Partial<Annotations>[] = curve.equivalenceVolumes.map((veq) => ({
      x: veq, y: eMax, text: 'P.E.', showarrow: false, font: { color: '#009E73', size: 12 },
    }));
    if (zeroCrossing !== null) a.push({
      x: zeroCrossing, y: eMin + eSpan * 0.1,
      text: `d²E/dV²=0<br>${zeroCrossing.toFixed(2)} mL`,
      showarrow: false, font: { color: '#D55E00', size: 10 },
    });
    return a;
  }, [curve.equivalenceVolumes, zeroCrossing, eMax, eMin, eSpan]);

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
      // @ts-ignore
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
        <Chart
          data={granTraces}
          xTitle={`Volumen de ${titrantName} (mL)`}
          yTitle="Función de Gran F"
          xRange={[0, vMax]}
          shapes={granShapes}
          exportName="quimeq-gran"
        />
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
          onChange={(v) => setTitrantIsAcid(v === 'acid')}
        />
        <AcidSystemEditor system={system} onChange={setSystem} />
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
          { label: 'V_eq (cruce d²E/dV² = 0)', value: veqFromZero !== null ? `${veqFromZero.toFixed(2)} mL` : '—' },
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
  return (
    <div className="module-with-tabs">
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
