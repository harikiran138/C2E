// ============================================================
// PSO Prompt Builder v4.0 — Coverage-Aware Accreditation Engine
// NEW: Domain Coverage Analysis, Gap Detection, NBA SAR 2025
// INCLUDES: All v3 fixes + new coverage completeness layer
// ============================================================

import type { SelectedSocietiesInput } from "@/lib/ai/pso-agent";
import type { PSOValidationResult } from "./pso-scoring";
import { PSO_PHRASE_BANK, PSO_EXAMPLES, PSO_FAILING_EXAMPLES } from "./constants";
import {
  inferDomains,
  getBenchmarkPhrasesV2,
  getDomainContextString,
} from "./domain-inference";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type PSOGenerationMode = "standard" | "strict" | "industry" | "research";

export interface PSOPromptBuilderParams {
  programName: string;
  count: number;
  vision?: string;
  mission?: string;
  peos?: string[];
  programCriteria?: {
    statement: string;
    curriculum: string[];
    faculty: string;
  };
  selectedSocieties?: SelectedSocietiesInput;
  focusAreas?: string[];
  mode?: PSOGenerationMode;
  // NEW v4: Optional domain hints
  expectedDomains?: string[];     // Core domains the program must cover
  emergingAreas?: string[];       // Optional modern/interdisciplinary areas
  existingPSOs?: string[];        // For coverage analysis of existing PSOs
}

// ─────────────────────────────────────────────
// CONSTANTS — FILLER BLACKLIST
// ─────────────────────────────────────────────

export const FILLER_BLACKLIST_PHRASES = [
  "with consideration for",
  "based on comprehensive system analysis",
  "incorporating advanced",
  "while adhering to",
  "in order to improve",
  "by applying modern",
  "and ensuring compliance",
  "to facilitate better",
  "with a focus on",
  "in the context of various",
  "using appropriate methods",
  "and related technologies",
  "various engineering principles",
  "with proper understanding",
];

// ─────────────────────────────────────────────
// CONSTANTS — STRONG VERBS (Bloom L4–L6)
// ─────────────────────────────────────────────

export const STRONG_VERBS_BY_LEVEL = {
  L4_Analyze:  ["analyze", "differentiate", "examine", "deconstruct", "compare", "investigate", "diagnose", "categorize"],
  L5_Evaluate: ["evaluate", "assess", "critique", "justify", "optimize", "validate", "benchmark", "prioritize", "appraise"],
  L6_Create:   ["design", "develop", "construct", "formulate", "synthesize", "architect", "engineer", "propose", "generate"],
};

export const ALL_STRONG_VERBS = [
  ...STRONG_VERBS_BY_LEVEL.L4_Analyze,
  ...STRONG_VERBS_BY_LEVEL.L5_Evaluate,
  ...STRONG_VERBS_BY_LEVEL.L6_Create,
];

export const BANNED_WEAK_VERBS = [
  "implement", "understand", "know", "learn", "enhance",
  "improve", "support", "facilitate", "utilize", "apply",
  "use", "demonstrate", "familiarize", "appreciate", "perform",
];

// ─────────────────────────────────────────────
// CONSTANTS — CORE DOMAIN MAPS PER PROGRAM
// Used for coverage gap analysis
// ─────────────────────────────────────────────

