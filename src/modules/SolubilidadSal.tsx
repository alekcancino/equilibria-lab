import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import DiagramTabs from '../components/DiagramTabs';
import {
  ConstantList, InfoBox, LabelField, ModelBadge, NumberSegmented, PanelSection, ResultCard,
  ResultCardRow, Slider, Toggle,
} from '../components/Controls';
import { alphaFractions } from '../lib/equilibrium';
import { logActivityCoefficient } from '../lib/activity';
import { formatMolar } from '../lib/format';
import { useT } from '../hooks/useT';

// ── Database ───────────────────────────────────────────────────────────────────

interface Preset {
  id: string;
  name: string;
  anionName: string;
  pKsp: number;
  p: number;
  q: number;
  zM: number;
  pKas: number[];
  color: string;
}

// zM = charge of the cation; zX = p·zM/q (anion charge from electroneutrality)
const PRESETS: Preset[] = [
  { id: 'caco3',   name: 'CaCO₃',      anionName: 'CO₃²⁻',  pKsp: 8.48,  p: 1, q: 1, zM: 2, pKas: [6.35, 10.33],       color: '#0072B2' },
  { id: 'mgco3',   name: 'MgCO₃',      anionName: 'CO₃²⁻',  pKsp: 7.46,  p: 1, q: 1, zM: 2, pKas: [6.35, 10.33],       color: '#56B4E9' },
  { id: 'caf2',    name: 'CaF₂',       anionName: 'F⁻',     pKsp: 10.40, p: 1, q: 2, zM: 2, pKas: [3.17],               color: '#E69F00' },
  { id: 'ca3po4',  name: 'Ca₃(PO₄)₂', anionName: 'PO₄³⁻',  pKsp: 28.92, p: 3, q: 2, zM: 2, pKas: [2.15, 7.20, 12.35], color: '#009E73' },
  { id: 'mg3po4',  name: 'Mg₃(PO₄)₂', anionName: 'PO₄³⁻',  pKsp: 23.28, p: 3, q: 2, zM: 2, pKas: [2.15, 7.20, 12.35], color: '#CC79A7' },
  { id: 'ag3po4',  name: 'Ag₃PO₄',    anionName: 'PO₄³⁻',  pKsp: 17.55, p: 3, q: 1, zM: 1, pKas: [2.15, 7.20, 12.35], color: '#F0A500' },
  { id: 'ag2cro4', name: 'Ag₂CrO₄',   anionName: 'CrO₄²⁻', pKsp: 11.89, p: 2, q: 1, zM: 1, pKas: [6.51],               color: '#D55E00' },
  { id: 'baso4',   name: 'BaSO₄',      anionName: 'SO₄²⁻',  pKsp: 9.97,  p: 1, q: 1, zM: 2, pKas: [1.99],               color: '#888888' },
  { id: 'pbso4',   name: 'PbSO₄',      anionName: 'SO₄²⁻',  pKsp: 7.79,  p: 1, q: 1, zM: 2, pKas: [1.99],               color: '#555555' },
  { id: 'agcl',    name: 'AgCl',        anionName: 'Cl⁻',    pKsp: 9.74,  p: 1, q: 1, zM: 1, pKas: [],                   color: '#999999' },
];

// ── Editable state ─────────────────────────────────────────────────────────────

interface SalState {
  name: string;
  anionName: string;
  pKsp: number;
  p: number;
  q: number;
  zM: number;
  pKas: number[];
  color: string;
}

function fromPreset(id: string): SalState {
  const p = PRESETS.find((x) => x.id === id)!;
  return { name: p.name, anionName: p.anionName, pKsp: p.pKsp, p: p.p, q: p.q, zM: p.zM, pKas: [...p.pKas], color: p.color };
}

const DEFAULT1 = 'agcl';
const DEFAULT2 = 'ca3po4';

// ── Calculation functions ──────────────────────────────────────────────────────

