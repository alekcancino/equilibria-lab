import Plotly from 'plotly.js-basic-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import type { Data, Layout, Shape, Annotations } from 'plotly.js';

// El factory es un módulo CJS: bajo Vite el export real puede venir en .default
const factory = (createPlotlyComponent as unknown as { default?: typeof createPlotlyComponent }).default
  ?? createPlotlyComponent;
const Plot = factory(Plotly);

interface ChartProps {
  data: Data[];
  xTitle: string;
  yTitle: string;
  xRange?: [number, number];
  yRange?: [number, number];
  shapes?: Partial<Shape>[];
  annotations?: Partial<Annotations>[];
  showLegend?: boolean;
  /** Nombre de archivo al exportar PNG (botón de cámara del modebar) */
  exportName?: string;
}

/** Gráfica interactiva con estilo unificado (zoom, pan y hover tipo GeoGebra). */
export default function Chart({
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
        // El botón de cámara exporta PNG a 2x para presentaciones
        toImageButtonOptions: { format: 'png', filename: exportName, scale: 2 },
      }}
    />
  );
}
