import { NextResponse } from "next/server";
import { psoAgent } from "@/lib/ai/pso-agent";
import pool from "@/lib/postgres";
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
    const { selected_societies, number_of_psos, program_name, mode = "standard", program_id, programId } = body;
    const effectiveProgramId = programId || program_id;

    const rateLimitKey = await resolveRequesterIdentity(
      request,
      "ai:psos",
      effectiveProgramId,
    );
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

    const hasSelection =
      Boolean(selected_societies?.lead?.length) ||
      Boolean(selected_societies?.co_lead?.length) ||
      Boolean(selected_societies?.coLead?.length) ||
      Boolean(selected_societies?.cooperating?.length);

    if (!hasSelection) {
      return NextResponse.json(
        { error: "At least one professional society must be selected." },
        { status: 400 },
      );
    }

    const count = Number(number_of_psos || 0);
    if (!Number.isFinite(count) || count < 1 || count > 10) {
      return NextResponse.json(
        { error: "Invalid number of PSOs (1-10)." },
        { status: 400 },
      );
    }

    if (!effectiveProgramId) {
      return NextResponse.json(
        { error: "program_id is required for isolation-aware PSO generation" },
        { status: 400 },
      );
    }

    // 1. Resolve Academic Context (Security Boundary)
    const { context, errors: contextErrors } = await resolveProgramAcademicContext(effectiveProgramId);
    if (!context || contextErrors.length > 0) {
      return NextResponse.json(
        { error: contextErrors[0] || "Failed to resolve program isolation context" },
        { status: 404 },
      );
    }

    const { vision, mission, peos, programName, institutionId } = context;

    let result: any = null;

    // Primary: Python Backend
    try {
      const backendUrl = resolvePythonBackendUrl("/api/v1/generate-psos");
      if (!backendUrl) {
        throw new Error("Python backend is not configured");
      }

      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_name: programName,
          count: count,
          priorities: selected_societies?.lead || [],
          program_id: effectiveProgramId,
          vision: vision || "",
          missions: mission ? [mission] : [],
          peos: peos || []
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Map snake_case to camelCase
        if (data.results && Array.isArray(data.results)) {
          const mappedResults = data.results.map((r: any) => ({
            statement: r.statement,
            abetMappings: r.abet_mappings || [],
            focusArea: r.focus_area,
            skill: r.skill
          }));
          result = {
            success: true,
            results: mappedResults,
            validation: data.validation || { score: 100, globalIssues: [] }
          };
        }
      }
    } catch (backendError) {
      console.warn("Python Backend connection failed for PSOs:", backendError);
    }

    // Fallback: TS Agent
    if (!result) {
      console.warn("Falling back to PSO TS Agent...");
      result = await psoAgent({
        programName,
        count,
        selectedSocieties: selected_societies,
        mode,
        vision,
        mission,
        peos,
      });
    }

    if (!result?.success && result?.error) {
      return NextResponse.json(
        { error: result.error, attempts: result.attempts },
        { status: 500 }
      );
    }

    // Auto-save to database
    if (effectiveProgramId && result.results && result.results.length > 0) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM program_psos WHERE program_id = $1", [effectiveProgramId]);
        
        for (let i = 0; i < result.results.length; i++) {
          const pso = result.results[i];
          await client.query(
            "INSERT INTO program_psos (program_id, institution_id, pso_statement, pso_number) VALUES ($1, $2, $3, $4)",
            [effectiveProgramId, institutionId, pso.statement, i + 1]
          );
        }
        await client.query("COMMIT");
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("Auto-save PSO failure:", dbError);
      } finally {
        client.release();
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PSO Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
