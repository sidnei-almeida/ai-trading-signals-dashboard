import { INITIAL_BALANCE, RL_TICKERS, TRANSACTION_COST } from "@/lib/constants";
import type { MarketDataRow } from "@/lib/market-csv";
import type {
  AllocationWeights,
  DashboardData,
  ObservationVector,
  Ticker,
} from "@/types/rl-trading";

export interface PortfolioState {
  cash: number;
  shares: Record<Ticker, number>;
  allocation: AllocationWeights;
}

export interface ReplaySnapshot {
  index: number;
  portfolioValue: number;
  benchmarkValue: number;
  observation: ObservationVector;
  prices: Record<Ticker, number>;
  portfolio: PortfolioState;
}

function equalAllocation(): AllocationWeights {
  const w = 1 / RL_TICKERS.length;
  return { AAPL: w, MSFT: w, GOOGL: w, AMZN: w, NVDA: w };
}

function pricesAtRow(row: MarketDataRow): Record<Ticker, number> {
  return { ...row.prices };
}

function portfolioValue(
  cash: number,
  shares: Record<Ticker, number>,
  prices: Record<Ticker, number>,
): number {
  return (
    cash +
    RL_TICKERS.reduce((sum, t) => sum + shares[t] * prices[t], 0)
  );
}

function weightsFromPortfolio(
  cash: number,
  shares: Record<Ticker, number>,
  prices: Record<Ticker, number>,
): AllocationWeights {
  const total = portfolioValue(cash, shares, prices);
  if (total <= 0) return equalAllocation();
  const weights = {} as AllocationWeights;
  for (const t of RL_TICKERS) {
    weights[t] = (shares[t] * prices[t]) / total;
  }
  return weights;
}

/** Equal-weight buy & hold from first row close prices. */
export function initBenchmarkShares(
  rows: MarketDataRow[],
  startingValue = INITIAL_BALANCE,
): Record<Ticker, number> {
  const first = rows[0];
  if (!first) {
    return { AAPL: 0, MSFT: 0, GOOGL: 0, AMZN: 0, NVDA: 0 };
  }
  const dollarsPer = startingValue / RL_TICKERS.length;
  const shares = {} as Record<Ticker, number>;
  for (const t of RL_TICKERS) {
    shares[t] = dollarsPer / first.prices[t];
  }
  return shares;
}

/** Initialize paper portfolio with equal-weight holdings at replay start. */
export function initPortfolioAtRow(
  row: MarketDataRow,
  startingCash = INITIAL_BALANCE,
): PortfolioState {
  const prices = pricesAtRow(row);
  const targetDollars = startingCash / RL_TICKERS.length;
  const shares = {} as Record<Ticker, number>;
  let cash = startingCash;

  for (const t of RL_TICKERS) {
    const sh = targetDollars / prices[t];
    shares[t] = sh;
    cash -= sh * prices[t];
  }

  return {
    cash: Math.max(0, cash),
    shares,
    allocation: weightsFromPortfolio(cash, shares, prices),
  };
}

export function buildObservation(
  portfolio: PortfolioState,
  prices: Record<Ticker, number>,
): ObservationVector {
  return [
    portfolio.cash,
    portfolio.shares.AAPL,
    portfolio.shares.MSFT,
    portfolio.shares.GOOGL,
    portfolio.shares.AMZN,
    portfolio.shares.NVDA,
    prices.AAPL,
    prices.MSFT,
    prices.GOOGL,
    prices.AMZN,
    prices.NVDA,
  ];
}

