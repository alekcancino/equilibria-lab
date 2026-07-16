import { axisValue, type Grid2D } from './predominance2D';

export interface FeasibilityConstraint {
  label: string;
  axisSignature: string;
  evaluate: (x: number, y?: number) => number;
  relation?: 'gte' | 'lte';
  target: number;
}

export interface FeasibilityPoint {
  feasible: boolean;
  margins: number[];
  failed: string[];
}

export function evaluateFeasibility(
  constraints: FeasibilityConstraint[],
  x: number,
  y?: number,
): FeasibilityPoint {
  const signatures = new Set(constraints.map((item) => item.axisSignature));
  if (signatures.size > 1) throw new Error('Incompatible feasibility axes or activities');
  const margins = constraints.map((item) => {
    const value = item.evaluate(x, y);
    return item.relation === 'lte' ? item.target - value : value - item.target;
  });
  return {
    feasible: margins.every((margin) => margin >= 0),
    margins,
    failed: constraints.filter((_, index) => margins[index] < 0).map((item) => item.label),
  };
}

export function feasibilityGrid(
  constraints: FeasibilityConstraint[],
  xRange: [number, number],
  yRange: [number, number],
  nx = 160,
  ny = 160,
): Grid2D {
  const dominant: number[][] = [];
  const frac: number[][] = [];
  for (let j = 0; j < ny; j++) {
    const y = axisValue(yRange, ny, j);
    const rowD: number[] = [];
    const rowF: number[] = [];
    for (let i = 0; i < nx; i++) {
      const result = evaluateFeasibility(constraints, axisValue(xRange, nx, i), y);
      rowD.push(result.feasible ? constraints.length : Math.max(0, result.margins.indexOf(Math.min(...result.margins))));
      rowF.push(result.feasible ? 1 : 0);
    }
    dominant.push(rowD);
    frac.push(rowF);
  }
  return { dominant, frac, nx, ny, xRange, yRange };
}

export function feasibleIntervals1D(
  constraints: FeasibilityConstraint[],
  range: [number, number],
  points = 2000,
): [number, number][] {
  const intervals: [number, number][] = [];
  let start: number | null = null;
  for (let i = 0; i <= points; i++) {
    const x = axisValue(range, points + 1, i);
    const pass = evaluateFeasibility(constraints, x).feasible;
    if (pass && start === null) start = x;
    if ((!pass || i === points) && start !== null) {
      intervals.push([start, pass && i === points ? x : axisValue(range, points + 1, i - 1)]);
      start = null;
    }
  }
  return intervals;
}
