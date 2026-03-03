import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function POST(request: Request) {
  try {
    const { missions, peos } = await request.json();

    if (!missions || !peos) {
      return NextResponse.json(
        { error: "Missions and PEOs required" },
        { status: 400 },
      );
    }

    // Fallback/Safety Check
    if (!GEMINI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "CRITICAL SECURITY ERROR: GEMINI_API_KEY environment variable is missing.",
        );
      }
      console.warn("GEMINI_API_KEY is missing. Using mock generation.");
      // Generate random correlation (1, 2, 3, -) for mock
      const options = ["1", "2", "3", "-"];
      const matrix = missions.map(() =>
        peos.map(() => options[Math.floor(Math.random() * options.length)]),
      );
      return NextResponse.json({ matrix });
    }

    const prompt = `
      You are an expert academic curriculum designer.
      Task: Create a Consistency Matrix mapping Mission Statements to Program Educational Objectives (PEOs).
      
      Mission Statements:
      ${missions.map((m: string, i: number) => `${i + 1}. ${m}`).join("\n")}
      
      PEOs:
      ${peos.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}
      
      Correlation Scale:
      1 = Low
      2 = Medium
      3 = High
      - = No Correlation
      
      Output ONLY a JSON 2D array of strings representing the matrix. 
      Rows correspond to Missions, Columns to PEOs.
      Example: [["3", "1"], ["-", "2"]]
    `;

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Failed: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    let cleanedText = generatedText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanedText);

    return NextResponse.json({ matrix: parsed });
  } catch (error: any) {
    console.error("Matrix Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
