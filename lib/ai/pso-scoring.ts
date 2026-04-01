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
  passed: boolean;
  score: number;
  globalIssues: string[];
  detailedDrawbacks: string[]; // Explicit feedback for AI refinement
  psoAnalyses: {
    index: number;
    statement: string;
    score: number;
    issues: string[];
  }[];
}

const STRONG_VERBS = [
  "analyze", "design", "evaluate", "develop", "construct", "formulate", "synthesize", "architect", "engineer", "propose", "generate",
  "differentiate", "examine", "deconstruct", "compare", "investigate", "diagnose", "categorize",
  "assess", "critique", "justify", "optimize", "validate", "benchmark", "prioritize", "appraise"
];
const WEAK_VERBS = ["understand", "know", "learn", "aware", "familiar", "enhance", "improve", "support", "facilitate", "utilize", "apply", "use", "demonstrate", "familiarize", "appreciate", "perform", "implement"];
const HIDDEN_MULTI_ACTION_PATTERNS = ["by applying", "and ensuring", "to improve", "while adhering to"];
const CONTEXT_KEYWORDS = ["safety", "cost", "sustainable", "efficiency", "standards", "constraints", "ethics", "environmental", "security", "reliable", "economics", "compliance", "regulatory", "technical", "lifecycle"];

const PO_LIKE_GENERIC_PHRASES = [
  "engineering principles", "understand engineering", "ethical implications", 
  "professional ethics", "lifelong learning", "teamwork", "communication skills",
  "project management", "environment and sustainability", "social responsibility"
];

/**
 * Detects if a PSO statement is too generic (more like a Program Outcome).
 */
export function isPOLike(statement: string): boolean {
  const text = statement.toLowerCase();
  return PO_LIKE_GENERIC_PHRASES.some(phrase => text.includes(phrase)) && 
         !getDomainKeywords("general").some(k => text.includes(k)); // No specific domain keywords
}

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

  // 0. PO-like Detection (Cleanup Rule 1)
  if (isPOLike(pso.statement)) {
    score -= 30;
    issues.push("PO-like statement detected. PSO is too generic (e.g. ethics-only). Convert to a domain-specific technical outcome.");
  }

  // 1. Action Verb (20 pts)
  // Handle "Graduates will be able to" prefix
  let verbIndex = 0;
  if (text.startsWith("graduates will be able to")) {
    verbIndex = 5; // Skip the first 5 words
  }
  
  const targetVerb = words[verbIndex]?.replace(/[^a-z]/g, "");
  
  if (STRONG_VERBS.some((v: string) => targetVerb === v || targetVerb?.startsWith(v))) {
    breakdown.actionVerb = 20;
  } else if (WEAK_VERBS.some((v: string) => targetVerb === v || targetVerb?.startsWith(v))) {
    breakdown.actionVerb = 0;
    issues.push(`Weak action verb "${targetVerb}" used. Use measurable Bloom's taxonomy verbs (L4-L6).`);
  } else {
    breakdown.actionVerb = 10;
    issues.push(`Action verb "${targetVerb}" is acceptable but could be stronger.`);
  }

  // 1a. Single Action Verb Rule (Cleanup Rule 2)
  // Only look for verbs AFTER the prefix
  const wordsToCheck = words.slice(verbIndex + 1);
  const actionVerbsFound = wordsToCheck.filter(w => [...STRONG_VERBS, ...WEAK_VERBS].some((v: string) => w.startsWith(v)));
  if (actionVerbsFound.length > 1) {
    breakdown.actionVerb -= 10;
    issues.push(`Multiple action verbs detected (${actionVerbsFound.join(", ")}). Each PSO MUST target EXACTLY ONE primary measurable competency.`);
  }

  // 1a-ii. Hidden Multi-action Detection (Cleanup Rule 4)
  const hasHiddenMultiAction = HIDDEN_MULTI_ACTION_PATTERNS.some(p => text.includes(p));
  if (hasHiddenMultiAction) {
    breakdown.actionVerb -= 10;
    issues.push("Hidden multi-action detected ('by applying', 'and ensuring', etc.). Simplify to ONE clear measurable outcome.");
  }

  // 1b. Tool Generalization (Director Rule)
  const discouragedTools = ["matlab", "python", "java", "autocad", "solidworks", "ansys", "excel", "labview"];
  const foundTools = discouragedTools.filter(t => text.includes(t));
  if (foundTools.length > 0) {
    breakdown.depth -= 5;
    issues.push(`Tool Generalization: Avoid specific tool names like "${foundTools.join(", ")}". Use "appropriate engineering tools" instead.`);
  }

  // 1c. Domain Enforcement (Cleanup Rule 5)
  if (text.includes("engineering systems") || text.includes("technical systems")) {
    breakdown.domainRelevance -= 5;
    issues.push("Domain Enforcement: Avoid generic terms like 'engineering systems'. Use program-specific terms (e.g. 'power systems', 'embedded systems').");
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
  const foundContext = CONTEXT_KEYWORDS.filter((k: string) => text.includes(k));
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

  // Adapt to input count - no longer enforcing fixed number
  if (psos.length === 0) {
    globalIssues.push("No PSOs provided for validation.");
  }

  // Coverage Checks (NBA/ABET Requirement)
  const allMappings = psos.flatMap(p => p.abetMappings || []);
  if (!allMappings.includes("SO1")) {
    globalIssues.push("Coverage GAP: At least one PSO must cover Problem Solving / Analysis (SO1).");
  }
  if (!allMappings.includes("SO2")) {
    globalIssues.push("Coverage GAP: At least one PSO must cover Engineering Design (SO2).");
  }

  let overlapPenalty = 0;
  // 6. Overlap Detection (Cleanup Rule 3)
  for (let i = 0; i < psos.length; i++) {
    for (let j = i + 1; j < psos.length; j++) {
      const similarity = calculateSimilarity(psos[i].statement, psos[j].statement);
      if (similarity > 0.6) {
        overlapPenalty += 10;
        globalIssues.push(`Overlap Detected: PSO ${i+1} and PSO ${j+1} are redundant. Merge or differentiate them to ensure unique competencies.`);
      }
    }
  }

  // v4: Count flexibility for hybrid programs
  const isHybrid = psos.length >= 4; // Programs requiring multiple focus areas
  const countMismatch = isHybrid 
    ? (psos.length < expectedCount) 
    : (psos.length !== expectedCount);
  
  const totalScore = Math.max(0, avgScore - overlapPenalty);

  const psoAnalyses = results.map((pr, i) => ({
    index: i,
    statement: pr.pso.statement,
    score: pr.score.total,
    issues: pr.score.issues
  }));

  const detailedDrawbacks: string[] = [];
  psoAnalyses.forEach(pa => {
    if (pa.score < 80) {
      detailedDrawbacks.push(`PSO ${pa.index + 1} is weak (Score: ${pa.score}). Issues: ${pa.issues.join(", ")}`);
    }
  });

  if (overlapPenalty > 0) detailedDrawbacks.push(`Redundancy Detected: High overlap between PSOs (Penalty: -${overlapPenalty}).`);
  if (countMismatch) detailedDrawbacks.push(`Count Mismatch: Expected ${expectedCount} PSOs but found ${psos.length}.`);

  return {
    passed: totalScore >= 75 && !countMismatch && globalIssues.length === 0,
    score: totalScore,
    globalIssues,
    detailedDrawbacks,
    psoAnalyses
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
