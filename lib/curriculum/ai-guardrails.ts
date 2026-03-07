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

  return `You are generating curriculum content for an engineering program.

Program Name: ${programName}
Program Domain: ${domain}

STRICT RULES

1. Maintain a balance between:
   - Fundamental engineering subjects
   - Core discipline subjects
   - Emerging technologies.

2. Ensure the curriculum follows this learning progression:

Year 1 → Fundamentals
Year 2 → Core Engineering
Year 3 → Advanced Domain Topics
Year 4 → Specialization + Emerging Technologies + Capstone

3. Do not remove essential foundational subjects such as:

Mathematics
Physics
Basic Engineering

4. Ensure the program retains its disciplinary backbone.

Example:
Mechanical Engineering must contain:
Thermodynamics
Fluid Mechanics
Machine Design
Manufacturing

Computer Science must contain:
Data Structures
Operating Systems
Computer Networks
Database Systems

Domain Backbone for this program (${domain}):
${domainBackboneText(domain)}

5. Integrate modern technologies relevant to the program.

Examples:
Computer Science:
Artificial Intelligence
Cloud Computing
Cybersecurity
Blockchain

Mechanical Engineering:
Robotics
Advanced Manufacturing
Digital Twin Systems
Autonomous Machines

Domain Emerging Technologies for this program (${domain}):
${domainEmergingText(domain)}

6. Ensure Course Outcomes align with:
Program Outcomes (POs)
Program Educational Objectives (PEOs)

7. Every generated Course Outcome must follow Bloom's Taxonomy.

8. Reject outputs that introduce courses unrelated to the program discipline.
Restricted Topics for this program (${domain}):
${domainRestrictionsText(domain)}`;
}
