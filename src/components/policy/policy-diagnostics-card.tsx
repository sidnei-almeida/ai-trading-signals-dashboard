"use client";

import { Panel } from "@/components/dashboard/panel";
import { DEFAULT_API_URL, POLICY_MODEL_INFO, RL_TICKERS } from "@/lib/constants";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";

function GridItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] text-zinc-500">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 break-all font-mono text-[10px] leading-snug text-zinc-300",
          valueClassName,
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

export function PolicyDiagnosticsCard() {
  const lastPrediction = useDashboardStore((s) => s.lastPrediction);
  const error = useDashboardStore((s) => s.error);

  const inferenceStatus = error ? "Error" : lastPrediction ? "OK" : "Not run";
  const statusTone =
    inferenceStatus === "OK"
      ? "text-emerald-400/90"
      : inferenceStatus === "Error"
        ? "text-red-400/90"
        : "text-zinc-500";
  const source = lastPrediction?.isLive
    ? "FinSight API"
    : lastPrediction
      ? "Demo fallback"
      : "—";
  const lastInference = lastPrediction?.fetchedAt
    ? new Date(lastPrediction.fetchedAt).toLocaleString()
    : "—";

  return (
    <Panel
      title="Inference Diagnostics"
      subtitle="Request metadata"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <div className="grid grid-cols-3 gap-2 rounded-md border border-zinc-800/70 bg-zinc-950/40 px-2.5 py-2">
        <div>
          <p className="text-[10px] text-zinc-500">Request status</p>
          <p className={cn("mt-0.5 font-mono text-[11px] font-medium", statusTone)}>
            {inferenceStatus}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-zinc-500">Last inference</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-300" title={lastInference}>
            {lastInference}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Latency</p>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-600">—</p>
        </div>
      </div>

      <dl className="grid flex-1 grid-cols-2 content-start gap-x-4 gap-y-3">
        <GridItem label="Endpoint" value="POST /api/predict" />
        <GridItem
          label="Upstream"
          value={DEFAULT_API_URL.replace(/^https?:\/\//, "")}
        />
        <GridItem
          label="Observation dim"
          value={String(POLICY_MODEL_INFO.observationDim)}
        />
        <GridItem label="Universe size" value={String(RL_TICKERS.length)} />
        <GridItem label="Payload type" value="application/json" />
        <GridItem label="Response source" value={source} />
        <GridItem label="Envelope" value={lastPrediction?.source ?? "—"} />
      </dl>

      <p className="mt-auto border-t border-zinc-800/60 pt-2 text-[10px] leading-snug text-zinc-600">
        Diagnostics reflect the latest policy inference request.
      </p>
    </Panel>
  );
}
