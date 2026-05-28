"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { useDashboardBootstrap } from "@/hooks/use-dashboard-bootstrap";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  useDashboardBootstrap();

  return (
    <div className="dashboard-app flex h-screen overflow-hidden text-zinc-100">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="min-h-0 flex-1 overflow-auto p-5">{children}</main>
      </div>
    </div>
  );
}