export const PROGRAM_CORE_DOMAINS: Record<string, string[]> = {
  "Civil Engineering": [
    "Structural Engineering",
    "Geotechnical Engineering",
    "Transportation Engineering",
    "Environmental Engineering",
    "Construction Management",
    "Water Resources Engineering",
  ],
  "Mechanical Engineering": [
    "Thermal & Fluid Systems",
    "Manufacturing & Production",
    "Machine Design",
    "Material Science",
    "Control Systems",
    "Energy Systems",
  ],
  "Electrical Engineering": [
    "Power Systems",
    "Control & Automation",
    "Electrical Machines",
    "Signal Processing",
    "High Voltage Engineering",
    "Renewable Energy Systems",
  ],
  "Electronics Engineering": [
    "VLSI Design",
    "Embedded Systems",
    "Signal & Image Processing",
    "Communication Systems",
    "Microelectronics",
    "RF & Wireless Systems",
  ],
  "Computer Science": [
    "Algorithms & Complexity",
    "Software Engineering",
    "Database Systems",
    "Computer Networks",
    "Operating Systems",
    "Distributed Systems",
  ],
  "Information Technology": [
    "Network Security",
    "Cloud Computing",
    "Web Technologies",
    "Data Management",
    "IT Infrastructure",
    "Cybersecurity",
  ],
  "AI & Machine Learning": [
    "Deep Learning",
    "Natural Language Processing",
    "Computer Vision",
    "Reinforcement Learning",
    "ML Systems Design",
    "AI Ethics & Fairness",
  ],
  "Chemical Engineering": [
    "Reaction Engineering",
    "Transport Phenomena",
    "Process Design",
    "Thermodynamics",
    "Process Control",
    "Safety & Hazard Analysis",
  ],
  "Biomedical Engineering": [
    "Biomechanics",
    "Medical Imaging",
    "Biomaterials",
    "Bioelectronics",
    "Clinical Engineering",
    "Tissue Engineering",
  ],
  "Mechatronics": [
    "Mechanical Systems Design",
    "Electronic Control Systems",
    "Robotics & Automation",
    "Sensors & Actuators",
    "Embedded Programming",
    "System Integration",
  ],
};

// ─────────────────────────────────────────────
// CONSTANTS — EMERGING AREAS PER DOMAIN
// ─────────────────────────────────────────────

const EMERGING_AREAS_MAP: Record<string, string[]> = {
  "Civil Engineering":        ["BIM & Digital Construction", "Smart Infrastructure", "Climate-Resilient Design", "Sustainable Materials"],
  "Mechanical Engineering":   ["Additive Manufacturing", "Electric Vehicles", "Industry 4.0", "Smart Manufacturing"],
  "Electrical Engineering":   ["Smart Grid", "Energy Storage", "IoT Integration", "EV Charging Infrastructure"],
  "Electronics Engineering":  ["IoT Devices", "Edge Computing", "5G Systems", "Wearable Electronics"],
  "Computer Science":         ["Cloud-Native Development", "DevSecOps", "Quantum Computing", "AI-Augmented Systems"],
  "Mechatronics":             ["Collaborative Robotics", "Digital Twin", "Human-Robot Interaction", "Autonomous Systems"],
  "Chemical Engineering":     ["Green Chemistry", "Carbon Capture", "Nanotechnology", "Biofuels"],
  "Biomedical Engineering":   ["Precision Medicine", "Brain-Computer Interfaces", "CRISPR Applications", "Nano-Medicine"],
};

// ─────────────────────────────────────────────
// CONSTANTS — VERB DIVERSITY EXAMPLES
// ─────────────────────────────────────────────

const VERB_DIVERSITY_EXAMPLE = `
❌ VERB REPETITION — BAD:
  PSO 1: "Design resilient civil infrastructure..."
  PSO 5: "Design efficient transportation networks..."

✅ VERB DIVERSITY — REQUIRED:
  PSO 1: "Design seismic-resistant structural systems..."
  PSO 2: "Evaluate flood-risk mitigation strategies..."
  PSO 3: "Analyze soil-structure interaction behavior..."
  PSO 4: "Develop BIM-integrated lifecycle cost models..."
  PSO 5: "Optimize traffic demand models for sustainable mobility..."
`.trim();

// ─────────────────────────────────────────────
// CONSTANTS — SINGLE SUB-DOMAIN EXAMPLES
// ─────────────────────────────────────────────

const SUBDOMAIN_ISOLATION_EXAMPLE = `
❌ MULTI-TOPIC — BAD:
  "Develop water resource management addressing drainage, flood control,
   and water quality with consideration for environmental sustainability."
  → 3 topics packed into 1. Never do this.

✅ SINGLE SUB-DOMAIN — REQUIRED:
  "Evaluate flood-risk mitigation strategies for urban watersheds using
   hydrological modeling and stormwater frameworks."
  → ONE clear domain focus.
`.trim();

