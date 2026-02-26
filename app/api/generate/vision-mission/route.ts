import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Simple in-memory cache for AI results
const aiCache = new Map<string, string[]>();

const VISION_APPROVAL_THRESHOLD = 90;
const VISION_SIMILARITY_THRESHOLD = 0.75;
const VISION_GLOBAL_PATTERNS: Array<{ concept: string; regex: RegExp }> = [
  { concept: 'globally recognized', regex: /\bglobally recognized\b/i },
  { concept: 'globally respected', regex: /\bglobally respected\b/i },
  { concept: 'internationally benchmarked', regex: /\binternationally benchmarked\b/i },
  { concept: 'global leadership', regex: /\bglobal leadership\b/i },
  { concept: 'global distinction', regex: /\b(global distinction|achieve distinction|distinction in)\b/i },
  { concept: 'leading advancement', regex: /\badvance as a leading\b/i },
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
const REDUNDANCY_SUFFIXES = ['ization', 'ation', 'ition', 'tion', 'sion', 'ment', 'ness', 'ity', 'ship', 'ing', 'ed', 'es', 's'];
const REDUNDANCY_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'into',
  'through',
  'toward',
  'towards',
  'to',
  'of',
  'in',
  'on',
  'a',
  'an',
  'by',
  'be',
  'or',
  'is',
  'are',
  'as',
  'at',
  'program',
  'engineering',
  'institutional',
  'strategic',
  'global',
  'globally',
  'international',
  'internationally',
  'sustained',
  'long',
  'term',
  'future',
]);
const VISION_STARTERS = [
  'To be globally recognized for',
  'To emerge as',
  'To achieve distinction in',
  'To advance as a leading',
  'To be globally respected for',
];

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractTokens(text: string) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4);
}

function normalizeRoot(word: string) {
  let root = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!root || root.length <= 4) return root;
  for (const suffix of REDUNDANCY_SUFFIXES) {
    if (root.endsWith(suffix) && root.length - suffix.length >= 4) {
      root = root.slice(0, -suffix.length);
      break;
    }
  }
  return root;
}

