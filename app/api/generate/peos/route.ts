import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const PEO_TIME_HORIZON = 'Within 4 to 5 years of graduation';
const PEO_TIME_HORIZON_LOWER = PEO_TIME_HORIZON.toLowerCase();

const ABSOLUTE_TERMS = ['all graduates', 'every graduate', 'always', 'guarantee', '100%'];
const OUTCOME_STYLE_TERMS = [
  'at graduation',
  'on graduation',
  'student will be able to',
  'students will be able to',
  'immediate capability',
  'develop applications',
  'build applications',
];
const MEASURABLE_CUES = [
  'advance',
  'progress',
  'contribute',
  'engage',
  'lead',
  'professional growth',
  'career',
  'value',
];
const RELEVANCE_CUES = [
  'engineering',
  'industry',
  'professional',
  'ethical',
  'sustainable',
  'societal',
  'community',
];

function normalizeCount(value: unknown, fallback = 4) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(20, Math.max(1, Math.floor(parsed)));
}

function parsePeoArray(rawText: string) {
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fallback below
  }

  return cleaned
    .split('\n')
    .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
    .filter((line: string) => line.length > 10);
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripPrefix(text: string) {
  return text
    .replace(/^option\s*\d+\s*:\s*/i, '')
    .replace(/^peo\s*\d+\s*:\s*/i, '')
    .replace(/^\d+\.\s*/, '')
    .trim();
}

function containsAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function ensureSentence(text: string) {
  const trimmed = normalizeWhitespace(text).replace(/[.?!]+$/, '');
  return trimmed.length > 0 ? `${trimmed}.` : trimmed;
}

