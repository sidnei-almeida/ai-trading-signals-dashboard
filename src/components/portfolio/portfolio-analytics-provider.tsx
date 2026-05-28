"use client";

import {
  PortfolioAnalyticsContext,
  usePortfolioAnalyticsInternal,
} from "@/hooks/use-portfolio-analytics";

export function PortfolioAnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = usePortfolioAnalyticsInternal();
  return (
    <PortfolioAnalyticsContext.Provider value={value}>
      {children}
    </PortfolioAnalyticsContext.Provider>
  );
}