// ─────────────────────────────────────────────
// CONSTANTS — BLOOM LEVEL EXAMPLES
// ─────────────────────────────────────────────

const BLOOM_LEVEL_EXAMPLE = `
❌ BLOOM LEVEL 3 — TOO LOW:
  "Implement BIM techniques for construction processes."
  → "Implement" = Apply = Level 3. NOT acceptable.

✅ BLOOM LEVEL 5 — CORRECT:
  "Optimize construction workflows using BIM-integrated lifecycle
   cost models for resource and schedule management."
  → "Optimize" = Evaluate = Level 5. REQUIRED minimum.
`.trim();

// ─────────────────────────────────────────────
// HELPER — Get core domains for a program
// Falls back to inferred domains if not in map
// ─────────────────────────────────────────────

function getCoreDomains(programName: string, expectedDomains?: string[]): string[] {
  if (expectedDomains && expectedDomains.length > 0) return expectedDomains;

  // Try direct map lookup
  for (const [key, domains] of Object.entries(PROGRAM_CORE_DOMAINS)) {
    if (programName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(programName.toLowerCase())) {
      return domains;
    }
  }

  // Fall back to inferred domain core areas
  const inferred = inferDomains(programName);
  return inferred.domains;
}

// ─────────────────────────────────────────────
// HELPER — Get emerging areas for a program
// ─────────────────────────────────────────────

function getEmergingAreas(programName: string, customAreas?: string[]): string[] {
  if (customAreas && customAreas.length > 0) return customAreas;

  for (const [key, areas] of Object.entries(EMERGING_AREAS_MAP)) {
    if (programName.toLowerCase().includes(key.toLowerCase())) {
      return areas.slice(0, 3); // Top 3 emerging areas
    }
  }
  return [];
}

// ─────────────────────────────────────────────
// ★ NEW v4 — STAGE 0: COVERAGE ANALYSIS PROMPT
// Analyzes existing PSOs for domain gaps BEFORE generation
// This is entirely new — did not exist in v3
// ─────────────────────────────────────────────

