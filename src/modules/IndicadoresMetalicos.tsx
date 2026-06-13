// Indicadores metalocrómicos — módulo para titulaciones complejométricas colorimétricas.
//
// Muestra para un metal M a un pH dado:
//   log K'(MY)  — del motor de constantes condicionales
//   log K'(MIn) — para cada indicador disponible
//   ΔlogK = log K'(MY) − log K'(MIn)  → determina la nitidez del punto final
//
// Criterio de Harris (QCA 9.ª ed.):
//   ΔlogK ≥ 5   → punto final nítido (✅ apto)
//   2 ≤ ΔlogK < 5 → usable (🟡 marginal)
//   ΔlogK < 2   → indicador demasiado fuerte, no se desplaza (⚠ bloqueado)
//   log K'(MIn) < 4 → complejo demasiado débil (⚠ no funciona)

import { useMemo, useState } from 'react';
import type { Data, Shape } from 'plotly.js';
import Chart from '../components/Chart';
import DiagramTabs from '../components/DiagramTabs';
import { Slider, DbPanel, InfoBox, ModelBadge, ResultCard } from '../components/Controls';
import { EDTA_PKAS } from '../lib/edta';
import { condLogKCurve, feasibilityWindow, alphaH, alphaOH } from '../lib/conditional';
import { METAL_INDICATORS, EDTA_METAL_PRESETS } from '../lib/indicatorDatabase';

// EDTA_METAL_PRESETS importado de indicatorDatabase (compartido con Titulacion.tsx)

// ── Colores paleta Okabe-Ito ─────────────────────────────────────────────────

const IND_COLORS = ['#0072B2', '#D55E00', '#009E73', '#CC79A7'];

const PH_POINTS = 500;

// ── Estado ────────────────────────────────────────────────────────────────────

