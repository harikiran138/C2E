import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";

/**
 * PATCH /api/curriculum/versions/[id]
 * Body: { status: "draft" | "active" | "archived" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = String(rawId || "").trim();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await request.json();
    const status = String(body.status || "").trim();

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const ALLOWED_STATUSES = ["draft", "active", "archived"];
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        "UPDATE curriculum_versions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
        [status, id],
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Version not found" }, { status: 404 });
      }

      return NextResponse.json({ version: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Version update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update version" },
      { status: 500 },
    );
  }
}
