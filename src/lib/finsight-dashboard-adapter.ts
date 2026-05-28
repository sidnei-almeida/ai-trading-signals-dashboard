import { buildDemoDashboardData } from "@/lib/demo-fallback";
import type {
  FinsightAgentStatus,
  FinsightExchangeStatus,
  FinsightGuardrails,
  FinsightStrategy,
} from "@/lib/finsight-api";
import {
  getAgentStatus,
  getExchangeStatus,
  getGuardrails,
  getPortfolioHistory,
  getStrategy,
} from "@/lib/finsight-api";
import { INITIAL_BALANCE, RL_TICKERS } from "@/lib/constants";
import type {
  AllocationWeights,
  DashboardData,
  DataSource,
  Ticker,
} from "@/types/rl-trading";

function strategyToAllocation(strategy: FinsightStrategy): AllocationWeights {
  const mode = (strategy.mode || "moderate").toLowerCase();
  const base: Record<Ticker, number> = {
    AAPL: 0.2,
    MSFT: 0.2,
    GOOGL: 0.2,
    AMZN: 0.2,
    NVDA: 0.2,
  };

  if (mode === "conservative") {
    return { AAPL: 0.28, MSFT: 0.26, GOOGL: 0.18, AMZN: 0.14, NVDA: 0.14 };
  }
  if (mode === "aggressive") {
    return { AAPL: 0.12, MSFT: 0.18, GOOGL: 0.18, AMZN: 0.22, NVDA: 0.3 };
  }
  return base;
}

function resolveDataSource(exchange: FinsightExchangeStatus): DataSource {
  if (exchange.test_mode) return "demo_local";
  if (exchange.exchange === "test") return "csv_fallback";
  return "yfinance";
}

export async function fetchFinsightDashboard(baseUrl?: string): Promise<{
  data: DashboardData;
  meta: {
    agent: FinsightAgentStatus;
    guardrails: FinsightGuardrails;
    strategy: FinsightStrategy;
    exchange: FinsightExchangeStatus;
    historyPoints: number;
  };
}> {
  const [agent, history, guardrails, strategy, exchange] = await Promise.all([
    getAgentStatus(baseUrl),
    getPortfolioHistory(365, baseUrl),
    getGuardrails(baseUrl),
    getStrategy(baseUrl),
    getExchangeStatus(baseUrl),
  ]);

  const demo = await buildDemoDashboardData();
  const dataSource = resolveDataSource(exchange);

  let agent_history = demo.agent_history;
  let benchmark_history = demo.benchmark_history;

  if (Array.isArray(history) && history.length > 0) {
    agent_history = history.map((p) => p.equity);
    const scale =
      agent_history[agent_history.length - 1] /
      (benchmark_history[benchmark_history.length - 1] || 1);
    benchmark_history = benchmark_history.map((v) => v * scale);
  } else if (agent.balance && agent.balance > 0) {
    const last = agent.balance;
    agent_history = agent_history.map((v, i, arr) => {
      const t = i / Math.max(arr.length - 1, 1);
      return INITIAL_BALANCE + (last - INITIAL_BALANCE) * t;
    });
  }

  const current_allocation = strategyToAllocation(strategy);

  const data: DashboardData = {
    tickers: [...RL_TICKERS],
    data_source: dataSource,
    initial_balance: INITIAL_BALANCE,
    transaction_cost: 0.001,
    current_allocation,
    agent_history,
    benchmark_history,
    price_history: demo.price_history,
  };

  return {
    data,
    meta: {
      agent,
      guardrails,
      strategy,
      exchange,
      historyPoints: history?.length ?? 0,
    },
  };
}
