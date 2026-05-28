"use client";

import { PortfolioContributionSection } from "@/components/portfolio/portfolio-contribution-section";
import { PortfolioExposureRow } from "@/components/portfolio/portfolio-exposure-row";
import { PortfolioHoldingsTable } from "@/components/portfolio/portfolio-holdings-table";
import { PortfolioKpiStrip } from "@/components/portfolio/portfolio-kpi-strip";
import { PortfolioMainRow } from "@/components/portfolio/portfolio-main-row";
import { PortfolioRiskRow } from "@/components/portfolio/portfolio-risk-row";
import { PortfolioAnalyticsProvider } from "@/components/portfolio/portfolio-analytics-provider";
import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

function PortfolioPageContent() {
  const analytics = usePortfolioAnalytics();

  if (!analytics.ready) {
    return (
      <Alert className="border-amber-500/30 bg-amber-950/20">
        <Info className="size-4 text-amber-400" />
        <AlertTitle>Paper Portfolio Analytics</AlertTitle>
        <AlertDescription className="text-amber-100/70">
          {analytics.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <p className="text-[11px] text-zinc-500">
        Paper portfolio analytics · Stooq historical market data · Buy &amp; Hold benchmark ·
        not investment advice
      </p>
      <PortfolioKpiStrip />
      <PortfolioMainRow />
      <PortfolioRiskRow />
      <PortfolioExposureRow />
      <PortfolioContributionSection />
      <PortfolioHoldingsTable />
    </>
  );
}

export default function PortfolioPage() {
  return (
    <PortfolioAnalyticsProvider>
      <div className="flex flex-col gap-5">
        <PortfolioPageContent />
      </div>
    </PortfolioAnalyticsProvider>
  );
}
