// ============================================================
// PSO Prompt Builder v3.0 — Accreditation-Grade Engine
// Upgraded: Split Generation/Enforcement, Verb Diversity, 
// Sub-domain Isolation, Filler Blacklist, Bloom L4-6 Guard, 
// Structured Retry, Washington Accord WK Alignment
// ============================================================

import type { SelectedSocietiesInput } from "@/lib/ai/pso-agent";
import type { PSOValidationResult } from "./pso-scoring";
import { PSO_PHRASE_BANK, PSO_EXAMPLES, PSO_FAILING_EXAMPLES } from "./constants";
import { 
  getBenchmarkPhrasesV2, 
  getDomainContextString, 
  inferDomains 
} from "./domain-inference";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type PSOGenerationMode = "standard" | "strict" | "industry" | "research";

export interface PSOPromptBuilderParams {
  programName: string;
  count: number;
  programCriteria?: {
    statement: string;
    curriculum: string[];
    faculty: string;
  };
  selectedSocieties?: SelectedSocietiesInput;
  focusAreas?: string[];
  mode?: PSOGenerationMode;
}

// ─────────────────────────────────────────────
// CONSTANTS — FILLER BLACKLIST
// These phrases weaken PSO quality. Injected into prompts.
// ─────────────────────────────────────────────

const FILLER_PHRASE_BLACKLIST = [
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
];

// ─────────────────────────────────────────────
// CONSTANTS — STRONG VERB POOL (Bloom L4–L6)
// ─────────────────────────────────────────────

const STRONG_VERBS_BY_LEVEL = {
  L4_Analyze: ["analyze", "differentiate", "examine", "deconstruct", "compare", "investigate", "diagnose"],
  L5_Evaluate: ["evaluate", "assess", "critique", "justify", "optimize", "validate", "benchmark"],
  L6_Create:   ["design", "develop", "construct", "formulate", "synthesize", "architect", "engineer"],
};

// Flat list for injection into prompts
const ALL_STRONG_VERBS = [
  ...STRONG_VERBS_BY_LEVEL.L4_Analyze,
  ...STRONG_VERBS_BY_LEVEL.L5_Evaluate,
  ...STRONG_VERBS_BY_LEVEL.L6_Create,
];

// ─────────────────────────────────────────────
// CONSTANTS — BANNED WEAK VERBS
// ─────────────────────────────────────────────

const WEAK_VERBS = [
  "implement", "understand", "know", "learn", "enhance",
  "improve", "support", "facilitate", "utilize", "apply",
  "use", "demonstrate", "familiarize", "appreciate",
];

// ─────────────────────────────────────────────
// CONSTANTS — VERB DIVERSITY EXAMPLES
// Injected into prompt to show what verb repetition looks like
// ─────────────────────────────────────────────

const VERB_DIVERSITY_EXAMPLES = `
❌ VERB REPETITION (BAD):
PSO 1: "Design resilient civil infrastructure..."
PSO 5: "Design efficient transportation networks..."
→ Both use "Design" — NOT allowed.

✅ VERB DIVERSITY (GOOD):
PSO 1: "Design seismic-resistant structural systems..."
PSO 2: "Evaluate flood-risk mitigation strategies..."
PSO 3: "Analyze soil-structure interaction behavior..."
PSO 4: "Develop BIM-integrated lifecycle cost models..."
PSO 5: "Optimize traffic demand models for sustainable mobility..."
→ Each PSO uses a DIFFERENT verb — REQUIRED.
`.trim();

// ─────────────────────────────────────────────
// CONSTANTS — SUB-DOMAIN ISOLATION EXAMPLES
// ─────────────────────────────────────────────

const SUBDOMAIN_ISOLATION_EXAMPLES = `
❌ MULTI-TOPIC PSO (BAD):
"Develop water resource management solutions addressing urban drainage, 
flood control, and water quality challenges with consideration for environmental sustainability."
→ 3 sub-topics crammed into 1 PSO. NEVER do this.

✅ SINGLE SUB-DOMAIN PSO (GOOD):
"Evaluate flood-risk mitigation strategies for urban watersheds using 
hydrological modeling and stormwater management frameworks."
→ ONE clear domain focus — REQUIRED.
`.trim();

// ─────────────────────────────────────────────
// CONSTANTS — BLOOM LEVEL GUARD EXAMPLES
// ─────────────────────────────────────────────

