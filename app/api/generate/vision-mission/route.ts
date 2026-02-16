import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export async function POST(request: Request) {
  try {
    const { type, priorities, count, institutionContext, programName } = await request.json();

    if (!priorities || priorities.length === 0) {
      return NextResponse.json({ error: 'Priorities are required' }, { status: 400 });
    }

    // Fallback Mock Generation if no key
    if (!GEMINI_API_KEY) {
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
      You are an expert academic consultant.
      Context: The institution has the following Vision: "${institutionContext || 'N/A'}".
      Program Name: "${programName}".
      Task: Generate ${count} distinct and professional ${type} statements for this program.
      Focus Areas (Priorities): ${priorities.join(', ')}.
      
      Constraints:
      1. Each statement should be strictly 1-2 sentences.
      2. Professional, academic tone.
      3. Align with the provided priorities.
      4. Output strictly as a JSON array of strings, e.g., ["Statement 1", "Statement 2"]. Do not include markdown formatting or extra text.
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
    // Sometimes it might not be a perfect JSON array, so we try to parse
    try {
        const parsed = JSON.parse(cleanedText);
        if (Array.isArray(parsed)) {
            return NextResponse.json({ results: parsed });
        } else {
            return NextResponse.json({ results: [cleanedText] });
        }
    } catch (e) {
        // If parsing fails, split by newlines or numbers if it looks like a list
        const fallbackList = cleanedText.split('\n').filter((l: string) => l.trim().length > 10).map((l: string) => l.replace(/^\d+\.\s*/, '').trim());
        return NextResponse.json({ results: fallbackList });
    }

  } catch (error: any) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
