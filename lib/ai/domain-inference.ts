// ============================================================
// Domain Inference Engine v2.0
// Upgrades: Multi-domain detection, phrase bank merging,
// ABET mapping, hybrid program support, LLM fallback
// ============================================================

import { PSO_PHRASE_BANK } from "./constants";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface DomainInferenceResult {
  domains: string[];                    // All matched domains
  phrases: string[];                    // Merged de-duplicated phrase bank
  abetMapping: ABETMapping[];           // ABET SO mappings per domain
  wkMapping: WKAttribute[];             // Washington Accord WK attributes
  confidence: "high" | "medium" | "low" | "fallback";
  strategy: "exact" | "fuzzy" | "keyword" | "multi" | "llm_fallback" | "general";
  hybridDomains?: string[];             // For hybrid programs
}

export interface ABETMapping {
  domain: string;
  outcomes: string[];   // e.g. ["SO1", "SO2", "SO4"]
}

export interface WKAttribute {
  code: string;         // WK1–WK6
  label: string;
  relevantDomains: string[];
}

// ─────────────────────────────────────────────
// MASTER DOMAIN KEYWORD MAP (Expanded v2)
// Covers abbreviations, full names, regional variants
// ─────────────────────────────────────────────

export const DOMAIN_KEYWORD_MAP: Record<string, string> = {
  // Civil & Infrastructure
  "civil":            "Civil Engineering",
  "structural":       "Civil Engineering",
  "geotechnical":     "Civil Engineering",
  "construction":     "Civil Engineering",
  "transportation":   "Civil Engineering",
  "infrastructure":   "Civil Engineering",
  "environmental":    "Civil Engineering",

  // Mechanical
  "mechanical":       "Mechanical Engineering",
  "mech":             "Mechanical Engineering",
  "thermal":          "Mechanical Engineering",
  "manufacturing":    "Mechanical Engineering",
  "production":       "Mechanical Engineering",
  "automobile":       "Mechanical Engineering",
  "automotive":       "Mechanical Engineering",
  "aerospace":        "Aerospace Engineering",
  "aeronautical":     "Aerospace Engineering",
  "aero":             "Aerospace Engineering",
  "aviation":         "Aerospace Engineering",

  // Electrical
  "electrical":       "Electrical Engineering",
  "elec":             "Electrical Engineering",
  "power":            "Electrical Engineering",
  "energy":           "Electrical Engineering",

  // Electronics & Communication
  "electronics":      "Electronics & Communication",
  "electronic":       "Electronics & Communication",
  "ece":              "Electronics & Communication",
  "communication":    "Electronics & Communication",
  "vlsi":             "Electronics & Communication",
  "embedded":         "Electronics & Communication",
  "signal":           "Electronics & Communication",
  "wireless":         "Electronics & Communication",
  "telecommunications": "Electronics & Communication",
  "telecom":          "Electronics & Communication",

  // Computer Science & IT
  "computer":         "Computer Science & Engineering",
  "cse":              "Computer Science & Engineering",
  "software":         "Computer Science & Engineering",
  "computing":        "Computer Science & Engineering",
  "information technology": "Information Technology",
  "information science": "Information Technology",
  " it ":             "Information Technology",
  "cyber":            "Information Technology",
  "network":          "Information Technology",
  "data science":     "Data Science",
  "data engineering": "Data Science",
  "artificial intelligence": "AI & Machine Learning",
  "machine learning": "AI & Machine Learning",
  " ai ":             "AI & Machine Learning",
  "deep learning":    "AI & Machine Learning",

  // Chemical & Materials
  "chemical":         "Chemical Engineering",
  "chem":             "Chemical Engineering",
  "process":          "Chemical Engineering",
  "petroleum":        "Chemical Engineering",
  "polymer":          "Chemical Engineering",
  "materials":        "Materials Engineering",
  "metallurgy":       "Materials Engineering",
  "textile":          "Textile Engineering",
  "fiber":            "Textile Engineering",

  // Biomedical & Life Sciences
  "biomedical":       "Biomedical Engineering",
  "biomed":           "Biomedical Engineering",
  "biotechnology":    "Biomedical Engineering",
  "biotech":          "Biomedical Engineering",
  "pharmaceutical":   "Biomedical Engineering",
  "clinical":         "Biomedical Engineering",

  // Emerging / Hybrid Domains
  "mechatronics":     "Mechatronics",
  "robotics":         "Robotics & Automation",
  "automation":       "Robotics & Automation",
  "control":          "Robotics & Automation",
  "instrumentation":  "Robotics & Automation",
  "smart":            "Smart Systems",
  "iot":              "Smart Systems",
  "internet of things": "Smart Systems",
  "quantum":          "Quantum Engineering",
  "nanotechnology":   "Nanotechnology",
  "nano":             "Nanotechnology",
  "renewable":        "Sustainable Energy",
  "sustainable":      "Sustainable Energy",
  "solar":            "Sustainable Energy",
  "environmental engineering": "Environmental Engineering",
  "ocean":            "Ocean Engineering",
  "marine":           "Ocean Engineering",
  "mining":           "Mining Engineering",
  "industrial":       "Industrial Engineering",
  "systems engineering": "Industrial Engineering",
  "agricultural":     "Agricultural Engineering",
  "food":             "Agricultural Engineering",
};

