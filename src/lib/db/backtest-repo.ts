import { getSql } from "@/lib/db/client";
import type { AllocationWeights, DataSource } from "@/types/rl-trading";

/** Points per statement — keeps each HTTP request to Neon a sane size. */
const INSERT_CHUNK = 5000;

export interface BacktestRunInput {
  fingerprint: string;
  modelSha256: string;
  dataSource: DataSource;
  startingCash: number;
  transactionCost: number;
  currentAllocation: AllocationWeights;
  dates: string[];
  agentHistory: number[];
  benchmarkHistory: number[];
}

export interface StoredBacktestRun {
  id: number;
  fingerprint: string;
  dataSource: DataSource;
  startingCash: number;
  transactionCost: number;
  currentAllocation: AllocationWeights;
  computedAt: string;
  dates: string[];
  agentHistory: number[];
  benchmarkHistory: number[];
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * Identity of a backtest: anything that changes the curves belongs here, so a
 * matching row can be served instead of re-running the policy.
 */
export function backtestFingerprint(parts: {
  modelSha256: string;
  dataSource: string;
  startingCash: number;
  transactionCost: number;
  firstDate: string;
  lastDate: string;
  barCount: number;
}): string {
  return [
    parts.modelSha256.slice(0, 16),
    parts.dataSource,
    parts.startingCash,
    parts.transactionCost,
    parts.firstDate,
    parts.lastDate,
    parts.barCount,
  ].join("|");
}

export async function findBacktestRun(
  fingerprint: string,
): Promise<StoredBacktestRun | null> {
  const sql = getSql();

  // Aggregating the curves server-side keeps this to a single round trip and
  // avoids shipping the run metadata once per point.
  const rows = (await sql`
    select
      r.id,
      r.fingerprint,
      r.data_source,
      r.starting_cash,
      r.transaction_cost,
      r.current_allocation,
      r.computed_at,
      array_agg(p.bar_date        order by p.idx) as dates,
      array_agg(p.agent_value     order by p.idx) as agent_values,
      array_agg(p.benchmark_value order by p.idx) as benchmark_values
    from backtest_runs r
    join backtest_points p on p.run_id = r.id
    where r.fingerprint = ${fingerprint}
    group by r.id
    limit 1
  `) as Array<{
    id: number;
    fingerprint: string;
    data_source: string;
    starting_cash: number;
    transaction_cost: number;
    current_allocation: AllocationWeights;
    computed_at: unknown;
    dates: unknown[];
    agent_values: unknown[];
    benchmark_values: unknown[];
  }>;

  const run = rows[0];
  if (!run || run.dates.length === 0) return null;

  return {
    id: run.id,
    fingerprint: run.fingerprint,
    dataSource: run.data_source as DataSource,
    startingCash: Number(run.starting_cash),
    transactionCost: Number(run.transaction_cost),
    currentAllocation: run.current_allocation,
    computedAt: new Date(run.computed_at as string).toISOString(),
    dates: run.dates.map(toIsoDate),
    agentHistory: run.agent_values.map(Number),
    benchmarkHistory: run.benchmark_values.map(Number),
  };
}

export async function saveBacktestRun(input: BacktestRunInput): Promise<number> {
  const sql = getSql();
  const { dates, agentHistory, benchmarkHistory } = input;

  if (dates.length === 0) {
    throw new Error("Refusing to store a backtest run with no points.");
  }

  const rows = (await sql`
    insert into backtest_runs (
      fingerprint, model_sha256, data_source, starting_cash, transaction_cost,
      first_date, last_date, bar_count,
      final_agent_value, final_benchmark_value, current_allocation
    ) values (
      ${input.fingerprint},
      ${input.modelSha256},
      ${input.dataSource},
      ${input.startingCash},
      ${input.transactionCost},
      ${dates[0]},
      ${dates[dates.length - 1]},
      ${dates.length},
      ${agentHistory[agentHistory.length - 1]},
      ${benchmarkHistory[benchmarkHistory.length - 1]},
      ${JSON.stringify(input.currentAllocation)}
    )
    on conflict (fingerprint) do update set
      computed_at           = now(),
      current_allocation    = excluded.current_allocation,
      final_agent_value     = excluded.final_agent_value,
      final_benchmark_value = excluded.final_benchmark_value
    returning id
  `) as Array<{ id: number }>;

  const runId = rows[0].id;

  // A conflicting fingerprint means the curves are identical by definition,
  // but clearing keeps a partially written run from leaving stale points.
  await sql`delete from backtest_points where run_id = ${runId}`;

  const statement = `
    insert into backtest_points (run_id, idx, bar_date, agent_value, benchmark_value)
    select $1::bigint, i, d, a, b
    from unnest($2::int[], $3::date[], $4::float8[], $5::float8[]) as u(i, d, a, b)`;

  const idx = dates.map((_, i) => i);

  for (let start = 0; start < dates.length; start += INSERT_CHUNK) {
    const end = Math.min(start + INSERT_CHUNK, dates.length);
    await sql.query(statement, [
      runId,
      idx.slice(start, end),
      dates.slice(start, end),
      agentHistory.slice(start, end),
      benchmarkHistory.slice(start, end),
    ]);
  }

  return runId;
}
