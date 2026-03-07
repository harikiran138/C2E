import { AgentRunResult } from "@/lib/agents/types";

export interface MappingInput {
  coCode: string;
  poMapping: number[];
  psoMapping: number[];
  strength: number;
}

export interface MappingOutput {
  coPo: Array<{ coCode: string; poId: number; strength: number }>;
  coPso: Array<{ coCode: string; psoId: number; strength: number }>;
}

export async function runMappingAgent(
  items: MappingInput[],
): Promise<AgentRunResult<MappingOutput>> {
  const coPo = items.flatMap((item) =>
    item.poMapping.map((poId) => ({
      coCode: item.coCode,
      poId,
      strength: Math.min(3, Math.max(1, Math.floor(item.strength || 2))),
    })),
  );

  const coPso = items.flatMap((item) =>
    item.psoMapping.map((psoId) => ({
      coCode: item.coCode,
      psoId,
      strength: Math.min(3, Math.max(1, Math.floor(item.strength || 2))),
    })),
  );

  return { data: { coPo, coPso }, warnings: [], errors: [] };
}