// ─────────────────────────────────────────────
// ABET STUDENT OUTCOME MAPPINGS PER DOMAIN
// SO1–SO7 (2019 EAC Criteria)
// ─────────────────────────────────────────────

const ABET_DOMAIN_MAPPING: Record<string, string[]> = {
  "Civil Engineering":               ["SO1", "SO2", "SO3", "SO5"],
  "Mechanical Engineering":          ["SO1", "SO2", "SO3", "SO6"],
  "Electrical Engineering":          ["SO1", "SO2", "SO3", "SO6"],
  "Electronics & Communication":     ["SO1", "SO2", "SO3", "SO5"],
  "Computer Science & Engineering":  ["SO1", "SO2", "SO5", "SO6"],
  "Information Technology":          ["SO2", "SO5", "SO6", "SO7"],
  "Chemical Engineering":            ["SO1", "SO2", "SO3", "SO4"],
  "Biomedical Engineering":          ["SO1", "SO2", "SO3", "SO4"],
  "Mechatronics":                    ["SO1", "SO2", "SO3", "SO5", "SO6"],
  "Robotics & Automation":           ["SO1", "SO2", "SO3", "SO5"],
  "AI & Machine Learning":           ["SO1", "SO2", "SO5", "SO6"],
  "Data Science":                    ["SO1", "SO5", "SO6"],
  "Smart Systems":                   ["SO2", "SO3", "SO5", "SO6"],
  "Aerospace Engineering":           ["SO1", "SO2", "SO3", "SO6"],
  "Materials Engineering":           ["SO1", "SO2", "SO3"],
  "Sustainable Energy":              ["SO1", "SO2", "SO3", "SO7"],
  "Environmental Engineering":       ["SO1", "SO2", "SO4", "SO7"],
  "Industrial Engineering":          ["SO1", "SO2", "SO5", "SO6"],
  "General Engineering":             ["SO1", "SO2", "SO3"],
};

// ─────────────────────────────────────────────
// WASHINGTON ACCORD WK ATTRIBUTES
// ─────────────────────────────────────────────

const WK_ATTRIBUTES: WKAttribute[] = [
  {
    code: "WK1",
    label: "Mathematics",
    relevantDomains: ["Computer Science & Engineering", "Electrical Engineering", "AI & Machine Learning", "Data Science", "Quantum Engineering"],
  },
  {
    code: "WK2",
    label: "Natural Science",
    relevantDomains: ["Chemical Engineering", "Biomedical Engineering", "Materials Engineering", "Environmental Engineering"],
  },
  {
    code: "WK3",
    label: "Engineering Fundamentals",
    relevantDomains: ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Aerospace Engineering"],
  },
  {
    code: "WK4",
    label: "Engineering Design",
    relevantDomains: ["Civil Engineering", "Mechanical Engineering", "Mechatronics", "Robotics & Automation", "Industrial Engineering"],
  },
  {
    code: "WK5",
    label: "Engineering Practice",
    relevantDomains: ["Electronics & Communication", "Information Technology", "Smart Systems", "Robotics & Automation"],
  },
  {
    code: "WK6",
    label: "Societal & Environmental Impact",
    relevantDomains: ["Environmental Engineering", "Sustainable Energy", "Civil Engineering", "Biomedical Engineering"],
  },
];

// ─────────────────────────────────────────────
// HYBRID DOMAIN COMPOSITIONS
// Maps compound program names to their component domains
// ─────────────────────────────────────────────

