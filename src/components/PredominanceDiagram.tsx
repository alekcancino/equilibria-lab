import type { Zone } from '../lib/ladder';
import { formatAxisLabel } from '../lib/format';
import { MARKER_COLOR } from '../lib/database';
import { useT } from '../hooks/useT';

interface PredominanceDiagramProps {
  zones: Zone[];
  pMin: number;
  pMax: number;
  /** Axis label: "pH", "pL", "pe", … */
  pLabel: string;
  /** Optional marker (e.g. pH of the real solution) */
  marker?: { p: number; label?: string };
  /** Optional subtitle above the bar */
  caption?: string;
}

// Logical canvas (viewBox); the SVG scales to 100% of the container.
const W = 1000;
const H = 240;
const BAND_TOP = 70;
const BAND_H = 96;
const BAND_BOTTOM = BAND_TOP + BAND_H;

/**
 * Predominance zone diagram: horizontal bar over the p scale with each
 * dominant species coloured and boundaries (pKa / log Kᵢ / pe°′) labelled
 * with their value. Sharp, exportable SVG.
 */
export default function PredominanceDiagram({ zones, pMin, pMax, pLabel, marker, caption }: PredominanceDiagramProps) {
  const t = useT();
  const x = (p: number) => ((p - pMin) / (pMax - pMin)) * W;

  return (
    <div className="predominance-diagram">
      <span className="predominance-scroll-hint"><span>{t('diagram.scrollHint')}</span></span>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
        {caption && (
          <text x={W / 2} y={34} textAnchor="middle" fontSize={20} fill="var(--text-muted)">
            {caption}
          </text>
        )}

        {/* Zonas */}
        {zones.map((z, i) => {
          const x0 = x(z.pStart);
          const x1 = x(z.pEnd);
          const w = x1 - x0;
          const cx = (x0 + x1) / 2;
          const fontSize = Math.min(20, Math.max(11, w / 5.5));
          const showLabel = w > 24;
          return (
            <g key={i}>
              <rect
                x={x0}
                y={BAND_TOP}
                width={w}
                height={BAND_H}
                fill={z.color}
                fillOpacity={0.16}
                stroke={z.color}
                strokeWidth={2}
              />
              {showLabel && (
                <text
                  x={cx}
                  y={BAND_TOP + BAND_H / 2 + fontSize * 0.35}
                  textAnchor="middle"
                  fontSize={fontSize}
                  fontWeight={600}
                  fill={z.color}
                >
                  {w < 60 && z.label.length > 8 ? z.label.replace(/(\d+)/g, ' $1').trim().slice(0, 6) : z.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Fronteras internas con su valor p */}
        {zones.slice(1).map((z, i) => {
          const px = x(z.pStart);
          return (
            <g key={`b${i}`}>
              <line x1={px} y1={BAND_TOP - 8} x2={px} y2={BAND_BOTTOM + 8} stroke="var(--text)" strokeWidth={1.5} />
              <text x={px} y={BAND_BOTTOM + 30} textAnchor="middle" fontSize={18} fill="var(--text)">
                {formatAxisLabel(z.pStart)}
              </text>
            </g>
          );
        })}

        {/* Marca del sistema (ej. pH real) */}
        {marker && marker.p >= pMin && marker.p <= pMax && (
          <g>
            <line
              x1={x(marker.p)}
              y1={BAND_TOP - 26}
              x2={x(marker.p)}
              y2={BAND_BOTTOM}
              stroke={MARKER_COLOR}
              strokeWidth={2.5}
              strokeDasharray="6 4"
            />
            <text x={x(marker.p)} y={BAND_TOP - 32} textAnchor="middle" fontSize={17} fontWeight={600} fill={MARKER_COLOR}>
              {marker.label ?? `${pLabel} ${marker.p.toFixed(2)}`}
            </text>
          </g>
        )}

        {/* Eje */}
        <line x1={0} y1={BAND_BOTTOM} x2={W} y2={BAND_BOTTOM} stroke="var(--plot-axis)" strokeWidth={1.5} />
        <text x={4} y={BAND_BOTTOM + 30} textAnchor="start" fontSize={18} fill="var(--text-muted)">
          {formatAxisLabel(pMin)}
        </text>
        <text x={W - 4} y={BAND_BOTTOM + 30} textAnchor="end" fontSize={18} fill="var(--text-muted)">
          {formatAxisLabel(pMax)}
        </text>
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={22} fontWeight={600} fill="var(--text)">
          {pLabel}
        </text>
      </svg>
    </div>
  );
}
