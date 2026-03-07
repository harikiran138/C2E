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
  const program = normalizeText(input.programName) || "Engineering Program";
  const specialization = normalizeText(input.specialization) || "core discipline";
  const focusAreas = Array.isArray(input.focusAreas)
    ? input.focusAreas.map((item) => normalizeText(item)).filter(Boolean)
    : [];

  const total = Math.max(1, Math.min(3, Number(input.count || 3)));
  const fallbackFocus = focusAreas.length > 0 ? focusAreas : ["analysis", "design", "innovation"];

  const psos = Array.from({ length: total }, (_, index) => {
    const focus = fallbackFocus[index % fallbackFocus.length];
    return `Graduates will be able to design and implement ${specialization} solutions in ${program} with measurable competency in ${focus}.`;
  });

  return { data: { psos }, warnings: [], errors: [] };
}
