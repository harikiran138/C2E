export async function computeSemanticSimilarity(textA: string, textB: string): Promise<number> {
    return fallbackStringSimilarity(textA, textB);
}

/**
 * Calculates how structurally complex or deep a sentence is.
 * Rewarding subordinate clauses and substantial vocabulary structure.
 */
export function calculateLexicalRichness(text: string): number {
    const words = text.split(/\s+/).filter(Boolean);
    const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, ''))).size;

    // Punctuation often suggests multi-clause complexity (e.g. "To do X, we will Y, ensuring Z.")
    const punctuationMarks = (text.match(/[,;:]/g) || []).length;

    // Very naive but effective academic heuristic
    const clauseScore = Math.min(30, punctuationMarks * 10);
    const lexicalRatio = words.length > 0 ? (uniqueWords / words.length) * 100 : 0;

    // If a statement is just repeating the same 15 words "engineer engineering engineered", uniqueWords is low.
    const richness = Math.round(clauseScore + (lexicalRatio * 0.7));

    return Math.min(100, Math.max(0, richness));
}

/**
 * Simple token intersection formula if Embeddings API is utterly unreachable 
 * or the input vectors are zero-arrays.
 */
function fallbackStringSimilarity(a: string, b: string): number {
    const extractTokens = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length >= 4);
    const tokensA = new Set(extractTokens(a));
    const tokensB = new Set(extractTokens(b));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;
    const intersection = [...tokensA].filter((word) => tokensB.has(word)).length;
    const union = new Set([...tokensA, ...tokensB]).size;
    return union === 0 ? 0 : intersection / union;
}
