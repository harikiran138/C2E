import { AgentRunResult } from "@/lib/agents/types";

export interface COGeneratorCourseInput {
  courseCode: string;
  courseTitle: string;
  semester: number;
}

export interface GeneratedCO {
  courseCode: string;
  coCode: string;
  statement: string;
  rbtLevel: string;
  poMapping: number[];
  psoMapping: number[];
  strength: string;
}

export interface COGeneratorOutput {
  outcomes: GeneratedCO[];
}

export async function runCOGeneratorAgent(
  courses: COGeneratorCourseInput[],
): Promise<AgentRunResult<COGeneratorOutput>> {
  const outcomes: GeneratedCO[] = [];

  courses.forEach((course) => {
    [1, 2, 3, 4].forEach((index) => {
      outcomes.push({
        courseCode: course.courseCode,
        coCode: `CO${index}`,
        statement: `Apply concepts from ${course.courseTitle} to solve domain-relevant problems at semester ${course.semester} level.`,
        rbtLevel: index <= 1 ? "L2 Understanding" : index === 2 ? "L3 Applying" : "L4 Analyzing",
        poMapping: index % 2 === 0 ? [1, 2, 3] : [2, 5],
        psoMapping: [1],
        strength: index >= 3 ? "3" : "2",
      });
    });
  });

  return { data: { outcomes }, warnings: [], errors: [] };
}
