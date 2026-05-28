"use client";

import { AgentPersonaIcon } from "@/components/dashboard/agent-persona-icons";
import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import { Panel } from "@/components/dashboard/panel";
import { getAgentPersona } from "@/lib/agent-persona";
import { portfolioMetrics } from "@/lib/dashboard-math";
import { formatAllocation } from "@/lib/format";
import { deriveAiSignal, deriveTickerSignals } from "@/lib/signal-engine";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboard-store";
import { Badge } from "@/components/ui/badge";

function MetricCell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("dash-metric-cell", className)}>
      <p className="dash-metric-label">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function AiSignalEnginePanel() {
  const { dashboard, strategyMode } = useDashboardStore();
  const data = dashboard?.data;
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return (
      <Panel title="AI Signal Engine" className="h-full min-h-[340px]">
        Loading…
      </Panel>
    );
  }

  const m = portfolioMetrics(data);
  const ai = deriveAiSignal(data, resolved.adjustedTargets, {
    agentReturn: m.agentReturn,
    benchmarkReturn: m.benchmarkReturn,
    strategyMode,
    strategyModeLabel: resolved.modeConfig.label,
  });
  const rows = deriveTickerSignals(
    data.current_allocation,
    resolved.adjustedTargets,
  );
  const leadBias = rows
    .filter((r) => r.bias !== "Hold")
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const persona = getAgentPersona(strategyMode);

  const signalCardClass =
    ai.mainSignal === "REBALANCE" || ai.mainSignal === "INCREASE"
      ? "dash-signal-card is-rebalance"
      : ai.mainSignal === "REDUCE"
        ? "dash-signal-card is-reduce"
        : "dash-signal-card";

  const sentimentTone =
    ai.marketSentiment === "Bullish"
      ? "text-[var(--positive)]"
      : ai.marketSentiment === "Bearish"
        ? "text-[var(--negative)]"
        : "text-[var(--wasabi)]";

  return (
    <Panel
      title="AI Signal Engine"
      subtitle="Mode-adjusted signal from PPO target allocations"
      className="h-full min-h-[340px]"
      bodyClassName="flex h-full min-h-0 flex-col gap-3"
      action={
        <Badge variant="outline" className="border-[rgba(128,144,118,0.2)] bg-[var(--emerald)] text-[10px] text-[var(--wasabi)]">
          Paper · Simulated
        </Badge>
      }
    >
      {/* Top decision row */}
      <div className="grid shrink-0 grid-cols-1 gap-3 min-[420px]:grid-cols-[1.2fr_0.8fr]">
        <div className={cn("flex h-full min-h-[88px] flex-col px-3.5 py-3", signalCardClass)}>
          <p className="dash-metric-label">Current Signal</p>
          <p className="dash-signal-title mt-1">{ai.mainSignalLabel}</p>
          <p className="mt-auto pt-1 text-[11px] leading-snug text-[var(--wasabi)]">
            Focus:{" "}
            <span className="font-mono font-medium text-[var(--khaki)]">{ai.focusAsset}</span>
            {leadBias ? (
              <span className="text-[var(--earth)]"> · {leadBias.signalLabel}</span>
            ) : null}
          </p>
        </div>

        <div
          className={cn(
            "flex h-full min-h-[88px] items-start gap-2.5 rounded-md border px-3 py-3",
            persona.ring,
            persona.surface,
          )}
        >
          <AgentPersonaIcon mode={strategyMode} className={cn("size-9 shrink-0", persona.accent)} />
          <div className="min-w-0 flex-1">
            <p className="dash-metric-label">Agent Mode</p>
            <p className={cn("mt-0.5 text-base font-semibold leading-tight", persona.accent)}>
              {persona.label}
            </p>
            <p className="mt-1 text-[10px] leading-snug text-[var(--wasabi)]">{persona.posture}</p>
          </div>
        </div>
      </div>

      {/* Metrics 2×2 */}
      <div className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
        <MetricCell label="Confidence">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--noir-3)]">
              <div
                className="h-full rounded-full bg-[var(--earth)]"
                style={{ width: `${ai.confidence}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-sm text-[var(--khaki)]">{ai.confidence}%</span>
          </div>
        </MetricCell>
        <MetricCell label="Regime">
          <p className="text-sm leading-snug text-zinc-200">{ai.regime}</p>
        </MetricCell>
        <MetricCell label="Market Sentiment">
          <p className={cn("text-sm font-medium leading-snug", sentimentTone)}>
            {ai.marketSentiment}
          </p>
        </MetricCell>
        <MetricCell label="Top Recommendation">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-[var(--khaki)]">
            {ai.topRecommendation}
          </p>
        </MetricCell>
      </div>

      {/* Thesis — fills remaining height */}
      <div className="flex min-h-0 flex-1 flex-col rounded-md border border-[rgba(128,144,118,0.12)] bg-[rgba(17,26,25,0.35)] px-3 py-2.5">
        <p className="dash-metric-label shrink-0">Thesis</p>
        <p className="mt-2 flex-1 text-[11px] font-light leading-relaxed text-[var(--wasabi)]">
          {ai.thesis}
        </p>
        <div className="mt-3 shrink-0 space-y-1 border-t border-zinc-800/70 pt-2.5">
          {leadBias ? (
            <p className="text-[10px] text-zinc-400">
              Largest adjusted delta:{" "}
              <span className="font-mono text-zinc-200">{leadBias.ticker}</span>{" "}
              <span className="font-mono text-[var(--negative)]">
                {formatAllocation(leadBias.delta)}
              </span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] leading-snug text-zinc-600">
            <span>Raw PPO target preserved</span>
            <span className="text-zinc-700">·</span>
            <span>Dashboard signal uses mode-adjusted target</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
