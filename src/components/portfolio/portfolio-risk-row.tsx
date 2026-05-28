"use client";

import { DrawdownChart } from "@/components/charts/drawdown-chart";
import { ReturnDistributionChart } from "@/components/charts/return-distribution-chart";
import { Panel } from "@/components/dashboard/panel";
import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics";
import { formatPercent } from "@/lib/format";

export function PortfolioRiskRow() {
  const a = usePortfolioAnalytics();
  if (!a.ready) return null;

  return (
    <div className="grid items-stretch gap-5 lg:grid-cols-3">
      <Panel title="Drawdown Analysis" subtitle="Peak-to-trough · paper portfolio">
        <div className="mb-2 grid grid-cols-3 gap-2 text-[10px]">
          <Metric label="Max DD" value={formatPercent(a.drawdown.maxDrawdown)} tone="text-red-400" />
          <Metric label="Current DD" value={formatPercent(a.drawdown.currentDrawdown)} />
          <Metric
            label="Worst date"
            value={a.drawdown.worstDate ?? `#${a.drawdown.maxDrawdownIndex}`}
            mono={false}
          />
        </div>
        <DrawdownChart series={a.drawdown.series} />
      </Panel>

      <Panel title="Return Distribution" subtitle="Period-over-period returns">
        <div className="mb-2 grid grid-cols-2 gap-2 text-[10px]">
          <Metric label="Avg period" value={formatPercent(a.returnDist.averageReturn)} />
          <Metric label="Positive %" value={formatPercent(a.returnDist.positivePct)} tone="text-emerald-400" />
          <Metric label="Negative %" value={formatPercent(a.returnDist.negativePct)} tone="text-red-400/90" />
          <Metric label="Best / Worst" value={`${formatPercent(a.returnDist.bestPeriod)} / ${formatPercent(a.returnDist.worstPeriod)}`} />
        </div>
        <ReturnDistributionChart dist={a.returnDist} />
      </Panel>

      <Panel
        title="Risk Metrics"
        subtitle="Derived from paper portfolio history"
        className="h-full"
        bodyClassName="flex h-full min-h-0 flex-col gap-3.5"
      >
        <div className="grid min-h-0 flex-1 grid-cols-3 content-center gap-x-4 gap-y-5">
          <RiskMetricBlock
            label="Volatility"
            value={formatPercent(a.risk.volatility)}
          />
          <RiskMetricBlock
            label="Win rate"
            value={formatPercent(a.risk.positivePeriodRatio)}
            tone={
              a.risk.positivePeriodRatio > 0.5
                ? "text-emerald-400"
                : "text-zinc-200"
            }
          />
          <RiskMetricBlock
            label="Max drawdown"
            value={formatPercent(a.risk.maxDrawdown)}
            tone="text-red-400/90"
          />
          <RiskMetricBlock
            label="Downside vol."
            value={formatPercent(a.risk.downsideVolatility)}
          />
          <RiskMetricBlock
            label="Best period"
            value={formatPercent(a.risk.bestPeriod)}
            tone="text-emerald-400"
          />
          <RiskMetricBlock
            label="Worst period"
            value={formatPercent(a.risk.worstPeriod)}
            tone="text-red-400/90"
          />
        </div>
        <p className="mt-auto shrink-0 border-t border-zinc-800/70 pt-2.5 text-[10px] leading-snug text-zinc-600">
          Research metrics only — not live risk management or investment advice.
        </p>
      </Panel>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  mono = true,
}: {
  label: string;
  value: string;
  tone?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-zinc-500">{label}</p>
      <p className={`mt-0.5 text-xs ${mono ? "font-mono" : ""} ${tone ?? "text-zinc-200"}`}>
        {value}
      </p>
    </div>
  );
}

function RiskMetricBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1.5 font-mono text-lg font-medium leading-none tabular-nums ${tone ?? "text-zinc-100"}`}
      >
        {value}
      </p>
    </div>
  );
}
