import { psoAgent } from "@/lib/ai/pso-agent";
import { AgentRunResult } from "@/lib/agents/types";

export interface PSOAgentInput {
  programName: string;
  specialization?: string;
  focusAreas?: string[];
  count?: number;
}

export interface PSOAgentOutput {
  psos: string[];
}

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export async function runPSOAgent(
  input: PSOAgentInput,
): Promise<AgentRunResult<PSOAgentOutput>> {
  const result = await psoAgent({
    programName: normalizeText(input.programName) || "Engineering Program",
    count: Math.max(1, Math.min(3, Number(input.count || 3))),
    focusAreas: [
      normalizeText(input.specialization),
      ...(Array.isArray(input.focusAreas) ? input.focusAreas.map(normalizeText) : []),
    ].filter(Boolean),
  });

  return {
    data: { psos: result.results },
    warnings: [],
    errors: [],
  };
}
