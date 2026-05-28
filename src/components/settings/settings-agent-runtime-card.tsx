"use client";

import { Panel } from "@/components/dashboard/panel";
import { SpecLine } from "@/components/settings/settings-form";
import { POLICY_MODEL_INFO } from "@/lib/constants";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";

function RuntimeMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className={cn("mt-0.5 font-mono text-sm font-medium capitalize", tone ?? "text-zinc-200")}>
        {value}
      </p>
    </div>
  );
}

export function SettingsAgentRuntimeCard() {
  const agentState = useDashboardStore((s) => s.agentState);
  const activityCount = useDashboardStore((s) => s.activityLog.length);
  const lastPrediction = useDashboardStore((s) => s.lastPrediction);
  const replayActive = useDashboardStore((s) => s.replayActive);

  const inferenceLabel = lastPrediction
    ? lastPrediction.isLive
      ? "Live ONNX"
      : "Demo fallback"
    : "None";

  const stateTone =
    agentState === "running"
      ? "text-emerald-400/90"
      : agentState === "paused"
        ? "text-amber-400/90"
        : "text-zinc-400";

  return (
    <Panel
      title="Agent Runtime"
      subtitle="PPO · ONNX · read-only status"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <div className="grid gap-1.5 sm:grid-cols-2">
        <SpecLine label="Model" value={POLICY_MODEL_INFO.algorithm} />
        <SpecLine label="Runtime" value={POLICY_MODEL_INFO.runtime} />
        <SpecLine label="Observation dim" value={String(POLICY_MODEL_INFO.observationDim)} />
        <SpecLine label="Action dim" value={String(POLICY_MODEL_INFO.actionDim)} />
      </div>

      <p className="text-[10px] leading-snug text-zinc-600">
        {POLICY_MODEL_INFO.universe} — policy inference via dashboard BFF.
      </p>

      <div className="mt-auto border-t border-zinc-800/70 pt-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Operational status
        </p>
        <div className="grid grid-cols-2 gap-2">
          <RuntimeMetric label="Agent state" value={agentState} tone={stateTone} />
          <RuntimeMetric label="Replay" value={replayActive ? "Active" : "Idle"} />
          <RuntimeMetric label="Feed events" value={String(activityCount)} />
          <RuntimeMetric label="Last inference" value={inferenceLabel} />
        </div>
      </div>
    </Panel>
  );
}