const BLOOM_LEVEL_EXAMPLES = `
❌ BLOOM LEVEL 3 — TOO LOW (BAD):
"Implement Building Information Modeling (BIM) techniques for construction processes."
→ "Implement" = Apply = Bloom Level 3. NOT acceptable.

✅ BLOOM LEVEL 5 — CORRECT (GOOD):
"Optimize construction project workflows using BIM-integrated lifecycle cost 
models for resource and schedule management."
→ "Optimize" = Evaluate = Bloom Level 5. REQUIRED minimum.
`.trim();

// ─────────────────────────────────────────────
// HELPER — Domain Phrase Lookup
// ─────────────────────────────────────────────

function getBenchmarkPhrases(programName: string): string[] {
  const name = programName.toLowerCase();

  // Broader fuzzy matching — handles "B.Tech ECE", "M.E. Civil" etc.
  for (const [domain, phrases] of Object.entries(PSO_PHRASE_BANK)) {
    const domainWords = domain.toLowerCase().split(/\s+/);
    const matched = domainWords.some(word => word.length > 3 && name.includes(word));
    if (matched) return phrases;
  }

  // Secondary pass — check if any domain keyword appears in programName
  const domainKeywordMap: Record<string, string> = {
    "civil":       "Civil Engineering",
    "mech":        "Mechanical Engineering",
    "elec":        "Electrical Engineering",
    "ece":         "Electronics Engineering",
    "cse":         "Computer Science",
    "comp":        "Computer Science",
    "it":          "Information Technology",
    "chem":        "Chemical Engineering",
    "bio":         "Biomedical Engineering",
    "aero":        "Aerospace Engineering",
  };

  for (const [keyword, domainKey] of Object.entries(domainKeywordMap)) {
    if (name.includes(keyword) && PSO_PHRASE_BANK[domainKey]) {
      return PSO_PHRASE_BANK[domainKey];
    }
  }

  return PSO_PHRASE_BANK["General Engineering"] || [];
}

// ─────────────────────────────────────────────
// STAGE 1 PROMPT — Raw PSO Generation (Lightweight)
// PURPOSE: Generate raw candidate PSOs without heavy rules.
// Rules are enforced in Stage 2 (buildPSOEnforcementPrompt).
// ─────────────────────────────────────────────

export function buildPSOGenerationPrompt(params: PSOPromptBuilderParams): string {
  const {
    programName,
    count,
    programCriteria,
    selectedSocieties,
    focusAreas = [],
    mode = "standard",
  } = params;

  const benchmarkPhrases = getBenchmarkPhrasesV2(programName);
  const domainContext = getDomainContextString(programName);
  const domainInfo = inferDomains(programName);

  const criteriaText = programCriteria
    ? `Program Statement: ${programCriteria.statement}\nCore Curriculum: ${programCriteria.curriculum.join(", ")}`
    : "Not provided — use ABET General Student Outcomes SO1–SO7.";

  const benchmarksText = benchmarkPhrases.map(p => `- ${p}`).join("\n");

  const modeDirectives: Record<PSOGenerationMode, string> = {
    standard: "Balance technical depth with broad domain coverage.",
    strict:   "Maximum ABET/NBA alignment. Every PSO must reflect safety, standards, or ethics constraints in domain-specific context.",
    industry: "Industry-readiness focus. Reference modern industrial workflows, deployment-ready systems, and professional-grade tools.",
    research: "Research & Innovation focus. Emphasize mathematical modeling, system simulation, and optimization of theoretical frameworks.",
  };

  const verbList = ALL_STRONG_VERBS.join(", ");

  return `
You are an expert in Outcome-Based Education (OBE), NBA accreditation (India), Washington Accord, and ABET EAC frameworks.

TASK: Generate ${count} high-quality Program Specific Outcomes (PSOs) for the program: "${programName}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INPUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Program: ${programName}
Criteria: ${criteriaText}
Lead Societies: ${selectedSocieties?.lead?.join(", ") || "None specified"}
Focus Areas: ${focusAreas.length > 0 ? focusAreas.join(", ") : "General program competencies"}
Mode: ${mode.toUpperCase()} — ${modeDirectives[mode]}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERATION RULES (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. START: Every PSO must begin with "Graduates will be able to"
2. VERB: Use ONLY one verb per PSO from this approved list: ${verbList}
3. VERB DIVERSITY: Each of the ${count} PSOs must use a COMPLETELY DIFFERENT verb — no repetition
4. BLOOM LEVEL: Use only Bloom's Taxonomy Level 4 (Analyze), 5 (Evaluate), or 6 (Create/Design)
5. SUB-DOMAIN: Each PSO must target EXACTLY ONE specific sub-domain (not multiple topics)
6. LENGTH: 20–30 words per PSO (one sentence only)
7. DISTINCT: Each PSO must represent a completely different technical competency

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE BENCHMARKS (Match this depth and tone)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${benchmarksText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON — NO PREAMBLE, NO MARKDOWN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "raw_psos": [
    {
      "statement": "Graduates will be able to [Verb] [Specific Sub-domain] [Real-world constraint or application]...",
      "abet_mappings": ["SO1", "SO2"]
    }
  ]
}
START WITH '{'. END WITH '}'. VALID JSON ONLY.
`.trim();
}

