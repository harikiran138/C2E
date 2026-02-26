import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Using the same flash model for matrix generation
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function POST(request: Request) {
    try {
        const { peos, pos } = await request.json();

        if (!peos || !pos) {
            return NextResponse.json({ error: 'PEOs and POs required' }, { status: 400 });
        }

        // Fallback if key missing
        if (!GEMINI_API_KEY) {
            const options = ["1", "2", "3", "-"];
            const matrix = peos.map(() => pos.map(() => options[Math.floor(Math.random() * options.length)]));
            return NextResponse.json({ matrix });
        }

        const prompt = `
      You are an expert academic curriculum designer specializing in Outcome Based Education (OBE) and NBA/ABET accreditation.
      
      Task: Create a PEO-PO Mapping Matrix.
      The Goal is to determine how much each Program Education Objective (PEO) contributes to or is supported by each Program Outcome (PO).
      
      Program Educational Objectives (PEOs):
      ${peos.map((p: string, i: number) => `PEO ${i + 1}: ${p}`).join('\n')}
      
      Program Outcomes (POs):
      ${pos.map((p: any, i: number) => `PO ${i + 1} (${p.po_code || p.code}): ${p.po_description || p.description}`).join('\n')}
      
      Mapping Logic:
      - 1 = Slight (Low) correlation
      - 2 = Moderate (Medium) correlation
      - 3 = Substantial (High) correlation
      - - = No Correlation
      
      Consider the mapping carefully. Not all PEOs map to all POs. Usually, a PEO maps strongly to 3-5 POs.
      
      Output ONLY a JSON 2D array of strings. 
      The outermost array represents PEOs (Rows).
      The inner arrays represent POs (Columns).
      
      Example: [["1", "3", "-", "2"], ["-", "2", "3", "1"]]
    `;

        const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Failed for PEO-PO Matrix: ${response.statusText}`);
        }

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        // Safety cleaning
        let cleanedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedText);

        return NextResponse.json({ matrix: parsed });

    } catch (error: any) {
        console.error('PEO-PO Matrix Generation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
