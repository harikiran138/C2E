import { NextResponse } from "next/server";
import { peoAgent } from "@/lib/ai/peo-agent";
import { resolveProgramAcademicContext } from "@/lib/curriculum/program-context";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { programName, count = 3, priorities, institutionName, programId } = body;

    let vision = "";
    let mission = "";

    if (programId) {
      try {
        const { context } = await resolveProgramAcademicContext(programId);
        if (context) {
          vision = context.vision;
          mission = context.mission;
        }
      } catch (contextError) {
        console.warn("Failed to resolve program context for PEO generation:", contextError);
      }
    }

    // Primary: Python Backend (Robust LLM Loop + Scoring)
    try {
      const response = await fetch("http://localhost:8000/api/v1/generate-peos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_name: programName,
          count: count,
          priorities: priorities,
          institution_name: institutionName
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Map snake_case to camelCase and enhance for UI
        if (data.results && Array.isArray(data.results)) {
          const results = data.results.map((item: any) => item.statement);
          const quality = data.results.map((item: any) => {
            const q = item.quality || {};
            const score = typeof item.score === 'number' ? item.score : (q.score || 0);
            const percentage = score; // Assuming score is 0-100
            
            return {
              score: score,
              percentage: percentage,
              rating: resolveQualityRating(percentage),
              specific: Boolean(q.specific),
              measurable: Boolean(q.measurable),
              attainable: Boolean(q.attainable),
              relevant: Boolean(q.relevant),
              timeBound: Boolean(q.time_bound),
              abetStyle: Boolean(q.abet_style),
              bloomsLevel: q.blooms_level,
              actionVerb: q.action_verb,
              gaps: q.gaps || []
            };
          });

          return NextResponse.json({ results, quality });
        }
      }
      console.warn("Python Backend failed or returned invalid data, trying TS agent...");
    } catch (backendError) {
      console.warn("Python Backend connection failed:", backendError);
    }

    // Fallback: PEO Agent (Template + Gemini)
    try {
      const result = await peoAgent({
        programName,
        priorities,
        count,
        institutionName,
        vision,
        mission,
        geminiApiKey: GEMINI_API_KEY,
      });
      return NextResponse.json({ results: result.peos, quality: result.ranked });
    } catch (agentError: any) {
      console.error("All PEO generation paths failed:", agentError);
      return NextResponse.json(
        { error: `Generation Failed: ${agentError.message}` },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("PEO Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

function resolveQualityRating(percentage: number) {
  if (percentage >= 86) return "Strong";
  if (percentage >= 71) return "Good";
  if (percentage >= 56) return "Developing";
  return "Needs improvement";
}

