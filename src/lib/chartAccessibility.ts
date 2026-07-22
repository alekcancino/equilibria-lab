import type { Data } from 'plotly.js';

export interface ChartTraceFact {
  index: number;
  name?: string;
  startX: unknown;
  startY: number;
  endX: unknown;
  endY: number;
  peakX: unknown;
  peakY: number;
  minimumX: unknown;
  minimumY: number;
  hasInteriorPeak: boolean;
  hasInteriorMinimum: boolean;
}

function values(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<unknown>);
  return [];
}

/** Extracts screen-reader-friendly key points from Plotly XY traces. */
export function chartTraceFacts(data: Data[]): ChartTraceFact[] {
  return data.flatMap((trace, index) => {
    const candidate = trace as { name?: unknown; x?: unknown; y?: unknown; visible?: unknown };
    if (candidate.visible === false || candidate.visible === 'legendonly') return [];
    const xs = values(candidate.x);
    const ys = values(candidate.y);
    const points = ys.flatMap((rawY, pointIndex) => {
      const y = typeof rawY === 'number'
        ? rawY
        : typeof rawY === 'string' && rawY.trim() !== ''
          ? Number(rawY)
          : Number.NaN;
      return Number.isFinite(y) ? [{ x: xs[pointIndex] ?? pointIndex, y, pointIndex }] : [];
    });
    if (points.length === 0) return [];

    const start = points[0];
    const end = points[points.length - 1];
    const peak = points.reduce((best, point) => point.y > best.y ? point : best, start);
    const minimum = points.reduce((best, point) => point.y < best.y ? point : best, start);
    const span = Math.max(Math.abs(peak.y - minimum.y), 1e-12);
    const tolerance = span * 0.02;

    return [{
      index,
      name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : undefined,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      peakX: peak.x,
      peakY: peak.y,
      minimumX: minimum.x,
      minimumY: minimum.y,
      hasInteriorPeak: peak.pointIndex !== start.pointIndex
        && peak.pointIndex !== end.pointIndex
        && peak.y > Math.max(start.y, end.y) + tolerance,
      hasInteriorMinimum: minimum.pointIndex !== start.pointIndex
        && minimum.pointIndex !== end.pointIndex
        && minimum.y < Math.min(start.y, end.y) - tolerance,
    }];
  });
}
