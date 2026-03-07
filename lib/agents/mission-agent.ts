import {
  missionAgent,
  MissionAgentParams,
  MissionAgentResult,
} from "@/lib/ai/mission-agent";
import { AgentRunResult } from "@/lib/agents/types";

export type MissionAgentInput = MissionAgentParams;
export type MissionAgentOutput = MissionAgentResult;

export async function runMissionAgent(
  input: MissionAgentInput,
): Promise<AgentRunResult<MissionAgentOutput>> {
  try {
    const data = await missionAgent(input);
    return { data, warnings: [], errors: [] };
  } catch (error: any) {
    return {
      data: {
        missions: [],
        ranked: [],
        is_fallback: true,
        attempts: 0,
      },
      warnings: [],
      errors: [error?.message || "Mission agent failed."],
    };
  }
}
