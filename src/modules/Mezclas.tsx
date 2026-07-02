import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, InfoBox, ModelBadge, PanelSection, ResultCard, ResultCardRow, SelectControl, Slider, Toggle } from '../components/Controls';
import { ACIDS } from '../lib/database';
import { solvePH, alphaFractions, type AcidBaseComponent } from '../lib/equilibrium';
import { firstDerivative } from '../lib/titration';

interface MixRow {
  acidId: string;
  conc: number;
  /** Protons already neutralised during preparation (0 = pure acid, 1 = monosodium salt, ...) */
  saltLevel: number;
}

const MAX_ROWS = 4;

const INITIAL_ROWS: MixRow[] = [{ acidId: 'acetic', conc: 0.05, saltLevel: 0 }];

/** Multicomponent mixtures: mixture pH and its titration curve. */
export default function Mezclas() {
  const [rows, setRows] = useState<MixRow[]>([...INITIAL_ROWS]);
  const [titrate, setTitrate] = useState(false);
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [vSample, setVSample] = useState(25);
  const [showDerivative, setShowDerivative] = useState(false);

  useShareEffect('mezclas', { rows, titrate, titrantIsAcid, cTitrant, vSample, showDerivative }, (s) => {
    if (s.rows) setRows(s.rows);
    if (s.titrate !== undefined) setTitrate(s.titrate);
    if (s.titrantIsAcid !== undefined) setTitrantIsAcid(s.titrantIsAcid);
    if (s.cTitrant !== undefined) setCTitrant(s.cTitrant);
    if (s.vSample !== undefined) setVSample(s.vSample);
    if (s.showDerivative !== undefined) setShowDerivative(s.showDerivative);
  });

  function reset() {
    setRows([...INITIAL_ROWS]);
    setTitrate(false);
    setTitrantIsAcid(false);
    setCTitrant(0.1);
    setVSample(25);
    setShowDerivative(false);
  }

  const updateRow = (i: number, patch: Partial<MixRow>) => {
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };

  // Components + spectator ions from salts (Na⁺ per proton neutralised,
  // or Cl⁻ if the "salt" of a base is its protonated form, e.g. NH₄Cl).
  const buildComponents = (dilution: number) => {
    const comps: AcidBaseComponent[] = [];
    let cations = 0;
    let anions = 0;
    for (const r of rows) {
      const preset = ACIDS.find((a) => a.id === r.acidId)!;
      const c = r.conc * dilution;
      comps.push({ c, z0: preset.z0, pKas: preset.pKas });
      // saltLevel protons removed with NaOH during preparation → Na⁺ spectator
      if (preset.z0 === 0) cations += r.saltLevel * c;
      // for bases (z0=1): saltLevel=1 means starting from the salt (BH⁺Cl⁻) → Cl⁻
      else anions += r.saltLevel * c;
    }
    return { comps, cations, anions };
  };

  const pHMix = useMemo(() => {
    const { comps, cations, anions } = buildComponents(1);
    return solvePH(comps, cations, anions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
  const pHInvalid = !Number.isFinite(pHMix);

  const speciation = useMemo(() => {
    if (pHInvalid) {
      return [{ label: 'pH de la mezcla', value: 'Sin raíz en balance de cargas' }];
    }
    const h = Math.pow(10, -pHMix);
    const items: { label: string; value: string }[] = [{ label: 'pH de la mezcla', value: pHMix.toFixed(2) }];
    for (const r of rows) {
      const preset = ACIDS.find((a) => a.id === r.acidId)!;
      const alphas = alphaFractions(h, preset.pKas);
      const dominant = alphas.indexOf(Math.max(...alphas));
      items.push({
        label: `${preset.name.split(' (')[0]}`,
        value: `${preset.speciesLabels[dominant]} (α = ${alphas[dominant].toFixed(2)})`,
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
        ? solvePH(comps, cations, anions + titrantConc)
        : solvePH(comps, cations + titrantConc, anions);
      volumes.push(vt);
      pHs.push(pH);
    }
    return { volumes, pHs, vMax };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, titrate, titrantIsAcid, cTitrant, vSample]);

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
        const preset = ACIDS.find((a) => a.id === r.acidId)!;
        const alphas = alphaFractions(h, preset.pKas);
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
      <PanelShell title="Mezclas multicomponente" onReset={reset}>
        <PanelSection title="Sistemas" icon="⚛">
        <ModelBadge
          model={rows.length === 1
            ? 'un sistema ácido-base'
            : `mezcla de ${rows.length} sistemas ácido-base`}
          additions={[titrate && 'titulación', titrate && showDerivative && 'derivada']}
        />
        {rows.map((r, i) => {
          const preset = ACIDS.find((a) => a.id === r.acidId)!;
          const maxSalt = preset.z0 === 0 ? preset.pKas.length : 1;
          return (
            <div key={i} className="mix-row">
              <div className="mix-row-header">
                <span className="control-label">Componente {i + 1}</span>
                {rows.length > 1 && (
                  <button className="mini-btn" onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button>
                )}
              </div>
              <SelectControl
                label=""
                value={r.acidId}
                options={ACIDS.filter((a) => !a.strong).map((a) => ({ value: a.id, label: a.name }))}
                onChange={(v) => updateRow(i, { acidId: v, saltLevel: 0 })}
              />
              <ConcSlider label="Concentración" value={r.conc} onChange={(v) => updateRow(i, { conc: v })} min={-4} max={0} />
              {maxSalt > 0 && (
                <SelectControl
                  label="Forma de partida"
                  value={String(r.saltLevel)}
                  options={Array.from({ length: maxSalt + 1 }, (_, lvl) => ({
                    value: String(lvl),
                    label: preset.z0 === 0
                      ? `${preset.speciesLabels[lvl]}${lvl > 0 ? ` (sal sódica ${lvl}×)` : ''}`
                      : `${preset.speciesLabels[1 - lvl]}${lvl > 0 ? ' (sal de cloruro)' : ''}`,
                  }))}
                  onChange={(v) => updateRow(i, { saltLevel: parseInt(v, 10) })}
                />
              )}
            </div>
          );
        })}
        {rows.length < MAX_ROWS && (
          <button
            className="add-btn"
            onClick={() => setRows([...rows, { acidId: 'acetic', conc: 0.05, saltLevel: 0 }])}
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
        </PanelSection>

        <InfoBox title="¿Qué puedo simular aquí?">
          <p>
            Hasta 4 sistemas ácido-base coexistiendo: el pH se resuelve con el balance de
            cargas global de la mezcla, sin aproximaciones. El slider de sal te permite
            partir de NaHCO₃, Na₂HPO₄, NH₄Cl, etc., sin tener que pensarlo como "ácido + base".
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
              />
            ) : (
              <div className="empty-plot">
                <p>pH de la mezcla: <strong>{pHMix.toFixed(2)}</strong></p>
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
