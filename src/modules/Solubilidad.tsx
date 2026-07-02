import { useMemo, useState } from 'react';
import { useShareEffect } from '../hooks/useShareableState';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import PanelShell from '../components/PanelShell';
import {
  ConcSlider, ConstantList, DbPanel, InfoBox, LabelField, ModelBadge, PanelSection, RefBadge,
  ResultCard, ResultCardRow, SelectControl, Slider, Toggle,
} from '../components/Controls';
import { SALTS, type SaltPreset } from '../lib/database';
import { formatMolar } from '../lib/format';
import { solubility } from '../lib/solubility';

const PH_POINTS = 300;

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
    reference: 'Harris, 9.ª ed.; Stumm & Morgan (1996)',
  };
}

const DEFAULT_SALT_ID = 'agcl';

/** Solubility of sparingly soluble salts: pH effect and common-ion effect. */
export default function Solubilidad() {
  const [salt, setSalt] = useState<SaltState>(saltFromPreset(SALTS.find((s) => s.id === DEFAULT_SALT_ID)!));
  const [useCommon, setUseCommon] = useState(false);
  const [cCommon, setCCommon] = useState(0.01);
  const [pHPoint, setPHPoint] = useState(7);
  const [ionicStrength, setIonicStrength] = useState(0);

  useShareEffect('solubilidad', { salt, useCommon, cCommon, pHPoint, ionicStrength }, (s) => {
    if (s.salt) setSalt(s.salt);
    if (s.useCommon !== undefined) setUseCommon(s.useCommon);
    if (s.cCommon !== undefined) setCCommon(s.cCommon);
    if (s.pHPoint !== undefined) setPHPoint(s.pHPoint);
    if (s.ionicStrength !== undefined) setIonicStrength(s.ionicStrength);
  });

  function reset() {
    setSalt(saltFromPreset(SALTS.find((s) => s.id === DEFAULT_SALT_ID)!));
    setUseCommon(false);
    setCCommon(0.01);
    setPHPoint(7);
    setIonicStrength(0);
  }

  const common = useCommon ? cCommon : 0;
  const edited = (patch: Partial<SaltState>) => setSalt({ ...salt, ...patch, reference: null });

  const saltDef = useMemo(() => ({
    id: 'custom', name: salt.label, formula: salt.label,
    pKsp: salt.pKsp, m: salt.m, x: salt.x,
    anionPKas: salt.anionPKas.length ? salt.anionPKas : undefined,
    anionLabel: salt.anionLabel, cationLabel: salt.cationLabel,
  }), [salt]);

  const exportMetadata = useMemo(() => ({
    Módulo: 'Solubilidad',
    Sal: salt.label,
    pKsp: salt.pKsp.toFixed(2),
    'I / M': ionicStrength.toFixed(3),
  }), [salt.label, salt.pKsp, ionicStrength]);

  const traces = useMemo<Data[]>(() => {
    const phs: number[] = [];
    const logS: number[] = [];
    const logS0: number[] = [];
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      logS.push(Math.log10(solubility(saltDef, pH, common, ionicStrength)));
      if (common > 0) logS0.push(Math.log10(solubility(saltDef, pH, 0, ionicStrength)));
    }
    const data: Data[] = [{
      x: phs, y: logS, type: 'scatter', mode: 'lines',
      name: common > 0 ? 'log s (con ion común)' : 'log s',
      line: { width: 3, color: '#0072B2' },
      hovertemplate: 'pH = %{x:.2f}<br>log s = %{y:.2f}<extra></extra>',
    }];
    if (common > 0) {
      data.push({
        x: phs, y: logS0, type: 'scatter', mode: 'lines',
        name: 'log s (sin ion común)',
        line: { width: 2, color: '#999999', dash: 'dash' },
      });
    }
    return data;
  }, [saltDef, common, ionicStrength]);

  const sAtPoint = solubility(saltDef, pHPoint, common, ionicStrength);
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
      <PanelShell title={<>Solubilidad (K<sub>ps</sub>)</>} onReset={reset}>
        <PanelSection title="Sistema" icon="⚛">
          <ModelBadge
            model={salt.anionPKas.length === 0 ? 'solubilidad intrínseca' : 'solubilidad condicionada por pH'}
            additions={[useCommon && 'ion común']}
          />
          <LabelField label="Sal (nombre libre)" value={salt.label} onChange={(label) => setSalt({ ...salt, label })} />
          <Slider label="pKsp" helpId="pKsp" value={salt.pKsp} min={2} max={40} step={0.01} onChange={(v) => edited({ pKsp: v })} />
          <SelectControl
            label="Estequiometría MmXx"
            value={`${salt.m},${salt.x}`}
            options={[
              { value: '1,1', label: 'MX (1:1) — AgCl, CaCO₃' },
              { value: '1,2', label: 'MX₂ (1:2) — CaF₂, PbI₂' },
              { value: '1,3', label: 'MX₃ (1:3) — Fe(OH)₃' },
            ]}
            onChange={(v) => {
              const [m, x] = v.split(',').map(Number);
              edited({ m, x });
            }}
          />
          <p className="hint">pKa del ácido conjugado del anión (vacío si el anión no es básico):</p>
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
                + El anión es básico (agregar pKa)
              </button>
              <p className="hint">
                Sin pKa: el anión no reacciona con H⁺ y el pH no cambia la solubilidad — la curva es horizontal. Agrega un pKa para ver el efecto del pH.
              </p>
            </>
          )}
          {salt.anionPKas.length > 0 && (
            <button className="add-btn" onClick={() => edited({ anionPKas: [] })}>
              Anión de ácido fuerte (quitar pKa)
            </button>
          )}
          <RefBadge reference={salt.reference ?? undefined} />
          <DbPanel
            items={SALTS.map((s) => ({
              id: s.id,
              label: s.formula,
              detail: `${s.name} · pKsp ${s.pKsp}`,
            }))}
            onSelect={(id) => setSalt(saltFromPreset(SALTS.find((s) => s.id === id)!))}
          />
        </PanelSection>
        <PanelSection title="Condiciones" icon="⚗">
          <Toggle label={`Ion común (${salt.anionLabel})`} checked={useCommon} onChange={setUseCommon} />
          {useCommon && (
            <ConcSlider label="Concentración del ion común" value={cCommon} onChange={setCCommon} min={-5} max={-0.5} />
          )}
          <Slider label="Evaluar en pH" value={pHPoint} min={0} max={14} step={0.1} onChange={setPHPoint} decimals={1} />
          <details className="section-collapse">
            <summary>Corrección por actividad (Debye–Hückel)</summary>
            <Slider label="Fuerza iónica I" helpId="ionicStrength" value={ionicStrength} min={0} max={0.5} step={0.01} onChange={setIonicStrength} decimals={2} />
            <p className="hint">I = 0 → γ = 1 (resultado termodinámico). A I &gt; 0 el pKsp aparente disminuye y la sal se vuelve más soluble.</p>
          </details>
        </PanelSection>
        <PanelSection title="Resultado" icon="∑">
          <ResultCard items={[
            {
              label: `Solubilidad a pH ${pHPoint.toFixed(1)}`,
              value: sInvalid ? 'Sin raíz en Ksp (revisar parámetros)' : formatMolar(sAtPoint),
            },
            { label: 'Equilibrio', value: `${salt.m} ${salt.cationLabel} + ${salt.x} ${salt.anionLabel}` },
          ]} />
        </PanelSection>
        <InfoBox title="Método de cálculo">
          <p>
            Kps condicional: la fracción α del anión libre corrige el equilibrio según el pH
            (si el anión es básico se protona en medio ácido y la sal se disuelve más). La
            solubilidad se resuelve por bisección sobre log s, con ion común incluido.
          </p>
        </InfoBox>
      </PanelShell>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle="pH"
          yTitle="log s (solubilidad molar)"
          xRange={[0, 14]}
          shapes={pHMarker}
          exportName="equilibria-solubilidad"
          exportMetadata={exportMetadata}
        />
        <ResultCardRow items={[
          {
            label: `s a pH ${pHPoint.toFixed(1)}`,
            value: sInvalid ? '—' : formatMolar(sAtPoint),
            accent: true,
          },
          { label: 'pKsp', value: salt.pKsp.toFixed(2) },
          { label: 'Equilibrio', value: `${salt.m} ${salt.cationLabel} + ${salt.x} ${salt.anionLabel}` },
        ]} />
      </section>
    </div>
  );
}
