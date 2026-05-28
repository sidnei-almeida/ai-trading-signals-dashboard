import type { StrategyMode } from "@/types/rl-trading";
import { cn } from "@/lib/utils";

const strokeProps = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Calm, minimal outline — relaxed horizontal gaze, soft smile. */
export function ConservativePersonaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      aria-hidden
    >
      <circle cx="16" cy="16" r="13" {...strokeProps} opacity={0.45} />
      <path d="M10 13.5h2.5M19.5 13.5h2.5" {...strokeProps} />
      <path d="M11.5 18.5c1.2 1 2.3 1.5 4.5 1.5s3.3-.5 4.5-1.5" {...strokeProps} />
    </svg>
  );
}

/** Focused neutral — steady eyes, level expression. */
export function BalancedPersonaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      aria-hidden
    >
      <circle cx="16" cy="16" r="13" {...strokeProps} opacity={0.45} />
      <circle cx="11.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 18.5h8" {...strokeProps} />
      <path d="M16 10.5v1.8" {...strokeProps} opacity={0.55} />
    </svg>
  );
}

/** Assertive — angled brows, firm set mouth. */
export function AggressivePersonaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8 shrink-0", className)}
      aria-hidden
    >
      <circle cx="16" cy="16" r="13" {...strokeProps} opacity={0.45} />
      <path d="M9.5 12.5l2.5 1M22.5 12.5l-2.5 1" {...strokeProps} />
      <circle cx="11.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <path d="M12 19h8" {...strokeProps} />
    </svg>
  );
}

const ICONS: Record<
  StrategyMode,
  typeof ConservativePersonaIcon
> = {
  conservative: ConservativePersonaIcon,
  balanced: BalancedPersonaIcon,
  aggressive: AggressivePersonaIcon,
};

export function AgentPersonaIcon({
  mode,
  className,
}: {
  mode: StrategyMode;
  className?: string;
}) {
  const Icon = ICONS[mode] ?? BalancedPersonaIcon;
  return <Icon className={className} />;
}
