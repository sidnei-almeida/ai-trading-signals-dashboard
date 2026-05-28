import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RL Portfolio Allocation Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "#111a19",
          color: "#f8d794",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#284139",
              border: "2px solid rgba(248, 215, 148, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              color: "#f8d794",
            }}
          >
            ◈
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 52, fontWeight: 600, letterSpacing: "-0.02em" }}>
              RL Portfolio Allocation Dashboard
            </div>
            <div style={{ fontSize: 26, fontWeight: 300, color: "#809076", maxWidth: 820 }}>
              PPO-based portfolio allocation · historical market replay · paper-trading
              simulation
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
