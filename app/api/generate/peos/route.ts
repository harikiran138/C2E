import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export async function POST(request: Request) {
  try {
    const { priorities, count, institutionContext, programName } = await request.json();

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
             return `PEO${i+1}: Graduates will demonstrate expert knowledge in ${programName}, focusing on ${p1} to solve complex problems.`;
        });
        return NextResponse.json({ results: mockResults });
    }

    // Call Gemini API via Fetch
    const prompt = `
      You are an expert academic consultant for an engineering program.
      Context: ${institutionContext || 'N/A'}.
      Program Name: "${programName}".
      Task: Generate ${count} distinct Program Educational Objectives (PEOs).
      Focus Areas (Priorities): ${priorities.join(', ')}.
      
      Constraints:
      1. Each PEO should describe what graduates are expected to attain within a few years of graduation.
      2. Professional, academic tone.
      3. Align with the provided priorities.
      4. Output strictly as a JSON array of strings. Do not include markdown formatting or extra text.
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
    console.error('PEO Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
