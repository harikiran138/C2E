import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/postgres";

function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

/**
 * GET /api/curriculum/feedback?programId=<uuid>
 * Returns all curriculum feedback entries for a program.
 * No auth required (institution can read, but this route is also used
 * by the institution dashboard via a separate authenticated route).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = String(searchParams.get("programId") || "").trim();

    if (!programId || !isValidUUID(programId)) {
      return NextResponse.json({ error: "Valid programId is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, program_id, stakeholder_id, stakeholder_email,
                rating, feedback_text, comments, submitted_at, created_at
         FROM curriculum_feedback
         WHERE program_id = $1
         ORDER BY COALESCE(submitted_at, created_at) DESC`,
        [programId],
      );
      return NextResponse.json({ feedback: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Curriculum feedback GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch curriculum feedback" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/curriculum/feedback
 * Submit curriculum feedback. Accepts stakeholder_email (anonymous) OR
 * stakeholder_id (registered representative stakeholder).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId, stakeholderId, stakeholderEmail, feedbackText, comments, rating } = body;

    if (!programId || !isValidUUID(programId)) {
      return NextResponse.json({ error: "Valid programId is required" }, { status: 400 });
    }

    const feedbackContent = comments || feedbackText;
    if (!feedbackContent && !rating) {
      return NextResponse.json(
        { error: "Either feedback content or rating is required" },
        { status: 400 },
      );
    }

    // Validate stakeholder_id if provided
    if (stakeholderId && !isValidUUID(stakeholderId)) {
      return NextResponse.json({ error: "Invalid stakeholderId format" }, { status: 400 });
    }

    const numericRating = rating ? Number(rating) : null;
    if (numericRating !== null && (numericRating < 1 || numericRating > 10)) {
      return NextResponse.json({ error: "Rating must be between 1 and 10" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      // Verify program exists
      const programCheck = await client.query(
        "SELECT id FROM programs WHERE id = $1 LIMIT 1",
        [programId],
      );
      if (programCheck.rows.length === 0) {
        return NextResponse.json({ error: "Program not found" }, { status: 404 });
      }

      const result = await client.query(
        `INSERT INTO curriculum_feedback (
          program_id,
          stakeholder_id,
          stakeholder_email,
          feedback_text,
          comments,
          rating,
          submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, program_id, stakeholder_id, stakeholder_email, rating, comments, submitted_at`,
        [
          programId,
          stakeholderId || null,
          stakeholderEmail || null,
          feedbackContent || null,
          feedbackContent || null,
          numericRating,
        ],
      );

      return NextResponse.json({ feedback: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Curriculum feedback POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save curriculum feedback" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/curriculum/feedback?id=<uuid>
 * Delete a curriculum feedback entry. Only institution (authorized via ownership check) should call this.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !isValidUUID(id)) {
      return NextResponse.json({ error: "Valid feedback ID is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        "DELETE FROM curriculum_feedback WHERE id = $1 RETURNING id",
        [id],
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Curriculum feedback DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete feedback" },
      { status: 500 },
    );
  }
}
