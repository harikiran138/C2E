import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import pool from "@/lib/postgres";
import { verifyToken } from "@/lib/auth";

async function getInstitutionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("institution_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return (payload?.id as string) || null;
}

/**
 * GET  /api/institution/program-coordinator
 * POST /api/institution/program-coordinator  (body can include `id` for update)
 * DELETE /api/institution/program-coordinator?id=<uuid>
 */
export async function GET() {
  try {
    const institutionId = await getInstitutionId();
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT pc.*, p.program_name
         FROM program_coordinators pc
         LEFT JOIN programs p ON p.id = pc.program_id
         WHERE pc.institution_id = $1
         ORDER BY pc.created_at ASC`,
        [institutionId],
      );

      const formattedData = result.rows.map((c) => ({
        ...c,
        program_name: c.program_name || "Unknown Program",
      }));

      return NextResponse.json({ data: formattedData });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Program Coordinator Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId();
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const client = await pool.connect();

    try {
      let result;

      if (body.id) {
        // Update existing coordinator
        result = await client.query(
          `UPDATE program_coordinators SET
             name = $1, designation = $2, program_id = $3,
             email_official = $4, email_personal = $5,
             mobile_official = $6, mobile_personal = $7,
             linkedin_id = $8, updated_at = NOW()
           WHERE id = $9 AND institution_id = $10
           RETURNING *`,
          [
            body.name, body.designation, body.program_id,
            body.email_official, body.email_personal || null,
            body.mobile_official, body.mobile_personal || null,
            body.linkedin_id || null,
            body.id, institutionId,
          ],
        );
        if (result.rowCount === 0) {
          return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
        }
      } else {
        // Insert new coordinator
        result = await client.query(
          `INSERT INTO program_coordinators
             (institution_id, name, designation, program_id,
              email_official, email_personal, mobile_official, mobile_personal, linkedin_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            institutionId, body.name, body.designation, body.program_id,
            body.email_official, body.email_personal || null,
            body.mobile_official, body.mobile_personal || null,
            body.linkedin_id || null,
          ],
        );
      }

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Program Coordinator API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const institutionId = await getInstitutionId();
    if (!institutionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query(
        "DELETE FROM program_coordinators WHERE id = $1 AND institution_id = $2",
        [id, institutionId],
      );
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Program Coordinator DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
