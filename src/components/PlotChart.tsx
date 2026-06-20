import { useMemo } from 'react';
import Plotly from 'plotly.js-basic-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import type { Layout } from 'plotly.js';
import { useIsMobile } from '../hooks/useIsMobile';
import type { ChartProps } from './Chart';

const factory = (createPlotlyComponent as unknown as { default?: typeof createPlotlyComponent }).default
  ?? createPlotlyComponent;
const Plot = factory(Plotly);

export interface PlotChartProps extends ChartProps {
  onGraphDiv?: (div: HTMLElement) => void;
}

/** Render interno con Plotly — cargado bajo demanda desde Chart.tsx */
export default function PlotChart({
  data, xTitle, yTitle, xRange, yRange, shapes, annotations, showLegend = true,
  exportName = 'quimeq',
  onGraphDiv,
}: PlotChartProps) {
  const mobile = useIsMobile();

  const layout: Partial<Layout> = useMemo(() => ({
    autosize: true,
    margin: mobile
      ? { l: 44, r: 12, t: 8, b: 52 }
      : { l: 60, r: 20, t: 16, b: 48 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#ffffff',
    font: { family: 'Inter, system-ui, sans-serif', size: mobile ? 12 : 13, color: '#2c3e50' },
    dragmode: mobile ? 'pan' : 'zoom',
    xaxis: {
      title: { text: xTitle, font: { size: mobile ? 12 : 14 } },
      range: xRange,
      fixedrange: false,
      gridcolor: '#e8ecef',
      zerolinecolor: '#cbd5dc',
      linecolor: '#cbd5dc',
    },
    yaxis: {
      title: { text: yTitle, font: { size: mobile ? 12 : 14 } },
      range: yRange,
      fixedrange: false,
      gridcolor: '#e8ecef',
      zerolinecolor: '#cbd5dc',
      linecolor: '#cbd5dc',
    },
    showlegend: showLegend,
    legend: {
      orientation: 'h',
      y: mobile ? -0.22 : -0.18,
      font: { size: mobile ? 11 : 12 },
    },
    hovermode: mobile ? 'closest' : 'x unified',
    shapes,
    annotations,
  }), [mobile, xTitle, yTitle, xRange, yRange, showLegend, shapes, annotations]);

  return (
    <Plot
      data={data}
      layout={layout}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
      onInitialized={(_figure, graphDiv) => onGraphDiv?.(graphDiv)}
      onUpdate={(_figure, graphDiv) => onGraphDiv?.(graphDiv)}
      config={{
        displayModeBar: false,
        displaylogo: false,
        responsive: true,
        scrollZoom: true,
        doubleClick: 'reset',
        toImageButtonOptions: { format: 'png', filename: exportName, scale: 2 },
      }}
    />
  );
}
