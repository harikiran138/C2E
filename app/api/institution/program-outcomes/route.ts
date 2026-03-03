import pool from "@/lib/postgres";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    if (!programId)
      return NextResponse.json(
        { error: "Program ID required" },
        { status: 400 },
      );

    const client = await pool.connect();
    try {
      // Check if POs exist
      const result = await client.query(
        "SELECT * FROM program_outcomes WHERE program_id = $1 ORDER BY po_code ASC",
        [programId],
      );

      // Get tier from first row if exists, or query program metadata if we stored it there (we didn't yet, so relying on first row)
      const tier = result.rows.length > 0 ? result.rows[0].tier : null;

      return NextResponse.json({ data: result.rows, tier });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { program_id, tier, pos } = await request.json();

    if (!program_id || !tier || !Array.isArray(pos)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Clear existing POs for this program to ensure clean sync (simple approach)
      await client.query("DELETE FROM program_outcomes WHERE program_id = $1", [
        program_id,
      ]);

      // Bulk Insert
      for (const po of pos) {
        await client.query(
          `INSERT INTO program_outcomes (program_id, po_code, po_title, po_description, tier)
              VALUES ($1, $2, $3, $4, $5)`,
          [
            program_id,
            po.code || po.po_code,
            po.title || po.po_title,
            po.description || po.po_description,
            tier,
          ],
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("PO Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
