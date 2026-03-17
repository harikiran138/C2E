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
 * GET  /api/institution/academic-council
 * POST /api/institution/academic-council   (body has optional `id` for upsert)
 * DELETE /api/institution/academic-council?id=<uuid>
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
        "SELECT * FROM academic_council WHERE institution_id = $1 ORDER BY created_at ASC",
        [institutionId],
      );
      return NextResponse.json({ data: result.rows });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Academic Council Fetch Error:", error);
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
        // Update
        result = await client.query(
          `UPDATE academic_council SET
             member_name = $1, member_id = $2, organization = $3, email = $4,
             mobile_number = $5, specialisation = $6, category = $7,
             communicate = $8, tenure_start_date = $9, tenure_end_date = $10,
             linkedin_id = $11, updated_at = NOW()
           WHERE id = $12 AND institution_id = $13
           RETURNING *`,
          [
            body.member_name, body.member_id, body.organization, body.email,
            body.mobile_number, body.specialisation, body.category,
            body.communicate || null, body.tenure_start_date || null,
            body.tenure_end_date || null, body.linkedin_id || null,
            body.id, institutionId,
          ],
        );
        if (result.rowCount === 0) {
          return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }
      } else {
        // Insert
        result = await client.query(
          `INSERT INTO academic_council
             (institution_id, member_name, member_id, organization, email,
              mobile_number, specialisation, category, communicate,
              tenure_start_date, tenure_end_date, linkedin_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [
            institutionId, body.member_name, body.member_id, body.organization,
            body.email, body.mobile_number, body.specialisation, body.category,
            body.communicate || null, body.tenure_start_date || null,
            body.tenure_end_date || null, body.linkedin_id || null,
          ],
        );
      }

      return NextResponse.json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Academic Council API Error:", error);
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
        "DELETE FROM academic_council WHERE id = $1 AND institution_id = $2",
        [id, institutionId],
      );
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Academic Council DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
