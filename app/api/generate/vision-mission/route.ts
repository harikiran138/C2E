import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Simple in-memory cache for AI results
const aiCache = new Map<string, string[]>();

const VISION_APPROVAL_THRESHOLD = 90;
const VISION_GLOBAL_PATTERNS: Array<{ concept: string; regex: RegExp }> = [
  { concept: 'globally recognized', regex: /\bglobally recognized\b/i },
  { concept: 'internationally benchmarked', regex: /\binternationally benchmarked\b/i },
  { concept: 'global leadership', regex: /\bglobal leadership\b/i },
  { concept: 'globally distinguished', regex: /\bglobally distinguished\b/i },
];
const VISION_OPERATIONAL_TERMS = [
  'education',
  'teaching',
  'learning',
  'curriculum',
  'pedagogy',
  'classroom',
  'provide',
  'deliver',
  'develop',
  'cultivate',
  'train',
  'prepare',
  'implement',
  'foster',
];
const VISION_MARKETING_TERMS = ['destination', 'hub', 'world-class', 'best-in-class', 'unmatched'];
const VISION_STARTERS = [
  'To be globally recognized for',
  'To be internationally benchmarked for',
  'To attain global leadership in',
  'To be globally distinguished for',
];

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractVisionGlobalConcepts(statement: string) {
  return VISION_GLOBAL_PATTERNS.filter(({ regex }) => regex.test(statement)).map(({ concept }) => concept);
}

function containsTerm(statement: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(statement);
}

function scoreVisionCandidate(statement: string) {
  const normalized = normalizeWhitespace(statement);
  const lower = normalized.toLowerCase();
  const words = normalized.replace(/[.?!]+$/, '').split(/\s+/).filter(Boolean);
  const globalConcepts = [...new Set(extractVisionGlobalConcepts(lower))];
  const globalTokenHits = lower.match(/\b(global|globally|international|internationally|world)\b/g)?.length || 0;
  const operationalHits = VISION_OPERATIONAL_TERMS.filter((term) => containsTerm(lower, term));
  const marketingHits = VISION_MARKETING_TERMS.filter((term) => containsTerm(lower, term));
  const estimatedPillars = Math.max(1, (normalized.match(/,/g)?.length || 0) + (normalized.match(/\band\b/gi)?.length || 0));

  const hardFailures = [
    ...(operationalHits.length > 0 ? ['operational leakage'] : []),
    ...(marketingHits.length > 0 ? ['marketing language'] : []),
    ...(globalConcepts.length !== 1 ? ['global concept count'] : []),
    ...(globalTokenHits > 1 ? ['global phrase stacking'] : []),
    ...(estimatedPillars > 3 ? ['pillar count'] : []),
  ];

  let score = 100;
  if (words.length < 15 || words.length > 25) score -= 20;
  if (!VISION_STARTERS.some((starter) => lower.startsWith(starter.toLowerCase()))) score -= 20;
  if (globalConcepts.length !== 1) score -= 20;
  if (operationalHits.length > 0) score -= 30;
  if (marketingHits.length > 0) score -= 20;
  if (estimatedPillars > 3) score -= 15;

  return {
    score: Math.max(0, Math.min(100, score)),
    hardFailures,
  };
}

function buildDeterministicVision(programName: string, priorities: string[], index: number) {
  const selected = priorities
    .slice(0, 3)
    .map((p) =>
      normalizeWhitespace(String(p).toLowerCase())
        .replace(/\b(outcome based|outcome-based|outcome oriented|outcome-oriented)\b/g, 'institutional distinction')
        .replace(/\b(education|teaching|learning|curriculum|pedagogy|classroom)\b/g, 'academic distinction')
        .replace(/\b(develop|provide|deliver|cultivate|train|prepare|implement|foster)\b/g, 'advance')
    )
    .filter(Boolean);
  const pillarText =
    selected.length > 0
      ? selected.join(', ').replace(/, ([^,]*)$/, ', and $1')
      : 'institutional distinction, innovation leadership, and sustainable societal contribution';

  const templates = [
    `To be globally recognized for long-term ${programName} distinction through ${pillarText} with sustained societal and professional relevance.`,
    `To be internationally benchmarked for enduring ${programName} leadership through ${pillarText} with long-horizon institutional impact.`,
    `To attain global leadership in ${programName} through sustained ${pillarText} and strategic institutional distinction.`,
    `To be globally distinguished for sustained ${programName} excellence through ${pillarText} with enduring strategic contribution.`,
  ];

  return templates[index % templates.length];
}