// ─────────────────────────────────────────────
// STAGE 2 PROMPT — Rule Enforcement & Cleaning
// PURPOSE: Takes raw PSOs and enforces ALL quality rules.
// Separated from generation to reduce model confusion.
// ─────────────────────────────────────────────

export function buildPSOEnforcementPrompt(params: {
  programName: string;
  rawPSOs: string[];
  mode?: PSOGenerationMode;
  selectedSocieties?: SelectedSocietiesInput;
}): string {
  const { programName, rawPSOs, mode = "standard" } = params;

  const fillerList = FILLER_BLACKLIST_PHRASES.map(f => `"${f}"`).join(", ");
  const weakVerbList = WEAK_VERBS.join(", ");
  const strongVerbList = ALL_STRONG_VERBS.join(", ");

  const failingExamplesText = PSO_FAILING_EXAMPLES
    .map(ex => `❌ BAD: "${ex.text}"\n   WHY: ${ex.reason}`)
    .join("\n\n");

  return `
You are an expert PSO Auditor for NBA (India) and ABET EAC accreditation.

TASK: AUDIT and FIX the following raw PSOs for "${programName}".
Apply ALL 9 rules below. Return only the corrected, accreditation-ready PSOs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RAW PSOs TO FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${rawPSOs.map((p, i) => `${i + 1}. ${p}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9 ENFORCEMENT RULES (ALL MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RULE 1 — VERB DIVERSITY (CRITICAL)
No two PSOs may use the same primary verb. Track all verbs used.
${VERB_DIVERSITY_EXAMPLES}

RULE 2 — SINGLE SUB-DOMAIN ONLY (CRITICAL)
Each PSO must cover exactly ONE specific sub-domain. Never pack multiple topics.
${SUBDOMAIN_ISOLATION_EXAMPLES}

RULE 3 — BLOOM LEVEL 4–6 ONLY (CRITICAL)
Banned weak verbs: ${weakVerbList}
Replace with strong verbs: ${strongVerbList}
${BLOOM_LEVEL_EXAMPLES}

RULE 4 — FILLER PHRASE REMOVAL
Remove ALL of these phrases: ${fillerList}
Replace with precise technical language.

RULE 5 — SINGLE ACTION VERB
Each PSO must contain EXACTLY ONE primary action verb.
Hidden multi-actions to detect and remove: "by applying", "and ensuring", "to improve", "while adhering to".

RULE 6 — DOMAIN SPECIFICITY
Replace generic terms with domain-specific ones:
❌ "engineering systems" → ✅ "power distribution systems" / "embedded control systems" etc.
❌ "modern tools" → ✅ name the specific class of tool (e.g. "geospatial analysis tools")

RULE 7 — REDUNDANCY REMOVAL
If two PSOs overlap conceptually (even with different verbs), differentiate them clearly.
Use semantic sub-domain differentiation, not just verb swapping.

RULE 8 — WASHINGTON ACCORD ALIGNMENT
Each PSO must align with at least one WK (Working Knowledge) attribute:
WK1: Mathematics | WK2: Natural Science | WK3: Engineering Fundamentals
WK4: Engineering Design | WK5: Engineering Practice | WK6: Societal Impact
Map each PSO mentally to a WK attribute while writing it.

RULE 9 — NO PO OVERLAP
PSOs must NOT repeat general Program Outcomes (POs) like ethics, teamwork, communication.
PSOs are PROGRAM-SPECIFIC — they must reflect unique technical depth of "${programName}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWN BAD PATTERNS (DO NOT REPEAT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${failingExamplesText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON — NO PREAMBLE, NO MARKDOWN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "final_psos": [
    {
      "statement": "Graduates will be able to [Strong Verb] [Specific Sub-domain] [Real-world constraint]...",
      "abet_mappings": ["SO1", "SO2"]
    }
  ],
  "fix_summary": {
    "issues_detected": ["Exact issue found per rule number"],
    "changes_made": ["What was changed for each PSO and why"],
    "verb_map": {"PSO_1": "verb used", "PSO_2": "verb used"},
    "wk_map": {"PSO_1": "WK4", "PSO_2": "WK1"},
    "final_quality": "Accreditation Ready"
  }
}
START WITH '{'. END WITH '}'. VALID JSON ONLY.
`.trim();
}

// ─────────────────────────────────────────────
// RETRY PROMPT — Structured Feedback-Aware Retry
// UPGRADE: Passes structured JSON feedback instead of flat text
// ─────────────────────────────────────────────

export function buildRetryPrompt(
  basePrompt: string,
  feedback: PSOValidationResult,
  previousResults: any[] = []
): string {

  // Group issues by type for structured feedback
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
    global_score: feedback?.score || 0, // Using .score instead of .overallScore to match existing validation types
    total_psos: feedback?.psoAnalyses?.length || 0,
    critical_rules_violated: globalIssues,
    weak_psos: weakPSOs,
  };

  const prevText = previousResults.length > 0
    ? `\nPREVIOUS FAILED PSOs:\n${JSON.stringify(previousResults, null, 2)}`
    : "";

  return `
