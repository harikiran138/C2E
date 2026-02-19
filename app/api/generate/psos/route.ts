import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('PSO Request Body:', JSON.stringify(body));
    const { selected_societies, number_of_psos, program_name } = body;

    // Validate inputs
    if (!selected_societies || (!selected_societies.lead?.length && !selected_societies.co_lead?.length && !selected_societies.cooperating?.length)) {
      return NextResponse.json({ error: 'At least one society must be selected.' }, { status: 400 });
    }

    if (!number_of_psos || number_of_psos < 1 || number_of_psos > 20) {
        return NextResponse.json({ error: 'Invalid number of PSOs (1-20).' }, { status: 400 });
    }

    // Fallback/Safety Check
    if (!GEMINI_API_KEY) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL SECURITY ERROR: GEMINI_API_KEY environment variable is missing.');
        }
        console.warn('GEMINI_API_KEY is missing. Using mock generation.');
        const mockResults = Array.from({ length: number_of_psos }).map((_, i) => {
             return `PSO${i+1}: Graduates will be able to apply principles of ${program_name} tailored to the standards of ${selected_societies.lead?.[0] || 'Engineering Societies'}.`;
        });
        return NextResponse.json({ results: mockResults });
    }

    // Call Gemini API via Fetch
    // Constructing a detailed prompt based on the specific requirements
    const prompt = `
      You are an expert academic curriculum designer.
      Program Name: "${program_name}".
      
      Selected Professional Societies:
      - Lead Societies: ${selected_societies.lead?.join(', ') || 'None'}
      - Co-Lead Societies: ${selected_societies.co_lead?.join(', ') || 'None'}
      - Cooperating Societies: ${selected_societies.cooperating?.join(', ') || 'None'}
      
      Task: Generate ${number_of_psos} Program Specific Outcomes (PSOs) aligned with the selected professional societies.
      
      Constraints:
      1. Ensure discipline compliance and alignment with the competencies defined by the selected societies.
      2. Use measurable action verbs (Bloom's Taxonomy / RBT-based).
      3. Maintain a professional, academic tone.
      4. Each PSO should be 2-3 lines long.
      5. Output strictly as a JSON array of strings. Do not include markdown formatting, numbering in the string, or extra text.
      
      Example Output Format:
      ["Apply advanced principles...", "Design and conduct experiments..."]
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
