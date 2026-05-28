import type { Ticker } from "@/types/rl-trading";

/** Shared palette — Allocation Breakdown bars & correlation heatmap */
export const ASSET_COLORS: Record<Ticker, string> = {
  AAPL: "#4ade80",
  MSFT: "#60a5fa",
  GOOGL: "#f8d794",
  AMZN: "#b96b30",
  NVDA: "#c084fc",
};

const DASHBOARD_BASE = { r: 17, g: 26, b: 25 };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function textColorForBackground(r: number, g: number, b: number): string {
  return relativeLuminance(r, g, b) > 0.42 ? "#0f1419" : "#f4f4f5";
}

export function correlationHeatmapCellStyle(
  row: Ticker,
  col: Ticker,
  value: number,
): { background: string; color: string } {
  const isDiagonal = row === col;
  const rowRgb = hexToRgb(ASSET_COLORS[row]);
  const colRgb = hexToRgb(ASSET_COLORS[col]);
  const pairRgb = isDiagonal ? rowRgb : mixRgb(rowRgb, colRgb, 0.5);

  const v = Math.max(-1, Math.min(1, value));
  const magnitude = isDiagonal ? 1 : Math.abs(v);

  if (v < 0 && !isDiagonal) {
    const intensity = Math.abs(v);
    const bg = mixRgb(DASHBOARD_BASE, { r: 190, g: 80, b: 80 }, 0.08 + intensity * 0.22);
    return {
      background: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
      color: intensity > 0.35 ? "#fca5a5" : "#a1a1aa",
    };
  }

  const strength = isDiagonal ? 0.72 : 0.18 + magnitude * 0.52;
  const bg = mixRgb(DASHBOARD_BASE, pairRgb, strength);
  const borderTint = mixRgb(pairRgb, { r: 255, g: 255, b: 255 }, isDiagonal ? 0.12 : 0.06 * magnitude);

  return {
    background: `linear-gradient(145deg, rgb(${bg.r}, ${bg.g}, ${bg.b}) 0%, rgb(${Math.max(0, bg.r - 6)}, ${Math.max(0, bg.g - 6)}, ${Math.max(0, bg.b - 6)}) 100%)`,
    color: textColorForBackground(
      Math.round((bg.r + borderTint.r) / 2),
      Math.round((bg.g + borderTint.g) / 2),
      Math.round((bg.b + borderTint.b) / 2),
    ),
  };
}
