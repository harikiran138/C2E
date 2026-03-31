import { NextResponse } from "next/server";
import { poAgent }     from "@/lib/ai/po-agent";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { programName, count = 3, priorities, institutionName } = body;

    if (!programName) {
      return NextResponse.json(
        { error: "programName is required" },
        { status: 400 },
      );
    }

    // Primary: Python Backend
    try {
      const response = await fetch("http://localhost:8000/api/v1/generate-pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_name: programName,
          institution_name: institutionName,
          priorities: priorities,
          count: Math.min(count, 12)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && Array.isArray(data.results)) {
          // Map to match frontend PO expectations
          const pos = data.results.map((r: any) => ({
            code: `PO${r.po_number}`,
            title: r.statement,
            description: r.description
          }));
          const ranked = data.results.map((r: any) => ({
            statement: r.statement,
            quality: r.quality
          }));
          return NextResponse.json({ pos, ranked });
        }
      }
    } catch (backendError) {
      console.warn("Python Backend connection failed for POs:", backendError);
    }

    // Fallback: TS Agent
    console.warn("Falling back to PO TS Agent...");
    const result = await poAgent({
      programName,
      count: Math.min(count, 12),
      priorities,
      institutionName,
      geminiApiKey: GEMINI_API_KEY,
    });

    return NextResponse.json({ pos: result.pos, ranked: result.ranked, prompt: result.prompt });
  } catch (error: any) {
    console.error("PO Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

