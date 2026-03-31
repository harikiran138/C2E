/**
 * PSO Validator & Scoring Engine
 * 
 * This module provides domain-aware validation and scoring for Program Specific Outcomes (PSOs)
 * based on ABET Engineering Accreditation Commission (EAC) standards.
 */

export type PSO = {
  statement: string;
  sos: string[];
  focus_area?: string;
};

export type ValidationResult = {
  score: number;
  passed: boolean;
  issues: string[];
  suggestions: string[];
};

// ==============================
// RULES & CONSTRAINTS
// ==============================

export const STRONG_VERBS = [
  "analyze", "design", "implement", "evaluate", "develop", "apply", "optimize", "integrate"
];

export const WEAK_VERBS = [
  "understand", "know", "learn", "aware"
];

export const CONSTRAINT_KEYWORDS = [
  "safety", "cost", "sustainable", "efficiency", "standards", "constraints", "ethics", "environmental"
];

export const REAL_WORLD_CONTEXT = [
  "hvac", "renewable", "industry", "machinery", "automation", "infrastructure", "healthcare", "energy", "manufacturing", "prototypes"
];

/**
 * Returns domain-specific keywords based on the program name.
 */
export function getDomainKeywords(programName: string): string[] {
  const name = programName.toLowerCase();

  if (name.includes("mechanical"))
    return ["cad", "thermodynamics", "fluid", "manufacturing", "cnc", "robotics", "heat", "thermal"];

  if (name.includes("computer") || name.includes("software") || name.includes("it"))
    return ["software", "cloud", "system", "application", "data", "algorithm", "database", "security"];

  if (name.includes("electrical") || name.includes("electronics") || name.includes("telecommunication"))
    return ["circuit", "signal", "embedded", "iot", "electronics", "power", "communication"];

  if (name.includes("civil"))
    return ["construction", "infrastructure", "structures", "geotechnical", "transportation", "surveying"];

  if (name.includes("ai") || name.includes("data science") || name.includes("machine learning"))
    return ["machine learning", "ai", "data", "model", "analytics", "neural", "intelligence"];

  return ["system", "engineering", "process", "technical"];
}

/**
 * Calculates a numerical score (0-100) for a single PSO statement.
 */
export function scorePSO(pso: PSO, domainKeywords: string[]): number {
  let score = 0;
  const text = pso.statement.toLowerCase().trim();

  // 1. Strong action verbs at the start (15 pts)
  const firstWord = text.split(" ")[0];
  if (STRONG_VERBS.some(v => firstWord.startsWith(v))) score += 15;
  
  // 2. Penalty for weak verbs (-10 pts)
  if (WEAK_VERBS.some(v => text.includes(v))) score -= 10;

  // 3. Measurability & Constraints (10 pts)
  if (CONSTRAINT_KEYWORDS.some(k => text.includes(k))) score += 10;
  
  // 4. Structural Quality (10 pts)
  if (text.includes("using") || text.includes("employing")) score += 5;
  if (text.includes("to solve") || text.includes("to address") || text.includes("to optimize")) score += 5;

  // 5. Domain Relevance (15 pts)
  if (domainKeywords.some(k => text.includes(k))) score += 15;

  // 6. Real-world Context (15 pts)
  if (REAL_WORLD_CONTEXT.some(k => text.includes(k))) score += 15;

  // 7. ABET Mapping Integrity (15 pts)
  if (pso.sos.length >= 1 && pso.sos.length <= 2) score += 15;
  
  // 8. Length & Depth (20 pts)
  if (text.split(" ").length > 15) score += 20;
  else if (text.split(" ").length > 8) score += 10;

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Validates a set of 3 PSOs across domain requirements.
 */
export function validatePSOs(psos: PSO[], programName: string, expectedCount: number = 3): ValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (psos.length !== expectedCount) {
    return {
      score: 0,
      passed: false,
      issues: [`Must have exactly ${expectedCount} PSOs. Received ${psos.length}.`],
      suggestions: ["Ensure the JSON format includes all requested outcomes."]
    };
  }

  const domainKeywords = getDomainKeywords(programName);
  let totalScore = 0;

  psos.forEach((pso, index) => {
    const score = scorePSO(pso, domainKeywords);
    totalScore += score;

    const text = pso.statement.toLowerCase();

    // 🔥 ABET RULE ENGINE
    if (text.includes("design") && !pso.sos.includes("SO2")) {
      issues.push(`PSO ${index + 1}: Engineering "design" requires mapping to SO2.`);
      suggestions.push(`Add "SO2" to the mapped elements for PSO ${index + 1}.`);
    }

    if ((text.includes("safety") || text.includes("ethics")) && !pso.sos.includes("SO4")) {
      issues.push(`PSO ${index + 1}: Safety or ethical considerations should map to SO4.`);
      suggestions.push(`Map PSO ${index + 1} to "SO4" for accountability and impact.`);
    }

    if (text.includes("experiment") && !pso.sos.includes("SO6")) {
      issues.push(`PSO ${index + 1}: Experimentation and data analysis requires SO6.`);
      suggestions.push(`Map PSO ${index + 1} to "SO6" to reflect data-driven skills.`);
    }

    if (score < 70) {
      issues.push(`PSO ${index + 1} is weak (Score: ${score}/100)`);
      suggestions.push(`Improve PSO ${index + 1} by adding more domain-specific technical keywords and real-world engineering constraints.`);
    }
  });

  const avgScore = totalScore / psos.length;

  return {
    score: avgScore,
    passed: avgScore >= 70 && issues.length === 0,
    issues,
    suggestions
  };
}
