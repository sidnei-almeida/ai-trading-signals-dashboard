"use client";

import { useMarketWatch } from "@/hooks/use-market-watch";
import { dataSourceDisplayLabel } from "@/lib/market-watch";
import { cn } from "@/lib/utils";

export function DataSourceStatusStrip() {
  const m = useMarketWatch();

  if (!m.ready) {
    return (
      <div className="data-source-panel text-xs text-[var(--wasabi-dim)]">
        Loading market data status…
      </div>
    );
  }

  const active = dataSourceDisplayLabel(m.data.data_source);
  const csvOk = m.csvLoaded === true;

  return (
    <div className="data-source-panel">
      <p className="data-source-title">Data source status</p>
      <div className="data-source-grid">
        <div>
          <p className="ds-col-label">Active source</p>
          <p className="ds-col-value">{active}</p>
        </div>
        <div>
          <p className="ds-col-label">Runtime</p>
          <p className="ds-col-value muted">
            {csvOk ? "Local CSV (/api/market-data)" : "Dashboard series"}
          </p>
        </div>
        <div>
          <p className="ds-col-label">External calls</p>
          <p className="ds-col-value muted">None at runtime</p>
        </div>
        <div>
          <p className="ds-col-label">CSV fallback</p>
          <p className={cn("ds-col-value", csvOk ? "positive" : "muted")}>
            {csvOk ? "prices.csv loaded" : "Run npm run data:stooq"}
          </p>
        </div>
      </div>
      <p className="data-source-note">
        yfinance · csv_fallback · demo_local · synthetic — labels from backend when API path
        differs; Market Watch chart uses dashboard price_history + replay index.
      </p>
    </div>
  );
}
