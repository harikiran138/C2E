import { AgentRunResult } from "@/lib/agents/types";
import { CurriculumValidator, GeneratedCurriculum } from "@/lib/curriculum/validator";

export interface ValidatorAgentOutput {
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
}

export async function runValidatorAgent(
  curriculum: GeneratedCurriculum,
): Promise<AgentRunResult<ValidatorAgentOutput>> {
  const result = new CurriculumValidator(curriculum).validate();
  return {
    data: {
      passed: result.passed,
      score: result.score,
      errors: result.errors,
      warnings: result.warnings,
    },
    warnings: result.warnings,
    errors: result.errors,
  };
}
