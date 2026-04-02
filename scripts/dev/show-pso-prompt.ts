import { buildPSOGenerationPrompt } from "./lib/ai/pso-prompt-builder";
import { ABET_CRITERIA_DATA } from "./lib/curriculum/abet-criteria";

function findCriteria(name: string) {
  const norm = name.toLowerCase();
  for (const p of ABET_CRITERIA_DATA.programs) {
    if (norm.includes(p.name.toLowerCase())) return p;
  }
  return null;
}

const prog = "Mechanical Engineering";
const crit = findCriteria(prog);

const prompt = buildPSOGenerationPrompt({
  programName: prog,
  count: 3,
  programCriteria: crit || undefined
});

console.log("--- GENERATED PROMPT START ---");
console.log(prompt);
console.log("--- GENERATED PROMPT END ---");
