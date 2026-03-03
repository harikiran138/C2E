import { GoogleGenAI } from '@google/genai';
import { similarity } from 'ml-distance';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Cache embeddings so we don't spam the API for identical statements
const embeddingCache = new Map<string, number[]>();

export async function getEmbedding(text: string): Promise<number[]> {
    const normalized = text.trim().toLowerCase();

    if (embeddingCache.has(normalized)) {
        return embeddingCache.get(normalized)!;
    }

    // Fallback if no API key is present for embeddings
    if (!GEMINI_API_KEY) {
        console.warn("No GEMINI_API_KEY found. Proceeding with zero vector.");
        return Array(768).fill(0);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: normalized,
        });

        const vector = response.embeddings?.[0]?.values;
        if (!vector) {
            throw new Error("Invalid embedding response");
        }

        embeddingCache.set(normalized, vector);
        return vector;
    } catch (error) {
        console.error("Embedding API Error:", error);
        // Return a dummy vector so we don't crash, but similarity will be essentially random/0
        return Array(768).fill(0);
    }
}

/**
 * Calculates the Cosine Similarity between two text strings using generic embeddings.
 * 1.0 = mathematically identical orientation
 * 0.0 = completely orthogonal
 */
export async function computeSemanticSimilarity(textA: string, textB: string): Promise<number> {
    const vectorA = await getEmbedding(textA);
    const vectorB = await getEmbedding(textB);

    // Safety check just in case embedding failed or returned zero-vector arrays
    if (vectorA.every(v => v === 0) || vectorB.every(v => v === 0)) {
        return fallbackStringSimilarity(textA, textB);
    }

    // ml-distance similarity calculates exactly how close they are (1 = identical).
    return similarity.cosine(vectorA, vectorB);
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
