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
        const { program_name, institute_vision, institute_mission, vision_inputs, mission_inputs, vision_instructions, mission_instructions } = body;

        if (!program_name) {
            return NextResponse.json({ error: 'Missing program_name' }, { status: 400 });
        }

        // 1. Generate Vision
        const visionPrompt = `
You are an academic accreditation expert. Generate a Program Vision for:
Program: ${program_name}
Institute Vision: ${institute_vision || 'Not specified'}
Selected Focus Areas: ${(vision_inputs || []).join(', ')}
${vision_instructions ? `Custom User Instructions: ${vision_instructions}` : ''}
Rules: 1–2 lines, Future-oriented, Professional tone. Return ONLY the vision statement.
        `;

        const generatedVision = await callGemini(visionPrompt);

        // 2. Generate Mission
        const missionPrompt = `
You are an academic accreditation expert. Generate a Program Mission paragraph.
Program: ${program_name}
Institute Mission: ${institute_mission || 'Not specified'}
Program Vision: ${generatedVision}
Selected Focus Areas: ${(mission_inputs || []).join(', ')}
${mission_instructions ? `Custom User Instructions: ${mission_instructions}` : ''}
Rules: 3–5 action sentences in one paragraph. Align with Vision. Return ONLY the mission.
        `;

        const generatedMission = await callGemini(missionPrompt);

        return NextResponse.json({
            vision: generatedVision,
            mission: generatedMission
        });

    } catch (error: any) {
        console.error('AI Generation API Error:', error);
        
        // Return fallback if Gemini fails
        const fallbackProgramName = "this program"; 
        
        const fallbackVision = `To be a center of excellence in ${fallbackProgramName} education, fostering innovation and professional ethics to meet global challenges.`;
        const fallbackMission = `We are committed to providing high-quality ${fallbackProgramName} education through experiential learning, industry collaboration, and research-led teaching. Our mission is to develop competent engineers who are equipped with technical skills, innovative mindset, and strong ethical values to contribute meaningfully to society and sustainable development.`;

        return NextResponse.json({
            vision: fallbackVision,
            mission: fallbackMission,
            error: error.message,
            is_fallback: true
        });
    }
}
