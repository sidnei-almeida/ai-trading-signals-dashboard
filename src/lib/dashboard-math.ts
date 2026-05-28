import { RL_TICKERS } from "@/lib/constants";
import { computeReturn } from "@/lib/format";
import type {
  AllocationWeights,
  DashboardData,
  ObservationVector,
  RebalanceOrder,
  Ticker,
} from "@/types/rl-trading";
import type { GuardrailConfig } from "@/types/rl-trading";

export function allocationsArray(weights: AllocationWeights): number[] {
  return RL_TICKERS.map((t) => weights[t] ?? 0);
}

export function topWeightedTicker(weights: AllocationWeights): {
  ticker: Ticker;
  weight: number;
} {
  let best: Ticker = "AAPL";
  let max = 0;
  for (const t of RL_TICKERS) {
    const w = weights[t] ?? 0;
    if (w > max) {
      max = w;
      best = t;
    }
  }
  return { ticker: best, weight: max };
}

export function buildObservationFromDashboard(
  data: DashboardData,
  cashOverride?: number,
): ObservationVector {
  const last = data.price_history[data.price_history.length - 1];
  if (!last) {
    return [data.initial_balance, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as ObservationVector;
  }

  const portfolioValue =
    data.agent_history[data.agent_history.length - 1] ?? data.initial_balance;
  const invested = RL_TICKERS.reduce(
    (s, t) => s + (data.current_allocation[t] ?? 0),
    0,
  );
  const cash =
    cashOverride ?? Math.max(0, portfolioValue * Math.max(0, 1 - invested));
  const shares = RL_TICKERS.map((t) => {
    const weight = data.current_allocation[t] ?? 0;
    const price = last[t];
    if (!price) return 0;
    return (portfolioValue * weight) / price;
  });
  const prices = RL_TICKERS.map((t) => last[t]);

  return [cash, ...shares, ...prices] as ObservationVector;
}

/** Index into price_history for current replay day or latest bar. */
export function currentMarketBarIndex(
  data: DashboardData,
  replayActive: boolean,
  replayIndex: number,
): number {
  if (replayActive && data.price_history.length > 0) {
    return Math.min(replayIndex, data.price_history.length - 1);
  }
  return data.price_history.length - 1;
}

export function latestPrices(
  data: DashboardData,
  barIndex?: number,
): Record<Ticker, number> {
  const idx = barIndex ?? data.price_history.length - 1;
  const last = data.price_history[idx];
  if (!last) {
    return { AAPL: 0, MSFT: 0, GOOGL: 0, AMZN: 0, NVDA: 0 };
  }
  return {
    AAPL: last.AAPL,
    MSFT: last.MSFT,
    GOOGL: last.GOOGL,
    AMZN: last.AMZN,
    NVDA: last.NVDA,
  };
}

export function priceChangePct(
  data: DashboardData,
  ticker: Ticker,
  lookback = 5,
  barIndex?: number,
): number {
  const hist = data.price_history;
  const endIdx = barIndex ?? hist.length - 1;
  if (hist.length < lookback + 1 || endIdx < lookback) return 0;
  const end = hist[endIdx][ticker];
  const start = hist[endIdx - lookback][ticker];
  if (!start) return 0;
  return (end - start) / start;
}

export function portfolioMetrics(data: DashboardData) {
  const agentReturn = computeReturn(data.agent_history);
  const benchmarkReturn = computeReturn(data.benchmark_history);
  const portfolioValue = data.agent_history[data.agent_history.length - 1] ?? 0;
  const benchmarkValue =
    data.benchmark_history[data.benchmark_history.length - 1] ?? 0;
  const weights = allocationsArray(data.current_allocation);
  const cashEstimate = portfolioValue * (1 - weights.reduce((a, b) => a + b, 0));

  return {
    portfolioValue,
    benchmarkValue,
    agentReturn,
    benchmarkReturn,
    alpha: agentReturn - benchmarkReturn,
    cashEstimate: Math.max(0, cashEstimate),
    activeAllocation: weights.reduce((a, b) => a + b, 0),
  };
}

export function buildRebalanceQueue(
  current: AllocationWeights,
  target: number[],
  guardrails: GuardrailConfig,
  ppoTarget?: number[],
): RebalanceOrder[] {
  return RL_TICKERS.map((ticker, i) => {
    const currentWeight = current[ticker] ?? 0;
    const targetWeight = target[i] ?? 0;
    const ppoTargetWeight = ppoTarget?.[i] ?? targetWeight;
    const delta = targetWeight - currentWeight;
    let status: RebalanceOrder["status"] = "pending";
    let reason: string | undefined;

    if (Math.abs(delta) < 0.005) {
      status = "simulated";
      reason = "Within tolerance";
    } else if (targetWeight > guardrails.maxSingleAssetAllocation) {
      status = "blocked";
      reason = "Max single-asset allocation";
    } else if (Math.abs(delta) > guardrails.maxRebalanceSize) {
      status = "blocked";
      reason = "Max rebalance size";
    } else {
      status = "approved";
    }

    return {
      id: `${ticker}-${i}`,
      ticker,
      currentWeight,
      targetWeight,
      ppoTargetWeight,
      delta,
      status,
      reason,
    };
  });
}

export function riskUtilization(
  weights: AllocationWeights,
  guardrails: GuardrailConfig,
  riskMultiplier = 1,
): number {
  const arr = allocationsArray(weights);
  const maxWeight = Math.max(...arr, 0);
  const limit = guardrails.maxSingleAssetAllocation / Math.max(riskMultiplier, 0.01);
  return maxWeight / limit;
}
