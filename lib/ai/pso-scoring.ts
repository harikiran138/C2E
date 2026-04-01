/**
 * lib/ai/pso-scoring.ts
 * Standardized scoring engine for Program Specific Outcomes (PSOs).
 */

import { PSO_PHRASE_BANK } from "./constants";

export interface PSO {
  statement: string;
  abetMappings: string[];
  focusArea?: string;
  skill?: string;
}

export interface PSOScore {
  total: number;
  breakdown: {
    actionVerb: number;
    abetMapping: number;
    domainRelevance: number;
    depth: number;
    realWorldContext: number;
  };
  issues: string[];
}

export interface PSOValidationResult {
  score: number;
  passed: boolean;
  psos: Array<{
    pso: PSO;
    score: PSOScore;
  }>;
  globalIssues: string[];
}

const STRONG_VERBS = ["analyze", "design", "implement", "evaluate", "develop", "apply", "optimize", "integrate", "formulate", "conduct", "model"];
const WEAK_VERBS = ["understand", "know", "learn", "aware", "familiar"];
const CONTEXT_KEYWORDS = ["safety", "cost", "sustainable", "efficiency", "standards", "constraints", "ethics", "environmental", "security", "reliable", "economics", "compliance"];

/**
 * Scores a single PSO statement.
 */
export function scorePSO(pso: PSO, programName: string): PSOScore {
  let score = 0;
  const issues: string[] = [];
  const text = pso.statement.toLowerCase().trim();
  const words = text.split(/\s+/);

  const breakdown = {
    actionVerb: 0,
    abetMapping: 0,
    domainRelevance: 0,
    depth: 0,
    realWorldContext: 0,
  };

  // 1. Action Verb (20 pts)
  const firstWord = words[0]?.replace(/[^a-z]/g, "");
  if (STRONG_VERBS.some(v => firstWord?.startsWith(v))) {
    breakdown.actionVerb = 20;
  } else if (WEAK_VERBS.some(v => firstWord?.startsWith(v))) {
    breakdown.actionVerb = 0;
    issues.push(`Weak action verb "${firstWord}" used. Use measurable Bloom's taxonomy verbs.`);
  } else {
    breakdown.actionVerb = 10;
    issues.push(`Action verb "${firstWord}" is acceptable but could be stronger.`);
  }

  // 1a. Single Action Verb Rule (NBA requirement)
  const actionVerbsFound = words.filter(w => [...STRONG_VERBS, ...WEAK_VERBS].some(v => w.startsWith(v)));
  if (actionVerbsFound.length > 1) {
    breakdown.actionVerb -= 10;
    issues.push(`Multiple action verbs detected (${actionVerbsFound.join(", ")}). NBA requires one primary outcome per PSO.`);
  }

  // 1b. Tool Generalization (Director Rule)
  const discouragedTools = ["matlab", "python", "java", "autocad", "solidworks", "ansys", "excel", "labview"];
  const foundTools = discouragedTools.filter(t => text.includes(t));
  if (foundTools.length > 0) {
    breakdown.depth -= 5;
    issues.push(`Avoid specific tool names like "${foundTools.join(", ")}". Generalize to "modern computational tools" or "appropriate engineering tools."`);
  }

  // 2. ABET Mapping Integrity (20 pts)
  const abetMappings = pso.abetMappings || [];
  if (abetMappings.length > 0) {
    breakdown.abetMapping = 20;
    
    // Logic checks
    if (text.includes("design") && !abetMappings.includes("SO2")) {
      breakdown.abetMapping -= 10;
      issues.push("Engineering 'design' usually requires mapping to SO2.");
    }
    if ((text.includes("safety") || text.includes("ethics")) && !abetMappings.includes("SO4")) {
      breakdown.abetMapping -= 5;
      issues.push("Safety or ethics considerations should typically map to SO4.");
    }
    if ((text.includes("analysis") || text.includes("analyze") || text.includes("evaluate")) && !abetMappings.includes("SO1")) {
      breakdown.abetMapping -= 5;
      issues.push("Technical analysis or evaluation should typically map to SO1.");
    }
  } else {
    issues.push("Missing ABET Student Outcome mapping.");
  }

  // 3. Domain Relevance (20 pts)
  const domainKeywords = getDomainKeywords(programName);
  const foundKeywords = domainKeywords.filter(k => text.includes(k));
  breakdown.domainRelevance = Math.min(20, foundKeywords.length * 10);
  if (breakdown.domainRelevance === 0) {
    issues.push("Statement lacks discipline-specific technical keywords.");
  }

  // 4. Depth & Complexity (20 pts)
  if (words.length >= 18) breakdown.depth = 20;
  else if (words.length >= 14) breakdown.depth = 15;
  else {
    breakdown.depth = 5;
    issues.push("Statement is too brief. Provide more technical context.");
  }

  // 5. Real-world Context / Constraints (20 pts)
  const foundContext = CONTEXT_KEYWORDS.filter(k => text.includes(k));
  breakdown.realWorldContext = Math.min(20, foundContext.length * 10);
  if (breakdown.realWorldContext === 0) {
    issues.push("Lacks mention of real-world constraints (safety, cost, standards, etc.).");
  }

  score = breakdown.actionVerb + breakdown.abetMapping + breakdown.domainRelevance + breakdown.depth + breakdown.realWorldContext;

  return { total: Math.max(0, Math.min(100, score)), breakdown, issues };
}

