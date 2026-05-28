"use client";

import { resolveFromDashboard } from "@/lib/allocation-targets";
import { useDashboardStore } from "@/store/dashboard-store";

export function useResolvedTargets() {
  const dashboard = useDashboardStore((s) => s.dashboard?.data);
  const lastPrediction = useDashboardStore((s) => s.lastPrediction);
  const strategyMode = useDashboardStore((s) => s.strategyMode);

  if (!dashboard) {
    return null;
  }

  return resolveFromDashboard(
    dashboard,
    lastPrediction?.result.allocations,
    strategyMode,
  );
}
