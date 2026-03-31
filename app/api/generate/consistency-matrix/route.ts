import { NextResponse } from "next/server";
import { callAI } from "@/lib/curriculum/ai-model-router";

export async function POST(request: Request) {
  try {
    const { missions, peos } = await request.json();

    if (!missions || !peos) {
      return NextResponse.json(
        { error: "Missions and PEOs required" },
        { status: 400 },
      );
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

    const generatedText = await callAI(prompt, "accreditation");

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
