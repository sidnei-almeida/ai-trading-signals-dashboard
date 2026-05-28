import { RL_TICKERS } from "@/lib/constants";
import { allocationsArray, buildRebalanceQueue, riskUtilization } from "@/lib/dashboard-math";
import type { OperatingModeConfig } from "@/lib/operating-modes";
import type {
  AllocationWeights,
  GuardrailConfig,
  RebalanceOrder,
  Ticker,
} from "@/types/rl-trading";

export type RiskLevel = "ok" | "near" | "breach";

export type RiskOverallStatus = "Within Limits" | "Warning" | "Blocked";

export interface UtilizationRow {
  id: string;
  label: string;
  currentLabel: string;
  limitLabel: string;
  utilization: number;
  status: RiskLevel;
}

export interface ExposureRow {
  ticker: Ticker;
  current: number;
  target: number;
  limit: number;
  utilization: number;
  status: RiskLevel;
}

export interface RebalanceRiskReview {
  largestIncrease: { ticker: Ticker; delta: number };
  largestReduction: { ticker: Ticker; delta: number };
  maxStepUsed: number;
  concentrationAfter: number;
  cashAfter: number;
  decision: "Approved" | "Needs Review" | "Blocked";
  decisionNote: string;
  blockedCount: number;
}

export interface RiskKpiSnapshot {
  overallStatus: RiskOverallStatus;
  riskUtilization: number;
  maxExposure: number;
  maxExposureLimit: number;
  cashReserve: number;
  cashReserveRequired: number;
  maxRebalanceStep: number;
  maxRebalanceLimit: number;
  blockedCount: number;
}

function levelFromUtilization(u: number): RiskLevel {
  if (u >= 1) return "breach";
  if (u >= 0.75) return "near";
  return "ok";
}

export function cashWeight(weights: AllocationWeights): number {
  return Math.max(0, 1 - allocationsArray(weights).reduce((s, w) => s + w, 0));
}

export function computeRiskKpis(
  current: AllocationWeights,
  targets: number[],
  guardrails: GuardrailConfig,
  queue: RebalanceOrder[],
  riskMultiplier: number,
): RiskKpiSnapshot {
  const maxExposure = Math.max(...allocationsArray(current), 0);
  const maxExposureLimit =
    guardrails.maxSingleAssetAllocation / Math.max(riskMultiplier, 0.01);
  const riskUtil = riskUtilization(current, guardrails, riskMultiplier);
  const cash = cashWeight(current);
  const cashRequired = guardrails.cashReservePct;
  const maxStep = Math.max(...queue.map((q) => Math.abs(q.delta)), 0);
  const blockedCount = queue.filter((q) => q.status === "blocked").length;

  let overallStatus: RiskOverallStatus = "Within Limits";
  if (blockedCount > 0) overallStatus = "Blocked";
  else if (
    riskUtil >= 0.85 ||
    maxExposure / maxExposureLimit >= 0.85 ||
    (cashRequired > 0 && cash < cashRequired) ||
    maxStep / guardrails.maxRebalanceSize >= 0.85
  ) {
    overallStatus = "Warning";
  }

  return {
    overallStatus,
    riskUtilization: riskUtil,
    maxExposure,
    maxExposureLimit,
    cashReserve: cash,
    cashReserveRequired: cashRequired,
    maxRebalanceStep: maxStep,
    maxRebalanceLimit: guardrails.maxRebalanceSize,
    blockedCount,
  };
}

export function buildGuardrailStatusRows(
  current: AllocationWeights,
  targets: number[],
  guardrails: GuardrailConfig,
  queue: RebalanceOrder[],
  modeLabel: string,
  riskMultiplier: number,
): UtilizationRow[] {
  const maxWeight = Math.max(...allocationsArray(current), 0);
  const maxTarget = Math.max(...targets, 0);
  const maxStep = Math.max(...queue.map((q) => Math.abs(q.delta)), 0);
  const cash = cashWeight(current);
  const blocked = queue.filter((q) => q.status === "blocked").length;

  const assetLimit =
    guardrails.maxSingleAssetAllocation / Math.max(riskMultiplier, 0.01);
  const assetUtil = Math.max(maxWeight, maxTarget) / assetLimit;

  const stepUtil = maxStep / guardrails.maxRebalanceSize;
  const cashDisplayUtil =
    guardrails.cashReservePct > 0
      ? Math.max(0, 1 - cash / guardrails.cashReservePct)
      : 0;

  const concUtil = maxTarget / guardrails.concentrationLimit;

  return [
    {
      id: "max-asset",
      label: "Max single asset",
      currentLabel: `${(maxWeight * 100).toFixed(2)}%`,
      limitLabel: `${(assetLimit * 100).toFixed(0)}%`,
      utilization: assetUtil,
      status: levelFromUtilization(assetUtil),
    },
    {
      id: "rebalance-step",
      label: "Max rebalance step",
      currentLabel: `${(maxStep * 100).toFixed(2)}%`,
      limitLabel: `${(guardrails.maxRebalanceSize * 100).toFixed(0)}%`,
      utilization: stepUtil,
      status: levelFromUtilization(stepUtil),
    },
    {
      id: "cash",
      label: "Cash reserve",
      currentLabel: `${(cash * 100).toFixed(2)}%`,
      limitLabel: `${(guardrails.cashReservePct * 100).toFixed(0)}% min`,
      utilization: guardrails.cashReservePct > 0 ? cashDisplayUtil : 0,
      status:
        guardrails.cashReservePct > 0 && cash < guardrails.cashReservePct
          ? "breach"
          : guardrails.cashReservePct > 0 && cash < guardrails.cashReservePct * 1.15
            ? "near"
            : "ok",
    },
    {
      id: "concentration",
      label: "Concentration limit",
      currentLabel: `${(maxTarget * 100).toFixed(2)}%`,
      limitLabel: `${(guardrails.concentrationLimit * 100).toFixed(0)}%`,
      utilization: concUtil,
      status: levelFromUtilization(concUtil),
    },
    {
      id: "mode",
      label: "Operating mode",
      currentLabel: modeLabel,
      limitLabel: blocked > 0 ? `${blocked} blocked` : "Active",
      utilization: blocked > 0 ? 1 : 0.2,
      status: blocked > 0 ? "breach" : "ok",
    },
  ];
}

