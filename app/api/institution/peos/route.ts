import pool from "@/lib/postgres";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json(
        { error: "Program ID required" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM program_peos WHERE program_id = $1 ORDER BY peo_number ASC",
        [programId],
      );
      return NextResponse.json({ data: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Bulk Save / Sync
export async function POST(request: Request) {
  try {
    const { program_id, peos } = await request.json();

    if (!program_id || !Array.isArray(peos)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Delete existing to full sync (simplest for re-ordering/editing MVP)
      // In production, you might want to identify updates vs inserts to preserve created_at
      await client.query("DELETE FROM program_peos WHERE program_id = $1", [
        program_id,
      ]);

      if (peos.length > 0) {
        for (let i = 0; i < peos.length; i++) {
          await client.query(
            "INSERT INTO program_peos (program_id, peo_statement, peo_number) VALUES ($1, $2, $3)",
            [program_id, peos[i].statement, i + 1],
          );
        }
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
    console.error("PEO Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const client = await pool.connect();
    try {
      await client.query("DELETE FROM program_peos WHERE id = $1", [id]);
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
