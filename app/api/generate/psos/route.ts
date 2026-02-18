import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export async function POST(request: Request) {
  try {
    const { leadSociety, count, programName } = await request.json();

    if (!leadSociety) {
      return NextResponse.json({ error: 'Lead Society is required' }, { status: 400 });
    }

    // Fallback/Safety Check
    if (!GEMINI_API_KEY) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL SECURITY ERROR: GEMINI_API_KEY environment variable is missing.');
        }
        console.warn('GEMINI_API_KEY is missing. Using mock generation.');
        const mockResults = Array.from({ length: count }).map((_, i) => {
             return `PSO${i+1}: Graduates will be able to apply principles of ${programName} tailored to the standards of ${leadSociety}.`;
        });
        return NextResponse.json({ results: mockResults });
    }

    // Call Gemini API via Fetch
    const prompt = `
      You are an expert academic curriculum designer.
      Program Name: "${programName}".
      Lead Professional Society: "${leadSociety}".
      Task: Generate ${count} distinct Program Specific Outcomes (PSOs).
      
      Constraints:
      1. Each PSO should be specific to the discipline and align with the competencies defined by ${leadSociety}.
      2. Professional, academic tone.
      3. Output strictly as a JSON array of strings. Do not include markdown formatting or extra text.
      Example: ["Graduates will...", "Graduates will..."]
    `;

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
        throw new Error(`Gemini API Failed: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
        throw new Error('No content generated');
    }

    // Clean up and parse the array
    let cleanedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
        const parsed = JSON.parse(cleanedText);
        // Ensure it's an array of strings
        if (Array.isArray(parsed)) {
            return NextResponse.json({ results: parsed.map((p: any) => typeof p === 'string' ? p : JSON.stringify(p)) });
        } else {
            return NextResponse.json({ results: [cleanedText] });
        }
    } catch (e) {
        // Fallback parsing
        const fallbackList = cleanedText.split('\n').filter((l: string) => l.trim().length > 10).map((l: string) => l.replace(/^\d+\.\s*/, '').trim());
        return NextResponse.json({ results: fallbackList });
    }

  } catch (error: any) {
    console.error('PSO Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