function defaultState() {
  return {
    metalId: 'mg',
    logKf: 8.64,
    logBetasOH: [] as number[],
    metalLabel: 'Mg²⁺',
    pH: 10,
    threshold: 8,
  };
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function IndicadoresMetalicos() {
  const [st, setSt] = useState(defaultState);
  const set = <K extends keyof ReturnType<typeof defaultState>>(k: K, v: ReturnType<typeof defaultState>[K]) =>
    setSt((p) => ({ ...p, [k]: v }));

  function reset() { setSt(defaultState()); }

  function applyPreset(id: string) {
    const p = EDTA_METAL_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setSt((prev) => ({ ...prev, metalId: p.id, metalLabel: p.metal, logKf: p.logKf, logBetasOH: [...p.logBetasOH] }));
  }

  // ── Curva log K'(MY) = f(pH) ─────────────────────────────────────────────

  const curveMY = useMemo(() =>
    condLogKCurve(st.logKf, EDTA_PKAS, st.logBetasOH, [], 0, [1, 14], PH_POINTS),
    [st.logKf, st.logBetasOH],
  );

  const logKMY_pH = useMemo(() => {
    const idx = curveMY.pHs.findIndex((pH) => Math.abs(pH - st.pH) < 14 / PH_POINTS + 0.01);
    return idx >= 0 ? curveMY.logKs[idx] : curveMY.logKs[curveMY.logKs.length - 1];
  }, [curveMY, st.pH]);

  const feasWin = useMemo(() => feasibilityWindow(curveMY.pHs, curveMY.logKs, st.threshold), [curveMY, st.threshold]);

  // ── Indicadores disponibles para este metal ───────────────────────────────

  interface IndicatorResult {
    ind: typeof METAL_INDICATORS[0];
    logKMIn: number;
    logKprimeMIn: number;
    deltaLogK: number;
    badge: 'ok' | 'marginal' | 'blocked' | 'weak';
  }

  const availableIndicators = useMemo((): IndicatorResult[] =>
    METAL_INDICATORS
      .flatMap((ind) => {
        const entry = ind.metals.find((m) => m.metalId === st.metalId);
        if (!entry) return [];
        const logAlphaIn = Math.log10(alphaH(ind.pKas, st.pH));
        const logAlphaMOH = Math.log10(alphaOH(st.logBetasOH, st.pH));
        const logKprimeMIn = entry.logKMIn - logAlphaIn - logAlphaMOH;
        const deltaLogK = logKMY_pH - logKprimeMIn;
        const badge: 'ok' | 'marginal' | 'blocked' | 'weak' =
          logKprimeMIn < 4 ? 'weak'
          : deltaLogK < 2  ? 'blocked'
          : deltaLogK < 5  ? 'marginal'
          : 'ok';
        return [{ ind, logKMIn: entry.logKMIn, logKprimeMIn, deltaLogK, badge }];
      }),
    [st.metalId, st.logBetasOH, st.pH, logKMY_pH],
  );

  // ── Curvas log K'(MIn) = f(pH) ────────────────────────────────────────────

  const indicatorCurves = useMemo(() =>
    METAL_INDICATORS
      .map((ind) => {
        const entry = ind.metals.find((m) => m.metalId === st.metalId);
        if (!entry) return null;
        const pHs: number[] = [];
        const logKs: number[] = [];
        for (let i = 0; i <= PH_POINTS; i++) {
          const pH = 1 + 13 * i / PH_POINTS;
          const logAlphaIn = Math.log10(alphaH(ind.pKas, pH));
          const logAlphaMOH = Math.log10(alphaOH(st.logBetasOH, pH));
          pHs.push(pH);
          logKs.push(entry.logKMIn - logAlphaIn - logAlphaMOH);
        }
        return { ind, pHs, logKs };
      })
      .filter(Boolean) as { ind: typeof METAL_INDICATORS[0]; pHs: number[]; logKs: number[] }[],
    [st.metalId, st.logBetasOH],
  );

  // ── Trazas del diagrama ───────────────────────────────────────────────────

  const chartTraces = useMemo<Data[]>(() => {
    const traces: Data[] = [
      {
        x: curveMY.pHs, y: curveMY.logKs,
        type: 'scatter', mode: 'lines',
        name: `log K'(M-EDTA)`,
        line: { width: 3, color: '#2c3e50', dash: 'solid' },
        hovertemplate: `log K'(MY) = %{y:.2f}<extra>M-EDTA</extra>`,
      },
    ];
    indicatorCurves.forEach((c, i) => {
      traces.push({
        x: c.pHs, y: c.logKs,
        type: 'scatter', mode: 'lines',
        name: `log K'(M-${c.ind.abbrev})`,
        line: { width: 2.5, color: IND_COLORS[i % IND_COLORS.length] },
        hovertemplate: `log K'(M-${c.ind.abbrev}) = %{y:.2f}<extra>${c.ind.abbrev}</extra>`,
      });
    });
    return traces;
  }, [curveMY, indicatorCurves]);

  const yMin = useMemo(() => {
    const all = [...curveMY.logKs, ...indicatorCurves.flatMap((c) => c.logKs)];
    return Math.max(Math.floor(Math.min(...all)) - 1, -5);
  }, [curveMY, indicatorCurves]);
  const yMax = Math.ceil(st.logKf) + 3;

  const shapes = useMemo<Partial<Shape>[]>(() => {
    const out: Partial<Shape>[] = [
      {
        type: 'line', x0: 1, x1: 14, y0: st.threshold, y1: st.threshold,
        line: { color: 'rgba(230,126,34,0.85)', width: 2, dash: 'dash' },
      },
      {
        type: 'line', x0: st.pH, x1: st.pH, y0: yMin - 99, y1: yMax + 99,
        line: { color: '#CC79A7', width: 1.5, dash: 'dashdot' },
      },
    ];
    if (feasWin) {
      out.push({
        type: 'rect', x0: feasWin[0], x1: feasWin[1], y0: yMin - 99, y1: yMax + 99,
        fillcolor: 'rgba(41,128,185,0.08)', line: { width: 0 },
        // @ts-ignore
        layer: 'below',
      });
    }
    return out;
  }, [st.threshold, st.pH, feasWin, yMin, yMax]);

  const badgeLabel: Record<string, string> = { ok: '✅ Apto', marginal: '🟡 Marginal', blocked: '⚠ Bloqueado', weak: '✗ Débil' };
  const badgeCls: Record<string, string> = { ok: 'badge ok', marginal: 'badge warn', blocked: 'badge warn', weak: 'badge warn' };

  // ── DB items ──────────────────────────────────────────────────────────────

  const dbItems = EDTA_METAL_PRESETS.map((p) => ({
    id: p.id, label: p.metal,
    detail: `log Kf = ${p.logKf.toFixed(2)}`,
    group: p.group === 'M²⁺' ? 'Metales bivalentes' : 'Metales trivalentes',
  }));

  const diagrams = [
    {
      id: 'curves',
      label: "log K' = f(pH)",
      node: (
        <Chart
          data={chartTraces}
          xTitle="pH"
          yTitle="log K'"
          xRange={[1, 14]}
          yRange={[yMin, yMax]}
          shapes={shapes}
          exportName="quimeq-indicadores-curves"
        />
      ),
    },
  ];

  return (
    <div className="module">
      <aside className="panel">
        <div className="panel-header">
          <h2>Indicadores metalocrómicos</h2>
          <button className="reset-btn" onClick={reset}>↺ Restablecer</button>
        </div>
        <ModelBadge
          model="selección de indicador para titulación M–EDTA"
          additions={[st.logBetasOH.length > 0 && 'hidrólisis del metal']}
        />

        <DbPanel items={dbItems} onSelect={applyPreset} title="Presets M–EDTA" />

        <h3>Metal</h3>
        <p className="hint" style={{ marginBottom: 6 }}>{st.metalLabel}</p>
        <Slider label="log Kf (M–EDTA)" value={st.logKf} min={1} max={30} step={0.1} onChange={(v) => set('logKf', v)} decimals={2} />
        <Slider label="pH de trabajo" value={st.pH} min={1} max={14} step={0.1} onChange={(v) => set('pH', v)} decimals={1} />

        <h3>Parámetros</h3>
        <div className="control">
          <div className="control-header">
            <span className="control-label">Umbral log K'(MY)</span>
            <span className="control-value">{st.threshold}</span>
          </div>
          <div className="segmented" style={{ marginTop: 6 }}>
            {([6, 8, 10] as const).map((t) => (
              <button key={t} className={st.threshold === t ? 'seg-btn active' : 'seg-btn'} onClick={() => set('threshold', t)}>{t}</button>
            ))}
          </div>
        </div>

        <h3>Indicadores a pH {st.pH.toFixed(1)}</h3>
        {availableIndicators.length === 0 ? (
          <p className="hint">No hay datos de indicadores para este metal.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {availableIndicators.map(({ ind, logKprimeMIn, deltaLogK, badge }) => (
              <div key={ind.id} style={{ background: 'var(--bg-alt)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{ind.abbrev} — {ind.name}</span>
                  <span className={badgeCls[badge]} style={{ fontSize: 11 }}>{badgeLabel[badge]}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>log K'(MIn) = <strong style={{ color: 'var(--text)' }}>{logKprimeMIn.toFixed(1)}</strong></span>
                  <span>ΔlogK = <strong style={{ color: 'var(--text)' }}>{deltaLogK.toFixed(1)}</strong></span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <div style={{ width: 28, height: 14, borderRadius: 4, background: ind.colorFree, border: '1px solid #ccc' }} title="Color libre" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
                  <div style={{ width: 28, height: 14, borderRadius: 4, background: ind.colorMIn, border: '1px solid #ccc' }} title="Color M-In" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>pH {ind.pHRange[0]}–{ind.pHRange[1]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <ResultCard items={[
          { label: `log K'(M-EDTA) a pH ${st.pH.toFixed(1)}`, value: logKMY_pH.toFixed(1) },
          { label: 'Ventana de titulación EDTA', value: feasWin ? `pH ${feasWin[0].toFixed(1)}–${feasWin[1].toFixed(1)}` : 'No supera el umbral' },
          { label: 'Indicadores aptos', value: `${availableIndicators.filter((i) => i.badge === 'ok').length} / ${availableIndicators.length}` },
        ]} />

        <InfoBox title="Criterio de selección de indicadores">
          <p>
            El punto final es nítido cuando el EDTA desplaza completamente al indicador:
            <code> ΔlogK = log K'(MY) − log K'(MIn) ≥ 5</code>.
          </p>
          <p>
            <strong>Bloqueado</strong> (ΔlogK &lt; 2): el complejo MIn es tan estable que EDTA no
            lo desplaza → no hay viraje. Ejemplo: Cu²⁺ y EBT, Fe³⁺ y EBT.
          </p>
          <p>
            <strong>Débil</strong> (log K'(MIn) &lt; 4): el indicador no forma un complejo lo
            suficientemente estable → el color MIn no es definido.
          </p>
          <p>
            Las <strong>manchas de color</strong> muestran: izquierda = indicador libre · derecha = M-In.
          </p>
        </InfoBox>
      </aside>

      <section className="plot-area">
        <DiagramTabs tabs={diagrams} initialId="curves" />
      </section>
    </div>
  );
}
