import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import {
  ConcSlider, ConstantList, DbPanel, InfoBox, LabelField, ModelBadge, NumberSegmented, PanelSection,
  ResultCard, ResultCardRow, Segmented, Slider, Toggle,
} from '../components/Controls';
import { SALTS, type SaltPreset } from '../lib/database';
import { formatMolar } from '../lib/format';
import { solubility, acidSolidSolubility, baseSolidSolubility } from '../lib/solubility';
import type { GammaModel } from '../lib/activity';
import { toSub } from '../lib/complexDatabase';
import { useT } from '../hooks/useT';

const PH_POINTS = 300;
function isValidGammaModel(v: unknown): v is GammaModel {
  return v === 'dh' || v === 'davies' || v === 'guntelberg';
}

interface SaltState {
  label: string;
  pKsp: number;
  m: number;
  x: number;
  anionPKas: number[];
  anionLabel: string;
  cationLabel: string;
  reference: string | null;
}

function saltFromPreset(p: SaltPreset): SaltState {
  return {
    label: `${p.name} — ${p.formula}`,
    pKsp: p.pKsp,
    m: p.m,
    x: p.x,
    anionPKas: p.anionPKas ? [...p.anionPKas] : [],
    anionLabel: p.anionLabel,
    cationLabel: p.cationLabel,
    reference: 'Harris; Stumm & Morgan (1996)',
  };
}

const DEFAULT_SALT_ID = 'agcl';

// ── Molecular (non-ionic) acid/base solid — ROADMAP B-6 ─────────────────────

interface MolecularState {
  name: string;
  S0: number;
  pKa: number;
  kind: 'acid' | 'base';
  reference: string | null;
}

function defaultMolecular(): MolecularState {
  return { name: 'Ácido benzoico', S0: 0.0278, pKa: 4.2, kind: 'acid', reference: 'Martin, Physical Pharmacy' };
}

function molecularSolubility(m: MolecularState, pH: number): number {
  return m.kind === 'acid'
    ? acidSolidSolubility(m.S0, m.pKa, pH)
    : baseSolidSolubility(m.S0, m.pKa, pH);
}

