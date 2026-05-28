"use client";

import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "warning" | "muted" | "default";
}) {
  return (
    <div className="dash-kpi h-[72px] min-w-0">
      <p className="dash-kpi-label">{label}</p>
      <p
        className={cn(
          "dash-kpi-value truncate text-sm",
          tone === "positive" && "is-positive",
          tone === "negative" && "is-negative",
          tone === "warning" && "is-warning",
          tone === "muted" && "is-muted",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PortfolioKpiStrip() {
  const a = usePortfolioAnalytics();
  if (!a.ready) return null;

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
      <Kpi label="Portfolio Value" value={formatCurrency(a.portfolioValue)} />
      <Kpi
        label="Agent Return"
        value={formatPercent(a.agentReturn)}
        tone={a.agentReturn >= 0 ? "positive" : "negative"}
      />
      <Kpi label="Benchmark Return" value={formatPercent(a.benchmarkReturn)} tone="muted" />
      <Kpi
        label="Alpha"
        value={formatPercent(a.alpha)}
        tone={a.alpha >= 0 ? "positive" : "negative"}
      />
      <Kpi label="Max Drawdown" value={formatPercent(a.drawdown.maxDrawdown)} tone="negative" />
      <Kpi label="Volatility" value={formatPercent(a.volatility)} />
      <Kpi
        label="Best Asset"
        value={a.bestAsset ? `${a.bestAsset.ticker} ${formatPercent(a.bestAsset.assetReturn)}` : "—"}
        tone="warning"
      />
      <Kpi
        label="Concentration"
        value={`${a.concentration.ticker} ${formatPercent(a.concentration.weight)}`}
      />
    </div>
  );
}
