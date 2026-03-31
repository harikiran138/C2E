import { NextResponse } from "next/server";
import { psoAgent } from "@/lib/ai/pso-agent";
import pool from "@/lib/postgres";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selected_societies, number_of_psos, program_name, mode = "standard", program_id } = body;

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

    let result: any = null;

    // Primary: Python Backend
    try {
      const response = await fetch("http://localhost:8000/api/v1/generate-psos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_societies,
          number_of_psos: count,
          program_name: program_name || "Engineering Program",
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
        programName: program_name || "Engineering Program",
        count,
        selectedSocieties: selected_societies,
        mode,
      });
    }

    if (!result?.success && result?.error) {
      return NextResponse.json(
        { error: result.error, attempts: result.attempts },
        { status: 500 }
      );
    }

    // Auto-save to database
    if (program_id && result.results && result.results.length > 0) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM program_psos WHERE program_id = $1", [program_id]);
        
        for (let i = 0; i < result.results.length; i++) {
          const pso = result.results[i];
          await client.query(
            "INSERT INTO program_psos (program_id, pso_statement, pso_number) VALUES ($1, $2, $3)",
            [program_id, pso.statement, i + 1]
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