function canonicalKey(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildFallbackPeo(priority: string, programName: string) {
  return ensureSentence(
    `${PEO_TIME_HORIZON}, graduates will progress in professional ${programName} roles by applying ${priority} to solve complex engineering challenges in ways that are consistent with program and institutional mission priorities, while upholding ethical and sustainable practice`
  );
}

function enforcePeoQuality(rawStatement: string, priority: string, programName: string) {
  let statement = normalizeWhitespace(stripPrefix(rawStatement));

  statement = statement.replace(/\ball graduates\b/gi, 'graduates');
  statement = statement.replace(/\bevery graduate\b/gi, 'graduates');
  statement = statement.replace(/\bexcellence in\b/gi, 'professional growth in');
  statement = statement.replace(/\bexcellence\b/gi, 'professional growth');
  statement = statement.replace(/\bexcel in\b/gi, 'progress in');
  statement = statement.replace(/\bexcel\b/gi, 'progress');
  statement = statement.replace(/\bwill excel\b/gi, 'will progress');
  statement = statement.replace(/\bestablish(?:ing)? their own ventures\b/gi, 'pursue entrepreneurial and intrapreneurial pathways');

  for (const term of ABSOLUTE_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    statement = statement.replace(new RegExp(escaped, 'gi'), 'graduates');
  }

  if (containsAny(statement, OUTCOME_STYLE_TERMS)) {
    statement = statement
      .replace(/\bat graduation\b/gi, 'within 4 to 5 years of graduation')
      .replace(/\bon graduation\b/gi, 'within 4 to 5 years of graduation')
      .replace(/\bstudent[s]?\s+will be able to\b/gi, 'graduates will');
  }

  statement = statement.replace(/\bwithin a few years of graduation\b/gi, 'within 4 to 5 years of graduation');
  statement = statement.replace(/\bwithin four to five years of graduation\b/gi, 'within 4 to 5 years of graduation');
  statement = statement.replace(/\bwithin 4-5 years of graduation\b/gi, 'within 4 to 5 years of graduation');

  if (/^within\s+[^,]*years\s+of\s+graduation,\s*graduates will/i.test(statement)) {
    statement = statement.replace(/^within\s+[^,]*years\s+of\s+graduation,\s*graduates will/i, 'graduates will');
  }

  statement = `${PEO_TIME_HORIZON}, ${statement.replace(/^graduates will\s*/i, 'graduates will ')}`;

  if (!containsAny(statement, MEASURABLE_CUES)) {
    statement = `${statement.replace(/[.?!]+$/, '')} and contribute measurable value in their organizations and communities`;
  }

  if (!containsAny(statement, RELEVANCE_CUES)) {
    statement = `${statement.replace(/[.?!]+$/, '')} through ethical, sustainable, and industry-relevant engineering practice`;
  }

  const words = statement.split(/\s+/);
  if (words.length > 52) {
    statement = words.slice(0, 52).join(' ');
  }

  if (words.length < 18) {
    statement = `${statement.replace(/[.?!]+$/, '')} by applying ${priority} in professional ${programName} contexts`;
  }

  return ensureSentence(statement);
}

function scoreSmartAbet(statement: string) {
  const lower = statement.toLowerCase();

  const specific = lower.length >= 80;
  const measurable = containsAny(lower, MEASURABLE_CUES);
  const attainable = !containsAny(lower, ABSOLUTE_TERMS);
  const relevant = containsAny(lower, RELEVANCE_CUES);
  const timeBound = lower.startsWith(PEO_TIME_HORIZON_LOWER);
  const abetStyle = !containsAny(lower, OUTCOME_STYLE_TERMS);

  const score = [specific, measurable, attainable, relevant, timeBound, abetStyle].filter(Boolean).length;
  return { score, specific, measurable, attainable, relevant, timeBound, abetStyle };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('PEO Request Body:', JSON.stringify(body));
    const { priorities, count, institutionContext, programName } = body;
    const normalizedCount = normalizeCount(count);

    if (!priorities || priorities.length === 0) {
      console.warn('PEO Request missing priorities');
      return NextResponse.json({ error: 'Priorities are required' }, { status: 400 });
    }

    // Fallback/Safety Check
    if (!GEMINI_API_KEY) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL SECURITY ERROR: GEMINI_API_KEY environment variable is missing.');
      }
      console.warn('GEMINI_API_KEY is missing. Using mock generation.');
      const mockResults = Array.from({ length: normalizedCount }).map((_, i) => {
        const p1 = String(priorities[i % priorities.length] || 'professional practice');
        return buildFallbackPeo(p1, String(programName || 'engineering'));
      });
      return NextResponse.json({
        results: mockResults,
        quality: mockResults.map((statement) => scoreSmartAbet(statement))
      });
    }

    // Call Gemini API via Fetch
    const prompt = `
      You are an ABET EAC accreditation evaluator and engineering curriculum consultant.
      Program: "${programName}".
      Context: ${institutionContext || 'N/A'}
      Priority Anchors: ${priorities.join(', ')}.

      Task:
      Generate exactly ${normalizedCount} distinct Program Educational Objectives (PEOs).

      ABET framing to follow:
      - PEOs are broad statements describing what graduates are expected to attain within 4 to 5 years after graduation.
      - Statements should reflect career and professional attainment, not immediate graduation outcomes.

      Writing constraints:
      1. Each PEO must be one sentence and should begin with: "${PEO_TIME_HORIZON}, graduates will..."
      2. Keep each PEO broad, realistic, and assessable indirectly through alumni/employer/stakeholder feedback.
      3. Avoid narrow student-outcome wording (for example: "at graduation", "demonstrate tool use", "develop an app").
      4. Avoid absolute or unrealistic terms (for example: "all graduates will excel", "all graduates will start ventures").
      5. Across the full set, cover technical/professional growth, ethical responsibility, societal impact, and lifelong learning.
      6. Keep PEOs aligned with the institute mission and program mission from the provided context.
      7. Do not use the words "excel" or "excellence"; use "progress", "advance", "engage", or similar measurable phrasing.
      8. Use concise professional language suitable for accreditation documents.

      Output format:
      - Return strictly a JSON array of strings.
      - Do not include markdown, numbering keys, or explanatory text.

      Reject examples (do not generate anything similar):
      - "Graduates will demonstrate immediate coding capabilities at graduation."
      - "All graduates will establish successful startups."
      - "Graduates will excel in professional practice."

      Produce the final JSON array now.

      `;

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error details:', errText);
      throw new Error(`Gemini API Failed: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No content generated');
    }

    const parsedResults = parsePeoArray(generatedText)
      .slice(0, normalizedCount)
      .map((statement) => statement.replace(/^PEO\d+\s*:\s*/i, '').trim());

    const refined: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < parsedResults.length; i += 1) {
      const priority = String(priorities[i % priorities.length] || 'professional practice');
      const refinedStatement = enforcePeoQuality(parsedResults[i], priority, String(programName || 'engineering'));
      const key = canonicalKey(refinedStatement);
      if (!seen.has(key)) {
        seen.add(key);
        refined.push(refinedStatement);
      }
    }

    let fallbackIndex = 0;
    while (refined.length < normalizedCount) {
      const priority = String(priorities[fallbackIndex % priorities.length] || 'professional practice');
      const fallback = buildFallbackPeo(priority, String(programName || 'engineering'));
      const key = canonicalKey(fallback);
      if (!seen.has(key)) {
        seen.add(key);
        refined.push(fallback);
      }
      fallbackIndex += 1;
      if (fallbackIndex > normalizedCount * 3) break;
    }

    return NextResponse.json({
      results: refined,
      quality: refined.map((statement) => scoreSmartAbet(statement))
    });

  } catch (error: any) {
    console.error('PEO Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