export function buildExposureRows(
  current: AllocationWeights,
  targets: number[],
  guardrails: GuardrailConfig,
  riskMultiplier: number,
): ExposureRow[] {
  const limit =
    guardrails.maxSingleAssetAllocation / Math.max(riskMultiplier, 0.01);

  return RL_TICKERS.map((ticker, i) => {
    const cur = current[ticker] ?? 0;
    const tgt = targets[i] ?? 0;
    const peak = Math.max(cur, tgt);
    const utilization = peak / limit;
    return {
      ticker,
      current: cur,
      target: tgt,
      limit,
      utilization,
      status: levelFromUtilization(utilization),
    };
  });
}

export function buildRebalanceRiskReview(
  queue: RebalanceOrder[],
  targets: number[],
  guardrails: GuardrailConfig,
): RebalanceRiskReview {
  const deltas = queue.map((q) => ({ ticker: q.ticker, delta: q.delta }));
  const largestIncrease = deltas.reduce(
    (best, row) => (row.delta > best.delta ? row : best),
    deltas[0] ?? { ticker: "AAPL" as Ticker, delta: 0 },
  );
  const largestReduction = deltas.reduce(
    (best, row) => (row.delta < best.delta ? row : best),
    deltas[0] ?? { ticker: "AAPL" as Ticker, delta: 0 },
  );
  const maxStepUsed = Math.max(...queue.map((q) => Math.abs(q.delta)), 0);
  const concentrationAfter = Math.max(...targets, 0);
  const cashAfter = Math.max(0, 1 - targets.reduce((s, w) => s + w, 0));
  const blockedCount = queue.filter((q) => q.status === "blocked").length;

  let decision: RebalanceRiskReview["decision"] = "Approved";
  let decisionNote = "All rebalance legs pass active guardrail checks.";

  if (blockedCount > 0) {
    decision = "Blocked";
    const reasons = [...new Set(queue.filter((q) => q.reason).map((q) => q.reason))];
    decisionNote = `${blockedCount} leg(s) blocked: ${reasons.join("; ")}.`;
  } else if (
    concentrationAfter > guardrails.concentrationLimit * 0.9 ||
    maxStepUsed > guardrails.maxRebalanceSize * 0.85 ||
    cashAfter < guardrails.cashReservePct
  ) {
    decision = "Needs Review";
    decisionNote =
      "Proposed rebalance approaches concentration, step, or cash limits — review before simulating.";
  }

  return {
    largestIncrease,
    largestReduction,
    maxStepUsed,
    concentrationAfter,
    cashAfter,
    decision,
    decisionNote,
    blockedCount,
  };
}

export function buildRiskContext(
  current: AllocationWeights,
  adjustedTargets: number[],
  ppoTargets: number[],
  guardrails: GuardrailConfig,
  modeConfig: OperatingModeConfig,
) {
  const queue = buildRebalanceQueue(
    current,
    adjustedTargets,
    guardrails,
    ppoTargets,
  );
  const kpis = computeRiskKpis(
    current,
    adjustedTargets,
    guardrails,
    queue,
    modeConfig.riskMultiplier,
  );
  return {
    queue,
    kpis,
    guardrailRows: buildGuardrailStatusRows(
      current,
      adjustedTargets,
      guardrails,
      queue,
      modeConfig.label,
      modeConfig.riskMultiplier,
    ),
    exposureRows: buildExposureRows(
      current,
      adjustedTargets,
      guardrails,
      modeConfig.riskMultiplier,
    ),
    review: buildRebalanceRiskReview(queue, adjustedTargets, guardrails),
  };
}

export function statusLabel(level: RiskLevel): string {
  if (level === "breach") return "Breach";
  if (level === "near") return "Near Limit";
  return "OK";
}
