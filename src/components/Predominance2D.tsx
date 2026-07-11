import { useMemo } from 'react';
import { formatAxisLabel } from '../lib/format';
import { MARKER_COLOR } from '../lib/database';
import { speciesInGrid, type Grid2D } from '../lib/predominance2D';

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
}

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

// Soften the saturated Okabe-Ito palette toward white so filled regions read as
// the app's pastel language (like DUZP zones) while staying distinguishable.
function tint([r, g, b]: [number, number, number], toward = 0.42): [number, number, number] {
  return [
    Math.round(r + (255 - r) * toward),
    Math.round(g + (255 - g) * toward),
    Math.round(b + (255 - b) * toward),
  ];
}

/**
 * 2D predominance map (pM/pL–pH and pL–pX). The dominant-species field is
 * painted to an offscreen canvas at grid resolution and embedded as a single
 * pixelated <image> (no per-cell DOM nodes, no color interpolation across
 * boundaries); axes, legend and marker are SVG on top so text stays crisp.
 * Engine-agnostic: the caller supplies the grid, colors and labels.
 */
export default function Predominance2D({
  grid, colors, labels, xLabel, yLabel, marker, caption,
}: Predominance2DProps) {
  const { nx, ny, xRange, yRange } = grid;

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
          img.data[p] = 226; img.data[p + 1] = 232; img.data[p + 2] = 240; img.data[p + 3] = 90;
        } else {
          const [r, g, b] = tint(hexToRgb(colors[idx % colors.length]));
          img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL();
  }, [grid, nx, ny, colors]);

  const present = useMemo(() => speciesInGrid(grid), [grid]);

  const toPx = (x: number) => PAD_L + ((x - xRange[0]) / (xRange[1] - xRange[0])) * PLOT_W;
  const toPy = (y: number) => PLOT_BOTTOM - ((y - yRange[0]) / (yRange[1] - yRange[0])) * PLOT_H;

  const xTicks = [xRange[0], (xRange[0] + xRange[1]) / 2, xRange[1]];
  const yTicks = [yRange[0], (yRange[0] + yRange[1]) / 2, yRange[1]];

  const legendRows = Math.ceil(present.length / LEGEND_COLS);
  const H = LEGEND_TOP + legendRows * LEGEND_ROW_H + 8;

  const markerInside = marker
    && marker.x >= xRange[0] && marker.x <= xRange[1]
    && marker.y >= yRange[0] && marker.y <= yRange[1];

  return (
    <div className="predom2d">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
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
            <line x1={toPx(marker.x)} y1={PAD_T} x2={toPx(marker.x)} y2={PLOT_BOTTOM} stroke={MARKER_COLOR} strokeWidth={1.75} strokeDasharray="6 4" />
            <line x1={PAD_L} y1={toPy(marker.y)} x2={PAD_L + PLOT_W} y2={toPy(marker.y)} stroke={MARKER_COLOR} strokeWidth={1.75} strokeDasharray="6 4" />
            <circle cx={toPx(marker.x)} cy={toPy(marker.y)} r={5} fill={MARKER_COLOR} stroke="#fff" strokeWidth={1.5} />
            {marker.label && (
              <text x={Math.min(toPx(marker.x) + 8, W - 4)} y={Math.max(toPy(marker.y) - 8, PAD_T + 12)} fontSize={14} fontWeight={600} fill={MARKER_COLOR}>
                {marker.label}
              </text>
            )}
          </g>
        )}

        {/* Legend — only species present in the map */}
        {present.map((idx, k) => {
          const col = k % LEGEND_COLS;
          const row = Math.floor(k / LEGEND_COLS);
          const lx = PAD_L + col * (PLOT_W / LEGEND_COLS);
          const ly = LEGEND_TOP + row * LEGEND_ROW_H;
          const [r, g, b] = tint(hexToRgb(colors[idx % colors.length]));
          return (
            <g key={idx}>
              <rect x={lx} y={ly - 12} width={16} height={16} rx={3} fill={`rgb(${r},${g},${b})`} stroke={colors[idx % colors.length]} strokeWidth={1.25} />
              <text x={lx + 24} y={ly + 1} fontSize={15} fill="var(--text)">
                {labels[idx] ?? `Especie ${idx}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
