import type { Data } from 'plotly.js';

/** Okabe–Ito-friendly dash cycle for redundant series encoding beyond color. */
export const SERIES_DASH_CYCLE = ['solid', 'dash', 'dot', 'dashdot', 'longdash', 'longdashdot'] as const;

type LineTrace = Data & {
  showlegend?: boolean;
  name?: string;
  line?: { dash?: string; color?: string; width?: number };
};

function isLegendEntry(trace: LineTrace): boolean {
  return trace.showlegend !== false && Boolean(trace.name);
}

function isLineTrace(trace: Data): trace is LineTrace {
  const mode = (trace as { mode?: string }).mode;
  const type = (trace as { type?: string }).type;
  if (type && type !== 'scatter') return false;
  return !mode || mode.includes('lines');
}

/** Assign distinct line dashes when more than two comparable series share a chart. */
export function applySeriesEncoding(data: Data[]): Data[] {
  const legendLines = data.filter((trace) => isLineTrace(trace) && isLegendEntry(trace));
  if (legendLines.length <= 2) return data;

  let dashIndex = 0;
  return data.map((trace) => {
    if (!isLineTrace(trace) || !isLegendEntry(trace)) return trace;
    const existingDash = trace.line?.dash;
    if (existingDash && existingDash !== 'solid') return trace;
    const dash = SERIES_DASH_CYCLE[dashIndex % SERIES_DASH_CYCLE.length];
    dashIndex += 1;
    return {
      ...trace,
      line: { ...trace.line, dash, width: trace.line?.width ?? 2 },
    } as Data;
  });
}
