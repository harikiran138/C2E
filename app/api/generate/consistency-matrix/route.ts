import { NextResponse } from "next/server";
import { callAI } from "@/lib/curriculum/ai-model-router";
import { resolveProgramAcademicContext, normalizeText } from "@/lib/curriculum/program-context";

export async function POST(request: Request) {
  try {
    const { programId } = await request.json();

    if (!programId) {
      return NextResponse.json(
        { error: "programId is required for isolation-aware consistency mapping" },
        { status: 400 },
      );
    }

    // 1. Resolve Academic Context (Security Boundary)
    const { context, errors: contextErrors } = await resolveProgramAcademicContext(programId);
    if (!context || contextErrors.length > 0) {
      return NextResponse.json(
        { error: contextErrors[0] || "Failed to resolve program isolation context" },
        { status: 404 },
      );
    }

    const { peos, mission } = context;
    // Split mission into meaningful statements (punctuation or bullets)
    const missions = mission
      .split(/[.!?]\s+/)
      .map(s => normalizeText(s))
      .filter(s => s.length > 10);

    if (!peos || peos.length === 0 || missions.length === 0) {
      return NextResponse.json(
        { error: "Mission statements and PEOs must exist for the program" },
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
