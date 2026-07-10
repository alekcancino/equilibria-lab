import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, ModelBadge, PanelSection, ResultCard, ResultCardRow, SelectControl, Slider, Toggle } from '../components/Controls';
import { AcidSystemEditor } from '../components/Editors';
import { defaultAcidSystem, isValidAcidSystem, systemLabels, type AcidSystem } from '../lib/editorModels';
import { solvePH, alphaFractions, saltCounterIons, defaultStartIndex, type AcidBaseComponent } from '../lib/equilibrium';
import { firstDerivative } from '../lib/titration';

interface MixRow {
  /** Stable React key, independent of array position — each row now hosts a
   * stateful AcidSystemEditor (DbPanel/Avanzado open state lives in the DOM),
   * so an index key would reattach that UI state to the wrong row on delete. */
  id: number;
  system: AcidSystem;
  conc: number;
  /** Ladder index prepared as the starting species (0 = fully protonated form) */
  startIndex: number;
}

const MAX_ROWS = 4;

let nextRowId = 0;

// r.startIndex may be stale: from a shared URL predating the field, or left
// behind when the user shrinks the pKa list in the editor — fall back rather
// than let an out-of-range/undefined index propagate NaN into solvePH.
function validStartIndex(system: AcidSystem, startIndex: number): number {
  return Number.isInteger(startIndex) && startIndex >= 0 && startIndex <= system.pKas.length
    ? startIndex
    : defaultStartIndex(system.z0, system.pKas.length);
}

const newRow = (): MixRow => ({ id: nextRowId++, system: defaultAcidSystem(), conc: 0.05, startIndex: 0 });

// The system label is free text (AcidSystemEditor's LabelField has no
// minimum length) — fall back rather than show a blank CSV column or
// result-card row when the user clears it.
function rowLabel(system: AcidSystem): string {
  return system.label.trim() || 'Sistema sin nombre';
}

