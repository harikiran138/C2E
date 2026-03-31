/**
 * lib/curriculum/program-mapping.ts
 * Logic for resolving specialized programs to core ABET domains.
 */

import { ABET_CRITERIA_DATA, ABETProgramCriteria } from "./abet-criteria";

/**
 * Maps specialized program keywords to core ABET domain names/keywords.
 */
export const PROGRAM_ALIASES: Record<string, string[]> = {
  "textile": ["chemical", "materials"],
  "biotech": ["biomedical"],
  "bioprocess": ["chemical", "biomedical"],
  "mechatronics": ["mechanical", "electrical", "computer"],
  "robotics": ["mechanical", "electrical", "computer"],
  "ai": ["software", "computer"],
  "data": ["software", "computer"],
  "manufacturing": ["industrial", "mechanical"],
  "production": ["industrial"],
  "metallurgical": ["materials"],
  "ceramics": ["materials"],
  "aeronautical": ["aerospace"],
  "astronautical": ["aerospace"],
  "electronics": ["electrical"],
  "communication": ["electrical"],
  "infrastructure": ["civil", "systems"],
  "structural": ["civil"],
  "quantum": ["mechanics", "electrical"],
  "smart": ["systems", "computer"],
  "climate": ["environmental"],
  "intelligence": ["software", "computer"],
  "science": ["computer"],
  "information": ["software", "computer"],
  "cyber": ["software", "computer"],
};

/**
 * Resolves the best ABET criteria for a given program name.
 * If multiple domains are matched, it merges them into a single high-fidelity criteria object.
 */
export function resolveProgramCriteria(programName: string): ABETProgramCriteria | null {
  const normName = programName.toLowerCase();
  
  // 1. First, search for direct matches in the core criteria
  const directMatches = ABET_CRITERIA_DATA.programs.filter(p => 
    p.match_keywords.some(k => normName.includes(k.toLowerCase()))
  );

  // If we have a very specific single match, return it
  if (directMatches.length === 1) return directMatches[0];

  // 2. Second, check the alias mapping
  let mappedDomains: string[] = [];
  for (const [key, aliases] of Object.entries(PROGRAM_ALIASES)) {
    if (normName.includes(key)) {
      mappedDomains = [...new Set([...mappedDomains, ...aliases])];
    }
  }

  // 3. Find criteria for all resolved domains (direct + mapped)
  const resolvedCriteria = ABET_CRITERIA_DATA.programs.filter(p => 
    mappedDomains.some(d => p.match_keywords.some(k => k.toLowerCase() === d.toLowerCase())) ||
    directMatches.includes(p)
  );

  if (resolvedCriteria.length === 0) return null;
  if (resolvedCriteria.length === 1) return resolvedCriteria[0];

  // 4. Merge multiple criteria into one robust object
  return {
    name: `${programName} (Resolved Profile)`,
    match_keywords: [normName],
    statement: resolvedCriteria.map(c => `[From ${c.name}]: ${c.statement}`).join("\n"),
    curriculum: [...new Set(resolvedCriteria.flatMap(c => c.curriculum))],
    faculty: resolvedCriteria.map(c => `[${c.name}]: ${c.faculty}`).join("; ")
  };
}