export function rebalanceToTargets(
  portfolio: PortfolioState,
  prices: Record<Ticker, number>,
  targetWeights: number[],
): PortfolioState {
  const total = portfolioValue(portfolio.cash, portfolio.shares, prices);
  let cash = portfolio.cash;
  const shares = { ...portfolio.shares };

  const targetShares = RL_TICKERS.map((t, i) => {
    const targetValue = total * (targetWeights[i] ?? 0);
    return targetValue / prices[t];
  });

  const tradeValue = RL_TICKERS.reduce((sum, t, i) => {
    const delta = targetShares[i] - shares[t];
    return sum + delta * prices[t];
  }, 0);
  const fees = TRANSACTION_COST * Math.abs(tradeValue);

  for (let i = 0; i < RL_TICKERS.length; i++) {
    const t = RL_TICKERS[i];
    const deltaShares = targetShares[i] - shares[t];
    cash -= deltaShares * prices[t];
    shares[t] = targetShares[i];
  }
  cash -= fees;

  return {
    cash: Math.max(0, cash),
    shares,
    allocation: weightsFromPortfolio(cash, shares, prices),
  };
}

export function benchmarkValueAtRow(
  benchmarkShares: Record<Ticker, number>,
  row: MarketDataRow,
): number {
  return RL_TICKERS.reduce(
    (sum, t) => sum + benchmarkShares[t] * row.prices[t],
    0,
  );
}

export class StooqReplayEngine {
  private index = 0;
  private portfolio: PortfolioState;
  private readonly benchmarkShares: Record<Ticker, number>;
  readonly rows: MarketDataRow[];
  agentHistory: number[] = [];
  benchmarkHistory: number[] = [];
  priceHistory: DashboardData["price_history"] = [];

  constructor(rows: MarketDataRow[], startingCash = INITIAL_BALANCE) {
    this.rows = rows;
    this.benchmarkShares = initBenchmarkShares(rows, startingCash);
    this.portfolio =
      rows.length > 0
        ? initPortfolioAtRow(rows[0], startingCash)
        : {
            cash: startingCash,
            shares: { AAPL: 0, MSFT: 0, GOOGL: 0, AMZN: 0, NVDA: 0 },
            allocation: equalAllocation(),
          };
  }

  get currentIndex(): number {
    return this.index;
  }

  get rowCount(): number {
    return this.rows.length;
  }

  get portfolioState(): PortfolioState {
    return this.portfolio;
  }

  reset(): void {
    this.index = 0;
    this.agentHistory = [];
    this.benchmarkHistory = [];
    this.priceHistory = [];
    this.portfolio =
      this.rows.length > 0
        ? initPortfolioAtRow(this.rows[0], INITIAL_BALANCE)
        : this.portfolio;
  }

  snapshot(): ReplaySnapshot | null {
    const row = this.rows[this.index];
    if (!row) return null;
    const prices = pricesAtRow(row);
    return {
      index: this.index,
      portfolioValue: portfolioValue(
        this.portfolio.cash,
        this.portfolio.shares,
        prices,
      ),
      benchmarkValue: benchmarkValueAtRow(this.benchmarkShares, row),
      observation: buildObservation(this.portfolio, prices),
      prices,
      portfolio: {
        ...this.portfolio,
        allocation: weightsFromPortfolio(
          this.portfolio.cash,
          this.portfolio.shares,
          prices,
        ),
      },
    };
  }

  /** Record current row into history buffers without advancing. */
  recordCurrent(): void {
    const row = this.rows[this.index];
    if (!row) return;
    const prices = pricesAtRow(row);
    this.agentHistory.push(
      portfolioValue(this.portfolio.cash, this.portfolio.shares, prices),
    );
    this.benchmarkHistory.push(benchmarkValueAtRow(this.benchmarkShares, row));
    this.priceHistory.push({
      Date: row.date,
      AAPL: row.prices.AAPL,
      MSFT: row.prices.MSFT,
      GOOGL: row.prices.GOOGL,
      AMZN: row.prices.AMZN,
      NVDA: row.prices.NVDA,
    });
  }

  applyTargets(targetWeights: number[]): void {
    const row = this.rows[this.index];
    if (!row) return;
    this.portfolio = rebalanceToTargets(
      this.portfolio,
      pricesAtRow(row),
      targetWeights,
    );
  }

  /** Advance to next trading day. Returns false at end of series. */
  advance(): boolean {
    if (this.index >= this.rows.length - 1) return false;
    this.index += 1;
    return true;
  }

  isAtEnd(): boolean {
    return this.index >= this.rows.length - 1;
  }
}
