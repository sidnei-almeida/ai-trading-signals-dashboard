import { AiSignalEnginePanel } from "@/components/dashboard/ai-signal-engine-panel";
import { KpiStrip } from "@/components/dashboard/kpi-strip";
import { MarketWatchPanel } from "@/components/dashboard/market-watch-panel";
import { PerformancePanel } from "@/components/dashboard/performance-panel";
import { PortfolioExposurePanel } from "@/components/dashboard/portfolio-exposure-panel";
import { RiskGuardrailsPanel } from "@/components/dashboard/risk-guardrails-panel";
import { SignalExecutionFeedPanel } from "@/components/dashboard/signal-execution-feed-panel";
import { SimulatedExecutionQueuePanel } from "@/components/dashboard/simulated-execution-queue-panel";

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[11px] text-zinc-500">
        Paper portfolio analytics · Stooq historical market data · Buy &amp; Hold benchmark ·
        not investment advice
      </p>
      <KpiStrip />

      <div className="grid min-h-[340px] grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(0,45fr)_minmax(0,33fr)_minmax(0,22fr)]">
        <PerformancePanel />
        <AiSignalEnginePanel />
        <PortfolioExposurePanel />
      </div>

      <div className="grid min-h-[240px] grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        <MarketWatchPanel />
        <RiskGuardrailsPanel />
        <SimulatedExecutionQueuePanel />
      </div>

      <SignalExecutionFeedPanel />
    </div>
  );
}
