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
        "SELECT * FROM program_psos WHERE program_id = $1 ORDER BY pso_number ASC",
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
    const { program_id, psos } = await request.json();

    if (!program_id || !Array.isArray(psos)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query("DELETE FROM program_psos WHERE program_id = $1", [
        program_id,
      ]);

      if (psos.length > 0) {
        const placeholders = psos
          .map((_: any, i: number) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
          .join(", ");
        const values: any[] = [program_id];
        psos.forEach((p: any, i: number) => {
          values.push(p.statement, i + 1);
        });
        await client.query(
          `INSERT INTO program_psos (program_id, pso_statement, pso_number) VALUES ${placeholders}`,
          values,
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
    console.error("PSO Save Error:", error);
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
      await client.query("DELETE FROM program_psos WHERE id = $1", [id]);
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
