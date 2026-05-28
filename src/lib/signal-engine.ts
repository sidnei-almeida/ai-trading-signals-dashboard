import { RL_TICKERS } from "@/lib/constants";
import { allocationsArray, topWeightedTicker } from "@/lib/dashboard-math";
import { modeThesisNote } from "@/lib/operating-modes";
import type {
  AllocationWeights,
  DashboardData,
  StrategyMode,
  Ticker,
} from "@/types/rl-trading";

export const ALLOCATION_DELTA_THRESHOLD = 0.03;

export type TickerBias = "Increase" | "Reduce" | "Hold";
export type MainSignalType = "REBALANCE" | "HOLD" | "REDUCE" | "INCREASE";

export interface TickerSignalRow {
  ticker: Ticker;
  current: number;
  target: number;
  delta: number;
  bias: TickerBias;
  signalLabel: string;
}

export interface AiSignalSummary {
  mainSignal: MainSignalType;
  mainSignalLabel: string;
  focusAsset: Ticker;
  confidence: number;
  thesis: string;
  topRecommendation: string;
  marketSentiment: "Bullish" | "Bearish" | "Neutral";
  regime: string;
  derivedFromPolicy: boolean;
  strategyModeLabel: string;
  modeThesis: string;
}

function biasFromDelta(delta: number): TickerBias {
  if (delta > ALLOCATION_DELTA_THRESHOLD) return "Increase";
  if (delta < -ALLOCATION_DELTA_THRESHOLD) return "Reduce";
  return "Hold";
}

function signalLabelFromBias(bias: TickerBias): string {
  if (bias === "Increase") return "Buy Bias";
  if (bias === "Reduce") return "Sell Bias";
  return "Hold";
}

export function getTargetAllocations(
  data: DashboardData,
  targetOverride?: number[],
): number[] {
  if (targetOverride?.length === RL_TICKERS.length) return targetOverride;
  return allocationsArray(data.current_allocation);
}

export function targetToWeights(target: number[]): AllocationWeights {
  return {
    AAPL: target[0] ?? 0,
    MSFT: target[1] ?? 0,
    GOOGL: target[2] ?? 0,
    AMZN: target[3] ?? 0,
    NVDA: target[4] ?? 0,
  };
}

export function deriveTickerSignals(
  current: AllocationWeights,
  target: number[],
): TickerSignalRow[] {
  return RL_TICKERS.map((ticker, i) => {
    const currentW = current[ticker] ?? 0;
    const targetW = target[i] ?? 0;
    const delta = targetW - currentW;
    const bias = biasFromDelta(delta);
    return {
      ticker,
      current: currentW,
      target: targetW,
      delta,
      bias,
      signalLabel: signalLabelFromBias(bias),
    };
  });
}

export function deriveAiSignal(
  data: DashboardData,
  target: number[],
  options?: {
    agentReturn?: number;
    benchmarkReturn?: number;
    strategyMode?: StrategyMode;
    strategyModeLabel?: string;
  },
): AiSignalSummary {
  const rows = deriveTickerSignals(data.current_allocation, target);
  const top = topWeightedTicker(targetToWeights(target));

  const positive = rows.filter((r) => r.delta > ALLOCATION_DELTA_THRESHOLD);
  const negative = rows.filter((r) => r.delta < -ALLOCATION_DELTA_THRESHOLD);
  const maxDelta = rows.reduce(
    (best, r) => (Math.abs(r.delta) > Math.abs(best.delta) ? r : best),
    rows[0],
  );
  const maxWeight = Math.max(...target, 0);

  let mainSignal: MainSignalType = "HOLD";
  let mainSignalLabel = "Hold Allocation";
  let focusAsset = top.ticker;
  let thesis =
    "PPO policy suggests maintaining current portfolio weights — no material rebalance required.";

  if (maxWeight > 0.4) {
    mainSignal = "REDUCE";
    mainSignalLabel = "Reduce Exposure";
    focusAsset = top.ticker;
    thesis = `Concentration elevated in ${top.ticker} (${(maxWeight * 100).toFixed(0)}%). Consider trimming exposure per risk guardrails.`;
  } else if (positive.length > 0) {
    const lead = positive.sort((a, b) => b.delta - a.delta)[0];
    mainSignal = "REBALANCE";
    mainSignalLabel = "Rebalance";
    focusAsset = lead.ticker;
    thesis = `PPO policy favors increasing ${lead.ticker} allocation (+${(lead.delta * 100).toFixed(1)}%) under current portfolio state.`;
  } else if (negative.length > 0 && positive.length === 0) {
    mainSignal = "REDUCE";
    mainSignalLabel = "Reduce Exposure";
    focusAsset = negative.sort((a, b) => a.delta - b.delta)[0].ticker;
    thesis = `Policy suggests reducing weight in ${focusAsset} relative to current holdings.`;
  }

  const confidence = Math.min(
    98,
    Math.max(
      42,
      Math.round(Math.abs(maxDelta.delta) * 400 + maxWeight * 35),
    ),
  );

  const agentReturn = options?.agentReturn ?? 0;
  const benchmarkReturn = options?.benchmarkReturn ?? 0;
  let marketSentiment: AiSignalSummary["marketSentiment"] = "Neutral";
  if (agentReturn > benchmarkReturn + 0.005) marketSentiment = "Bullish";
  else if (agentReturn < benchmarkReturn - 0.005) marketSentiment = "Bearish";

  const regime =
    positive.length >= 2
      ? "Multi-asset rebalance"
      : mainSignal === "HOLD"
        ? "Steady state"
        : "Single-asset tilt";

  const topRecommendation =
    mainSignal === "HOLD"
      ? "Maintain current allocation mix"
      : `Shift toward ${focusAsset} (mode-adjusted target ${(target[RL_TICKERS.indexOf(focusAsset)] * 100).toFixed(1)}%)`;

  const modeLabel = options?.strategyModeLabel ?? "Balanced";
  const modeThesis = modeThesisNote(
    options?.strategyMode ?? "balanced",
    mainSignal === "HOLD",
  );

  return {
    mainSignal,
    mainSignalLabel,
    focusAsset,
    confidence,
    thesis: `${thesis} ${modeThesis}`,
    topRecommendation,
    marketSentiment,
    regime,
    derivedFromPolicy: true,
    strategyModeLabel: modeLabel,
    modeThesis,
  };
}

export function countOpenPositions(current: AllocationWeights): number {
  return RL_TICKERS.filter((t) => (current[t] ?? 0) > 0.02).length;
}

export function estimateDailyPnl(data: DashboardData): number {
  const hist = data.agent_history;
  if (hist.length < 2) return 0;
  return hist[hist.length - 1] - hist[hist.length - 2];
}

export function executionActionFromDelta(delta: number): string {
  if (delta > ALLOCATION_DELTA_THRESHOLD) return "Increase";
  if (delta < -ALLOCATION_DELTA_THRESHOLD) return "Reduce";
  return "Hold";
}
