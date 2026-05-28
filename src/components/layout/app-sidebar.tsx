"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, type ComponentType } from "react";
import {
  Activity,
  BrainCircuit,
  ChevronLeft,
  LayoutDashboard,
  LineChart,
  Shield,
  SlidersHorizontal,
  Settings,
} from "lucide-react";

import { BrandLogoMark } from "@/components/brand/brand-logo-mark";
import { getOperatingModeConfig, STRATEGY_MODE_ORDER } from "@/lib/operating-modes";
import { useDashboardStore } from "@/store/dashboard-store";
import type { StrategyMode } from "@/types/rl-trading";
import { cn } from "@/lib/utils";

import "./app-sidebar.css";

type NavBadge = { text: string; variant: "filled" | "outline" };

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: NavBadge;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/portfolio", label: "Portfolio", icon: LineChart },
    ],
  },
  {
    label: "Control",
    items: [
      {
        href: "/policy",
        label: "Policy Inference",
        icon: BrainCircuit,
        badge: { text: "PPO", variant: "filled" },
      },
      { href: "/risk", label: "Risk Controls", icon: Shield },
      { href: "/watch", label: "Market Watch", icon: Activity },
    ],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

const MODE_ABBREV: Record<StrategyMode, string> = {
  conservative: "Cons",
  balanced: "Bal",
  aggressive: "Agg",
};

function isNavActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { strategyMode, setStrategyMode, addActivity, agentState } = useDashboardStore();

  const modeConfig = getOperatingModeConfig(strategyMode);
  const agentRunning = agentState === "running";

  const onSelectMode = useCallback(
    (mode: StrategyMode) => {
      if (mode === strategyMode) return;
      setStrategyMode(mode);
      const label = getOperatingModeConfig(mode).label;
      addActivity({
        id: crypto.randomUUID(),
        time: new Date().toISOString(),
        source: "Operator",
        symbol: "PORTFOLIO",
        event: `Operating mode changed to ${label}`,
        signal: "—",
        confidence: null,
        riskCheck: "Applied",
        action: "MODE_CHANGE",
        status: "simulated",
      });
    },
    [strategyMode, setStrategyMode, addActivity],
  );

  const cycleMode = useCallback(() => {
    const idx = STRATEGY_MODE_ORDER.indexOf(strategyMode);
    const next = STRATEGY_MODE_ORDER[(idx + 1) % STRATEGY_MODE_ORDER.length];
    onSelectMode(next);
  }, [strategyMode, onSelectMode]);

  return (
    <aside
      className={cn("dashboard-sidebar sidebar", collapsed && "collapsed")}
      aria-label="Dashboard navigation"
    >
      <div className="sidebar-logo">
        <Link href="/" className="sidebar-logo-mark" aria-label="RL Portfolio Ops — Overview">
          <BrandLogoMark size={32} />
        </Link>
        <div className="sidebar-logo-text">
          <p className="sidebar-logo-name">RL Portfolio Ops</p>
          <p className="sidebar-logo-sub">v0.1 · Paper sim</p>
        </div>
      </div>

      <div className="sidebar-status" role="status">
        <span
          className={cn("sidebar-status-dot", agentRunning && "is-running")}
          aria-hidden
        />
        <p className="sidebar-status-copy">
          <strong>{modeConfig.label}</strong>
          {" · "}
          Agent {agentState}
        </p>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {navGroups.map((group) => (
          <div key={group.label} className="sidebar-nav-group">
            <p className="sidebar-nav-group-label">{group.label}</p>
            {group.items.map(({ href, label, icon: Icon, badge }) => {
              const active = isNavActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  data-tip={label}
                  className={cn("sidebar-nav-item", active && "is-active")}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="sidebar-nav-icon">
                    <Icon />
                  </span>
                  <span className="sidebar-nav-label">{label}</span>
                  {badge ? (
                    <span
                      className={cn(
                        "sidebar-nav-badge",
                        badge.variant === "filled" ? "is-filled" : "is-outline",
                      )}
                    >
                      {badge.text}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-mode">
        <p className="sidebar-mode-label">Operating mode</p>
        <div className="sidebar-mode-buttons" role="group" aria-label="Operating mode">
          {STRATEGY_MODE_ORDER.map((mode) => {
            const active = strategyMode === mode;
            const fullLabel = getOperatingModeConfig(mode).label;
            return (
              <button
                key={mode}
                type="button"
                className={cn("sidebar-mode-btn", active && "is-active")}
                onClick={() => onSelectMode(mode)}
                aria-pressed={active}
                title={fullLabel}
              >
                {MODE_ABBREV[mode]}
              </button>
            );
          })}
        </div>
        <div className="sidebar-mode-collapsed">
          <button
            type="button"
            className="sidebar-mode-icon-btn"
            onClick={cycleMode}
            title={`${modeConfig.label} — click to cycle`}
            aria-label={`Operating mode: ${modeConfig.label}. Click to cycle.`}
          >
            <SlidersHorizontal className="size-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <footer className="sidebar-footer">
        <div className="sidebar-footer-user">
          <div className="sidebar-footer-avatar" aria-hidden>
            RL
          </div>
          <div className="sidebar-footer-text">
            <p className="sidebar-footer-name">Paper Operator</p>
            <p className="sidebar-footer-role">Research session</p>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <ChevronLeft className="size-3.5" strokeWidth={2} />
        </button>
      </footer>
    </aside>
  );
}
