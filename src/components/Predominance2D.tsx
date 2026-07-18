import { useCallback, useMemo, useRef } from 'react';
import { formatAxisLabel } from '../lib/format';
import { MARKER_COLOR } from '../lib/database';
import { speciesInGrid, type Grid2D } from '../lib/predominance2D';
import { useTheme } from '../hooks/useTheme';
import { toDarkColors } from '../lib/plotTheme';
import { downloadBlob, gridToCSV, downloadCSV } from '../lib/export';
import PlotToolbar from './PlotToolbar';

interface Predominance2DProps {
  grid: Grid2D;
  /** species index → fill color (cycled if the grid has more species than colors). */
  colors: string[];
  /** species index → display name. */
  labels: string[];
  xLabel: string;
  yLabel: string;
  /** Current read point (e.g. the equilibrium pL / pH the module already marks in 1D). */
  marker?: { x: number; y: number; label?: string };
  caption?: string;
  /** File name (no extension) when exporting PNG and CSV. */
  exportName?: string;
  /** Module-specific parameters prepended as # comments in the CSV. */
  exportMetadata?: Record<string, string>;
  /**
   * Reference curve drawn on top of the field without being part of the
   * dominant-species grid — e.g. a second system's own boundary line, for
   * visual comparison against this one (Sillén map's M1/M2 separation
   * window). Points outside the plot's x/y range are simply not drawn.
   */
  overlayCurve?: { points: { x: number; y: number }[]; color: string; label: string };
}

/**
 * CSS custom properties this component's SVG text/strokes reference by
 * literal `var(--x)` token in a presentation attribute. A standalone
 * serialized SVG (for PNG export) has no cascade to resolve these against, so
 * export replaces each token with its live computed value beforehand — a
 * plain string substitution is enough since this is the exact finite set of
 * var() usages in the JSX below (see the `fill`/`stroke` attributes).
 */
const CSS_VAR_TOKENS = ['--text-muted', '--text', '--plot-axis'] as const;

// Logical canvas (viewBox); the SVG scales to 100% of its container.
const W = 760;
const PAD_L = 72;
const PAD_R = 24;
const PAD_T = 44;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = 470;
const PLOT_BOTTOM = PAD_T + PLOT_H;
const LEGEND_TOP = PLOT_BOTTOM + 62;
const LEGEND_ROW_H = 30;
const LEGEND_COLS = 2;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Soften the saturated Okabe-Ito palette toward a mix target so filled regions
// read as the app's pastel language (like the predominance diagram's zones) while staying
// distinguishable. In light mode that target is white (the card surface); in
// dark mode it's the same neutral charcoal used for Plotly's plot-bg
// (#141416 — Instagram-style dark, no blue/navy tint), so filled regions sit
// in the same "surface family" as the app's line charts instead of reading
// as washed-out light patches, or a stray navy cast, on a neutral dark card.
const MIX_LIGHT: [number, number, number] = [255, 255, 255];
const MIX_DARK: [number, number, number] = [24, 24, 26];

function tint([r, g, b]: [number, number, number], mix: [number, number, number], toward = 0.42): [number, number, number] {
  return [
    Math.round(r + (mix[0] - r) * toward),
    Math.round(g + (mix[1] - g) * toward),
    Math.round(b + (mix[2] - b) * toward),
  ];
}

// "No physical solution" cell fill — a faint neutral, remapped to the same
// neutral-gray structural tone used elsewhere (plotTheme's --plot-grid #2A2A2D).
const NO_SOLUTION_LIGHT: [number, number, number, number] = [226, 232, 240, 90];
const NO_SOLUTION_DARK: [number, number, number, number] = [42, 42, 45, 110];

/**
 * 2D predominance map (pM/pL–pH and pL–pX). The dominant-species field is
 * painted to an offscreen canvas at grid resolution and embedded as a single
 * pixelated <image> (no per-cell DOM nodes, no color interpolation across
 * boundaries); axes, legend and marker are SVG on top so text stays crisp.
 * Engine-agnostic: the caller supplies the grid, colors and labels.
 */
