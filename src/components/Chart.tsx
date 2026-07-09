import { lazy, Suspense, useCallback, useRef } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import PlotToolbar from './PlotToolbar';
import { tracesToCSV, downloadCSV } from '../lib/export';

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
  /** File name when exporting PNG and CSV */
  exportName?: string;
  /** Module-specific parameters prepended as # comments in the CSV */
  exportMetadata?: Record<string, string>;
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
    const url = await Plotly.default.toImage(el, {
      format: 'png',
      width: Math.round(rect.width * 2),
      height: Math.round(rect.height * 2),
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportName}.png`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  const exportCsv = useCallback(() => {
    const meta: Record<string, string> = {
      ...props.exportMetadata,
      Fecha: new Date().toISOString().slice(0, 10),
    };
    const csv = tracesToCSV(props.data, props.xTitle, props.yTitle, meta);
    if (csv) downloadCSV(csv, exportName);
  }, [props.data, props.xTitle, props.yTitle, props.exportMetadata, exportName]);

  return (
    <div className="chart-shell">
      <div className="chart-plot">
        <Suspense fallback={<div className="chart-loading">Cargando gráfica…</div>}>
          <PlotChart {...props} onGraphDiv={onGraphDiv} />
        </Suspense>
        <PlotToolbar onResetZoom={resetZoom} onExport={exportPng} onExportCSV={exportCsv} />
      </div>
    </div>
  );
}