function getRepeatedRoots(statement: string) {
  const tokens = extractTokens(statement).filter((token) => !REDUNDANCY_STOP_WORDS.has(token));
  const counts = new Map<string, number>();
  for (const token of tokens) {
    const root = normalizeRoot(token);
    if (!root || REDUNDANCY_STOP_WORDS.has(root)) continue;
    counts.set(root, (counts.get(root) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([root]) => root);
}

function getSynonymStacking(statement: string) {
  const lower = statement.toLowerCase();
  const groups = [
    ['distinction', 'excellence', 'premier', 'leading', 'leadership', 'recognized', 'respected'],
    ['innovation', 'innovative', 'transformative', 'foresight', 'advancement'],
  ];
  return groups.some((group) => group.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(lower)).length >= 3);
}

function extractVisionGlobalConcepts(statement: string) {
  return VISION_GLOBAL_PATTERNS.filter(({ regex }) => regex.test(statement)).map(({ concept }) => concept);
}

function getVisionStarter(statement: string) {
  const normalized = normalizeWhitespace(statement).toLowerCase();
  const ordered = [...VISION_STARTERS].sort((a, b) => b.length - a.length);
  return ordered.find((starter) => normalized.startsWith(starter.toLowerCase())) || '';
}

function stripVisionStarter(statement: string) {
  let cleaned = normalizeWhitespace(statement).replace(/[.?!]+$/, '');
  const ordered = [...VISION_STARTERS].sort((a, b) => b.length - a.length);
  for (const starter of ordered) {
    if (cleaned.toLowerCase().startsWith(starter.toLowerCase())) {
      cleaned = cleaned.slice(starter.length).trim();
      break;
    }
  }
  return cleaned;
}

function rewriteVisionStarter(statement: string, starter: string) {
  const body =
    stripVisionStarter(statement) ||
    'long-term institutional distinction through innovation leadership and sustainable societal contribution';
  return normalizeWhitespace(`${starter} ${body}.`);
}

function visionSimilarity(a: string, b: string) {
  const tokensA = new Set(extractTokens(a));
  const tokensB = new Set(extractTokens(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  const intersection = [...tokensA].filter((word) => tokensB.has(word)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
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
  const repeatedRoots = getRepeatedRoots(normalized);
  const synonymStacking = getSynonymStacking(normalized);
  const estimatedPillars = Math.max(1, (normalized.match(/,/g)?.length || 0) + (normalized.match(/\band\b/gi)?.length || 0));

  const hardFailures = [
    ...(operationalHits.length > 0 ? ['operational leakage'] : []),
    ...(marketingHits.length > 0 ? ['marketing language'] : []),
    ...(globalConcepts.length !== 1 ? ['global concept count'] : []),
    ...(globalTokenHits > 1 ? ['global phrase stacking'] : []),
    ...(estimatedPillars > 3 ? ['pillar count'] : []),
    ...(repeatedRoots.length > 0 ? [`repeated roots: ${repeatedRoots.join(', ')}`] : []),
    ...(synonymStacking ? ['synonym stacking'] : []),
  ];

  let score = 100;
  if (words.length < 15 || words.length > 25) score -= 20;
  if (!VISION_STARTERS.some((starter) => lower.startsWith(starter.toLowerCase()))) score -= 20;
  if (globalConcepts.length !== 1) score -= 20;
  if (operationalHits.length > 0) score -= 30;
  if (marketingHits.length > 0) score -= 20;
  if (estimatedPillars > 3) score -= 15;
  if (repeatedRoots.length > 0) score -= Math.min(30, repeatedRoots.length * 15);
  if (synonymStacking) score -= 20;

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
        .replace(/\b(outcome based|outcome-based|outcome oriented|outcome-oriented)\b/g, 'institutional leadership')
        .replace(/\b(education|teaching|learning|curriculum|pedagogy|classroom)\b/g, 'scholarly standards')
        .replace(/\b(develop|provide|deliver|cultivate|train|prepare|implement|foster)\b/g, 'advance')
    )
    .filter(Boolean);
  const pillarText =
    selected.length > 0
      ? selected.join(', ').replace(/, ([^,]*)$/, ', and $1')
      : 'institutional leadership, innovation leadership, and sustainable societal contribution';

  const templates = [
    `To be globally recognized for long-term ${programName} distinction through ${pillarText} with sustained societal and professional relevance.`,
    `To emerge as a long-horizon ${programName} benchmark for globally respected distinction through ${pillarText} and enduring strategic relevance.`,
    `To achieve distinction in ${programName} through sustained ${pillarText} and long-term institutional contribution.`,
    `To advance as a leading ${programName} program through sustained ${pillarText}, institutional leadership, and enduring strategic contribution.`,
    `To be globally respected for sustained ${programName} excellence through ${pillarText} with long-horizon societal relevance.`,
  ];

  return templates[index % templates.length];
}

function buildSafeVisionVariant(programName: string, index: number) {
  const templates = [
    `To be globally recognized for long-term ${programName} distinction through institutional leadership, innovation foresight, and sustainable societal contribution.`,
    `To emerge as a long-horizon ${programName} benchmark for globally respected distinction through strategic innovation leadership and enduring public value.`,
    `To achieve distinction in ${programName} through sustained institutional leadership, responsible innovation, and long-term societal contribution.`,
    `To advance as a leading ${programName} program through strategic distinction, institutional standards, and enduring professional and societal relevance.`,
    `To be globally respected for sustained ${programName} excellence through ethical institutional standards, innovation strength, and long-horizon societal value.`,
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
         "To be globally recognized for", "To emerge as", "To achieve distinction in",
         "To advance as a leading", "To be globally respected for".
      3. Use exactly ONE global positioning concept per statement. Do not stack additional global/international phrases.
      4. Banned terms in Vision: education, teaching, learning, curriculum, pedagogy, provide, deliver, cultivate, develop, train, implement.
      5. Limit each Vision statement to maximum 3 strategic pillars.
      6. Each Vision must use a different opening phrase and unique framing.
      7. If similarity between two statements exceeds 70%, rewrite the weaker one.
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
      const normalizedCandidates = Array.from({ length: count }).map((_, index) =>
        normalizeWhitespace(results[index] || '')
      );
      const diversified: string[] = [];
      const usedStarters = new Set<string>();

      for (let index = 0; index < count; index += 1) {
        let candidate = normalizedCandidates[index] || '';
        let attempts = 0;

        while (attempts < 6) {
          const targetStarter = VISION_STARTERS[(index + attempts) % VISION_STARTERS.length];
          candidate = rewriteVisionStarter(candidate || buildDeterministicVision(programName, priorities, index + attempts), targetStarter);
          const quality = scoreVisionCandidate(candidate);
          const starter = getVisionStarter(candidate);
          const repeatedStarter = !!starter && usedStarters.has(starter);
          const tooSimilar = diversified.some(
            (existing) => visionSimilarity(existing, candidate) > VISION_SIMILARITY_THRESHOLD
          );

          if (quality.score >= VISION_APPROVAL_THRESHOLD && quality.hardFailures.length === 0 && !repeatedStarter && !tooSimilar) {
            break;
          }

          candidate = buildDeterministicVision(programName, priorities, index + attempts + count);
          attempts += 1;
        }

        const finalQuality = scoreVisionCandidate(candidate);
        if (finalQuality.score < VISION_APPROVAL_THRESHOLD || finalQuality.hardFailures.length > 0) {
          candidate = buildSafeVisionVariant(programName, index);
          const safeQuality = scoreVisionCandidate(candidate);
          if (safeQuality.score < VISION_APPROVAL_THRESHOLD || safeQuality.hardFailures.length > 0) {
            candidate = buildSafeVisionVariant(programName, index + count);
          }
        }

        const starter = getVisionStarter(candidate);
        if (starter) usedStarters.add(starter);
        diversified.push(candidate);
      }

      results = diversified;
    }

    // Cache the results
    aiCache.set(cacheKey, results);
    return NextResponse.json({ results });

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