export default function Predominance2D({
  grid, colors, labels, xLabel, yLabel, marker, caption,
  exportName = 'equilibria-mapa2d', exportMetadata, overlayCurve,
}: Predominance2DProps) {
  const { nx, ny, xRange, yRange } = grid;
  const isDark = useTheme() === 'dark';
  const svgRef = useRef<SVGSVGElement>(null);

  // Remap once per theme change rather than re-deriving per pixel/legend row.
  const effColors = useMemo(
    () => (isDark ? toDarkColors(colors) ?? colors : colors),
    [colors, isDark],
  );
  const markerColor = useMemo(
    () => (isDark ? (toDarkColors([MARKER_COLOR]) ?? [MARKER_COLOR])[0] : MARKER_COLOR),
    [isDark],
  );
  const mixTarget = isDark ? MIX_DARK : MIX_LIGHT;
  const noSolution = isDark ? NO_SOLUTION_DARK : NO_SOLUTION_LIGHT;

  const dataUrl = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = nx;
    canvas.height = ny;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const img = ctx.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) {
      // flip vertically so yRange[0] (grid row 0) sits at the BOTTOM of the image.
      const cy = ny - 1 - j;
      for (let i = 0; i < nx; i++) {
        const idx = grid.dominant[j][i];
        const p = (cy * nx + i) * 4;
        if (idx < 0) {
          [img.data[p], img.data[p + 1], img.data[p + 2], img.data[p + 3]] = noSolution;
        } else {
          const [r, g, b] = tint(hexToRgb(effColors[idx % effColors.length]), mixTarget);
          img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }, [grid, nx, ny, effColors, mixTarget, noSolution]);

  const present = useMemo(() => speciesInGrid(grid), [grid]);

  const toPx = (x: number) => PAD_L + ((x - xRange[0]) / (xRange[1] - xRange[0])) * PLOT_W;
  const toPy = (y: number) => PLOT_BOTTOM - ((y - yRange[0]) / (yRange[1] - yRange[0])) * PLOT_H;

  const xTicks = [xRange[0], (xRange[0] + xRange[1]) / 2, xRange[1]];
  const yTicks = [yRange[0], (yRange[0] + yRange[1]) / 2, yRange[1]];

  const legendRows = Math.ceil(present.length / LEGEND_COLS);
  const overlayLegendY = LEGEND_TOP + legendRows * LEGEND_ROW_H;
  const H = overlayLegendY + (overlayCurve ? LEGEND_ROW_H : 0) + 8;

  const markerInside = marker
    && marker.x >= xRange[0] && marker.x <= xRange[1]
    && marker.y >= yRange[0] && marker.y <= yRange[1];

  // Clip to the visible plot range — an out-of-range boundary (e.g. M2 never
  // saturates in this window) simply draws nothing instead of a bogus line.
  const overlayPolyline = overlayCurve
    ? overlayCurve.points
      .filter((p) => p.x >= xRange[0] && p.x <= xRange[1] && p.y >= yRange[0] && p.y <= yRange[1])
      .map((p) => `${toPx(p.x)},${toPy(p.y)}`)
      .join(' ')
    : '';

  const exportCsv = useCallback(() => {
    const meta: Record<string, string> = {
      ...exportMetadata,
      Fecha: new Date().toISOString().slice(0, 10),
    };
    const csv = gridToCSV(grid, labels, xLabel, yLabel, meta);
    if (csv) downloadCSV(csv, exportName);
  }, [grid, labels, xLabel, yLabel, exportMetadata, exportName]);

  const exportPng = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const root = getComputedStyle(document.documentElement);
    let markup = new XMLSerializer().serializeToString(svg);
    for (const token of CSS_VAR_TOKENS) {
      markup = markup.replaceAll(`var(${token})`, root.getPropertyValue(token).trim());
    }
    const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('svg image load failed'));
        img.src = svgUrl;
      });
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Opaque background: the SVG itself has none, and a transparent PNG
      // would show black in viewers that don't composite alpha over white.
      ctx.fillStyle = isDark ? '#1E293B' : '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('canvas export failed')), 'image/png');
      });
      downloadBlob(png, `${exportName}.png`);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }, [exportName, isDark, H]);

  return (
    <div className="predom2d">
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
        {caption && (
          <text x={W / 2} y={26} textAnchor="middle" fontSize={17} fill="var(--text-muted)">
            {caption}
          </text>
        )}

        {/* Dominant-species field */}
        <image
          href={dataUrl}
          x={PAD_L}
          y={PAD_T}
          width={PLOT_W}
          height={PLOT_H}
          preserveAspectRatio="none"
          style={{ imageRendering: 'pixelated' }}
        />
        <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} fill="none" stroke="var(--plot-axis)" strokeWidth={1.5} />

        {/* Axis ticks */}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={toPx(t)} y={PLOT_BOTTOM + 22} textAnchor="middle" fontSize={15} fill="var(--text-muted)">
            {formatAxisLabel(t)}
          </text>
        ))}
        {yTicks.map((t) => (
          <text key={`y${t}`} x={PAD_L - 10} y={toPy(t) + 5} textAnchor="end" fontSize={15} fill="var(--text-muted)">
            {formatAxisLabel(t)}
          </text>
        ))}

        {/* Axis titles */}
        <text x={PAD_L + PLOT_W / 2} y={PLOT_BOTTOM + 46} textAnchor="middle" fontSize={17} fontWeight={600} fill="var(--text)">
          {xLabel}
        </text>
        <text
          x={22}
          y={PAD_T + PLOT_H / 2}
          textAnchor="middle"
          fontSize={17}
          fontWeight={600}
          fill="var(--text)"
          transform={`rotate(-90 22 ${PAD_T + PLOT_H / 2})`}
        >
          {yLabel}
        </text>

        {/* Read-point crosshair */}
        {markerInside && marker && (
          <g>
            <line x1={toPx(marker.x)} y1={PAD_T} x2={toPx(marker.x)} y2={PLOT_BOTTOM} stroke={markerColor} strokeWidth={1.75} strokeDasharray="6 4" />
            <line x1={PAD_L} y1={toPy(marker.y)} x2={PAD_L + PLOT_W} y2={toPy(marker.y)} stroke={markerColor} strokeWidth={1.75} strokeDasharray="6 4" />
            <circle cx={toPx(marker.x)} cy={toPy(marker.y)} r={5} fill={markerColor} stroke="#fff" strokeWidth={1.5} />
            {marker.label && (
              <text x={Math.min(toPx(marker.x) + 8, W - 4)} y={Math.max(toPy(marker.y) - 8, PAD_T + 12)} fontSize={14} fontWeight={600} fill={markerColor}>
                {marker.label}
              </text>
            )}
          </g>
        )}

        {/* Reference curve (e.g. a second system's own boundary, for comparison) */}
        {overlayPolyline && (
          <polyline points={overlayPolyline} fill="none" stroke={overlayCurve!.color} strokeWidth={2} strokeDasharray="7 4" />
        )}

        {/* Legend — only species present in the map */}
        {present.map((idx, k) => {
          const col = k % LEGEND_COLS;
          const row = Math.floor(k / LEGEND_COLS);
          const lx = PAD_L + col * (PLOT_W / LEGEND_COLS);
          const ly = LEGEND_TOP + row * LEGEND_ROW_H;
          const [r, g, b] = tint(hexToRgb(effColors[idx % effColors.length]), mixTarget);
          return (
            <g key={idx}>
              <rect x={lx} y={ly - 12} width={16} height={16} rx={3} fill={`rgb(${r},${g},${b})`} stroke={effColors[idx % effColors.length]} strokeWidth={1.25} />
              <text x={lx + 24} y={ly + 1} fontSize={15} fill="var(--text)">
                {labels[idx] ?? `Especie ${idx}`}
              </text>
            </g>
          );
        })}

        {/* Overlay legend row — a line swatch, not a filled region */}
        {overlayCurve && (
          <g>
            <line x1={PAD_L} y1={overlayLegendY - 4} x2={PAD_L + 20} y2={overlayLegendY - 4} stroke={overlayCurve.color} strokeWidth={2} strokeDasharray="5 3" />
            <text x={PAD_L + 28} y={overlayLegendY + 1} fontSize={15} fill="var(--text)">
              {overlayCurve.label}
            </text>
          </g>
        )}
      </svg>
      <PlotToolbar onExportPng={exportPng} onExportCsv={exportCsv} />
    </div>
  );
}
