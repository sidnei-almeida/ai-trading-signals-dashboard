import { INITIAL_BALANCE, TRANSACTION_COST } from "@/lib/constants";
import { hasDatabase } from "@/lib/db/client";
import {
  backtestFingerprint,
  findBacktestRun,
  saveBacktestRun,
} from "@/lib/db/backtest-repo";
import { loadMarketCloses, upsertMarketBars } from "@/lib/db/market-repo";
import { loadMarketData } from "@/lib/market-csv";
import { runPpoBacktest, type BacktestBar } from "@/lib/ppo/backtest";
import { PPO_MODEL_INFO } from "@/lib/ppo/policy";
import type { DashboardData, DataSource } from "@/types/rl-trading";

export interface DashboardSyncResult {
  data: DashboardData;
  /** Where the served payload came from. */
  storage: "postgres" | "in_process";
  /** Bars written to Postgres on this call (0 when already current). */
  barsWritten: number;
  /** True when the PPO backtest had to be recomputed rather than read back. */
  backtestComputed: boolean;
  barCount: number;
  computedAt: string | null;
}

function toDashboardData(params: {
  dataSource: DataSource;
  startingCash: number;
  transactionCost: number;
  bars: BacktestBar[];
  agentHistory: number[];
  benchmarkHistory: number[];
  currentAllocation: DashboardData["current_allocation"];
}): DashboardData {
  return {
    tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"],
    data_source: params.dataSource,
    initial_balance: params.startingCash,
    transaction_cost: params.transactionCost,
    current_allocation: params.currentAllocation,
    agent_history: params.agentHistory,
    benchmark_history: params.benchmarkHistory,
    price_history: params.bars.map((bar) => ({
      Date: bar.date,
      AAPL: bar.prices.AAPL,
      MSFT: bar.prices.MSFT,
      GOOGL: bar.prices.GOOGL,
      AMZN: bar.prices.AMZN,
      NVDA: bar.prices.NVDA,
    })),
  };
}

/**
 * Bring Postgres up to date with the bundled CSV, then serve the dashboard from
 * Postgres.
 *
 * Called on every dashboard boot, but the writes are conditional: bars are
 * re-uploaded only when the CSV holds a different range than the database, and
 * the PPO backtest is recomputed only when no stored run matches the current
 * fingerprint (model checkpoint + cash + cost + exact bar range).
 *
 * Falls back to an in-process CSV run when no database is configured, so local
 * development and preview deploys still work without `NEON_POSTGRES`.
 */
export async function syncDashboardData(
  startingCash = INITIAL_BALANCE,
): Promise<DashboardSyncResult | null> {
  const csv = await loadMarketData();

  if (!hasDatabase()) {
    if (csv.rows.length === 0) return null;
    const backtest = runPpoBacktest(csv.rows, startingCash);
    return {
      data: toDashboardData({
        dataSource: csv.dataSource,
        startingCash,
        transactionCost: TRANSACTION_COST,
        bars: csv.rows,
        agentHistory: backtest.agent_history,
        benchmarkHistory: backtest.benchmark_history,
        currentAllocation: backtest.current_allocation,
      }),
      storage: "in_process",
      barsWritten: 0,
      backtestComputed: true,
      barCount: csv.rows.length,
      computedAt: new Date().toISOString(),
    };
  }

  // 1 — what Postgres already holds. This is the served source of truth, and
  // comparing it to the CSV is also the freshness check, so the common case
  // costs one query rather than a separate count.
  let bars = await loadMarketCloses();

  const csvLast = csv.rows[csv.rows.length - 1]?.date ?? null;
  const stale =
    csv.rows.length > 0 &&
    (bars.length !== csv.rows.length ||
      bars[bars.length - 1]?.date !== csvLast);

  // 2 — bring the table in line with the CSV when the range differs.
  let barsWritten = 0;
  if (stale) {
    barsWritten = await upsertMarketBars(csv.rows, csv.source);
    bars = await loadMarketCloses();
  }

  if (bars.length === 0) return null;

  const dataSource: DataSource = csv.dataSource;

  const fingerprint = backtestFingerprint({
    modelSha256: PPO_MODEL_INFO.sha256,
    dataSource,
    startingCash,
    transactionCost: TRANSACTION_COST,
    firstDate: bars[0].date,
    lastDate: bars[bars.length - 1].date,
    barCount: bars.length,
  });

  // 3 — reuse the stored run when one matches, otherwise compute and store it.
  const existing = await findBacktestRun(fingerprint);
  if (existing && existing.dates.length === bars.length) {
    return {
      data: toDashboardData({
        dataSource: existing.dataSource,
        startingCash: existing.startingCash,
        transactionCost: existing.transactionCost,
        bars,
        agentHistory: existing.agentHistory,
        benchmarkHistory: existing.benchmarkHistory,
        currentAllocation: existing.currentAllocation,
      }),
      storage: "postgres",
      barsWritten,
      backtestComputed: false,
      barCount: bars.length,
      computedAt: existing.computedAt,
    };
  }

  const backtest = runPpoBacktest(bars, startingCash);

  await saveBacktestRun({
    fingerprint,
    modelSha256: PPO_MODEL_INFO.sha256,
    dataSource,
    startingCash,
    transactionCost: TRANSACTION_COST,
    currentAllocation: backtest.current_allocation,
    dates: bars.map((b) => b.date),
    agentHistory: backtest.agent_history,
    benchmarkHistory: backtest.benchmark_history,
  });

  return {
    data: toDashboardData({
      dataSource,
      startingCash,
      transactionCost: TRANSACTION_COST,
      bars,
      agentHistory: backtest.agent_history,
      benchmarkHistory: backtest.benchmark_history,
      currentAllocation: backtest.current_allocation,
    }),
    storage: "postgres",
    barsWritten,
    backtestComputed: true,
    barCount: bars.length,
    computedAt: new Date().toISOString(),
  };
}