function computeLogS(pH: number, s: SalState, I = 0): number {
  const h = Math.pow(10, -pH);
  // zX = p·zM/q (anion charge from electroneutrality M_p^zM X_q^zX)
  const zX = (s.p * s.zM) / s.q;
  // pKsp_app = pKsp + p·logγ(zM, I) + q·logγ(zX, I)
  const pKspApp = I > 0
    ? s.pKsp + s.p * logActivityCoefficient(s.zM, I) + s.q * logActivityCoefficient(zX, I)
    : s.pKsp;
  const Ksp = Math.pow(10, -pKspApp);
  const alphaN = s.pKas.length === 0
    ? 1
    : (() => { const a = alphaFractions(h, s.pKas); return a[a.length - 1]; })();
  if (alphaN <= 0) return -Infinity;
  const coeff = Math.pow(s.p, s.p) * Math.pow(s.q, s.q);
  const S = Math.pow(Ksp / (coeff * Math.pow(alphaN, s.q)), 1 / (s.p + s.q));
  return Math.log10(S);
}

function buildCurve(s: SalState, I = 0, points = 400) {
  const pHs: number[] = [], logS: number[] = [];
  for (let i = 0; i <= points; i++) {
    const pH = (14 * i) / points;
    const ls = computeLogS(pH, s, I);
    pHs.push(pH);
    logS.push(Number.isFinite(ls) ? Math.max(ls, -40) : -40);
  }
  return { pHs, logS };
}

function buildAlphaCurve(pKas: number[], points = 400) {
  const pHs: number[] = [];
  const alphaTraces: number[][] = Array.from({ length: pKas.length + 1 }, () => []);
  for (let i = 0; i <= points; i++) {
    const pH = (14 * i) / points;
    const h = Math.pow(10, -pH);
    const alphas = pKas.length === 0 ? [1] : alphaFractions(h, pKas);
    pHs.push(pH);
    alphas.forEach((a, j) => alphaTraces[j]?.push(a));
  }
  return { pHs, alphaTraces };
}

// ── Sub-editor ─────────────────────────────────────────────────────────────────

