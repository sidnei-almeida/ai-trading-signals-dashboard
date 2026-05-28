"use client";

import { PolicyDeveloperDetails } from "@/components/policy/policy-developer-details";
import { PolicyDiagnosticsCard } from "@/components/policy/policy-diagnostics-card";
import { PolicyModelInfoCard } from "@/components/policy/policy-model-info-card";
import { PolicyObservationCard } from "@/components/policy/policy-observation-card";
import { PolicyOutputPanel } from "@/components/dashboard/policy-output-panel";
import { useDashboardActions } from "@/hooks/use-dashboard-actions";
import { buildObservationFromDashboard } from "@/lib/dashboard-math";
import { useDashboardStore } from "@/store/dashboard-store";

export default function PolicyInferencePage() {
  const dashboard = useDashboardStore((s) => s.dashboard?.data);
  const settings = useDashboardStore((s) => s.settings);
  const { runInference } = useDashboardActions();

  if (!dashboard) {
    return <p className="text-sm text-zinc-500">Loading policy context…</p>;
  }

  const observation = buildObservationFromDashboard(dashboard, settings.startingCash * 0.1);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Policy Inference</h2>
          <p className="text-[11px] text-zinc-500">
            Compact PPO inspection — observation, logits, and allocations.
          </p>
        </div>
      </header>

      <div className="grid items-stretch gap-3 lg:grid-cols-2">
        <PolicyModelInfoCard onRunInference={() => void runInference()} />
        <PolicyObservationCard observation={observation} />
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <PolicyOutputPanel />
        <PolicyDiagnosticsCard />
      </div>

      <PolicyDeveloperDetails observation={observation} />
    </div>
  );
}
