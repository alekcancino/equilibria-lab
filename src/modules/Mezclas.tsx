import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import { ConcSlider, Disclosure, InfoBox, ModelBadge, PanelSection, ResultCard, ResultCardRow, SelectControl, Segmented, Slider, Toggle } from '../components/Controls';
import { AcidSystemEditor } from '../components/Editors';
import { defaultAcidSystem, isValidAcidSystem, systemLabels, type AcidSystem } from '../lib/editorModels';
import { solvePH, alphaFractions, saltCounterIons, defaultStartIndex, type AcidBaseComponent } from '../lib/equilibrium';
import { firstDerivative } from '../lib/titration';
import type { GammaModel } from '../lib/activity';
import { useT } from '../hooks/useT';
import { bufferCapacityCurve } from '../lib/bufferCapacity';

function isValidGammaModel(v: unknown): v is GammaModel {
  return v === 'dh' || v === 'davies' || v === 'guntelberg';
}

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
function rowLabel(system: AcidSystem, unnamedFallback: string): string {
  return system.label.trim() || unnamedFallback;
}

/** Multicomponent mixtures: mixture pH and its titration curve. */
export default function Mezclas() {
  const t = useT();
  const GAMMA_MODELS: { value: GammaModel; label: string }[] = useMemo(() => [
    { value: 'dh', label: t('acidoBase.gammaDH') },
    { value: 'davies', label: t('acidoBase.gammaDavies') },
    { value: 'guntelberg', label: t('acidoBase.gammaGuntelberg') },
  ], [t]);
  const [rows, setRows] = useState<MixRow[]>([newRow()]);
  const [titrate, setTitrate] = useState(false);
  const [titrantIsAcid, setTitrantIsAcid] = useState(false);
  const [cTitrant, setCTitrant] = useState(0.1);
  const [vSample, setVSample] = useState(25);
  const [showDerivative, setShowDerivative] = useState(false);
  const [ionicStrength, setIonicStrength] = useState(0);
  const [gammaModel, setGammaModel] = useState<GammaModel>('dh');

  useShareEffect('mezclas', { rows, titrate, titrantIsAcid, cTitrant, vSample, showDerivative, ionicStrength, gammaModel }, (s) => {
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
    if (isValidGammaModel(s.gammaModel)) setGammaModel(s.gammaModel);
  });

  function reset() {
    setRows([newRow()]);
    setTitrate(false);
    setTitrantIsAcid(false);
    setCTitrant(0.1);
    setVSample(25);
    setShowDerivative(false);
    setIonicStrength(0);
    setGammaModel('dh');
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
    Componentes: rows.map((r) => rowLabel(r.system, 'Sistema sin nombre')).join(' + '),
    'I / M': ionicStrength.toFixed(3),
    'Modelo γ': GAMMA_MODELS.find((m) => m.value === gammaModel)?.label ?? gammaModel,
  }), [rows, ionicStrength, gammaModel, GAMMA_MODELS]);

  const pHMix = useMemo(() => {
    const { comps, cations, anions } = buildComponents(1);
    return solvePH(comps, cations, anions, ionicStrength, gammaModel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, ionicStrength, gammaModel]);
  const pHInvalid = !Number.isFinite(pHMix);

  const speciation = useMemo(() => {
    if (pHInvalid) {
      return [{ label: t('mezclas.mixturePH'), value: t('mezclas.noRootFound') }];
    }
    const h = Math.pow(10, -pHMix);
    const items: { label: string; value: string }[] = [{ label: t('mezclas.mixturePH'), value: pHMix.toFixed(2) }];
    for (const r of rows) {
      const alphas = alphaFractions(h, r.system.pKas);
      const dominant = alphas.indexOf(Math.max(...alphas));
      items.push({
        label: rowLabel(r.system, t('mezclas.unnamedSystem')).split(' (')[0],
        value: `${systemLabels(r.system)[dominant]} (α = ${alphas[dominant].toFixed(2)})`,
      });
    }
    return items;
  }, [rows, pHMix, pHInvalid, t]);

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
        ? solvePH(comps, cations, anions + titrantConc, ionicStrength, gammaModel)
        : solvePH(comps, cations + titrantConc, anions, ionicStrength, gammaModel);
      volumes.push(vt);
      pHs.push(pH);
    }
    return { volumes, pHs, vMax };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, titrate, titrantIsAcid, cTitrant, vSample, ionicStrength, gammaModel]);

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
        name: t('mezclas.derivativeTraceName'),
        line: { width: 2, color: '#7F8C8D' },
        hoverinfo: 'skip',
      });
    }
    return data;
  }, [curve, showDerivative, t]);

  const bufferCurve = useMemo(() => {
    return bufferCapacityCurve(rows.map((r) => ({ c: r.conc, pKas: r.system.pKas })));
  }, [rows]);

  const titrantName = titrantIsAcid ? 'HCl' : 'NaOH';

  return (
    <div className="module">
      <PanelShell title={t('mezclas.title')} onReset={reset} moduleId="mezclas" guideId="mezclas">
        <PanelSection title={t('mezclas.systemsSection')}>
        <ModelBadge
          model={rows.length === 1
            ? t('mezclas.oneSystem')
            : t('mezclas.mixOfNSystems', { n: rows.length })}
          additions={[titrate && t('mezclas.additionTitration'), titrate && showDerivative && t('mezclas.additionDerivative')]}
        />
        {rows.map((r, i) => {
          const startIndex = validStartIndex(r.system, r.startIndex);
          const labels = systemLabels(r.system);
          return (
            <div key={r.id} className="mix-row">
              <div className="mix-row-header">
                <span className="control-label">{t('mezclas.componentN', { n: i + 1 })}</span>
                {rows.length > 1 && (
                  <button type="button" className="mini-btn" aria-label={t('mezclas.removeComponent', { n: i + 1 })} onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button>
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
              <ConcSlider label={t('mezclas.concentrationOf', { name: r.system.label || t('mezclas.componentLower', { n: i + 1 }) })} value={r.conc} onChange={(v) => updateRow(i, { conc: v })} min={-4} max={0} />
              <SelectControl
                label={t('mezclas.startingFormLabel')}
                value={String(startIndex)}
                options={Array.from({ length: r.system.pKas.length + 1 }, (_, lvl) => {
                  const { cations, anions } = saltCounterIons(r.system.z0, lvl);
                  const mult = (n: number) => (n > 1 ? ` ${n}×` : '');
                  // A ladder that never reaches a neutral species is an
                  // aqua-acid cation, conventionally prepared as a nitrate.
                  const anionName = r.system.z0 > r.system.pKas.length ? t('mezclas.nitrateAnion') : t('mezclas.chlorideAnion');
                  const suffix = anions > 0
                    ? t('mezclas.saltOfAnion', { anion: anionName, mult: mult(anions) })
                    : cations > 0
                      ? t('mezclas.sodiumSalt', { mult: mult(cations) })
                      : '';
                  return { value: String(lvl), label: `${labels[lvl]}${suffix}` };
                })}
                onChange={(v) => updateRow(i, { startIndex: parseInt(v, 10) })}
              />
            </div>
          );
        })}
        {rows.length < MAX_ROWS && (
          <button type="button"
            className="add-btn"
            onClick={() => setRows([...rows, newRow()])}
          >
            {t('mezclas.addComponentButton')}
          </button>
        )}
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')}>
        <ResultCard items={speciation} />
        </PanelSection>

        <Disclosure title={t('mezclas.titrationSection')} open={titrate} onToggle={setTitrate}>
          <>
            <Toggle label={t('mezclas.titrateWithStrongAcid', { titrant: titrantName })} checked={titrantIsAcid} onChange={setTitrantIsAcid} />
            <ConcSlider label={t('mezclas.concentrationOf', { name: titrantName })} value={cTitrant} onChange={setCTitrant} min={-3} max={0} />
            <Slider
              label={t('mezclas.sampleVolumeLabel')}
              value={vSample} min={5} max={100} step={1}
              onChange={setVSample} unit="mL" decimals={0}
            />
            <Toggle label={t('mezclas.showDerivativeToggle')} checked={showDerivative} onChange={setShowDerivative} />
          </>
        <details className="section-collapse">
          <summary className="section-collapse-title">{t('acidoBase.activityCorrection')}<span className="ui-chevron" aria-hidden /></summary>
          <Slider label={t('complejos.ionicStrengthLabel')} helpId="ionicStrength" value={ionicStrength} min={0} max={0.5} step={0.01} onChange={setIonicStrength} decimals={2} />
          <div className="control-input">
            <Segmented
              ariaLabel={t('actividad.gammaModelLabel')}
              options={GAMMA_MODELS}
              value={gammaModel}
              onChange={(v) => setGammaModel(isValidGammaModel(v) ? v : 'dh')}
            />
          </div>
          <p className="hint">{t('mezclas.activityHint')}</p>
        </details>
        </Disclosure>

        <InfoBox title={t('mezclas.infoBoxTitle')}>
          <p>
            {t('mezclas.infoBoxPara1')}
          </p>
          <p>
            {t('mezclas.infoBoxPara2')}
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <DiagramTabs initialId="beta" tabs={[
          {
            id: 'titulacion',
            label: t('mezclas.tabTitration'),
            node: titrate && curve ? (
              <Chart
                data={traces}
                xTitle={t('mezclas.volumeAddedLabel', { titrant: titrantName })}
                yTitle="pH"
                xRange={[0, curve.vMax]}
                yRange={[0, 14]}
                exportName="equilibria-mezcla-titulacion"
                exportMetadata={exportMetadata}
              />
            ) : (
              <div className="empty-plot">
                <p>{t('mezclas.mixturePH')}: <strong>{pHInvalid ? '—' : pHMix.toFixed(2)}</strong></p>
                <p className="hint">{t('mezclas.enableTitrationHint')}</p>
                <button type="button" className="empty-plot-action" onClick={() => setTitrate(true)}>
                  {t('mezclas.showTitrationCurve')}
                </button>
              </div>
            ),
          },
          {
            id: 'beta',
            label: t('mezclas.tabBufferCapacity'),
            node: (
              <Chart
                data={[{
                  x: bufferCurve.pHs,
                  y: bufferCurve.betas,
                  type: 'scatter',
                  mode: 'lines',
                  name: t('mezclas.betaTraceName'),
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
          { label: t('mezclas.mixturePH'), value: pHInvalid ? '—' : pHMix.toFixed(2), accent: true },
          { label: t('mezclas.componentsResult'), value: String(rows.length) },
          { label: t('mezclas.titrantResult'), value: titrate ? titrantName : '—' },
        ]} />
      </section>
    </div>
  );
}
