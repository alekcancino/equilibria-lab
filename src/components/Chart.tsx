import { lazy, Suspense, useCallback, useRef, useState } from 'react';
import type { Data, Shape, Annotations } from 'plotly.js';
import PlotToolbar from './PlotToolbar';
import { dataUrlToBlob, downloadBlob, tracesToCSV, downloadCSV } from '../lib/export';
import { useT } from '../hooks/useT';

const PlotChart = lazy(() => import('./PlotChart'));

export interface ChartHoverPoint {
  x: number | string;
  y: number | string;
  series?: string;
}

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
  /** Show the persistent crosshair readout strip (default true). */
  showReadout?: boolean;
  /** Optional screen-reader summary; defaults to axes + series count. */
  accessibilitySummary?: string;
}

function formatReadoutValue(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const abs = Math.abs(value);
    if (abs >= 1000 || (abs > 0 && abs < 0.001)) return value.toExponential(3);
    return value.toFixed(abs >= 10 ? 2 : 3);
  }
  return String(value);
}

/** Interactive chart: initial autoscale, gesture zoom, no Plotly modebar. */
export default function Chart(props: ChartProps) {
  const t = useT();
  const { exportName = 'equilibria-lab', showReadout = true, accessibilitySummary } = props;
  const graphDivRef = useRef<HTMLElement | null>(null);
  const [hoverPoint, setHoverPoint] = useState<ChartHoverPoint | null>(null);
  const chartSummary = accessibilitySummary ?? t('chart.a11ySummary', {
    y: props.yTitle,
    x: props.xTitle,
    n: props.data.length,
  });

  const onGraphDiv = useCallback((div: HTMLElement) => {
    graphDivRef.current = div;
  }, []);

  const onHover = useCallback((point: ChartHoverPoint | null) => {
    setHoverPoint(point);
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
    downloadBlob(dataUrlToBlob(url), `${exportName}.png`);
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
      <div className="chart-toolbar-row">
        <PlotToolbar onResetZoom={resetZoom} onExportPng={exportPng} onExportCsv={exportCsv} />
      </div>
      <div className="chart-plot" role="img" aria-label={chartSummary}>
        <Suspense fallback={<div className="chart-loading">{t('chart.loading')}</div>}>
          <PlotChart {...props} onGraphDiv={onGraphDiv} onHover={onHover} />
        </Suspense>
      </div>
      {showReadout && (
        <p className="chart-readout" aria-live="polite" aria-atomic="true">
          {hoverPoint
            ? t('chart.readoutValue', {
              xLabel: props.xTitle,
              x: formatReadoutValue(hoverPoint.x),
              series: hoverPoint.series ?? props.yTitle,
              y: formatReadoutValue(hoverPoint.y),
            })
            : t('chart.readoutHint')}
        </p>
      )}
    </div>
  );
}
