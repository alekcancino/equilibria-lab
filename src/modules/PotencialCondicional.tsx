// Potencial condicional E°' = f(pH) — módulo ④ (QA II.3 + QA II.4).
// Muestra cómo el potencial formal cambia con el pH según la presencia de H⁺
// en la semirreacción. La pendiente es −0.05916·mH/n V/pH.
//
// Nuevas capacidades respecto al módulo Redox (que trabaja a pH fijo):
//   1. E°' = f(pH) como curva continua — cruce entre pares visible.
//   2. Cruce de pH: a qué pH se invierten las predicciones de espontaneidad.
//   3. Dismutación: la especie intermedia de un diagrama de Latimer es inestable
//      cuando E°'(derecho) > E°'(izquierdo).

import { useMemo, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import Chart from '../components/Chart';
import DiagramTabs from '../components/DiagramTabs';
import { InfoBox, ModelBadge, ResultCard, Slider, Toggle, ConstantList, LabelField } from '../components/Controls';
import { CoupleEditor } from '../components/Editors';
import { coupleFromPreset, type CoupleState } from '../lib/editorModels';
import { NERNST_S } from '../lib/redox';
import { SPECIES_COLORS } from '../lib/database';
import { alphaL } from '../lib/conditional';

const S = NERNST_S;     // 0.05916 V
const PH_POINTS = 400;

// ── Utilidades ────────────────────────────────────────────────────────────────

/** E°'(pH) para un par con mH protones en su semirreacción de n electrones. */
function Eprime(c: CoupleState, pH: number): number {
  return c.E0 - S * (c.mH / c.n) * pH;
}

/**
 * pH donde E°'₁ = E°'₂ (cruce de las dos rectas).
 * Devuelve null si las rectas son paralelas o el cruce queda fuera de [0, 14].
 */
function crossoverPH(c1: CoupleState, c2: CoupleState): number | null {
  const slope1 = -S * c1.mH / c1.n;
  const slope2 = -S * c2.mH / c2.n;
  const dSlope = slope2 - slope1;
  if (Math.abs(dSlope) < 1e-9) return null; // paralelas
  const pH = (c1.E0 - c2.E0) / dSlope;
  return pH >= 0 && pH <= 14 ? pH : null;
}

// ── Colores ───────────────────────────────────────────────────────────────────

const C1 = SPECIES_COLORS[0]; // naranja
const C2 = SPECIES_COLORS[1]; // azul
const C3 = SPECIES_COLORS[2]; // verde

// ── Estado ────────────────────────────────────────────────────────────────────

function defaultState() {
  return {
    couple1: coupleFromPreset('mno4'),
    couple2: coupleFromPreset('fe'),
    showCouple3: false,
    couple3: coupleFromPreset('cu1'),
    pH: 2,
    // E°' = f(pX): efecto del ligando X sobre el potencial de un par
    pxE0: 0.771,          // E° Fe³⁺/Fe²⁺ por defecto
    pxN: 1,
    pxOxLabel: 'Fe³⁺',
    pxRedLabel: 'Fe²⁺',
    pxLigandLabel: 'F⁻',
    pxLogBetasOx: [5.28, 9.30, 12.06],   // FeF²⁺, FeF₂⁺, FeF₃
    pxLogBetasRed: [1.0],                  // FeF⁺ (débil)
    showPX: false,
  };
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function PotencialCondicional() {
  const [st, setSt] = useState(defaultState);

  const set = <K extends keyof ReturnType<typeof defaultState>>(
    k: K, v: ReturnType<typeof defaultState>[K]
  ) => setSt((p) => ({ ...p, [k]: v }));

  function reset() { setSt(defaultState()); }

  // ── Curvas E°' = f(pH) ────────────────────────────────────────────────────

  const pHs = useMemo(() => Array.from({ length: PH_POINTS + 1 }, (_, i) => 14 * i / PH_POINTS), []);

  const E1s = useMemo(() => pHs.map((pH) => Eprime(st.couple1, pH)), [pHs, st.couple1]);
  const E2s = useMemo(() => pHs.map((pH) => Eprime(st.couple2, pH)), [pHs, st.couple2]);
  const E3s = useMemo(
    () => st.showCouple3 ? pHs.map((pH) => Eprime(st.couple3, pH)) : null,
    [pHs, st.couple3, st.showCouple3],
  );

  // ── Cruce ─────────────────────────────────────────────────────────────────

  const cross12 = useMemo(() => crossoverPH(st.couple1, st.couple2), [st.couple1, st.couple2]);
  const cross13 = useMemo(
    () => st.showCouple3 ? crossoverPH(st.couple1, st.couple3) : null,
    [st.couple1, st.couple3, st.showCouple3],
  );
  const cross23 = useMemo(
    () => st.showCouple3 ? crossoverPH(st.couple2, st.couple3) : null,
    [st.couple2, st.couple3, st.showCouple3],
  );

  // ── E°' en el cursor ──────────────────────────────────────────────────────

  const E1cur = Eprime(st.couple1, st.pH);
  const E2cur = Eprime(st.couple2, st.pH);
  const E3cur = st.showCouple3 ? Eprime(st.couple3, st.pH) : null;

  // ── Reacción espontánea ───────────────────────────────────────────────────

  const couples = [
    { c: st.couple1, E: E1cur },
    { c: st.couple2, E: E2cur },
    ...(st.showCouple3 && E3cur !== null ? [{ c: st.couple3, E: E3cur }] : []),
  ].sort((a, b) => b.E - a.E); // ordenados por E°' desc

  const strongest = couples[0]; // oxidante más fuerte (mayor E°')
  const weakest = couples[couples.length - 1]; // reductor más fuerte (menor E°')
  const pe1cur = E1cur / S;
  const pe2cur = E2cur / S;
  const logKcur = st.couple1.n * st.couple2.n * Math.abs(pe1cur - pe2cur);

  // ── Dismutación: par 1 (Ox/Int) y par 3 (Int/Red) en diagrama de Latimer ─

  const dismutationActive = st.showCouple3 && E3cur !== null && E3cur > E1cur;

  // ── Rango Y dinámico ──────────────────────────────────────────────────────

  const allE = [...E1s, ...E2s, ...(E3s ?? [])].filter(Number.isFinite);
  const eMin = Math.floor(Math.min(...allE) * 10) / 10 - 0.1;
  const eMax = Math.ceil(Math.max(...allE) * 10) / 10 + 0.1;

  // ── Shapes y anotaciones ──────────────────────────────────────────────────

  const logKShapes = useMemo<Partial<Shape>[]>(() => {
    const out: Partial<Shape>[] = [
      // cursor de pH
      {
        type: 'line', x0: st.pH, x1: st.pH, y0: eMin - 10, y1: eMax + 10,
        line: { color: '#CC79A7', width: 1.5, dash: 'dashdot' },
      },
    ];
    // línea vertical en el cruce 1–2
    if (cross12 !== null) {
      out.push({
        type: 'line', x0: cross12, x1: cross12, y0: eMin - 10, y1: Eprime(st.couple1, cross12) + 0.05,
        line: { color: '#aaaaaa', width: 1, dash: 'dot' },
      });
    }
    return out;
  }, [st.pH, cross12, eMin, eMax, st.couple1]);

  const logKAnnotations = useMemo<Partial<Annotations>[]>(() => {
    const out: Partial<Annotations>[] = [
      {
        x: st.pH, y: eMax + 0.05,
        text: `pH ${st.pH.toFixed(1)}`,
        showarrow: false, font: { size: 11, color: '#CC79A7' },
      },
    ];
    if (cross12 !== null) {
      out.push({
        x: cross12, y: Eprime(st.couple1, cross12),
        text: `×  pH ${cross12.toFixed(1)}`,
        showarrow: false,
        font: { size: 11, color: '#7f8c8d' },
        bgcolor: '#fff', borderpad: 3,
      });
    }
    return out;
  }, [st.pH, cross12, eMax, st.couple1]);

  // ── Trazas E°' = f(pH) ───────────────────────────────────────────────────

  const Eprimetraces = useMemo<Data[]>(() => {
    const t: Data[] = [
      {
        x: pHs, y: E1s, type: 'scatter', mode: 'lines',
        name: `E°' ${st.couple1.ox}/${st.couple1.red}`,
        line: { width: 3, color: C1 },
        hovertemplate: `E°' = %{y:.3f} V<extra>${st.couple1.ox}/${st.couple1.red}</extra>`,
      },
      {
        x: pHs, y: E2s, type: 'scatter', mode: 'lines',
        name: `E°' ${st.couple2.ox}/${st.couple2.red}`,
        line: { width: 3, color: C2 },
        hovertemplate: `E°' = %{y:.3f} V<extra>${st.couple2.ox}/${st.couple2.red}</extra>`,
      },
    ];
    if (E3s) {
      t.push({
        x: pHs, y: E3s, type: 'scatter', mode: 'lines',
        name: `E°' ${st.couple3.ox}/${st.couple3.red}`,
        line: { width: 2.5, color: C3, dash: 'dot' },
        hovertemplate: `E°' = %{y:.3f} V<extra>${st.couple3.ox}/${st.couple3.red}</extra>`,
      });
    }
    return t;
  }, [pHs, E1s, E2s, E3s, st.couple1, st.couple2, st.couple3]);

  // ── Escala condicional (visual, al cursor pH) ─────────────────────────────

  const escalaTraces = useMemo<Data[]>(() => {
    const cs = [
      { c: st.couple1, E: E1cur, color: C1, y: 1 },
      { c: st.couple2, E: E2cur, color: C2, y: 2 },
      ...(st.showCouple3 && E3cur !== null ? [{ c: st.couple3, E: E3cur, color: C3, y: 3 }] : []),
    ];
    return cs.map(({ c, E, color, y }) => ({
      x: [E / S], y: [y], type: 'scatter', mode: 'markers',
      name: `${c.ox}/${c.red}`,
      marker: { size: 16, color, symbol: 'line-ns', line: { width: 3, color } },
      hovertemplate: `pe°′ = ${(E/S).toFixed(2)} · E°′ = ${E.toFixed(3)} V<extra>${c.ox}/${c.red}</extra>`,
    }));
  }, [st.couple1, st.couple2, st.couple3, E1cur, E2cur, E3cur, st.showCouple3]);

  const escalaAnnotations = useMemo<Partial<Annotations>[]>(() => {
    const cs = [
      { c: st.couple1, E: E1cur, color: C1, y: 1 },
      { c: st.couple2, E: E2cur, color: C2, y: 2 },
      ...(st.showCouple3 && E3cur !== null ? [{ c: st.couple3, E: E3cur, color: C3, y: 3 }] : []),
    ];
    return cs.flatMap(({ c, E, color, y }) => [
      { x: E / S, y: y + 0.32, text: `<b>${c.ox}</b>`, showarrow: false, font: { size: 12, color } },
      { x: E / S, y: y - 0.32, text: `<b>${c.red}</b>`, showarrow: false, font: { size: 12, color } },
    ]);
  }, [st.couple1, st.couple2, st.couple3, E1cur, E2cur, E3cur, st.showCouple3]);

  const escalaN = st.showCouple3 ? 3 : 2;
  const escalaPeMin = Math.min(E1cur, E2cur, ...(E3cur !== null ? [E3cur] : [])) / S - 5;
  const escalaPeMax = Math.max(E1cur, E2cur, ...(E3cur !== null ? [E3cur] : [])) / S + 5;
  const escalaShapes = useMemo<Partial<Shape>[]>(
    () => Array.from({ length: escalaN }, (_, i) => ({
      type: 'line', x0: escalaPeMin, x1: escalaPeMax, y0: i + 1, y1: i + 1,
      line: { color: '#e8ecef', width: 1 },
    })),
    [escalaN, escalaPeMin, escalaPeMax],
  );

  // ── E°'=f(pX) ─────────────────────────────────────────────────────────────

  const PX_POINTS = 400;
  const pXs = useMemo(() => Array.from({ length: PX_POINTS + 1 }, (_, i) => 14 * i / PX_POINTS), []);

  const EpxCurve = useMemo(() => pXs.map((pX) => {
    const X = Math.pow(10, -pX);
    const aOx = alphaL(st.pxLogBetasOx, X);
    const aRed = alphaL(st.pxLogBetasRed, X);
    // E°' = E° + (S/n) · log(α_Red / α_Ox)
    return st.pxE0 + (S / st.pxN) * Math.log10(aRed / aOx);
  }), [pXs, st.pxE0, st.pxN, st.pxLogBetasOx, st.pxLogBetasRed]);

  const EpxMin = Math.min(...EpxCurve) - 0.1;
  const EpxMax = st.pxE0 + 0.05;

  const pxShapes = useMemo<Partial<import('plotly.js').Shape>[]>(() => [{
    type: 'line', x0: 0, x1: 14, y0: st.pxE0, y1: st.pxE0,
    line: { color: '#aaaaaa', width: 1.5, dash: 'dot' },
  }], [st.pxE0]);

  // ── Diagrams ──────────────────────────────────────────────────────────────

  const diagrams = useMemo(() => {
    const all = [
    {
      id: 'eprime',
      label: "E°' = f(pH)",
      node: (
        <Chart
          data={Eprimetraces}
          xTitle="pH"
          yTitle="E°' (V vs ENH)"
          xRange={[0, 14]}
          yRange={[eMin, eMax]}
          shapes={logKShapes}
          annotations={logKAnnotations}
          exportName="quimeq-eprime-ph"
        />
      ),
    },
    {
      id: 'epx',
      label: "E°'=f(pX)",
      node: (
        <Chart
          data={[{
            x: pXs, y: EpxCurve, type: 'scatter', mode: 'lines',
            name: `E°'(${st.pxOxLabel}/${st.pxRedLabel})`,
            line: { width: 3, color: C3 },
            hovertemplate: `E°' = %{y:.3f} V<extra>pX=%{x:.1f}</extra>`,
          }]}
          xTitle={`p[${st.pxLigandLabel}]`}
          yTitle="E°' (V vs ENH)"
          xRange={[0, 14]}
          yRange={[EpxMin, EpxMax]}
          shapes={pxShapes}
          annotations={[{
            x: 13, y: st.pxE0 + 0.02,
            text: `E° = ${st.pxE0.toFixed(3)} V`,
            showarrow: false, font: { size: 11, color: '#888' },
          }]}
          exportName="quimeq-eprime-px"
        />
      ),
    },
    {
      id: 'escala',
      label: `Escala (pH ${st.pH.toFixed(1)})`,
      node: (
        <Chart
          data={escalaTraces}
          xTitle="pe°′"
          yTitle=""
          xRange={[escalaPeMin, escalaPeMax]}
          yRange={[0.4, escalaN + 0.6]}
          shapes={escalaShapes}
          annotations={escalaAnnotations}
          showLegend={false}
          exportName="quimeq-escala-cond"
        />
      ),
    },
  ];
    return st.showPX ? all : all.filter((d) => d.id !== 'epx');
  }, [Eprimetraces, eMin, eMax, logKShapes, logKAnnotations, st.showPX, pXs, EpxCurve, st.pxOxLabel, st.pxRedLabel, st.pxLigandLabel, EpxMin, EpxMax, pxShapes, st.pxE0, escalaTraces, escalaPeMin, escalaPeMax, escalaShapes, escalaAnnotations, st.pH, escalaN]);

  return (
    <div className="module">
      <aside className="panel">
        <div className="panel-header">
          <h2>Potencial condicional</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <ModelBadge
          model="comparación E°′ = f(pH) entre dos pares"
          additions={[st.showCouple3 && 'Latimer y dismutación', st.showPX && 'efecto de ligando X']}
        />

        <CoupleEditor title="Par 1" couple={st.couple1} onChange={(c) => set('couple1', c)} />
        <CoupleEditor title="Par 2" couple={st.couple2} onChange={(c) => set('couple2', c)} />

        <h3>Condiciones</h3>
        <Slider
          label="pH del cursor"
          value={st.pH} min={0} max={14} step={0.1}
          onChange={(v) => set('pH', v)} decimals={1}
        />

        {/* 3.er par (diagrama de Latimer / dismutación) */}
        <Toggle
          label="Agregar 3.er par (Latimer / dismutación)"
          checked={st.showCouple3}
          onChange={(v) => set('showCouple3', v)}
        />
        {st.showCouple3 && (
          <div className="mask-section">
            <CoupleEditor
              title="Par 3 (intermedia → reducida)"
              couple={st.couple3}
              onChange={(c) => set('couple3', c)}
            />
            {dismutationActive ? (
              <div className="badge warn" style={{ marginBottom: 8 }}>
                ⚠ Dismutación activa a pH {st.pH.toFixed(1)}:
                E°'(par 3) = {E3cur!.toFixed(3)} V &gt; E°'(par 1) = {E1cur.toFixed(3)} V.
                La especie <strong>{st.couple1.red}</strong> es inestable y dismuta.
              </div>
            ) : (
              <div className="badge ok" style={{ marginBottom: 8 }}>
                Especie intermedia estable a pH {st.pH.toFixed(1)}:
                E°'(par 1) = {E1cur.toFixed(3)} V &gt; E°'(par 3) = {E3cur?.toFixed(3)} V.
              </div>
            )}
            {cross13 !== null && (
              <p className="hint">Cruce par 1–3: pH {cross13.toFixed(1)} (dismutación se invierte)</p>
            )}
            {cross23 !== null && (
              <p className="hint">Cruce par 2–3: pH {cross23.toFixed(1)}</p>
            )}
          </div>
        )}

        <ResultCard items={[
          { label: `E°'(${st.couple1.name}) a pH ${st.pH.toFixed(1)}`, value: `${E1cur.toFixed(3)} V  (pe°′ ${(E1cur/S).toFixed(1)})` },
          { label: `E°'(${st.couple2.name}) a pH ${st.pH.toFixed(1)}`, value: `${E2cur.toFixed(3)} V  (pe°′ ${(E2cur/S).toFixed(1)})` },
          { label: 'Cruce de pares 1–2', value: cross12 !== null ? `pH ${cross12.toFixed(2)}` : 'Paralelos (sin cruce)' },
          {
            label: 'Reacción espontánea',
            value: `${strongest.c.ox} + ${weakest.c.red} · log K' = ${logKcur.toFixed(1)}`,
          },
        ]} />

        {/* E°'=f(pX) */}
        <Toggle
          label="E°'=f(pX) — efecto de un ligando"
          checked={st.showPX}
          onChange={(v) => set('showPX', v)}
        />
        {st.showPX && (
          <div className="mask-section">
            <h3>Par redox con ligando X</h3>
            <LabelField label="Forma oxidada (Ox)" value={st.pxOxLabel} onChange={(v) => set('pxOxLabel', v)} />
            <LabelField label="Forma reducida (Red)" value={st.pxRedLabel} onChange={(v) => set('pxRedLabel', v)} />
            <LabelField label="Ligando X" value={st.pxLigandLabel} onChange={(v) => set('pxLigandLabel', v)} />
            <Slider label="E° del par (V)" value={st.pxE0} min={-1.5} max={2.5} step={0.01} onChange={(v) => set('pxE0', v)} decimals={3} />
            <div className="control">
              <div className="control-header">
                <span className="control-label">n (electrones)</span>
                <span className="control-value">{st.pxN}</span>
              </div>
              <div className="segmented" style={{ marginTop: 4 }}>
                {[1, 2, 3].map((n) => (
                  <button key={n} className={st.pxN === n ? 'seg-btn active' : 'seg-btn'} onClick={() => set('pxN', n)}>{n}</button>
                ))}
              </div>
            </div>
            <details className="section-collapse">
              <summary className="section-collapse-title">log β de Ox con X</summary>
              <ConstantList prefix="log β(Ox)" values={st.pxLogBetasOx} onChange={(v) => set('pxLogBetasOx', v)} min={0} max={35} maxItems={6} />
            </details>
            <details className="section-collapse">
              <summary className="section-collapse-title">log β de Red con X</summary>
              <ConstantList prefix="log β(Red)" values={st.pxLogBetasRed} onChange={(v) => set('pxLogBetasRed', v)} min={0} max={35} maxItems={6} />
            </details>
            <p className="hint">
              Preset: Fe³⁺/Fe²⁺ + F⁻ · E° = +0.771 V · log β(Fe³⁺) = [5.28, 9.30, 12.06] · log β(Fe²⁺) = [1.0]
            </p>
          </div>
        )}

        <InfoBox title="E°' = f(pH): efecto del protón">
          <p>
            Para el par <code>Ox + m H⁺ + n e⁻ ⇌ Red</code>, el potencial formal condicional es
            <code> E°' = E° − 0.05916·(m/n)·pH</code>. La pendiente es −59.16·m/n mV/pH.
          </p>
          <p>
            El <strong>cruce de dos rectas</strong> marca el pH donde la reacción cambia de
            dirección: por encima del cruce, el orden de oxidante/reductor se invierte. Este
            efecto es crucial en análisis volumétrico (el mismo oxidante puede ser selectivo a un
            pH y no a otro).
          </p>
          <p>
            <strong>Dismutación (diagrama de Latimer):</strong> si E°'(derecho) &gt; E°'(izquierdo),
            la especie intermedia es inestable y reacciona consigo misma (ej. Cu⁺ → Cu²⁺ + Cu⁰).
          </p>
        </InfoBox>
      </aside>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="eprime" />
      </section>
    </div>
  );
}
