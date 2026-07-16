export interface ReactionComponent {
  initial: number;
  stoich: number;
}

function validateReaction(
  reactants: ReactionComponent[],
  products: ReactionComponent[],
): boolean {
  if (reactants.length === 0 || products.length === 0) return false;
  return reactants.every((item) => item.stoich > 0 && item.initial >= 0)
    && products.every((item) => item.stoich > 0 && item.initial >= 0);
}

export function solveReactionExtent(params: {
  logK: number;
  reactants: ReactionComponent[];
  products: ReactionComponent[];
}): { extent: number; reactants: number[]; products: number[]; limitingConversion: number } {
  if (!validateReaction(params.reactants, params.products)) {
    return {
      extent: NaN,
      reactants: params.reactants.map((item) => item.initial),
      products: params.products.map((item) => item.initial),
      limitingConversion: NaN,
    };
  }

  const minExtent = Math.max(
    ...params.products.map((item) => -item.initial / item.stoich),
  );
  const maxExtent = Math.min(
    ...params.reactants.map((item) => item.initial / item.stoich),
  );
  if (maxExtent <= minExtent) {
    return {
      extent: 0,
      reactants: params.reactants.map((item) => item.initial),
      products: params.products.map((item) => item.initial),
      limitingConversion: 0,
    };
  }

  const logQ = (extent: number) => {
    const productTerm = params.products.reduce((sum, item) =>
      sum + item.stoich * Math.log10(Math.max(item.initial + item.stoich * extent, 1e-300)), 0);
    const reactantTerm = params.reactants.reduce((sum, item) =>
      sum + item.stoich * Math.log10(Math.max(item.initial - item.stoich * extent, 1e-300)), 0);
    return productTerm - reactantTerm;
  };

  let lo = minExtent;
  let hi = maxExtent;
  const qLo = logQ(lo) - params.logK;
  const qHi = logQ(hi) - params.logK;
  if (qLo === 0) {
    return {
      extent: lo,
      reactants: params.reactants.map((item) => item.initial - item.stoich * lo),
      products: params.products.map((item) => item.initial + item.stoich * lo),
      limitingConversion: lo > 0 ? lo / maxExtent : lo / Math.max(minExtent, -1e-300),
    };
  }
  if (qHi === 0) {
    return {
      extent: hi,
      reactants: params.reactants.map((item) => item.initial - item.stoich * hi),
      products: params.products.map((item) => item.initial + item.stoich * hi),
      limitingConversion: hi > 0 ? hi / maxExtent : hi / Math.max(minExtent, -1e-300),
    };
  }
  if (qLo * qHi > 0) {
    const forwardExtent = qLo < 0 ? maxExtent : minExtent;
    return {
      extent: forwardExtent,
      reactants: params.reactants.map((item) => item.initial - item.stoich * forwardExtent),
      products: params.products.map((item) => item.initial + item.stoich * forwardExtent),
      limitingConversion: forwardExtent > 0 ? forwardExtent / maxExtent : forwardExtent / Math.max(minExtent, -1e-300),
    };
  }

  for (let i = 0; i < 160; i++) {
    const mid = (lo + hi) / 2;
    if (logQ(mid) < params.logK) lo = mid;
    else hi = mid;
  }
  const extent = (lo + hi) / 2;
  const forwardSpan = maxExtent;
  const reverseSpan = Math.abs(minExtent);
  const limitingConversion = extent >= 0
    ? extent / forwardSpan
    : extent / Math.max(reverseSpan, 1e-300);
  return {
    extent,
    reactants: params.reactants.map((item) => item.initial - item.stoich * extent),
    products: params.products.map((item) => item.initial + item.stoich * extent),
    limitingConversion,
  };
}

export function equimolarAssociationLogKForTarget(concentration: number, targetFraction: number): number {
  const q = Math.min(1 - 1e-15, Math.max(0, targetFraction));
  const residual = concentration * (1 - q);
  return Math.log10(concentration * q / (residual * residual));
}
