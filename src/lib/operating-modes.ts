import { RL_TICKERS } from "@/lib/constants";
import type { AllocationWeights, GuardrailConfig, StrategyMode } from "@/types/rl-trading";

export interface OperatingModeConfig {
  label: string;
  description: string;
  rebalanceIntensity: number;
  maxSingleAssetAllocation: number;
  maxRebalanceStep: number;
  cashReservePct: number;
  concentrationLimit: number;
  riskMultiplier: number;
}

export const OPERATING_MODES: Record<StrategyMode, OperatingModeConfig> = {
  conservative: {
    label: "Conservative",
    description: "Lower exposure, slower rebalancing, stronger cash reserve.",
    rebalanceIntensity: 0.35,
    maxSingleAssetAllocation: 0.25,
    maxRebalanceStep: 0.08,
    cashReservePct: 0.15,
    concentrationLimit: 0.3,
    riskMultiplier: 0.75,
  },
  balanced: {
    label: "Balanced",
    description: "Default portfolio behavior with moderate rebalancing.",
    rebalanceIntensity: 0.6,
    maxSingleAssetAllocation: 0.35,
    maxRebalanceStep: 0.15,
    cashReservePct: 0.05,
    concentrationLimit: 0.4,
    riskMultiplier: 1.0,
  },
  aggressive: {
    label: "Aggressive",
    description: "Higher exposure and faster reaction to PPO target allocations.",
    rebalanceIntensity: 0.9,
    maxSingleAssetAllocation: 0.5,
    maxRebalanceStep: 0.25,
    cashReservePct: 0,
    concentrationLimit: 0.55,
    riskMultiplier: 1.25,
  },
};

export const STRATEGY_MODE_ORDER: StrategyMode[] = [
  "conservative",
  "balanced",
  "aggressive",
];

export function getOperatingModeConfig(mode: StrategyMode): OperatingModeConfig {
  return OPERATING_MODES[mode] ?? OPERATING_MODES.balanced;
}

export function guardrailsFromMode(mode: StrategyMode): GuardrailConfig {
  const c = getOperatingModeConfig(mode);
  return {
    maxSingleAssetAllocation: c.maxSingleAssetAllocation,
    maxRebalanceSize: c.maxRebalanceStep,
    cashReservePct: c.cashReservePct,
    concentrationLimit: c.concentrationLimit,
  };
}

export interface ModeAdjustedAllocations {
  ppoTargets: number[];
  adjustedTargets: number[];
}

/**
 * Dashboard-side risk layer: dampen or amplify PPO deltas, then apply guardrails.
 * Raw PPO allocations are returned unchanged in `ppoTargets`.
 */
export function applyOperatingModeToAllocations(
  current: AllocationWeights,
  ppoTarget: number[],
  mode: StrategyMode,
): ModeAdjustedAllocations {
  const cfg = getOperatingModeConfig(mode);
  const maxInvestable = 1 - cfg.cashReservePct;
  const ppo = RL_TICKERS.map((_, i) => Math.max(0, ppoTarget[i] ?? 0));

  let adjusted = RL_TICKERS.map((ticker, i) => {
    const currentW = current[ticker] ?? 0;
    const ppoW = ppo[i] ?? 0;
    const delta = (ppoW - currentW) * cfg.rebalanceIntensity;
    let candidate = currentW + delta;

    const step = candidate - currentW;
    if (Math.abs(step) > cfg.maxRebalanceStep) {
      candidate = currentW + Math.sign(step) * cfg.maxRebalanceStep;
    }

    candidate = Math.min(candidate, cfg.maxSingleAssetAllocation);
    candidate = Math.max(0, candidate);
    return candidate;
  });

  const sum = adjusted.reduce((a, b) => a + b, 0);
  if (sum > maxInvestable && sum > 0) {
    adjusted = adjusted.map((w) => (w * maxInvestable) / sum);
  }

  return { ppoTargets: ppo, adjustedTargets: adjusted };
}

export function modeThesisNote(mode: StrategyMode, mainSignalHold: boolean): string {
  if (mode === "conservative") {
    return mainSignalHold
      ? "Conservative mode dampens PPO targets and preserves a higher cash reserve."
      : "Conservative mode applies only a fraction of the PPO tilt and enforces tighter exposure limits.";
  }
  if (mode === "aggressive") {
    return mainSignalHold
      ? "Aggressive mode is ready to follow PPO targets more directly when deltas appear."
      : "Aggressive mode follows PPO target allocations more directly and allows larger rebalance steps.";
  }
  return mainSignalHold
    ? "Balanced mode keeps the current allocation mix when PPO targets are close to holdings."
    : "Balanced mode applies moderate rebalancing toward PPO targets under active guardrails.";
}
