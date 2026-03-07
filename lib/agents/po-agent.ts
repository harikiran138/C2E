import { poAgent, POAgentParams, POAgentResult } from "@/lib/ai/po-agent";
import { AgentRunResult } from "@/lib/agents/types";

export type POAgentInput = POAgentParams;
export type POAgentOutput = POAgentResult;

export async function runPOAgent(input: POAgentInput): Promise<AgentRunResult<POAgentOutput>> {
  try {
    const data = await poAgent(input);
    return { data, warnings: [], errors: [] };
  } catch (error: any) {
    return {
      data: {
        pos: [],
        ranked: [],
        is_fallback: true,
        attempts: 0,
      },
      warnings: [],
      errors: [error?.message || "PO agent failed."],
    };
  }
}
