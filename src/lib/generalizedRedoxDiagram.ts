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

function nodeReferenceLogActivity(node: RedoxGraphNode): number {
  if (node.phase === 'solid') return 0;
  return node.logActivity ?? 0;
}

/** Element-pool fractions φ_i with Σ φ_i = 1, weighted by pool stoichiometry. */
export function redoxPoolFractions(scores: number[], nodes: RedoxGraphNode[]): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  const weights = scores.map((score, index) => {
    const stoich = Math.max(nodes[index].poolStoich ?? 1, 1);
    return Math.pow(10, score - max) / stoich;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return scores.map(() => 1 / scores.length);
  return weights.map((value) => value / total);
}

export function poolConservationError(fractions: number[], nodes: RedoxGraphNode[]): number {
  void nodes;
  return Math.abs(fractions.reduce((sum, value) => sum + value, 0) - 1);
}

/** Returns false when any node cannot be reached from the anchor. */
export function isRedoxGraphConnected(graph: RedoxGraph): boolean {
  if (graph.nodes.length === 0) return true;
  const index = new Map(graph.nodes.map((node, i) => [node.id, i]));
  const scores = new Array<number>(graph.nodes.length).fill(NaN);
  scores[0] = nodeReferenceLogActivity(graph.nodes[0]);
  let changed = true;
  for (let pass = 0; pass < graph.nodes.length && changed; pass++) {
    changed = false;
    for (const edge of graph.edges) {
      const from = index.get(edge.from);
      const to = index.get(edge.to);
      if (from === undefined || to === undefined) return false;
      if (Number.isFinite(scores[from]) && !Number.isFinite(scores[to])) {
        scores[to] = scores[from] + edgeDelta(edge, 7, 0, 4)
          + nodeReferenceLogActivity(graph.nodes[to])
          - nodeReferenceLogActivity(graph.nodes[from]);
        changed = true;
      } else if (Number.isFinite(scores[to]) && !Number.isFinite(scores[from])) {
        scores[from] = scores[to] - edgeDelta(edge, 7, 0, 4)
          + nodeReferenceLogActivity(graph.nodes[from])
          - nodeReferenceLogActivity(graph.nodes[to]);
        changed = true;
      }
    }
  }
  return scores.every((value) => Number.isFinite(value));
}

export function redoxGraphPotentials(
  graph: RedoxGraph,
  pH: number,
  pX: number,
  pe: number,
): { scores: number[]; maxCycleError: number; fractions: number[]; poolError: number } {
  if (graph.nodes.length === 0) return { scores: [], maxCycleError: 0, fractions: [], poolError: 0 };
  const index = new Map(graph.nodes.map((node, i) => [node.id, i]));
  const scores = new Array<number>(graph.nodes.length).fill(NaN);
  scores[0] = nodeReferenceLogActivity(graph.nodes[0]);
  let changed = true;
  for (let pass = 0; pass < graph.nodes.length && changed; pass++) {
    changed = false;
    for (const edge of graph.edges) {
      const from = index.get(edge.from);
      const to = index.get(edge.to);
      if (from === undefined || to === undefined) throw new Error('Redox edge references an unknown node');
      const delta = edgeDelta(edge, pH, pX, pe);
      if (Number.isFinite(scores[from]) && !Number.isFinite(scores[to])) {
        scores[to] = scores[from] + delta
          + nodeReferenceLogActivity(graph.nodes[to])
          - nodeReferenceLogActivity(graph.nodes[from]);
        changed = true;
      } else if (Number.isFinite(scores[to]) && !Number.isFinite(scores[from])) {
        scores[from] = scores[to] - delta
          + nodeReferenceLogActivity(graph.nodes[from])
          - nodeReferenceLogActivity(graph.nodes[to]);
        changed = true;
      }
    }
  }
  if (scores.some((value) => !Number.isFinite(value))) throw new Error('Disconnected redox graph');
  for (let i = 0; i < graph.nodes.length; i++) {
    if (graph.nodes[i].phase === 'solid') scores[i] = nodeReferenceLogActivity(graph.nodes[i]);
  }
  let maxCycleError = 0;
  for (const edge of graph.edges) {
    const from = index.get(edge.from)!;
    const to = index.get(edge.to)!;
    maxCycleError = Math.max(maxCycleError, Math.abs(scores[to] - scores[from] - edgeDelta(edge, pH, pX, pe)));
  }
  const fractions = redoxPoolFractions(scores, graph.nodes);
  return {
    scores,
    maxCycleError,
    fractions,
    poolError: poolConservationError(fractions, graph.nodes),
  };
}

export function generalizedRedoxGrid(
  graph: RedoxGraph,
  pHRange: [number, number],
  peRange: [number, number],
  pX = 0,
  nx = 160,
  ny = 160,
): Grid2D {
  const winCounts = new Array(graph.nodes.length).fill(0);
  const dominant: number[][] = [];
  const frac: number[][] = [];
  for (let j = 0; j < ny; j++) {
    const pe = axisValue(peRange, ny, j);
    const rowD: number[] = [];
    const rowF: number[] = [];
    for (let i = 0; i < nx; i++) {
      const { fractions } = redoxGraphPotentials(graph, axisValue(pHRange, nx, i), pX, pe);
      const winner = fractions.indexOf(Math.max(...fractions));
      rowD.push(winner);
      rowF.push(fractions[winner]);
      winCounts[winner] += 1;
    }
    dominant.push(rowD);
    frac.push(rowF);
  }
  const stable = winCounts.map((count) => count > 0);
  if (stable.some(Boolean)) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (!stable[dominant[j][i]]) {
          const fallback = stable.findIndex(Boolean);
          if (fallback >= 0) dominant[j][i] = fallback;
        }
      }
    }
  }
  return { dominant, frac, nx, ny, xRange: pHRange, yRange: peRange };
}

/** Default metal atoms per formula for Pourbaix arbitrary species. */
export function defaultPoolStoich(kind: 'ion' | 'hydroxide' | 'metal'): number {
  return kind === 'hydroxide' ? 1 : 1;
}
