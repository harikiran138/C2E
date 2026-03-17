import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";

/**
 * GET /api/curriculum/versions?programId=<uuid>
 * POST /api/curriculum/versions   { programId, version, year, regulationName, status }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM curriculum_versions WHERE program_id = $1 ORDER BY created_at DESC",
        [programId],
      );
      return NextResponse.json({ versions: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Versions fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch versions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const programId = String(body.programId || "").trim();
    const version = String(body.version || "").trim();
    const year = Number(body.year);
    const regulationName = String(body.regulationName || "").trim();
    const status = String(body.status || "draft").trim().toLowerCase();

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    if (!version) {
      return NextResponse.json({ error: "version is required" }, { status: 400 });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "year is required and must be a valid 4-digit year." },
        { status: 400 },
      );
    }
    if (!["draft", "active", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "status must be one of: draft, active, archived." },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert into curriculum_versions
      const versionResult = await client.query(
        `INSERT INTO curriculum_versions (program_id, version, year, regulation_name, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [programId, version, year, regulationName || null, status],
      );

      const newVersion = versionResult.rows[0];

      // Sync curriculums catalog (ignore error if table doesn't exist)
      try {
        await client.query(
          `INSERT INTO curriculums (program_id, regulation_year, version, total_credits, approval_status)
           VALUES ($1, $2, $3, NULL, 'draft')
           ON CONFLICT (program_id, regulation_year, version) DO NOTHING`,
          [programId, year, version],
        );
      } catch (syncErr: any) {
        console.warn("Curriculum catalog sync warning:", syncErr.message);
      }

      await client.query("COMMIT");
      return NextResponse.json({ version: newVersion }, { status: 201 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Version create error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create version" },
      { status: 500 },
    );
  }
}
