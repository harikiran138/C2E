import {
  detectProgramDomain,
  getAllowedTopicsForDomain,
  getDomainKnowledgeProfile,
} from "@/lib/curriculum/domain-knowledge";

function toBullets(items: string[], fallback: string): string {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item}`).join("\n");
}

export function buildCurriculumAIGuardrailsPrompt(programName: string): string {
  const domain = detectProgramDomain(programName);
  const profile = getDomainKnowledgeProfile(programName);
  const graph = profile.knowledgeGraph;
  const allowedTopics = getAllowedTopicsForDomain(profile);

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
${toBullets(graph.coreTopics, "- Program-specific discipline backbone courses")}

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
${toBullets(graph.emergingTopics, "- Domain-relevant modern technologies")}

Allowed related topics for this program (${domain}):
${toBullets(graph.relatedTopics, "- Domain-relevant supporting topics")}

6. Ensure Course Outcomes align with:
Program Outcomes (POs)
Program Educational Objectives (PEOs)

7. Every generated Course Outcome must follow Bloom's Taxonomy.

8. Reject outputs that introduce courses unrelated to the program discipline.
Restricted Topics for this program (${domain}):
${toBullets(graph.disallowedTopics, "Topics unrelated to the selected program discipline.")}

9. Use only topics from this allowed set for core and elective engineering courses:
${toBullets(allowedTopics, "- Program-specific allowed topics")}`;
}
