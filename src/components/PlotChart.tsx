import { useMemo } from 'react';
import Plotly from 'plotly.js-basic-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
import type { Layout, PlotMouseEvent } from 'plotly.js';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../hooks/useTheme';
import { toDarkColors } from '../lib/plotTheme';
import type { ChartHoverPoint, ChartProps } from './Chart';

const factory = (createPlotlyComponent as unknown as { default?: typeof createPlotlyComponent }).default
  ?? createPlotlyComponent;
const Plot = factory(Plotly);

export interface PlotChartProps extends ChartProps {
  onGraphDiv?: (div: HTMLElement) => void;
  onHover?: (point: ChartHoverPoint | null) => void;
}

function plotToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * Pan/zoom bounds from the initial range: the user can zoom in freely but can
 * never drag the view outside the physical domain (pH 0–14, α 0–1, …).
 * A small margin keeps boundary markers visible.
 */
function axisBounds(range?: [number, number]): { minallowed?: number; maxallowed?: number } {
  if (!range) return {};
  const [a, b] = range;
  // A degenerate range (a === b) would otherwise clamp the axis to zero width.
  const pad = Math.max(Math.abs(b - a) * 0.05, 0.5);
  return { minallowed: Math.min(a, b) - pad, maxallowed: Math.max(a, b) + pad };
}

/** Internal renderer with Plotly — loaded on demand from Chart.tsx */
export default function PlotChart({
  data, xTitle, yTitle, xRange, yRange, shapes, annotations, showLegend = true,
  exportName = 'equilibria-lab',
  onGraphDiv,
  onHover,
}: PlotChartProps) {
  const mobile = useIsMobile();
  const theme = useTheme();
  const dark = theme === 'dark';

  // Modules build traces with the light palette; remap to validated dark twins.
  const themedData = useMemo(
    () => (dark ? toDarkColors(data)! : data),
    [dark, data],
  );
  const themedShapes = useMemo(
    () => (dark ? toDarkColors(shapes) : shapes),
    [dark, shapes],
  );
  const themedAnnotations = useMemo(
    () => (dark ? toDarkColors(annotations) : annotations),
    [dark, annotations],
  );

  const layout: Partial<Layout> = useMemo(() => {
    // CSS custom properties change with the theme — re-reading them is the whole
    // point of having `theme` in the dependency list.
    void theme;
    const fontFamily = plotToken('--font-ui', 'Inter, system-ui, sans-serif');
    const textColor = plotToken('--text', '#0F172A');
    const gridColor = plotToken('--plot-grid', '#E2E8F0');
    const axisColor = plotToken('--plot-axis', '#CBD5E1');
    const plotBg = plotToken('--plot-bg', '#ffffff');
    const fontSize = mobile
      ? parseInt(plotToken('--plot-font-size-mobile', '12'), 10)
      : parseInt(plotToken('--plot-font-size', '13'), 10);

    // Legend only when there is more than one data series (lead curve, "D" direction)
    const legendNeeded = showLegend && themedData.length > 1;

    return {
      autosize: true,
      margin: mobile
        ? { l: 46, r: 14, t: 10, b: legendNeeded ? 56 : 48 }
        : { l: 58, r: 18, t: 14, b: legendNeeded ? 56 : 50 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: plotBg,
      font: { family: fontFamily, size: fontSize, color: textColor },
      dragmode: mobile ? 'pan' : 'zoom',
      xaxis: {
        title: { text: xTitle, font: { size: fontSize + 2, family: fontFamily, color: textColor } },
        range: xRange,
        ...axisBounds(xRange),
        fixedrange: false,
        gridcolor: gridColor,
        zeroline: false,
        linecolor: axisColor,
        ticks: 'outside',
        tickcolor: gridColor,
        ticklen: 4,
        exponentformat: 'power',
      },
      yaxis: {
        title: { text: yTitle, font: { size: fontSize + 2, family: fontFamily, color: textColor } },
        range: yRange,
        ...axisBounds(yRange),
        fixedrange: false,
        gridcolor: gridColor,
        zeroline: false,
        linecolor: axisColor,
        ticks: 'outside',
        tickcolor: gridColor,
        ticklen: 4,
        exponentformat: 'power',
      },
      showlegend: legendNeeded,
      legend: {
        orientation: 'h',
        y: mobile ? -0.24 : -0.2,
        font: { size: fontSize, family: fontFamily },
      },
      hovermode: mobile ? 'closest' : 'x unified',
      shapes: themedShapes,
      annotations: themedAnnotations,
      // Stable across theme toggles so Plotly keeps the user's current zoom/pan
      // instead of snapping back to xRange/yRange on every re-render.
      uirevision: exportName,
    };
  }, [mobile, theme, xTitle, yTitle, xRange, yRange, showLegend, themedShapes, themedAnnotations, themedData.length, exportName]);

  const handleHover = (event: Readonly<PlotMouseEvent>) => {
    const point = event.points?.[0];
    if (!point || point.x === undefined || point.y === undefined) return;
    onHover?.({
      x: point.x as number | string,
      y: point.y as number | string,
      series: typeof point.data?.name === 'string' ? point.data.name : undefined,
    });
  };

  const handleUnhover = () => onHover?.(null);

  return (
    <Plot
      data={themedData}
      layout={layout}
      useResizeHandler
      style={{ width: '100%', height: '100%' }}
      onInitialized={(_figure, graphDiv) => onGraphDiv?.(graphDiv)}
      onUpdate={(_figure, graphDiv) => onGraphDiv?.(graphDiv)}
      onHover={handleHover}
      onUnhover={handleUnhover}
      config={{
        displayModeBar: false,
        displaylogo: false,
        responsive: true,
        // Wheel zoom off on desktop: an accidental scroll over the chart used to
        // distort it. Box-zoom, double-click reset, and the toolbar button remain;
        // touch pinch on mobile is unaffected.
        scrollZoom: mobile,
        doubleClick: 'reset',
        toImageButtonOptions: { format: 'png', filename: exportName, scale: 2 },
      }}
    />
  );
}
