import { detectProgramDomain } from "@/lib/curriculum/domain-knowledge";

function domainBackboneText(programDomain: string): string {
  if (programDomain === "MECH") {
    return [
      "Thermodynamics",
      "Fluid Mechanics",
      "Machine Design",
      "Manufacturing",
      "Strength of Materials",
    ].join("\n");
  }

  if (programDomain === "CSE") {
    return [
      "Data Structures",
      "Operating Systems",
      "Computer Networks",
      "Database Systems",
      "Algorithms",
    ].join("\n");
  }

  return [
    "Program-specific discipline backbone courses",
    "Core engineering competencies for the selected domain",
  ].join("\n");
}

function domainEmergingText(programDomain: string): string {
  if (programDomain === "MECH") {
    return [
      "Robotics",
      "Advanced Manufacturing",
      "Digital Twin Systems",
      "Autonomous Systems",
      "Additive Manufacturing",
    ].join("\n");
  }

  if (programDomain === "CSE") {
    return [
      "Artificial Intelligence",
      "Machine Learning",
      "Cloud Computing",
      "Cybersecurity",
      "Blockchain",
      "Generative AI",
    ].join("\n");
  }

  return [
    "Domain-relevant modern technologies",
    "Industry-aligned emerging skills",
  ].join("\n");
}

function domainRestrictionsText(programDomain: string): string {
  if (programDomain === "MECH") {
    return [
      "Operating Systems",
      "Distributed Computing",
      "Compiler Design",
    ].join("\n");
  }

  if (programDomain === "CSE") {
    return [
      "Advanced Welding Technology",
      "Heat Transfer Analysis",
      "Fluid Power Systems",
    ].join("\n");
  }

  return "Topics unrelated to the selected program discipline.";
}

export function buildCurriculumAIGuardrailsPrompt(programName: string): string {
  const domain = detectProgramDomain(programName);

  return `Program Name: ${programName}
Program Domain: ${domain}

STRICT RULES
1. Maintain balance between:
   - Fundamental engineering subjects
   - Core discipline subjects
   - Emerging technologies
2. Enforce learning progression:
   - Year 1: Fundamentals
   - Year 2: Core engineering knowledge
   - Year 3: Advanced domain topics
   - Year 4: Specialization + emerging technologies + capstone
3. Do not remove essential foundational subjects:
   - Mathematics
   - Physics
   - Basic Engineering
4. Preserve disciplinary backbone courses for this domain:
${domainBackboneText(domain)}
5. Integrate modern technologies relevant to this domain:
${domainEmergingText(domain)}
6. Ensure generated outcomes align with PEOs and POs.
7. Every generated outcome must follow Bloom's taxonomy.
8. Reject outputs introducing unrelated discipline topics.
9. Restricted topics for this domain:
${domainRestrictionsText(domain)}`;
}
