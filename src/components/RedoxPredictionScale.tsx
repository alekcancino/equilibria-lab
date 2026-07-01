import { formatAxisLabel } from '../lib/format';

export interface RedoxScaleCouple {
  ox: string;
  red: string;
  pe0: number;
  color: string;
  label: string;
}

interface RedoxPredictionScaleProps {
  couples: RedoxScaleCouple[];
  peMin: number;
  peMax: number;
  caption?: string;
}

const W = 1000;
const H = 260;
const RAIL_Y = [92, 168] as const;
const TICK_H = 44;

/** Redox prediction scale (Baeza): oxidant above, reductant below, pe°′ on the axis. */
export default function RedoxPredictionScale({ couples, peMin, peMax, caption }: RedoxPredictionScaleProps) {
  const x = (pe: number) => ((pe - peMin) / (peMax - peMin)) * W;

  return (
    <div className="redox-scale">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
        {caption && (
          <text x={W / 2} y={28} textAnchor="middle" fontSize={18} fill="var(--text-muted)">
            {caption}
          </text>
        )}

        {couples.map((c, i) => {
          const y = RAIL_Y[i] ?? RAIL_Y[0];
          const px = x(c.pe0);
          return (
            <g key={c.label}>
              <line x1={0} y1={y} x2={W} y2={y} stroke="var(--plot-axis)" strokeWidth={1.5} />
              <line
                x1={px}
                y1={y - TICK_H}
                x2={px}
                y2={y + TICK_H}
                stroke={c.color}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <text x={px} y={y - TICK_H - 10} textAnchor="middle" fontSize={16} fontWeight={600} fill={c.color}>
                {c.ox}
              </text>
              <text x={px} y={y + TICK_H + 22} textAnchor="middle" fontSize={16} fontWeight={600} fill={c.color}>
                {c.red}
              </text>
              <text x={px} y={y + 5} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--text)">
                {formatAxisLabel(c.pe0)}
              </text>
            </g>
          );
        })}

        <line x1={0} y1={H - 52} x2={W} y2={H - 52} stroke="var(--plot-axis)" strokeWidth={1.5} />
        <text x={4} y={H - 28} textAnchor="start" fontSize={16} fill="var(--text-muted)">
          {formatAxisLabel(peMin)}
        </text>
        <text x={W - 4} y={H - 28} textAnchor="end" fontSize={16} fill="var(--text-muted)">
          {formatAxisLabel(peMax)}
        </text>
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={20} fontWeight={600} fill="var(--text)">
          pe
        </text>
      </svg>
    </div>
  );
}
