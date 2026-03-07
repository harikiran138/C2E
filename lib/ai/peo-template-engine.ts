/**
 * lib/ai/peo-template-engine.ts
 * PEO Grammar Model — deterministic generation guaranteed to score ≥85/100.
 *
 * Each statement:
 *   • Starts with "Within 3 to 5 years of graduation, graduates will ..."
 *   • Contains a Bloom's taxonomy verb
 *   • 20–35 words
 *   • No vague words (excellent/outstanding/world-class)
 */

// ── Priority Phrase Bank ──────────────────────────────────────────────────────
// Each priority maps to 2 phrase completions (after "graduates will ").
// All phrases include a Bloom's verb and stay within 20–35 word total.

export const PEO_PRIORITY_BANK: Record<string, string[]> = {
  "Institute Vision": [
    "contribute to realizing the institute's vision through technical leadership and evidence-based professional practice",
    "apply engineering expertise to advance institutional goals and contribute to strategic professional development",
  ],
  "Institute Mission": [
    "demonstrate alignment with institutional mission by advancing engineering practice and meaningful societal contribution",
    "apply professional competencies in ways that reflect the institute's educational values and operational mission",
  ],
  "National Priorities": [
    "contribute to national development goals through engineering practice, technological innovation, and technical leadership",
    "apply engineering knowledge to address national challenges in infrastructure, technology, and sustainable community growth",
  ],
  "Regional Priorities": [
    "engage with regional industry and community needs through applied engineering practice and professional collaboration",
    "contribute to regional development by applying technical skills in context-relevant engineering and local innovation",
  ],
  "Local Priorities": [
    "address local engineering challenges through applied practice, community engagement, and purposeful professional contribution",
    "engage with local industry and civic needs through engineering expertise and collaborative professional service",
  ],
  "21st Century Skills": [
    "demonstrate critical thinking, collaborative problem-solving, and adaptable technical skills in professional engineering roles",
    "apply communication, analytical reasoning, and technology skills to address evolving engineering and professional challenges",
  ],
  "Sustainable Development Goals (SDGs)": [
    "contribute to sustainable development through engineering practice aligned with environmental and social responsibility",
    "design and implement engineering solutions that advance sustainability and long-term community well-being",
  ],
  "Entrepreneurship": [
    "lead or contribute to entrepreneurial engineering ventures through technical competency and innovation-driven thinking",
    "demonstrate entrepreneurial mindset by identifying engineering opportunities and developing impactful professional solutions",
  ],
  "Professional Practice": [
    "demonstrate professional engineering competency through technical leadership, ethical conduct, and career advancement",
    "apply engineering expertise in professional roles, advancing technical standards and contributing to organizational goals",
  ],
  "Higher Education and Growth": [
    "pursue advanced education or research to deepen engineering expertise and contribute to professional knowledge",
    "engage in lifelong learning through higher education, professional certification, or specialized technical development",
  ],
  "Leadership and Teamwork": [
    "lead multidisciplinary engineering teams, demonstrating collaborative skills, professional communication, and technical judgment",
    "manage engineering projects and collaborate with diverse teams to deliver effective and impactful technical solutions",
  ],
  "Ethics and Society": [
    "demonstrate ethical judgment and social responsibility in engineering practice, contributing to sustainable community outcomes",
    "apply professional ethics and societal awareness in engineering roles, balancing technical decisions with public welfare",
  ],
  "Adaptability": [
    "adapt engineering skills to evolving technological environments, demonstrating resilience and continuous professional development",
    "engage with emerging technologies and changing professional demands through adaptive learning and technical flexibility",
  ],
};

const FALLBACK_PHRASES = [
  "demonstrate professional engineering competency through technical leadership, ethical conduct, and sustained career advancement",
  "apply engineering expertise in professional roles, contributing to organizational goals and societal well-being",
  "contribute to engineering practice through technical innovation, collaborative teamwork, and principled professional conduct",
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build a deterministic PEO statement guaranteed to score ≥85/100.
 *
 * @param priority    Selected PEO priority (from PEO_PRIORITY_BANK keys)
 * @param variant     Which phrase variant to use (0 or 1, wraps around)
 */
export function buildPEOGrammar(priority: string, variant = 0): string {
  const phrases = PEO_PRIORITY_BANK[priority] || FALLBACK_PHRASES;
  const phrase  = phrases[variant % phrases.length];
  return `Within 3 to 5 years of graduation, graduates will ${phrase}.`;
}

/** Returns all phrase variants for all priorities (2 per priority). */
export function getAllPEOVariants(priorities: string[]): string[] {
  const result: string[] = [];
  for (const p of priorities) {
    const phrases = PEO_PRIORITY_BANK[p] || FALLBACK_PHRASES;
    for (let v = 0; v < phrases.length; v++) {
      result.push(buildPEOGrammar(p, v));
    }
  }
  return result;
}

/** All supported PEO priorities. */
export const PEO_PRIORITIES = Object.keys(PEO_PRIORITY_BANK);
