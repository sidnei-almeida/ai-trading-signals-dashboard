import { allocationsArray } from "@/lib/dashboard-math";
import {
  applyOperatingModeToAllocations,
  getOperatingModeConfig,
  guardrailsFromMode,
} from "@/lib/operating-modes";
import type {
  AllocationWeights,
  DashboardData,
  GuardrailConfig,
  StrategyMode,
} from "@/types/rl-trading";

export interface ResolvedAllocationTargets {
  ppoTargets: number[];
  adjustedTargets: number[];
  guardrails: GuardrailConfig;
  modeConfig: ReturnType<typeof getOperatingModeConfig>;
}

export function resolveAllocationTargets(
  current: AllocationWeights,
  ppoAllocations: number[] | undefined,
  strategyMode: StrategyMode,
): ResolvedAllocationTargets {
  const ppo =
    ppoAllocations?.length === 5
      ? ppoAllocations
      : allocationsArray(current);
  const { ppoTargets, adjustedTargets } = applyOperatingModeToAllocations(
    current,
    ppo,
    strategyMode,
  );
  return {
    ppoTargets,
    adjustedTargets,
    guardrails: guardrailsFromMode(strategyMode),
    modeConfig: getOperatingModeConfig(strategyMode),
  };
}

export function resolveFromDashboard(
  data: DashboardData,
  ppoAllocations: number[] | undefined,
  strategyMode: StrategyMode,
): ResolvedAllocationTargets {
  return resolveAllocationTargets(
    data.current_allocation,
    ppoAllocations,
    strategyMode,
  );
}
