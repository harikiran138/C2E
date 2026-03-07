import { visionAgent, AgentParams, AgentResult } from "@/lib/ai/vision-agent";
import { AgentRunResult } from "@/lib/agents/types";

export type VisionAgentInput = AgentParams;
export type VisionAgentOutput = AgentResult;

export async function runVisionAgent(input: VisionAgentInput): Promise<AgentRunResult<VisionAgentOutput>> {
  try {
    const data = await visionAgent(input);
    return { data, warnings: [], errors: [] };
  } catch (error: any) {
    return {
      data: {
        visions: [],
        scores: {},
        ranked: [],
        is_fallback: true,
        attempts: 0,
      },
      warnings: [],
      errors: [error?.message || "Vision agent failed."],
    };
  }
}