/** Multicomponent mixtures: mixture pH and its titration curve. */
export default function Mezclas() {
  const [rows, setRows] = useState<MixRow[]>([newRow()]);
  const [titrate, setTitrate] = useState(false);
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [vSample, setVSample] = useState(25);
  const [showDerivative, setShowDerivative] = useState(false);
  const [ionicStrength, setIonicStrength] = useState(0);

  useShareEffect('mezclas', { rows, titrate, titrantIsAcid, cTitrant, vSample, showDerivative, ionicStrength }, (s) => {
    // Rows come from an untrusted URL and the shape changed over time
    // (pre-custom links carried {acidId} without a system) — sanitize each
    // row or fall back to a default one; never let a malformed system reach
    // solvePH (NaN there converges to a silent bogus pH, not an error).
    if (Array.isArray(s.rows)) {
      const restored = s.rows.slice(0, MAX_ROWS).map((raw): MixRow => {
        const r = raw as Partial<MixRow>;
        if (!isValidAcidSystem(r.system)) return newRow();
        const system = { ...r.system, pKas: [...r.system.pKas] };
        return {
          id: nextRowId++,
          system,
          conc: typeof r.conc === 'number' && Number.isFinite(r.conc) && r.conc > 0 ? r.conc : 0.05,
          startIndex: validStartIndex(system, r.startIndex ?? NaN),
        };
      });
      setRows(restored.length > 0 ? restored : [newRow()]);
    }
    if (s.titrate !== undefined) setTitrate(s.titrate);
    if (s.titrantIsAcid !== undefined) setTitrantIsAcid(s.titrantIsAcid);
    if (s.cTitrant !== undefined) setCTitrant(s.cTitrant);
    if (s.vSample !== undefined) setVSample(s.vSample);
    if (s.showDerivative !== undefined) setShowDerivative(s.showDerivative);
    if (s.ionicStrength !== undefined) setIonicStrength(s.ionicStrength);
  });

  function reset() {
    setRows([newRow()]);
    setTitrate(false);
    setTitrantIsAcid(false);
    setCTitrant(0.1);
    setVSample(25);
    setShowDerivative(false);
    setIonicStrength(0);
  }

  const updateRow = (i: number, patch: Partial<MixRow>) => {
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  // Components + spectator ions from the salt each row was prepared as —
  // see saltCounterIons/defaultStartIndex in equilibrium.ts (shared with
  // AcidoBase.tsx and titration.ts).
  const buildComponents = (dilution: number) => {
    const comps: AcidBaseComponent[] = [];
    let cations = 0;
    let anions = 0;
    for (const r of rows) {
      const c = r.conc * dilution;
      comps.push({ c, z0: r.system.z0, pKas: r.system.pKas });
      const ions = saltCounterIons(r.system.z0, validStartIndex(r.system, r.startIndex));
      cations += ions.cations * c;
      anions += ions.anions * c;
    }
    return { comps, cations, anions };
  };

  const exportMetadata = useMemo(() => ({
    Módulo: 'Mezclas ácido-base',
    Componentes: rows.map((r) => rowLabel(r.system)).join(' + '),
    'I / M': ionicStrength.toFixed(3),
  }), [rows, ionicStrength]);

  const pHMix = useMemo(() => {
    const { comps, cations, anions } = buildComponents(1);
    return solvePH(comps, cations, anions, ionicStrength);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, ionicStrength]);
  const pHInvalid = !Number.isFinite(pHMix);

  const speciation = useMemo(() => {
    if (pHInvalid) {
      return [{ label: 'pH de la mezcla', value: 'Sin raíz en balance de cargas' }];
    }
    const h = Math.pow(10, -pHMix);
    const items: { label: string; value: string }[] = [{ label: 'pH de la mezcla', value: pHMix.toFixed(2) }];
    for (const r of rows) {
      const alphas = alphaFractions(h, r.system.pKas);
      const dominant = alphas.indexOf(Math.max(...alphas));
      items.push({
        label: rowLabel(r.system).split(' (')[0],
        value: `${systemLabels(r.system)[dominant]} (α = ${alphas[dominant].toFixed(2)})`,
      });
    }
    return items;
  }, [rows, pHMix, pHInvalid]);

  const curve = useMemo(() => {
    if (!titrate) return null;
    const points = 600;
    const totalConc = rows.reduce((s, r) => s + r.conc, 0);
    const vMax = Math.max(((totalConc * 3) * vSample) / cTitrant, 1);
    const volumes: number[] = [];
    const pHs: number[] = [];
    for (let i = 0; i <= points; i++) {
      const vt = (vMax * i) / points;
      const vTotal = vSample + vt;
      const { comps, cations, anions } = buildComponents(vSample / vTotal);
      const titrantConc = (cTitrant * vt) / vTotal;
      const pH = titrantIsAcid
        ? solvePH(comps, cations, anions + titrantConc, ionicStrength)
        : solvePH(comps, cations + titrantConc, anions, ionicStrength);
      volumes.push(vt);
      pHs.push(pH);
    }
    return { volumes, pHs, vMax };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, titrate, titrantIsAcid, cTitrant, vSample, ionicStrength]);

  const traces = useMemo<Data[]>(() => {
    if (!curve) return [];
    const data: Data[] = [{
      x: curve.volumes,
      y: curve.pHs,
      type: 'scatter',
      mode: 'lines',
      name: 'pH',
      line: { width: 3, color: '#0072B2' },
      hovertemplate: 'V = %{x:.2f} mL<br>pH = %{y:.2f}<extra></extra>',
    }];
    if (showDerivative) {
      const der = firstDerivative(curve.volumes, curve.pHs);
      const maxD = Math.max(...der.d.map(Math.abs), 1e-9);
      data.push({
        x: der.v,
        y: der.d.map((d) => (Math.abs(d) / maxD) * 14),
        type: 'scatter',
        mode: 'lines',
        name: '|dpH/dV| (escalada)',
        line: { width: 2, color: '#7F8C8D' },
        hoverinfo: 'skip',
      });
    }
    return data;
  }, [curve, showDerivative]);

  const bufferCurve = useMemo(() => {
    const PH_POINTS = 400;
    const Kw = 1e-14;
    const pHs: number[] = [];
    const betas: number[] = [];
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      const h = Math.pow(10, -pH);
      let beta = 2.303 * (Kw / h + h);
      for (const r of rows) {
        const alphas = alphaFractions(h, r.system.pKas);
        let variance = 0;
        for (let ii = 0; ii < alphas.length; ii++) {
          for (let jj = ii + 1; jj < alphas.length; jj++) {
            variance += (jj - ii) ** 2 * alphas[ii] * alphas[jj];
          }
        }
        beta += 2.303 * r.conc * variance;
      }
      pHs.push(pH);
      betas.push(beta);
    }
    return { pHs, betas };
  }, [rows]);

  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';

  return (
    <div className="module">
      <PanelShell title="Mezclas multicomponente" onReset={reset} moduleId="mezclas">
        <PanelSection title="Sistemas" icon="⚛">
        <ModelBadge
          model={rows.length === 1
            ? 'un sistema ácido-base'
            : `mezcla de ${rows.length} sistemas ácido-base`}
          additions={[titrate && 'titulación', titrate && showDerivative && 'derivada']}
        />
        {rows.map((r, i) => {
          const startIndex = validStartIndex(r.system, r.startIndex);
          const labels = systemLabels(r.system);
          return (
            <div key={r.id} className="mix-row">
              <div className="mix-row-header">
                <span className="control-label">Componente {i + 1}</span>
                {rows.length > 1 && (
                  <button className="mini-btn" onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button>
                )}
              </div>
              <AcidSystemEditor
                system={r.system}
                showModel={false}
                allowAquaCations
                onChange={(sys) => {
                  const shapeChanged = sys.z0 !== r.system.z0 || sys.pKas.length !== r.system.pKas.length;
                  updateRow(i, {
                    system: sys,
                    startIndex: shapeChanged ? defaultStartIndex(sys.z0, sys.pKas.length) : r.startIndex,
                  });
                }}
              />
              <ConcSlider label="Concentración" value={r.conc} onChange={(v) => updateRow(i, { conc: v })} min={-4} max={0} />
              <SelectControl
                label="Forma de partida"
                value={String(startIndex)}
                options={Array.from({ length: r.system.pKas.length + 1 }, (_, lvl) => {
                  const { cations, anions } = saltCounterIons(r.system.z0, lvl);
                  const mult = (n: number) => (n > 1 ? ` ${n}×` : '');
                  // A ladder that never reaches a neutral species is an
                  // aqua-acid cation, conventionally prepared as a nitrate.
                  const anionName = r.system.z0 > r.system.pKas.length ? 'nitrato' : 'cloruro';
                  const suffix = anions > 0
                    ? ` (sal de ${anionName}${mult(anions)})`
                    : cations > 0
                      ? ` (sal sódica${mult(cations)})`
                      : '';
                  return { value: String(lvl), label: `${labels[lvl]}${suffix}` };
                })}
                onChange={(v) => updateRow(i, { startIndex: parseInt(v, 10) })}
              />
            </div>
          );
        })}
        {rows.length < MAX_ROWS && (
          <button
            className="add-btn"
            onClick={() => setRows([...rows, newRow()])}
          >
            + Agregar componente
          </button>
        )}
        </PanelSection>

        <PanelSection title="Resultado" icon="∑">
        <ResultCard items={speciation} />
        </PanelSection>

        <PanelSection title="Titulación de la mezcla" icon="⚗">
        <Toggle label="Mostrar curva de titulación" checked={titrate} onChange={setTitrate} />
        {titrate && (
          <>
            <Toggle label={`Titular con ácido fuerte (${titrantName})`} checked={titrantIsAcid} onChange={setTitrantIsAcid} />
            <ConcSlider label={`Concentración de ${titrantName}`} value={cTitrant} onChange={setCTitrant} min={-3} max={0} />
            <Slider
              label="Volumen de muestra"
              value={vSample} min={5} max={100} step={1}
              onChange={setVSample} unit="mL" decimals={0}
            />
            <Toggle label="Mostrar derivada dpH/dV" checked={showDerivative} onChange={setShowDerivative} />
          </>
        )}
        <details className="section-collapse">
          <summary>Corrección por actividad (Debye–Hückel)</summary>
          <Slider label="Fuerza iónica I" helpId="ionicStrength" value={ionicStrength} min={0} max={0.5} step={0.01} onChange={setIonicStrength} decimals={2} />
          <p className="hint">I = 0 → γ = 1 (resultado termodinámico). Aplica a pH de mezcla y curva de titulación.</p>
        </details>
        </PanelSection>

        <InfoBox title="¿Qué puedo simular aquí?">
          <p>
            Hasta 4 sistemas ácido-base coexistiendo: el pH se resuelve con el balance de
            cargas global de la mezcla, sin aproximaciones. Cada componente es totalmente
            editable — nombre libre, pKas y carga z₀ — y la base de datos solo auto-rellena
            valores de partida. "Forma de partida" te permite disolver la sal de cualquier
            forma intermedia (NaHCO₃, Na₂HPO₄, NH₄Cl…) agregando el contraión espectador
            correcto automáticamente.
          </p>
          <p>
            Prueba carbonato + amonio (agua natural), o cítrico + fosfato (bebidas), y
            titula la mezcla: cada protón con ΔpKa suficiente da su propio salto.
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs initialId="beta" tabs={[
          {
            id: 'titulacion',
            label: 'Titulación',
            node: titrate && curve ? (
              <Chart
                data={traces}
                xTitle={`Volumen de ${titrantName} agregado (mL)`}
                yTitle="pH"
                xRange={[0, curve.vMax]}
                yRange={[0, 14]}
                exportName="equilibria-mezcla-titulacion"
                exportMetadata={exportMetadata}
              />
            ) : (
              <div className="empty-plot">
                <p>pH de la mezcla: <strong>{pHInvalid ? '—' : pHMix.toFixed(2)}</strong></p>
                <p className="hint">Activa la curva de titulación para ver la gráfica.</p>
              </div>
            ),
          },
          {
            id: 'beta',
            label: 'Capacidad buffer β',
            node: (
              <Chart
                data={[{
                  x: bufferCurve.pHs,
                  y: bufferCurve.betas,
                  type: 'scatter',
                  mode: 'lines',
                  name: 'β (mezcla)',
                  line: { width: 2.5, color: '#009E73' },
                  hovertemplate: 'pH = %{x:.2f}<br>β = %{y:.4f} mol/L·pH<extra></extra>',
                }]}
                xTitle="pH"
                yTitle="β (mol L⁻¹ pH⁻¹)"
                xRange={[0, 14]}
                shapes={[{
                  type: 'line',
                  x0: pHMix, x1: pHMix,
                  y0: 0, y1: 1, yref: 'paper',
                  line: { color: '#0072B2', width: 1.5, dash: 'dot' },
                }]}
                annotations={[{
                  x: pHMix, y: 0.97, yref: 'paper',
                  text: `pH = ${pHMix.toFixed(2)}`,
                  showarrow: false,
                  font: { color: '#0072B2', size: 11 },
                  xanchor: 'left',
                }]}
                exportName="equilibria-mezcla-buffer"
                exportMetadata={exportMetadata}
              />
            ),
          },
        ]} />
        <ResultCardRow items={[
          { label: 'pH de la mezcla', value: pHInvalid ? '—' : pHMix.toFixed(2), accent: true },
          { label: 'Componentes', value: String(rows.length) },
          { label: 'Titulante', value: titrate ? titrantName : '—' },
        ]} />
      </section>
    </div>
  );
}
