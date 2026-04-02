import { NextResponse } from "next/server";
import { peoAgent } from "@/lib/ai/peo-agent";
import { resolveProgramAcademicContext } from "@/lib/curriculum/program-context";
import { resolvePythonBackendUrl } from "@/lib/ai-backend";
import { checkRateLimit } from "@/lib/rate-limit";
import { AI_RATE_LIMIT } from "@/lib/constants";
import {
  extractClientIp,
  rejectCrossSiteRequest,
  resolveRequesterIdentity,
  verifyCsrfToken,
} from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    const crossSiteError = rejectCrossSiteRequest(request);
    if (crossSiteError) {
      return NextResponse.json({ error: crossSiteError }, { status: 403 });
    }

    const csrfError = verifyCsrfToken(request);
    if (csrfError) {
      return NextResponse.json({ error: csrfError }, { status: 403 });
    }

    const clientIp = extractClientIp(request);
    const body = await request.json();
    const { programId, count = 3, priorities, institutionName: clientInstitutionName } = body;

    const rateLimitKey = await resolveRequesterIdentity(request, "ai:peos", programId);
    if (
      !checkRateLimit({
        ip: clientIp,
        key: rateLimitKey,
        limit: AI_RATE_LIMIT.limit,
        windowMs: AI_RATE_LIMIT.windowMs,
      })
    ) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute before retrying." },
        { status: 429 },
      );
    }
    
    if (!programId) {
      return NextResponse.json(
        { error: "programId is required for isolation-aware PEO generation" },
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

    const { vision, mission, programName, institutionId } = context;
    const effectiveInstitutionName = clientInstitutionName || "the Institution";

    // Primary: Python Backend (Robust LLM Loop + Scoring)
    try {
      const backendUrl = resolvePythonBackendUrl("/api/v1/generate-peos");
      if (backendUrl) {
        const response = await fetch(backendUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            program_name: programName,
            count: count,
            priorities: priorities,
            institution_context: effectiveInstitutionName,
            program_id: programId,
            vision: vision || "",
            missions: mission ? [mission] : []
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.results && Array.isArray(data.results)) {
            const results = data.results.map((item: any) => item.statement);
            const quality = data.results.map((item: any) => {
              const q = item.quality || {};
              const score = typeof item.score === 'number' ? item.score : (q.score || 0);
              const percentage = score;
              
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
      }
      console.warn("Python Backend failed or returned invalid data, trying TS agent...");
    } catch (backendError) {
      console.warn("Python Backend connection failed:", backendError);
    }

    // Fallback: PEO Agent (Template + Gemini/OpenRouter)
    try {
      const result = await peoAgent({
        programName,
        priorities,
        count,
        institutionName: effectiveInstitutionName,
        vision,
        mission,
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
