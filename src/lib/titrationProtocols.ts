export interface ReagentInventory {
  label: string;
  moles: number;
}

export interface ProtocolStage {
  label: string;
  reagent: string;
  addedMoles: number;
  consumes: string;
  stoichAdded?: number;
  stoichConsumed?: number;
}

export interface ProtocolResult {
  inventories: Record<string, number>;
  extents: number[];
  recoveredMoles: Record<string, number>;
}

export function runTitrationProtocol(
  initial: ReagentInventory[],
  stages: ProtocolStage[],
): ProtocolResult {
  const inventories = Object.fromEntries(initial.map((item) => [item.label, item.moles]));
  const recoveredMoles: Record<string, number> = {};
  const extents: number[] = [];
  for (const stage of stages) {
    inventories[stage.reagent] = (inventories[stage.reagent] ?? 0) + stage.addedMoles;
    const nuAdded = stage.stoichAdded ?? 1;
    const nuConsumed = stage.stoichConsumed ?? 1;
    const extent = Math.min(inventories[stage.reagent] / nuAdded, (inventories[stage.consumes] ?? 0) / nuConsumed);
    inventories[stage.reagent] -= nuAdded * extent;
    inventories[stage.consumes] = (inventories[stage.consumes] ?? 0) - nuConsumed * extent;
    recoveredMoles[stage.label] = extent;
    extents.push(extent);
  }
  return { inventories, extents, recoveredMoles };
}

export function backTitration(params: {
  analyteMoles: number;
  primaryAddedMoles: number;
  backTitrantConcentration: number;
  analyteToPrimary?: number;
  primaryToBack?: number;
}): { primaryExcessMoles: number; backVolumeML: number; recoveredAnalyteMoles: number } {
  const analyteToPrimary = params.analyteToPrimary ?? 1;
  const primaryToBack = params.primaryToBack ?? 1;
  const consumedPrimary = analyteToPrimary * params.analyteMoles;
  const primaryExcessMoles = Math.max(0, params.primaryAddedMoles - consumedPrimary);
  const backMoles = primaryExcessMoles / primaryToBack;
  return {
    primaryExcessMoles,
    backVolumeML: 1000 * backMoles / params.backTitrantConcentration,
    recoveredAnalyteMoles: (params.primaryAddedMoles - primaryToBack * backMoles) / analyteToPrimary,
  };
}
