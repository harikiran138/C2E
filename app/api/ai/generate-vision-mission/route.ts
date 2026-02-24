import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Cache to satisfy repeat requests within a short timeframe (server-side, per-instance)
const ai_cache: Record<string, string> = {};

type GenerationMode = 'vision' | 'mission' | 'both';

const ABSOLUTE_TERMS = [
    'all graduates',
    'every graduate',
    'always',
    'guarantee',
    '100%',
];

const OUTCOME_STYLE_TERMS = [
    'at graduation',
    'on graduation',
    'student will be able to',
    'students will be able to',
    'immediate capability',
];

async function callGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not found in environment variables');
    }

    if (ai_cache[prompt]) {
        return ai_cache[prompt];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${errorText}`);
    }

    const result = await response.json();
    try {
        const generatedText = result.candidates[0].content.parts[0].text.trim();
        ai_cache[prompt] = generatedText;
        return generatedText;
    } catch (error) {
        throw new Error('Unexpected response format from Gemini API');
    }
}

function clampCount(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function parseOptions(rawText: string): string[] {
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
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((line) => line.length > 0);
}

function normalizeWhitespace(text: string) {
    return text.replace(/\s+/g, ' ').trim();
}

function stripOptionPrefix(text: string) {
    return text
        .replace(/^option\s*\d+\s*:\s*/i, '')
        .replace(/^vision\s*\d+\s*:\s*/i, '')
        .replace(/^mission\s*\d+\s*:\s*/i, '')
        .replace(/^\d+\.\s*/, '')
        .trim();
}

function containsAny(text: string, terms: string[]) {
    const lower = text.toLowerCase();
    return terms.some((term) => lower.includes(term));
}

function splitSentences(text: string) {
    return normalizeWhitespace(text)
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
}

function ensureSentence(text: string) {
    const trimmed = normalizeWhitespace(text).replace(/[.?!]+$/, '');
    return trimmed.length > 0 ? `${trimmed}.` : trimmed;
}

function enforceVisionQuality(rawStatement: string, focusAreas: string[]) {
    let statement = normalizeWhitespace(stripOptionPrefix(rawStatement));
    statement = statement.replace(/\bexcellence in\b/gi, 'leadership in');
    statement = statement.replace(/\bexcellence\b/gi, 'leadership');
    statement = statement.replace(/\bexcel in\b/gi, 'advance in');
    statement = statement.replace(/\bexcel\b/gi, 'advance');
    statement = statement.replace(/\bwill excel\b/gi, 'will advance');
    statement = statement.replace(/\ball graduates\b/gi, 'graduates');
    statement = statement.replace(/\bevery graduate\b/gi, 'graduates');

    if (containsAny(statement, OUTCOME_STYLE_TERMS)) {
        statement = statement
            .replace(/\bat graduation\b/gi, 'in their professional careers')
            .replace(/\bon graduation\b/gi, 'in their professional careers');
    }

    if (!/^to\s+/i.test(statement)) {
        statement = `To be a leading program recognized for ${statement.replace(/^[A-Z]/, (match) => match.toLowerCase())}`;
    }

    const words = statement.split(/\s+/);
    if (words.length > 36) {
        statement = words.slice(0, 36).join(' ');
    }

    if (words.length < 12 && focusAreas.length > 0) {
        statement = `${statement.replace(/[.?!]+$/, '')} with emphasis on ${focusAreas.slice(0, 2).join(' and ').toLowerCase()}`;
    }

    statement = statement
        .replace(/\bexcellence in\b/gi, 'leadership in')
        .replace(/\bexcellence\b/gi, 'leadership')
        .replace(/\bexcel in\b/gi, 'advance in')
        .replace(/\bexcel\b/gi, 'advance');

    return ensureSentence(statement);
}

function buildMissionSupportSentences(focusAreas: string[]) {
    const focusPhrase = focusAreas.length
        ? focusAreas.slice(0, 2).join(' and ').toLowerCase()
        : 'outcome-based education and professional practice';
    const sanitizedFocusPhrase = focusPhrase
        .replace(/\bexcellence in\b/gi, 'professional growth in')
        .replace(/\bexcellence\b/gi, 'professional growth')
        .replace(/\bexcel in\b/gi, 'progress in')
        .replace(/\bexcel\b/gi, 'progress');

    return [
        `Deliver a curriculum anchored in ${sanitizedFocusPhrase} through continuous academic improvement.`,
        'Strengthen industry collaboration, ethical engineering practice, and sustainability-oriented problem solving.',
        'Promote innovation, communication, teamwork, and lifelong learning for long-term professional growth.',
    ];
}

function enforceMissionQuality(rawStatement: string, focusAreas: string[]) {
    let statement = normalizeWhitespace(stripOptionPrefix(rawStatement));
    statement = statement.replace(/\bexcellence in\b/gi, 'professional growth in');
    statement = statement.replace(/\bexcellence\b/gi, 'professional growth');
    statement = statement.replace(/\bexcel in\b/gi, 'progress in');
    statement = statement.replace(/\bexcel\b/gi, 'progress');
    statement = statement.replace(/\bwill excel\b/gi, 'will progress');
    statement = statement.replace(/\ball graduates\b/gi, 'graduates');
    statement = statement.replace(/\bevery graduate\b/gi, 'graduates');
    statement = statement.replace(/\bestablish(?:ing)? their own ventures\b/gi, 'pursue entrepreneurial and intrapreneurial pathways');
    statement = statement.replace(/\bat graduation\b/gi, 'during their professional journey');

    let sentences = splitSentences(statement).map((sentence) => ensureSentence(sentence));
    const supportSentences = buildMissionSupportSentences(focusAreas);

    if (sentences.length === 0) {
        sentences = [supportSentences[0], supportSentences[1], supportSentences[2]];
    }

    let supportIndex = 0;
    while (sentences.length < 3 && supportIndex < supportSentences.length) {
        const candidate = supportSentences[supportIndex];
        if (!sentences.some((sentence) => sentence.toLowerCase() === candidate.toLowerCase())) {
            sentences.push(candidate);
        }
        supportIndex += 1;
    }

    if (sentences.length > 5) {
        sentences = sentences.slice(0, 5);
    }

    return sentences.map((sentence) => ensureSentence(sentence)).join(' ');
}

function removeAbsoluteClaims(statement: string) {
    let cleaned = statement;
    for (const term of ABSOLUTE_TERMS) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleaned = cleaned.replace(new RegExp(escaped, 'gi'), 'graduates');
    }
    return cleaned;
}

function dedupeStatements(statements: string[]) {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const statement of statements) {
        const key = statement.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(statement);
        }
    }

    return unique;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            program_name,
            institute_vision,
            institute_mission,
            vision_inputs,
            mission_inputs,
            vision_instructions,
            mission_instructions,
            count,
            vision_count,
            mission_count,
            mode,
            selected_program_vision
        } = body;

        if (!program_name) {
            return NextResponse.json({ error: 'Missing program_name' }, { status: 400 });
        }

        const requestedMode = String(mode || 'both').toLowerCase() as GenerationMode;
        const generationMode: GenerationMode = ['vision', 'mission', 'both'].includes(requestedMode) ? requestedMode : 'both';
        const shouldGenerateVision = generationMode === 'vision' || generationMode === 'both';
        const shouldGenerateMission = generationMode === 'mission' || generationMode === 'both';

        const visionCount = clampCount(vision_count ?? count, 1, 1, 10);
        const missionCount = clampCount(mission_count ?? count, 1, 1, 10);

        if (generationMode === 'mission' && !selected_program_vision) {
            return NextResponse.json(
                { error: 'Program vision is required before generating mission statements.' },
                { status: 400 }
            );
        }

        let visionOptions: string[] = [];
        let missionOptions: string[] = [];

        if (shouldGenerateVision) {
            const visionPrompt = `
You are an academic accreditation expert. Generate ${visionCount} distinct Program Vision statement(s) for:
Program: ${program_name}
Institute Vision: ${institute_vision || 'Not specified'}
Selected Focus Areas: ${(vision_inputs || []).join(', ')}
${vision_instructions ? `Custom User Instructions: ${vision_instructions}` : ''}
Rules: 
1. Each statement must be 1-2 lines, Future-oriented, Professional tone.
2. Return strictly a JSON ARRAY of strings, e.g. ["Vision 1", "Vision 2"].
3. No markdown, no "json" tags, just the raw array.
        `;
            const visionRaw = await callGemini(visionPrompt);
            visionOptions = parseOptions(visionRaw)
                .map((item) => enforceVisionQuality(removeAbsoluteClaims(item), vision_inputs || []))
                .filter(Boolean);
            visionOptions = dedupeStatements(visionOptions).slice(0, visionCount);
        }

        if (shouldGenerateMission) {
            const visionAnchor = selected_program_vision || visionOptions[0] || 'Not specified';
            const missionPrompt = `
You are an academic accreditation expert. Generate ${missionCount} distinct Program Mission paragraphs.
Program: ${program_name}
Selected Program Vision: ${visionAnchor}
Institute Mission: ${institute_mission || 'Not specified'}
Selected Focus Areas: ${(mission_inputs || []).join(', ')}
${mission_instructions ? `Custom User Instructions: ${mission_instructions}` : ''}
Rules: 
1. Each mission must be a single paragraph with 3-5 action sentences.
2. Mission statements must be implementable and aligned to the selected program vision.
3. Avoid highly narrow or overly ambitious phrasing that cannot be assessed in curriculum processes.
4. Return strictly a JSON ARRAY of strings.
5. No markdown, no "json" tags.
        `;
            const missionRaw = await callGemini(missionPrompt);
            missionOptions = parseOptions(missionRaw)
                .map((item) => enforceMissionQuality(removeAbsoluteClaims(item), mission_inputs || []))
                .filter(Boolean);
            missionOptions = dedupeStatements(missionOptions).slice(0, missionCount);
        }

        if (shouldGenerateVision && visionOptions.length === 0) {
            visionOptions = [
                enforceVisionQuality(
                    `To be a leading ${program_name} program that advances innovation, ethics, and societal impact.`,
                    vision_inputs || []
                ),
            ];
        }

        if (shouldGenerateMission && missionOptions.length === 0) {
            missionOptions = [
                enforceMissionQuality(
                    `Deliver quality engineering education through outcome-based and experiential learning. Strengthen industry engagement and ethical practice with sustainability focus. Promote innovation, teamwork, and lifelong learning for professional growth.`,
                    mission_inputs || []
                ),
            ];
        }

        return NextResponse.json({
            vision: visionOptions[0] || null,
            mission: missionOptions[0] || null,
            visions: visionOptions,
            missions: missionOptions
        });

    } catch (error: any) {
        console.error('AI Generation API Error:', error);
        const count = 1;
        const fallbackProgramName = "this program";
        const fallbackVisions = Array(count).fill(0).map((_, i) => `Option ${i + 1}: To be a leading ${fallbackProgramName} program fostering innovation and professional ethics.`);
        const fallbackMissions = Array(count).fill(0).map((_, i) => `Option ${i + 1}: We are committed to providing high-quality ${fallbackProgramName} education through experiential learning.`);

        return NextResponse.json({
            vision: fallbackVisions[0],
            mission: fallbackMissions[0],
            visions: fallbackVisions,
            missions: fallbackMissions,
            error: error.message,
            is_fallback: true
        });
    }
}
