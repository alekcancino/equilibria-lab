// Generic 2D predominance-map engine. Given a fractions callback that treats
// its two arguments as INDEPENDENT variables (e.g. pH and pL, or pL and pX),
// it sweeps a grid and records which species dominates in each cell. Rendering
// (components/Predominance2D.tsx) is intentionally decoupled: this file knows
// nothing about axes, colors, or SVG — only about "which index wins where".

export interface Grid2D {
  /** dominant[j][i] = species index winning at column i (x), row j (y).
   *  −1 marks a cell with no finite solution (NaN fractions). */
  dominant: number[][];
  /** frac[j][i] = fraction of the dominant species at that cell (used for
   *  optional confidence shading near boundaries). NaN where dominant is −1. */
  frac: number[][];
  nx: number;
  ny: number;
  xRange: [number, number];
  yRange: [number, number];
}

/** Value of x at column i (i ∈ [0, nx−1]). Row/col centers are the grid nodes. */
export function axisValue(range: [number, number], n: number, i: number): number {
  return n <= 1 ? range[0] : range[0] + ((range[1] - range[0]) * i) / (n - 1);
}

/**
 * Sweep an (x, y) grid and pick the dominant species per cell.
 * `fracAt(x, y)` returns the species fractions (any length ≥ 1) at that point.
 * Row j = 0 corresponds to yRange[0]; the renderer decides the visual flip.
 */
export function predominanceGrid(
  fracAt: (x: number, y: number) => number[],
  xRange: [number, number],
  yRange: [number, number],
  nx = 220,
  ny = 220,
): Grid2D {
  const dominant: number[][] = new Array(ny);
  const frac: number[][] = new Array(ny);
  for (let j = 0; j < ny; j++) {
    const y = axisValue(yRange, ny, j);
    const rowD = new Array<number>(nx);
    const rowF = new Array<number>(nx);
    for (let i = 0; i < nx; i++) {
      const x = axisValue(xRange, nx, i);
      const f = fracAt(x, y);
      let bi = 0;
      let bv = -Infinity;
      for (let k = 0; k < f.length; k++) {
        // ties (equal fractions on a boundary) resolve to the lower index,
        // matching the 1D ladder's left-to-right convention.
        if (f[k] > bv) { bv = f[k]; bi = k; }
      }
      const ok = Number.isFinite(bv);
      rowD[i] = ok ? bi : -1;
      rowF[i] = ok ? bv : NaN;
    }
    dominant[j] = rowD;
    frac[j] = rowF;
  }
  return { dominant, frac, nx, ny, xRange, yRange };
}

/** Species indices that actually appear anywhere in the grid, in ascending
 *  order — lets the renderer show a legend of only the species present. */
export function speciesInGrid(grid: Grid2D): number[] {
  const seen = new Set<number>();
  for (const row of grid.dominant) {
    for (const v of row) if (v >= 0) seen.add(v);
  }
  return [...seen].sort((a, b) => a - b);
}
