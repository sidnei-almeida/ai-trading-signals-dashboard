"use client";

import { useResolvedTargets } from "@/hooks/use-resolved-targets";
import {
  countOpenPositions,
  deriveAiSignal,
  estimateDailyPnl,
} from "@/lib/signal-engine";
import { portfolioMetrics, riskUtilization } from "@/lib/dashboard-math";
import { formatCurrency, formatPercent } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboard-store";
import { cn } from "@/lib/utils";

function KpiCell({
  label,
  value,
  tone,
  accent,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "warning" | "muted" | "default";
  accent?: boolean;
}) {
  return (
    <div className={cn("kpi-card h-[76px] min-w-0 flex-1", accent && "accent")}>
      <p className="kpi-label">{label}</p>
      <p
        className={cn(
          "kpi-value truncate",
          tone === "positive" && "positive",
          tone === "negative" && "negative",
          tone === "warning" && "warning",
          tone === "muted" && "neutral",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function KpiStrip() {
  const { dashboard, agentState, strategyMode } = useDashboardStore();
  const data = dashboard?.data;
  const resolved = useResolvedTargets();

  if (!data || !resolved) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="kpi-card h-[76px] animate-pulse" />
        ))}
      </div>
    );
  }

  const m = portfolioMetrics(data);
  const ai = deriveAiSignal(data, resolved.adjustedTargets, {
    agentReturn: m.agentReturn,
    benchmarkReturn: m.benchmarkReturn,
    strategyMode,
    strategyModeLabel: resolved.modeConfig.label,
  });
  const dailyPnl = estimateDailyPnl(data);
  const risk = riskUtilization(
    data.current_allocation,
    resolved.guardrails,
    resolved.modeConfig.riskMultiplier,
  );
  const positions = countOpenPositions(data.current_allocation);

  const sentimentTone =
    ai.marketSentiment === "Bullish"
      ? "positive"
      : ai.marketSentiment === "Bearish"
        ? "negative"
        : "default";

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
      <KpiCell label="Net Worth" value={formatCurrency(m.portfolioValue)} />
      <KpiCell
        label="Daily P/L"
        value={formatCurrency(dailyPnl)}
        tone={dailyPnl >= 0 ? "positive" : "negative"}
        accent
      />
      <KpiCell label="Open Positions" value={String(positions)} />
      <KpiCell label="AI Signal" value={ai.mainSignalLabel} tone="warning" accent />
      <KpiCell label="Signal Confidence" value={`${ai.confidence}%`} />
      <KpiCell label="Market Sentiment" value={ai.marketSentiment} tone={sentimentTone} />
      <KpiCell
        label="Risk Exposure"
        value={formatPercent(risk)}
        tone={risk > 0.9 ? "warning" : "default"}
        accent
      />
      <KpiCell
        label="Operating Mode"
        value={`${resolved.modeConfig.label} · ${agentState}`}
        tone="muted"
      />
    </div>
  );
}
