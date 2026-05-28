/** Shared Recharts styling — colors only */
export const CHART = {
  grid: "rgba(128, 144, 118, 0.08)",
  axis: "#5a6b5e",
  agent: "#4ade80",
  benchmark: "rgba(128, 144, 118, 0.5)",
  drawdown: "#f87171",
  drawdownFill: "rgba(248, 113, 113, 0.15)",
  bar: "#2f4d44",
  barHighlight: "#b96b30",
  /** Ordered for generic multi-series charts */
  series: ["#4ade80", "#b96b30", "#f8d794", "#60a5fa", "#c084fc"],
  tooltip: {
    background: "#1a2826",
    border: "1px solid rgba(128, 144, 118, 0.15)",
    borderRadius: 6,
    fontSize: 11,
    color: "#809076",
  },
} as const;
