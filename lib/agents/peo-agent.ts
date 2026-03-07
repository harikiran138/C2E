import { peoAgent, PEOAgentParams, PEOAgentResult } from "@/lib/ai/peo-agent";
import { AgentRunResult } from "@/lib/agents/types";

export type PEOAgentInput = PEOAgentParams;
export type PEOAgentOutput = PEOAgentResult;

export async function runPEOAgent(input: PEOAgentInput): Promise<AgentRunResult<PEOAgentOutput>> {
  try {
    const data = await peoAgent(input);
    return { data, warnings: [], errors: [] };
  } catch (error: any) {
    return {
      data: {
        peos: [],
        ranked: [],
        is_fallback: true,
        attempts: 0,
      },
      warnings: [],
      errors: [error?.message || "PEO agent failed."],
    };
  }
}
