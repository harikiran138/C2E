import { AgentRunResult } from "@/lib/agents/types";

export interface CurriculumAdvisorInput {
  programType: string;
  industryFocus: string;
  specialization?: string;
}

export interface CurriculumAdvisorOutput {
  categoryDistribution: Record<string, number>;
  recommendedElectives: string[];
}

export async function runCurriculumAdvisorAgent(
  input: CurriculumAdvisorInput,
): Promise<AgentRunResult<CurriculumAdvisorOutput>> {
  const normalizedProgram = String(input.programType || "Engineering").toLowerCase();

  const baseDistribution: Record<string, number> = {
    BS: 22,
    ES: 18,
    HSS: 10,
    PC: 30,
    PE: 8,
    OE: 5,
    MC: 0,
    AE: 3,
    SE: 2,
    PR: 2,
  };

  if (normalizedProgram.includes("computer")) {
    baseDistribution.PC = 32;
    baseDistribution.PE = 10;
    baseDistribution.ES = 16;
  }

  return {
    data: {
      categoryDistribution: baseDistribution,
      recommendedElectives: [
        "Machine Learning",
        "Cloud Computing",
        "Cybersecurity",
        "Data Engineering",
        "DevOps Engineering",
      ],
    },
    warnings: [],
    errors: [],
  };
}
