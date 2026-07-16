export interface ReactionComponent {
  initial: number;
  stoich: number;
}

export function solveReactionExtent(params: {
  logK: number;
  reactants: ReactionComponent[];
  products: ReactionComponent[];
}): { extent: number; reactants: number[]; products: number[]; limitingConversion: number } {
  const maxExtent = Math.min(...params.reactants.map((item) => item.initial / item.stoich));
  const logQ = (extent: number) => {
    const productTerm = params.products.reduce((sum, item) =>
      sum + item.stoich * Math.log10(Math.max(item.initial + item.stoich * extent, 1e-300)), 0);
    const reactantTerm = params.reactants.reduce((sum, item) =>
      sum + item.stoich * Math.log10(Math.max(item.initial - item.stoich * extent, 1e-300)), 0);
    return productTerm - reactantTerm;
  };
  let lo = 0;
  let hi = maxExtent * (1 - 1e-14);
  for (let i = 0; i < 160; i++) {
    const mid = (lo + hi) / 2;
    if (logQ(mid) < params.logK) lo = mid;
    else hi = mid;
  }
  const extent = (lo + hi) / 2;
  return {
    extent,
    reactants: params.reactants.map((item) => item.initial - item.stoich * extent),
    products: params.products.map((item) => item.initial + item.stoich * extent),
    limitingConversion: extent / maxExtent,
  };
}

export function equimolarAssociationLogKForTarget(concentration: number, targetFraction: number): number {
  const q = Math.min(1 - 1e-15, Math.max(0, targetFraction));
  const residual = concentration * (1 - q);
  return Math.log10(concentration * q / (residual * residual));
}
