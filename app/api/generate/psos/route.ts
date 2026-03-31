import { NextResponse } from "next/server";
import { psoAgent } from "@/lib/ai/pso-agent";
import pool from "@/lib/postgres";


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selected_societies, number_of_psos, program_name } = body;

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

    const result = await psoAgent({
      programName: program_name || "Engineering Program",
      count,
      selectedSocieties: selected_societies,
      geminiApiKey: process.env.GEMINI_API_KEY,
    });

    // Auto-save to database if program_id is present
    const programId = body.program_id;
    if (programId && result.details.length > 0) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        // Clear existing
        await client.query("DELETE FROM program_psos WHERE program_id = $1", [programId]);
        
        // Insert new
        const placeholders = result.details
          .map((_: any, i: number) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
          .join(", ");
        
        const values: any[] = [programId];
        result.details.forEach((p: any, i: number) => {
          values.push(p.statement, i + 1);
        });

        await client.query(
          `INSERT INTO program_psos (program_id, pso_statement, pso_number) VALUES ${placeholders}`,
          values
        );
        await client.query("COMMIT");
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("Auto-save PSO failure:", dbError);
        // We still return the generated results even if auto-save fails,
        // but perhaps add a flag or log it.
      } finally {
        client.release();
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PSO Generation Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
