"use client";

import { useEffect, useRef } from "react";

import type { BootLogEntry } from "@/store/boot-store";
import { cn } from "@/lib/utils";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

export function BootLog({ entries }: { entries: BootLogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="boot-log" aria-live="polite">
      {entries.length === 0 ? (
        <div className="boot-log-line">Awaiting boot sequence…</div>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.id}
            className={cn("boot-log-line", entry.level === "success" && "success", entry.level === "warn" && "warn", entry.level === "error" && "error")}
          >
            <span className="shrink-0 opacity-60">{formatTime(entry.time)}</span>
            <span>{entry.message}</span>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