const HYBRID_DOMAIN_MAP: Record<string, string[]> = {
  "Mechatronics":              ["Mechanical Engineering", "Electrical Engineering", "Robotics & Automation"],
  "Robotics and AI":           ["Robotics & Automation", "AI & Machine Learning", "Electronics & Communication"],
  "Smart Infrastructure":      ["Civil Engineering", "Smart Systems", "Information Technology"],
  "Data Science":              ["Computer Science & Engineering", "AI & Machine Learning"],
  "Quantum Engineering":       ["Electrical Engineering", "Computer Science & Engineering"],
  "Sustainable Energy":        ["Electrical Engineering", "Environmental Engineering"],
  "Biomedical Engineering":    ["Mechanical Engineering", "Electrical Engineering"],
  "Textile Engineering":       ["Chemical Engineering", "Materials Engineering"],
  "Agricultural Engineering":  ["Mechanical Engineering", "Chemical Engineering"],
  "Ocean Engineering":         ["Civil Engineering", "Mechanical Engineering"],
  "Nanotechnology":            ["Materials Engineering", "Chemical Engineering", "Biomedical Engineering"],
};

// ─────────────────────────────────────────────
// STAGE 1: EXACT MATCH
// ─────────────────────────────────────────────

function tryExactMatch(programName: string): string[] {
  const name = programName.toLowerCase().trim();

  // Check if programName exactly matches a PSO_PHRASE_BANK key
  for (const key of Object.keys(PSO_PHRASE_BANK)) {
    if (key.toLowerCase() === name) return [key];
  }

  return [];
}

// ─────────────────────────────────────────────
// STAGE 2: FUZZY DOMAIN WORD MATCH
// Splits each domain key into words and checks for presence
// ─────────────────────────────────────────────

function tryFuzzyMatch(programName: string): string[] {
  const name = programName.toLowerCase();
  const matched = new Set<string>();

  for (const key of Object.keys(PSO_PHRASE_BANK)) {
    const domainWords = key.toLowerCase().split(/\s+/);
    const hasMatch = domainWords.some(word => word.length > 3 && name.includes(word));
    if (hasMatch) matched.add(key);
  }

  return [...matched];
}

// ─────────────────────────────────────────────
// STAGE 3: KEYWORD MAP SCAN (Multi-match)
// Returns ALL matching domains — not just first
// ─────────────────────────────────────────────

function tryKeywordScan(programName: string): string[] {
  const name = ` ${programName.toLowerCase()} `; // pad for boundary matching
  const matched = new Set<string>();

  for (const [keyword, domain] of Object.entries(DOMAIN_KEYWORD_MAP)) {
    if (name.includes(keyword.toLowerCase())) {
      matched.add(domain);
    }
  }

  return [...matched];
}

// ─────────────────────────────────────────────
// STAGE 4: HYBRID COMPOSITION CHECK
// Expands known hybrid programs into component domains
// ─────────────────────────────────────────────

function expandHybridDomains(domains: string[]): string[] {
  const expanded = new Set<string>(domains);

  for (const domain of domains) {
    const subDomains = HYBRID_DOMAIN_MAP[domain];
    if (subDomains) {
      subDomains.forEach(d => expanded.add(d));
    }
  }

  return [...expanded];
}

// ─────────────────────────────────────────────
// PHRASE BANK MERGER
// Merges and de-duplicates phrases from multiple domains
// ─────────────────────────────────────────────

function mergePhrases(domains: string[]): string[] {
  const allPhrases = new Set<string>();

  for (const domain of domains) {
    const phrases = PSO_PHRASE_BANK[domain] || [];
    phrases.forEach(p => allPhrases.add(p));
  }

  return [...allPhrases];
}

// ─────────────────────────────────────────────
// WK ATTRIBUTE RESOLVER
// Returns relevant WK attributes for matched domains
// ─────────────────────────────────────────────

function resolveWKAttributes(domains: string[]): WKAttribute[] {
  return WK_ATTRIBUTES.filter(wk =>
    wk.relevantDomains.some(rd => domains.includes(rd))
  );
}

// ─────────────────────────────────────────────
// ABET MAPPING RESOLVER
// Returns ABET SO mappings for matched domains
// ─────────────────────────────────────────────

function resolveABETMappings(domains: string[]): ABETMapping[] {
  return domains.map(domain => ({
    domain,
    outcomes: ABET_DOMAIN_MAPPING[domain] || ABET_DOMAIN_MAPPING["General Engineering"],
  }));
}

// ─────────────────────────────────────────────
// LLM FALLBACK PROMPT BUILDER
// Called when no rules match — sends to AI for classification
// ─────────────────────────────────────────────

export function buildDomainClassificationPrompt(programName: string): string {
  const knownDomains = Object.values(DOMAIN_KEYWORD_MAP)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");

  return `
You are an expert in engineering education and accreditation frameworks.

TASK: Classify the following engineering program into one or more known engineering domains.

Program Name: "${programName}"

Known Domains: ${knownDomains}

RULES:
1. Return 1–3 most relevant domains from the known list only.
2. For hybrid programs, return multiple domains.
3. If the program is completely unknown, return "General Engineering".
4. DO NOT invent new domain names. Use ONLY domains from the known list.

OUTPUT FORMAT (STRICT JSON):
{
  "domains": ["Domain 1", "Domain 2"],
  "reasoning": "Brief explanation of why these domains were selected"
}
START WITH '{'. END WITH '}'. VALID JSON ONLY.
`.trim();
}

