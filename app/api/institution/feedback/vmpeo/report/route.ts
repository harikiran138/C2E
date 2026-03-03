import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";
import { fetchVmpeoFeedbackReport } from "@/lib/institution/vmpeo-feedback";

async function getInstitutionId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.id) return null;
  return String(payload.id);
}

async function checkProgramOwnership(
  programId: string,
  institutionId: string,
): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id FROM programs WHERE id = $1 AND institution_id = $2 LIMIT 1",
      [programId, institutionId],
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId(request);
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json(
        { error: "programId is required" },
        { status: 400 },
      );
    }

    const isOwner = await checkProgramOwnership(programId, institutionId);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Program not found or unauthorized" },
        { status: 404 },
      );
    }

    const report = await fetchVmpeoFeedbackReport({
      programId,
      category: searchParams.get("category"),
      stakeholder: searchParams.get("stakeholder"),
      fromDate: searchParams.get("fromDate"),
      toDate: searchParams.get("toDate"),
    });

    return NextResponse.json(report);
  } catch (error: any) {
    console.error("VMPEO report error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
