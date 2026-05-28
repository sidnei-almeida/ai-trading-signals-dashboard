"use client";

import { SimulatedExecutionQueuePanel } from "@/components/dashboard/simulated-execution-queue-panel";
import { ExposureByAssetPanel } from "@/components/risk/exposure-by-asset-panel";
import { GuardrailStatusPanel } from "@/components/risk/guardrail-status-panel";
import { LimitUtilizationPanel } from "@/components/risk/limit-utilization-panel";
import { RebalanceRiskReviewPanel } from "@/components/risk/rebalance-risk-review-panel";
import { RejectedRecommendationsPanel } from "@/components/risk/rejected-recommendations-panel";
import { RiskKpiStrip } from "@/components/risk/risk-kpi-strip";

export default function RiskControlsPage() {
  return (
    <div className="flex flex-col gap-3">
      <header>
        <h2 className="text-sm font-semibold text-zinc-100">Risk Controls</h2>
        <p className="text-[11px] text-zinc-500">
          Operational guardrail monitoring for simulated rebalancing — not broker-level
          controls.
        </p>
      </header>

      <RiskKpiStrip />

      <div className="grid items-stretch gap-3 lg:grid-cols-3">
        <GuardrailStatusPanel />
        <ExposureByAssetPanel />
        <RebalanceRiskReviewPanel />
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-2">
        <RejectedRecommendationsPanel />
        <LimitUtilizationPanel />
      </div>

      <SimulatedExecutionQueuePanel showGuardrailColumn />
    </div>
  );
}
