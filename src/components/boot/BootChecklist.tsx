"use client";

import type { BootStep, BootStepStatus } from "@/store/boot-store";
import { cn } from "@/lib/utils";

function statusLabel(status: BootStepStatus): string {
  switch (status) {
    case "loading":
      return "Loading";
    case "ready":
      return "Ready";
    case "warning":
      return "Warning";
    case "failed":
      return "Failed";
    default:
      return "Pending";
  }
}

function dotClass(status: BootStepStatus): string {
  switch (status) {
    case "loading":
      return "loading";
    case "ready":
      return "ready";
    case "warning":
      return "warning";
    case "failed":
      return "failed";
    default:
      return "";
  }
}

export function BootChecklist({ steps }: { steps: BootStep[] }) {
  return (
    <ul className="boot-checklist">
      {steps.map((step) => (
        <li
          key={step.id}
          className={cn(
            "boot-checklist-item",
            step.status === "ready" && "is-ready",
            step.status === "loading" && "is-loading",
          )}
        >
          <span className="boot-checklist-label">
            <span className={cn("boot-status-dot", dotClass(step.status))} />
            {step.label}
          </span>
          <span className={cn("boot-status-badge", step.status)}>
            {statusLabel(step.status)}
          </span>
        </li>
      ))}
    </ul>
  );
}
