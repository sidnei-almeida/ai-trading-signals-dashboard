-- Neon Postgres schema for the RL portfolio dashboard.
-- Applied idempotently by `npm run db:migrate`.

-- Daily OHLCV bars, one row per (ticker, date). Seeded from data/sp500.csv or
-- data/market/prices.csv and refreshed when the dashboard boots.
create table if not exists market_bars (
  ticker     text             not null,
  bar_date   date             not null,
  open       double precision not null,
  high       double precision not null,
  low        double precision not null,
  close      double precision not null,
  volume     double precision not null default 0,
  source     text             not null,
  updated_at timestamptz      not null default now(),
  primary key (ticker, bar_date)
);

create index if not exists market_bars_date_idx on market_bars (bar_date);

-- One row per PPO backtest. `fingerprint` covers every input that changes the
-- curves (model checkpoint, cash, cost, and the exact bar range), so a boot can
-- reuse a stored run instead of recomputing 2.5k policy evaluations.
create table if not exists backtest_runs (
  id                    bigserial        primary key,
  fingerprint           text             not null unique,
  model_sha256          text             not null,
  data_source           text             not null,
  starting_cash         double precision not null,
  transaction_cost      double precision not null,
  first_date            date             not null,
  last_date             date             not null,
  bar_count             integer          not null,
  final_agent_value     double precision not null,
  final_benchmark_value double precision not null,
  current_allocation    jsonb            not null,
  computed_at           timestamptz      not null default now()
);

create index if not exists backtest_runs_computed_at_idx
  on backtest_runs (computed_at desc);

-- Equity curves for a run: agent vs buy & hold, one row per trading day.
create table if not exists backtest_points (
  run_id          bigint           not null
                                   references backtest_runs (id) on delete cascade,
  idx             integer          not null,
  bar_date        date             not null,
  agent_value     double precision not null,
  benchmark_value double precision not null,
  primary key (run_id, idx)
);
