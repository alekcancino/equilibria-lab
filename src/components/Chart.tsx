import { lazy, Suspense, useCallback, useRef } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import PlotToolbar from './PlotToolbar';

const PlotChart = lazy(() => import('./PlotChart'));

export interface ChartProps {
  data: Data[];
  xTitle: string;
  yTitle: string;
  xRange?: [number, number];
  yRange?: [number, number];
  shapes?: Partial<Shape>[];
  annotations?: Partial<Annotations>[];
  showLegend?: boolean;
  /** File name when exporting PNG */
  exportName?: string;
}

/** Interactive chart: initial autoscale, gesture zoom, no Plotly modebar. */
export default function Chart(props: ChartProps) {
  const { exportName = 'equilibria-lab' } = props;
  const graphDivRef = useRef<HTMLElement | null>(null);

  const onGraphDiv = useCallback((div: HTMLElement) => {
    graphDivRef.current = div;
  }, []);

  const exportPng = useCallback(async () => {
    const el = graphDivRef.current;
    if (!el) return;
    const Plotly = await import('plotly.js-basic-dist-min');
    const rect = el.getBoundingClientRect();
    await Plotly.default.downloadImage(el, {
      format: 'png',
      filename: exportName,
      width: Math.round(rect.width * 2),
      height: Math.round(rect.height * 2),
    });
  }, [exportName]);

  const resetZoom = useCallback(async () => {
    const el = graphDivRef.current;
    if (!el) return;
    const Plotly = await import('plotly.js-basic-dist-min');
    await Plotly.default.relayout(el, {
      'xaxis.autorange': true,
      'yaxis.autorange': true,
    });
  }, []);

  return (
    <div className="chart-shell">
      <div className="chart-plot">
        <Suspense fallback={<div className="chart-loading">Cargando gráfica…</div>}>
          <PlotChart {...props} onGraphDiv={onGraphDiv} />
        </Suspense>
        <PlotToolbar onResetZoom={resetZoom} onExport={exportPng} />
      </div>
    </div>
  );
}