function SalEditor({ sal, onChange }: {
  sal: SalState;
  onChange: (patch: Partial<SalState>) => void;
}) {
  const t = useT();
  const activePreset = PRESETS.find(
    (p) => p.name === sal.name && p.pKsp === sal.pKsp && p.p === sal.p && p.q === sal.q && p.zM === sal.zM,
  );

  return (
    <>
      {/* Preset chips */}
      <div className="preset-chip-row" style={{ marginBottom: 8 }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className={`preset-chip${activePreset?.id === p.id ? ' active' : ''}`}
            style={{ borderColor: p.color }}
            onClick={() => onChange(fromPreset(p.id))}
          >
            {p.name}
          </button>
        ))}
      </div>

      <LabelField label={t('solubilidadSal.solidNameLabel')} value={sal.name} onChange={(name) => onChange({ name })} />
      <LabelField label={t('solubilidadSal.anionNameLabel')} value={sal.anionName} onChange={(anionName) => onChange({ anionName })} />
      <Slider label={t('titulacion.pKspShort')} helpId="pKsp" value={sal.pKsp} min={1} max={40} step={0.01} onChange={(pKsp) => onChange({ pKsp })} decimals={2} />

      <NumberSegmented label={t('solubilidadSal.stoichiometryP')} value={sal.p} options={[1, 2, 3]} onChange={(p) => onChange({ p })} />
      <NumberSegmented label={t('solubilidadSal.stoichiometryQ')} value={sal.q} options={[1, 2, 3]} onChange={(q) => onChange({ q })} />
      <NumberSegmented
        label={t('solubilidadSal.cationChargeLabel')}
        value={sal.zM}
        suffix="+"
        options={[1, 2, 3, 4]}
        onChange={(zM) => onChange({ zM })}
        hint={(
          <>
            {t('solubilidadSal.zMHintPrefix')}{((sal.p * sal.zM) / sal.q).toFixed(2)}
            {!Number.isInteger((sal.p * sal.zM) / sal.q) && t('solubilidadSal.zMHintNonInteger')}.
          </>
        )}
      />

      <ConstantList
        prefix={t('solubilidadSal.pKaAnionPrefix')}
        helpId="pKa"
        values={sal.pKas}
        onChange={(pKas) => onChange({ pKas })}
        min={0} max={14} maxItems={4} minItems={0} initialValue={7}
      />
      {sal.pKas.length > 0 && (
        <button className="mini-btn" style={{ marginTop: 2 }} onClick={() => onChange({ pKas: [] })}>
          {t('solubilidadSal.strongAcidAnionButton')}
        </button>
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const ALPHA_COLORS = ['#D55E00', '#E69F00', '#009E73', '#0072B2', '#CC79A7'];

export default function SolubilidadSal() {
  const t = useT();
  const [sal1, setSal1] = useState<SalState>(fromPreset(DEFAULT1));
  const [showP2, setShowP2] = useState(false);
  const [sal2, setSal2] = useState<SalState>(fromPreset(DEFAULT2));
  const [ionicStrength, setIonicStrength] = useState(0);

  useShareEffect('solsal', { sal1, showP2, sal2, ionicStrength }, (s) => {
    if (s.sal1) setSal1(s.sal1 as SalState);
    if (s.showP2 !== undefined) setShowP2(s.showP2 as boolean);
    if (s.sal2) setSal2(s.sal2 as SalState);
    if (s.ionicStrength !== undefined) setIonicStrength(s.ionicStrength as number);
  });

  function reset() {
    setSal1(fromPreset(DEFAULT1));
    setSal2(fromPreset(DEFAULT2));
    setShowP2(false);
    setIonicStrength(0);
  }

  const exportMetadata = useMemo(() => ({
    Módulo: 'Solubilidad con ácido-base',
    'Sal 1': sal1.name,
    'pKsp 1': sal1.pKsp.toFixed(2),
    ...(showP2 ? { 'Sal 2': sal2.name, 'pKsp 2': sal2.pKsp.toFixed(2) } : {}),
  }), [sal1.name, sal1.pKsp, showP2, sal2.name, sal2.pKsp]);

  const curve1 = useMemo(() => buildCurve(sal1, ionicStrength), [sal1, ionicStrength]);
  const curve2 = useMemo(() => (showP2 ? buildCurve(sal2, ionicStrength) : null), [sal2, showP2, ionicStrength]);
  const alphaCurve = useMemo(() => buildAlphaCurve(sal1.pKas), [sal1.pKas]);

  const yRange = useMemo<[number, number]>(() => {
    const all = [...curve1.logS, ...(curve2?.logS ?? [])].filter(Number.isFinite);
    return [Math.max(Math.floor(Math.min(...all)) - 0.5, -35), Math.min(Math.ceil(Math.max(...all)) + 0.5, 2)];
  }, [curve1, curve2]);

  const minS1 = useMemo(() => {
    const idx = curve1.logS.indexOf(Math.min(...curve1.logS));
    return { logS: curve1.logS[idx], pH: curve1.pHs[idx] };
  }, [curve1]);

  const solTraces = useMemo<Data[]>(() => {
    const out: Data[] = [{
      x: curve1.pHs, y: curve1.logS, type: 'scatter', mode: 'lines',
      name: sal1.name, line: { width: 3, color: sal1.color },
      hovertemplate: `pH=%{x:.2f}<br>log S=%{y:.2f}<extra>${sal1.name}</extra>`,
    }];
    if (curve2) out.push({
      x: curve2.pHs, y: curve2.logS, type: 'scatter', mode: 'lines',
      name: sal2.name, line: { width: 2.5, color: sal2.color, dash: 'dot' },
      hovertemplate: `pH=%{x:.2f}<br>log S=%{y:.2f}<extra>${sal2.name}</extra>`,
    });
    return out;
  }, [curve1, curve2, sal1, sal2]);

  const alphaTraces = useMemo<Data[]>(() => {
    const n = sal1.pKas.length + 1;
    const labels =
      n === 1 ? [sal1.anionName] :
      n === 2 ? [`H${sal1.anionName}`, sal1.anionName] :
      n === 3 ? [`H₂${sal1.anionName}`, `H${sal1.anionName}`, sal1.anionName] :
                [`H₃${sal1.anionName}`, `H₂${sal1.anionName}`, `H${sal1.anionName}`, sal1.anionName];
    return alphaCurve.alphaTraces.map((trace, i) => ({
      x: alphaCurve.pHs, y: trace, type: 'scatter', mode: 'lines',
      name: labels[i] ?? `α${i}`,
      line: { width: 2.5, color: ALPHA_COLORS[i % ALPHA_COLORS.length] },
      hovertemplate: `pH=%{x:.2f}<br>α=%{y:.3f}<extra>${labels[i] ?? `α${i}`}</extra>`,
    } as Data));
  }, [alphaCurve, sal1]);

  return (
    <div className="module">
      <PanelShell title={t('solubilidadSal.title')} onReset={reset} moduleId="solsal">
        <PanelSection title={t('solubilidadSal.system1Section')} icon="①">
        <ModelBadge
          model={sal1.pKas.length === 0 ? t('solubilidad.intrinsicSolubilityModel') : t('solubilidad.pHConditionedModel')}
          additions={[showP2 && t('solubilidadSal.additionSystemComparison')]}
        />
        <SalEditor sal={sal1} onChange={(p) => setSal1((s) => ({ ...s, ...p }))} />
        </PanelSection>

        <PanelSection title={t('solubilidadSal.system2Section')} icon="②">
        <Toggle label={t('solubilidadSal.compareSecondSystem')} checked={showP2} onChange={setShowP2} />
        {showP2 && (
          <div className="mask-section">
            <SalEditor sal={sal2} onChange={(p) => setSal2((s) => ({ ...s, ...p }))} />
          </div>
        )}
        </PanelSection>

        <PanelSection title={t('solubilidadSal.ionicStrengthSection')} icon="γ">
          <Slider
            label={t('complejos.ionicStrengthLabel')}
            helpId="ionicStrength"
            value={ionicStrength}
            min={0} max={0.5} step={0.01}
            onChange={setIonicStrength}
            decimals={2}
          />
        </PanelSection>

        <PanelSection title={t('complejos.resultSection')} icon="∑">
        <ResultCard items={[
          { label: t('solubilidadSal.minSDash', { name: sal1.name }), value: `log S = ${minS1.logS.toFixed(2)}  (pH ${minS1.pH.toFixed(1)})` },
          { label: t('solubilidadSal.formulaPQLabel'), value: `M_${sal1.p} A_${sal1.q}  →  S = (Kps / ${sal1.p ** sal1.p}·${sal1.q ** sal1.q}·αₙ^${sal1.q})^{1/${sal1.p + sal1.q}}` },
        ]} />
        </PanelSection>

        <InfoBox title={t('solubilidadSal.infoBoxTitle')}>
          <p>
            {t('solubilidadSal.formulaExplainPrefix')}<code>{t('solubilidadSal.formulaExplainCode')}</code>
          </p>
          <p>
            {t('solubilidadSal.para2')}
          </p>
        </InfoBox>
      </PanelShell>

      <section className="plot-area">
        <DiagramTabs tabs={[
          {
            id: 'logs',
            label: t('solubilidadSal.tabLogS'),
            node: (
              <Chart
                data={solTraces}
                xTitle="pH"
                yTitle={t('solubilidadSal.logSAxisLabel')}
                xRange={[0, 14]}
                yRange={yRange}
                exportName="equilibria-sol-sal"
                exportMetadata={exportMetadata}
              />
            ),
          },
          {
            id: 'alpha',
            label: t('solubilidadSal.alphaTabLabel', { anion: sal1.anionName }),
            node: sal1.pKas.length === 0 ? (
              <div className="empty-plot">
                <p>{t('solubilidadSal.strongAcidAnionText', { anion: sal1.anionName })}</p>
                <p className="hint">{t('solubilidadSal.alphaAlwaysOneHint')}</p>
              </div>
            ) : (
              <Chart
                data={alphaTraces}
                xTitle="pH"
                yTitle={t('solubilidadSal.molarFractionLabel')}
                xRange={[0, 14]}
                yRange={[0, 1]}
                exportName="equilibria-sol-sal-alpha"
                exportMetadata={exportMetadata}
              />
            ),
          },
        ]} />
        <ResultCardRow items={[
          { label: t('solubilidadSal.minSLabel', { name: sal1.name }), value: Number.isFinite(minS1.logS) ? formatMolar(Math.pow(10, minS1.logS)) : '—', accent: true },
          { label: t('solubilidadSal.logSMinLabel'), value: Number.isFinite(minS1.logS) ? minS1.logS.toFixed(2) : '—' },
          { label: t('solubilidadSal.pHOfMinSLabel'), value: Number.isFinite(minS1.pH) ? minS1.pH.toFixed(1) : '—' },
        ]} />
      </section>
    </div>
  );
}
