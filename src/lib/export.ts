import type { Data } from 'plotly.js';

interface XYTrace {
  name?: string;
  x: unknown[];
  y: unknown[];
}

function hasXY(t: Data): t is Data & XYTrace {
  return Array.isArray((t as XYTrace).x) && Array.isArray((t as XYTrace).y);
}

/**
 * Converts Plotly traces to a CSV string.
 * Each trace contributes two columns: x_<name> and y_<name>.
 * Rows are aligned to the longest trace; shorter traces get empty cells.
 */
export function tracesToCSV(data: Data[], xTitle: string, yTitle: string): string {
  const traces = data.filter(hasXY);
  if (traces.length === 0) return '';

  const maxLen = Math.max(...traces.map((t) => t.x.length));

  const headers = traces.flatMap((t) => {
    const name = (t.name ?? 'serie').replace(/,/g, ';');
    return [`${xTitle}:${name}`, `${yTitle}:${name}`];
  });

  const rows: string[] = [headers.join(',')];
  for (let i = 0; i < maxLen; i++) {
    const cells = traces.flatMap((t) => {
      const x = i < t.x.length ? String(t.x[i]) : '';
      const y = i < t.y.length ? String(t.y[i]) : '';
      return [x, y];
    });
    rows.push(cells.join(','));
  }

  return rows.join('\n');
}

/** Triggers a browser download of a CSV string as a .csv file. */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
