import type { Data } from 'plotly.js';
import { axisValue, type Grid2D } from './predominance2D';

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
 * Optional metadata is prepended as comment lines (# key: value) that
 * spreadsheet apps ignore and pandas can skip with comment='#'.
 */
export function tracesToCSV(
  data: Data[],
  xTitle: string,
  yTitle: string,
  metadata?: Record<string, string>,
): string {
  const traces = data.filter(hasXY);
  if (traces.length === 0) return '';

  const maxLen = Math.max(...traces.map((t) => t.x.length));

  const headers = traces.flatMap((t) => {
    const name = (t.name ?? 'serie').replace(/,/g, ';');
    return [`${xTitle}:${name}`, `${yTitle}:${name}`];
  });

  const metaLines = metadata
    ? Object.entries(metadata).map(([k, v]) => `# ${k}: ${v}`)
    : [];

  const rows: string[] = [...metaLines, headers.join(',')];
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

/**
 * Converts a 2D predominance grid to a CSV matrix: one column per x sample
 * (labelled with its value), one row per y sample, cells hold the dominant
 * species NAME (not index) so the export is self-describing without needing
 * the on-screen legend. Rows are emitted highest-y-first, matching how the
 * map reads top-to-bottom.
 */
export function gridToCSV(
  grid: Grid2D,
  labels: string[],
  xLabel: string,
  yLabel: string,
  metadata?: Record<string, string>,
): string {
  const { dominant, nx, ny, xRange, yRange } = grid;
  const metaLines = metadata
    ? Object.entries(metadata).map(([k, v]) => `# ${k}: ${v}`)
    : [];

  const xs = Array.from({ length: nx }, (_, i) => axisValue(xRange, nx, i));
  const corner = `${yLabel} \\ ${xLabel}`.replace(/,/g, ';');
  const header = [corner, ...xs.map((x) => x.toFixed(3))];

  const rows: string[] = [...metaLines, header.join(',')];
  for (let j = ny - 1; j >= 0; j--) {
    const y = axisValue(yRange, ny, j);
    const cells = dominant[j].map((idx) => (idx < 0 ? '' : (labels[idx] ?? `S${idx}`).replace(/,/g, ';')));
    rows.push([y.toFixed(3), ...cells].join(','));
  }
  return rows.join('\n');
}

/** Triggers a browser download through a short-lived object URL. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Converts a base64 image data URL without routing a multi-megabyte URL through an anchor. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',', 2);
  if (!header || payload === undefined) throw new Error('Invalid data URL');
  const mime = header.match(/^data:([^;,]+)/)?.[1] ?? 'application/octet-stream';
  const bytes = header.includes(';base64')
    ? Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload));
  return new Blob([bytes], { type: mime });
}

/** Triggers a browser download of a CSV string as a .csv file. */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}
