/**
 * lib/ai/mutation-engine.ts
 * Starter variation bank — surfaces diversity without touching the quality guarantees.
 * All starters are pre-approved safe openers (they match STARTERS in scoring.ts).
 */

// All alternates must match STARTERS in scoring.ts exactly (or be identical).
// Only "recognized" ↔ "respected" swap is safe because both match GLOBAL_PATTERNS
// and produce identical word counts. Other starters return themselves unchanged.
const STARTER_VARIANTS: Record<string, string[]> = {
  "To be globally recognized for": [
    "To be globally recognized for",
    "To be globally respected for",   // safe swap: both match GLOBAL_PATTERNS
  ],
  "To emerge as": [
    "To emerge as",
    "To emerge as",                    // no safe alternate — keep original
  ],
  "To achieve distinction in": [
    "To achieve distinction in",
    "To achieve distinction in",       // no safe alternate — keep original
  ],
  "To advance as a leading": [
    "To advance as a leading",
    "To advance as a leading",         // no safe alternate — keep original
  ],
  "To be globally respected for": [
    "To be globally respected for",
    "To be globally recognized for",   // symmetric swap
  ],
};

/** Approved starters in scoring order (must match STARTERS in scoring.ts). */
const APPROVED_STARTERS = Object.keys(STARTER_VARIANTS);

/**
 * Replace the opening starter in a vision statement with an alternate variant.
 * If no recognized starter is found the original is returned unchanged.
 *
 * @param statement  A grammar-engine vision statement
 * @param seed       Determines which variant to pick (0 → original, 1 → alt)
 */
export function mutateVisionStarter(statement: string, seed: number): string {
  for (const starter of APPROVED_STARTERS) {
    if (statement.toLowerCase().startsWith(starter.toLowerCase())) {
      const variants = STARTER_VARIANTS[starter];
      const chosen   = variants[seed % variants.length];
      // Replace the matched prefix preserving case of the rest
      return chosen + statement.slice(starter.length);
    }
  }
  return statement;
}

/** Number of distinct starter variants across all starters. */
export function getVariantCount(): number {
  return Object.values(STARTER_VARIANTS).reduce((sum, v) => sum + v.length, 0);
}
