import { NextResponse } from "next/server";
import { peoAgent }    from "@/lib/ai/peo-agent";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { programName, count = 3, priorities, institutionName } = body;

    // Primary: PEO Agent (Template + Gemini)
    try {
      const result = await peoAgent({
        programName,
        priorities,
        count,
        institutionName,
        geminiApiKey: GEMINI_API_KEY,
      });
      return NextResponse.json({ results: result.peos, quality: result.ranked });
    } catch (agentError) {
      // Fallback: Python backend (backward compatibility)
      console.warn("PEO Agent failed, falling back to Python backend:", agentError);
      const response = await fetch("http://localhost:8001/api/v1/generate-peos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Python Backend Error:", errorText);
        return NextResponse.json(
          { error: `Backend Failed: ${response.statusText}` },
          { status: response.status },
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error("PEO Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
