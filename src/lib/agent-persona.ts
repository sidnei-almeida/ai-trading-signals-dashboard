import type { StrategyMode } from "@/types/rl-trading";

export interface AgentPersonaPresentation {
  label: string;
  posture: string;
  accent: string;
  ring: string;
  surface: string;
}

export const AGENT_PERSONA: Record<StrategyMode, AgentPersonaPresentation> = {
  conservative: {
    label: "Conservative",
    posture: "Calmer posture · lower exposure · slower rebalancing",
    accent: "text-[var(--positive)]",
    ring: "border-[rgba(74,222,128,0.25)]",
    surface: "bg-[rgba(40,65,57,0.35)]",
  },
  balanced: {
    label: "Balanced",
    posture: "Focused posture · moderate exposure · standard rebalancing",
    accent: "text-[var(--khaki)]",
    ring: "border-[rgba(248,215,148,0.2)]",
    surface: "bg-[rgba(40,65,57,0.3)]",
  },
  aggressive: {
    label: "Aggressive",
    posture: "Assertive posture · higher exposure · faster rebalancing",
    accent: "text-[var(--earth)]",
    ring: "border-[rgba(185,107,48,0.3)]",
    surface: "bg-[rgba(185,107,48,0.1)]",
  },
};

export function getAgentPersona(mode: StrategyMode): AgentPersonaPresentation {
  return AGENT_PERSONA[mode] ?? AGENT_PERSONA.balanced;
}