export async function POST(request: Request) {
  try {
    const { type, priorities, count, institutionContext, programName } = await request.json();

    const cacheKey = JSON.stringify({ type, priorities, count, institutionContext, programName });
    if (aiCache.has(cacheKey)) {
      return NextResponse.json({ results: aiCache.get(cacheKey) });
    }

    if (!priorities || priorities.length === 0) {
      return NextResponse.json({ error: 'Priorities are required' }, { status: 400 });
    }

    // Fallback/Safety Check
    if (!GEMINI_API_KEY) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL SECURITY ERROR: GEMINI_API_KEY environment variable is missing.');
      }
      console.warn('GEMINI_API_KEY is missing. Using mock generation.');
      const mockResults = Array.from({ length: count }).map((_, i) => {
        const p1 = priorities[i % priorities.length];
        const p2 = priorities[(i + 1) % priorities.length] || priorities[0];
        if (type === 'vision') {
          return `To be a global leader in ${programName} education, fostering ${p1} and ${p2} to transform society.`;
        } else {
          return `To provide ${p1} through ${p2} in ${programName}, ensuring holistic development of students.`;
        }
      });
      return NextResponse.json({ results: mockResults });
    }

    // Call Gemini API via Fetch
    const prompt = `
      You are an expert academic consultant for NBA/ABET accreditation.
      Context: The institution has the following Vision: "${institutionContext || 'N/A'}".
      Program Name: "${programName}".
      Task: Generate ${count} distinct and professional ${type} statements for this program.
      Focus Areas (Priorities): ${priorities.join(', ')}.
      
      Strategic Constraints for ${type.toUpperCase()}:
      ${type === 'vision' ? `
      1. Vision must represent institutional STANDING (WHERE), not the teaching PROCESS (HOW).
      2. Mandatory Starts: Every Vision MUST begin with one of:
         "To be globally recognized for", "To be internationally benchmarked for",
         "To attain global leadership in", "To be globally distinguished for".
      3. Use exactly ONE global positioning concept per statement. Do not stack additional global/international phrases.
      4. Banned terms in Vision: education, teaching, learning, curriculum, pedagogy, provide, deliver, cultivate, develop, train, implement.
      5. Limit each Vision statement to maximum 3 strategic pillars.
      ` : `
      1. Mission must represent the implementable action (HOW) the program achieves its vision.
      2. Professional and action-oriented.
      `}
      4. Each statement should be strictly 1-2 sentences.
      5. Professional, academic tone.
      6. Align with the provided priorities.
      7. Output strictly as a JSON array of strings, e.g., ["Statement 1", "Statement 2"]. Do not include markdown formatting or extra text.
    `;

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`Gemini API Failed: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No content generated');
    }

    // Clean up and parse the array
    let cleanedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
    let results: string[] = [];

    try {
      const parsed = JSON.parse(cleanedText);
      if (Array.isArray(parsed)) {
        results = parsed;
      } else {
        results = [cleanedText];
      }
    } catch (e) {
      results = cleanedText.split('\n').filter((l: string) => l.trim().length > 10).map((l: string) => l.replace(/^\d+\.\s*/, '').trim());
    }

    if (type === 'vision') {
      results = Array.from({ length: count }).map((_, index) => {
        const candidate = normalizeWhitespace(results[index] || '');
        const quality = scoreVisionCandidate(candidate);
        if (quality.score >= VISION_APPROVAL_THRESHOLD && quality.hardFailures.length === 0) {
          return candidate;
        }
        const deterministic = buildDeterministicVision(programName, priorities, index);
        const deterministicQuality = scoreVisionCandidate(deterministic);
        if (deterministicQuality.score >= VISION_APPROVAL_THRESHOLD && deterministicQuality.hardFailures.length === 0) {
          return deterministic;
        }
        return `To be globally recognized for long-term ${programName} distinction through institutional leadership, innovation foresight, and sustainable societal contribution.`;
      });
    }

    // Cache the results
    aiCache.set(cacheKey, results);
    return NextResponse.json({ results });

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
