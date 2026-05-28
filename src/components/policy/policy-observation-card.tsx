"use client";

import { Panel } from "@/components/dashboard/panel";
import { RL_TICKERS } from "@/lib/constants";
import { latestPrices } from "@/lib/dashboard-math";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";
import type { ObservationVector } from "@/types/rl-trading";

const SHARE_LABELS = [
  "AAPL shares",
  "MSFT shares",
  "GOOGL shares",
  "AMZN shares",
  "NVDA shares",
] as const;

const VECTOR_LABELS = [
  "Cash balance",
  ...SHARE_LABELS,
  "AAPL price",
  "MSFT price",
  "GOOGL price",
  "AMZN price",
  "NVDA price",
];

export function PolicyObservationCard({
  observation,
}: {
  observation: ObservationVector;
}) {
  const { dashboard, lastPrediction, settings } = useDashboardStore();
  const data = dashboard?.data;
  const dataFetchedAt = dashboard?.fetchedAt;

  if (!data) {
    return (
      <Panel title="Observation Snapshot" bodyClassName="p-3">
        <p className="text-xs text-zinc-500">Loading…</p>
      </Panel>
    );
  }

  const prices = latestPrices(data);
  const cash = observation[0];
  const totalShares = observation.slice(1, 6).reduce((s, v) => s + v, 0);
  const updatedAt = lastPrediction?.fetchedAt ?? dataFetchedAt;
  const requestReady = observation.length === 11;

  return (
    <Panel
      title="Observation Snapshot"
      subtitle="Structured input · POST /predict"
      bodyClassName="flex flex-col gap-3 p-3"
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div>
          <dt className="text-zinc-500">Cash balance</dt>
          <dd className="font-mono text-zinc-100">{formatCurrency(cash)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Total shares</dt>
          <dd className="font-mono text-zinc-100">{formatNumber(totalShares)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Observation length</dt>
          <dd className="font-mono text-zinc-200">{observation.length}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Request body</dt>
          <dd className={requestReady ? "text-emerald-400/90" : "text-amber-400/90"}>
            {requestReady ? "Ready" : "Incomplete"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500">Last updated</dt>
          <dd className="font-mono text-[10px] text-zinc-400">
            {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}
          </dd>
        </div>
      </dl>

      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Latest prices
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {RL_TICKERS.map((ticker) => (
            <div key={ticker} className="flex justify-between gap-2">
              <span className="font-mono text-zinc-500">{ticker}</span>
              <span className="font-mono text-zinc-200">{formatCurrency(prices[ticker])}</span>
            </div>
          ))}
        </div>
      </div>

      <details className="group border-t border-zinc-800/70 pt-2">
        <summary className="cursor-pointer list-none text-[10px] font-medium uppercase tracking-wide text-zinc-500 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">View raw observation</span>
          <span className="hidden group-open:inline">Hide raw observation</span>
        </summary>
        <ul className="mt-2 max-h-36 space-y-0.5 overflow-y-auto">
          {observation.map((val, i) => (
            <li
              key={VECTOR_LABELS[i]}
              className="flex justify-between gap-3 font-mono text-[10px]"
            >
              <span className="text-zinc-500">
                [{i}] {VECTOR_LABELS[i]}
              </span>
              <span className="text-zinc-300">{formatNumber(val)}</span>
            </li>
          ))}
        </ul>
        <pre className="mt-2 overflow-x-auto rounded bg-zinc-950/80 p-2 font-mono text-[10px] leading-relaxed text-zinc-500">
          {JSON.stringify({ observation: [...observation] }, null, 2)}
        </pre>
        <p className="mt-1 text-[10px] text-zinc-600">
          Cash override: {formatCurrency(settings.startingCash * 0.1)} (demo floor)
        </p>
      </details>
    </Panel>
  );
}