/**
 * Validates a set of PSOs.
 */
export function validatePSOs(psos: PSO[], programName: string, expectedCount: number = 3): PSOValidationResult {
  const results = psos.map(p => ({
    pso: p,
    score: scorePSO(p, programName)
  }));

  const avgScore = results.reduce((acc, curr) => acc + curr.score.total, 0) / (psos.length || 1);
  const globalIssues: string[] = [];

  if (psos.length < expectedCount) {
    globalIssues.push(`Count mismatch: Generated ${psos.length} PSOs, but ${expectedCount} were requested.`);
  }

  // Coverage Checks (NBA/ABET Requirement)
  const allMappings = psos.flatMap(p => p.abetMappings || []);
  if (!allMappings.includes("SO1")) {
    globalIssues.push("Coverage GAP: At least one PSO must cover Problem Solving / Analysis (SO1).");
  }
  if (!allMappings.includes("SO2")) {
    globalIssues.push("Coverage GAP: At least one PSO must cover Engineering Design (SO2).");
  }

  // Check for excessive similarity (Prevent repetitive pattern)
  for (let i = 0; i < psos.length; i++) {
    for (let j = i + 1; j < psos.length; j++) {
      const similarity = calculateSimilarity(psos[i].statement, psos[j].statement);
      if (similarity > 0.65) {
        globalIssues.push(`Redundancy Error: PSO ${i+1} and PSO ${j+1} are too similar (${Math.round(similarity * 100)}% overlap).`);
      }
    }
  }

  return {
    score: avgScore,
    passed: avgScore >= 85 && globalIssues.length === 0,
    psos: results,
    globalIssues
  };
}

function getDomainKeywords(programName: string): string[] {
  const name = programName.toLowerCase();
  
  // Software / Computer / IT
  if (name.includes("computer") || name.includes("software") || name.includes("it") || name.includes("intelligence") || name.includes("data science") || name.includes("smart"))
    return ["software", "cloud", "algorithm", "data", "database", "security", "network", "computing", "development", "architectural", "intelligent", "system", "modeling", "sensors", "interconnectivity"];
  
  // Mechanical / Mechatronics / Robotics
  if (name.includes("mechanical") || name.includes("mechatronics") || name.includes("robotics"))
    return ["thermodynamics", "fluid", "manufacturing", "cad", "thermal", "design", "mechanics", "robotic", "material", "industrial", "product", "machinery", "actuators", "control", "automation"];
  
  // Electrical / Electronics
  if (name.includes("electrical") || name.includes("electronics"))
    return ["circuit", "signal", "power", "control", "embedded", "vlsi", "communication", "smart grid", "electronics", "automated", "hardware"];
  
  // Civil / Structural / Infrastructure
  if (name.includes("civil") || name.includes("structural") || name.includes("infrastructure"))
    return ["structural", "geotechnical", "transportation", "construction", "environment", "surveying", "infrastructure", "resilient", "durability", "buildings", "urban"];
  
  // Chemical / Materials / Textile
  if (name.includes("chemical") || name.includes("materials") || name.includes("textile") || name.includes("ceramics") || name.includes("metallurgical"))
    return ["process", "reaction", "thermodynamics", "polymers", "fiber", "nanomaterial", "structure-property", "synthesis", "processing", "microstructure", "spectroscopy", "kinetics"];

  // Industrial / Manufacturing / Management
  if (name.includes("industrial") || name.includes("manufacturing") || name.includes("production") || name.includes("management"))
    return ["logistics", "supply chain", "optimization", "productivity", "ergonomics", "lean", "quality control", "operations research", "industrial systems", "human factors"];

  // Biomedical / Bioengineering / Biotech
  if (name.includes("biomedical") || name.includes("bio") || name.includes("healthcare"))
    return ["biological", "instrumentation", "biomechanics", "clinical", "molecular", "diagnostic", "prosthetic", "genetics", "physiology", "medical technology"];

  // Aerospace / Aeronautical
  if (name.includes("aerospace") || name.includes("aeronautical") || name.includes("astronautical"))
    return ["aerodynamics", "propulsion", "flight", "orbital", "satellite", "avionic", "spacecraft", "aerospace structure", "supersonic"];

  // Systems / General
  if (name.includes("systems") || name.includes("general") || name === "engineering")
    return ["system modeling", "life-cycle", "optimization", "complexity", "simulation", "interdisciplinary", "integration", "reliability", "standards"];

  return ["system", "engineering", "process", "technical", "modeling", "simulation", "optimization", "standards"];
}

function calculateSimilarity(s1: string, s2: string): number {
  const words1 = new Set(s1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(s2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const intersect = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersect.size / (union.size || 1);
}