export function buildCoverageAnalysisPrompt(params: {
  programName: string;
  vision?: string;
  mission?: string;
  peos?: string[];
  existingPSOs: string[];
  leadSociety?: string;
  expectedDomains?: string[];
  emergingAreas?: string[];
}): string {
  const {
    programName,
    vision,
    mission,
    peos = [],
    existingPSOs,
    leadSociety,
    expectedDomains,
    emergingAreas,
  } = params;

  const coreDomains  = getCoreDomains(programName, expectedDomains);
  const modernAreas  = getEmergingAreas(programName, emergingAreas);
  const domainCtx    = getDomainContextString(programName);

  const existingText = existingPSOs.length > 0
    ? existingPSOs.map((p, i) => `PSO ${i + 1}: "${p}"`).join("\n")
    : "None provided — generate fresh PSOs with full domain coverage.";

  return `
You are an expert in Outcome-Based Education (OBE), NBA accreditation (Tier-I / SAR 2025), and ABET EAC standards.

TASK: Perform a Domain Coverage Analysis on the existing PSOs for "${programName}".
Identify gaps, imbalances, and missing core domains. Output a structured coverage report.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INPUT PARAMETERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Program of Study: ${programName}
Lead Society: ${leadSociety || "Not specified — use ABET EAC General Criteria"}
Domain Intelligence: ${domainCtx}

ACADEMIC CONTEXT (MANDATORY ALIGNMENT):
- Program Vision: ${vision || "Standard professional excellence"}
- Program Mission: ${mission || "Standard academic and professional development"}
- Program Educational Objectives (PEOs):
${peos.length > 0 ? peos.map((p, i) => `  PEO${i + 1}: ${p}`).join("\n") : "  Standard professional achievements."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXISTING PSOs (to analyze)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${existingText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPECTED CORE DOMAINS (must be covered)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${coreDomains.map((d, i) => `${i + 1}. ${d}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMERGING / INTERDISCIPLINARY AREAS (optional but valued)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${modernAreas.length > 0 ? modernAreas.map(a => `- ${a}`).join("\n") : "None specified"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYSIS INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Map each existing PSO to a core domain from the expected list.
2. Identify which core domains have NO PSO coverage (missing).
3. Identify which domains are over-represented (>1 PSO).
4. Flag any PSOs that are generic (PO-like) or non-domain-specific.
5. Check if emerging areas are represented at least once.
6. Assess if the PSO set reflects a HOLISTIC program identity.
7. Confirm NBA SAR 2025 compliance: measurable, outcome-oriented, Bloom L4+.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "coverage_analysis": {
    "covered_domains": ["Domain mapped to PSO 1", "Domain mapped to PSO 2"],
    "missing_domains": ["Domain not covered by any PSO"],
    "over_represented": ["Domain covered by 2+ PSOs"],
    "generic_psos": ["PSO text that is too generic / PO-like"],
    "emerging_covered": true,
    "holistic_score": 72,
    "nba_sar_2025_compliant": false,
    "remarks": "Overall assessment of coverage quality"
  },
  "gap_instructions": [
    "Add a PSO covering [missing domain] focused on [specific sub-area]",
    "Replace PSO N — too generic, not domain-specific"
  ]
}
START WITH '{'. END WITH '}'. VALID JSON ONLY.
`.trim();
}

// ─────────────────────────────────────────────
// STAGE 1 — PSO GENERATION PROMPT (Lightweight)
// Now includes coverage gap instructions from Stage 0
// ─────────────────────────────────────────────

export function buildPSOGenerationPrompt(params: PSOPromptBuilderParams): string {
  const {
    programName,
    count,
    vision,
    mission,
    peos = [],
    programCriteria,
    selectedSocieties,
    focusAreas = [],
    mode = "standard",
    expectedDomains,
    emergingAreas,
    existingPSOs,
  } = params;

  // Domain Intelligence Layer v2
  const benchmarkPhrases = getBenchmarkPhrasesV2(programName);
  const domainContext    = getDomainContextString(programName);
  const coreDomains      = getCoreDomains(programName, expectedDomains);
  const modernAreas      = getEmergingAreas(programName, emergingAreas);

  const criteriaText = programCriteria
    ? `Statement: ${programCriteria.statement}\nCurriculum: ${programCriteria.curriculum.join(", ")}\nFaculty: ${programCriteria.faculty}`
    : "Not provided — use ABET General Student Outcomes SO1–SO7.";

  const benchmarksText = benchmarkPhrases.slice(0, 6).map(p => `- ${p}`).join("\n");

  const modeDirectives: Record<PSOGenerationMode, string> = {
    standard: "Balance technical depth with broad domain coverage.",
    strict:   "Maximum ABET/NBA alignment. Every PSO must reflect safety, standards, or ethics in domain-specific context.",
    industry: "Industry-readiness. Reference modern industrial workflows and deployment-ready professional systems.",
    research: "Research & Innovation. Emphasize mathematical modeling, simulation, and optimization.",
  };

  const verbList = ALL_STRONG_VERBS.join(", ");

  // Coverage context — tell model which domains MUST be covered
  const domainCoverageText = coreDomains.length > 0
    ? `MANDATORY DOMAIN COVERAGE:\nEach PSO must map to ONE of these core domains:\n${coreDomains.map((d, i) => `${i + 1}. ${d}`).join("\n")}`
    : "Cover all major technical sub-domains of the program.";

  const emergingText = modernAreas.length > 0
    ? `EMERGING AREAS (include at least one):\n${modernAreas.map(a => `- ${a}`).join("\n")}`
    : "";

  return `
You are an expert in OBE, NBA accreditation (Tier-I / SAR 2025), and ABET EAC frameworks.

TASK: Generate ${count} high-quality Program Specific Outcomes (PSOs) for "${programName}".
Ensure COMPLETE domain coverage across all core areas of the program.

ACADEMIC CONTEXT (MANDATORY ALIGNMENT):
- Program Vision: ${vision || "Standard professional excellence"}
- Program Mission: ${mission || "Standard academic and professional development"}
- Program Educational Objectives (PEOs):
${peos.length > 0 ? peos.map((p, i) => `  PEO${i + 1}: ${p}`).join("\n") : "  Standard professional achievements."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRAM INPUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Program: ${programName}
Criteria: ${criteriaText}
Lead Societies: ${selectedSocieties?.lead?.join(", ") || "Not specified"}
Focus Areas: ${focusAreas.length > 0 ? focusAreas.join(", ") : "General program competencies"}
Mode: ${mode.toUpperCase()} — ${modeDirectives[mode]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMAIN INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${domainContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COVERAGE REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${domainCoverageText}

${emergingText}

BALANCE RULE: Do NOT over-concentrate in a single domain (e.g., all design-focused).
Each PSO must reflect a DISTINCT domain — giving the program a holistic identity.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Start every PSO with "Graduates will be able to"
2. Use ONE strong verb per PSO from: ${verbList}
3. Each PSO must use a DIFFERENT verb — no repetition
4. Each PSO must target EXACTLY ONE specific sub-domain
5. Length: 20–30 words per PSO
6. NBA SAR 2025: Measurable, outcome-oriented, Bloom L4–L6 only
7. No PO overlap — PSOs must be program-specific, not generic

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE BENCHMARKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${benchmarksText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "raw_psos": [
    "Graduates will be able to [Verb] [Specific Sub-domain] [Real-world constraint]..."
  ],
  "domain_map": {
    "PSO_1": "Core domain covered",
    "PSO_2": "Core domain covered"
  }
}
START WITH '{'. END WITH '}'. VALID JSON ONLY.
`.trim();
}

// ─────────────────────────────────────────────
// STAGE 2 — ENFORCEMENT PROMPT
// All 10 rules enforced on raw PSOs
// NEW: Coverage completeness + NBA SAR 2025 rule added
// ─────────────────────────────────────────────

export function buildPSOEnforcementPrompt(params: {
  programName: string;
  rawPSOs: string[];
  vision?: string;
  mission?: string;
  peos?: string[];
  mode?: PSOGenerationMode;
  selectedSocieties?: SelectedSocietiesInput;
  expectedDomains?: string[];
  emergingAreas?: string[];
  coverageGaps?: string[];   // From Stage 0 coverage analysis
}): string {
  const {
    programName,
    rawPSOs,
    vision,
    mission,
    peos = [],
    expectedDomains,
    emergingAreas,
    coverageGaps = [],
  } = params;

  const coreDomains   = getCoreDomains(programName, expectedDomains);
  const modernAreas   = getEmergingAreas(programName, emergingAreas);
  const fillerList    = FILLER_BLACKLIST_PHRASES.map(f => `"${f}"`).join(", ");
  const weakVerbList  = BANNED_WEAK_VERBS.join(", ");
  const strongVerbs   = ALL_STRONG_VERBS.join(", ");

  const failingExamplesText = PSO_FAILING_EXAMPLES
    .map(ex => `❌ "${ex.text}"\n   WHY: ${ex.reason}`)
    .join("\n\n");

  const gapsText = coverageGaps.length > 0
    ? `\nCOVERAGE GAPS TO FIX (from analysis):\n${coverageGaps.map(g => `→ ${g}`).join("\n")}`
    : "";

  return `
You are an Expert PSO Auditor for NBA (Tier-I / SAR 2025) and ABET EAC accreditation.

TASK: AUDIT and FIX raw PSOs for "${programName}".
Apply ALL 10 rules. Ensure complete domain coverage and accreditation compliance.

ACADEMIC CONTEXT (MANDATORY ALIGNMENT):
- Program Vision: ${vision || "Standard professional excellence"}
- Program Mission: ${mission || "Standard academic and professional development"}
- Program Educational Objectives (PEOs):
${peos.length > 0 ? peos.map((p, i) => `  PEO${i + 1}: ${p}`).join("\n") : "  Standard professional achievements."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RAW PSOs TO FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rawPSOs.map((p, i) => `${i + 1}. ${p}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY CORE DOMAINS (all must be covered)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${coreDomains.map((d, i) => `${i + 1}. ${d}`).join("\n")}
${emergingAreas && emergingAreas.length > 0 ? `\nEmerging areas to include: ${emergingAreas.join(", ")}` : ""}
${gapsText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10 ENFORCEMENT RULES (ALL MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RULE 1 — VERB DIVERSITY
No two PSOs may use the same primary verb.
${VERB_DIVERSITY_EXAMPLE}

RULE 2 — SINGLE SUB-DOMAIN
Each PSO covers exactly ONE specific sub-domain.
${SUBDOMAIN_ISOLATION_EXAMPLE}

RULE 3 — BLOOM LEVEL 4–6 ONLY
Banned verbs: ${weakVerbList}
Use strong verbs: ${strongVerbs}
${BLOOM_LEVEL_EXAMPLE}

RULE 4 — FILLER PHRASE REMOVAL
Remove all: ${fillerList}

RULE 5 — ONE ACTION VERB PER PSO
Remove compound actions: "by applying", "and ensuring", "to improve", "while adhering to"

RULE 6 — DOMAIN SPECIFICITY
Replace generic terms with discipline-specific sub-domain keywords.
❌ "engineering systems" → ✅ "seismic load-bearing systems"

RULE 7 — REDUNDANCY REMOVAL
No two PSOs may overlap conceptually, even with different verbs.

RULE 8 — WASHINGTON ACCORD WK ALIGNMENT
Map each PSO to WK1–WK6. Distribute across attributes, don't cluster.

RULE 9 — NO PO OVERLAP
PSOs must NOT repeat generic POs (ethics, communication, teamwork).

RULE 10 — COVERAGE COMPLETENESS (★ NEW)
After all other fixes, verify the PSO set collectively covers:
- All core domains listed above (at least one PSO per major domain)
- At least one emerging/interdisciplinary area
- No single domain has more than one PSO
- The set reflects a HOLISTIC program identity
- NBA SAR 2025: All PSOs measurable, outcome-oriented, action-verb driven

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWN BAD PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${failingExamplesText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "final_psos": [
    {
      "PSO_number": "PSO1",
      "statement": "Graduates will be able to...",
      "focus_area": "Core domain this PSO covers",
      "bloom_level": "L5 - Evaluate",
      "wk_attribute": "WK4",
      "abet_outcome": "SO2"
    }
  ],
  "coverage_analysis": {
    "covered_domains": [],
    "missing_domains": [],
    "emerging_covered": true,
    "holistic_score": 90,
    "nba_sar_2025_compliant": true,
    "remarks": ""
  },
  "fix_summary": {
    "issues_detected": ["Rule N: exact issue"],
    "changes_made": ["PSO N: what changed"],
    "verb_map": {"PSO_1": "verb", "PSO_2": "verb"},
    "final_quality": "Accreditation Ready — NBA SAR 2025"
  }
}
START WITH '{'. END WITH '}'. VALID JSON ONLY.
`.trim();
}

// ─────────────────────────────────────────────
// RETRY PROMPT — Structured Feedback Retry
// ─────────────────────────────────────────────

export function buildRetryPrompt(
  basePrompt: string,
  feedback: PSOValidationResult,
  previousResults: any[] = []
): string {
  const weakPSOs = (feedback?.psoAnalyses || [])
    .filter(pa => (pa?.score || 0) < 75)
    .map(pa => ({
      index: (pa?.index || 0) + 1,
      statement: pa?.statement || "",
      score: pa?.score || 0,
      issues: pa?.issues || [],
    }));

  const globalIssues = [
    ...(feedback?.globalIssues || []),
    ...(feedback?.detailedDrawbacks || []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const structuredFeedback = {
    global_score: feedback?.score || 0,
    total_psos: feedback?.psoAnalyses?.length || 0,
    critical_rules_violated: globalIssues,
    weak_psos: weakPSOs,
    coverage_gaps: (feedback as any)?.coverageGaps || [],
  };

  const prevText = previousResults.length > 0
    ? `\nPREVIOUS FAILED PSOs:\n${JSON.stringify(previousResults, null, 2)}`
    : "";

  return `
${basePrompt}
${prevText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RETRY — STRUCTURED FAILURE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(structuredFeedback, null, 2)}

RETRY INSTRUCTIONS:
1. Fix EVERY issue in "critical_rules_violated"
2. Completely rewrite ALL PSOs in "weak_psos" (score < 75)
3. Address ALL gaps listed in "coverage_gaps"
4. Do NOT reuse any verb or sub-domain from previous attempt
5. Each PSO must map to a DIFFERENT core domain
6. Output ONLY corrected valid JSON. NO PREAMBLE. NO MARKDOWN.
`.trim();
}

// ─────────────────────────────────────────────
// EVALUATOR / REFINEMENT PROMPT v4
// NEW: Coverage-aware refinement, holistic scoring,
// NBA SAR 2025 compliance check
// ─────────────────────────────────────────────

export function buildPSOEvaluatorPrompt(params: {
  programName: string;
  vision?: string;
  mission?: string;
  peos?: string[];
  existingPSOs: any[];
  feedback: PSOValidationResult;
  expectedDomains?: string[];
  emergingAreas?: string[];
}): string {
  const {
    programName,
    vision,
    mission,
    peos = [],
    feedback,
    expectedDomains,
    emergingAreas,
  } = params;

  const coreDomains  = getCoreDomains(programName, expectedDomains);
  const modernAreas  = getEmergingAreas(programName, emergingAreas);
  const domainCtx    = getDomainContextString(programName);
  const fillerList   = FILLER_BLACKLIST_PHRASES.map(f => `"${f}"`).join(", ");
  const weakVerbs    = BANNED_WEAK_VERBS.join(", ");
  const strongVerbs  = ALL_STRONG_VERBS.join(", ");

  const analyses = (feedback?.psoAnalyses || []).map(pa => ({
    id: (pa?.index || 0) + 1,
    statement: pa?.statement || "",
    score: pa?.score || 0,
    issues: pa?.issues || [],
    needs_fix: (pa?.score || 0) < 85,
  }));

  const strongPSOs = analyses.filter(a => !a.needs_fix);
  const weakPSOs   = analyses.filter(a => a.needs_fix);

  return `
You are an Expert Accreditation Auditor for NBA (Tier-I / SAR 2025), Washington Accord, and ABET EAC.

TASK: REFINE the PSO set for "${programName}".
Apply all 10 rules. Preserve strong PSOs. Fix weak ones. Ensure complete domain coverage.

ACADEMIC CONTEXT (MANDATORY ALIGNMENT):
- Program Vision: ${vision || "Standard professional excellence"}
- Program Mission: ${mission || "Standard academic and professional development"}
- Program Educational Objectives (PEOs):
${peos.length > 0 ? peos.map((p, i) => `  PEO${i + 1}: ${p}`).join("\n") : "  Standard professional achievements."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NON-DESTRUCTIVE RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO NOT modify PSOs with Score ≥ 85 unless a rule violation is detected.
${strongPSOs.length > 0
  ? `Strong PSOs (preserve):\n${strongPSOs.map(p => `✅ PSO ${p.id} (${p.score}): "${p.statement}"`).join("\n")}`
  : "None — all PSOs need refinement."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEAK PSOs — MUST FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${weakPSOs.length > 0
  ? weakPSOs.map(p => `❌ PSO ${p.id} (${p.score}):\n   "${p.statement}"\n   Issues: ${p.issues.join(" | ")}`).join("\n\n")
  : "None."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOMAIN INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${domainCtx}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE DOMAINS (full coverage required)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${coreDomains.map((d, i) => `${i + 1}. ${d}`).join("\n")}
${modernAreas.length > 0 ? `\nEmerging areas: ${modernAreas.join(", ")}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MASTER EVALUATOR FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(feedback?.detailedDrawbacks || []).map(d => `❌ ${d}`).join("\n") || "No global issues."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10 REFINEMENT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 1 — VERB DIVERSITY: No two PSOs share a verb | ${VERB_DIVERSITY_EXAMPLE}
RULE 2 — SINGLE SUB-DOMAIN: One domain per PSO | ${SUBDOMAIN_ISOLATION_EXAMPLE}
RULE 3 — BLOOM L4–L6: Banned: ${weakVerbs} | Required: ${strongVerbs}
RULE 4 — FILLER REMOVAL: Remove ${fillerList}
RULE 5 — ONE ACTION VERB: No hidden compound actions
RULE 6 — DOMAIN SPECIFICITY: Use discipline-specific sub-domain keywords
RULE 7 — REDUNDANCY: No conceptual overlap between PSOs
RULE 8 — WK ALIGNMENT: Map to WK1–WK6 (Washington Accord), distribute evenly
RULE 9 — NO PO OVERLAP: PSOs must not repeat generic Program Outcomes
RULE 10 — COVERAGE COMPLETENESS: All core domains covered, no over-concentration,
          at least one emerging area, holistic program identity, NBA SAR 2025 compliant

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALL PSOs (full context)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(analyses, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "final_psos": [
    {
      "PSO_number": "PSO1",
      "statement": "Graduates will be able to...",
      "focus_area": "Domain covered",
      "bloom_level": "L5 - Evaluate",
      "wk_attribute": "WK4",
      "abet_outcome": "SO2"
    }
  ],
  "coverage_analysis": {
    "covered_domains": [],
    "missing_domains": [],
    "over_represented": [],
    "emerging_covered": true,
    "holistic_score": 90,
    "nba_sar_2025_compliant": true,
    "remarks": ""
  },
  "fix_summary": {
    "issues_detected": ["Rule N: issue"],
    "changes_made": ["PSO N: change"],
    "preserved_psos": ["PSO N: kept — score >= 85"],
    "verb_map": {"PSO_1": "verb"},
    "wk_map": {"PSO_1": "WK4"},
    "final_quality": "Accreditation Ready — NBA SAR 2025"
  }
}
START WITH '{'. END WITH '}'. VALID JSON ONLY.
`.trim();
}

// ─────────────────────────────────────────────
// BACKEND HELPERS — For scoring/validation layer
// ─────────────────────────────────────────────

export function countStrongVerbs(statement: string): number {
  const lower = statement.toLowerCase();
  return ALL_STRONG_VERBS.filter(v => new RegExp(`\\b${v}\\b`).test(lower)).length;
}

export function detectFillerPhrases(statement: string): string[] {
  const lower = statement.toLowerCase();
  return FILLER_BLACKLIST_PHRASES.filter(f => lower.includes(f.toLowerCase()));
}

export function detectWeakVerbs(statement: string): string[] {
  const lower = statement.toLowerCase();
  return BANNED_WEAK_VERBS.filter(v => new RegExp(`\\b${v}\\b`).test(lower));
}

export function checkVerbDiversity(psos: string[]): string[] {
  const usedVerbs: string[] = [];
  const duplicates: string[] = [];
  for (const pso of psos) {
    const lower = pso.toLowerCase();
    for (const verb of ALL_STRONG_VERBS) {
      if (new RegExp(`\\b${verb}\\b`).test(lower)) {
        if (usedVerbs.includes(verb)) duplicates.push(verb);
        else usedVerbs.push(verb);
        break;
      }
    }
  }
  return duplicates;
}

export function checkCoverageCompleteness(
  psos: string[],
  programName: string,
  expectedDomains?: string[]
): { covered: string[]; missing: string[]; score: number } {
  const coreDomains = getCoreDomains(programName, expectedDomains);
  const covered: string[] = [];
  const missing: string[] = [];

  for (const domain of coreDomains) {
    const domainWords = domain.toLowerCase().split(/\s+/);
    const isCovered = psos.some(pso =>
      domainWords.some(word => word.length > 3 && pso.toLowerCase().includes(word))
    );
    if (isCovered) covered.push(domain);
    else missing.push(domain);
  }

  const score = coreDomains.length > 0
    ? Math.round((covered.length / coreDomains.length) * 100)
    : 100;

  return { covered, missing, score };
}
