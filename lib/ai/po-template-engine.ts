/**
 * lib/ai/po-template-engine.ts
 * Program Outcomes Template Model — 12 standard NBA/ABET outcomes + custom variants.
 *
 * All standard outcomes score 100/100 on scorePO():
 *   • Start with "Ability to"
 *   • ≤25 words
 *   • Contain action verb
 *   • No first-person pronouns
 *   • No vague words
 */

// ── 12 Standard NBA/ABET Program Outcomes ────────────────────────────────────

export const STANDARD_PO_STATEMENTS: string[] = [
  "Ability to apply knowledge of mathematics, science, and engineering.",
  "Ability to design and conduct experiments, as well as to analyze and interpret data.",
  "Ability to design a system, component, or process to meet desired needs within realistic constraints.",
  "Ability to function on multidisciplinary teams.",
  "Ability to identify, formulate, and solve engineering problems.",
  "Ability to understand professional and ethical responsibility.",
  "Ability to communicate effectively.",
  "Ability to understand the impact of engineering solutions in a global and societal context.",
  "Ability to recognize the need for and engage in lifelong learning.",
  "Ability to use techniques, skills, and modern engineering tools necessary for engineering practice.",
  "Ability to design systems that meet specified needs with appropriate consideration for public health and safety.",
  "Ability to conduct research and contribute to engineering knowledge and practice.",
];

// ── Custom domain-specific variants ──────────────────────────────────────────
// For program-specific PO generation when standard ones are insufficient.

export const CUSTOM_PO_TEMPLATES: Record<string, string[]> = {
  innovation: [
    "Ability to apply innovative thinking and creative problem-solving to engineering challenges.",
    "Ability to identify and develop novel engineering solutions through systematic innovation.",
  ],
  ethics: [
    "Ability to analyze ethical implications of engineering decisions and apply professional standards.",
    "Ability to demonstrate ethical judgment and social responsibility in engineering practice.",
  ],
  leadership: [
    "Ability to lead engineering projects and collaborate effectively in diverse professional teams.",
    "Ability to manage technical projects, coordinate team efforts, and deliver engineering outcomes.",
  ],
  sustainability: [
    "Ability to design and evaluate engineering solutions with consideration for environmental sustainability.",
    "Ability to apply sustainable development principles in engineering design and practice.",
  ],
  communication: [
    "Ability to communicate engineering concepts effectively through written, oral, and visual means.",
    "Ability to present technical information clearly to diverse professional and public audiences.",
  ],
  global: [
    "Ability to understand engineering practice in a global, multicultural, and societal context.",
    "Ability to apply engineering knowledge in international and cross-cultural professional environments.",
  ],
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the standard PO statement at the given index (0–11, wraps around).
 */
export function buildStandardPO(index: number): string {
  const idx = ((index % STANDARD_PO_STATEMENTS.length) + STANDARD_PO_STATEMENTS.length) % STANDARD_PO_STATEMENTS.length;
  return STANDARD_PO_STATEMENTS[idx];
}

/**
 * Build a custom PO for a specific theme and variant.
 * Falls back to standard POs if theme not found.
 */
export function buildCustomPO(theme: string, variant = 0): string {
  const templates = CUSTOM_PO_TEMPLATES[theme.toLowerCase()];
  if (!templates) return buildStandardPO(variant);
  return templates[variant % templates.length];
}

/**
 * Return `count` standard POs starting from `startIndex`.
 */
export function getStandardPOs(count: number, startIndex = 0): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(buildStandardPO(startIndex + i));
  }
  return result;
}

/**
 * Return all custom POs for a list of themes.
 */
export function getCustomPOs(themes: string[]): string[] {
  const result: string[] = [];
  for (const theme of themes) {
    const templates = CUSTOM_PO_TEMPLATES[theme.toLowerCase()];
    if (templates) result.push(...templates);
  }
  return result;
}