/** Solubility of sparingly soluble salts: pH effect and common-ion effect. */
export default function Solubilidad() {
  const t = useT();
  const GAMMA_MODELS: { value: GammaModel; label: string }[] = useMemo(() => [
    { value: 'dh', label: t('acidoBase.gammaDH') },
    { value: 'davies', label: t('acidoBase.gammaDavies') },
    { value: 'guntelberg', label: t('acidoBase.gammaGuntelberg') },
  ], [t]);
  const [mode, setMode] = useState<'ionic' | 'molecular'>('ionic');
  const [salt, setSalt] = useState<SaltState>(saltFromPreset(SALTS.find((s) => s.id === DEFAULT_SALT_ID)!));
  const [molecular, setMolecular] = useState<MolecularState>(defaultMolecular);
  const [useCommon, setUseCommon] = useState(false);
  const [cCommon, setCCommon] = useState(0.01);
  const [pHPoint, setPHPoint] = useState(7);
  const [ionicStrength, setIonicStrength] = useState(0);
  const [gammaModel, setGammaModel] = useState<GammaModel>('dh');

  useShareEffect('solubilidad', { mode, salt, molecular, useCommon, cCommon, pHPoint, ionicStrength, gammaModel }, (s) => {
    // A ?s= link is untrusted/unvalidated JSON — guard the union and merge
    // nested objects onto their defaults so a partial/corrupted payload
    // can't leave a required field (e.g. molecular.S0) undefined and crash
    // the render (exportMetadata calls .toFixed()/.toExponential() on them).
    if (s.mode === 'ionic' || s.mode === 'molecular') setMode(s.mode);
    if (s.salt) setSalt((prev) => ({ ...prev, ...s.salt }));
    if (s.molecular) setMolecular((prev) => ({ ...prev, ...s.molecular }));
    if (s.useCommon !== undefined) setUseCommon(s.useCommon);
    if (s.cCommon !== undefined) setCCommon(s.cCommon);
    if (s.pHPoint !== undefined) setPHPoint(s.pHPoint);
    if (s.ionicStrength !== undefined) setIonicStrength(s.ionicStrength);
    if (isValidGammaModel(s.gammaModel)) setGammaModel(s.gammaModel);
  });

  function reset() {
    setMode('ionic');
    setSalt(saltFromPreset(SALTS.find((s) => s.id === DEFAULT_SALT_ID)!));
    setMolecular(defaultMolecular());
    setUseCommon(false);
    setCCommon(0.01);
    setPHPoint(7);
    setIonicStrength(0);
    setGammaModel('dh');
  }

  const common = useCommon ? cCommon : 0;
  const edited = (patch: Partial<SaltState>) => setSalt({ ...salt, ...patch, reference: null });

  const saltDef = useMemo(() => ({
    id: 'custom', name: salt.label, formula: salt.label,
    pKsp: salt.pKsp, m: salt.m, x: salt.x,
    anionPKas: salt.anionPKas.length ? salt.anionPKas : undefined,
    anionLabel: salt.anionLabel, cationLabel: salt.cationLabel,
  }), [salt]);

  const exportMetadata = useMemo((): Record<string, string> => (
    mode === 'ionic'
      ? { Módulo: 'Solubilidad', Sal: salt.label, pKps: salt.pKsp.toFixed(2), 'I / M': ionicStrength.toFixed(3), 'Modelo γ': GAMMA_MODELS.find((m) => m.value === gammaModel)?.label ?? gammaModel }
      : {
          Módulo: 'Solubilidad', Sólido: molecular.name, 'S₀ / M': molecular.S0.toExponential(3),
          pKa: molecular.pKa.toFixed(2), Tipo: molecular.kind === 'acid' ? 'ácido' : 'base',
        }
  ), [mode, salt.label, salt.pKsp, ionicStrength, gammaModel, molecular.name, molecular.S0, molecular.pKa, molecular.kind, GAMMA_MODELS]);

  const traces = useMemo<Data[]>(() => {
    const phs: number[] = [];
    const logS: number[] = [];
    const logS0: number[] = [];
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      if (mode !== 'ionic') {
        logS.push(Math.log10(molecularSolubility(molecular, pH)));
        continue;
      }
      logS.push(Math.log10(solubility(saltDef, pH, common, ionicStrength, gammaModel)));
      if (common > 0) logS0.push(Math.log10(solubility(saltDef, pH, 0, ionicStrength, gammaModel)));
    }
    const data: Data[] = [{
      x: phs, y: logS, type: 'scatter', mode: 'lines',
      name: mode === 'ionic' && common > 0 ? t('solubilidad.logSWithCommonIon') : 'log s',
      line: { width: 3, color: '#0072B2' },
      hovertemplate: 'pH = %{x:.2f}<br>log s = %{y:.2f}<extra></extra>',
    }];
    if (mode === 'ionic' && common > 0) {
      data.push({
        x: phs, y: logS0, type: 'scatter', mode: 'lines',
        name: t('solubilidad.logSNoCommonIon'),
        line: { width: 2, color: '#999999', dash: 'dash' },
      });
    }
    return data;
  }, [mode, saltDef, common, ionicStrength, gammaModel, molecular, t]);

  const sAtPoint = mode === 'ionic'
    ? solubility(saltDef, pHPoint, common, ionicStrength, gammaModel)
    : molecularSolubility(molecular, pHPoint);
  const sInvalid = !Number.isFinite(sAtPoint) || sAtPoint <= 0;

  const pHMarker = useMemo<Partial<Shape>[]>(() => {
    if (sInvalid) return [];
    return [{
      type: 'line',
      x0: pHPoint, x1: pHPoint,
      y0: Math.log10(sAtPoint) - 2, y1: Math.log10(sAtPoint) + 2,
      line: { color: '#CC79A7', width: 2, dash: 'dashdot' },
    }];
  }, [pHPoint, sAtPoint, sInvalid]);

  return (
    <div className="module">
      <PanelShell
        title={mode === 'ionic' ? <>{t('solubilidad.titleIonicPrefix')}<sub>ps</sub>)</> : t('solubilidad.titleMolecular')}
        onReset={reset}
        moduleId="solubilidad"
      >
        <PanelSection title={t('acidoBase.systemSection')} icon="⚛">
          <div className="control">
            <div className="control-header">
              <span className="control-label">{t('solubilidad.solidModelLabel')}</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <Segmented
                options={[
                  { value: 'ionic', label: t('solubilidad.ionicSaltOption') },
                  { value: 'molecular', label: t('solubilidad.molecularAcidBaseOption') },
                ]}
                value={mode}
                onChange={(v) => setMode(v === 'molecular' ? 'molecular' : 'ionic')}
              />
            </div>
          </div>
          {mode === 'ionic' ? (
            <>
              <ModelBadge
                model={salt.anionPKas.length === 0 ? t('solubilidad.pHIndependentKspModel') : t('solubilidad.pHConditionedModel')}
                additions={[useCommon && t('solubilidad.additionCommonIon')]}
              />
              <LabelField label={t('solubilidad.saltLabel')} value={salt.label} onChange={(label) => setSalt({ ...salt, label })} />
              <Slider label={t('titulacion.pKspShort')} helpId="pKsp" value={salt.pKsp} min={2} max={40} step={0.01} onChange={(v) => edited({ pKsp: v })} />
              <NumberSegmented label={t('solubilidad.stoichiometryM')} value={salt.m} options={[1, 2, 3, 4]} onChange={(m) => edited({ m })} />
              <NumberSegmented label={t('solubilidad.stoichiometryX')} value={salt.x} options={[1, 2, 3, 4]} onChange={(x) => edited({ x })} />
              <p className="hint">M{salt.m > 1 ? toSub(salt.m) : ''}X{salt.x > 1 ? toSub(salt.x) : ''}{t('solubilidad.stoichiometryExampleHint')}</p>
              <p className="hint">{t('solubilidad.anionConjugateAcidHint')}</p>
              {salt.anionPKas.length > 0 ? (
                <ConstantList
                  prefix="pKa"
                  values={salt.anionPKas}
                  min={-2}
                  max={16}
                  maxItems={3}
                  onChange={(anionPKas) => edited({ anionPKas })}
                />
              ) : (
                <>
                  <button className="add-btn" onClick={() => edited({ anionPKas: [7] })}>
                    {t('solubilidad.anionIsBasicButton')}
                  </button>
                  <p className="hint">
                    {t('solubilidad.noPKaHint')}
                  </p>
                </>
              )}
              {salt.anionPKas.length > 0 && (
                <button className="add-btn" onClick={() => edited({ anionPKas: [] })}>
                  {t('solubilidad.strongAcidAnionButton')}
                </button>
              )}
              <DbPanel
                items={SALTS.map((s) => ({
                  id: s.id,
                  label: s.formula,
                  detail: `${s.name} · pKps ${s.pKsp}`,
                }))}
                onSelect={(id) => setSalt(saltFromPreset(SALTS.find((s) => s.id === id)!))}
              />
            </>
          ) : (
            <>
              <ModelBadge model={t('solubilidad.molecularSolidModel', { kind: molecular.kind === 'acid' ? t('solubilidad.acidKind') : t('solubilidad.baseKind') })} />
              <LabelField
                label={t('solubilidad.solidLabel')}
                value={molecular.name}
                onChange={(name) => setMolecular({ ...molecular, name, reference: null })}
              />
              <div className="control">
                <div className="control-header">
                  <span className="control-label">{t('solubilidad.typeLabel')}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Segmented
                    options={[
                      { value: 'acid', label: t('solubilidad.weakAcidOption') },
                      { value: 'base', label: t('solubilidad.weakBaseOption') },
                    ]}
                    value={molecular.kind}
                    onChange={(v) => setMolecular({ ...molecular, kind: v === 'base' ? 'base' : 'acid', reference: null })}
                  />
                </div>
              </div>
              <ConcSlider
                label={t('solubilidad.intrinsicSolubilityLabel')}
                value={molecular.S0}
                onChange={(S0) => setMolecular({ ...molecular, S0, reference: null })}
              />
              <Slider
                label={molecular.kind === 'acid' ? 'pKa' : t('sideReactionEditor.conjugateAcidPrefix')}
                helpId="pKa"
                value={molecular.pKa} min={0} max={14} step={0.01}
                onChange={(pKa) => setMolecular({ ...molecular, pKa, reference: null })}
                decimals={2}
              />
              <button className="add-btn" onClick={() => setMolecular(defaultMolecular())}>
                {t('solubilidad.loadBenzoicAcidButton')}
              </button>
            </>
          )}
        </PanelSection>
        <PanelSection title={t('acidoBase.conditionsSection')} icon="⚗">
          {mode === 'ionic' && (
            <>
              <Toggle label={t('solubilidad.commonIonToggle', { anion: salt.anionLabel })} checked={useCommon} onChange={setUseCommon} />
              {useCommon && (
                <ConcSlider label={t('solubilidad.commonIonConcLabel')} value={cCommon} onChange={setCCommon} min={-5} max={-0.5} />
              )}
            </>
          )}
          <Slider label={t('solubilidad.evaluateAtPHLabel')} value={pHPoint} min={0} max={14} step={0.1} onChange={setPHPoint} decimals={1} />
          {mode === 'ionic' && (
          <details className="section-collapse">
            <summary>{t('acidoBase.activityCorrection')}</summary>
            <Slider label={t('complejos.ionicStrengthLabel')} helpId="ionicStrength" value={ionicStrength} min={0} max={0.5} step={0.01} onChange={setIonicStrength} decimals={2} />
            <div style={{ marginTop: 6 }}>
              <Segmented
                options={GAMMA_MODELS}
                value={gammaModel}
                onChange={(v) => setGammaModel(isValidGammaModel(v) ? v : 'dh')}
              />
            </div>
            <p className="hint">{t('solubilidad.activityHint')}</p>
          </details>
          )}
        </PanelSection>
        <PanelSection title={t('complejos.resultSection')} icon="∑">
          <ResultCard items={mode === 'ionic' ? [
            {
              label: t('solubilidad.solubilityAtPH', { ph: pHPoint.toFixed(1) }),
              value: sInvalid ? t('solubilidad.noRootKsp') : formatMolar(sAtPoint),
            },
            { label: t('solubilidad.equilibriumLabel'), value: `${salt.m > 1 ? `${salt.m} ` : ''}${salt.cationLabel} + ${salt.x > 1 ? `${salt.x} ` : ''}${salt.anionLabel}` },
          ] : [
            {
              label: t('solubilidad.solubilityAtPH', { ph: pHPoint.toFixed(1) }),
              value: sInvalid ? '—' : formatMolar(sAtPoint),
            },
            { label: t('solubilidad.intrinsicSolubilityResultLabel'), value: formatMolar(molecular.S0) },
          ]} />
        </PanelSection>
        <InfoBox title={t('solubilidad.infoBoxTitle')}>
          {mode === 'ionic' ? (
            <p>
              {t('solubilidad.ionicMethodPara')}
            </p>
          ) : (
            <p>
              {t('solubilidad.molecularMethodPrefix')}
              <code>{t('solubilidad.molecularMethodCode1')}</code>{t('solubilidad.molecularMethodMid')}
              <code> {t('solubilidad.molecularMethodCode2')}</code>{t('solubilidad.molecularMethodSuffix')}
            </p>
          )}
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle="pH"
          yTitle={t('solubilidad.logSAxisLabel')}
          xRange={[0, 14]}
          shapes={pHMarker}
          exportName="equilibria-solubilidad"
          exportMetadata={exportMetadata}
        />
        <ResultCardRow items={mode === 'ionic' ? [
          {
            label: t('solubilidad.sAtPHLabel', { ph: pHPoint.toFixed(1) }),
            value: sInvalid ? '—' : formatMolar(sAtPoint),
            accent: true,
          },
          { label: t('titulacion.pKspShort'), value: salt.pKsp.toFixed(2), helpId: 'pKsp' },
          { label: t('solubilidad.equilibriumLabel'), value: `${salt.m > 1 ? `${salt.m} ` : ''}${salt.cationLabel} + ${salt.x > 1 ? `${salt.x} ` : ''}${salt.anionLabel}` },
        ] : [
          {
            label: t('solubilidad.sAtPHLabel', { ph: pHPoint.toFixed(1) }),
            value: sInvalid ? '—' : formatMolar(sAtPoint),
            accent: true,
          },
          { label: 'S₀', value: formatMolar(molecular.S0) },
          { label: 'pKa', value: molecular.pKa.toFixed(2) },
        ]} />
      </section>
    </div>
  );
}
