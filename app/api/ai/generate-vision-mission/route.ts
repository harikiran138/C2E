import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Cache to satisfy repeat requests within a short timeframe (server-side, per-instance)
const ai_cache: Record<string, string> = {};

async function callGemini(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not found in environment variables');
    }

    if (ai_cache[prompt]) {
        return ai_cache[prompt];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { program_name, institute_vision, institute_mission, vision_inputs, mission_inputs, vision_instructions, mission_instructions, count = 1 } = body;

        if (!program_name) {
            return NextResponse.json({ error: 'Missing program_name' }, { status: 400 });
        }

        // 1. Generate Vision
        const visionPrompt = `
You are an academic accreditation expert. Generate ${count} distinct Program Vision statement(s) for:
Program: ${program_name}
Institute Vision: ${institute_vision || 'Not specified'}
Selected Focus Areas: ${(vision_inputs || []).join(', ')}
${vision_instructions ? `Custom User Instructions: ${vision_instructions}` : ''}
Rules: 
1. Each statement must be 1–2 lines, Future-oriented, Professional tone.
2. Return strictly a JSON ARRAY of strings, e.g. ["Vision 1", "Vision 2"].
3. No markdown, no "json" tags, just the raw array.
        `;

        const visionRaw = await callGemini(visionPrompt);
        let visionOptions: string[] = [];
        try {
            const cleaned = visionRaw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned);
            visionOptions = Array.isArray(parsed) ? parsed : [cleaned];
        } catch (e) {
            visionOptions = [visionRaw];
        }

        // 2. Generate Mission
        // We ask for generic missions compatible with the program context, as they aren't tied to a specific vision option yet.
        const missionPrompt = `
You are an academic accreditation expert. Generate ${count} distinct Program Mission paragraphs.
Program: ${program_name}
Institute Mission: ${institute_mission || 'Not specified'}
Selected Focus Areas: ${(mission_inputs || []).join(', ')}
${mission_instructions ? `Custom User Instructions: ${mission_instructions}` : ''}
Rules: 
1. Each mission must be a single paragraph with 3–5 action sentences.
2. Return strictly a JSON ARRAY of strings.
3. No markdown, no "json" tags.
        `;

        const missionRaw = await callGemini(missionPrompt);
        let missionOptions: string[] = [];
        try {
             const cleaned = missionRaw.replace(/```json/g, '').replace(/```/g, '').trim();
             const parsed = JSON.parse(cleaned);
             missionOptions = Array.isArray(parsed) ? parsed : [cleaned];
        } catch (e) {
            missionOptions = [missionRaw];
        }

        return NextResponse.json({
            visions: visionOptions,
            missions: missionOptions
        });

    } catch (error: any) {
        console.error('AI Generation API Error:', error);
        
        const count = 1; 
        const fallbackProgramName = "this program"; 
        
        const fallbackVisions = Array(count).fill(0).map((_, i) => `Option ${i+1}: To be a center of excellence in ${fallbackProgramName} education, fostering innovation and professional ethics.`);
        const fallbackMissions = Array(count).fill(0).map((_, i) => `Option ${i+1}: We are committed to providing high-quality ${fallbackProgramName} education through experiential learning.`);

        return NextResponse.json({
            vision: fallbackVisions[0], // Keep legacy support just in case
            mission: fallbackMissions[0], // Keep legacy support just in case
            visions: fallbackVisions,
            missions: fallbackMissions,
            error: error.message,
            is_fallback: true
        });
    }
}
