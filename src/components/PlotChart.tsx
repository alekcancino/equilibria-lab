import Plotly from 'plotly.js-basic-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import type { Layout } from 'plotly.js';
import type { ChartProps } from './Chart';

const factory = (createPlotlyComponent as unknown as { default?: typeof createPlotlyComponent }).default
  ?? createPlotlyComponent;
const Plot = factory(Plotly);

/** Render interno con Plotly — cargado bajo demanda desde Chart.tsx */
export default function PlotChart({
  data, xTitle, yTitle, xRange, yRange, shapes, annotations, showLegend = true,
  exportName = 'quimeq',
}: ChartProps) {
  const layout: Partial<Layout> = {
    autosize: true,
    margin: { l: 60, r: 20, t: 16, b: 48 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#ffffff',
    font: { family: 'Inter, system-ui, sans-serif', size: 13, color: '#2c3e50' },
    xaxis: {
      title: { text: xTitle, font: { size: 14 } },
      range: xRange,
      gridcolor: '#e8ecef',
      zerolinecolor: '#cbd5dc',
      linecolor: '#cbd5dc',
    },
    yaxis: {
      title: { text: yTitle, font: { size: 14 } },
      range: yRange,
      gridcolor: '#e8ecef',
      zerolinecolor: '#cbd5dc',
      linecolor: '#cbd5dc',
    },
    showlegend: showLegend,
    legend: { orientation: 'h', y: -0.18, font: { size: 12 } },
    hovermode: 'x unified',
    shapes,
    annotations,
  };

  return (
    <Plot
      data={data}
      layout={layout}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
      config={{
        displaylogo: false,
        responsive: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        toImageButtonOptions: { format: 'png', filename: exportName, scale: 2 },
      }}
    />
  );
}
