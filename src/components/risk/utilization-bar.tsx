import type { RiskLevel } from "@/lib/risk-metrics";
import { cn } from "@/lib/utils";

const fillTone: Record<RiskLevel, string> = {
  ok: "bg-emerald-500/70",
  near: "bg-amber-500/75",
  breach: "bg-red-500/75",
};

export function UtilizationBar({
  utilization,
  status,
}: {
  utilization: number;
  status: RiskLevel;
}) {
  const width = Math.min(100, Math.max(0, utilization * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
      <div
        className={cn("h-full rounded-full transition-[width]", fillTone[status])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