${basePrompt}

${prevText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ RETRY — PREVIOUS ATTEMPT FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURED FAILURE REPORT:
${JSON.stringify(structuredFeedback, null, 2)}

RETRY INSTRUCTIONS:
1. Fix EVERY issue listed in "critical_rules_violated" above.
2. Rewrite ALL PSOs listed in "weak_psos" (score < 75) completely.
3. DO NOT reuse any verb or sub-domain pattern from the failed attempt.
4. Each PSO must now explicitly reflect a DIFFERENT WK attribute.
5. Re-verify: no two PSOs share a verb, sub-domain, or WK mapping.
6. Output ONLY valid corrected JSON. NO PREAMBLE. NO MARKDOWN.
`.trim();
}

// ─────────────────────────────────────────────
// EVALUATOR / REFINEMENT PROMPT v3
// UPGRADE: Preserves strong PSOs, targets only weak ones,
// adds verb map tracking, WK alignment, filler blacklist
// ─────────────────────────────────────────────

export function buildPSOEvaluatorPrompt(params: {
  programName: string;
  existingPSOs: any[];
  feedback: PSOValidationResult;
}): string {
  const { programName, feedback } = params;

  const analyses = (feedback?.psoAnalyses || []).map(pa => ({
    id: (pa?.index || 0) + 1,
    statement: pa?.statement || "",
    score: pa?.score || 0,
    issues: pa?.issues || [],
    needs_fix: (pa?.score || 0) < 85,
  }));

  const strongPSOs = analyses.filter(a => !a.needs_fix);
  const weakPSOs   = analyses.filter(a => a.needs_fix);

  const fillerList  = FILLER_BLACKLIST_PHRASES.map(f => `"${f}"`).join(", ");
  const weakVerbs   = WEAK_VERBS.join(", ");
  const strongVerbs = ALL_STRONG_VERBS.join(", ");

  return `
You are an Expert Accreditation Auditor for NBA (India), Washington Accord, and ABET EAC standards.

TASK: REFINE the PSO set for "${programName}".
Apply all 9 rules. Preserve strong PSOs. Fix only weak ones.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NON-DESTRUCTIVE PRESERVATION RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO NOT modify PSOs with Score ≥ 85 unless a rule violation is found.
Strong PSOs (keep as-is unless violation detected):
${strongPSOs.length > 0
  ? strongPSOs.map(p => `✅ PSO ${p.id} (Score: ${p.score}): "${p.statement}"`).join("\n")
  : "None — all PSOs need refinement."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEAK PSOs — MUST FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${weakPSOs.length > 0
  ? weakPSOs.map(p => `❌ PSO ${p.id} (Score: ${p.score}):\n   Statement: "${p.statement}"\n   Issues: ${p.issues.join(" | ")}`).join("\n\n")
  : "None — all PSOs are strong."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MASTER EVALUATOR FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(feedback?.detailedDrawbacks || []).map(d => `❌ ${d}`).join("\n") || "No global issues detected."}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9 REFINEMENT RULES (ALL MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RULE 1 — VERB DIVERSITY
No two PSOs may share the same primary verb across the entire set.
${VERB_DIVERSITY_EXAMPLES}

RULE 2 — SINGLE SUB-DOMAIN
Each PSO covers exactly ONE specific technical sub-domain.
${SUBDOMAIN_ISOLATION_EXAMPLES}

RULE 3 — BLOOM LEVEL 4–6
Banned verbs: ${weakVerbs}
Required strong verbs: ${strongVerbs}
${BLOOM_LEVEL_EXAMPLES}

RULE 4 — FILLER REMOVAL
Remove all filler phrases: ${fillerList}

RULE 5 — ONE ACTION VERB PER PSO
Remove hidden compound actions: "by applying", "and ensuring", "to improve", "while adhering to"

RULE 6 — DOMAIN SPECIFICITY
Use discipline-specific sub-domain keywords, not generic "engineering systems"

RULE 7 — REDUNDANCY CHECK
Ensure no two PSOs are conceptually similar, even if worded differently

RULE 8 — WASHINGTON ACCORD WK ALIGNMENT
Align each PSO to one of: WK1 (Math), WK2 (Science), WK3 (Eng. Fundamentals),
WK4 (Eng. Design), WK5 (Eng. Practice), WK6 (Societal Impact)

RULE 9 — NO PO OVERLAP
PSOs must not duplicate generic Program Outcomes (ethics, teamwork, communication).
PSOs must reflect the UNIQUE technical identity of "${programName}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALL PSOs (for full context)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(analyses, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON — NO PREAMBLE, NO MARKDOWN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "final_psos": [
    {
      "statement": "Refined or preserved PSO 1...",
      "abet_mappings": ["SO1", "SO2"]
    },
    {
      "statement": "Refined or preserved PSO 2...",
      "abet_mappings": ["SO1"]
    }
  ],
  "fix_summary": {
    "issues_detected": ["Rule number + exact issue found"],
    "changes_made": ["PSO N: what changed and why"],
    "preserved_psos": ["PSO N: kept unchanged — score >= 85"],
    "verb_map": {"PSO_1": "verb", "PSO_2": "verb"},
    "wk_map": {"PSO_1": "WK4", "PSO_2": "WK1"},
    "final_quality": "Accreditation Ready"
  }
}
START WITH '{'. END WITH '}'. VALID JSON ONLY.
`.trim();
}

// ─────────────────────────────────────────────
// HELPER EXPORTS — For backend verb/filler validation
// Use these in your Zod schema or backend scoring layer
// ─────────────────────────────────────────────

export const FILLER_BLACKLIST_PHRASES = FILLER_PHRASE_BLACKLIST;
export const APPROVED_STRONG_VERBS    = ALL_STRONG_VERBS;
export const BANNED_WEAK_VERBS        = WEAK_VERBS;

/**
 * Backend helper: count strong verbs in a PSO statement
 * Use this to enforce single-verb rule in your scoring layer
 */
export function countStrongVerbs(statement: string): number {
  const lower = statement.toLowerCase();
  return ALL_STRONG_VERBS.filter(v => {
    const regex = new RegExp(`\\b${v}\\b`);
    return regex.test(lower);
  }).length;
}

/**
 * Backend helper: detect filler phrases in a PSO
 * Returns list of found fillers
 */
export function detectFillerPhrases(statement: string): string[] {
  const lower = statement.toLowerCase();
  return FILLER_PHRASE_BLACKLIST.filter(f => lower.includes(f.toLowerCase()));
}

/**
 * Backend helper: detect weak verbs in a PSO
 * Returns list of found weak verbs
 */
export function detectWeakVerbs(statement: string): string[] {
  const lower = statement.toLowerCase();
  return WEAK_VERBS.filter(v => {
    const regex = new RegExp(`\\b${v}\\b`);
    return regex.test(lower);
  });
}

/**
 * Backend helper: check verb diversity across a PSO set
 * Returns list of duplicate verbs found
 */
export function checkVerbDiversity(psos: string[]): string[] {
  const usedVerbs: string[] = [];
  const duplicates: string[] = [];

  for (const pso of psos) {
    const lower = pso.toLowerCase();
    for (const verb of ALL_STRONG_VERBS) {
      const regex = new RegExp(`\\b${verb}\\b`);
      if (regex.test(lower)) {
        if (usedVerbs.includes(verb)) {
          duplicates.push(verb);
        } else {
          usedVerbs.push(verb);
        }
        break; // Only count first strong verb per PSO
      }
    }
  }

  return duplicates;
}
