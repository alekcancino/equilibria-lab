import { useMemo, useState } from 'react';
import type { Data } from 'plotly.js';
import Chart from '../components/Chart';
import {
  ConcSlider, ConstantList, DbPanel, InfoBox, LabelField, RefBadge, ResultCard,
  SelectControl, Slider, Toggle,
} from '../components/Controls';
import { SALTS, type SaltPreset } from '../lib/database';
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

const DEFAULT_SALT_ID = 'caco3';

/** Solubilidad de sales poco solubles: efecto del pH y del ion común. */
export default function Solubilidad() {
  const [salt, setSalt] = useState<SaltState>(saltFromPreset(SALTS.find((s) => s.id === DEFAULT_SALT_ID)!));
  const [useCommon, setUseCommon] = useState(false);
  const [cCommon, setCCommon] = useState(0.01);
  const [pHPoint, setPHPoint] = useState(7);

  function reset() {
    setSalt(saltFromPreset(SALTS.find((s) => s.id === DEFAULT_SALT_ID)!));
    setUseCommon(false);
    setCCommon(0.01);
    setPHPoint(7);
  }

  const common = useCommon ? cCommon : 0;
  const edited = (patch: Partial<SaltState>) => setSalt({ ...salt, ...patch, reference: null });

  const saltDef = useMemo(() => ({
    id: 'custom', name: salt.label, formula: salt.label,
    pKsp: salt.pKsp, m: salt.m, x: salt.x,
    anionPKas: salt.anionPKas.length ? salt.anionPKas : undefined,
    anionLabel: salt.anionLabel, cationLabel: salt.cationLabel,
  }), [salt]);

  const traces = useMemo<Data[]>(() => {
    const phs: number[] = [];
    const logS: number[] = [];
    const logS0: number[] = [];
    for (let i = 0; i <= PH_POINTS; i++) {
      const pH = (14 * i) / PH_POINTS;
      phs.push(pH);
      logS.push(Math.log10(solubility(saltDef, pH, common)));
      if (common > 0) logS0.push(Math.log10(solubility(saltDef, pH, 0)));
    }
    const data: Data[] = [{
      x: phs, y: logS, type: 'scatter', mode: 'lines',
      name: common > 0 ? 'log s (con ion común)' : 'log s',
      line: { width: 3, color: '#CC79A7' },
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
  }, [saltDef, common]);

  const sAtPoint = solubility(saltDef, pHPoint, common);

  return (
    <div className="module">
      <aside className="panel">
        <div className="panel-header">
          <h2>Solubilidad (K<sub>ps</sub>)</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <div className="editor">
          <LabelField label="Sal (nombre libre)" value={salt.label} onChange={(label) => setSalt({ ...salt, label })} />
          <Slider label="pKps" value={salt.pKsp} min={2} max={40} step={0.01} onChange={(v) => edited({ pKsp: v })} />
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
            <button className="add-btn" onClick={() => edited({ anionPKas: [7] })}>
              + El anión es básico (agregar pKa)
            </button>
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
              detail: `${s.name} · pKps ${s.pKsp}`,
            }))}
            onSelect={(id) => setSalt(saltFromPreset(SALTS.find((s) => s.id === id)!))}
          />
        </div>
        <h3>Condiciones</h3>
        <Toggle label={`Ion común (${salt.anionLabel})`} checked={useCommon} onChange={setUseCommon} />
        {useCommon && (
          <ConcSlider label="Concentración del ion común" value={cCommon} onChange={setCCommon} min={-5} max={-0.5} />
        )}
        <Slider label="Evaluar en pH" value={pHPoint} min={0} max={14} step={0.1} onChange={setPHPoint} decimals={1} />
        <ResultCard items={[
          { label: `Solubilidad a pH ${pHPoint.toFixed(1)}`, value: `${sAtPoint.toExponential(2)} M` },
          { label: 'Equilibrio', value: `${salt.m} ${salt.cationLabel} + ${salt.x} ${salt.anionLabel}` },
        ]} />
        <InfoBox title="Método de cálculo">
          <p>
            Kps condicional: la fracción α del anión libre corrige el equilibrio según el pH
            (si el anión es básico se protona en medio ácido y la sal se disuelve más). La
            solubilidad se resuelve por bisección sobre log s, con ion común incluido.
          </p>
        </InfoBox>
      </aside>
      <section className="plot-area">
        <Chart
          data={traces}
          xTitle="pH"
          yTitle="log s (solubilidad molar)"
          xRange={[0, 14]}
          exportName="quimeq-solubilidad"
        />
      </section>
    </div>
  );
}
