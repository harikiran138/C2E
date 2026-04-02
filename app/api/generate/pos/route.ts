import { NextResponse } from "next/server";
import { poAgent }     from "@/lib/ai/po-agent";
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

    const rateLimitKey = await resolveRequesterIdentity(request, "ai:pos", programId);
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
        { error: "programId is required for isolation-aware PO generation" },
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

    const { mission, peos, programName, institutionId } = context;
    const effectiveInstitutionName = clientInstitutionName || "the Institution";

    // Use mission and peos from resolved context

    // Primary: Python Backend
    try {
      const backendUrl = resolvePythonBackendUrl("/api/v1/generate-pos");
      if (!backendUrl) {
        throw new Error("Python backend is not configured");
      }

      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_name: programName,
          context: effectiveInstitutionName,
          peos: peos || [],
          count: Math.min(count, 12),
          program_id: programId
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
      institutionName: effectiveInstitutionName,
      mission,
      peos,
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