// ─────────────────────────────────────────────
// MAIN EXPORT — inferDomains()
// Full pipeline: Exact → Fuzzy → Keyword → Hybrid → Fallback
// ─────────────────────────────────────────────

export function inferDomains(programName: string): DomainInferenceResult {
  // ── Stage 1: Exact match
  let domains = tryExactMatch(programName);
  if (domains.length > 0) {
    const expanded = expandHybridDomains(domains);
    return buildResult(expanded, "exact", "high", programName);
  }

  // ── Stage 2: Fuzzy domain word match
  domains = tryFuzzyMatch(programName);
  if (domains.length > 0) {
    const expanded = expandHybridDomains(domains);
    return buildResult(expanded, "fuzzy", "high", programName);
  }

  // ── Stage 3: Multi-keyword scan (returns ALL matches)
  domains = tryKeywordScan(programName);
  if (domains.length > 1) {
    const expanded = expandHybridDomains(domains);
    return buildResult(expanded, "multi", "medium", programName);
  }
  if (domains.length === 1) {
    const expanded = expandHybridDomains(domains);
    return buildResult(expanded, "keyword", "high", programName);
  }

  // ── Stage 4: Fallback to General Engineering
  // Signal to caller that LLM classification is needed
  return {
    domains: ["General Engineering"],
    phrases: PSO_PHRASE_BANK["General Engineering"] || [],
    abetMapping: resolveABETMappings(["General Engineering"]),
    wkMapping: [],
    confidence: "fallback",
    strategy: "general",
    hybridDomains: [],
  };
}

// ─────────────────────────────────────────────
// RESULT BUILDER (internal helper)
// ─────────────────────────────────────────────

function buildResult(
  domains: string[],
  strategy: DomainInferenceResult["strategy"],
  confidence: DomainInferenceResult["confidence"],
  programName: string,
): DomainInferenceResult {

  const baseDomainsFromKeyword = tryKeywordScan(programName);
  const allDomains = [...new Set([...domains, ...baseDomainsFromKeyword])];

  const isHybrid = allDomains.length > 1;
  const knownHybridExpansions = allDomains.filter(d => HYBRID_DOMAIN_MAP[d]);

  return {
    domains: allDomains,
    phrases: mergePhrases(allDomains),
    abetMapping: resolveABETMappings(allDomains),
    wkMapping: resolveWKAttributes(allDomains),
    confidence,
    strategy: isHybrid ? "multi" : strategy,
    hybridDomains: knownHybridExpansions.length > 0 ? knownHybridExpansions : undefined,
  };
}

// ─────────────────────────────────────────────
// INTEGRATION HELPER — Drop-in replacement for
// getBenchmarkPhrases() in pso-prompt-builder.ts
// ─────────────────────────────────────────────

/**
 * Drop-in replacement for the old getBenchmarkPhrases().
 * Returns merged phrases from ALL inferred domains.
 */
export function getBenchmarkPhrasesV2(programName: string): string[] {
  const result = inferDomains(programName);
  // Cap at 8 phrases to avoid prompt bloat
  return result.phrases.slice(0, 8);
}

/**
 * Get domain context string for injection into prompts.
 * Describes ALL matched domains + ABET + WK mappings.
 */
export function getDomainContextString(programName: string): string {
  const result = inferDomains(programName);

  const domainList = result.domains.join(", ");
  const wkList = result.wkMapping.map(wk => `${wk.code} (${wk.label})`).join(", ");
  const abetList = result.abetMapping
    .map(m => `${m.domain}: ${m.outcomes.join(", ")}`)
    .join(" | ");

  const hybridNote = result.hybridDomains && result.hybridDomains.length > 0
    ? `\nHybrid Program Components: ${result.hybridDomains.join(", ")}`
    : "";

  return `
Inferred Domains: ${domainList}
Confidence: ${result.confidence} (Strategy: ${result.strategy})${hybridNote}
Washington Accord WK Attributes: ${wkList || "General Engineering Fundamentals"}
ABET SO Mappings: ${abetList}
  `.trim();
}

/**
 * Check if LLM fallback classification is needed.
 */
export function needsLLMClassification(programName: string): boolean {
  const result = inferDomains(programName);
  return result.confidence === "fallback";
}
