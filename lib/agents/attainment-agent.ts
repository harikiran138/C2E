import { AgentRunResult } from "@/lib/agents/types";
import { calculateCOAttainment, calculatePOAttainment } from "@/lib/curriculum/attainment";

export interface AttainmentInput {
  internalScore: number;
  externalScore: number;
  strength?: number;
}

export interface AttainmentOutput {
  coAttainment: number;
  poAttainment: number;
}

export async function runAttainmentAgent(
  entries: AttainmentInput[],
): Promise<AgentRunResult<AttainmentOutput>> {
  const coAttainment = entries.length > 0
    ? calculateCOAttainment({
        internalScore: Number(entries[0].internalScore || 0),
        externalScore: Number(entries[0].externalScore || 0),
      })
    : 0;

  const poAttainment = calculatePOAttainment(
    entries.map((entry) => ({
      coAttainment: calculateCOAttainment({
        internalScore: Number(entry.internalScore || 0),
        externalScore: Number(entry.externalScore || 0),
      }),
      strength: Number(entry.strength || 1),
    })),
  );

  return {
    data: { coAttainment, poAttainment },
    warnings: [],
    errors: [],
  };
}
