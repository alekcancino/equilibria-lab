import { axisValue, type Grid2D } from './predominance2D';

export interface RedoxGraphNode {
  id: string;
  label: string;
  poolStoich?: number;
  phase?: 'aqueous' | 'solid';
  logActivity?: number;
}

export interface RedoxGraphEdge {
  from: string;
  to: string;
  logK0: number;
  pHCoefficient?: number;
  pXCoefficient?: number;
  peCoefficient?: number;
}

export interface RedoxGraph {
  nodes: RedoxGraphNode[];
  edges: RedoxGraphEdge[];
}

function edgeDelta(edge: RedoxGraphEdge, pH: number, pX: number, pe: number): number {
  return edge.logK0 + (edge.pHCoefficient ?? 0) * pH
    + (edge.pXCoefficient ?? 0) * pX + (edge.peCoefficient ?? 0) * pe;
}

export function redoxGraphPotentials(
  graph: RedoxGraph,
  pH: number,
  pX: number,
  pe: number,
): { scores: number[]; maxCycleError: number } {
  if (graph.nodes.length === 0) return { scores: [], maxCycleError: 0 };
  const index = new Map(graph.nodes.map((node, i) => [node.id, i]));
  const scores = new Array<number>(graph.nodes.length).fill(NaN);
  scores[0] = graph.nodes[0].logActivity ?? 0;
  let changed = true;
  for (let pass = 0; pass < graph.nodes.length && changed; pass++) {
    changed = false;
    for (const edge of graph.edges) {
      const from = index.get(edge.from);
      const to = index.get(edge.to);
      if (from === undefined || to === undefined) throw new Error('Redox edge references an unknown node');
      const delta = edgeDelta(edge, pH, pX, pe);
      if (Number.isFinite(scores[from]) && !Number.isFinite(scores[to])) {
        scores[to] = scores[from] + delta;
        changed = true;
      } else if (Number.isFinite(scores[to]) && !Number.isFinite(scores[from])) {
        scores[from] = scores[to] - delta;
        changed = true;
      }
    }
  }
  if (scores.some((value) => !Number.isFinite(value))) throw new Error('Disconnected redox graph');
  let maxCycleError = 0;
  for (const edge of graph.edges) {
    const from = index.get(edge.from)!;
    const to = index.get(edge.to)!;
    maxCycleError = Math.max(maxCycleError, Math.abs(scores[to] - scores[from] - edgeDelta(edge, pH, pX, pe)));
  }
  return { scores, maxCycleError };
}

export function generalizedRedoxGrid(
  graph: RedoxGraph,
  pHRange: [number, number],
  peRange: [number, number],
  pX = 0,
  nx = 160,
  ny = 160,
): Grid2D {
  const dominant: number[][] = [];
  const frac: number[][] = [];
  for (let j = 0; j < ny; j++) {
    const pe = axisValue(peRange, ny, j);
    const rowD: number[] = [];
    const rowF: number[] = [];
    for (let i = 0; i < nx; i++) {
      const { scores } = redoxGraphPotentials(graph, axisValue(pHRange, nx, i), pX, pe);
      const max = Math.max(...scores);
      const weights = scores.map((value) => Math.pow(10, value - max));
      const total = weights.reduce((sum, value) => sum + value, 0);
      const winner = weights.indexOf(Math.max(...weights));
      rowD.push(winner);
      rowF.push(weights[winner] / total);
    }
    dominant.push(rowD);
    frac.push(rowF);
  }
  return { dominant, frac, nx, ny, xRange: pHRange, yRange: peRange };
}
