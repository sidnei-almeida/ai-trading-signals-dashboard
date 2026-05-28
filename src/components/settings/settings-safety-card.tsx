"use client";

import { Panel } from "@/components/dashboard/panel";
import { useDashboardActions } from "@/hooks/use-dashboard-actions";
import { getOperatingModeConfig, guardrailsFromMode } from "@/lib/operating-modes";
import { clearSharedReplayEngine } from "@/lib/replay-session";
import { useDashboardStore } from "@/store/dashboard-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
      {children}
    </p>
  );
}

function StatusChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "neutral";
}) {
  return (
    <div className="rounded-md border border-zinc-800/60 bg-zinc-950/45 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-[11px] capitalize",
          tone === "ok" && "text-emerald-400/90",
          tone === "warn" && "text-amber-400/90",
          tone === "neutral" && "text-zinc-400",
          !tone && "text-zinc-300",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  variant = "standard",
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "standard" | "destructive" | "serious";
  className?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "h-8 w-full justify-start text-xs",
        variant === "standard" && "border-zinc-700/80 hover:bg-zinc-800/50",
        variant === "destructive" &&
          "border-red-500/40 bg-red-950/15 text-red-300/95 hover:bg-red-950/35",
        variant === "serious" &&
          "border-amber-500/35 bg-amber-950/10 text-amber-300/90 hover:bg-amber-950/25",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function SettingsSafetyCard() {
  const {
    resetSession,
    clearActivity,
    setAgentState,
    setReplayProgress,
    strategyMode,
    setGuardrails,
    addActivity,
    agentState,
    replayActive,
    activityLog,
    historicalChart,
  } = useDashboardStore();
  const { refresh } = useDashboardActions();
  const modeLabel = getOperatingModeConfig(strategyMode).label;

  const emergencyStop = () => {
    clearSharedReplayEngine();
    setAgentState("stopped");
    setReplayProgress(0, 0, false);
    addActivity({
      id: `estop-${Date.now()}`,
      time: new Date().toISOString(),
      source: "Operator",
      symbol: "PORTFOLIO",
      event: "Emergency stop from Settings",
      signal: "—",
      confidence: null,
      riskCheck: "Manual",
      action: "STOP",
      status: "blocked",
    });
  };

  const agentTone =
    agentState === "running" ? "ok" : agentState === "paused" ? "warn" : "neutral";

  return (
    <Panel
      title="Safety & Reset"
      subtitle="Session control · simulated operations"
      className="h-full"
      bodyClassName="flex h-full min-h-0 flex-col gap-3 p-3"
    >
      <p className="text-[10px] leading-snug text-zinc-600">
        Operator controls for paper-trading session state. Destructive actions require
        deliberate use.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatusChip label="Agent" value={agentState} tone={agentTone} />
        <StatusChip label="Replay" value={replayActive ? "active" : "idle"} />
        <StatusChip label="Activity" value={`${activityLog.length} events`} />
        <StatusChip
          label="Backtest"
          value={historicalChart ? "preserved" : "unavailable"}
          tone={historicalChart ? "ok" : "neutral"}
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <SectionLabel>Session actions</SectionLabel>
          <ControlButton
            onClick={() => {
              resetSession();
              void refresh();
            }}
          >
            Reset session
          </ControlButton>
          <ControlButton onClick={() => void refresh()}>Refresh dashboard data</ControlButton>
          <ControlButton onClick={() => clearActivity()}>Clear activity feed</ControlButton>
          <p className="mt-1 text-[10px] leading-snug text-zinc-600">
            Reset clears replay progress and activity log. Refresh reloads dashboard data
            from BFF.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-zinc-800/50 sm:border-l sm:pl-4">
          <SectionLabel>Critical controls</SectionLabel>
          <ControlButton variant="destructive" onClick={emergencyStop}>
            Emergency stop
          </ControlButton>
          <ControlButton
            variant="serious"
            onClick={() => setGuardrails(guardrailsFromMode(strategyMode))}
          >
            Reset guardrails to defaults
          </ControlButton>
          <div className="mt-1 rounded-md border border-red-500/15 bg-red-950/10 px-2.5 py-2">
            <p className="text-[10px] leading-snug text-zinc-500">
              Emergency stop halts agent and replay immediately. Guardrails restore to{" "}
              <span className="text-zinc-400">{modeLabel}</span> mode presets.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-zinc-800/70 pt-2.5">
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Reset impact
        </p>
        <ul className="grid gap-1 text-[10px] leading-snug text-zinc-600 sm:grid-cols-2">
          <li>· Session reset clears replay and activity</li>
          <li>· Historical backtest curve preserved</li>
          <li>· Guardrails restorable to mode defaults</li>
          <li>· Emergency stop halts simulated operations</li>
        </ul>
      </div>
    </Panel>
  );
}
