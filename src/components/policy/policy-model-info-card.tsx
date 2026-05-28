"use client";

import { Panel } from "@/components/dashboard/panel";
import { DEFAULT_API_URL, POLICY_MODEL_INFO, RL_TICKERS } from "@/lib/constants";
import { useDashboardStore } from "@/store/dashboard-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SpecItem({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[10px] text-zinc-500">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-[11px] font-medium text-zinc-200",
          mono && "font-mono text-[10px] font-normal text-zinc-300",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function PolicyModelInfoCard({ onRunInference }: { onRunInference: () => void }) {
  const lastPrediction = useDashboardStore((s) => s.lastPrediction);
  const universe = RL_TICKERS.join(" · ");
  const endpointHost = DEFAULT_API_URL.replace(/^https?:\/\//, "");

  return (
    <Panel
      title="Model Info"
      subtitle="PPO policy · research demo"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col p-3"
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
        <SpecItem label="Algorithm" value={POLICY_MODEL_INFO.algorithm} />
        <SpecItem label="Runtime" value={POLICY_MODEL_INFO.runtime} />
        <SpecItem
          label="Observation dim"
          value={String(POLICY_MODEL_INFO.observationDim)}
          mono
        />
        <SpecItem label="Action dim" value={String(POLICY_MODEL_INFO.actionDim)} mono />
      </dl>

      <div className="mt-3 border-t border-zinc-800/60 pt-3">
        <p className="text-[10px] text-zinc-500">Universe</p>
        <p className="mt-0.5 font-mono text-[10px] leading-snug text-zinc-300">{universe}</p>
      </div>

      <div className="mt-3">
        <p className="text-[10px] text-zinc-500">Endpoint</p>
        <p
          className="mt-0.5 break-all font-mono text-[10px] leading-snug text-zinc-400"
          title={DEFAULT_API_URL}
        >
          POST /api/predict → {endpointHost}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-zinc-800/70 pt-3">
        <Badge
          variant="outline"
          className={
            lastPrediction?.isLive
              ? "border-emerald-500/40 text-[10px] text-emerald-400"
              : "border-amber-500/40 text-[10px] text-amber-400"
          }
        >
          {lastPrediction?.isLive ? "Live ONNX" : "Demo fallback"}
        </Badge>
        <Button size="sm" className="h-7 text-xs" onClick={onRunInference}>
          Run policy inference
        </Button>
        <span className="text-[10px] text-zinc-600">
          {lastPrediction?.fetchedAt
            ? `Last run ${new Date(lastPrediction.fetchedAt).toLocaleTimeString()}`
            : "No inference this session"}
        </span>
      </div>
    </Panel>
  );
}
