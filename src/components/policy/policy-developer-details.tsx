"use client";

import { INFERENCE_RUNTIME_LABEL } from "@/lib/constants";
import { useDashboardStore } from "@/store/dashboard-store";
import type { ObservationVector } from "@/types/rl-trading";

const API_CONTRACT = [
  { method: "GET /api/health", note: "Service status and model load state" },
  { method: "GET /api/agent/status", note: "Agent state, balance, daily P&L" },
  { method: "GET /api/portfolio/history", note: "Equity curve for charts" },
  { method: "GET /api/guardrails · /api/strategy", note: "Risk limits and operating mode" },
  { method: "POST /api/predict", note: "11-D observation → raw_action + allocations" },
] as const;

export function PolicyDeveloperDetails({
  observation,
}: {
  observation: ObservationVector;
}) {
  const lastPrediction = useDashboardStore((s) => s.lastPrediction);

  return (
    <details className="rounded-lg border border-zinc-800/90 bg-[#11151a]/90">
      <summary className="cursor-pointer px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 marker:content-none [&::-webkit-details-marker]:hidden">
        Developer Details
      </summary>
      <div className="space-y-4 border-t border-zinc-800/80 px-4 py-3 text-[11px]">
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Full observation vector
          </p>
          <pre className="overflow-x-auto rounded bg-zinc-950/80 p-2 font-mono text-[10px] text-zinc-400">
            {JSON.stringify(observation, null, 2)}
          </pre>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Request payload
          </p>
          <pre className="overflow-x-auto rounded bg-zinc-950/80 p-2 font-mono text-[10px] text-zinc-400">
            {JSON.stringify({ observation: [...observation] }, null, 2)}
          </pre>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Raw response
          </p>
          <pre className="overflow-x-auto rounded bg-zinc-950/80 p-2 font-mono text-[10px] text-zinc-400">
            {lastPrediction
              ? JSON.stringify(lastPrediction.result, null, 2)
              : "No inference run yet."}
          </pre>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            API contract
          </p>
          <ul className="space-y-1.5">
            {API_CONTRACT.map((row) => (
              <li key={row.method} className="text-zinc-500">
                <span className="font-mono text-zinc-300">{row.method}</span>
                <span className="text-zinc-600"> — </span>
                {row.note}
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-[10px] text-zinc-600">
            Inference: {INFERENCE_RUNTIME_LABEL}
          </p>
        </div>
      </div>
    </details>
  );
}
