import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const tokenPayload = await verifyToken(token);
  return (tokenPayload?.id as string) || null;
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { programId, channels } = await request.json();

    if (!programId) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Begin transaction
      await client.query("BEGIN");

      // Insert or update dissemination status
      await client.query(
        `INSERT INTO program_dissemination (program_id, channels, is_completed, updated_at)
         VALUES ($1, $2, TRUE, NOW())
         ON CONFLICT (program_id) 
         DO UPDATE SET channels = $2, is_completed = TRUE, updated_at = NOW()`,
        [programId, channels || []]
      );

      // Add audit log
      await client.query(
        `INSERT INTO audit_logs (program_id, event_type, details, created_by)
         VALUES ($1, 'dissemination_marked', $2, $3)`,
        [programId, JSON.stringify({ channels: channels || [] }), institutionId]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Dissemination API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
