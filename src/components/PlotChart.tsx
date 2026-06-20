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

function plotToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Render interno con Plotly — cargado bajo demanda desde Chart.tsx */
export default function PlotChart({
  data, xTitle, yTitle, xRange, yRange, shapes, annotations, showLegend = true,
  exportName = 'equilibria-lab',
  onGraphDiv,
}: PlotChartProps) {
  const mobile = useIsMobile();

  const layout: Partial<Layout> = useMemo(() => {
    const fontFamily = plotToken('--font-ui', 'Inter, system-ui, sans-serif');
    const textColor = plotToken('--text', '#0F172A');
    const gridColor = plotToken('--plot-grid', '#E2E8F0');
    const axisColor = plotToken('--plot-axis', '#CBD5E1');
    const plotBg = plotToken('--plot-bg', '#ffffff');
    const fontSize = mobile
      ? parseInt(plotToken('--plot-font-size-mobile', '12'), 10)
      : parseInt(plotToken('--plot-font-size', '13'), 10);

    return {
      autosize: true,
      margin: mobile
        ? { l: 44, r: 12, t: 8, b: 52 }
        : { l: 60, r: 20, t: 16, b: 48 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: plotBg,
      font: { family: fontFamily, size: fontSize, color: textColor },
      dragmode: mobile ? 'pan' : 'zoom',
      xaxis: {
        title: { text: xTitle, font: { size: fontSize + 1, family: fontFamily } },
        range: xRange,
        fixedrange: false,
        gridcolor: gridColor,
        zerolinecolor: axisColor,
        linecolor: axisColor,
      },
      yaxis: {
        title: { text: yTitle, font: { size: fontSize + 1, family: fontFamily } },
        range: yRange,
        fixedrange: false,
        gridcolor: gridColor,
        zerolinecolor: axisColor,
        linecolor: axisColor,
      },
      showlegend: showLegend,
      legend: {
        orientation: 'h',
        y: mobile ? -0.22 : -0.18,
        font: { size: fontSize, family: fontFamily },
      },
      hovermode: mobile ? 'closest' : 'x unified',
      shapes,
      annotations,
    };
  }, [mobile, xTitle, yTitle, xRange, yRange, showLegend, shapes, annotations]);

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
